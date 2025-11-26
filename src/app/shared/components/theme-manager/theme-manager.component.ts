import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
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
  styleUrl: './theme-manager.component.scss'
})
export class ThemeManagerComponent {
  private themeService = inject(ThemeService);

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

  scope: ThemeScope = 'global';
  draft: ThemeDocument = this.themeService.activeThemeSnapshot();
  isSaving = false;
  autoSave = true;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private syncDraftEffect = effect(() => {
    this.draft = this.clone(this.themeService.activeTheme());
  });
  presetName = '';
  presets: ThemePalettePreset[] = [];

  constructor() {
    // Enable preview mode while this component is alive
    this.themeService.setPreviewMode(true);
  }

  updatePalette(key: keyof ThemePalette, value: string): void {
    const normalized = this.normalizeColor(value);
    this.draft.palette[key] = normalized;
    this.previewDraft();
  }

  updateRadius(level: RadiusLevel): void {
    this.draft.radiusLevel = level;
    this.previewDraft();
  }

  updateShadow(level: ShadowLevel): void {
    this.draft.shadowLevel = level;
    this.previewDraft();
  }

  updateFontScale(scale: FontScale): void {
    this.draft.fontScale = scale;
    this.previewDraft();
  }

  updateButtonStyle(style: ButtonStyle): void {
    this.draft.buttonStyle = style;
    this.previewDraft();
  }

  updateSpacing(spacing: SpacingScale): void {
    this.draft.spacing = spacing;
    this.previewDraft();
  }

  updateOverride(component: string, key: keyof ThemePalette, value: string): void {
    const normalized = this.normalizeColor(value);
    const overrides = this.draft.overrides ?? {};
    const existing = overrides[component] ?? { palette: {} };
    overrides[component] = {
      ...existing,
      palette: { ...(existing.palette ?? {}), [key]: normalized }
    };
    this.draft.overrides = overrides;
    this.previewDraft();
  }

  async save(scope: ThemeScope): Promise<void> {
    this.isSaving = true;
    try {
      await this.themeService.saveTheme(this.draft, scope);
      this.themeService.previewThemeUpdate(null);
    } catch (error) {
      console.error('Failed to save theme', error);
    } finally {
      this.isSaving = false;
    }
  }

  async reset(scope: ThemeScope): Promise<void> {
    this.isSaving = true;
    try {
      await this.themeService.resetTheme(scope);
      this.themeService.previewThemeUpdate(null);
    } catch (error) {
      console.error('Failed to reset theme', error);
    } finally {
      this.isSaving = false;
    }
  }

  previewDraft(): void {
    this.themeService.previewThemeUpdate(this.draft);
    this.queueAutoSave();
  }

  clearPreview(): void {
    this.themeService.previewThemeUpdate(null);
  }

  async savePreset(scope: ThemeScope): Promise<void> {
    if (!this.presetName.trim()) {
      return;
    }
    this.isSaving = true;
    try {
      await this.themeService.savePalettePreset(this.presetName.trim(), this.draft.palette, scope);
      this.presetName = '';
    } catch (error) {
      console.error('Failed to save preset', error);
    } finally {
      this.isSaving = false;
    }
  }

  async deletePreset(preset: ThemePalettePreset, scope: ThemeScope): Promise<void> {
    this.isSaving = true;
    try {
      await this.themeService.deletePalettePreset(preset.id, scope);
    } catch (error) {
      console.error('Failed to delete preset', error);
    } finally {
      this.isSaving = false;
    }
  }

  applyPreset(preset: ThemePalettePreset): void {
    this.draft.palette = { ...preset.palette };
    this.previewDraft();
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

  private normalizeColor(value: string): string {
    if (!value) return '';
    const trimmed = value.trim();
    if (/^\d+\s+\d+\s+\d+/.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.startsWith('#')) {
      return this.hexToRgbString(trimmed);
    }
    return trimmed;
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

  private queueAutoSave(): void {
    if (!this.autoSave) {
      return;
    }
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    this.autoSaveTimer = setTimeout(() => {
      if (this.isSaving) {
        return;
      }
      this.save(this.scope).catch(error => console.error('Theme auto-save failed', error));
    }, 750);
  }
}
