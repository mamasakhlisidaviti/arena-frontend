import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { APP } from '../config/app.constants';

@Injectable({ providedIn: 'root' })
export class SessionStorageService {
  private readonly platform = inject(PLATFORM_ID);
  private readonly tokenSignal = signal<string | null>(this.readToken());

  readonly token = this.tokenSignal.asReadonly();

  get accessToken(): string | null {
    return this.tokenSignal();
  }

  setAccessToken(token: string | null): void {
    this.tokenSignal.set(token);
    if (!isPlatformBrowser(this.platform)) {
      return;
    }
    if (token) {
      localStorage.setItem(APP.storageKeys.accessToken, token);
    } else {
      localStorage.removeItem(APP.storageKeys.accessToken);
    }
  }

  clear(): void {
    this.setAccessToken(null);
  }

  private readToken(): string | null {
    if (!isPlatformBrowser(this.platform)) {
      return null;
    }
    try {
      return localStorage.getItem(APP.storageKeys.accessToken);
    } catch {
      return null;
    }
  }
}
