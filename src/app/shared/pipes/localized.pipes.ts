import { Pipe, PipeTransform, inject } from '@angular/core';
import type { LanguageCode, LocalizedString } from '../../core/models/api.model';
import { LanguageService } from '../../core/services/language.service';
import { formatDate, formatMoney, localizedValue } from '../../core/utils/localized';

@Pipe({ name: 'localized', pure: false })
export class LocalizedPipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(value: LocalizedString | null | undefined): string {
    return localizedValue(value, this.language.lang());
  }
}

@Pipe({ name: 'localDate', pure: false })
export class LocalDatePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(
    value: string | Date | null | undefined,
    style: 'date' | 'datetime' | 'time' | 'long' = 'date',
  ): string {
    return formatDate(value, this.language.lang(), style);
  }
}

@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(
    amount: number | null | undefined,
    currency = 'GEL',
    maximumFractionDigits = 0,
  ): string {
    return formatMoney(amount, currency, this.language.lang(), maximumFractionDigits);
  }
}

@Pipe({ name: 'lang', pure: false })
export class CurrentLanguagePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(): LanguageCode {
    return this.language.lang();
  }
}
