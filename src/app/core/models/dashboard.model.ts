import type { LocalizedString, RegistrationStatus } from './api.model';
import type { GameCategory } from './category.model';
import type { Tournament } from './tournament.model';

export interface DashboardCounts {
  totalTournaments: number;
  upcoming: number;
  active: number;
  completed: number;
  totalParticipants: number;
  pendingRegistrations: number;
  approvedRegistrations: number;
  categories: number;
}

export interface RegistrationChartPoint {
  date: string;
  count: number;
}

export interface DashboardRecentRegistration {
  id: string;
  participantInformation: { firstName: string; lastName: string; email: string };
  status: RegistrationStatus;
  registrationNumber: string;
  createdAt: string;
  tournamentId?: { id?: string; title: LocalizedString; slug: string } | string;
}

export interface DashboardUpcomingTournament {
  id: string;
  title: LocalizedString;
  slug: string;
  startDate: string;
  currentParticipants: number;
  participantLimit: number;
}

export interface DashboardData {
  counts: DashboardCounts;
  charts: {
    registrationsByDay: RegistrationChartPoint[];
    tournamentsByStatus: Record<string, number>;
  };
  recentRegistrations: DashboardRecentRegistration[];
  upcomingTournaments: DashboardUpcomingTournament[];
}

export interface PlatformSettings {
  id?: string;
  siteName: LocalizedString;
  tagline: LocalizedString;
  contactEmail: string;
  socialLinks: { facebook: string; instagram: string; youtube: string };
}

export interface HomeData {
  settings: PlatformSettings;
  categories: GameCategory[];
  featured: Tournament[];
  upcoming: Tournament[];
  recent: Tournament[];
  stats: { tournaments: number; participants: number; categories: number };
}
