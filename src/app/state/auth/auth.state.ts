import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { catchError, finalize, of, tap, throwError } from 'rxjs';
import { SessionStorageService } from '../../core/services/session-storage.service';
import {
  AuthApiService,
  type ChangePasswordPayload,
  type LoginPayload,
  type RegisterPayload,
} from '../../core/services/auth-api.service';
import type { User } from '../../core/models/user.model';
import type { ProfileUpdate } from '../../core/models/user.model';
import { toApiClientError } from '../../core/utils/http-error';

export interface AuthStateModel {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

export class Login {
  static readonly type = '[Auth] Login';
  constructor(readonly payload: LoginPayload) {}
}

export class Register {
  static readonly type = '[Auth] Register';
  constructor(readonly payload: RegisterPayload) {}
}

export class LoadMe {
  static readonly type = '[Auth] Load me';
}

export class Logout {
  static readonly type = '[Auth] Logout';
}

export class UpdateProfile {
  static readonly type = '[Auth] Update profile';
  constructor(readonly payload: ProfileUpdate) {}
}

export class ChangePassword {
  static readonly type = '[Auth] Change password';
  constructor(readonly payload: ChangePasswordPayload) {}
}

export class ClearAuthError {
  static readonly type = '[Auth] Clear error';
}

const defaults: AuthStateModel = {
  user: null,
  loading: false,
  initialized: false,
  error: null,
};

@State<AuthStateModel>({
  name: 'auth',
  defaults,
})
@Injectable()
export class AuthState {
  constructor(
    private readonly api: AuthApiService,
    private readonly session: SessionStorageService,
  ) {}

  @Selector()
  static user(state: AuthStateModel): User | null {
    return state.user;
  }

  @Selector()
  static isAuthenticated(state: AuthStateModel): boolean {
    return Boolean(state.user);
  }

  @Selector()
  static isAdmin(state: AuthStateModel): boolean {
    return state.user?.role === 'admin' || state.user?.role === 'super_admin';
  }

  @Selector()
  static isSuperAdmin(state: AuthStateModel): boolean {
    return state.user?.role === 'super_admin';
  }

  @Selector()
  static initialized(state: AuthStateModel): boolean {
    return state.initialized;
  }

  @Selector()
  static loading(state: AuthStateModel): boolean {
    return state.loading;
  }

  @Action(Login)
  login(ctx: StateContext<AuthStateModel>, action: Login) {
    ctx.patchState({ loading: true, error: null });
    return this.api.login(action.payload).pipe(
      tap(({ user, accessToken }) => {
        this.session.setAccessToken(accessToken);
        ctx.patchState({ user, loading: false, initialized: true });
      }),
      catchError((error: unknown) => {
        ctx.patchState({ loading: false, error: toApiClientError(error).code });
        return throwError(() => error);
      }),
    );
  }

  @Action(Register)
  register(ctx: StateContext<AuthStateModel>, action: Register) {
    ctx.patchState({ loading: true, error: null });
    return this.api.register(action.payload).pipe(
      tap(({ user, accessToken }) => {
        this.session.setAccessToken(accessToken);
        ctx.patchState({ user, loading: false, initialized: true });
      }),
      catchError((error: unknown) => {
        ctx.patchState({ loading: false, error: toApiClientError(error).code });
        return throwError(() => error);
      }),
    );
  }

  @Action(LoadMe)
  loadMe(ctx: StateContext<AuthStateModel>) {
    if (!this.session.accessToken) {
      ctx.patchState({ user: null, initialized: true });
      return;
    }
    ctx.patchState({ loading: true });
    return this.api.me().pipe(
      tap((user) => ctx.patchState({ user, loading: false, initialized: true, error: null })),
      catchError((error: unknown) => {
        this.session.clear();
        ctx.patchState({
          user: null,
          loading: false,
          initialized: true,
          error: toApiClientError(error).code,
        });
        return of(null);
      }),
    );
  }

  @Action(Logout)
  logout(ctx: StateContext<AuthStateModel>) {
    return this.api.logout().pipe(
      catchError(() => of(null)),
      finalize(() => {
        this.session.clear();
        ctx.setState({ ...defaults, initialized: true });
      }),
    );
  }

  @Action(UpdateProfile)
  updateProfile(ctx: StateContext<AuthStateModel>, action: UpdateProfile) {
    ctx.patchState({ loading: true });
    return this.api.updateProfile(action.payload).pipe(
      tap((user) => ctx.patchState({ user, loading: false })),
      catchError((error: unknown) => {
        ctx.patchState({ loading: false });
        return throwError(() => error);
      }),
    );
  }

  @Action(ChangePassword)
  changePassword(
    ctx: StateContext<AuthStateModel>,
    action: ChangePassword,
  ) {
    ctx.patchState({ loading: true });
    return this.api.changePassword(action.payload).pipe(
      tap(() => ctx.patchState({ loading: false })),
      catchError((error: unknown) => {
        ctx.patchState({ loading: false });
        return throwError(() => error);
      }),
    );
  }

  @Action(ClearAuthError)
  clearError(ctx: StateContext<AuthStateModel>) {
    ctx.patchState({ error: null });
  }
}
