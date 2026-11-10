import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { APP } from '../config/app.constants';
import { toApiClientError, errorTranslationKey } from '../utils/http-error';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messages = inject(MessageService);
  private readonly translate = inject(TranslateService);

  success(key: string, params?: Record<string, unknown>): void {
    this.messages.add({
      severity: 'success',
      summary: this.translate.instant('common.success'),
      detail: this.translate.instant(key, params),
      life: APP.toastLifeMs,
    });
  }

  info(key: string, params?: Record<string, unknown>): void {
    this.messages.add({
      severity: 'info',
      summary: this.translate.instant('common.appName'),
      detail: this.translate.instant(key, params),
      life: APP.toastLifeMs,
    });
  }

  warn(key: string, params?: Record<string, unknown>): void {
    this.messages.add({
      severity: 'warn',
      summary: this.translate.instant('common.error'),
      detail: this.translate.instant(key, params),
      life: APP.toastLifeMs,
    });
  }

  error(source: unknown, fallbackKey = 'errors.generic'): void {
    const apiError = toApiClientError(source);
    const key = errorTranslationKey(apiError);
    const translated = this.translate.instant(key);
    const detail =
      translated === key || key === 'errors.generic' || key === 'errors.validation'
        ? apiError.message || this.translate.instant(fallbackKey)
        : translated;
    this.messages.add({
      severity: 'error',
      summary: this.translate.instant('common.error'),
      detail,
      life: APP.toastLifeMs + 1200,
    });
  }
}
