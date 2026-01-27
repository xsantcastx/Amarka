import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import {
  Firestore,
  arrayRemove,
  arrayUnion,
  deleteDoc,
  doc,
  docData,
  getDoc,
  setDoc
} from '@angular/fire/firestore';
import { catchError } from 'rxjs/operators';
import { Subscription, of } from 'rxjs';

export type RadiusLevel = 'xs' | 'sm' | 'md' | 'lg' | 'full';
export type ShadowLevel = 0 | 1 | 2 | 3 | 4;
export type FontScale = 'sm' | 'base' | 'lg' | 'xl';
export type ButtonStyle = 'solid' | 'outline' | 'ghost';
export type SpacingScale = 'compact' | 'comfortable' | 'relaxed';

export interface ThemePalette {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  surface: string;
  background: string;
  success: string;
  warning: string;
  error: string;
}

export interface ThemeComponentOverride {
  palette?: Partial<ThemePalette>;
  radiusLevel?: RadiusLevel;
  shadowLevel?: ShadowLevel;
  buttonStyle?: ButtonStyle;
  spacing?: SpacingScale;
  fontScale?: FontScale;
}

export interface ThemePalettePreset {
  id: string;
  name: string;
  palette: ThemePalette;
  scope?: 'global' | 'user';
}

export interface ThemeDocument {
  name?: string;
  mode: 'light' | 'dark' | 'custom';
  palette: ThemePalette;
  radiusLevel: RadiusLevel;
  shadowLevel: ShadowLevel;
  fontScale: FontScale;
  buttonStyle: ButtonStyle;
  spacing: SpacingScale;
  overrides?: Record<string, ThemeComponentOverride>;
  presets?: ThemePalettePreset[];
}

const DEFAULT_THEME: ThemeDocument = {
  name: 'Default Light',
  mode: 'light',
  palette: {
    primary: '168 197 164',
    secondary: '232 184 200',
    accent: '63 95 71',
    neutral: '29 42 57',
    surface: '255 255 255',
    background: '250 246 240',
    success: '46 204 113',
    warning: '241 196 15',
    error: '231 76 60'
  },
  radiusLevel: 'md',
  shadowLevel: 2,
  fontScale: 'base',
  buttonStyle: 'solid',
  spacing: 'comfortable',
  overrides: {
    navbar: {
      palette: {
        neutral: '255 255 255',
        accent: '29 42 57'
      }
    },
    productCard: {
      palette: {
        accent: '168 197 164'
      },
      shadowLevel: 2
    },
    footer: {
      palette: {
        neutral: '63 95 71'
      }
    }
  },
  presets: [
    {
      id: 'default',
      name: 'Default',
      scope: 'global',
      palette: {
        primary: '168 197 164',
        secondary: '232 184 200',
        accent: '63 95 71',
        neutral: '29 42 57',
        surface: '255 255 255',
        background: '250 246 240',
        success: '46 204 113',
        warning: '241 196 15',
        error: '231 76 60'
      }
    },
    {
      id: 'dark',
      name: 'Dark',
      scope: 'global',
      palette: {
        primary: '100 116 139',
        secondary: '148 163 184',
        accent: '51 65 85',
        neutral: '241 245 249',
        surface: '30 41 59',
        background: '15 23 42',
        success: '34 197 94',
        warning: '251 191 36',
        error: '248 113 113'
      }
    },
    {
      id: 'high-contrast',
      name: 'High Contrast',
      scope: 'global',
      palette: {
        primary: '0 0 0',
        secondary: '255 255 0',
        accent: '0 0 0',
        neutral: '0 0 0',
        surface: '255 255 255',
        background: '255 255 255',
        success: '0 128 0',
        warning: '255 204 0',
        error: '204 0 0'
      }
    },
    {
      id: 'brand',
      name: 'Brand preset',
      scope: 'global',
      palette: {
        primary: '199 104 59',
        secondary: '229 155 115',
        accent: '75 59 47',
        neutral: '23 19 15',
        surface: '255 255 255',
        background: '247 240 231',
        success: '46 204 113',
        warning: '241 196 15',
        error: '231 76 60'
      }
    }
  ]
};

