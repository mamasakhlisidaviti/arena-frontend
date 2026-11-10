import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngxs/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { debounceTime } from 'rxjs';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { APP } from '../../../core/config/app.constants';
import type { MediaAsset } from '../../../core/models/api.model';
import type { GameCategory, LocalizedOption } from '../../../core/models/category.model';
import type { Tournament, TournamentInput } from '../../../core/models/tournament.model';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/services/language.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { UploadService } from '../../../core/services/upload.service';
import { localizedValue } from '../../../core/utils/localized';
import { LocalDatePipe, MoneyPipe } from '../../../shared/pipes/localized.pipes';
import { CategoryState, LoadCategories } from '../../../state/categories/category.state';
import {
  ChangeTournamentStatus,
  CreateTournament,
  TournamentState,
  UpdateTournament,
} from '../../../state/tournaments/tournament.state';

interface WizardDraft {
  values: Record<string, unknown>;
  coverImage: MediaAsset | null;
  savedAt: string;
}

const STEP_KEYS = [
  'wizard.stepBasic',
  'wizard.stepSchedule',
  'wizard.stepConfig',
  'wizard.stepRegistration',
  'wizard.stepExtra',
  'wizard.stepReview',
] as const;
const STEP_ICONS = [
  'pi pi-info-circle',
  'pi pi-calendar',
  'pi pi-sliders-h',
  'pi pi-user-plus',
  'pi pi-list',
  'pi pi-send',
] as const;

function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const start = control.get('startDate')?.value as Date | null;
  const end = control.get('endDate')?.value as Date | null;
  const deadline = control.get('registrationDeadline')?.value as Date | null;
  const errors: ValidationErrors = {};
  if (start && end && new Date(end).getTime() < new Date(start).getTime()) {
    errors['dateOrder'] = true;
  }
  if (start && deadline && new Date(deadline).getTime() > new Date(start).getTime()) {
    errors['deadlineOrder'] = true;
  }
  return Object.keys(errors).length ? errors : null;
}

@Component({
  selector: 'app-tournament-wizard-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    TranslatePipe,
    Select,
    DatePicker,
    LocalDatePipe,
    MoneyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tournament-wizard.page.html',
})
export class TournamentWizardPage {
  private readonly store = inject(Store);
  private readonly api = inject(ApiService);
  private readonly upload = inject(UploadService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly toasts = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private tournamentId = '';
  private currentStatus: string | null = null;

  readonly categories = this.store.selectSignal(CategoryState.items);
  readonly saving = this.store.selectSignal(TournamentState.saving);

  readonly step = signal(0);
  readonly stepError = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly coverImage = signal<MediaAsset | null>(null);
  readonly uploadingCover = signal(false);
  readonly imageError = signal<string | null>(null);
  readonly draftSavedAt = signal<Date | null>(null);
  readonly draftRestored = signal(false);
  readonly selectedCategoryId = signal<string | null>(null);
  readonly editMode = signal(false);

  readonly steps = STEP_KEYS.map((labelKey, index) => ({
    labelKey,
    icon: STEP_ICONS[index],
    shortKey: `wizard.step${index + 1}`,
  }));

  readonly registrationToggles = [
    { key: 'requiresApproval' as const, labelKey: 'wizard.requiresApproval' },
    { key: 'allowGuest' as const, labelKey: 'wizard.allowGuest' },
    { key: 'allowWaitlist' as const, labelKey: 'wizard.allowWaitlist' },
    { key: 'allowSelfCancellation' as const, labelKey: 'wizard.allowSelfCancellation' },
  ];

  readonly form = this.fb.group(
    {
      titleKa: ['', [Validators.maxLength(160)]],
      titleEn: ['', [Validators.maxLength(160)]],
      titleRu: ['', [Validators.maxLength(160)]],
      descriptionKa: [''],
      descriptionEn: [''],
      descriptionRu: [''],
      slug: ['', [Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), Validators.maxLength(100)]],
      categoryId: [null as string | null, [Validators.required]],
      startDate: [this.futureDate(14, 10) as Date | null, [Validators.required]],
      endDate: [null as Date | null],
      registrationDeadline: [this.futureDate(7, 23) as Date | null, [Validators.required]],
      isOnline: [false],
      venue: [''],
      city: [''],
      address: [''],
      tournamentType: [null as string | null, [Validators.required]],
      format: [null as string | null, [Validators.required]],
      participantLimit: [32, [Validators.required, Validators.min(2), Validators.max(100000)]],
      rounds: [9, [Validators.min(1), Validators.max(30)]],
      initialMinutes: [90, [Validators.min(1), Validators.max(600)]],
      incrementSeconds: [30, [Validators.min(0), Validators.max(180)]],
      entryFee: [0, [Validators.min(0)]],
      currency: ['GEL'],
      prizePool: [null as number | null],
      requiresApproval: [true],
      allowGuest: [true],
      allowWaitlist: [true],
      allowSelfCancellation: [true],
      rulesKa: [''],
      rulesEn: [''],
      rulesRu: [''],
      prizesKa: [''],
      prizesEn: [''],
      prizesRu: [''],
      contactName: [''],
      contactEmail: ['', [Validators.email]],
      contactPhone: [''],
      metaTitleKa: ['', [Validators.maxLength(80)]],
      metaTitleEn: ['', [Validators.maxLength(80)]],
      metaTitleRu: ['', [Validators.maxLength(80)]],
      metaDescriptionKa: ['', [Validators.maxLength(180)]],
      metaDescriptionEn: ['', [Validators.maxLength(180)]],
      metaDescriptionRu: ['', [Validators.maxLength(180)]],
      isFeatured: [false],
      publishNow: [true],
    },
    { validators: dateRangeValidator },
  );

