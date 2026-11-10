import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { catchError, of, tap, throwError } from 'rxjs';
import type { AppNotification, Registration, RegistrationInput } from '../../core/models/registration.model';
import { RegistrationApiService } from '../../core/services/registration-api.service';
import { Logout } from '../auth/auth.state';

export interface RegistrationStateModel {
  myRegistrations: Registration[];
  myLoading: boolean;
  myError: boolean;
  lastRegistration: Registration | null;
  registering: boolean;
  notifications: AppNotification[];
  unread: number;
  notificationsLoading: boolean;
}

export class RegisterForTournament {
  static readonly type = '[Registrations] Register';
  constructor(
    readonly tournamentId: string,
    readonly payload: RegistrationInput,
  ) {}
}

export class ClearRegistrationResult {
  static readonly type = '[Registrations] Clear result';
}

export class LoadMyRegistrations {
  static readonly type = '[Registrations] Load mine';
}

export class CancelMyRegistration {
  static readonly type = '[Registrations] Cancel mine';
  constructor(readonly id: string) {}
}

export class LoadNotifications {
  static readonly type = '[Registrations] Load notifications';
}

export class MarkNotificationRead {
  static readonly type = '[Registrations] Mark notification read';
  constructor(readonly id: string) {}
}

export class MarkAllNotificationsRead {
  static readonly type = '[Registrations] Mark all read';
}

const defaults: RegistrationStateModel = {
  myRegistrations: [],
  myLoading: false,
  myError: false,
  lastRegistration: null,
  registering: false,
  notifications: [],
  unread: 0,
  notificationsLoading: false,
};

@State<RegistrationStateModel>({ name: 'registrations', defaults })
@Injectable()
export class RegistrationState {
  constructor(private readonly api: RegistrationApiService) {}

  @Selector()
  static myRegistrations(state: RegistrationStateModel): Registration[] {
    return state.myRegistrations;
  }

  @Selector()
  static myLoading(state: RegistrationStateModel): boolean {
    return state.myLoading;
  }

  @Selector()
  static lastRegistration(state: RegistrationStateModel): Registration | null {
    return state.lastRegistration;
  }

  @Selector()
  static registering(state: RegistrationStateModel): boolean {
    return state.registering;
  }

  @Selector()
  static notifications(state: RegistrationStateModel): AppNotification[] {
    return state.notifications;
  }

  @Selector()
  static notificationsLoading(state: RegistrationStateModel): boolean {
    return state.notificationsLoading;
  }

  @Selector()
  static unread(state: RegistrationStateModel): number {
    return state.unread;
  }

  @Action(RegisterForTournament)
  register(ctx: StateContext<RegistrationStateModel>, action: RegisterForTournament) {
    ctx.patchState({ registering: true, lastRegistration: null });
    return this.api.register(action.tournamentId, action.payload).pipe(
      tap((registration) =>
        ctx.patchState({ registering: false, lastRegistration: registration }),
      ),
      catchError((error: unknown) => {
        ctx.patchState({ registering: false });
        return throwError(() => error);
      }),
    );
  }

  @Action(ClearRegistrationResult)
  clearResult(ctx: StateContext<RegistrationStateModel>) {
    ctx.patchState({ lastRegistration: null });
  }

  @Action(LoadMyRegistrations)
  loadMine(ctx: StateContext<RegistrationStateModel>) {
    ctx.patchState({ myLoading: true, myError: false });
    return this.api.myRegistrations().pipe(
      tap((myRegistrations) =>
        ctx.patchState({ myRegistrations, myLoading: false, myError: false }),
      ),
      catchError((error: unknown) => {
        ctx.patchState({ myLoading: false, myError: true });
        return throwError(() => error);
      }),
    );
  }

  @Action(CancelMyRegistration)
  cancelMine(ctx: StateContext<RegistrationStateModel>, action: CancelMyRegistration) {
    return this.api.cancel(action.id).pipe(
      tap(() =>
        ctx.patchState({
          myRegistrations: ctx
            .getState()
            .myRegistrations.map((item) =>
              item.id === action.id ? { ...item, status: 'cancelled' } : item,
            ),
        }),
      ),
      catchError((error: unknown) => throwError(() => error)),
    );
  }

  @Action(LoadNotifications)
  loadNotifications(ctx: StateContext<RegistrationStateModel>) {
    ctx.patchState({ notificationsLoading: true });
    return this.api.notifications().pipe(
      tap(({ items, unread }) =>
        ctx.patchState({ notifications: items, unread, notificationsLoading: false }),
      ),
      catchError((error: unknown) => {
        ctx.patchState({ notificationsLoading: false });
        return of(null);
      }),
    );
  }

  @Action(MarkNotificationRead)
  markRead(ctx: StateContext<RegistrationStateModel>, action: MarkNotificationRead) {
    return this.api.markNotificationRead(action.id).pipe(
      tap((updated) => {
        const state = ctx.getState();
        const wasUnread = state.notifications.find(
          (item) => item.id === action.id && !item.readAt,
        );
        ctx.patchState({
          notifications: state.notifications.map((item) =>
            item.id === action.id ? updated : item,
          ),
          unread: wasUnread ? Math.max(0, state.unread - 1) : state.unread,
        });
      }),
      catchError((error: unknown) => throwError(() => error)),
    );
  }

  @Action(MarkAllNotificationsRead)
  markAllRead(ctx: StateContext<RegistrationStateModel>) {
    return this.api.markAllNotificationsRead().pipe(
      tap(() => {
        const now = new Date().toISOString();
        ctx.patchState({
          notifications: ctx
            .getState()
            .notifications.map((item) => ({ ...item, readAt: item.readAt ?? now })),
          unread: 0,
        });
      }),
      catchError((error: unknown) => throwError(() => error)),
    );
  }

  @Action(Logout)
  clear(ctx: StateContext<RegistrationStateModel>) {
    ctx.setState({ ...defaults });
  }
}
