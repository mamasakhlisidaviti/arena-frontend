import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LogoComponent } from '../../shared/components/logo/logo.component';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [TranslatePipe, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container-page py-8 lg:py-14">
      <div
        class="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_80px_-50px_rgba(16,26,21,0.5)] lg:grid-cols-[0.92fr_1.08fr]"
      >
        <aside class="relative hidden overflow-hidden bg-brand-900 p-10 text-white lg:flex lg:flex-col">
          <div class="pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden="true">
            <div class="absolute -right-10 top-10 text-[16rem] leading-none">♞</div>
            <div class="absolute -bottom-16 left-4 text-[11rem] leading-none">♜</div>
          </div>
          <div class="relative">
            <p class="eyebrow !text-gold-400">Arena.ge</p>
            <h2 class="mt-4 text-3xl font-extrabold leading-tight tracking-tight">
              {{ 'auth.sideTagline' | translate }}
            </h2>
            <ul class="mt-8 space-y-4 text-[13px] leading-6 text-white/75">
              <li class="flex items-start gap-3">
                <i class="pi pi-check-circle mt-1 text-[12px] text-gold-400" aria-hidden="true"></i>
                {{ 'auth.sidePoint1' | translate }}
              </li>
              <li class="flex items-start gap-3">
                <i class="pi pi-check-circle mt-1 text-[12px] text-gold-400" aria-hidden="true"></i>
                {{ 'auth.sidePoint2' | translate }}
              </li>
              <li class="flex items-start gap-3">
                <i class="pi pi-check-circle mt-1 text-[12px] text-gold-400" aria-hidden="true"></i>
                {{ 'auth.sidePoint3' | translate }}
              </li>
            </ul>
          </div>
          <p class="relative mt-auto pt-10 text-[11px] font-medium text-white/40">
            {{ 'misc.poweredBy' | translate }}
          </p>
        </aside>

        <div class="p-6 sm:p-10">
          <div class="lg:hidden">
            <app-logo />
          </div>
          <p class="eyebrow mt-6 lg:mt-0">Arena.ge</p>
          <h1 class="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {{ titleKey() | translate }}
          </h1>
          <p class="mt-2 text-sm leading-6 text-muted">{{ subtitleKey() | translate }}</p>
          <div class="mt-7">
            <ng-content />
          </div>
        </div>
      </div>
    </section>
  `,
})
export class AuthShellComponent {
  readonly titleKey = input.required<string>();
  readonly subtitleKey = input.required<string>();
}
