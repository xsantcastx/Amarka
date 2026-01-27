import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ButtonStyle,
  FontScale,
  RadiusLevel,
  ShadowLevel,
  SpacingScale,
  ThemeDocument,
  ThemePalette,
  ThemePalettePreset,
  ThemeService
} from '../../../services/theme.service';

type ThemeScope = 'global' | 'user';

@Component({
  selector: 'app-theme-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './theme-manager.component.html',
  styleUrl: './theme-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeManagerComponent implements OnDestroy {
  private themeService = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);

  paletteKeys: Array<{ key: keyof ThemePalette; label: string }> = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'accent', label: 'Accent' },
    { key: 'neutral', label: 'Neutral' },
    { key: 'surface', label: 'Surface' },
    { key: 'background', label: 'Background' },
    { key: 'success', label: 'Success' },
    { key: 'warning', label: 'Warning' },
    { key: 'error', label: 'Error' }
  ];

  radiusLevels: RadiusLevel[] = ['xs', 'sm', 'md', 'lg', 'full'];
  shadowLevels: ShadowLevel[] = [0, 1, 2, 3, 4];
  fontScales: FontScale[] = ['sm', 'base', 'lg', 'xl'];
  buttonStyles: ButtonStyle[] = ['solid', 'outline', 'ghost'];
  spacingOptions: SpacingScale[] = ['compact', 'comfortable', 'relaxed'];

  componentOverrides = [
    { key: 'navbar', label: 'Navbar' },
    { key: 'productCard', label: 'Product cards' },
    { key: 'footer', label: 'Footer' }
  ];

  expanded = false;
  scope: ThemeScope = 'global';
  draft: ThemeDocument = this.themeService.activeThemeSnapshot();
  paletteHex: Record<string, string> = {};
  overrideHex: Record<string, { accent: string; neutral: string }> = {};
  isSaving = false;
  autoSave = true;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private isApplyingPreset = false;
  private syncDraftEffect = effect(() => {
    if (this.isApplyingPreset) {
      return;
    }
    const nextDraft = this.clone(this.themeService.activeTheme());
    // Defer draft sync to next task to avoid expression-changed errors
    queueMicrotask(() => {
      this.draft = nextDraft;
      this.syncHexInputs(nextDraft);
      this.cdr.markForCheck();
    });
  });
  presetName = '';
  presets: ThemePalettePreset[] = [];

  constructor() {
    // Enable preview mode while this component is alive and ignore personal overrides when editing global
    this.themeService.setPreviewMode(true, { ignoreUserTheme: this.scope === 'global' });
    this.syncHexInputs(this.draft);
  }

  ngOnDestroy(): void {
    // Disable preview mode and clear transient preview when leaving
    this.themeService.setPreviewMode(false);
    this.themeService.previewThemeUpdate(null);
    this.cdr.markForCheck();
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  setScope(scope: ThemeScope): void {
    this.scope = scope;
    // While editing the global theme, ignore any personal override so preview matches site-wide visitors
    this.themeService.setPreviewMode(true, { ignoreUserTheme: scope === 'global' });
    this.cdr.markForCheck();
  }

  updatePalette(key: keyof ThemePalette, value: string): void {
    const normalized = this.normalizeHex(value);
    if (!normalized) {
      return;
    }
    this.draft.palette[key] = normalized;
    this.paletteHex[key] = this.toHex(normalized);
    this.previewDraft();
    this.cdr.markForCheck();
  }

  updateRadius(level: RadiusLevel): void {
    this.draft.radiusLevel = level;
    this.previewDraft();
    this.cdr.markForCheck();
  }

  updateShadow(level: ShadowLevel): void {
    this.draft.shadowLevel = level;
    this.previewDraft();
    this.cdr.markForCheck();
  }

  updateFontScale(scale: FontScale): void {
    this.draft.fontScale = scale;
    this.previewDraft();
    this.cdr.markForCheck();
  }

  updateButtonStyle(style: ButtonStyle): void {
    this.draft.buttonStyle = style;
    this.previewDraft();
    this.cdr.markForCheck();
  }

  updateSpacing(spacing: SpacingScale): void {
    this.draft.spacing = spacing;
    this.previewDraft();
    this.cdr.markForCheck();
  }

  updateOverride(component: string, key: keyof ThemePalette, value: string): void {
    const normalized = this.normalizeHex(value);
    if (!normalized) {
      return;
    }
    const overrides = this.draft.overrides ?? {};
    const existing = overrides[component] ?? { palette: {} };
    overrides[component] = {
      ...existing,
      palette: { ...(existing.palette ?? {}), [key]: normalized }
    };
    this.draft.overrides = overrides;
    const current = this.overrideHex[component] ?? { accent: '', neutral: '' };
    this.overrideHex[component] = {
      ...current,
      [key]: this.toHex(normalized)
    };
    this.previewDraft();
    this.cdr.markForCheck();
  }

  async save(scope: ThemeScope): Promise<void> {
    this.setSaving(true);
    try {
      await this.themeService.saveTheme(this.draft, scope);
      this.themeService.previewThemeUpdate(null);
    } catch (error) {
      console.error('Failed to save theme', error);
    } finally {
      this.setSaving(false);
    }
  }

  async reset(scope: ThemeScope): Promise<void> {
    this.setSaving(true);
    try {
      await this.themeService.resetTheme(scope);
      this.themeService.previewThemeUpdate(null);
    } catch (error) {
      console.error('Failed to reset theme', error);
    } finally {
      this.setSaving(false);
    }
  }

  previewDraft(): void {
    this.themeService.previewThemeUpdate(this.draft);
    this.queueAutoSave();
    this.cdr.markForCheck();
  }

  clearPreview(): void {
    this.themeService.previewThemeUpdate(null);
    this.cdr.markForCheck();
  }

  async savePreset(scope: ThemeScope): Promise<void> {
    if (!this.presetName.trim()) {
      return;
    }
    this.setSaving(true);
    try {
      await this.themeService.savePalettePreset(this.presetName.trim(), this.draft.palette, scope);
      this.presetName = '';
    } catch (error) {
      console.error('Failed to save preset', error);
    } finally {
      this.setSaving(false);
    }
  }

  async deletePreset(preset: ThemePalettePreset, scope: ThemeScope): Promise<void> {
    this.setSaving(true);
    try {
      await this.themeService.deletePalettePreset(preset.id, scope);
    } catch (error) {
      console.error('Failed to delete preset', error);
    } finally {
      this.setSaving(false);
    }
  }

  applyPreset(preset: ThemePalettePreset): void {
    this.isApplyingPreset = true;
    // Clear any pending auto-save
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    
    this.draft = {
      ...this.draft,
      palette: { ...preset.palette }
    };
    this.syncHexInputs(this.draft);
    this.previewDraft();
    this.cdr.detectChanges();

    // Re-enable syncing on next microtask so effects can run again
    queueMicrotask(() => {
      this.isApplyingPreset = false;
      this.cdr.markForCheck();
    });
  }

  scopeLabel(scope: ThemeScope): string {
    return scope === 'global' ? 'Global (everyone)' : 'My account only';
  }

  toHex(value: string): string {
    if (!value) return '#000000';
    if (!value.includes(' ')) {
      return value.startsWith('#') ? value : `#${value.replace('#', '')}`;
    }
    const channels = value.split(/\s+/).map(part => Math.max(0, Math.min(255, parseInt(part, 10) || 0)));
    return (
      '#' +
      channels
        .slice(0, 3)
        .map(c => c.toString(16).padStart(2, '0'))
        .join('')
    );
  }

  displayColor(value: string): string {
    if (!value) return '';
    return value.includes(' ') ? `rgb(${value})` : value;
  }

  private normalizeHex(value: string): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!this.isValidHex(trimmed)) {
      return null;
    }
    const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    return this.hexToRgbString(normalized);
  }

  private isValidHex(value: string): boolean {
    return /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(value.trim());
  }

  private hexToRgbString(hex: string): string {
    const normalized = hex.replace('#', '');
    const chunks =
      normalized.length === 3
        ? normalized.split('').map(c => c + c)
        : normalized.match(/.{1,2}/g);
    if (!chunks || chunks.length < 3) {
      return '0 0 0';
    }
    const [r, g, b] = chunks.slice(0, 3).map(chunk => parseInt(chunk, 16));
    return `${r} ${g} ${b}`;
  }

  private clone(theme: ThemeDocument): ThemeDocument {
    return JSON.parse(JSON.stringify(theme));
  }

  private syncHexInputs(theme: ThemeDocument): void {
    this.paletteKeys.forEach(({ key }) => {
      this.paletteHex[key] = this.toHex(theme.palette[key]);
    });

    this.componentOverrides.forEach(({ key }) => {
      const palette = theme.overrides?.[key]?.palette ?? {};
      this.overrideHex[key] = {
        accent: this.toHex(palette.accent || theme.palette.accent),
        neutral: this.toHex(palette.neutral || theme.palette.neutral)
      };
    });
  }

  private queueAutoSave(): void {
    if (!this.autoSave || this.isApplyingPreset) {
      return;
    }
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    this.autoSaveTimer = setTimeout(() => {
      if (this.isSaving || this.isApplyingPreset) {
        return;
      }
      this.save(this.scope).catch(error => console.error('Theme auto-save failed', error));
    }, 750);
  }

  private setSaving(state: boolean): void {
    // Defer flag change to avoid ExpressionChanged errors in OnPush
    queueMicrotask(() => {
      this.isSaving = state;
      this.cdr.markForCheck();
    });
  }
}
