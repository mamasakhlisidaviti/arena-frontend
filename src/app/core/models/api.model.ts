export interface LocalizedString {
  ka: string;
  en: string;
  ru: string;
}

export interface MediaAsset {
  url: string;
  publicId?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  counts?: Record<string, number>;
  unreadCount?: number;
}

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type LanguageCode = 'ka' | 'en' | 'ru';

export type UserRole = 'super_admin' | 'admin' | 'participant';

export type TournamentStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';

export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'waitlisted';

export type ThemeMode = 'light' | 'dark' | 'system';