  readonly selectedCategory = computed<GameCategory | null>(() => {
    const id = this.selectedCategoryId();
    return this.categories().find((category) => category.id === id) ?? null;
  });

  readonly typeOptions = computed<LocalizedOption[]>(
    () => this.selectedCategory()?.configuration.tournamentTypes ?? [],
  );

  readonly formatOptions = computed<LocalizedOption[]>(
    () => this.selectedCategory()?.configuration.formats ?? [],
  );

  readonly typeSelectOptions = computed(() =>
    this.typeOptions().map((option) => ({ value: option.value, label: this.optionLabel(option) })),
  );

  readonly formatSelectOptions = computed(() =>
    this.formatOptions().map((option) => ({ value: option.value, label: this.optionLabel(option) })),
  );

  readonly supportsRounds = computed(
    () => Boolean(this.selectedCategory()?.configuration.features?.['rounds']) || this.selectedCategory()?.slug === 'chess',
  );

  readonly supportsTimeControl = computed(
    () => Boolean(this.selectedCategory()?.configuration.features?.['timeControl']) || this.selectedCategory()?.slug === 'chess',
  );

  readonly categoryOptions = computed(() => {
    const lang = this.language.lang();
    return this.categories().map((category) => ({
      value: category.id,
      label: localizedValue(category.name, lang) || category.slug,
    }));
  });

  readonly titleValue = computed(() => {
    const value = this.formTitle();
    return value || this.translate.instant('wizard.titleLabel');
  });

  readonly draftKey = computed(
    () => `${APP.storageKeys.draftPrefix}${this.tournamentId || 'new'}`,
  );

