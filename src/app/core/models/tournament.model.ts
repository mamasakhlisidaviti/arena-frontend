import type { GameCategory } from './category.model';
import type { LocalizedString, MediaAsset, TournamentStatus } from './api.model';

export interface TournamentLocation {
  venue: string;
  city: string;
  address: string;
}

export interface TournamentContact {
  name: string;
  email: string;
  phone: string;
}

export interface RegistrationSettings {
  requiresApproval: boolean;
  allowGuestRegistration: boolean;
  allowWaitlist: boolean;
  allowSelfCancellation: boolean;
}

export interface TournamentSeo {
  metaTitle: LocalizedString;
  metaDescription: LocalizedString;
}

export interface ChessTimeControl {
  initialMinutes: number;
  incrementSeconds: number;
}

export interface ChessGameSettings {
  rounds?: number;
  timeControl?: ChessTimeControl;
}

export interface TournamentOrganizer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatar?: MediaAsset | null;
}

export interface Tournament {
  id: string;
  title: LocalizedString;
  slug: string;
  description: LocalizedString;
  categoryId: GameCategory | string;
  organizerId: TournamentOrganizer | string;
  coverImage?: MediaAsset | null;
  tournamentType: string;
  format: string;
  status: TournamentStatus;
  startDate: string;
  endDate?: string | null;
  registrationDeadline: string;
  location: TournamentLocation;
  isOnline: boolean;
  participantLimit: number;
  currentParticipants: number;
  entryFee: number;
  currency: string;
  prizePool?: number | null;
  prizes?: LocalizedString;
  rules?: LocalizedString;
  contact?: TournamentContact;
  gameSettings: ChessGameSettings & Record<string, unknown>;
  registrationSettings: RegistrationSettings;
  seo?: TournamentSeo;
  isFeatured: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentListQuery {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  status?: TournamentStatus;
  registrationStatus?: 'open' | 'closing_soon' | 'full' | 'closed';
  dateFrom?: string;
  dateTo?: string;
  online?: 'true' | 'false';
  city?: string;
  fee?: 'free' | 'paid';
  featured?: 'true' | 'false';
  sort?: 'newest' | 'oldest' | 'upcoming' | 'deadline' | 'popular';
}

export interface TournamentInput {
  title: LocalizedString;
  slug?: string;
  description: LocalizedString;
  categoryId: string;
  coverImage?: MediaAsset | null;
  tournamentType: string;
  format: string;
  startDate: string;
  endDate?: string | null;
  registrationDeadline: string;
  location: TournamentLocation;
  isOnline: boolean;
  participantLimit: number;
  entryFee: number;
  currency: string;
  prizePool?: number | null;
  prizes: LocalizedString;
  rules: LocalizedString;
  contact: TournamentContact;
  gameSettings: Record<string, unknown>;
  registrationSettings: RegistrationSettings;
  seo?: TournamentSeo;
  isFeatured: boolean;
  publish: boolean;
  organizerId?: string;
}

export type TournamentSort = NonNullable<TournamentListQuery['sort']>;
