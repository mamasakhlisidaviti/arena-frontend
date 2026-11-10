/// <reference types="node" />
import { TestBed } from '@angular/core/testing';
import { provideStore, Store } from '@ngxs/store';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP } from '../../core/config/app.constants';
import type { Tournament } from '../../core/models/tournament.model';
import { ApiService } from '../../core/services/api.service';
import {
  LoadAdminTournaments,
  LoadPublicTournaments,
  LoadTournament,
  TournamentState,
  type TournamentStateModel,
} from './tournament.state';

function tournament(slug: string): Tournament {
  return {
    id: slug,
    slug,
    title: { ka: '', en: slug, ru: '' },
    description: { ka: '', en: '', ru: '' },
    categoryId: 'chess',
    organizerId: 'organizer',
    tournamentType: 'classical',
    format: 'swiss',
    status: 'published',
    startDate: '2026-11-20T00:00:00Z',
    registrationDeadline: '2026-11-19T00:00:00Z',
    location: { venue: '', city: '', address: '' },
    isOnline: true,
    participantLimit: 16,
    currentParticipants: 0,
    entryFee: 0,
    currency: 'GEL',
    gameSettings: {},
    registrationSettings: {
      requiresApproval: true,
      allowGuestRegistration: true,
      allowWaitlist: true,
      allowSelfCancellation: true,
    },
    isFeatured: false,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  };
}

const selectTournamentState = (root: { tournaments: TournamentStateModel }) => root.tournaments;

const cases = [
  {
    name: 'public',
    method: 'getPage',
    endpoint: '/tournaments',
    data: 'items',
    loading: 'listLoading',
    error: 'listError',
  },
  {
    name: 'admin',
    method: 'getPage',
    endpoint: '/admin/tournaments',
    data: 'adminItems',
    loading: 'adminLoading',
    error: 'adminError',
  },
  {
    name: 'detail',
    method: 'get',
    endpoint: '/tournaments/latest',
    data: 'detail',
    loading: 'detailLoading',
    error: 'detailError',
  },
] as const;

