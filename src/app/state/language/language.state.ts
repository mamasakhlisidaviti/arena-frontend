import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext, type NgxsOnInit } from '@ngxs/store';
import type { LanguageCode } from '../../core/models/api.model';
import { LanguageService } from '../../core/services/language.service';

export interface LanguageStateModel {
  language: LanguageCode;
}

export class SetLanguage {
  static readonly type = '[Language] Set';
  constructor(readonly language: LanguageCode) {}
}

const defaults: LanguageStateModel = { language: 'ka' };

@State<LanguageStateModel>({ name: 'language', defaults })
@Injectable()
export class LanguageState implements NgxsOnInit {
  constructor(private readonly languages: LanguageService) {}

  @Selector()
  static language(state: LanguageStateModel): LanguageCode {
    return state.language;
  }

  ngxsOnInit(ctx: StateContext<LanguageStateModel>): void {
    ctx.patchState({ language: this.languages.lang() });
  }

  @Action(SetLanguage)
  set(ctx: StateContext<LanguageStateModel>, action: SetLanguage) {
    this.languages.setLanguage(action.language);
    ctx.patchState({ language: action.language });
  }
}
