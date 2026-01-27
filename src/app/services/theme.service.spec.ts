import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { ThemeDocument, ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let root: HTMLElement;
  const trackedVars = [
    '--color-primary',
    '--color-secondary',
    '--color-accent',
    '--color-neutral',
    '--color-surface',
    '--color-background',
    '--ts-accent',
    '--ts-ink',
    '--bg-surface',
    '--bg-elevated',
    '--text',
    '--primary',
    '--on-primary',
    '--theme-button-style'
  ];
  const previousValues = new Map<string, string>();
  let previousButtonStyle: string | null = null;
  let previousThemeMode: string | null = null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: Firestore, useValue: {} },
        { provide: Auth, useValue: { currentUser: null } }
      ]
    });
    service = TestBed.inject(ThemeService);
    root = document.documentElement;
    trackedVars.forEach(key => previousValues.set(key, root.style.getPropertyValue(key)));
    previousButtonStyle = root.getAttribute('data-theme-button-style');
    previousThemeMode = root.getAttribute('data-theme-mode');
  });

  afterEach(() => {
    trackedVars.forEach(key => {
      const value = previousValues.get(key) ?? '';
      if (value) {
        root.style.setProperty(key, value);
      } else {
        root.style.removeProperty(key);
      }
    });
    if (previousButtonStyle) {
      root.setAttribute('data-theme-button-style', previousButtonStyle);
    } else {
      root.removeAttribute('data-theme-button-style');
    }
    if (previousThemeMode) {
      root.setAttribute('data-theme-mode', previousThemeMode);
    } else {
      root.removeAttribute('data-theme-mode');
    }
  });

  it('applies palette + legacy tokens + button style attributes', () => {
    const theme: ThemeDocument = {
      ...service.activeThemeSnapshot(),
      mode: 'light',
      buttonStyle: 'outline',
      palette: {
        primary: '200 180 160',
        secondary: '220 200 190',
        accent: '60 90 70',
        neutral: '10 20 30',
        surface: '250 250 250',
        background: '240 240 240',
        success: '46 204 113',
        warning: '241 196 15',
        error: '231 76 60'
      }
    };

    (service as unknown as { applyThemeToCss: (t: ThemeDocument) => void }).applyThemeToCss(theme);

    expect(root.style.getPropertyValue('--color-primary').trim()).toBe('200 180 160');
    expect(root.style.getPropertyValue('--color-neutral').trim()).toBe('10 20 30');
    expect(root.style.getPropertyValue('--ts-accent').trim()).toBe('rgb(200 180 160)');
    expect(root.style.getPropertyValue('--ts-ink').trim()).toBe('rgb(10 20 30)');
    expect(root.style.getPropertyValue('--bg-elevated').trim()).toBe('rgb(250 250 250)');
    expect(root.style.getPropertyValue('--text').trim()).toBe('rgb(10 20 30)');
    expect(root.style.getPropertyValue('--primary').trim()).toBe('rgb(200 180 160)');
    expect(root.style.getPropertyValue('--on-primary').trim()).toBe('#1d2a39');
    expect(root.style.getPropertyValue('--theme-button-style').trim()).toBe('outline');
    expect(root.getAttribute('data-theme-button-style')).toBe('outline');
    expect(root.getAttribute('data-theme-mode')).toBe('light');
  });
});