describe.each(cases)('TournamentState $name request cancellation', (config) => {
  let store: Store;
  let api: { get: ReturnType<typeof vi.fn>; getPage: ReturnType<typeof vi.fn> };
  let stale: Subject<unknown>;
  let latest: Subject<unknown>;
  const newest = tournament('latest');
  const old = tournament('old');
  const meta = { page: 2, limit: 2, total: 3, totalPages: 2 };
  const state = () => store.selectSnapshot(selectTournamentState);
  const data = (item: Tournament) => (config.name === 'detail' ? item : [item]);
  const response = (item: Tournament) => (config.name === 'detail' ? item : { data: [item], meta });
  const action = (slug: string) => {
    if (config.name === 'detail') return new LoadTournament(slug);
    const query = { q: slug, page: slug === 'latest' ? 2 : 1, limit: 2 };
    return config.name === 'public'
      ? new LoadPublicTournaments(query)
      : new LoadAdminTournaments(query);
  };

  beforeEach(() => {
    stale = new Subject<unknown>();
    latest = new Subject<unknown>();
    api = { get: vi.fn(), getPage: vi.fn() };
    api[config.method]
      .mockReturnValueOnce(stale.asObservable())
      .mockReturnValueOnce(latest.asObservable());
    TestBed.configureTestingModule({
      providers: [provideStore([TournamentState]), { provide: ApiService, useValue: api }],
    });
    store = TestBed.inject(Store);
  });

  afterEach(() => {
    stale.complete();
    latest.complete();
    TestBed.resetTestingModule();
  });

  function startRequests() {
    const staleError = vi.fn();
    const latestError = vi.fn();
    store.dispatch(action('old')).subscribe({ error: staleError });
    expect(stale.observed).toBe(true);
    store.dispatch(action('latest')).subscribe({ error: latestError });
    expect(stale.observed).toBe(false);
    expect(latest.observed).toBe(true);
    expect(state()[config.loading]).toBe(true);
    expect(state()[config.error]).toBe(false);
    if (config.name === 'detail') {
      expect(api.get.mock.calls).toEqual([['/tournaments/old'], ['/tournaments/latest']]);
    } else {
      expect(api.getPage).toHaveBeenLastCalledWith(config.endpoint, {
        q: 'latest',
        page: 2,
        limit: 2,
        sort: config.name === 'public' ? 'upcoming' : 'newest',
      });
    }
    return { staleError, latestError };
  }

  function finishLatest() {
    latest.next(response(newest));
    latest.complete();
    expect(state()[config.data]).toEqual(data(newest));
    expect(state()[config.loading]).toBe(false);
    expect(state()[config.error]).toBe(false);
    if (config.name !== 'detail') {
      expect(state()[config.name === 'public' ? 'meta' : 'adminMeta']).toEqual(meta);
      expect(state()[config.name === 'public' ? 'query' : 'adminQuery']).toMatchObject({
        q: 'latest',
        page: 2,
      });
    }
  }

  it.each(['success', 'error'] as const)(
    'ignores stale %s while the latest request is still pending',
    (outcome) => {
      const { staleError, latestError } = startRequests();
      const pending = state();
      if (outcome === 'success') stale.next(response(old));
      else stale.error(new Error('stale failure'));
      expect(state()).toEqual(pending);
      expect(state()[config.loading]).toBe(true);
      finishLatest();
      expect(staleError).not.toHaveBeenCalled();
      expect(latestError).not.toHaveBeenCalled();
    },
  );

  it.each(['success', 'error'] as const)(
    'does not let a late stale %s overwrite the latest result',
    (outcome) => {
      const { staleError, latestError } = startRequests();
      finishLatest();
      const resolved = state();
      if (outcome === 'success') stale.next(response(old));
      else stale.error(new Error('stale failure'));
      expect(state()).toEqual(resolved);
      expect(state()[config.data]).toEqual(data(newest));
      expect(staleError).not.toHaveBeenCalled();
      expect(latestError).not.toHaveBeenCalled();
    },
  );

  it('keeps the latest failure when an older request subsequently succeeds, then allows a retry', () => {
    const { staleError, latestError } = startRequests();
    const failure = new Error('latest failure');
    latest.error(failure);
    expect(latestError).toHaveBeenCalledWith(failure);
    expect(state()[config.loading]).toBe(false);
    expect(state()[config.error]).toBe(true);
    expect(state()[config.data]).toEqual(config.name === 'detail' ? null : []);
    const failed = state();
    stale.next(response(old));
    expect(state()).toEqual(failed);
    expect(staleError).not.toHaveBeenCalled();

    const retry = new Subject<unknown>();
    api[config.method].mockReturnValueOnce(retry.asObservable());
    store.dispatch(action('latest')).subscribe({ error: latestError });
    expect(state()[config.error]).toBe(false);
    expect(state()[config.loading]).toBe(true);
    retry.next(response(newest));
    retry.complete();
    expect(state()[config.data]).toEqual(data(newest));
    expect(state()[config.error]).toBe(false);
    expect(state()[config.loading]).toBe(false);
    expect(latestError).toHaveBeenCalledTimes(1);
  });
});

describe('TournamentState independent request types', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('does not cancel public, admin or detail requests when a different action type starts', () => {
    const publicResponse = new Subject<unknown>();
    const adminResponse = new Subject<unknown>();
    const detailResponse = new Subject<unknown>();
    const getPage = vi.fn().mockReturnValueOnce(publicResponse).mockReturnValueOnce(adminResponse);
    TestBed.configureTestingModule({
      providers: [
        provideStore([TournamentState]),
        {
          provide: ApiService,
          useValue: { getPage, get: vi.fn().mockReturnValue(detailResponse) },
        },
      ],
    });
    const store = TestBed.inject(Store);
    const error = vi.fn();
    store.dispatch(new LoadPublicTournaments({ q: 'public' })).subscribe({ error });
    store.dispatch(new LoadAdminTournaments({ status: 'draft' })).subscribe({ error });
    store.dispatch(new LoadTournament('detail')).subscribe({ error });
    expect([publicResponse.observed, adminResponse.observed, detailResponse.observed]).toEqual([
      true,
      true,
      true,
    ]);
    const publicItem = tournament('public');
    const adminItem = { ...tournament('admin'), status: 'draft' as const };
    const detail = tournament('detail');
    const meta = { page: 1, limit: APP.pageSize, total: 1, totalPages: 1 };
    publicResponse.next({ data: [publicItem], meta });
    adminResponse.next({ data: [adminItem], meta: { ...meta, limit: APP.adminPageSize } });
    detailResponse.next(detail);
    publicResponse.complete();
    adminResponse.complete();
    detailResponse.complete();
    expect(store.selectSnapshot(selectTournamentState)).toMatchObject({
      items: [publicItem],
      adminItems: [adminItem],
      detail,
      listLoading: false,
      adminLoading: false,
      detailLoading: false,
      listError: false,
      adminError: false,
      detailError: false,
    });
    expect(error).not.toHaveBeenCalled();
  });
});
