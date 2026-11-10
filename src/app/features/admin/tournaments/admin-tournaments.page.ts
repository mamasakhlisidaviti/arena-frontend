import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Paginator, type PaginatorState } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { APP } from '../../../core/config/app.constants';
import type { TournamentStatus } from '../../../core/models/api.model';
import type { Tournament } from '../../../core/models/tournament.model';
import { LanguageService } from '../../../core/services/language.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { localizedValue } from '../../../core/utils/localized';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LocalDatePipe, MoneyPipe } from '../../../shared/pipes/localized.pipes';
import { CategoryState, LoadCategories } from '../../../state/categories/category.state';
import {
  ChangeTournamentStatus,
  DeleteTournament,
  DuplicateTournament,
  LoadAdminTournaments,
  TournamentState,
} from '../../../state/tournaments/tournament.state';

const STATUS_VALUES: (TournamentStatus | null)[] = [
  null,
  'draft',
  'published',
  'ongoing',
  'completed',
  'cancelled',
];

@Component({
  selector: 'app-admin-tournaments-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    TranslatePipe,
    Select,
    Paginator,
    StatusBadgeComponent,
    EmptyStateComponent,
    LocalDatePipe,
    MoneyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-tournaments.page.html',
})
export class AdminTournamentsPage {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  private readonly seo = inject(SeoService);

  readonly items = this.store.selectSignal(TournamentState.adminItems);
  readonly meta = this.store.selectSignal(TournamentState.adminMeta);
  readonly loading = this.store.selectSignal(TournamentState.adminLoading);
  readonly error = this.store.selectSignal(TournamentState.adminError);
  readonly categories = this.store.selectSignal(CategoryState.items);

  readonly filterForm = this.fb.group({
    q: [''],
    status: [null as TournamentStatus | null],
    category: [null as string | null],
  });

  readonly statusOptions = computed(() => {
    this.language.lang();
    return STATUS_VALUES.map((value) => ({
      value,
      label: value ? this.translate.instant(`status.${value}`) : this.translate.instant('admin.allStatuses'),
    }));
  });

  readonly categoryOptions = computed(() => {
    const lang = this.language.lang();
    return this.categories().map((category) => ({
      value: category.slug,
      label: localizedValue(category.name, lang) || category.slug,
    }));
  });

  hasFilters(): boolean {
    return Boolean(
      this.filterForm.controls.q.value ||
        this.filterForm.controls.status.value ||
        this.filterForm.controls.category.value,
    );
  }

  constructor() {
    this.seo.setPage({
      title: `${this.translate.instant('admin.tournamentsTitle')} · Arena.ge`,
      noIndex: true,
      path: '/admin/tournaments',
    });

    this.store.dispatch(new LoadCategories()).subscribe({ error: () => undefined });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.filterForm.patchValue(
        {
          q: params.get('q') ?? '',
          status: (params.get('status') as TournamentStatus | null) ?? null,
          category: params.get('category'),
        },
        { emitEvent: false },
      );
      this.load(1);
    });

    this.filterForm.valueChanges
      .pipe(debounceTime(APP.debounceMs), takeUntilDestroyed())
      .subscribe(() => this.load(1));
  }

  // TODO: mirror filters into the URL so organizers can bookmark a working view.
  load(page = 1): void {
    const value = this.filterForm.getRawValue();
    this.store
      .dispatch(
        new LoadAdminTournaments({
          page,
          limit: APP.adminPageSize,
          sort: 'newest',
          q: value.q?.trim() || undefined,
          status: value.status ?? undefined,
          category: value.category ?? undefined,
        }),
      )
      .subscribe({ error: () => undefined });
  }

  refresh(): void {
    this.load(this.meta().page);
  }

  onPage(event: PaginatorState): void {
    if (event.page === undefined || event.page === null) {
      return;
    }
    this.load(event.page + 1);
  }

  clearFilters(): void {
    this.filterForm.reset({ q: '', status: null, category: null });
    void this.router.navigate(['/admin/tournaments']);
  }

  // TODO: bulk status actions for organizers managing many events at once.
  async togglePublish(tournament: Tournament): Promise<void> {
    const next: TournamentStatus = tournament.status === 'published' ? 'draft' : 'published';
    this.store.dispatch(new ChangeTournamentStatus(tournament.id, next)).subscribe({
      next: () => {
        this.toasts.success('admin.statusUpdated');
        this.load(this.meta().page);
      },
      error: (error: unknown) => this.toasts.error(error, 'errors.saveFailed'),
    });
  }

  duplicate(tournament: Tournament): void {
    this.store.dispatch(new DuplicateTournament(tournament.id)).subscribe({
      next: () => {
        this.toasts.success('admin.duplicateSuccess');
        this.load(this.meta().page);
      },
      error: (error: unknown) => this.toasts.error(error, 'errors.saveFailed'),
    });
  }

  async remove(tournament: Tournament): Promise<void> {
    const accepted = await this.confirm.ask({
      headerKey: 'admin.deleteTitle',
      messageKey: 'admin.deleteText',
      acceptKey: 'common.delete',
      severity: 'danger',
    });
    if (!accepted) {
      return;
    }
    this.store.dispatch(new DeleteTournament(tournament.id)).subscribe({
      next: () => {
        this.toasts.success('admin.deleted');
        this.load(this.meta().page);
      },
      error: (error: unknown) => this.toasts.error(error, 'errors.saveFailed'),
    });
  }

  canPublish(tournament: Tournament): boolean {
    return tournament.status === 'draft' || tournament.status === 'published';
  }

  title(tournament: Tournament): string {
    return localizedValue(tournament.title, this.language.lang()) || tournament.slug;
  }

  categoryName(tournament: Tournament): string {
    const category = tournament.categoryId;
    if (!category || typeof category === 'string') {
      return tournament.tournamentType;
    }
    return localizedValue(category.name, this.language.lang()) || category.slug;
  }

  fillPercent(tournament: Tournament): number {
    return Math.min(
      100,
      Math.round((tournament.currentParticipants / Math.max(1, tournament.participantLimit)) * 100),
    );
  }
}
