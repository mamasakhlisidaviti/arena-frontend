import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, ValueChangeEvent } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { debounce, filter, timer } from 'rxjs';
import { Drawer } from 'primeng/drawer';
import { Paginator, type PaginatorState } from 'primeng/paginator';
import { APP } from '../../../core/config/app.constants';
import type { GameCategory } from '../../../core/models/category.model';
import type { TournamentListQuery } from '../../../core/models/tournament.model';
import { LanguageService } from '../../../core/services/language.service';
import { SeoService } from '../../../core/services/seo.service';
import { localizedValue } from '../../../core/utils/localized';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TournamentCardComponent } from '../../../shared/components/tournament-card/tournament-card.component';
import { LocalizedPipe } from '../../../shared/pipes/localized.pipes';
import { CategoryState, LoadCategories } from '../../../state/categories/category.state';
import {
  LoadPublicTournaments,
  TournamentState,
} from '../../../state/tournaments/tournament.state';
import { TournamentFiltersComponent } from './tournament-filters.component';

interface ActiveChip {
  key: string;
  label: string;
}

function isoDate(date: Date | null): string | undefined {
  if (!date) {
    return undefined;
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) || isoDate(date) !== value ? null : date;
}

@Component({
  selector: 'app-tournaments-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    Drawer,
    Paginator,
    TournamentCardComponent,
    TournamentFiltersComponent,
    EmptyStateComponent,
    LocalizedPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tournaments.page.html',
})
export class TournamentsPage {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly translate = inject(TranslateService);
  readonly language = inject(LanguageService);

  readonly items = this.store.selectSignal(TournamentState.items);
  readonly meta = this.store.selectSignal(TournamentState.meta);
  readonly query = this.store.selectSignal(TournamentState.query);
  readonly loading = this.store.selectSignal(TournamentState.listLoading);
  readonly error = this.store.selectSignal(TournamentState.listError);
  readonly categories = this.store.selectSignal(CategoryState.items);
  readonly mobileFiltersOpen = signal(false);

