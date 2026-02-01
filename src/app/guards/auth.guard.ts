import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { SettingsService } from '../services/settings.service';
import { from, of } from 'rxjs';

const waitForAuthState = async (auth: Auth): Promise<User | null> => {
  const maybeAuthStateReady = (auth as Auth & { authStateReady?: () => Promise<void> }).authStateReady;

  if (typeof maybeAuthStateReady === 'function') {
    try {
      await maybeAuthStateReady.call(auth);
      return auth.currentUser;
    } catch (error) {
      void 0;
    }
  }

  return new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (err) => {
        void 0;
        unsubscribe();
        resolve(null);
      }
    );
  });
};

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const authService = inject(AuthService);
  const settingsService = inject(SettingsService);

  const loginUrlTree = (params: Record<string, string> = {}) =>
    router.createUrlTree(['/client/login'], {
      queryParams: { returnUrl: state.url, ...params }
    });

  return from(waitForAuthState(auth)).pipe(
    switchMap(async (currentUser): Promise<boolean | UrlTree> => {
      if (!currentUser) {
        void 0;
        return loginUrlTree();
      }

      try {
        const settings = await settingsService.getSettings();
        const profile = await authService.getUserProfile(currentUser.uid);

        if (!profile) {
          void 0;
          await authService.signOutUser(null);
          return loginUrlTree();
        }

        if (profile.lastLogin && settings.sessionTimeout > 0) {
          const lastLogin = profile.lastLogin instanceof Date
            ? profile.lastLogin
            : (profile.lastLogin as any)?.toDate?.() ?? null;

          if (lastLogin) {
            const sessionTimeoutMs = settings.sessionTimeout * 60000;
            const timeSinceLogin = Date.now() - lastLogin.getTime();

            if (timeSinceLogin > sessionTimeoutMs) {
              void 0;
              await authService.signOutUser(null);
              return loginUrlTree({ sessionExpired: 'true' });
            }
          }
        }

        return true;
      } catch (error) {
        void 0;
        await authService.signOutUser(null).catch(() => undefined);
        return loginUrlTree();
      }
    })
  );
};
