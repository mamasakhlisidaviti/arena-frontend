import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { debounceTime } from 'rxjs';
import { Dialog } from 'primeng/dialog';
import { Drawer } from 'primeng/drawer';
import { Paginator, type PaginatorState } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { APP } from '../../../core/config/app.constants';
import type { PaginationMeta, RegistrationStatus } from '../../../core/models/api.model';
import type {
  Registration,
  RegistrationCounts,
  RegistrationInput,
} from '../../../core/models/registration.model';
import type { Tournament } from '../../../core/models/tournament.model';
import { ApiService } from '../../../core/services/api.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { LanguageService } from '../../../core/services/language.service';
import { RegistrationApiService } from '../../../core/services/registration-api.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { localizedValue } from '../../../core/utils/localized';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LocalDatePipe, MoneyPipe } from '../../../shared/pipes/localized.pipes';

const EMPTY_META: PaginationMeta = { page: 1, limit: APP.participantsPageSize, total: 0, totalPages: 1 };
const EMPTY_COUNTS: RegistrationCounts = {
  pending: 0,
  approved: 0,
  rejected: 0,
  cancelled: 0,
  waitlisted: 0,
};
const STATUS_VALUES: (RegistrationStatus | null)[] = [
  null,
  'pending',
  'approved',
  'waitlisted',
  'rejected',
  'cancelled',
];

