import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  PLATFORM_ID,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import type { GameCategory } from '../../../core/models/category.model';
import { LanguageService } from '../../../core/services/language.service';
import { localizedValue } from '../../../core/utils/localized';

interface FilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-tournament-filters',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, Select, DatePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form()" class="space-y-4" (submit)="$event.preventDefault()">
      <div>
        <label class="field-label" for="filter-q">{{ 'common.search' | translate }}</label>
        <div class="relative">
          <i class="pi pi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted" aria-hidden="true"></i>
          <input
            id="filter-q"
            type="search"
            formControlName="q"
            class="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            [placeholder]="'tournaments.searchPlaceholder' | translate"
          />
        </div>
      </div>

      <div>
        <label class="field-label" for="filter-category">{{ 'tournaments.category' | translate }}</label>
        <p-select
          inputId="filter-category"
          formControlName="category"
          [options]="categoryOptions()"
          optionLabel="label"
          optionValue="value"
          appendTo="body"
          [placeholder]="'tournaments.allCategories' | translate"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="field-label" for="filter-status">{{ 'tournaments.status' | translate }}</label>
          <p-select
            inputId="filter-status"
            formControlName="status"
            [options]="statusOptions()"
            optionLabel="label"
            optionValue="value"
            appendTo="body"
            [placeholder]="'tournaments.allStatuses' | translate"
          />
        </div>
        <div>
          <label class="field-label" for="filter-reg">{{ 'tournaments.registrationStatus' | translate }}</label>
          <p-select
            inputId="filter-reg"
            formControlName="registrationStatus"
            [options]="registrationOptions()"
            optionLabel="label"
            optionValue="value"
            appendTo="body"
            [placeholder]="'common.all' | translate"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="field-label" for="filter-from">{{ 'tournaments.dateFrom' | translate }}</label>
          <p-datepicker
            inputId="filter-from"
            formControlName="dateFrom"
            [showIcon]="true"
            [showButtonBar]="true"
            [appendTo]="overlayTarget"
            [placeholder]="'tournaments.datePlaceholder' | translate"
          />
        </div>
        <div>
          <label class="field-label" for="filter-to">{{ 'tournaments.dateTo' | translate }}</label>
          <p-datepicker
            inputId="filter-to"
            formControlName="dateTo"
            [showIcon]="true"
            [showButtonBar]="true"
            [appendTo]="overlayTarget"
            [placeholder]="'tournaments.datePlaceholder' | translate"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="field-label" for="filter-mode">{{ 'tournaments.mode' | translate }}</label>
          <p-select
            inputId="filter-mode"
            formControlName="online"
            [options]="modeOptions()"
            optionLabel="label"
            optionValue="value"
            appendTo="body"
            [placeholder]="'tournaments.allModes' | translate"
          />
        </div>
        <div>
          <label class="field-label" for="filter-fee">{{ 'tournaments.fee' | translate }}</label>
          <p-select
            inputId="filter-fee"
            formControlName="fee"
            [options]="feeOptions()"
            optionLabel="label"
            optionValue="value"
            appendTo="body"
            [placeholder]="'tournaments.allFees' | translate"
          />
        </div>
      </div>

      <div>
        <label class="field-label" for="filter-city">{{ 'tournaments.city' | translate }}</label>
        <input
          id="filter-city"
          type="text"
          formControlName="city"
          class="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
          placeholder="Tbilisi"
        />
      </div>

      <div>
        <label class="field-label" for="filter-sort">{{ 'tournaments.sort' | translate }}</label>
        <p-select
          inputId="filter-sort"
          formControlName="sort"
          [options]="sortOptions()"
          optionLabel="label"
          optionValue="value"
          appendTo="body"
        />
      </div>

      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-3 py-2.5 text-[13px] font-semibold text-muted transition-colors hover:border-danger/40 hover:text-danger"
        (click)="reset.emit()"
      >
        <i class="pi pi-filter-slash text-[11px]" aria-hidden="true"></i>
        {{ 'common.clearFilters' | translate }}
      </button>
    </form>
  `,
})
export class TournamentFiltersComponent {
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  readonly form = input.required<FormGroup>();
  readonly categories = input<GameCategory[]>([]);
  readonly reset = output<void>();

  // The datepicker overlay renders eagerly; appending it to <body> breaks SSR hydration serialization.
  readonly overlayTarget = isPlatformBrowser(inject(PLATFORM_ID)) ? 'body' : 'self';

  readonly categoryOptions = computed<FilterOption[]>(() => [
    { label: this.translate.instant('tournaments.allCategories'), value: '' },
    ...this.categories().map((category) => ({
      label: localizedValue(category.name, this.language.lang()),
      value: category.slug,
    })),
  ]);

  readonly statusOptions = computed<FilterOption[]>(() => [
    { label: this.translate.instant('tournaments.allStatuses'), value: '' },
    { label: this.translate.instant('status.published'), value: 'published' },
    { label: this.translate.instant('status.ongoing'), value: 'ongoing' },
    { label: this.translate.instant('status.completed'), value: 'completed' },
  ]);

  readonly registrationOptions = computed<FilterOption[]>(() => [
    { label: this.translate.instant('common.all'), value: '' },
    { label: this.translate.instant('tournaments.regOpen'), value: 'open' },
    { label: this.translate.instant('tournaments.regClosingSoon'), value: 'closing_soon' },
    { label: this.translate.instant('tournaments.regFull'), value: 'full' },
    { label: this.translate.instant('tournaments.regClosed'), value: 'closed' },
  ]);

  readonly modeOptions = computed<FilterOption[]>(() => [
    { label: this.translate.instant('tournaments.allModes'), value: '' },
    { label: this.translate.instant('common.online'), value: 'true' },
    { label: this.translate.instant('common.offline'), value: 'false' },
  ]);

  readonly feeOptions = computed<FilterOption[]>(() => [
    { label: this.translate.instant('tournaments.allFees'), value: '' },
    { label: this.translate.instant('common.free'), value: 'free' },
    { label: this.translate.instant('common.paid'), value: 'paid' },
  ]);

  readonly sortOptions = computed<FilterOption[]>(() => [
    { label: this.translate.instant('tournaments.sortUpcoming'), value: 'upcoming' },
    { label: this.translate.instant('tournaments.sortNewest'), value: 'newest' },
    { label: this.translate.instant('tournaments.sortDeadline'), value: 'deadline' },
    { label: this.translate.instant('tournaments.sortPopular'), value: 'popular' },
    { label: this.translate.instant('tournaments.sortOldest'), value: 'oldest' },
  ]);
}
