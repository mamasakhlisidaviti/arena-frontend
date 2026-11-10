import type {
  LocalizedString,
  MediaAsset,
  RegistrationStatus,
  TournamentStatus,
} from './api.model';

export interface ParticipantInformation {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fideId?: string;
  rating?: number | null;
  club?: string;
  notes?: string;
  customFields?: Record<string, string>;
}

export interface RegistrationTournamentRef {
  id: string;
  title: LocalizedString;
  slug: string;
  startDate: string;
  endDate?: string | null;
  status: TournamentStatus;
  coverImage?: MediaAsset | null;
  location?: { venue: string; city: string; address: string };
  isOnline?: boolean;
}

export interface Registration {
  id: string;
  tournamentId: RegistrationTournamentRef | string;
  userId?: string | null;
  participantInformation: ParticipantInformation;
  status: RegistrationStatus;
  registrationNumber: string;
  notes: string;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fideId?: string;
  rating?: number | null;
  club?: string;
  notes?: string;
  customFields?: Record<string, string>;
}

export interface RegistrationCounts {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  waitlisted: number;
}

export interface AppNotification {
  id: string;
  type: string;
  title: LocalizedString;
  message: LocalizedString;
  readAt?: string | null;
  createdAt: string;
  registrationId?: string | null;
  tournamentId?: string | null;
}