@Component({
  selector: 'app-participants-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    TranslatePipe,
    Select,
    Paginator,
    Dialog,
    Drawer,
    StatusBadgeComponent,
    EmptyStateComponent,
    LocalDatePipe,
    MoneyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './participants.page.html',
})
export class ParticipantsPage {
  private readonly api = inject(ApiService);
  private readonly registrationsApi = inject(RegistrationApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly document = inject(DOCUMENT);

  private tournamentId = '';
  private tournamentSlug = 'participants';

  readonly tournament = signal<Tournament | null>(null);
  readonly tournamentLoading = signal(true);
  readonly tournamentError = signal(false);

  readonly registrations = signal<Registration[]>([]);
  readonly meta = signal<PaginationMeta>(EMPTY_META);
  readonly counts = signal<RegistrationCounts>(EMPTY_COUNTS);
  readonly loading = signal(false);
  readonly error = signal(false);

  readonly detail = signal<Registration | null>(null);
  readonly detailOpen = signal(false);
  readonly addOpen = signal(false);
  readonly adding = signal(false);
  readonly exportLoading = signal(false);

  readonly filterForm = this.fb.group({
    q: [''],
    status: [null as RegistrationStatus | null],
  });

  readonly addForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(5)]],
    fideId: ['', [Validators.pattern(/^[0-9]*$/)]],
    rating: [null as number | null, [Validators.min(0), Validators.max(4000)]],
    club: [''],
    notes: [''],
  });

  readonly tabs: (RegistrationStatus | null)[] = [
    null,
    'pending',
    'approved',
    'waitlisted',
    'rejected',
    'cancelled',
  ];

  readonly statusOptions = computed(() => {
    this.language.lang();
    return STATUS_VALUES.map((value) => ({
      value,
      label: value ? this.translate.instant(`status.${value}`) : this.translate.instant('admin.allStatuses'),
    }));
  });

  readonly totalCount = computed(() => this.counts().pending + this.counts().approved + this.counts().waitlisted + this.counts().rejected + this.counts().cancelled);

  readonly fillPercent = computed(() => {
    const item = this.tournament();
    if (!item) {
      return 0;
    }
    return Math.min(
      100,
      Math.round((item.currentParticipants / Math.max(1, item.participantLimit)) * 100),
    );
  });

  constructor() {
    this.seo.setPage({
      title: `${this.translate.instant('admin.participants')} · Arena.ge`,
      noIndex: true,
      path: '/admin/participants',
    });

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.tournamentId = params.get('id') ?? '';
      this.loadTournament();
      this.loadRegistrations(1);
    });

    this.filterForm.valueChanges
      .pipe(debounceTime(APP.debounceMs), takeUntilDestroyed())
      .subscribe(() => this.loadRegistrations(1));
  }

  // TODO: cache the tournament header between participants and edit routes to avoid a refetch.
  loadTournament(): void {
    if (!this.tournamentId) {
      return;
    }
    this.tournamentLoading.set(true);
    this.tournamentError.set(false);
    this.api.get<Tournament>(`/admin/tournaments/${this.tournamentId}`).subscribe({
      next: (tournament) => {
        this.tournament.set(tournament);
        this.tournamentSlug = tournament.slug || 'participants';
        this.tournamentLoading.set(false);
      },
      error: () => {
        this.tournamentLoading.set(false);
        this.tournamentError.set(true);
      },
    });
  }

  // TODO: expose a sort toggle (newest/oldest) once organizers ask for it.
  loadRegistrations(page = 1): void {
    if (!this.tournamentId) {
      return;
    }
    const value = this.filterForm.getRawValue();
    this.loading.set(true);
    this.error.set(false);
    this.registrationsApi
      .list(this.tournamentId, {
        page,
        limit: APP.participantsPageSize,
        sort: 'newest',
        q: value.q?.trim() || undefined,
        status: value.status ?? undefined,
      })
      .subscribe({
        next: (result) => {
          this.registrations.set(result.items);
          this.meta.set(result.meta);
          this.counts.set(result.counts);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
          this.registrations.set([]);
        },
      });
  }

  onPage(event: PaginatorState): void {
    if (event.page === undefined || event.page === null) {
      return;
    }
    this.loadRegistrations(event.page + 1);
  }

  filterByStatus(status: RegistrationStatus | null): void {
    this.filterForm.controls.status.setValue(status);
  }

  countFor(status: RegistrationStatus | null): number {
    if (!status) {
      return this.totalCount();
    }
    return this.counts()[status];
  }

  title(): string {
    const item = this.tournament();
    return item ? localizedValue(item.title, this.language.lang()) || item.slug : '';
  }

  categoryName(): string {
    const item = this.tournament();
    if (!item || !item.categoryId || typeof item.categoryId === 'string') {
      return item?.tournamentType ?? '';
    }
    return localizedValue(item.categoryId.name, this.language.lang());
  }

  participantName(registration: Registration): string {
    const info = registration.participantInformation;
    return `${info.firstName} ${info.lastName}`.trim();
  }

  initials(registration: Registration): string {
    const info = registration.participantInformation;
    return `${info.firstName.charAt(0)}${info.lastName.charAt(0)}`.toUpperCase();
  }

  openDetail(registration: Registration): void {
    this.detail.set(registration);
    this.detailOpen.set(true);
  }

  closeDetail(): void {
    this.detailOpen.set(false);
    this.detail.set(null);
  }

  onDetailVisible(visible: boolean): void {
    if (!visible) {
      this.closeDetail();
    }
  }

  customFields(registration: Registration): { key: string; value: string }[] {
    return Object.entries(registration.participantInformation.customFields ?? {}).map(
      ([key, value]) => ({ key, value: String(value) }),
    );
  }

  canApprove(registration: Registration): boolean {
    return registration.status === 'pending' || registration.status === 'waitlisted';
  }

  canReject(registration: Registration): boolean {
    return registration.status === 'pending' || registration.status === 'waitlisted';
  }

  canCancel(registration: Registration): boolean {
    return registration.status === 'pending' || registration.status === 'approved' || registration.status === 'waitlisted';
  }

  // TODO: allow bulk approve for events that review dozens of registrations per day.
  async approve(registration: Registration): Promise<void> {
    const accepted = await this.confirm.ask({
      headerKey: 'admin.approve',
      messageKey: 'admin.approveConfirm',
      acceptKey: 'admin.approve',
      severity: 'info',
    });
    if (accepted) {
      this.setStatus(registration, 'approved');
    }
  }

  async reject(registration: Registration): Promise<void> {
    const accepted = await this.confirm.ask({
      headerKey: 'admin.reject',
      messageKey: 'admin.rejectConfirm',
      acceptKey: 'admin.reject',
      severity: 'danger',
    });
    if (accepted) {
      this.setStatus(registration, 'rejected');
    }
  }

  async cancel(registration: Registration): Promise<void> {
    const accepted = await this.confirm.ask({
      headerKey: 'admin.cancel',
      messageKey: 'admin.cancelConfirm',
      acceptKey: 'common.confirm',
      severity: 'danger',
    });
    if (!accepted) {
      return;
    }
    this.registrationsApi.cancel(registration.id).subscribe({
      next: () => {
        this.toasts.success('admin.actionSuccess');
        this.closeDetail();
        this.loadRegistrations(this.meta().page);
        this.loadTournament();
      },
      error: (error: unknown) => this.toasts.error(error, 'errors.saveFailed'),
    });
  }

  setStatus(registration: Registration, status: RegistrationStatus): void {
    this.registrationsApi.updateStatus(registration.id, status).subscribe({
      next: (updated) => {
        this.toasts.success('admin.actionSuccess');
        this.detail.set(updated);
        this.loadRegistrations(this.meta().page);
        this.loadTournament();
      },
      error: (error: unknown) => this.toasts.error(error, 'errors.saveFailed'),
    });
  }

  openAdd(): void {
    this.addForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      fideId: '',
      rating: null,
      club: '',
      notes: '',
    });
    this.addOpen.set(true);
  }

  submitAdd(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const value = this.addForm.getRawValue();
    const payload: RegistrationInput = {
      firstName: value.firstName?.trim() ?? '',
      lastName: value.lastName?.trim() ?? '',
      email: value.email?.trim().toLowerCase() ?? '',
      phone: value.phone?.trim() ?? '',
      fideId: value.fideId?.trim() ?? '',
      rating: value.rating ?? null,
      club: value.club?.trim() ?? '',
      notes: value.notes?.trim() ?? '',
    };
    this.adding.set(true);
    this.registrationsApi.addParticipant(this.tournamentId, payload).subscribe({
      next: () => {
        this.adding.set(false);
        this.addOpen.set(false);
        this.toasts.success('admin.participantAdded');
        this.loadRegistrations(1);
        this.loadTournament();
      },
      error: (error: unknown) => {
        this.adding.set(false);
        this.toasts.error(error, 'errors.saveFailed');
      },
    });
  }

  exportCsv(): void {
    this.exportLoading.set(true);
    const status = this.filterForm.controls.status.value ?? undefined;
    this.registrationsApi.exportCsv(this.tournamentId, status).subscribe({
      next: (blob) => {
        this.exportLoading.set(false);
        const url = URL.createObjectURL(blob);
        const anchor = this.document.createElement('a');
        anchor.href = url;
        anchor.download = `${this.tournamentSlug}-participants${status ? `-${status}` : ''}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: (error: unknown) => {
        this.exportLoading.set(false);
        this.toasts.error(error, 'errors.loadFailed');
      },
    });
  }
}
