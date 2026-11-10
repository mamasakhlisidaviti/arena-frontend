import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { APP } from '../config/app.constants';
import type { ThemeMode } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platform = inject(PLATFORM_ID);
  private readonly modeSignal = signal<ThemeMode>(this.initialMode());
  private readonly resolvedSignal = signal<'light' | 'dark'>('light');
  private mediaQuery: MediaQueryList | null = null;

  readonly mode = this.modeSignal.asReadonly();
  readonly resolved = this.resolvedSignal.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platform)) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener('change', () => this.apply());
    }
    this.apply();
  }

  setMode(mode: ThemeMode): void {
    this.modeSignal.set(mode);
    if (isPlatformBrowser(this.platform)) {
      try {
        localStorage.setItem(APP.storageKeys.theme, mode);
      } catch {
        // ignore storage failures
      }
    }
    this.apply();
  }

  toggle(): void {
    this.setMode(this.resolvedSignal() === 'dark' ? 'light' : 'dark');
  }

  private apply(): void {
    const resolved: 'light' | 'dark' =
      this.modeSignal() === 'system'
        ? this.mediaQuery?.matches
          ? 'dark'
          : 'light'
        : (this.modeSignal() as 'light' | 'dark');
    this.resolvedSignal.set(resolved);
    const root = this.document.documentElement;
    root.classList.toggle('app-dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  }

  private initialMode(): ThemeMode {
    if (isPlatformBrowser(this.platform)) {
      try {
        const stored = localStorage.getItem(APP.storageKeys.theme) as ThemeMode | null;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          return stored;
        }
      } catch {
        // ignore storage failures
      }
    }
    return 'system';
  }
}
