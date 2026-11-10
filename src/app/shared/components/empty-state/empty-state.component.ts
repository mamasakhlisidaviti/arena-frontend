import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span class="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-2xl text-brand">
        <i [class]="icon()" aria-hidden="true"></i>
      </span>
      <h3 class="mt-5 text-lg font-bold text-ink">
        {{ (titleKey() | translate) || title() }}
      </h3>
      @if (textKey() || text()) {
        <p class="mt-2 max-w-md text-sm leading-6 text-muted">
          {{ (textKey() | translate) || text() }}
        </p>
      }
      @if (actionKey()) {
        @if (actionLink()) {
          <a
            [routerLink]="actionLink()"
            class="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            {{ actionKey() | translate }}
            <i class="pi pi-arrow-right text-xs" aria-hidden="true"></i>
          </a>
        } @else {
          <button
            type="button"
            class="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            (click)="action.emit()"
          >
            {{ actionKey() | translate }}
          </button>
        }
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input('pi pi-search');
  readonly title = input('');
  readonly titleKey = input('');
  readonly text = input('');
  readonly textKey = input('');
  readonly actionKey = input('');
  readonly actionLink = input<string | null>(null);
  readonly action = output<void>();
}
