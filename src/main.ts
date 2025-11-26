import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

const LOADER_MIN_VISIBLE_MS = 900;
const LOADER_MAX_VISIBLE_MS = 6500;
const loaderStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

let hideScheduled = false;

const scheduleLoaderHide = (delay: number) => {
  if (typeof document === 'undefined') {
    return;
  }

  const loader = document.getElementById('app-initial-loader');
  if (!loader) {
    return;
  }

  if (hideScheduled) {
    return;
  }

  hideScheduled = true;

  window.setTimeout(() => {
    loader.classList.add('hidden');
    const remove = () => loader.remove();
    loader.addEventListener('transitionend', remove, { once: true });
    // Fallback removal in case transitionend does not fire
    window.setTimeout(remove, 600);
  }, delay);
};

const hideInitialLoader = (additionalDelay = 0) => {
  if (typeof document === 'undefined') {
    return;
  }
  const loader = document.getElementById('app-initial-loader');
  if (loader) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - loaderStartTime;
    const minimumDelay = Math.max(0, LOADER_MIN_VISIBLE_MS - elapsed);
    const computedDelay = Math.max(additionalDelay, minimumDelay);
    scheduleLoaderHide(computedDelay);
  }
};

bootstrapApplication(AppComponent, appConfig)
  .then((appRef) => {
    if (typeof window === 'undefined') {
      hideInitialLoader();
      return;
    }

    const settleAndHide = () => window.requestAnimationFrame(() => hideInitialLoader());

    const stabilizeSubscription = appRef.isStable.subscribe((isStable) => {
      if (isStable) {
        stabilizeSubscription.unsubscribe();
        settleAndHide();
      }
    });

    if (document.readyState === 'complete') {
      settleAndHide();
    } else {
      window.addEventListener('load', settleAndHide, { once: true });
    }

    window.setTimeout(() => hideInitialLoader(), LOADER_MAX_VISIBLE_MS);
  })
  .catch((err) => {
    console.error(err);
    hideInitialLoader();
  });