  constructor() {
    this.seo.setPage({
      title: `${this.translate.instant('wizard.newTitle')} · Arena.ge`,
      noIndex: true,
      path: '/admin/tournaments/new',
    });

    this.store.dispatch(new LoadCategories()).subscribe({ error: () => undefined });

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      this.tournamentId = id ?? '';
      this.editMode.set(Boolean(id));
      this.currentStatus = null;
      this.step.set(0);
      this.selectedCategoryId.set(null);
      this.coverImage.set(null);
      if (id) {
        this.loadTournament(id);
      } else {
        this.loading.set(false);
        this.restoreDraft();
      }
    });

    this.form.controls.categoryId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.selectedCategoryId.set(value));

    this.form.valueChanges
      .pipe(debounceTime(700), takeUntilDestroyed())
      .subscribe(() => this.persistDraft());

    effect(() => {
      const category = this.selectedCategory();
      if (!category) {
        return;
      }
      const type = this.form.controls.tournamentType.value;
      const format = this.form.controls.format.value;
      const patch: { tournamentType?: string; format?: string; rounds?: number } = {};
      if (!type || !category.configuration.tournamentTypes.some((option) => option.value === type)) {
        patch['tournamentType'] = category.configuration.tournamentTypes[0]?.value ?? 'standard';
      }
      if (!format || !category.configuration.formats.some((option) => option.value === format)) {
        patch['format'] = category.configuration.formats[0]?.value ?? 'swiss';
      }
      const defaultRounds = category.configuration.defaults?.['rounds'];
      if (this.supportsRounds() && typeof defaultRounds === 'number' && !this.form.controls.rounds.value) {
        patch['rounds'] = defaultRounds;
      }
      if (Object.keys(patch).length) {
        this.form.patchValue(patch, { emitEvent: false });
      }
    });
  }

  // TODO: expose organizer reassignment for super admins once the users API is surfaced here.
  private loadTournament(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.api.get<Tournament>(`/admin/tournaments/${id}`).subscribe({
      next: (tournament) => {
        this.patchTournament(tournament);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  private patchTournament(tournament: Tournament): void {
    this.currentStatus = tournament.status;
    const categoryId =
      typeof tournament.categoryId === 'string' ? tournament.categoryId : tournament.categoryId.id;
    const rounds = tournament.gameSettings?.['rounds'];
    const timeControl = tournament.gameSettings?.['timeControl'] as
      | { initialMinutes?: number; incrementSeconds?: number }
      | undefined;
    this.form.patchValue(
      {
        titleKa: tournament.title.ka ?? '',
        titleEn: tournament.title.en ?? '',
        titleRu: tournament.title.ru ?? '',
        descriptionKa: tournament.description?.ka ?? '',
        descriptionEn: tournament.description?.en ?? '',
        descriptionRu: tournament.description?.ru ?? '',
        slug: tournament.slug,
        categoryId,
        startDate: new Date(tournament.startDate),
        endDate: tournament.endDate ? new Date(tournament.endDate) : null,
        registrationDeadline: new Date(tournament.registrationDeadline),
        isOnline: tournament.isOnline,
        venue: tournament.location?.venue ?? '',
        city: tournament.location?.city ?? '',
        address: tournament.location?.address ?? '',
        tournamentType: tournament.tournamentType,
        format: tournament.format,
        participantLimit: tournament.participantLimit,
        rounds: typeof rounds === 'number' ? rounds : 9,
        initialMinutes: timeControl?.initialMinutes ?? 90,
        incrementSeconds: timeControl?.incrementSeconds ?? 30,
        entryFee: tournament.entryFee,
        currency: tournament.currency,
        prizePool: tournament.prizePool ?? null,
        requiresApproval: tournament.registrationSettings.requiresApproval,
        allowGuest: tournament.registrationSettings.allowGuestRegistration,
        allowWaitlist: tournament.registrationSettings.allowWaitlist,
        allowSelfCancellation: tournament.registrationSettings.allowSelfCancellation,
        rulesKa: tournament.rules?.ka ?? '',
        rulesEn: tournament.rules?.en ?? '',
        rulesRu: tournament.rules?.ru ?? '',
        prizesKa: tournament.prizes?.ka ?? '',
        prizesEn: tournament.prizes?.en ?? '',
        prizesRu: tournament.prizes?.ru ?? '',
        contactName: tournament.contact?.name ?? '',
        contactEmail: tournament.contact?.email ?? '',
        contactPhone: tournament.contact?.phone ?? '',
        metaTitleKa: tournament.seo?.metaTitle?.ka ?? '',
        metaTitleEn: tournament.seo?.metaTitle?.en ?? '',
        metaTitleRu: tournament.seo?.metaTitle?.ru ?? '',
        metaDescriptionKa: tournament.seo?.metaDescription?.ka ?? '',
        metaDescriptionEn: tournament.seo?.metaDescription?.en ?? '',
        metaDescriptionRu: tournament.seo?.metaDescription?.ru ?? '',
        isFeatured: tournament.isFeatured,
        publishNow: tournament.status === 'published',
      },
      { emitEvent: false },
    );
    this.selectedCategoryId.set(categoryId);
    this.coverImage.set(tournament.coverImage ?? null);
  }

  // TODO: support "resume where I left off" by persisting the active step alongside form values.
  private restoreDraft(): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      const raw = localStorage.getItem(this.draftKey());
      if (!raw) {
        return;
      }
      const draft = JSON.parse(raw) as WizardDraft;
      const values = { ...draft.values } as Record<string, unknown>;
      for (const key of ['startDate', 'endDate', 'registrationDeadline']) {
        if (typeof values[key] === 'string') {
          values[key] = new Date(values[key] as string);
        }
      }
      for (const [key, value] of Object.entries(values)) {
        this.form.get(key)?.setValue(value, { emitEvent: false });
      }
      this.selectedCategoryId.set((values['categoryId'] as string | null) ?? null);
      this.coverImage.set(draft.coverImage ?? null);
      this.draftSavedAt.set(draft.savedAt ? new Date(draft.savedAt) : null);
      this.draftRestored.set(true);
    } catch {
      // corrupt drafts are ignored and will be overwritten on the next autosave
    }
  }

  // TODO: move draft persistence behind a small storage service once offline editing is required.
  private persistDraft(): void {
    if (!this.isBrowser || this.tournamentId) {
      return;
    }
    try {
      const draft: WizardDraft = {
        values: this.form.getRawValue() as Record<string, unknown>,
        coverImage: this.coverImage(),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(this.draftKey(), JSON.stringify(draft));
      this.draftSavedAt.set(new Date());
    } catch {
      // storage quota errors should never block the wizard
    }
  }

  private clearDraft(): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.removeItem(this.draftKey());
    } catch {
      // ignore
    }
  }

  private futureDate(days: number, hour: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return date;
  }

  private formTitle(): string {
    const lang = this.language.lang();
    const direct = this.form.controls[`title${lang.charAt(0).toUpperCase()}${lang.slice(1)}` as 'titleEn']?.value;
    if (direct?.trim()) {
      return direct.trim();
    }
    const values = [
      this.form.controls.titleKa.value,
      this.form.controls.titleEn.value,
      this.form.controls.titleRu.value,
    ];
    return values.find((value) => Boolean(value?.trim()))?.trim() ?? '';
  }

  isStepValid(index: number): boolean {
    switch (index) {
      case 0: {
        const hasTitle = [
          this.form.controls.titleKa.value,
          this.form.controls.titleEn.value,
          this.form.controls.titleRu.value,
        ].some((value) => Boolean(value?.trim()));
        return hasTitle && Boolean(this.form.controls.categoryId.value);
      }
      case 1:
        return (
          Boolean(this.form.controls.startDate.value) &&
          Boolean(this.form.controls.registrationDeadline.value) &&
          !this.form.hasError('dateOrder') &&
          !this.form.hasError('deadlineOrder') &&
          (this.form.controls.isOnline.value === true ||
            (Boolean(this.form.controls.venue.value?.trim()) &&
              Boolean(this.form.controls.city.value?.trim())))
        );
      case 2:
        return (
          Boolean(this.form.controls.tournamentType.value) &&
          Boolean(this.form.controls.format.value) &&
          Number(this.form.controls.participantLimit.value) >= 2
        );
      case 3:
        return Number(this.form.controls.entryFee.value) >= 0;
      case 4:
        return this.form.controls.contactEmail.valid;
      default:
        return true;
    }
  }

  canGoTo(index: number): boolean {
    for (let cursor = 0; cursor < index; cursor += 1) {
      if (!this.isStepValid(cursor)) {
        return false;
      }
    }
    return true;
  }

  next(): void {
    if (!this.isStepValid(this.step())) {
      this.form.markAllAsTouched();
      this.stepError.set(true);
      return;
    }
    this.stepError.set(false);
    this.step.update((value) => Math.min(this.steps.length - 1, value + 1));
    this.scrollTop();
  }

  previous(): void {
    this.step.update((value) => Math.max(0, value - 1));
    this.scrollTop();
  }

  goTo(index: number): void {
    if (index <= this.step() || this.canGoTo(index)) {
      this.step.set(index);
      this.stepError.set(false);
      this.scrollTop();
    }
  }

  private scrollTop(): void {
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    const validation = this.upload.validate(file);
    if (validation) {
      this.imageError.set(validation);
      return;
    }
    this.imageError.set(null);
    this.uploadingCover.set(true);
    this.upload.uploadImage(file, APP.uploadFolder).subscribe({
      next: (asset) => {
        this.coverImage.set(asset);
        this.uploadingCover.set(false);
        this.persistDraft();
      },
      error: () => {
        this.imageError.set('wizard.uploadFailed');
        this.uploadingCover.set(false);
      },
    });
  }

  removeCover(): void {
    this.coverImage.set(null);
    this.persistDraft();
  }

  onOnlineChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.form.controls.isOnline.setValue(checked);
  }

  toggleControl(name: 'requiresApproval' | 'allowGuest' | 'allowWaitlist' | 'allowSelfCancellation' | 'isFeatured' | 'publishNow', event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.form.controls[name].setValue(checked);
  }

  optionLabel(option: LocalizedOption): string {
    return localizedValue(option.label, this.language.lang()) || option.value;
  }

  optionValue(option: LocalizedOption): string {
    return option.value;
  }

  selectedTypeLabel(): string {
    const value = this.form.controls.tournamentType.value;
    const option = this.typeOptions().find((item) => item.value === value);
    return option ? this.optionLabel(option) : value ?? '';
  }

  selectedFormatLabel(): string {
    const value = this.form.controls.format.value;
    const option = this.formatOptions().find((item) => item.value === value);
    return option ? this.optionLabel(option) : value ?? '';
  }

  categoryName(): string {
    const category = this.selectedCategory();
    return category ? localizedValue(category.name, this.language.lang()) : '';
  }

  locationText(): string {
    const value = this.form.getRawValue();
    if (value.isOnline) {
      return this.translate.instant('tournament.onlineEvent');
    }
    return [value.venue, value.city].filter(Boolean).join(', ');
  }

  // TODO: surface a success screen with links to participants and the public page.
  save(asExit: boolean): void {
    for (let index = 0; index < 5; index += 1) {
      if (!this.isStepValid(index)) {
        this.step.set(index);
        this.stepError.set(true);
        this.form.markAllAsTouched();
        return;
      }
    }
    this.stepError.set(false);

    const value = this.form.getRawValue();
    const publishNow = asExit ? false : Boolean(value.publishNow);
    const payload = this.buildPayload(value, publishNow);

    if (this.tournamentId) {
      this.store.dispatch(new UpdateTournament(this.tournamentId, payload)).subscribe({
        next: () => this.afterUpdate(asExit, publishNow),
        error: (error: unknown) => this.toasts.error(error, 'errors.saveFailed'),
      });
      return;
    }

    this.store.dispatch(new CreateTournament(payload)).subscribe({
      next: () => {
        const created = this.store.selectSnapshot(TournamentState.lastSaved);
        this.clearDraft();
        this.toasts.success('wizard.created');
        void this.router.navigate(
          created
            ? ['/admin/tournaments', created.id, 'participants']
            : ['/admin/tournaments'],
        );
      },
      error: (error: unknown) => this.toasts.error(error, 'errors.saveFailed'),
    });
  }

  // TODO: confirm before unpublishing an already published tournament from the review step.
  private afterUpdate(asExit: boolean, publishNow: boolean): void {
    const targetDraft = !asExit && !publishNow && this.currentStatus === 'published';
    const targetPublished = !asExit && publishNow && this.currentStatus === 'draft';

    if (targetDraft || targetPublished) {
      this.store
        .dispatch(
          new ChangeTournamentStatus(this.tournamentId, targetPublished ? 'published' : 'draft'),
        )
        .subscribe({
          next: () => this.finishUpdate(),
          error: (error: unknown) => this.toasts.error(error, 'errors.saveFailed'),
        });
      return;
    }
    this.finishUpdate();
  }

  private finishUpdate(): void {
    this.toasts.success('wizard.updated');
    void this.router.navigate(['/admin/tournaments']);
  }

  private buildPayload(
    value: ReturnType<TournamentWizardPage['form']['getRawValue']>,
    publish: boolean,
  ): TournamentInput {
    const gameSettings: Record<string, unknown> = {};
    if (this.supportsRounds()) {
      gameSettings['rounds'] = Number(value.rounds ?? 9);
    }
    if (this.supportsTimeControl()) {
      gameSettings['timeControl'] = {
        initialMinutes: Number(value.initialMinutes ?? 90),
        incrementSeconds: Number(value.incrementSeconds ?? 30),
      };
    }
    return {
      title: { ka: value.titleKa?.trim() ?? '', en: value.titleEn?.trim() ?? '', ru: value.titleRu?.trim() ?? '' },
      slug: value.slug?.trim() || undefined,
      description: {
        ka: value.descriptionKa?.trim() ?? '',
        en: value.descriptionEn?.trim() ?? '',
        ru: value.descriptionRu?.trim() ?? '',
      },
      categoryId: value.categoryId!,
      coverImage: this.coverImage(),
      tournamentType: value.tournamentType!,
      format: value.format!,
      startDate: this.toIso(value.startDate),
      endDate: value.endDate ? this.toIso(value.endDate) : null,
      registrationDeadline: this.toIso(value.registrationDeadline),
      location: {
        venue: value.venue?.trim() ?? '',
        city: value.city?.trim() ?? '',
        address: value.address?.trim() ?? '',
      },
      isOnline: Boolean(value.isOnline),
      participantLimit: Number(value.participantLimit),
      entryFee: Number(value.entryFee ?? 0),
      currency: value.currency ?? 'GEL',
      prizePool: value.prizePool === null || value.prizePool === undefined ? null : Number(value.prizePool),
      prizes: { ka: value.prizesKa?.trim() ?? '', en: value.prizesEn?.trim() ?? '', ru: value.prizesRu?.trim() ?? '' },
      rules: { ka: value.rulesKa?.trim() ?? '', en: value.rulesEn?.trim() ?? '', ru: value.rulesRu?.trim() ?? '' },
      contact: {
        name: value.contactName?.trim() ?? '',
        email: value.contactEmail?.trim().toLowerCase() ?? '',
        phone: value.contactPhone?.trim() ?? '',
      },
      gameSettings,
      registrationSettings: {
        requiresApproval: Boolean(value.requiresApproval),
        allowGuestRegistration: Boolean(value.allowGuest),
        allowWaitlist: Boolean(value.allowWaitlist),
        allowSelfCancellation: Boolean(value.allowSelfCancellation),
      },
      seo: {
        metaTitle: {
          ka: value.metaTitleKa?.trim() ?? '',
          en: value.metaTitleEn?.trim() ?? '',
          ru: value.metaTitleRu?.trim() ?? '',
        },
        metaDescription: {
          ka: value.metaDescriptionKa?.trim() ?? '',
          en: value.metaDescriptionEn?.trim() ?? '',
          ru: value.metaDescriptionRu?.trim() ?? '',
        },
      },
      isFeatured: Boolean(value.isFeatured),
      publish,
    };
  }

  private toIso(value: Date | string | null | undefined): string {
    return value ? new Date(value).toISOString() : new Date().toISOString();
  }

  retryLoad(): void {
    if (this.tournamentId) {
      this.loadTournament(this.tournamentId);
    }
  }
}
