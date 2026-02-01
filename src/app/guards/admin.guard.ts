import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { map, switchMap, catchError } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

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

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const authService = inject(AuthService);
  const router = inject(Router);

  const loginUrlTree = router.createUrlTree(['/client/login'], {
    queryParams: { returnUrl: state.url }
  });

  return from(waitForAuthState(auth)).pipe(
    switchMap((currentUser) => {
      if (!currentUser) {
        void 0;
        return of(loginUrlTree);
      }

      return from(authService.isAdmin(currentUser.uid)).pipe(
        map((isAdmin) => {
          if (isAdmin) {
            return true;
          }

          void 0;
          return router.createUrlTree(['/']);
        }),
        catchError((error) => {
          void 0;
          return of(loginUrlTree);
        })
      );
    })
  );
};
