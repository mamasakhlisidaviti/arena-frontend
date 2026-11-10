import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeState, SetThemeMode } from '../../../state/theme/theme.state';
import type { ThemeMode } from '../../../core/models/api.model';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5"
      role="group"
      [attr.aria-label]="'common.theme' | translate"
    >
      @for (option of options; track option.mode) {
        <button
          type="button"
          class="grid h-7 w-7 place-items-center rounded-md text-[13px] transition-colors"
          [class]="mode() === option.mode ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'"
          [attr.aria-pressed]="mode() === option.mode"
          [attr.aria-label]="option.labelKey | translate"
          [title]="option.labelKey | translate"
          (click)="setMode(option.mode)"
        >
          <i [class]="option.icon" aria-hidden="true"></i>
        </button>
      }
    </div>
  `,
})
export class ThemeSwitcherComponent {
  private readonly store = inject(Store);

  readonly mode = this.store.selectSignal(ThemeState.mode);

  readonly options: { mode: ThemeMode; icon: string; labelKey: string }[] = [
    { mode: 'light', icon: 'pi pi-sun', labelKey: 'theme.switchToLight' },
    { mode: 'dark', icon: 'pi pi-moon', labelKey: 'theme.switchToDark' },
    { mode: 'system', icon: 'pi pi-desktop', labelKey: 'theme.useSystem' },
  ];

  setMode(mode: ThemeMode): void {
    this.store.dispatch(new SetThemeMode(mode));
  }
}
