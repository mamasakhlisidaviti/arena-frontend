import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      routerLink="/"
      class="group inline-flex items-center gap-2.5"
      aria-label="Arena.ge"
    >
      <span
        class="grid h-9 w-9 place-items-center rounded-xl bg-brand text-xl leading-none text-white shadow-sm transition-transform duration-300 group-hover:-rotate-6"
        aria-hidden="true"
        >♞</span
      >
      <span class="text-[1.05rem] font-extrabold tracking-tight text-ink">
        Arena<span class="text-brand">.ge</span>
      </span>
      @if (showTagline()) {
        <span class="hidden text-[11px] font-medium text-muted xl:inline">ტურნირების პლატფორმა</span>
      }
    </a>
  `,
})
export class LogoComponent {
  readonly showTagline = input(false);
}
