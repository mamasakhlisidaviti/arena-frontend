import { inject, Injectable } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';

export interface ConfirmOptions {
  headerKey: string;
  messageKey: string;
  messageParams?: Record<string, unknown>;
  acceptKey?: string;
  rejectKey?: string;
  severity?: 'danger' | 'warn' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly confirmation = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmation.confirm({
        header: this.translate.instant(options.headerKey),
        message: this.translate.instant(options.messageKey, options.messageParams),
        icon: options.severity === 'danger' ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle',
        acceptLabel: this.translate.instant(options.acceptKey ?? 'common.confirm'),
        rejectLabel: this.translate.instant(options.rejectKey ?? 'common.cancel'),
        acceptButtonStyleClass: options.severity === 'danger' ? 'p-button-danger' : undefined,
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }
}
