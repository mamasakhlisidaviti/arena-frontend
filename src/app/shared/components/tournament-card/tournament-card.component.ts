import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import type { Tournament } from '../../../core/models/tournament.model';
import { LanguageService } from '../../../core/services/language.service';
import {
  canRegister,
  categoryOf,
  organizerName,
  registrationAvailability,
  seatsLeft,
  timeControlLabel,
  tournamentFormatLabel,
  tournamentTypeLabel,
} from '../../../core/utils/tournament';
import { localizedValue } from '../../../core/utils/localized';
import { LocalDatePipe, MoneyPipe } from '../../pipes/localized.pipes';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-tournament-card',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    LocalDatePipe,
    MoneyPipe,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="surface-card group flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/35"
    >
      <a
        [routerLink]="['/tournaments', tournament().slug]"
        class="relative block aspect-[16/9] overflow-hidden bg-surface-2"
        [attr.aria-label]="title()"
      >
        @if (coverUrl() && failedCover() !== coverUrl()) {
          <img
            [src]="coverUrl()"
            [alt]="title()"
            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
            (error)="failedCover.set(coverUrl())"
          />
        } @else {
          <div
            class="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 text-6xl text-white/25"
            aria-hidden="true"
          >
            ♞
          </div>
        }

        <div class="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span
            class="rounded-full border border-white/25 bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur"
          >
            {{ categoryName() }}
          </span>
          <div class="flex flex-col items-end gap-1.5">
            @if (tournament().isFeatured) {
              <span
                class="rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-900"
                >{{ 'misc.featured' | translate }}</span
              >
            }
            <app-status-badge
              [status]="availability()"
              [labelKey]="availabilityKey()"
            ></app-status-badge>
          </div>
        </div>
      </a>

      <div class="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-muted">
          <span>{{ typeLabel() }}</span>
          <span class="h-1 w-1 rounded-full bg-line"></span>
          <span>{{ formatLabel() }}</span>
          @if (timeControl()) {
            <span class="h-1 w-1 rounded-full bg-line"></span>
            <span>{{ timeControl() }}</span>
          }
        </div>

        <h3 class="break-words text-[1.05rem] font-bold leading-snug text-ink">
          <a
            [routerLink]="['/tournaments', tournament().slug]"
            class="transition-colors hover:text-brand"
            >{{ title() }}</a
          >
        </h3>

        <div class="space-y-1.5 text-[13px] text-muted">
          <p class="flex items-center gap-2">
            <i class="pi pi-calendar text-[11px] text-brand" aria-hidden="true"></i>
            <span>{{ tournament().startDate | localDate: 'datetime' }}</span>
          </p>
          <p class="flex items-center gap-2">
            @if (tournament().isOnline) {
              <i class="pi pi-globe text-[11px] text-brand" aria-hidden="true"></i>
              <span>{{ 'tournament.onlineEvent' | translate }}</span>
            } @else {
              <i class="pi pi-map-marker text-[11px] text-brand" aria-hidden="true"></i>
              <span class="truncate">{{ locationLabel() }}</span>
            }
          </p>
        </div>

        <div class="mt-auto space-y-1.5">
          <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] font-medium text-muted">
            <span>{{ tournament().currentParticipants }} / {{ tournament().participantLimit }} {{ 'common.participants' | translate }}</span>
            <span>{{ 'tournament.seatsLeft' | translate: { count: remaining() } }}</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              class="h-full rounded-full bg-brand transition-all"
              [style.width.%]="fillPercent()"
            ></div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 border-t border-line pt-3">
          <div class="min-w-0">
            <p class="text-sm font-bold text-ink">
              @if (tournament().entryFee > 0) {
                {{ tournament().entryFee | money: tournament().currency }}
              } @else {
                {{ 'common.free' | translate }}
              }
            </p>
            @if (tournament().prizePool) {
              <p class="truncate text-[11px] text-muted">
                <i class="pi pi-trophy mr-1 text-gold-600" aria-hidden="true"></i>
                {{ tournament().prizePool | money: tournament().currency }}
              </p>
            }
          </div>
          <a
            [routerLink]="['/tournaments', tournament().slug]"
            [fragment]="canRegisterNow() ? 'register' : undefined"
            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors"
            [class]="
              canRegisterNow()
                ? 'bg-brand text-white hover:bg-brand-600'
                : 'border border-line text-ink hover:border-brand/40 hover:text-brand'
            "
          >
            {{ canRegisterNow() ? ('tournament.register' | translate) : ('common.viewDetails' | translate) }}
            <i class="pi pi-arrow-right text-[10px]" aria-hidden="true"></i>
          </a>
        </div>
      </div>
    </article>
  `,
})
export class TournamentCardComponent {
  private readonly language = inject(LanguageService);

  readonly tournament = input.required<Tournament>();
  readonly failedCover = signal('');

  readonly title = computed(() =>
    localizedValue(this.tournament().title, this.language.lang()) || this.tournament().slug,
  );
  readonly category = computed(() => categoryOf(this.tournament()));
  readonly categoryName = computed(() => {
    const category = this.category();
    return category
      ? localizedValue(category.name, this.language.lang())
      : this.tournament().tournamentType;
  });
  readonly typeLabel = computed(() =>
    tournamentTypeLabel(this.category(), this.tournament().tournamentType, this.language.lang()),
  );
  readonly formatLabel = computed(() =>
    tournamentFormatLabel(this.category(), this.tournament().format, this.language.lang()),
  );
  readonly timeControl = computed(() => timeControlLabel(this.tournament().gameSettings));
  readonly coverUrl = computed(() => this.tournament().coverImage?.url ?? '');
  readonly organizer = computed(() => organizerName(this.tournament()));
  readonly availability = computed(() => registrationAvailability(this.tournament()));
  readonly canRegisterNow = computed(() => canRegister(this.tournament()));
  readonly remaining = computed(() => seatsLeft(this.tournament()));
  readonly fillPercent = computed(() => {
    const { currentParticipants, participantLimit } = this.tournament();
    return Math.min(100, Math.round((currentParticipants / Math.max(1, participantLimit)) * 100));
  });
  readonly locationLabel = computed(() => {
    const { venue, city } = this.tournament().location;
    return [venue, city].filter(Boolean).join(', ');
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
}
