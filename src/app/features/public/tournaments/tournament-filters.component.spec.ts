import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LanguageCode } from '../../../core/models/api.model';
import type { GameCategory } from '../../../core/models/category.model';
import { LanguageService } from '../../../core/services/language.service';
import { TournamentFiltersComponent } from './tournament-filters.component';

const optionGroups = [
  ['categoryOptions', ['tournaments.allCategories'], ['']],
  [
    'statusOptions',
    ['tournaments.allStatuses', 'status.published', 'status.ongoing', 'status.completed'],
    ['', 'published', 'ongoing', 'completed'],
  ],
  [
    'registrationOptions',
    [
      'common.all',
      'tournaments.regOpen',
      'tournaments.regClosingSoon',
      'tournaments.regFull',
      'tournaments.regClosed',
    ],
    ['', 'open', 'closing_soon', 'full', 'closed'],
  ],
  [
    'modeOptions',
    ['tournaments.allModes', 'common.online', 'common.offline'],
    ['', 'true', 'false'],
  ],
  ['feeOptions', ['tournaments.allFees', 'common.free', 'common.paid'], ['', 'free', 'paid']],
  [
    'sortOptions',
    [
      'tournaments.sortUpcoming',
      'tournaments.sortNewest',
      'tournaments.sortDeadline',
      'tournaments.sortPopular',
      'tournaments.sortOldest',
    ],
    ['upcoming', 'newest', 'deadline', 'popular', 'oldest'],
  ],
] as const;

describe('TournamentFiltersComponent translated options', () => {
  let fixture: ComponentFixture<TournamentFiltersComponent>;
  let component: TournamentFiltersComponent;
  const lang = signal<LanguageCode>('en');
  let translationLanguage: LanguageCode;

  beforeEach(() => {
    lang.set('en');
    translationLanguage = 'en';
    TestBed.configureTestingModule({
      imports: [TournamentFiltersComponent],
      providers: [
        { provide: LanguageService, useValue: { lang: lang.asReadonly() } },
        // instant deliberately reads no signal: the component must depend on lang.
        {
          provide: TranslateService,
          useValue: { instant: vi.fn((key: string) => `${translationLanguage}:${key}`) },
        },
      ],
    });
    TestBed.overrideComponent(TournamentFiltersComponent, { set: { template: '', imports: [] } });
    fixture = TestBed.createComponent(TournamentFiltersComponent);
    fixture.componentRef.setInput('form', new FormGroup({}));
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it.each(optionGroups)(
    'recomputes %s on language changes without changing option values',
    (group, keys, values) => {
      const english = component[group]();
      expect(english).toEqual(
        keys.map((key, index) => ({ label: `en:${key}`, value: values[index] })),
      );
      expect(component[group]()).toBe(english);
      for (const language of ['ka', 'ru'] as const) {
        translationLanguage = language;
        lang.set(language);
        const translated = component[group]();
        expect(translated).toEqual(
          keys.map((key, index) => ({ label: `${language}:${key}`, value: values[index] })),
        );
        expect(translated).not.toBe(english);
      }
    },
  );

  it('localizes category names and the all-categories option without reloading categories', () => {
    const category: GameCategory = {
      id: 'chess',
      slug: 'chess',
      name: { ka: 'ჭადრაკი', en: 'Chess', ru: 'Шахматы' },
      description: { ka: '', en: '', ru: '' },
      icon: 'pi pi-crown',
      isActive: true,
      displayOrder: 0,
      configuration: { tournamentTypes: [], formats: [] },
      registrationFields: [],
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    };
    fixture.componentRef.setInput('categories', [category]);
    expect(component.categoryOptions()).toEqual([
      { label: 'en:tournaments.allCategories', value: '' },
      { label: 'Chess', value: 'chess' },
    ]);
    for (const language of ['ka', 'ru'] as const) {
      translationLanguage = language;
      lang.set(language);
      expect(component.categoryOptions()).toEqual([
        { label: `${language}:tournaments.allCategories`, value: '' },
        { label: category.name[language], value: 'chess' },
      ]);
    }
  });
});
