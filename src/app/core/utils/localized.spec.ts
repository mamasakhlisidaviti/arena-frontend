import { describe, expect, it } from 'vitest';
import type { LocalizedString } from '../models/api.model';
import { formatDate, formatMoney, formatNumber, intlLocale, localizedValue } from './localized';

describe('localizedValue', () => {
  const value = { ka: 'ჭადრაკი', en: 'Chess', ru: 'Шахматы' };

  it('returns the requested language', () => {
    expect(localizedValue(value, 'ru')).toBe('Шахматы');
  });

  it('falls back to English when the requested translation is blank', () => {
    expect(localizedValue({ ka: '  ', en: 'Chess', ru: 'Шахматы' }, 'ka')).toBe('Chess');
  });

  it('falls back to Georgian when English is also missing', () => {
    expect(localizedValue({ ka: 'ჭადრაკი' } as LocalizedString, 'en')).toBe('ჭადრაკი');
  });

  it('returns an empty string for missing values', () => {
    expect(localizedValue(null, 'ka')).toBe('');
    expect(localizedValue({} as LocalizedString, 'en')).toBe('');
  });
});

describe('formatting helpers', () => {
  it('maps languages to Intl locales', () => {
    expect(intlLocale('ka')).toBe('ka-GE');
    expect(intlLocale('ru')).toBe('ru-RU');
    expect(intlLocale('en')).toBe('en-US');
  });

  it('formats dates and guards invalid input', () => {
    const formatted = formatDate('2026-11-22T18:00:00.000Z', 'ka', 'long');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('ნოემბერი');
    expect(formatDate('not-a-date', 'ka')).toBe('—');
    expect(formatDate(null, 'ka')).toBe('—');
  });

  it('formats money with the requested currency', () => {
    const formatted = formatMoney(50, 'GEL', 'ka');
    expect(formatted).toContain('50');
    expect(formatted).toContain('₾');
    expect(formatMoney(null, 'GEL', 'ka')).toBe('');
  });

  it('formats numbers using the locale', () => {
    expect(formatNumber(1234, 'en')).toBe('1,234');
  });
});