const THEME_CACHE_KEY = 'theme:last-applied';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  private initialized = false;
  private globalSub?: Subscription;
  private userSub?: Subscription;

  private globalTheme = signal<ThemeDocument>(DEFAULT_THEME);
  private userTheme = signal<ThemeDocument | null>(null);
  private previewTheme = signal<Partial<ThemeDocument> | null>(null);
  private ignoreUserTheme = signal<boolean>(false);

  readonly activeTheme = computed(() => {
    // Live preview is applied only while viewing the settings page; otherwise use persisted theme
    return this.mergeTheme(
      DEFAULT_THEME,
      this.globalTheme(),
      this.ignoreUserTheme() ? null : this.userTheme() ?? null,
      this.isPreviewMode() ? this.previewTheme() : null
    );
  });
  readonly isPreviewing = computed(() => this.isPreviewMode() && !!this.previewTheme());
  private readonly previewEnabled = signal<boolean>(false);

  constructor() {
    // Keep CSS variables in sync with the active theme (global -> user -> preview priority)
    effect(() => {
      this.applyThemeToCss(this.activeTheme());
    });

    // Disable preview mode when component is destroyed (no-op for singleton service, but keeps flag false by default)
    this.previewEnabled.set(false);
  }

  async initializeTheme(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    this.loadCachedTheme();
    await this.ensureGlobalThemeExists();
    this.subscribeToGlobalTheme();
    this.subscribeToUserTheme();
  }

  activeThemeSnapshot(): ThemeDocument {
    return this.cloneTheme(this.activeTheme());
  }

  previewThemeUpdate(partial: Partial<ThemeDocument> | null): void {
    this.previewTheme.set(partial);
  }

  setPreviewMode(enabled: boolean, opts?: { ignoreUserTheme?: boolean }): void {
    this.previewEnabled.set(enabled);
    this.ignoreUserTheme.set(enabled && !!opts?.ignoreUserTheme);
  }

  async saveTheme(theme: ThemeDocument, scope: 'global' | 'user' = 'global'): Promise<void> {
    if (scope === 'user') {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User must be signed in to save a personal theme.');
      }
      const userThemeRef = doc(this.firestore, `users/${user.uid}/themes/custom`);
      await setDoc(userThemeRef, theme, { merge: true });
      // Optimistically update local state to avoid flicker back to old theme
      this.userTheme.set(theme);
      this.previewTheme.set(null);
      return;
    }

    const globalRef = doc(this.firestore, 'themes', 'global');
    await setDoc(globalRef, theme, { merge: true });
    // Optimistically update local state to avoid flicker back to old theme
    this.globalTheme.set(theme);
    this.previewTheme.set(null);
  }

  async resetTheme(scope: 'global' | 'user' = 'global'): Promise<void> {
    if (scope === 'user') {
      const user = this.auth.currentUser;
      if (!user) {
        return;
      }
      const userThemeRef = doc(this.firestore, `users/${user.uid}/themes/custom`);
      await deleteDoc(userThemeRef);
      this.userTheme.set(null);
      this.previewTheme.set(null);
      return;
    }

    const globalRef = doc(this.firestore, 'themes', 'global');
    await setDoc(globalRef, DEFAULT_THEME);
    this.globalTheme.set(DEFAULT_THEME);
    this.previewTheme.set(null);
  }

  async savePalettePreset(
    name: string,
    palette: ThemePalette,
    scope: 'global' | 'user' = 'user'
  ): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Preset name is required.');
    }
    const preset: ThemePalettePreset = {
      id: `${Date.now()}-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}`,
      name: trimmed,
      palette,
      scope
    };

    if (scope === 'user') {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('Sign in to save a personal palette.');
      }
      const userThemeRef = doc(this.firestore, `users/${user.uid}/themes/custom`);
      await setDoc(userThemeRef, { presets: arrayUnion(preset) }, { merge: true });
      return;
    }

    const globalRef = doc(this.firestore, 'themes', 'global');
    await setDoc(globalRef, { presets: arrayUnion(preset) }, { merge: true });
  }

  async deletePalettePreset(id: string, scope: 'global' | 'user' = 'user'): Promise<void> {
    const theme = scope === 'user' ? this.userTheme() : this.globalTheme();
    const preset = theme?.presets?.find(p => p.id === id);
    if (!preset) return;

    if (scope === 'user') {
      const user = this.auth.currentUser;
      if (!user) return;
      const userThemeRef = doc(this.firestore, `users/${user.uid}/themes/custom`);
      await setDoc(userThemeRef, { presets: arrayRemove(preset) }, { merge: true });
      return;
    }

    const globalRef = doc(this.firestore, 'themes', 'global');
    await setDoc(globalRef, { presets: arrayRemove(preset) }, { merge: true });
  }

  private subscribeToGlobalTheme(): void {
    const ref = doc(this.firestore, 'themes', 'global');
    this.globalSub?.unsubscribe();
    this.globalSub = docData(ref)
      .pipe(catchError(() => of(DEFAULT_THEME)))
      .subscribe(theme => {
        this.globalTheme.set(this.mergeTheme(DEFAULT_THEME, theme as ThemeDocument));
      });
  }

  private subscribeToUserTheme(): void {
    onAuthStateChanged(this.auth, user => {
      this.userSub?.unsubscribe();
      if (!user) {
        this.userTheme.set(null);
        return;
      }

      const ref = doc(this.firestore, `users/${user.uid}/themes/custom`);
      this.userSub = docData(ref)
        .pipe(catchError(() => of(null)))
        .subscribe(theme => {
          this.userTheme.set(theme ? (theme as ThemeDocument) : null);
        });
    });
  }

  private async ensureGlobalThemeExists(): Promise<void> {
    const ref = doc(this.firestore, 'themes', 'global');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return;
    }

    // Seed default locally so CSS vars are available even if Firestore write fails (non-admin clients)
    this.globalTheme.set(DEFAULT_THEME);
    try {
      await setDoc(ref, DEFAULT_THEME);
    } catch (error) {
      console.warn('[theme] Global theme missing; default applied locally. Seed with admin rights when available.', error);
    }
  }

  private applyThemeToCss(theme: ThemeDocument): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const palette = theme.palette;

    const paletteVars: Record<string, string> = {
      '--color-primary': palette.primary,
      '--color-secondary': palette.secondary,
      '--color-accent': palette.accent,
      '--color-neutral': palette.neutral,
      '--color-surface': palette.surface,
      '--color-background': palette.background,
      '--color-success': palette.success,
      '--color-warning': palette.warning,
      '--color-error': palette.error
    };

    Object.entries(paletteVars).forEach(([key, value]) => root.style.setProperty(key, value));

    // Keep legacy ts-* tokens aligned to the active palette so old styles stay in sync
    const toRgb = (value: string) => (value.includes(' ') ? `rgb(${value})` : value);
    const mix = (base: string, pct: number, overlay: string) =>
      `color-mix(in srgb, ${base} ${pct}%, ${overlay})`;

    const primary = toRgb(palette.primary);
    const accent = toRgb(palette.accent);
    const neutral = toRgb(palette.neutral);
    const surface = toRgb(palette.surface);
    const background = toRgb(palette.background);

    root.style.setProperty('--ts-bg', background);
    root.style.setProperty('--ts-bg-soft', mix(background, 85, surface));
    root.style.setProperty('--ts-paper', surface);
    root.style.setProperty('--ts-ink', neutral);
    root.style.setProperty('--ts-ink-soft', mix(neutral, 70, primary));
    root.style.setProperty('--ts-accent', primary);
    root.style.setProperty('--ts-accent-soft', mix(primary, 70, surface));
    root.style.setProperty('--ts-accent-dark', mix(primary, 75, accent));
    root.style.setProperty('--ts-line', mix(primary, 35, 'transparent'));

    // Legacy aliases for components still using bitcoin-* tokens
    root.style.setProperty('--bitcoin-orange', primary);
    root.style.setProperty('--bitcoin-gold', mix(primary, 80, surface));
    root.style.setProperty('--luxury-gold', mix(primary, 75, accent));

    // Legacy layout tokens to keep older styles in sync
    const muted = mix(neutral, 70, primary);
    const onPrimary = this.pickReadableTextColor(palette.primary);
    root.style.setProperty('--bg-surface', background);
    root.style.setProperty('--bg-elevated', surface);
    root.style.setProperty('--text', neutral);
    root.style.setProperty('--muted', muted);
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--on-primary', onPrimary);
    root.style.setProperty('--border', mix(primary, 35, 'transparent'));
    root.style.setProperty('--overlay', mix(neutral, 8, 'transparent'));

    const radiusTokens: Record<RadiusLevel, string> = {
      xs: '4px',
      sm: '6px',
      md: '10px',
      lg: '14px',
      full: '999px'
    };

    const shadowTokens: Record<ShadowLevel, string> = {
      0: '0 0 0 0 rgba(0, 0, 0, 0)',
      1: '0 1px 3px rgba(0, 0, 0, 0.12)',
      2: '0 4px 6px rgba(0, 0, 0, 0.15)',
      3: '0 10px 15px rgba(0, 0, 0, 0.2)',
      4: '0 20px 25px rgba(0, 0, 0, 0.22)'
    };

    const fontScaleMap: Record<FontScale, number> = {
      sm: 0.95,
      base: 1,
      lg: 1.08,
      xl: 1.16
    };

    const spacingMap: Record<SpacingScale, { section: string; padding: string }> = {
      compact: { section: '2.6rem', padding: '1.25rem' },
      comfortable: { section: '3.5rem', padding: '1.75rem' },
      relaxed: { section: '4.5rem', padding: '2.25rem' }
    };

    const fontScale = fontScaleMap[theme.fontScale] ?? 1;
    const sectionSpacing = spacingMap[theme.spacing]?.section ?? '3.5rem';
    const pagePadding = spacingMap[theme.spacing]?.padding ?? '1.75rem';

    root.style.setProperty('--radius-xs', radiusTokens.xs);
    root.style.setProperty('--radius-sm', radiusTokens.sm);
    root.style.setProperty('--radius-md', radiusTokens.md);
    root.style.setProperty('--radius-lg', radiusTokens.lg);
    root.style.setProperty('--radius-full', radiusTokens.full);

    root.style.setProperty('--shadow-0', shadowTokens[0]);
    root.style.setProperty('--shadow-1', shadowTokens[1]);
    root.style.setProperty('--shadow-2', shadowTokens[2]);
    root.style.setProperty('--shadow-3', shadowTokens[3]);
    root.style.setProperty('--shadow-4', shadowTokens[4]);

    root.style.setProperty('--font-size-base', `${(1 * fontScale).toFixed(3)}rem`);
    root.style.setProperty('--font-size-lg', `${(1.125 * fontScale).toFixed(3)}rem`);
    root.style.setProperty('--font-size-xl', `${(1.25 * fontScale).toFixed(3)}rem`);
    root.style.setProperty('--font-size-2xl', `${(1.5 * fontScale).toFixed(3)}rem`);

    root.style.setProperty('--section-spacing', sectionSpacing);
    root.style.setProperty('--container-inline-padding', pagePadding);
    root.style.setProperty('--theme-button-style', theme.buttonStyle);
    root.setAttribute('data-theme-mode', theme.mode);
    root.setAttribute('data-theme-button-style', theme.buttonStyle);

    const overrides = theme.overrides ?? {};
    Object.entries(overrides).forEach(([componentKey, override]) => {
      if (override.palette) {
        Object.entries(override.palette).forEach(([token, value]) => {
          root.style.setProperty(`--component-${componentKey}-${token}`, value as string);
        });
      }
      if (override.radiusLevel) {
        root.style.setProperty(`--component-${componentKey}-radius`, radiusTokens[override.radiusLevel]);
      }
      if (override.shadowLevel !== undefined) {
        root.style.setProperty(
          `--component-${componentKey}-shadow`,
          shadowTokens[override.shadowLevel]
        );
      }
    });

    // Cache last applied theme for fast boot when offline or before Firestore responds
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(theme));
      } catch (error) {
        console.warn('[theme] Unable to cache theme', error);
      }
    }
  }

  private mergeTheme(
    ...themes: Array<Partial<ThemeDocument> | null | undefined>
  ): ThemeDocument {
    const result: ThemeDocument = {
      ...DEFAULT_THEME,
      palette: { ...DEFAULT_THEME.palette },
      overrides: { ...(DEFAULT_THEME.overrides ?? {}) },
      presets: [...(DEFAULT_THEME.presets ?? [])]
    };

    for (const theme of themes) {
      if (!theme) continue;

      if (theme.mode) result.mode = theme.mode;
      if (theme.radiusLevel) result.radiusLevel = theme.radiusLevel;
      if (theme.shadowLevel !== undefined) result.shadowLevel = theme.shadowLevel as ShadowLevel;
      if (theme.fontScale) result.fontScale = theme.fontScale;
      if (theme.buttonStyle) result.buttonStyle = theme.buttonStyle;
      if (theme.spacing) result.spacing = theme.spacing;
      if (theme.name) result.name = theme.name;

      if (theme.palette) {
        result.palette = { ...result.palette, ...theme.palette };
      }

      if (theme.overrides) {
        result.overrides = { ...(result.overrides ?? {}) };
        Object.entries(theme.overrides).forEach(([component, override]) => {
          const existing = result.overrides?.[component] ?? {};
          result.overrides![component] = {
            ...existing,
            palette: { ...(existing.palette ?? {}), ...(override.palette ?? {}) },
            radiusLevel: override.radiusLevel ?? existing.radiusLevel,
            shadowLevel: override.shadowLevel ?? existing.shadowLevel,
            buttonStyle: override.buttonStyle ?? existing.buttonStyle,
            spacing: override.spacing ?? existing.spacing,
            fontScale: override.fontScale ?? existing.fontScale
          };
        });
      }

      if (theme.presets) {
        const combined = [...(result.presets ?? []), ...theme.presets];
        // Deduplicate by id, keep later entries (user/global) overriding defaults
        const seen = new Set<string>();
        result.presets = combined.filter(preset => {
          if (!preset.id) return false;
          if (seen.has(preset.id)) return false;
          seen.add(preset.id);
          return true;
        });
      }
    }

    return result;
  }

  private cloneTheme(theme: ThemeDocument): ThemeDocument {
    return JSON.parse(JSON.stringify(theme));
  }

  private isPreviewMode(): boolean {
    return this.previewEnabled();
  }

  private loadCachedTheme(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const cached = localStorage.getItem(THEME_CACHE_KEY);
      if (!cached) return;
      const parsed = JSON.parse(cached) as ThemeDocument;
      if (parsed && parsed.palette) {
        const merged = this.mergeTheme(DEFAULT_THEME, parsed);
        // Hydrate immediately so we don't flash the default palette while Firestore loads
        this.globalTheme.set(merged);
        this.previewTheme.set(parsed);
      }
    } catch (error) {
      console.warn('[theme] Failed to load cached theme', error);
    }
  }

  private parseColor(value: string): [number, number, number] | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (trimmed.startsWith('rgb')) {
      const parts = trimmed.match(/\d+/g)?.map(Number) ?? [];
      if (parts.length >= 3) return [parts[0], parts[1], parts[2]];
      return null;
    }
    if (trimmed.includes(' ')) {
      const parts = trimmed.split(/\s+/).map(part => parseInt(part, 10));
      if (parts.length >= 3 && parts.every(n => !Number.isNaN(n))) {
        return [parts[0], parts[1], parts[2]];
      }
      return null;
    }
    const hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(hex)) {
      return null;
    }
    const expanded = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const r = parseInt(expanded.slice(0, 2), 16);
    const g = parseInt(expanded.slice(2, 4), 16);
    const b = parseInt(expanded.slice(4, 6), 16);
    return [r, g, b];
  }

  private pickReadableTextColor(value: string): string {
    const rgb = this.parseColor(value);
    if (!rgb) return '#ffffff';
    const [r, g, b] = rgb;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.6 ? '#1d2a39' : '#ffffff';
  }
}
