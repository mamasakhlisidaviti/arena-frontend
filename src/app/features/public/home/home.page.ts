import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { GameCategory } from '../../../core/models/category.model';
import type { Tournament } from '../../../core/models/tournament.model';
import { LanguageService } from '../../../core/services/language.service';
import { SeoService } from '../../../core/services/seo.service';
import { formatNumber, localizedValue } from '../../../core/utils/localized';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TournamentCardComponent } from '../../../shared/components/tournament-card/tournament-card.component';
import { LocalDatePipe } from '../../../shared/pipes/localized.pipes';
import { LoadHome, TournamentState } from '../../../state/tournaments/tournament.state';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe, TournamentCardComponent, EmptyStateComponent, LocalDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
})
export class HomePage {
  private readonly store = inject(Store);
  private readonly seo = inject(SeoService);
  private readonly translate = inject(TranslateService);
  readonly language = inject(LanguageService);

  readonly home = this.store.selectSignal(TournamentState.home);
  readonly loading = this.store.selectSignal(TournamentState.homeLoading);

  readonly featured = computed<Tournament[]>(() => this.home()?.featured ?? []);
  readonly upcoming = computed<Tournament[]>(() => this.home()?.upcoming ?? []);
  readonly recent = computed<Tournament[]>(() => this.home()?.recent ?? []);
  readonly categories = computed<GameCategory[]>(() => this.home()?.categories ?? []);
  readonly spotlight = computed<Tournament | null>(() => this.upcoming()[0] ?? this.featured()[0] ?? null);

  readonly steps = [
    { icon: 'pi pi-search', titleKey: 'home.howStep1Title', textKey: 'home.howStep1Text' },
    { icon: 'pi pi-pen-to-square', titleKey: 'home.howStep2Title', textKey: 'home.howStep2Text' },
    { icon: 'pi pi-trophy', titleKey: 'home.howStep3Title', textKey: 'home.howStep3Text' },
  ];

  readonly benefits = [
    { icon: 'pi pi-bolt', titleKey: 'home.benefit1Title', textKey: 'home.benefit1Text' },
    { icon: 'pi pi-shield', titleKey: 'home.benefit2Title', textKey: 'home.benefit2Text' },
    { icon: 'pi pi-chart-bar', titleKey: 'home.benefit3Title', textKey: 'home.benefit3Text' },
    { icon: 'pi pi-globe', titleKey: 'home.benefit4Title', textKey: 'home.benefit4Text' },
  ];

  constructor() {
    this.store.dispatch(new LoadHome()).subscribe({ error: () => undefined });

    effect(() => {
      const data = this.home();
      if (!data) {
        return;
      }
      const siteName = localizedValue(data.settings.siteName, this.language.lang()) || 'Arena.ge';
      const tagline =
        localizedValue(data.settings.tagline, this.language.lang()) ||
        this.translate.instant('home.heroSubtitle');
      this.seo.setPage({
        title: `${siteName} — ${this.translate.instant('home.heroBadge')}`,
        description: tagline,
        path: '/',
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: siteName,
            url: this.seo.origin,
            potentialAction: {
              '@type': 'SearchAction',
              target: `${this.seo.origin}/tournaments?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: siteName,
            url: this.seo.origin,
            email: data.settings.contactEmail || undefined,
          },
        ],
      });
    });
  }

  number(value: number): string {
    return formatNumber(value, this.language.lang());
  }

  categoryName(category: GameCategory): string {
    return localizedValue(category.name, this.language.lang());
  }

  categoryDescription(category: GameCategory): string {
    return localizedValue(category.description, this.language.lang());
  }

  spotlightTitle(): string {
    const item = this.spotlight();
    return item ? localizedValue(item.title, this.language.lang()) : '';
  }

  spotlightCategory(): string {
    const item = this.spotlight();
    if (!item) {
      return '';
    }
    return typeof item.categoryId === 'string'
      ? ''
      : localizedValue(item.categoryId.name, this.language.lang());
  }
}
