import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AmkTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'amk-theme';

/**
 * Site-wide light/dark preference for redesigned Amarka pages.
 * Scoped to pages that opt in via [attr.data-theme]="theme()" — does not
 * touch the legacy global :root theming used by not-yet-redesigned pages.
 */
@Injectable({ providedIn: 'root' })
export class AmkThemeService {
  private platformId = inject(PLATFORM_ID);

  private readonly _theme = signal<AmkTheme>('dark');
  readonly theme = this._theme.asReadonly();

  readonly logoSrc = computed(() =>
    this._theme() === 'dark' ? '/amarka-logo-transparent.png' : '/amarka-logo-transparent-light.png'
  );

  constructor() {
    this.initTheme();
  }

  toggle(): void {
    const next: AmkTheme = this._theme() === 'dark' ? 'light' : 'dark';
    this._theme.set(next);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // storage unavailable — non-critical
      }
    }
  }

  private initTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        this._theme.set(stored);
        return;
      }
      const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
      this._theme.set(prefersLight ? 'light' : 'dark');
    } catch {
      // matchMedia/localStorage unavailable — keep default dark
    }
  }
}
