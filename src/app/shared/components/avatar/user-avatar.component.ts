import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (url()) {
      <img
        [src]="url()"
        [alt]="fullName()"
        [class]="sizeClass()"
        class="rounded-full object-cover"
        loading="lazy"
      />
    } @else {
      <span
        [class]="sizeClass()"
        class="grid place-items-center rounded-full bg-brand-soft font-bold uppercase text-brand"
        [attr.aria-label]="fullName()"
      >
        {{ initials() }}
      </span>
    }
  `,
})
export class UserAvatarComponent {
  readonly firstName = input('');
  readonly lastName = input('');
  readonly imageUrl = input<string | null | undefined>(null);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  readonly fullName = computed(
    () => `${this.firstName()} ${this.lastName()}`.trim() || 'Arena',
  );
  readonly initials = computed(
    () =>
      `${this.firstName().charAt(0)}${this.lastName().charAt(0)}`.toUpperCase() || 'A',
  );
  readonly url = computed(() => this.imageUrl() ?? null);
  readonly sizeClass = computed(() =>
    this.size() === 'sm'
      ? 'h-7 w-7 text-[10px]'
      : this.size() === 'lg'
        ? 'h-12 w-12 text-sm'
        : 'h-9 w-9 text-xs',
  );
}
