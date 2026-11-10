import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext, type NgxsOnInit } from '@ngxs/store';
import type { ThemeMode } from '../../core/models/api.model';
import { ThemeService } from '../../core/services/theme.service';

export interface ThemeStateModel {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
}

export class SetThemeMode {
  static readonly type = '[Theme] Set mode';
  constructor(readonly mode: ThemeMode) {}
}

export class ToggleTheme {
  static readonly type = '[Theme] Toggle';
}

const defaults: ThemeStateModel = { mode: 'system', resolved: 'light' };

@State<ThemeStateModel>({ name: 'theme', defaults })
@Injectable()
export class ThemeState implements NgxsOnInit {
  constructor(private readonly theme: ThemeService) {}

  @Selector()
  static mode(state: ThemeStateModel): ThemeMode {
    return state.mode;
  }

  @Selector()
  static resolved(state: ThemeStateModel): 'light' | 'dark' {
    return state.resolved;
  }

  ngxsOnInit(ctx: StateContext<ThemeStateModel>): void {
    ctx.patchState({
      mode: this.theme.mode(),
      resolved: this.theme.resolved(),
    });
  }

  @Action(SetThemeMode)
  setMode(ctx: StateContext<ThemeStateModel>, action: SetThemeMode) {
    this.theme.setMode(action.mode);
    ctx.patchState({ mode: action.mode, resolved: this.theme.resolved() });
  }

  @Action(ToggleTheme)
  toggle(ctx: StateContext<ThemeStateModel>) {
    this.theme.toggle();
    ctx.patchState({
      mode: this.theme.mode(),
      resolved: this.theme.resolved(),
    });
  }
}
