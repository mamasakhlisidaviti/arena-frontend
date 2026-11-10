import type { LanguageCode, MediaAsset, UserRole } from './api.model';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: MediaAsset | null;
  preferredLanguage: LanguageCode;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionResponse {
  accessToken: string;
  user: User;
}

export interface ProfileUpdate {
  firstName?: string;
  lastName?: string;
  phone?: string;
  preferredLanguage?: LanguageCode;
}
