import type { LanguageCode, LocalizedString } from '../models/api.model';
import type {
  GameCategory,
  LocalizedOption,
  RegistrationField,
} from '../models/category.model';
import type { Tournament } from '../models/tournament.model';
import { localizedValue } from './localized';

export type RegistrationAvailability = 'open' | 'closing_soon' | 'full' | 'closed';

export function registrationAvailability(
  tournament: Pick<
    Tournament,
    'status' | 'registrationDeadline' | 'currentParticipants' | 'participantLimit'
  >,
  now = new Date(),
): RegistrationAvailability {
  if (tournament.status === 'draft' || tournament.status === 'completed' || tournament.status === 'cancelled') {
    return 'closed';
  }
  if (new Date(tournament.registrationDeadline).getTime() <= now.getTime()) {
    return 'closed';
  }
  if (tournament.currentParticipants >= tournament.participantLimit) {
    return 'full';
  }
  const closingSoon = new Date(tournament.registrationDeadline).getTime() - now.getTime() < 3 * 86400000;
  return closingSoon ? 'closing_soon' : 'open';
}

export function canRegister(tournament: Tournament, now = new Date()): boolean {
  const availability = registrationAvailability(tournament, now);
  if (availability === 'open' || availability === 'closing_soon') {
    return true;
  }
  return availability === 'full' && tournament.registrationSettings.allowWaitlist;
}

export function seatsLeft(tournament: Pick<Tournament, 'currentParticipants' | 'participantLimit'>): number {
  return Math.max(0, tournament.participantLimit - tournament.currentParticipants);
}

export function categoryOf(tournament: Tournament): GameCategory | null {
  return typeof tournament.categoryId === 'string' ? null : tournament.categoryId;
}

export function organizerName(tournament: Tournament): string {
  if (typeof tournament.organizerId === 'string') {
    return '';
  }
  return `${tournament.organizerId.firstName} ${tournament.organizerId.lastName}`.trim();
}

export function optionLabel(
  options: LocalizedOption[] | undefined,
  value: string | null | undefined,
  language: LanguageCode,
): string {
  if (!value) {
    return '';
  }
  const option = (options ?? []).find((item) => item.value === value);
  return option ? localizedValue(option.label, language) || value : value;
}

export function tournamentTypeLabel(
  category: GameCategory | null,
  value: string,
  language: LanguageCode,
): string {
  return optionLabel(category?.configuration?.tournamentTypes, value, language);
}

export function tournamentFormatLabel(
  category: GameCategory | null,
  value: string,
  language: LanguageCode,
): string {
  return optionLabel(category?.configuration?.formats, value, language);
}

export function timeControlLabel(settings: Tournament['gameSettings']): string {
  const control = settings?.['timeControl'] as
    | { initialMinutes?: number; incrementSeconds?: number }
    | undefined;
  if (!control?.initialMinutes) {
    return '';
  }
  const increment = control.incrementSeconds ?? 0;
  return `${control.initialMinutes} + ${increment}`;
}

export function roundsLabel(settings: Tournament['gameSettings']): number | null {
  const rounds = settings?.['rounds'];
  return typeof rounds === 'number' ? rounds : null;
}

export function registrationFieldsOf(category: GameCategory | null): RegistrationField[] {
  return (category?.registrationFields ?? []).filter((field) => field.enabled);
}

export function tournamentTitle(
  tournament: Pick<Tournament, 'title'> | null | undefined,
  language: LanguageCode,
): string {
  return localizedValue(tournament?.title, language);
}

export function localizedOrEmpty(
  value: LocalizedString | null | undefined,
  language: LanguageCode,
): string {
  return localizedValue(value, language);
}
