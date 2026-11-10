import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslatePipe } from '@ngx-translate/core';
import { Drawer } from 'primeng/drawer';
import { ToastService } from '../../core/services/toast.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { LangSwitcherComponent } from '../../shared/components/lang-switcher/lang-switcher.component';
import { ThemeSwitcherComponent } from '../../shared/components/theme-switcher/theme-switcher.component';
import { UserAvatarComponent } from '../../shared/components/avatar/user-avatar.component';
import { AuthState, Logout } from '../../state/auth/auth.state';

interface AdminNavItem {
  labelKey: string;
  icon: string;
  route: string;
  exact?: boolean;
  superOnly?: boolean;
}

@Component({
  selector: 'app-admin-layout',
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
  templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  readonly user = this.store.selectSignal(AuthState.user);
  readonly isSuperAdmin = this.store.selectSignal(AuthState.isSuperAdmin);
  readonly mobileOpen = signal(false);

  readonly navItems: AdminNavItem[] = [
    { labelKey: 'admin.dashboard', icon: 'pi pi-th-large', route: '/admin/dashboard', exact: true },
    { labelKey: 'admin.tournamentsTitle', icon: 'pi pi-flag', route: '/admin/tournaments' },
    { labelKey: 'admin.categoriesTitle', icon: 'pi pi-sitemap', route: '/admin/categories', superOnly: true },
    { labelKey: 'admin.usersTitle', icon: 'pi pi-users', route: '/admin/users', superOnly: true },
    { labelKey: 'admin.settingsTitle', icon: 'pi pi-cog', route: '/admin/settings', superOnly: true },
  ];

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
