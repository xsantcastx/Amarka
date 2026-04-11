import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter, TitleStrategy, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withFetch, HttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideFunctions, getFunctions, connectFunctionsEmulator } from '@angular/fire/functions';
import { provideAnalytics, getAnalytics, ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';
import { isSupported as analyticsIsSupported } from 'firebase/analytics';
import { provideAppCheck, initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider } from '@angular/fire/app-check';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { CustomTranslateLoader } from './core/services/translate-loader';
import { PageTitleStrategy } from './core/services/page-title.strategy';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { environment } from '../environments/environment';
import { generatedEnvironment } from '../environments/environment.generated';

export function HttpLoaderFactory(http: HttpClient) {
  return new CustomTranslateLoader(http);
}

/**
 * AMK-36 — Resolve a non-empty, trimmed App Check site key or return null.
 *
 * The "Missing required parameters: sitekey" console error detected in the
 * production health check was caused by `provideAppCheck` being registered
 * when `environment.recaptcha.enabled === true` but the resolved siteKey
 * was empty or whitespace. `new ReCaptchaV3Provider('')` then threw during
 * App Check initialization.
 *
 * This helper is the single source of truth for whether App Check can
 * safely initialize — if it returns null, provideAppCheck() MUST NOT be
 * registered. The guard below only spreads the provider when both:
 *   1. `environment.recaptcha.enabled` is true
 *   2. A non-empty trimmed siteKey is available
 */
function resolveAppCheckSiteKey(): string | null {
  const appCheckKey =
    (environment.appCheck && 'siteKey' in environment.appCheck
      ? (environment.appCheck.siteKey ?? '')
      : '') as string;
  const recaptchaKey = (environment.recaptcha?.siteKey ?? '') as string;
  const resolved = (appCheckKey || recaptchaKey || '').trim();
  return resolved.length > 0 ? resolved : null;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideAnimationsAsync(),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => {
      const firestore = getFirestore();
      return firestore;
    }),
    provideAuth(() => {
      const auth = getAuth();
      // Ensure auth persistence is set to LOCAL (keeps users signed in across sessions)
      // This prevents unexpected logouts on page refresh
      if (typeof window !== 'undefined') {
        import('firebase/auth').then(({ setPersistence, browserLocalPersistence }) => {
          setPersistence(auth, browserLocalPersistence)
            .catch((error) => {
              void 0;
            });
        });
      }
      return auth;
    }),
    provideStorage(() => {
      const storage = getStorage();
      return storage;
    }),
    // App Check for security (browser only, only when enabled AND a
    // non-empty reCAPTCHA site key is configured — AMK-36).
    ...(environment.recaptcha?.enabled
        && typeof window !== 'undefined'
        && resolveAppCheckSiteKey() !== null
      ? [
          provideAppCheck(() => {
            // Safe: the guard above already verified the site key is non-empty.
            const siteKey = resolveAppCheckSiteKey() as string;
            const provider = new ReCaptchaV3Provider(siteKey);

            const appCheck = initializeAppCheck(undefined as any, {
              provider,
              isTokenAutoRefreshEnabled: true
            });

            return appCheck;
          })
        ]
      : []),
    provideFunctions(() => {
      const functions = getFunctions();
      // Connect to emulator in development
      if (generatedEnvironment.useEmulators) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      }
      return functions;
    }),
    // Analytics with browser support check and production-only (browser only)
    ...(environment.production && typeof window !== 'undefined' ? [
      provideAnalytics(() => {
        const analytics = getAnalytics();
        return analytics;
      }),
      ScreenTrackingService,
      UserTrackingService
    ] : []),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        }
      })
    )
  ]
};
