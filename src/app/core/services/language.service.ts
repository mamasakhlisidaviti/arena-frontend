import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { TranslateService, type TranslationObject } from '@ngx-translate/core';
import ka from '../../../assets/i18n/ka.json';
import en from '../../../assets/i18n/en.json';
import ru from '../../../assets/i18n/ru.json';
import { APP, type AppLanguage } from '../config/app.constants';
import type { LanguageCode } from '../models/api.model';

const DICTIONARIES: Record<LanguageCode, TranslationObject> = { ka, en, ru };

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly platform = inject(PLATFORM_ID);
  private readonly langSignal = signal<LanguageCode>(this.initialLanguage());
  private loaded = false;

  readonly lang = this.langSignal.asReadonly();
  readonly languages = APP.languages;

  constructor() {
    this.apply(this.langSignal());
  }

  setLanguage(language: LanguageCode): void {
    if (!APP.languages.includes(language)) {
      return;
    }
    this.langSignal.set(language);
    this.apply(language);
    if (isPlatformBrowser(this.platform)) {
      try {
        localStorage.setItem(APP.storageKeys.language, language);
      } catch {
        // storage can be unavailable in private mode
      }
    }
  }

  instant(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  private apply(language: LanguageCode): void {
    if (!this.loaded) {
      for (const code of APP.languages) {
        this.translate.setTranslation(code, DICTIONARIES[code]);
      }
      this.translate.setFallbackLang('en');
      this.loaded = true;
    }
    this.translate.use(language);
    this.document.documentElement.lang = language;
    const intlLocale = language === 'ka' ? 'ka-GE' : language === 'ru' ? 'ru-RU' : 'en-US';
    this.document.documentElement.setAttribute('data-locale', intlLocale);
  }

  private initialLanguage(): LanguageCode {
    if (isPlatformBrowser(this.platform)) {
      try {
        const stored = localStorage.getItem(APP.storageKeys.language) as AppLanguage | null;
        if (stored && APP.languages.includes(stored)) {
          return stored;
        }
      } catch {
        // ignore storage failures
      }
    }
    return APP.defaultLanguage;
  }
}
