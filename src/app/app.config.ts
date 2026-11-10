import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideStore, Store } from '@ngxs/store';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { firstValueFrom } from 'rxjs';
import { APP } from './core/config/app.constants';
import { ArenaPreset } from './core/config/prime-preset';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { refreshInterceptor } from './core/interceptors/refresh.interceptor';
import { SessionStorageService } from './core/services/session-storage.service';
import { routes } from './app.routes';
import { AuthState, LoadMe } from './state/auth/auth.state';
import { CategoryState } from './state/categories/category.state';
import { DashboardState } from './state/dashboard/dashboard.state';
import { LanguageState } from './state/language/language.state';
import { RegistrationState } from './state/registrations/registration.state';
import { ThemeState } from './state/theme/theme.state';
import { TournamentState } from './state/tournaments/tournament.state';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, refreshInterceptor])),
    provideTranslateService({
      lang: APP.defaultLanguage,
      fallbackLang: 'en',
      langs: [...APP.languages],
    }),
    provideStore([
      AuthState,
      CategoryState,
      TournamentState,
      RegistrationState,
      ThemeState,
      LanguageState,
      DashboardState,
    ]),
    providePrimeNG({
      ripple: true,
      theme: {
        preset: ArenaPreset,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: {
            name: 'primeui',
            order: 'theme, base, components, primeui, utilities',
          },
        },
      },
    }),
    MessageService,
    ConfirmationService,
    provideAppInitializer(() => {
      const store = inject(Store);
      const session = inject(SessionStorageService);
      if (!session.accessToken || store.selectSnapshot(AuthState.initialized)) {
        return undefined;
      }
      return firstValueFrom(store.dispatch(new LoadMe())).catch(() => undefined);
    }),
  ],
};
