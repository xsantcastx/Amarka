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
              console.error('[Auth] Error setting persistence:', error);
            });
        });
      }
      return auth;
    }),
    provideStorage(() => {
      const storage = getStorage();
      return storage;
    }),
    // App Check for security (browser only, only when enabled)
    ...(environment.recaptcha?.enabled && typeof window !== 'undefined' ? [
      provideAppCheck(() => {
        // Use reCAPTCHA v3 provider
        const provider = new ReCaptchaV3Provider(
          'siteKey' in environment.appCheck 
            ? environment.appCheck.siteKey as string 
            : environment.recaptcha.siteKey
        );
          
        const appCheck = initializeAppCheck(undefined as any, {
          provider,
          isTokenAutoRefreshEnabled: true
        });
        
        return appCheck;
      })
    ] : []),
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
