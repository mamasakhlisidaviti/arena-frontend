import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Store } from '@ngxs/store';
import { firstValueFrom } from 'rxjs';
import { SessionStorageService } from '../services/session-storage.service';
import { AuthState, LoadMe } from '../../state/auth/auth.state';

async function ensureUserLoaded(): Promise<void> {
  const store = inject(Store);
  const session = inject(SessionStorageService);
  if (!session.accessToken) {
    return;
  }
  if (store.selectSnapshot(AuthState.initialized)) {
    return;
  }
  try {
    await firstValueFrom(store.dispatch(new LoadMe()));
  } catch {
    // state already reflects the failure
  }
}

export const authGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const store = inject(Store);
  const session = inject(SessionStorageService);

  await ensureUserLoaded();
  if (!session.accessToken || !store.selectSnapshot(AuthState.user)) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return true;
};

export const adminGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const store = inject(Store);
  const session = inject(SessionStorageService);

  await ensureUserLoaded();
  if (!session.accessToken || !store.selectSnapshot(AuthState.user)) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  if (!store.selectSnapshot(AuthState.isAdmin)) {
    return router.createUrlTree(['/']);
  }
  return true;
};

export const superAdminGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const store = inject(Store);
  const session = inject(SessionStorageService);

  await ensureUserLoaded();
  if (!session.accessToken || !store.selectSnapshot(AuthState.user)) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  if (!store.selectSnapshot(AuthState.isAdmin)) {
    return router.createUrlTree(['/']);
  }
  if (!store.selectSnapshot(AuthState.isSuperAdmin)) {
    return router.createUrlTree(['/admin/dashboard']);
  }
  return true;
};

export const guestGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const store = inject(Store);
  const session = inject(SessionStorageService);
  if (!session.accessToken) {
    return true;
  }
  if (!store.selectSnapshot(AuthState.initialized)) {
    await ensureUserLoaded();
  }
  if (store.selectSnapshot(AuthState.user)) {
    return router.createUrlTree(['/account']);
  }
  return true;
};
