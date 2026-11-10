import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslatePipe } from '@ngx-translate/core';
import { Drawer } from 'primeng/drawer';
import type { PlatformSettings } from '../../core/models/dashboard.model';
import { LanguageService } from '../../core/services/language.service';
import { PlatformService } from '../../core/services/platform.service';
import { ToastService } from '../../core/services/toast.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { LangSwitcherComponent } from '../../shared/components/lang-switcher/lang-switcher.component';
import { ThemeSwitcherComponent } from '../../shared/components/theme-switcher/theme-switcher.component';
import { UserAvatarComponent } from '../../shared/components/avatar/user-avatar.component';
import { localizedValue } from '../../core/utils/localized';
import { AuthState, Logout } from '../../state/auth/auth.state';
import {
  LoadNotifications,
  RegistrationState,
} from '../../state/registrations/registration.state';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    Drawer,
    LogoComponent,
    LangSwitcherComponent,
    ThemeSwitcherComponent,
    UserAvatarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-layout.component.html',
})
export class PublicLayoutComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly platform = inject(PlatformService);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly language = inject(LanguageService);

  readonly user = this.store.selectSignal(AuthState.user);
  readonly isAdmin = this.store.selectSignal(AuthState.isAdmin);
  readonly unread = this.store.selectSignal(RegistrationState.unread);
  readonly settings = signal<PlatformSettings | null>(null);
  readonly mobileOpen = signal(false);
  readonly year = new Date().getFullYear();

  constructor() {
    this.platform
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => this.settings.set(settings),
        error: () => undefined,
      });

    effect(() => {
      if (this.user()) {
        this.store.dispatch(new LoadNotifications());
      }
    });
  }

  siteName(): string {
    return localizedValue(this.settings()?.siteName, this.language.lang()) || 'Arena.ge';
  }

  logout(): void {
    this.store.dispatch(new Logout()).subscribe({
      next: () => {
        this.mobileOpen.set(false);
        this.toasts.info('auth.loggedOut');
        void this.router.navigate(['/']);
      },
    });
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