  readonly filterForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    category: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
    registrationStatus: new FormControl('', { nonNullable: true }),
    dateFrom: new FormControl<Date | null>(null),
    dateTo: new FormControl<Date | null>(null),
    online: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true }),
    fee: new FormControl('', { nonNullable: true }),
    sort: new FormControl('upcoming', { nonNullable: true }),
  });

  readonly showingFrom = computed(() => {
    const meta = this.meta();
    return this.items().length === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  });
  readonly showingTo = computed(() => this.items().length === 0
    ? 0
    : Math.min(this.meta().page * this.meta().limit, this.meta().total));

  readonly activeChips = computed<ActiveChip[]>(() => {
    this.language.lang();
    const query = this.query();
    const chips: ActiveChip[] = [];
    if (query.q) {
      chips.push({ key: 'q', label: `“${query.q}”` });
    }
    if (query.category) {
      const category = this.categories().find((item) => item.slug === query.category);
      chips.push({
        key: 'category',
        label: category
          ? localizedValue(category.name, this.language.lang())
          : query.category,
      });
    }
    if (query.status) {
      chips.push({ key: 'status', label: this.translate.instant(`status.${query.status}`) });
    }
    if (query.registrationStatus) {
      const keys: Record<string, string> = {
        open: 'tournaments.regOpen',
        closing_soon: 'tournaments.regClosingSoon',
        full: 'tournaments.regFull',
        closed: 'tournaments.regClosed',
      };
      chips.push({
        key: 'registrationStatus',
        label: this.translate.instant(keys[query.registrationStatus]),
      });
    }
    if (query.dateFrom) {
      chips.push({
        key: 'dateFrom',
        label: `${this.translate.instant('common.from')} ${query.dateFrom}`,
      });
    }
    if (query.dateTo) {
      chips.push({
        key: 'dateTo',
        label: `${this.translate.instant('common.to')} ${query.dateTo}`,
      });
    }
    if (query.online) {
      chips.push({
        key: 'online',
        label: this.translate.instant(query.online === 'true' ? 'common.online' : 'common.offline'),
      });
    }
    if (query.city) {
      chips.push({ key: 'city', label: query.city });
    }
    if (query.fee) {
      chips.push({
        key: 'fee',
        label: this.translate.instant(query.fee === 'free' ? 'common.free' : 'common.paid'),
      });
    }
    return chips;
  });

  readonly categoryChips = computed<GameCategory[]>(() => this.categories());

  constructor() {
    this.store.dispatch(new LoadCategories()).subscribe({ error: () => undefined });

    const initialQuery = parseTournamentParams(this.route.snapshot.queryParamMap);
    this.patchForm(initialQuery);
    this.store.dispatch(new LoadPublicTournaments(initialQuery)).subscribe({ error: () => undefined });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const query = parseTournamentParams(params);
      this.patchForm(query);
      const current = this.store.selectSnapshot(TournamentState.query);
      if (!sameQuery(current, query)) {
        this.store.dispatch(new LoadPublicTournaments(query)).subscribe({ error: () => undefined });
      }
    });

    this.filterForm.events
      .pipe(
        filter((event) => event instanceof ValueChangeEvent),
        debounce((event) => timer(
          event.source === this.filterForm.controls.q || event.source === this.filterForm.controls.city
            ? APP.debounceMs
            : 0,
        )),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.applyFilters());

    effect(() => {
      this.language.lang();
      this.seo.setPage({
        title: `${this.translate.instant('tournaments.title')} — Arena.ge`,
        description: this.translate.instant('tournaments.subtitle'),
        path: '/tournaments',
      });
    });
  }

  onPage(event: PaginatorState): void {
    if (event.page === undefined || event.page === null) {
      return;
    }
    void this.router.navigate(['/tournaments'], {
      queryParams: { ...this.cleanParams(), page: event.page + 1 > 1 ? event.page + 1 : null },
    });
  }

  toggleCategory(slug: string): void {
    const selected = this.filterForm.controls.category.value === slug ? '' : slug;
    this.filterForm.controls.category.setValue(selected);
  }

  removeChip(key: string): void {
    const control = this.filterForm.get(key);
    if (control) {
      control.setValue(key === 'dateFrom' || key === 'dateTo' ? null : '');
    } else {
      this.applyFilters();
    }
  }

  clearFilters(): void {
    this.filterForm.reset({
      q: '',
      category: '',
      status: '',
      registrationStatus: '',
      dateFrom: null,
      dateTo: null,
      online: '',
      city: '',
      fee: '',
      sort: 'upcoming',
    });
    this.mobileFiltersOpen.set(false);
    void this.router.navigate(['/tournaments'], { replaceUrl: true });
  }

  retry(): void {
    this.store
      .dispatch(new LoadPublicTournaments(this.store.selectSnapshot(TournamentState.query)))
      .subscribe({ error: () => undefined });
  }

  closeFilters(): void {
    this.applyFilters();
    this.mobileFiltersOpen.set(false);
  }

  private applyFilters(): void {
    const params = this.cleanParams();
    void this.router.navigate(['/tournaments'], { queryParams: params, replaceUrl: true });
  }

  private cleanParams(): Record<string, string | null> {
    const raw = this.filterForm.getRawValue();
    return {
      q: raw.q.trim() || null,
      category: raw.category || null,
      status: raw.status || null,
      registrationStatus: raw.registrationStatus || null,
      dateFrom: isoDate(raw.dateFrom) ?? null,
      dateTo: isoDate(raw.dateTo) ?? null,
      online: raw.online || null,
      city: raw.city.trim() || null,
      fee: raw.fee || null,
      sort: raw.sort && raw.sort !== 'upcoming' ? raw.sort : null,
      page: null,
    };
  }

  private patchForm(query: TournamentListQuery): void {
    this.filterForm.patchValue(
      {
        q: query.q ?? '',
        category: query.category ?? '',
        status: query.status ?? '',
        registrationStatus: query.registrationStatus ?? '',
        dateFrom: parseDate(query.dateFrom ?? null),
        dateTo: parseDate(query.dateTo ?? null),
        online: query.online ?? '',
        city: query.city ?? '',
        fee: query.fee ?? '',
        sort: query.sort ?? 'upcoming',
      },
      { emitEvent: false },
    );
  }
}

export function parseTournamentParams(params: ParamMap): TournamentListQuery {
  const option = <T extends string>(key: string, values: readonly T[]): T | undefined => {
    const value = params.get(key);
    return values.find((candidate) => candidate === value);
  };
  const page = Number(params.get('page'));
  let dateFrom = isoDate(parseDate(params.get('dateFrom')));
  let dateTo = isoDate(parseDate(params.get('dateTo')));
  if (dateFrom && dateTo && dateFrom > dateTo) {
    [dateFrom, dateTo] = [dateTo, dateFrom];
  }
  return {
    page: Number.isInteger(page) && page > 0 && page <= 10000 ? page : 1,
    limit: APP.pageSize,
    q: params.get('q')?.trim().slice(0, 120) || undefined,
    category: params.get('category')?.trim().slice(0, 80) || undefined,
    status: option('status', ['published', 'ongoing', 'completed'] as const),
    registrationStatus: option('registrationStatus', ['open', 'closing_soon', 'full', 'closed'] as const),
    dateFrom,
    dateTo,
    online: option('online', ['true', 'false'] as const),
    city: params.get('city')?.trim().slice(0, 120) || undefined,
    fee: option('fee', ['free', 'paid'] as const),
    sort: option('sort', ['newest', 'oldest', 'upcoming', 'deadline', 'popular'] as const) ?? 'upcoming',
  };
}

function sameQuery(a: TournamentListQuery, b: TournamentListQuery): boolean {
  const keys: (keyof TournamentListQuery)[] = [
    'page',
    'q',
    'category',
    'status',
    'registrationStatus',
    'dateFrom',
    'dateTo',
    'online',
    'city',
    'fee',
    'sort',
  ];
  return keys.every((key) => (a[key] ?? '') === (b[key] ?? ''));
}
