import { describe, expect, it } from 'vitest';
import type { Tournament } from '../models/tournament.model';
import {
  canRegister,
  registrationAvailability,
  seatsLeft,
  timeControlLabel,
} from './tournament';

const NOW = new Date('2026-11-10T12:00:00.000Z');
const DAY = 86400000;

function settings(allowWaitlist = false) {
  return {
    requiresApproval: true,
    allowGuestRegistration: false,
    allowSelfCancellation: true,
    allowWaitlist,
  };
}

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 't1',
    slug: 'demo-open',
    title: { ka: 'დემო', en: 'Demo', ru: 'Демо' },
    status: 'published',
    startDate: new Date(NOW.getTime() + 10 * DAY).toISOString(),
    endDate: new Date(NOW.getTime() + 11 * DAY).toISOString(),
    registrationDeadline: new Date(NOW.getTime() + 7 * DAY).toISOString(),
    currentParticipants: 2,
    participantLimit: 16,
    registrationSettings: settings(),
    ...overrides,
  } as Tournament;
}

describe('registrationAvailability', () => {
  it('is open when the deadline is far away', () => {
    expect(registrationAvailability(makeTournament(), NOW)).toBe('open');
  });

  it('is closing_soon inside the last three days', () => {
    const tournament = makeTournament({
      registrationDeadline: new Date(NOW.getTime() + 2 * DAY).toISOString(),
    });
    expect(registrationAvailability(tournament, NOW)).toBe('closing_soon');
  });

  it('is closed after the deadline', () => {
    const tournament = makeTournament({
      registrationDeadline: new Date(NOW.getTime() - 1).toISOString(),
    });
    expect(registrationAvailability(tournament, NOW)).toBe('closed');
  });

  it('is full at capacity', () => {
    const tournament = makeTournament({ currentParticipants: 16 });
    expect(registrationAvailability(tournament, NOW)).toBe('full');
  });

  it.each(['draft', 'completed', 'cancelled'] as const)('is closed for %s events', (status) => {
    expect(registrationAvailability(makeTournament({ status }), NOW)).toBe('closed');
  });
});

describe('canRegister', () => {
  it('allows registration while open', () => {
    expect(canRegister(makeTournament(), NOW)).toBe(true);
  });

  it('allows waitlisting only when enabled', () => {
    const full = makeTournament({ currentParticipants: 16 });
    expect(canRegister(full, NOW)).toBe(false);
    expect(
      canRegister({ ...full, registrationSettings: settings(true) }, NOW),
    ).toBe(true);
  });

  it('rejects closed events even with a waitlist', () => {
    const closed = makeTournament({
      status: 'completed',
      registrationSettings: settings(true),
    });
    expect(canRegister(closed, NOW)).toBe(false);
  });
});

describe('helpers', () => {
  it('never returns negative seats', () => {
    expect(seatsLeft({ currentParticipants: 20, participantLimit: 16 })).toBe(0);
    expect(seatsLeft({ currentParticipants: 4, participantLimit: 16 })).toBe(12);
  });

  it('renders a time control label', () => {
    expect(timeControlLabel({ timeControl: { initialMinutes: 90, incrementSeconds: 30 } })).toBe(
      '90 + 30',
    );
    expect(timeControlLabel({})).toBe('');
  });
});
