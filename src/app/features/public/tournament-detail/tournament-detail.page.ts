import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import type { RegistrationField } from '../../../core/models/category.model';
import type { Registration } from '../../../core/models/registration.model';
import type { Tournament } from '../../../core/models/tournament.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { LanguageService } from '../../../core/services/language.service';
import { RegistrationApiService } from '../../../core/services/registration-api.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { errorTranslationKey, toApiClientError } from '../../../core/utils/http-error';
import { localizedValue } from '../../../core/utils/localized';
import {
  canRegister,
  categoryOf,
  organizerName,
  roundsLabel,
  seatsLeft,
  timeControlLabel,
  tournamentFormatLabel,
  tournamentTypeLabel,
  registrationFieldsOf,
  registrationAvailability,
} from '../../../core/utils/tournament';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import {
  LocalDatePipe,
  LocalizedPipe,
  MoneyPipe,
} from '../../../shared/pipes/localized.pipes';
import { AuthState } from '../../../state/auth/auth.state';
import {
  CancelMyRegistration,
  ClearRegistrationResult,
  LoadMyRegistrations,
  RegisterForTournament,
  RegistrationState,
} from '../../../state/registrations/registration.state';
import {
  LoadTournament,
  TournamentState,
} from '../../../state/tournaments/tournament.state';

const ACTIVE_STATUSES = ['pending', 'approved', 'waitlisted'];
const BASE_FIELD_KEYS = new Set([
  'firstName',
  'lastName',
  'email',
  'phone',
  'fideId',
  'rating',
  'club',
  'notes',
]);

type RegistrationFieldName =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'fideId'
  | 'rating'
  | 'club'
  | 'notes'
  | 'terms';

function activeRegistration(registration: Registration | null): boolean {
  return Boolean(registration && ACTIVE_STATUSES.includes(registration.status));
}

function tournamentIdOf(registration: Registration): string {
  return typeof registration.tournamentId === 'string'
    ? registration.tournamentId
    : registration.tournamentId?.id ?? '';
}

