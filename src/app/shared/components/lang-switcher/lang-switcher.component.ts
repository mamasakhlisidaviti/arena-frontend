import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { TranslatePipe } from '@ngx-translate/core';
import { APP } from '../../../core/config/app.constants';
import type { LanguageCode } from '../../../core/models/api.model';
import { LanguageState, SetLanguage } from '../../../state/language/language.state';

@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex items-center rounded-lg border border-line bg-surface-2 p-0.5"
      role="group"
      [attr.aria-label]="'language.switch' | translate"
    >
      @for (code of languages; track code) {
        <button
          type="button"
          class="rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors"
          [class]="language() === code ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'"
          [attr.aria-pressed]="language() === code"
          [attr.aria-label]="'language.' + code | translate"
          [title]="'language.' + code | translate"
          (click)="setLanguage(code)"
        >
          {{ code }}
        </button>
      }
    </div>
  `,
})
export class LangSwitcherComponent {
  private readonly store = inject(Store);

  readonly languages = APP.languages;
  readonly language = this.store.selectSignal(LanguageState.language);

  setLanguage(language: LanguageCode): void {
    this.store.dispatch(new SetLanguage(language));
  }
}
