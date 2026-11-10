import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { catchError, tap, throwError } from 'rxjs';
import type { DashboardData } from '../../core/models/dashboard.model';
import { ApiService } from '../../core/services/api.service';
import { Logout } from '../auth/auth.state';

export interface DashboardStateModel {
  data: DashboardData | null;
  loading: boolean;
  error: boolean;
}

export class LoadDashboard {
  static readonly type = '[Dashboard] Load';
}

const defaults: DashboardStateModel = { data: null, loading: false, error: false };

@State<DashboardStateModel>({ name: 'dashboard', defaults })
@Injectable()
export class DashboardState {
  constructor(private readonly api: ApiService) {}

  @Selector()
  static data(state: DashboardStateModel): DashboardData | null {
    return state.data;
  }

  @Selector()
  static loading(state: DashboardStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static error(state: DashboardStateModel): boolean {
    return state.error;
  }

  @Action(LoadDashboard)
  load(ctx: StateContext<DashboardStateModel>) {
    ctx.patchState({ loading: true, error: false });
    return this.api.get<DashboardData>('/admin/dashboard/stats').pipe(
      tap((data) => ctx.patchState({ data, loading: false, error: false })),
      catchError((error: unknown) => {
        ctx.patchState({ loading: false, error: true });
        return throwError(() => error);
      }),
    );
  }

  @Action(Logout)
  clear(ctx: StateContext<DashboardStateModel>) {
    ctx.setState({ ...defaults });
  }
}
