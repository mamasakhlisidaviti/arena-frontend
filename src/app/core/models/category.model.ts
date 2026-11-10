import type { LocalizedString, MediaAsset } from './api.model';

export interface LocalizedOption {
  value: string;
  label: LocalizedString;
}

export interface CategoryConfiguration {
  tournamentTypes: LocalizedOption[];
  formats: LocalizedOption[];
  features?: Record<string, boolean>;
  defaults?: Record<string, unknown>;
}

export interface RegistrationField {
  key: string;
  label: LocalizedString;
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select';
  required: boolean;
  options?: string[];
  enabled: boolean;
}

export interface GameCategory {
  id: string;
  name: LocalizedString;
  slug: string;
  description: LocalizedString;
  icon: string;
  image?: MediaAsset | null;
  isActive: boolean;
  displayOrder: number;
  configuration: CategoryConfiguration;
  registrationFields: RegistrationField[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryInput {
  name: LocalizedString;
  slug?: string;
  description: LocalizedString;
  icon: string;
  image?: MediaAsset | null;
  isActive: boolean;
  displayOrder: number;
  configuration: CategoryConfiguration;
  registrationFields: RegistrationField[];
}
