import { formatCurrency, formatDate as angularDate, formatNumber as angularNumber, getCurrencySymbol, registerLocaleData } from '@angular/common';
import ka from '@angular/common/locales/ka';
import type { LanguageCode, LocalizedString } from '../models/api.model';
import { APP } from '../config/app.constants';

registerLocaleData(ka);

const FALLBACKS: LanguageCode[] = ['en', 'ka', 'ru'];

/** Picks the requested language and falls back through en → ka → ru. */
export function localizedValue(
  value: LocalizedString | null | undefined,
  language: LanguageCode,
): string {
  if (!value) {
    return '';
  }
  const direct = value[language]?.trim();
  if (direct) {
    return direct;
  }
  for (const fallback of [language, ...FALLBACKS]) {
    const candidate = value[fallback]?.trim();
    if (candidate) {
      return candidate;
    }
  }
  return '';
}

export function intlLocale(language: LanguageCode): string {
  switch (language) {
    case 'ka':
      return 'ka-GE';
    case 'ru':
      return 'ru-RU';
    default:
      return 'en-US';
  }
}

export function formatDate(
  value: string | Date | null | undefined,
  language: LanguageCode,
  style: 'date' | 'datetime' | 'time' | 'long' = 'date',
): string {
  if (!value) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  if (language === 'ka') {
    const formats = { date: 'd MMM y', datetime: 'd MMM y, HH:mm', time: 'HH:mm', long: 'd MMMM y' };
    return angularDate(date, formats[style], 'ka');
  }
  const options: Intl.DateTimeFormatOptions =
    style === 'time'
      ? { hour: '2-digit', minute: '2-digit' }
      : style === 'datetime'
        ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        : style === 'long'
          ? { year: 'numeric', month: 'long', day: 'numeric' }
          : { year: 'numeric', month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat(intlLocale(language), options).format(date);
}

export function formatMoney(
  amount: number | null | undefined,
  currency: string,
  language: LanguageCode,
  maximumFractionDigits = 0,
): string {
  if (amount === null || amount === undefined) {
    return '';
  }
  if (language === 'ka') {
    const code = currency || 'GEL';
    return formatCurrency(amount, 'ka', getCurrencySymbol(code, 'narrow', 'ka'), code, `1.0-${maximumFractionDigits}`);
  }
  return new Intl.NumberFormat(intlLocale(language), {
    style: 'currency',
    currency: currency || 'GEL',
    maximumFractionDigits,
  }).format(amount);
}

export function formatNumber(value: number, language: LanguageCode): string {
  return language === 'ka'
    ? angularNumber(value, 'ka')
    : new Intl.NumberFormat(intlLocale(language)).format(value);
}

export function langCode(): LanguageCode {
  return APP.defaultLanguage;
}
