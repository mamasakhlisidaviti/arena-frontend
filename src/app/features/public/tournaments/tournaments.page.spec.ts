/// <reference types="node" />
import { convertToParamMap } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { APP } from '../../../core/config/app.constants';
import { parseTournamentParams } from './tournaments.page';

const parse = (params: Record<string, string> = {}) =>
  parseTournamentParams(convertToParamMap(params));

describe('parseTournamentParams', () => {
  it('uses public-list defaults and ignores arbitrary URL page sizes', () => {
    expect(parse()).toEqual({
      page: 1,
      limit: APP.pageSize,
      sort: 'upcoming',
      q: undefined,
      category: undefined,
      status: undefined,
      registrationStatus: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      online: undefined,
      city: undefined,
      fee: undefined,
    });
    expect(parse({ limit: '100000', unexpected: 'value' })).toEqual(parse());
  });

  it.each(['', '0', '-1', '1.5', 'NaN', 'Infinity', 'not-a-page', '10001', '9007199254740992'])(
    'falls back to page 1 for invalid page %s',
    (page) => expect(parse({ page }).page).toBe(1),
  );

  it.each(['1', '2', '10000'])('preserves valid page %s', (page) => {
    expect(parse({ page }).page).toBe(Number(page));
  });

  it.each([
    ['status', ['published', 'ongoing', 'completed']],
    ['registrationStatus', ['open', 'closing_soon', 'full', 'closed']],
    ['online', ['true', 'false']],
    ['fee', ['free', 'paid']],
    ['sort', ['newest', 'oldest', 'upcoming', 'deadline', 'popular']],
  ] as const)('preserves each supported %s option', (key, values) => {
    for (const value of values) {
      expect(parse({ [key]: value })[key]).toBe(value);
    }
  });

  it.each([
    ['status', 'draft'],
    ['status', 'cancelled'],
    ['status', 'PUBLISHED'],
    ['registrationStatus', 'pending'],
    ['registrationStatus', ' open '],
    ['online', '1'],
    ['online', 'TRUE'],
    ['fee', 'all'],
    ['sort', 'random'],
  ] as const)(
    'sanitizes invalid %s=%s instead of forwarding an invalid API query',
    (key, value) => {
      expect(parse({ [key]: value })[key]).toBe(key === 'sort' ? 'upcoming' : undefined);
    },
  );

  it('trims multilingual search, category and city values without changing their contents', () => {
    expect(
      parse({ q: '  თბილისის ღია [A+B]  ', category: '  chess  ', city: '  ბათუმი  ' }),
    ).toMatchObject({
      q: 'თბილისის ღია [A+B]',
      category: 'chess',
      city: 'ბათუმი',
    });
  });

  it.each([
    ['q', 120],
    ['category', 80],
    ['city', 120],
  ] as const)('caps %s after trimming and removes empty values', (key, limit) => {
    expect(parse({ [key]: `  ${'ა'.repeat(limit + 20)}  ` })[key]).toBe('ა'.repeat(limit));
    expect(parse({ [key]: ' \t\n ' })[key]).toBeUndefined();
  });

  it.each(['2024-02-29', '2000-02-29', '2026-01-01', '2026-12-31'])(
    'preserves real date-only strings and equal endpoints: %s',
    (date) => {
      expect(parse({ dateFrom: date, dateTo: date })).toMatchObject({
        dateFrom: date,
        dateTo: date,
      });
    },
  );

  it.each([
    '',
    'invalid',
    '2026-02-29',
    '2100-02-29',
    '2026-02-30',
    '2026-04-31',
    '2026-00-01',
    '2026-13-01',
    '2026-11-00',
    '2026-11-32',
    '2026-1-01',
    '2026-11-1',
    '2026-11-20T00:00:00Z',
    ' 2026-11-20 ',
  ])('rejects impossible or noncanonical dates: %s', (date) => {
    expect(parse({ dateFrom: date, dateTo: date })).toMatchObject({
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it('swaps inverted valid URL dates before dispatching the query', () => {
    expect(parse({ dateFrom: '2026-12-01', dateTo: '2024-02-29' })).toMatchObject({
      dateFrom: '2024-02-29',
      dateTo: '2026-12-01',
    });
  });

  it('keeps one valid endpoint when the other is invalid or absent', () => {
    expect(parse({ dateFrom: '2026-02-30', dateTo: '2026-03-01' })).toMatchObject({
      dateFrom: undefined,
      dateTo: '2026-03-01',
    });
    expect(parse({ dateFrom: '2026-03-01', dateTo: 'not-a-date' })).toMatchObject({
      dateFrom: '2026-03-01',
      dateTo: undefined,
    });
    expect(parse({ dateTo: '2026-03-01' }).dateTo).toBe('2026-03-01');
    expect(parse({ dateFrom: '2026-03-01' }).dateFrom).toBe('2026-03-01');
  });
});
