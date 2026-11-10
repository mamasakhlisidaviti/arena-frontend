import { Routes } from '@angular/router';
import {
  adminGuard,
  authGuard,
  guestGuard,
  superAdminGuard,
} from './core/guards/auth.guards';

// The admin branch must precede the public branch: its catch-all `**` child would otherwise
// match /admin/** before the router reaches the admin routes.
export const routes: Routes = [
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'tournaments',
        loadComponent: () =>
          import('./features/admin/tournaments/admin-tournaments.page').then(
            (m) => m.AdminTournamentsPage,
          ),
      },
      {
        path: 'tournaments/new',
        loadComponent: () =>
          import('./features/admin/tournament-wizard/tournament-wizard.page').then(
            (m) => m.TournamentWizardPage,
          ),
      },
      {
        path: 'tournaments/:id/edit',
        loadComponent: () =>
          import('./features/admin/tournament-wizard/tournament-wizard.page').then(
            (m) => m.TournamentWizardPage,
          ),
      },
      {
        path: 'tournaments/:id/participants',
        loadComponent: () =>
          import('./features/admin/participants/participants.page').then(
            (m) => m.ParticipantsPage,
          ),
      },
      {
        path: 'categories',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/admin/categories/admin-categories.page').then(
            (m) => m.AdminCategoriesPage,
          ),
      },
      {
        path: 'users',
        canActivate: [superAdminGuard],
        loadComponent: () => import('./features/admin/users/admin-users.page').then((m) => m.AdminUsersPage),
      },
      {
        path: 'settings',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/admin/settings/admin-settings.page').then(
            (m) => m.AdminSettingsPage,
          ),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/public-layout/public-layout.component').then(
        (m) => m.PublicLayoutComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/public/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'tournaments',
        loadComponent: () =>
          import('./features/public/tournaments/tournaments.page').then(
            (m) => m.TournamentsPage,
          ),
      },
      {
        path: 'tournaments/:slug',
        loadComponent: () =>
          import('./features/public/tournament-detail/tournament-detail.page').then(
            (m) => m.TournamentDetailPage,
          ),
      },
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/register.page').then((m) => m.RegisterPage),
      },
      {
        path: 'account',
        canActivate: [authGuard],
        loadComponent: () => import('./features/account/account.page').then((m) => m.AccountPage),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./features/public/not-found/not-found.page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
