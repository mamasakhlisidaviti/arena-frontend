import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { catchError, of, tap, throwError } from 'rxjs';
import { APP } from '../../core/config/app.constants';
import type { HomeData } from '../../core/models/dashboard.model';
import type { PaginationMeta, TournamentStatus } from '../../core/models/api.model';
import type {
  Tournament,
  TournamentInput,
  TournamentListQuery,
} from '../../core/models/tournament.model';
import { ApiService, type QueryParams } from '../../core/services/api.service';

export interface TournamentStateModel {
  items: Tournament[];
  meta: PaginationMeta;
  query: TournamentListQuery;
  listLoading: boolean;
  listError: boolean;
  adminItems: Tournament[];
  adminMeta: PaginationMeta;
  adminQuery: TournamentListQuery;
  adminLoading: boolean;
  adminError: boolean;
  detail: Tournament | null;
  detailLoading: boolean;
  detailError: boolean;
  home: HomeData | null;
  homeLoading: boolean;
  homeError: boolean;
  saving: boolean;
  lastSaved: Tournament | null;
}

export class LoadPublicTournaments {
  static readonly type = '[Tournaments] Load public';
  constructor(readonly query: TournamentListQuery = {}) {}
}

export class LoadTournament {
  static readonly type = '[Tournaments] Load detail';
  constructor(
    readonly slug: string,
    readonly force = false,
  ) {}
}

export class LoadHome {
  static readonly type = '[Tournaments] Load home';
}

export class LoadAdminTournaments {
  static readonly type = '[Tournaments] Load admin';
  constructor(readonly query: TournamentListQuery = {}) {}
}

export class CreateTournament {
  static readonly type = '[Tournaments] Create';
  constructor(readonly payload: TournamentInput) {}
}

export class UpdateTournament {
  static readonly type = '[Tournaments] Update';
  constructor(
    readonly id: string,
    readonly payload: TournamentInput,
  ) {}
}

export class ChangeTournamentStatus {
  static readonly type = '[Tournaments] Change status';
  constructor(
    readonly id: string,
    readonly status: TournamentStatus,
  ) {}
}

export class DuplicateTournament {
  static readonly type = '[Tournaments] Duplicate';
  constructor(readonly id: string) {}
}

export class DeleteTournament {
  static readonly type = '[Tournaments] Delete';
  constructor(readonly id: string) {}
}

const emptyMeta: PaginationMeta = { page: 1, limit: APP.pageSize, total: 0, totalPages: 1 };

const defaults: TournamentStateModel = {
  items: [],
  meta: emptyMeta,
  query: { page: 1, limit: APP.pageSize, sort: 'upcoming' },
  listLoading: false,
  listError: false,
  adminItems: [],
  adminMeta: { ...emptyMeta, limit: APP.adminPageSize },
  adminQuery: { page: 1, limit: APP.adminPageSize, sort: 'newest' },
  adminLoading: false,
  adminError: false,
  detail: null,
  detailLoading: false,
  detailError: false,
  home: null,
  homeLoading: false,
  homeError: false,
  saving: false,
  lastSaved: null,
};

function asParams(query: TournamentListQuery): QueryParams {
  return { ...query } as QueryParams;
}

@State<TournamentStateModel>({ name: 'tournaments', defaults })
@Injectable()
export class TournamentState {
  constructor(private readonly api: ApiService) {}

  @Selector()
  static items(state: TournamentStateModel): Tournament[] {
    return state.items;
  }

  @Selector()
  static meta(state: TournamentStateModel): PaginationMeta {
    return state.meta;
  }

  @Selector()
  static query(state: TournamentStateModel): TournamentListQuery {
    return state.query;
  }

  @Selector()
  static listLoading(state: TournamentStateModel): boolean {
    return state.listLoading;
  }

  @Selector()
  static listError(state: TournamentStateModel): boolean {
    return state.listError;
  }

  @Selector()
  static detail(state: TournamentStateModel): Tournament | null {
    return state.detail;
  }

  @Selector()
  static detailLoading(state: TournamentStateModel): boolean {
    return state.detailLoading;
  }

  @Selector()
  static detailError(state: TournamentStateModel): boolean {
    return state.detailError;
  }

  @Selector()
  static home(state: TournamentStateModel): HomeData | null {
    return state.home;
  }

  @Selector()
  static homeLoading(state: TournamentStateModel): boolean {
    return state.homeLoading;
  }

  @Selector()
  static adminItems(state: TournamentStateModel): Tournament[] {
    return state.adminItems;
  }

  @Selector()
  static adminMeta(state: TournamentStateModel): PaginationMeta {
    return state.adminMeta;
  }

  @Selector()
  static adminLoading(state: TournamentStateModel): boolean {
    return state.adminLoading;
  }

  @Selector()
  static adminError(state: TournamentStateModel): boolean {
    return state.adminError;
  }

  @Selector()
  static saving(state: TournamentStateModel): boolean {
    return state.saving;
  }

  @Selector()
  static lastSaved(state: TournamentStateModel): Tournament | null {
    return state.lastSaved;
  }

  @Action(LoadPublicTournaments)
  loadPublic(ctx: StateContext<TournamentStateModel>, action: LoadPublicTournaments) {
    const query: TournamentListQuery = {
      page: 1,
      limit: APP.pageSize,
      sort: 'upcoming',
      ...action.query,
    };
    ctx.patchState({ query, listLoading: true, listError: false });
    return this.api.getPage<Tournament[]>('/tournaments', asParams(query)).pipe(
      tap(({ data, meta }) =>
        ctx.patchState({ items: data, meta, listLoading: false, listError: false }),
      ),
      catchError((error: unknown) => {
        ctx.patchState({ listLoading: false, listError: true, items: [] });
        return throwError(() => error);
      }),
    );
  }

