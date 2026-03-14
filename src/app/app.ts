import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { FooterComponent } from './core/components/footer/footer.component';
import { CookieBannerComponent } from './shared/components/cookie-banner/cookie-banner.component';
import { WhatsappButtonComponent } from './shared/components/whatsapp-button/whatsapp-button.component';
import { AnalyticsService } from './services/analytics.service';
import { SettingsService, AppSettings } from './services/settings.service';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, CookieBannerComponent, WhatsappButtonComponent, TranslateModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);
  private settingsService = inject(SettingsService);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  isMaintenanceMode = false;
  maintenanceMessage = '';
  contactEmail = '';
  contactPhone = '';
  contactAddress = '';
  settingsLoaded = false;
  isAdmin = false;
  isAuthenticated = false;
  currentUrl = '';
  isAdminRoute = false;
  showCookieBanner = true;
  showWhatsappButton = false;
  
  // Routes that should be accessible during maintenance mode (even for non-authenticated users)
  private maintenanceExemptRoutes = [
    '/client/login',
    '/client/register'
  ];

  constructor() {
    // Subscribe to settings changes in constructor (injection context)
    this.settingsService.settings$
      .pipe(takeUntilDestroyed())
      .subscribe(settings => {
        this.applySettings(settings);
      });

    // Subscribe to auth changes in constructor (injection context)
    this.authService.userProfile$
      .pipe(takeUntilDestroyed())
      .subscribe(profile => {
        this.isAdmin = (profile?.role === 'admin');
        this.isAuthenticated = !!profile;
        this.cdr.markForCheck();
      });

    // Track current route for maintenance mode exemptions
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((event) => {
        this.currentUrl = (event as NavigationEnd).url;
        this.isAdminRoute = this.currentUrl.startsWith('/admin');
        this.cdr.markForCheck();
      });

    this.currentUrl = this.router.url;
    this.isAdminRoute = this.currentUrl.startsWith('/admin');
  }

  ngOnInit() {
    // Set language from localStorage or default to English (only in browser)
    if (isPlatformBrowser(this.platformId)) {
      const savedLang = localStorage.getItem('selectedLanguage') || 'en';
      this.translate.setDefaultLang('en');
      this.translate.use(savedLang);

      // Initialize theme from settings
      this.themeService.initializeTheme();
    } else {
      // Server-side: just use default English
      this.translate.setDefaultLang('en');
      this.translate.use('en');
    }
    
    // Initialize page view tracking on route changes
    this.analyticsService.initPageViewTracking();

    // Prime cache on bootstrap
    this.settingsService.getSettings().then(settings => this.applySettings(settings));
  }

  private applySettings(settings: AppSettings) {
    if (!settings) {
      return;
    }

    this.isMaintenanceMode = settings.maintenanceMode;
    this.maintenanceMessage = settings.maintenanceMessage || 'We are performing scheduled maintenance. Please check back shortly.';
    this.contactEmail = settings.contactEmail;
    this.contactPhone = settings.contactPhone;
    this.contactAddress = settings.contactAddress;
    this.showCookieBanner = settings.cookieConsentRequired;
    this.showWhatsappButton = !!settings.whatsappNumber;
    this.settingsLoaded = true;
    this.cdr.markForCheck();
  }

  // Check if current route should be accessible during maintenance mode
  get shouldShowMaintenancePage(): boolean {
    // Don't show maintenance page if:
    // 1. Settings not loaded yet
    // 2. Maintenance mode is disabled
    // 3. User is an admin
    // 4. User is authenticated (logged in)
    // 5. Current route is in the exemption list (login/register)
    return this.settingsLoaded && 
           this.isMaintenanceMode && 
           !this.isAdmin && 
           !this.isAuthenticated &&
           !this.isMaintenanceExemptRoute();
  }

  private isMaintenanceExemptRoute(): boolean {
    return this.maintenanceExemptRoutes.some(route => 
      this.currentUrl.startsWith(route)
    );
  }

  navigateToLogin() {
    this.router.navigate(['/client/login']);
  }
}
