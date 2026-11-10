import { inject, Injectable, signal } from '@angular/core';
import { of, tap, type Observable } from 'rxjs';
import type { PlatformSettings } from '../models/dashboard.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly api = inject(ApiService);
  private readonly settingsSignal = signal<PlatformSettings | null>(null);
  private loaded = false;

  readonly settings = this.settingsSignal.asReadonly();

  load(force = false): Observable<PlatformSettings> {
    if (this.loaded && !force) {
      const current = this.settingsSignal();
      if (current) {
        return of(current);
      }
    }
    return this.api.get<PlatformSettings>('/settings').pipe(
      tap((settings) => {
        this.settingsSignal.set(settings);
        this.loaded = true;
      }),
    );
  }
}
