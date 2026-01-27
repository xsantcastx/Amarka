import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ThemeDocument, ThemeService } from '../../../services/theme.service';
import { ThemeManagerComponent } from './theme-manager.component';

class ThemeServiceStub {
  private theme: ThemeDocument;
  activeTheme = signal<ThemeDocument>({} as ThemeDocument);

  constructor(theme: ThemeDocument) {
    this.theme = JSON.parse(JSON.stringify(theme));
    this.activeTheme.set(this.theme);
  }

  activeThemeSnapshot(): ThemeDocument {
    return JSON.parse(JSON.stringify(this.theme));
  }

  setPreviewMode(): void {}
  previewThemeUpdate(): void {}
  saveTheme(): Promise<void> {
    return Promise.resolve();
  }
  resetTheme(): Promise<void> {
    return Promise.resolve();
  }
  savePalettePreset(): Promise<void> {
    return Promise.resolve();
  }
  deletePalettePreset(): Promise<void> {
    return Promise.resolve();
  }
}

describe('ThemeManagerComponent', () => {
  let fixture: ComponentFixture<ThemeManagerComponent>;

  beforeEach(async () => {
    const themeStub = new ThemeServiceStub({
      name: 'Test',
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
      spacing: 'comfortable'
    });

    await TestBed.configureTestingModule({
      imports: [ThemeManagerComponent],
      providers: [{ provide: ThemeService, useValue: themeStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeManagerComponent);
    fixture.detectChanges();
  });

  it('renders without gradient button classes', () => {
    const component = fixture.componentInstance;
    component.expanded = true;
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const gradientButtons = root.querySelectorAll('button[class*="bg-gradient-to-"]');
    expect(gradientButtons.length).toBe(0);

    const previewButtons = root.querySelectorAll('button.ts-btn');
    expect(previewButtons.length).toBeGreaterThan(0);
  });
});
