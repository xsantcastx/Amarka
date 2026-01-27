import { NO_ERRORS_SCHEMA, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AnalyticsService } from './services/analytics.service';
import { AuthService } from './services/auth.service';
import { SettingsService, AppSettings } from './services/settings.service';
import { ThemeService } from './services/theme.service';
import { TranslateService } from '@ngx-translate/core';
import { AppComponent } from './app';

describe('AppComponent', () => {
  beforeEach(async () => {
    const mockSettings = {
      maintenanceMode: false,
      maintenanceMessage: '',
      contactEmail: '',
      contactPhone: '',
      contactAddress: ''
    } as AppSettings;

    TestBed.configureTestingModule({
      imports: [AppComponent, RouterTestingModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AnalyticsService, useValue: { initPageViewTracking: () => {} } },
        { provide: TranslateService, useValue: { setDefaultLang: () => {}, use: () => {} } },
        {
          provide: SettingsService,
          useValue: {
            settings$: of(mockSettings),
            getSettings: () => Promise.resolve(mockSettings)
          }
        },
        { provide: AuthService, useValue: { userProfile$: of(null) } },
        { provide: ThemeService, useValue: { initializeTheme: () => {} } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });

    TestBed.overrideComponent(AppComponent, {
      set: {
        imports: [],
        template: '<div class="app-root"></div>'
      }
    });

    await TestBed.compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
