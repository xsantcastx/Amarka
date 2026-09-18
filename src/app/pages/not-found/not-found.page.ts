import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AmkThemeService } from '../../shared/amk-theme/amk-theme.service';

/**
 * AMK-51 — Branded 404 & Error State Pages
 *
 * A single premium error page component that renders 1 of 3 states based on
 * the route data resolved for the activated route:
 *
 *   /404       → errorState: 'not-found'   (default wildcard)
 *   /500       → errorState: 'server'
 *   /offline   → errorState: 'offline'
 */
type ErrorState = 'not-found' | 'server' | 'offline';

interface ErrorStateCopy {
  readonly code: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly subheading: string;
}

const ERROR_STATE_COPY: Record<ErrorState, ErrorStateCopy> = {
  'not-found': {
    code: '404',
    eyebrow: 'Page not found',
    heading: 'This page isn’t here.',
    subheading:
      'The page you’re looking for may have moved. Head back home, or send us your project brief — we’re happy to help you find what you need.',
  },
  server: {
    code: '500',
    eyebrow: 'Something broke',
    heading: 'Something went wrong on our end.',
    subheading:
      'We hit a snag loading this page. Try again in a moment, or reach us directly.',
  },
  offline: {
    code: 'Offline',
    eyebrow: 'No connection',
    heading: 'You’re offline.',
    subheading:
      'We can’t reach the site from this network right now. Check your connection and try again — we’ll be here.',
  },
};

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="amk-error-page" [attr.data-theme]="theme()">
      <section
        class="amk-error"
        [attr.aria-labelledby]="headingId"
      >
        <div class="page-container">
          <div class="amk-error__inner">
            <p class="amk-error__eyebrow">{{ copy().eyebrow }}</p>

            <div class="amk-error__code" aria-hidden="true">{{ copy().code }}</div>

            <h1 [id]="headingId" class="amk-error__heading">{{ copy().heading }}</h1>

            <p class="amk-error__sub" role="status">{{ copy().subheading }}</p>

            <div class="amk-error__rule" aria-hidden="true"></div>

            <div class="amk-error__actions">
              <a routerLink="/" class="amk-btn amk-btn--primary">Back to Home</a>
              <a routerLink="/enquire" class="amk-btn amk-btn--outline">Get a Free Quote</a>
            </div>

            <p class="amk-error__contact">
              Need us directly?
              <a href="mailto:diego@amarka.co" class="amk-error__contact-link">diego&#64;amarka.co</a>
            </p>
          </div>
        </div>
      </section>

      <section class="amk-error__continue" aria-label="Continue browsing">
        <div class="page-container">
          <p class="amk-error__continue-label">Continue to</p>
          <div class="amk-error__continue-grid">
            <a routerLink="/" class="amk-error__card">
              <span class="amk-error__card-title">Home</span>
              <span class="amk-error__card-desc">Corporate merchandise, engraving, and brand solutions.</span>
            </a>
            <a routerLink="/enquire" class="amk-error__card">
              <span class="amk-error__card-title">Get a Free Quote</span>
              <span class="amk-error__card-desc">Tell us what your brand needs and request a project quote.</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  `,
  styleUrl: './not-found.page.scss',
})
export class NotFoundPageComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly theme = inject(AmkThemeService).theme;

  /**
   * Resolved error state. Reads `data.errorState` from the activated route
   * configuration. Defaults to `'not-found'` for the wildcard/legacy /404
   * route so existing links keep working.
   */
  readonly state = signal<ErrorState>(this.resolveInitialState());

  readonly copy = computed<ErrorStateCopy>(() => ERROR_STATE_COPY[this.state()]);

  /**
   * Stable id for the h1, used so the wrapping section can reference it via
   * `aria-labelledby`. Declared on the class so it is deterministic between
   * SSR and client hydration.
   */
  readonly headingId = 'amk-error-heading';

  private resolveInitialState(): ErrorState {
    const fromData = this.route.snapshot.data?.['errorState'];
    if (fromData === 'server' || fromData === 'offline' || fromData === 'not-found') {
      return fromData;
    }
    return 'not-found';
  }
}
