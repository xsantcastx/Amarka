import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

/**
 * AMK-51 — Branded 404 & Error State Pages
 *
 * A single premium error page component that renders 1 of 3 states based on
 * the route data resolved for the activated route:
 *
 *   /404       → errorState: 'not-found'   (default wildcard)
 *   /500       → errorState: 'server'
 *   /offline   → errorState: 'offline'
 *
 * Copy, CTAs, and aria live region adapt per state. All typography and color
 * choices lock to the Amarka Brand Bible palette — only 6 approved tokens:
 *   --amarka-bg / --amarka-surface / --amarka-gold /
 *   --amarka-text / --amarka-text-secondary / --amarka-text-muted
 *
 * Typography: Playfair Display for the large state code + state heading,
 * Source Sans 3 for body copy + CTAs (which re-use the global .btn-primary
 * / .btn-outline classes already lined up to Brand Bible specs).
 *
 * Accessibility:
 *   - role="main" implied by parent <main>; section uses aria-labelledby
 *   - Large state code is aria-hidden (decorative)
 *   - Subheading has role="status" so screen readers announce the state
 *   - prefers-reduced-motion honored via external SCSS
 *   - WCAG 2.4.7 focus states inherited from global button classes
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
    heading: 'This piece isn’t in the studio.',
    subheading:
      'The page you’re looking for may have moved or been archived. Head back to the studio, or start a new commission — we’re happy to help you find what you need.',
  },
  server: {
    code: '500',
    eyebrow: 'Studio error',
    heading: 'Something went wrong on our end.',
    subheading:
      'The studio hit a snag loading this page. Try again in a moment, or reach us directly — we respond within one business day.',
  },
  offline: {
    code: 'Offline',
    eyebrow: 'No connection',
    heading: 'You’re offline.',
    subheading:
      'We can’t reach the studio from this network right now. Check your connection and try again — we’ll be here.',
  },
};

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
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
            <a routerLink="/" class="btn-primary">Back to Home</a>
            <a routerLink="/enquire" class="btn-outline">Request a Quote</a>
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
            <span class="amk-error__card-desc">Recent commissions, services, and studio overview.</span>
          </a>
          <a routerLink="/services" class="amk-error__card">
            <span class="amk-error__card-title">Services</span>
            <span class="amk-error__card-desc">Architectural signage, hospitality fitout, trade supply, and awards.</span>
          </a>
          <a routerLink="/trade" class="amk-error__card">
            <span class="amk-error__card-title">Trade</span>
            <span class="amk-error__card-desc">Apply for a trade account and download the studio spec sheet.</span>
          </a>
          <a routerLink="/work" class="amk-error__card">
            <span class="amk-error__card-title">Work</span>
            <span class="amk-error__card-desc">Browse recently completed studio commissions.</span>
          </a>
        </div>
      </div>
    </section>
  `,
  styleUrl: './not-found.page.scss',
})
export class NotFoundPageComponent {
  private readonly route = inject(ActivatedRoute);

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
