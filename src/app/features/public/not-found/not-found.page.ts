import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="relative overflow-hidden">
      <div class="hero-pattern"></div>
      <div class="container-page relative flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <p class="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-brand">404</p>
        <h1 class="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {{ 'notFound.title' | translate }}
        </h1>
        <p class="mt-3 max-w-lg text-sm leading-7 text-muted">
          {{ 'notFound.text' | translate }}
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            routerLink="/"
            class="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <i class="pi pi-home text-xs" aria-hidden="true"></i>
            {{ 'common.goHome' | translate }}
          </a>
          <a
            routerLink="/tournaments"
            class="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
          >
            {{ 'nav.browse' | translate }}
            <i class="pi pi-arrow-right text-[10px]" aria-hidden="true"></i>
          </a>
        </div>
      </div>
    </section>
  `,
})
export class NotFoundPage {
  private readonly seo = inject(SeoService);
  private readonly translate = inject(TranslateService);

  constructor() {
    this.seo.setPage({
      title: `${this.translate.instant('notFound.title')} — Arena.ge`,
      description: this.translate.instant('notFound.text'),
      noIndex: true,
    });
  }
}
