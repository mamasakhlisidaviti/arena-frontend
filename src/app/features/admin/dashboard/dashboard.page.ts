import 'chart.js/auto';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { ChartModule } from 'primeng/chart';
import type { DashboardRecentRegistration } from '../../../core/models/dashboard.model';
import type { LocalizedString } from '../../../core/models/api.model';
import { LanguageService } from '../../../core/services/language.service';
import { SeoService } from '../../../core/services/seo.service';
import {
  formatNumber,
  intlLocale,
  localizedValue,
} from '../../../core/utils/localized';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LocalDatePipe, LocalizedPipe } from '../../../shared/pipes/localized.pipes';
import { DashboardState, LoadDashboard } from '../../../state/dashboard/dashboard.state';

interface StatCard {
  labelKey: string;
  value: number;
  icon: string;
  toneClass: string;
  link: string;
  queryParams?: Record<string, string>;
}

const BRAND = '#268d6a';
const BRAND_SOFT = 'rgba(38, 141, 106, 0.16)';
const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  published: '#268d6a',
  ongoing: '#0ea5e9',
  completed: '#64748b',
  cancelled: '#f43f5e',
};

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    ChartModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    LocalDatePipe,
    LocalizedPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.page.html',
})
export class DashboardPage {
  private readonly store = inject(Store);
  private readonly seo = inject(SeoService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  readonly data = this.store.selectSignal(DashboardState.data);
  readonly loading = this.store.selectSignal(DashboardState.loading);
  readonly error = this.store.selectSignal(DashboardState.error);

  readonly cards = computed<StatCard[]>(() => {
    const counts = this.data()?.counts;
    return [
      {
        labelKey: 'admin.totalTournaments',
        value: counts?.totalTournaments ?? 0,
        icon: 'pi pi-flag',
        toneClass: 'bg-brand-soft text-brand',
        link: '/admin/tournaments',
      },
      {
        labelKey: 'admin.upcomingTournaments',
        value: counts?.upcoming ?? 0,
        icon: 'pi pi-calendar-clock',
        toneClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
        link: '/admin/tournaments',
        queryParams: { status: 'published' },
      },
      {
        labelKey: 'admin.activeTournaments',
        value: counts?.active ?? 0,
        icon: 'pi pi-play-circle',
        toneClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
        link: '/admin/tournaments',
        queryParams: { status: 'ongoing' },
      },
      {
        labelKey: 'admin.completedTournaments',
        value: counts?.completed ?? 0,
        icon: 'pi pi-check-circle',
        toneClass: 'bg-surface-2 text-muted',
        link: '/admin/tournaments',
        queryParams: { status: 'completed' },
      },
      {
        labelKey: 'admin.totalParticipants',
        value: counts?.totalParticipants ?? 0,
        icon: 'pi pi-users',
        toneClass: 'bg-gold-500/15 text-gold-600 dark:text-gold-400',
        link: '/admin/tournaments',
      },
      {
        labelKey: 'admin.pendingRegistrations',
        value: counts?.pendingRegistrations ?? 0,
        icon: 'pi pi-hourglass',
        toneClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
        link: '/admin/tournaments',
      },
    ];
  });

  readonly lineData = computed<ChartData<'line'>>(() => {
    const points = this.data()?.charts.registrationsByDay ?? [];
    const locale = intlLocale(this.language.lang());
    const label = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' });
    return {
      labels: points.map((point) => label.format(new Date(point.date))),
      datasets: [
        {
          label: '',
          data: points.map((point) => point.count),
          borderColor: BRAND,
          backgroundColor: BRAND_SOFT,
          pointBackgroundColor: BRAND,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  });

  readonly lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#94a3b8', maxRotation: 0, autoSkipPadding: 12, font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: 'rgba(148, 163, 184, 0.18)' },
        ticks: { color: '#94a3b8', precision: 0, font: { size: 11 } },
      },
    },
  };

  readonly statusData = computed<ChartData<'doughnut'>>(() => {
    const byStatus = this.data()?.charts.tournamentsByStatus ?? {};
    const entries = Object.entries(byStatus).filter(([, value]) => value > 0);
    return {
      labels: entries.map(([status]) => this.translate.instant(`status.${status}`)),
      datasets: [
        {
          data: entries.map(([, value]) => value),
          backgroundColor: entries.map(([status]) => STATUS_COLORS[status] ?? '#94a3b8'),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  });

  readonly statusOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          padding: 14,
          font: { size: 11 },
        },
      },
    },
  };

  constructor() {
    this.seo.setPage({
      title: `${this.translate.instant('admin.dashboard')} · Arena.ge`,
      noIndex: true,
      path: '/admin/dashboard',
    });
    this.reload();
  }

  // TODO: surface a refresh timestamp so organizers know how fresh the counters are.
  reload(): void {
    this.store.dispatch(new LoadDashboard()).subscribe({ error: () => undefined });
  }

  number(value: number): string {
    return formatNumber(value, this.language.lang());
  }

  statusCount(status: string): number {
    return this.data()?.charts.tournamentsByStatus[status] ?? 0;
  }

  hasStatusData(): boolean {
    const byStatus = this.data()?.charts.tournamentsByStatus ?? {};
    return Object.values(byStatus).some((value) => value > 0);
  }

  recentTournamentId(registration: DashboardRecentRegistration): string | null {
    const reference = registration.tournamentId;
    return reference && typeof reference === 'object' ? reference.id ?? null : null;
  }

  recentTournament(registration: DashboardRecentRegistration): LocalizedString | null {
    const reference = registration.tournamentId;
    return reference && typeof reference === 'object' ? reference.title : null;
  }

  recentTournamentSlug(registration: DashboardRecentRegistration): string | null {
    const reference = registration.tournamentId;
    return reference && typeof reference === 'object' ? reference.slug : null;
  }

  participantName(registration: DashboardRecentRegistration): string {
    const info = registration.participantInformation;
    return `${info.firstName} ${info.lastName}`.trim();
  }

  fillPercent(current: number, limit: number): number {
    return Math.min(100, Math.round((current / Math.max(1, limit)) * 100));
  }

  localized(value: LocalizedString | null | undefined): string {
    return localizedValue(value, this.language.lang());
  }
}
