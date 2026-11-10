import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

type BadgeTone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'brand';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
      [class]="toneClass()"
    >
      <span class="h-1.5 w-1.5 rounded-full" [class]="dotClass()"></span>
      @if (labelKey()) {
        {{ labelKey() | translate }}
      } @else {
        {{ 'status.' + status() | translate }}
      }
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly labelKey = input<string | null>(null);

  readonly tone = computed<BadgeTone>(() => {
    switch (this.status()) {
      case 'approved':
      case 'published':
      case 'open':
        return 'green';
      case 'pending':
      case 'waitlisted':
      case 'closing_soon':
        return 'amber';
      case 'rejected':
      case 'cancelled':
      case 'full':
        return 'red';
      case 'ongoing':
        return 'blue';
      case 'closed':
      case 'completed':
      case 'draft':
        return 'gray';
      default:
        return 'brand';
    }
  });

  readonly toneClass = computed(() => {
    switch (this.tone()) {
      case 'green':
        return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300';
      case 'amber':
        return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300';
      case 'red':
        return 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300';
      case 'blue':
        return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300';
      case 'gray':
        return 'border-line bg-surface-2 text-muted';
      default:
        return 'border-brand/25 bg-brand-soft text-brand';
    }
  });

  readonly dotClass = computed(() => {
    switch (this.tone()) {
      case 'green':
        return 'bg-emerald-500';
      case 'amber':
        return 'bg-amber-500';
      case 'red':
        return 'bg-rose-500';
      case 'blue':
        return 'bg-sky-500';
      case 'gray':
        return 'bg-muted';
      default:
        return 'bg-brand';
    }
  });
}
