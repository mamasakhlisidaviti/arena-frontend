import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { catchError, of, tap, throwError } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import type { CategoryInput, GameCategory } from '../../core/models/category.model';

export interface CategoryStateModel {
  items: GameCategory[];
  adminItems: GameCategory[];
  loading: boolean;
  adminLoading: boolean;
  loaded: boolean;
  adminLoaded: boolean;
  error: string | null;
}

export class LoadCategories {
  static readonly type = '[Categories] Load';
  constructor(readonly force = false) {}
}

export class LoadAdminCategories {
  static readonly type = '[Categories] Load admin';
  constructor(readonly force = false) {}
}

export class CreateCategory {
  static readonly type = '[Categories] Create';
  constructor(readonly payload: CategoryInput) {}
}

export class UpdateCategory {
  static readonly type = '[Categories] Update';
  constructor(
    readonly id: string,
    readonly payload: CategoryInput,
  ) {}
}

export class DeleteCategory {
  static readonly type = '[Categories] Delete';
  constructor(readonly id: string) {}
}

const defaults: CategoryStateModel = {
  items: [],
  adminItems: [],
  loading: false,
  adminLoading: false,
  loaded: false,
  adminLoaded: false,
  error: null,
};

@State<CategoryStateModel>({ name: 'categories', defaults })
@Injectable()
export class CategoryState {
  constructor(private readonly api: ApiService) {}

  @Selector()
  static items(state: CategoryStateModel): GameCategory[] {
    return state.items;
  }

  @Selector()
  static adminItems(state: CategoryStateModel): GameCategory[] {
    return state.adminItems;
  }

  @Selector()
  static loading(state: CategoryStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static adminLoading(state: CategoryStateModel): boolean {
    return state.adminLoading;
  }

  @Action(LoadCategories)
  load(ctx: StateContext<CategoryStateModel>, action: LoadCategories) {
    if (!action.force && ctx.getState().loaded) {
      return;
    }
    ctx.patchState({ loading: true, error: null });
    return this.api.get<GameCategory[]>('/categories').pipe(
      tap((items) =>
        ctx.patchState({ items, loading: false, loaded: true, error: null }),
      ),
      catchError((error: unknown) => {
        ctx.patchState({ loading: false, error: 'errors.loadFailed' });
        return throwError(() => error);
      }),
    );
  }

  @Action(LoadAdminCategories)
  loadAdmin(ctx: StateContext<CategoryStateModel>, action: LoadAdminCategories) {
    if (!action.force && ctx.getState().adminLoaded) {
      return;
    }
    ctx.patchState({ adminLoading: true });
    return this.api.get<GameCategory[]>('/categories/admin/all').pipe(
      tap((adminItems) =>
        ctx.patchState({ adminItems, adminLoading: false, adminLoaded: true }),
      ),
      catchError((error: unknown) => {
        ctx.patchState({ adminLoading: false });
        return throwError(() => error);
      }),
    );
  }

  @Action(CreateCategory)
  create(ctx: StateContext<CategoryStateModel>, action: CreateCategory) {
    return this.api.post<GameCategory>('/categories', action.payload).pipe(
      tap((category) => {
        const state = ctx.getState();
        ctx.patchState({
          adminItems: [...state.adminItems, category].sort(byOrder),
          items: category.isActive ? [...state.items, category].sort(byOrder) : state.items,
        });
      }),
      catchError((error: unknown) => throwError(() => error)),
    );
  }

  @Action(UpdateCategory)
  update(ctx: StateContext<CategoryStateModel>, action: UpdateCategory) {
    return this.api.put<GameCategory>(`/categories/${action.id}`, action.payload).pipe(
      tap((category) => {
        const state = ctx.getState();
        const replace = (list: GameCategory[]) =>
          list.map((item) => (item.id === category.id ? category : item)).sort(byOrder);
        ctx.patchState({
          adminItems: replace(state.adminItems),
          items: category.isActive
            ? replace(state.items)
            : state.items.filter((item) => item.id !== category.id),
        });
      }),
      catchError((error: unknown) => throwError(() => error)),
    );
  }

  @Action(DeleteCategory)
  delete(ctx: StateContext<CategoryStateModel>, action: DeleteCategory) {
    return this.api.delete<void>(`/categories/${action.id}`).pipe(
      tap(() => {
        const state = ctx.getState();
        ctx.patchState({
          adminItems: state.adminItems.filter((item) => item.id !== action.id),
          items: state.items.filter((item) => item.id !== action.id),
        });
      }),
      catchError((error: unknown) => throwError(() => error)),
    );
  }
}

function byOrder(a: GameCategory, b: GameCategory): number {
  return a.displayOrder - b.displayOrder || a.name.en.localeCompare(b.name.en);
}