  @Action(LoadTournament)
  loadDetail(ctx: StateContext<TournamentStateModel>, action: LoadTournament) {
    const current = ctx.getState().detail;
    if (!action.force && current?.slug === action.slug) {
      return;
    }
    ctx.patchState({ detailLoading: true, detailError: false, detail: null });
    return this.api.get<Tournament>(`/tournaments/${action.slug}`).pipe(
      tap((detail) =>
        ctx.patchState({ detail, detailLoading: false, detailError: false }),
      ),
      catchError((error: unknown) => {
        ctx.patchState({ detailLoading: false, detailError: true, detail: null });
        return throwError(() => error);
      }),
    );
  }

  @Action(LoadHome)
  loadHome(ctx: StateContext<TournamentStateModel>) {
    if (ctx.getState().homeLoading) {
      return;
    }
    ctx.patchState({ homeLoading: true, homeError: false });
    return this.api.get<HomeData>('/home').pipe(
      tap((home) => ctx.patchState({ home, homeLoading: false, homeError: false })),
      catchError((error: unknown) => {
        ctx.patchState({ homeLoading: false, homeError: true });
        return throwError(() => error);
      }),
    );
  }

  @Action(LoadAdminTournaments)
  loadAdmin(ctx: StateContext<TournamentStateModel>, action: LoadAdminTournaments) {
    const query: TournamentListQuery = {
      page: 1,
      limit: APP.adminPageSize,
      sort: 'newest',
      ...action.query,
    };
    ctx.patchState({ adminQuery: query, adminLoading: true, adminError: false });
    return this.api.getPage<Tournament[]>('/admin/tournaments', asParams(query)).pipe(
      tap(({ data, meta }) =>
        ctx.patchState({ adminItems: data, adminMeta: meta, adminLoading: false }),
      ),
      catchError((error: unknown) => {
        ctx.patchState({ adminLoading: false, adminError: true, adminItems: [] });
        return throwError(() => error);
      }),
    );
  }

  @Action(CreateTournament)
  create(ctx: StateContext<TournamentStateModel>, action: CreateTournament) {
    ctx.patchState({ saving: true, lastSaved: null });
    return this.api.post<Tournament>('/tournaments', action.payload).pipe(
      tap((tournament) => ctx.patchState({ saving: false, lastSaved: tournament })),
      catchError((error: unknown) => {
        ctx.patchState({ saving: false });
        return throwError(() => error);
      }),
    );
  }

  @Action(UpdateTournament)
  update(ctx: StateContext<TournamentStateModel>, action: UpdateTournament) {
    ctx.patchState({ saving: true, lastSaved: null });
    return this.api.put<Tournament>(`/tournaments/${action.id}`, action.payload).pipe(
      tap((tournament) => {
        const state = ctx.getState();
        ctx.patchState({
          saving: false,
          lastSaved: tournament,
          adminItems: state.adminItems.map((item) =>
            item.id === tournament.id ? tournament : item,
          ),
          detail: state.detail?.id === tournament.id ? tournament : state.detail,
        });
      }),
      catchError((error: unknown) => {
        ctx.patchState({ saving: false });
        return throwError(() => error);
      }),
    );
  }

  @Action(ChangeTournamentStatus)
  changeStatus(ctx: StateContext<TournamentStateModel>, action: ChangeTournamentStatus) {
    return this.api
      .patch<Tournament>(`/tournaments/${action.id}/status`, { status: action.status })
      .pipe(
        tap((tournament) => {
          const state = ctx.getState();
          ctx.patchState({
            adminItems: state.adminItems.map((item) =>
              item.id === tournament.id ? tournament : item,
            ),
            detail: state.detail?.id === tournament.id ? tournament : state.detail,
          });
        }),
        catchError((error: unknown) => throwError(() => error)),
      );
  }

  @Action(DuplicateTournament)
  duplicate(ctx: StateContext<TournamentStateModel>, action: DuplicateTournament) {
    ctx.patchState({ saving: true });
    return this.api.post<Tournament>(`/tournaments/${action.id}/duplicate`).pipe(
      tap((tournament) => {
        const state = ctx.getState();
        ctx.patchState({
          saving: false,
          lastSaved: tournament,
          adminItems: [tournament, ...state.adminItems],
          adminMeta: { ...state.adminMeta, total: state.adminMeta.total + 1 },
        });
      }),
      catchError((error: unknown) => {
        ctx.patchState({ saving: false });
        return throwError(() => error);
      }),
    );
  }

  @Action(DeleteTournament)
  delete(ctx: StateContext<TournamentStateModel>, action: DeleteTournament) {
    return this.api.delete<void>(`/tournaments/${action.id}`).pipe(
      tap(() => {
        const state = ctx.getState();
        ctx.patchState({
          adminItems: state.adminItems.filter((item) => item.id !== action.id),
          adminMeta: {
            ...state.adminMeta,
            total: Math.max(0, state.adminMeta.total - 1),
          },
          detail: state.detail?.id === action.id ? null : state.detail,
        });
      }),
      catchError((error: unknown) => throwError(() => error)),
    );
  }
}