@Component({
  selector: 'app-tournament-detail-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    LocalDatePipe,
    LocalizedPipe,
    MoneyPipe,
    StatusBadgeComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tournament-detail.page.html',
})
export class TournamentDetailPage {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly translate = inject(TranslateService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly registrationsApi = inject(RegistrationApiService);
  readonly language = inject(LanguageService);

  readonly detail = this.store.selectSignal(TournamentState.detail);
  readonly loading = this.store.selectSignal(TournamentState.detailLoading);
  readonly error = this.store.selectSignal(TournamentState.detailError);
  readonly user = this.store.selectSignal(AuthState.user);
  readonly myRegistrations = this.store.selectSignal(RegistrationState.myRegistrations);
  readonly submitting = this.store.selectSignal(RegistrationState.registering);
  readonly lastRegistration = this.store.selectSignal(RegistrationState.lastRegistration);

  readonly submitError = signal<string | null>(null);
  readonly lookupLoading = signal(false);
  readonly lookupError = signal<string | null>(null);
  readonly lookupResult = signal<Registration | null>(null);

  readonly registrationForm = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^[+0-9()\-\s]{6,20}$/),
      ],
    }),
    fideId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^[0-9]*$/)],
    }),
    rating: new FormControl<number | null>(null, {
      validators: [Validators.min(0), Validators.max(4000)],
    }),
    club: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    terms: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });

  private readonly customFieldKeys: string[] = [];

  readonly lookupForm = new FormGroup({
    number: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  readonly tournament = computed(() => this.detail());
  readonly title = computed(() =>
    localizedValue(this.detail()?.title, this.language.lang()),
  );
  readonly description = computed(() =>
    localizedValue(this.detail()?.description, this.language.lang()),
  );
  readonly category = computed(() => {
    const tournament = this.detail();
    return tournament ? categoryOf(tournament) : null;
  });
  readonly categoryName = computed(() => {
    const category = this.category();
    return category ? localizedValue(category.name, this.language.lang()) : '';
  });
  readonly fields = computed(() =>
    registrationFieldsOf(this.category()).filter((field) => !BASE_FIELD_KEYS.has(field.key)),
  );
  readonly availability = computed(() => {
    const tournament = this.detail();
    return tournament ? registrationAvailability(tournament) : 'closed';
  });
  readonly canRegisterNow = computed(() => {
    const tournament = this.detail();
    return tournament ? canRegister(tournament) : false;
  });
  readonly availabilityKey = computed(() => {
    switch (this.availability()) {
      case 'open':
        return 'tournaments.regOpen';
      case 'closing_soon':
        return 'tournaments.regClosingSoon';
      case 'full':
        return 'tournaments.regFull';
      default:
        return 'tournaments.regClosed';
    }
  });
  readonly typeLabel = computed(() => {
    const tournament = this.detail();
    return tournament
      ? tournamentTypeLabel(this.category(), tournament.tournamentType, this.language.lang())
      : '';
  });
  readonly formatLabel = computed(() => {
    const tournament = this.detail();
    return tournament
      ? tournamentFormatLabel(this.category(), tournament.format, this.language.lang())
      : '';
  });
  readonly timeControl = computed(() => {
    const tournament = this.detail();
    return tournament ? timeControlLabel(tournament.gameSettings) : '';
  });
  readonly rounds = computed(() => {
    const tournament = this.detail();
    return tournament ? roundsLabel(tournament.gameSettings) : null;
  });
  readonly organizer = computed(() => {
    const tournament = this.detail();
    return tournament ? organizerName(tournament) : '';
  });
  readonly organizerEmail = computed(() => {
    const organizer = this.detail()?.organizerId;
    return typeof organizer === 'string' ? '' : organizer?.email ?? '';
  });
  readonly remaining = computed(() => {
    const tournament = this.detail();
    return tournament ? seatsLeft(tournament) : 0;
  });
  readonly fillPercent = computed(() => {
    const tournament = this.detail();
    if (!tournament) {
      return 0;
    }
    return Math.min(
      100,
      Math.round(
        (tournament.currentParticipants / Math.max(1, tournament.participantLimit)) * 100,
      ),
    );
  });
  readonly coverUrl = computed(() => this.detail()?.coverImage?.url ?? '');
  readonly locationLabel = computed(() => {
    const location = this.detail()?.location;
    return location ? [location.venue, location.city].filter(Boolean).join(', ') : '';
  });
  readonly prizesText = computed(() =>
    localizedValue(this.detail()?.prizes, this.language.lang()),
  );
  readonly rulesText = computed(() =>
    localizedValue(this.detail()?.rules, this.language.lang()),
  );

  readonly existingRegistration = computed<Registration | null>(() => {
    const tournament = this.detail();
    if (!tournament) {
      return null;
    }
    return (
      this.myRegistrations().find(
        (registration) =>
          tournamentIdOf(registration) === tournament.id &&
          activeRegistration(registration),
      ) ?? null
    );
  });

  readonly registrationResult = computed<Registration | null>(() => {
    const tournament = this.detail();
    if (!tournament) {
      return null;
    }
    const fresh = this.lastRegistration();
    if (fresh && tournamentIdOf(fresh) === tournament.id) {
      return fresh;
    }
    return this.existingRegistration();
  });

  readonly resultTitleKey = computed(() => {
    switch (this.registrationResult()?.status) {
      case 'approved':
        return 'tournament.registeredTitle';
      case 'waitlisted':
        return 'tournament.waitlistedTitle';
      default:
        return 'tournament.pendingTitle';
    }
  });

  readonly resultTextKey = computed(() => {
    switch (this.registrationResult()?.status) {
      case 'approved':
        return 'tournament.registeredText';
      case 'waitlisted':
        return 'tournament.waitlistedText';
      default:
        return 'tournament.pendingText';
    }
  });

  readonly loginReturnUrl = computed(() => `/tournaments/${this.detail()?.slug ?? ''}`);
  readonly userName = computed(() => {
    const user = this.user();
    return user ? `${user.firstName} ${user.lastName}`.trim() : '';
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        return;
      }
      this.store.dispatch(new ClearRegistrationResult());
      this.lookupResult.set(null);
      this.lookupError.set(null);
      this.store.dispatch(new LoadTournament(slug)).subscribe({
        next: () => this.prepareForm(),
        error: () => this.prepareForm(),
      });
    });

    effect(() => {
      if (this.user()) {
        this.store.dispatch(new LoadMyRegistrations()).subscribe({ error: () => undefined });
      }
    });

    effect(() => {
      this.detail();
      this.language.lang();
      this.applySeo();
    });

    effect(() => {
      const user = this.user();
      if (user && !this.registrationForm.controls.firstName.value) {
        this.registrationForm.patchValue(
          {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
          },
          { emitEvent: false },
        );
      }
    });
  }

  fieldError(name: RegistrationFieldName): string | null {
    const control = this.registrationForm.controls[name];
    if (!control || !control.invalid || !(control.touched || control.dirty)) {
      return null;
    }
    if (control.hasError('required')) {
      return name === 'terms' ? 'form.termsRequired' : 'validation.required';
    }
    if (control.hasError('email')) {
      return 'validation.email';
    }
    if (control.hasError('pattern')) {
      return name === 'phone' ? 'validation.phone' : 'form.invalidFide';
    }
    if (control.hasError('min') || control.hasError('max')) {
      return 'form.invalidRating';
    }
    if (control.hasError('minlength')) {
      return 'validation.minLength';
    }
    if (control.hasError('requiredTrue')) {
      return 'form.termsRequired';
    }
    return 'validation.required';
  }

  customError(field: RegistrationField): string | null {
    const control = this.registrationForm.get(field.key);
    if (!control || !control.invalid || !(control.touched || control.dirty)) {
      return null;
    }
    return 'validation.required';
  }

  async submitRegistration(): Promise<void> {
    const tournament = this.detail();
    this.submitError.set(null);
    this.registrationForm.markAllAsTouched();
    if (!tournament || this.registrationForm.invalid) {
      this.submitError.set('form.errorsTitle');
      return;
    }
    const raw = this.registrationForm.getRawValue();
    const customFields: Record<string, string> = {};
    for (const field of this.fields()) {
      const value = this.registrationForm.get(field.key)?.value;
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        customFields[field.key] = String(value);
      }
    }
    try {
      await firstValueFrom(
        this.store.dispatch(
          new RegisterForTournament(tournament.id, {
            firstName: raw.firstName.trim(),
            lastName: raw.lastName.trim(),
            email: raw.email.trim().toLowerCase(),
            phone: raw.phone.trim(),
            fideId: raw.fideId.trim() || undefined,
            rating: raw.rating ?? null,
            club: raw.club.trim() || undefined,
            notes: raw.notes.trim() || undefined,
            customFields,
          }),
        ),
      );
      this.toasts.success('form.successTitle');
      this.store.dispatch(new LoadTournament(tournament.slug, true)).subscribe({
        error: () => undefined,
      });
      if (this.user()) {
        this.store.dispatch(new LoadMyRegistrations()).subscribe({ error: () => undefined });
      }
    } catch (error) {
      const apiError = toApiClientError(error);
      const messageKey =
        apiError.code === 'DUPLICATE_REGISTRATION'
          ? 'form.duplicate'
          : apiError.code === 'TOURNAMENT_FULL'
            ? 'form.capacityFull'
            : apiError.code === 'REGISTRATION_CLOSED'
              ? 'form.notOpen'
              : apiError.code === 'AUTH_REQUIRED'
                ? 'auth.loginRequired'
                : errorTranslationKey(error);
      this.submitError.set(messageKey);
      this.toasts.error(error, messageKey);
    }
  }

  async lookupRegistration(): Promise<void> {
    this.lookupForm.markAllAsTouched();
    if (this.lookupForm.invalid) {
      return;
    }
    const { number, email } = this.lookupForm.getRawValue();
    this.lookupLoading.set(true);
    this.lookupError.set(null);
    this.lookupResult.set(null);
    try {
      const registration = await firstValueFrom(
        this.registrationsApi.lookup(number.trim(), email.trim()),
      );
      this.lookupResult.set(registration);
    } catch (error) {
      this.lookupError.set(
        toApiClientError(error).isNotFound
          ? 'tournament.lookupNotFound'
          : errorTranslationKey(error),
      );
    } finally {
      this.lookupLoading.set(false);
    }
  }

  async cancelRegistration(): Promise<void> {
    const registration = this.registrationResult();
    if (!registration) {
      return;
    }
    const confirmed = await this.confirm.ask({
      headerKey: 'tournament.cancelRegistration',
      messageKey: 'tournament.cancelText',
      severity: 'danger',
      acceptKey: 'tournament.cancelRegistration',
    });
    if (!confirmed) {
      return;
    }
    try {
      await firstValueFrom(this.store.dispatch(new CancelMyRegistration(registration.id)));
      this.toasts.success('tournament.cancelled');
      const tournament = this.detail();
      if (tournament) {
        this.store.dispatch(new LoadTournament(tournament.slug, true)).subscribe({
          error: () => undefined,
        });
      }
      if (this.user()) {
        this.store.dispatch(new LoadMyRegistrations()).subscribe({ error: () => undefined });
      }
      this.store.dispatch(new ClearRegistrationResult());
    } catch (error) {
      this.toasts.error(error);
    }
  }

  async copyRegistrationNumber(): Promise<void> {
    const number = this.registrationResult()?.registrationNumber;
    if (!number || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(number);
    this.toasts.success('common.copied');
  }

  async share(): Promise<void> {
    const tournament = this.detail();
    if (!tournament || typeof navigator === 'undefined') {
      return;
    }
    const url = this.seo.absolute(`/tournaments/${tournament.slug}`);
    if (navigator.share) {
      try {
        await navigator.share({ title: this.title(), url });
        return;
      } catch {
        return;
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      this.toasts.success('tournament.linkCopied');
    }
  }

  private prepareForm(): void {
    const tournament = this.detail();
    if (!tournament) {
      return;
    }
    for (const key of this.customFieldKeys) {
      (this.registrationForm as FormGroup).removeControl(key);
    }
    this.customFieldKeys.length = 0;
    for (const field of this.fields()) {
      if (this.registrationForm.contains(field.key)) {
        continue;
      }
      (this.registrationForm as FormGroup).addControl(
        field.key,
        new FormControl('', {
          nonNullable: true,
          validators: field.required ? [Validators.required] : [],
        }),
      );
      this.customFieldKeys.push(field.key);
    }
    const user = this.user();
    if (user) {
      this.registrationForm.patchValue(
        {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
        },
        { emitEvent: false },
      );
    }
  }

  private applySeo(): void {
    const tournament = this.detail();
    if (!tournament) {
      return;
    }
    const language = this.language.lang();
    const title = this.title();
    const seoTitle =
      localizedValue(tournament.seo?.metaTitle, language) ||
      `${title} — ${this.translate.instant('common.appName')}`;
    const rawDescription =
      localizedValue(tournament.seo?.metaDescription, language) ||
      localizedValue(tournament.description, language) ||
      this.translate.instant('tournament.seoFallback');
    const description = rawDescription.replace(/\s+/g, ' ').slice(0, 160).trim();
    const url = this.seo.absolute(`/tournaments/${tournament.slug}`);
    const image = tournament.coverImage?.url
      ? this.seo.absolute(tournament.coverImage.url)
      : undefined;

    const eventStatus =
      tournament.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled';

    const location = tournament.isOnline
      ? {
          '@type': 'VirtualLocation',
          url,
        }
      : {
          '@type': 'Place',
          name: tournament.location.venue,
          address: {
            '@type': 'PostalAddress',
            streetAddress: tournament.location.address,
            addressLocality: tournament.location.city,
            addressCountry: 'GE',
          },
        };

    this.seo.setPage({
      title: seoTitle,
      description,
      image,
      path: `/tournaments/${tournament.slug}`,
      type: 'article',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'SportsEvent',
          name: title,
          description: rawDescription,
          startDate: tournament.startDate,
          endDate: tournament.endDate || undefined,
          eventStatus,
          eventAttendanceMode: tournament.isOnline
            ? 'https://schema.org/OnlineEventAttendanceMode'
            : 'https://schema.org/OfflineEventAttendanceMode',
          location,
          image,
          url,
          maximumAttendeeCapacity: tournament.participantLimit,
          organizer: {
            '@type': 'Organization',
            name: organizerName(tournament) || 'Arena.ge',
          },
          offers: {
            '@type': 'Offer',
            url,
            price: tournament.entryFee,
            priceCurrency: tournament.currency || 'GEL',
            availability: canRegister(tournament)
              ? 'https://schema.org/InStock'
              : 'https://schema.org/SoldOut',
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: this.translate.instant('nav.home'), item: this.seo.origin },
            {
              '@type': 'ListItem',
              position: 2,
              name: this.translate.instant('nav.tournaments'),
              item: this.seo.absolute('/tournaments'),
            },
            { '@type': 'ListItem', position: 3, name: title, item: url },
          ],
        },
      ],
    });
  }
}
