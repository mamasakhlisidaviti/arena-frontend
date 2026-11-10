export const APP = {
  name: 'Arena.ge',
  apiBasePath: '/api',
  /** Dev/prod SSR server talks to the API over loopback; overridable for deployments. */
  internalApiUrl: 'http://127.0.0.1:3000/api',
  defaultLanguage: 'ka' as const,
  languages: ['ka', 'en', 'ru'] as const,
  pageSize: 9,
  adminPageSize: 10,
  participantsPageSize: 20,
  maxImageBytes: 8 * 1024 * 1024,
  uploadFolder: 'tournaments',
  storageKeys: {
    accessToken: 'arena.accessToken',
    language: 'arena.language',
    theme: 'arena.theme',
    draftPrefix: 'arena.wizardDraft.',
  },
  debounceMs: 320,
  toastLifeMs: 4200,
  seatPollMs: 20000,
};

export type AppLanguage = (typeof APP.languages)[number];

export const CURRENCIES = ['GEL', 'USD', 'EUR'] as const;
