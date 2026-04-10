import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnDestroy,
  OnInit,
  HostListener,
  signal,
  computed,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import {
  NavLink,
  NavCtaButton,
  MobileNavConfig,
  AMARKA_NAV_CONFIG,
} from './mobile-nav-drawer.model';

/**
 * AMK-65: Mobile Trade-Optimized Navigation Drawer
 *
 * Full-screen dark overlay drawer for mobile/tablet navigation.
 * Designed for trade professionals (interior designers, contractors)
 * who browse on tablets at job sites.
 *
 * Brand Bible compliance:
 * - Colors: exclusively --amarka-bg, --amarka-surface, --amarka-gold,
 *   --amarka-text, --amarka-text-secondary (all 6-token palette)
 * - CTAs follow Zone 3b: outlined ghost with --ts-accent (#C7683B),
 *   border-radius: 2px, fill-on-hover, translateY(-1px) lift
 * - Typography: Source Sans 3 for nav links (no serif on interactive elements)
 * - Gold used only as accent border on active link (Zone 1 compliant)
 * - WCAG: #f0f0f0 on #181818 = 16.16:1 AAA
 */
@Component({
  selector: 'app-mobile-nav-drawer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Backdrop overlay -->
    <div
      class="mobile-drawer-backdrop"
      [class.visible]="isOpen()"
      (click)="close()"
      aria-hidden="true"
    ></div>

    <!-- Drawer panel -->
    <nav
      class="mobile-drawer"
      [class.open]="isOpen()"
      role="navigation"
      [attr.aria-label]="'Mobile navigation menu'"
      [attr.aria-hidden]="!isOpen()"
    >
      <!-- Close button -->
      <button
        class="drawer-close"
        (click)="close()"
        aria-label="Close navigation menu"
        type="button"
      >
        ✕
      </button>

      <!-- Logo -->
      <div class="drawer-logo">
        <span class="drawer-logo-text">AMARKA</span>
      </div>

      <!-- Navigation links -->
      <ul class="drawer-nav-list" role="list">
        @for (link of config.links; track link.route; let i = $index) {
          <li
            role="listitem"
            class="drawer-nav-item"
            [style.transition-delay]="isOpen() ? (i * config.staggerDelayMs) + 'ms' : '0ms'"
            [class.stagger-in]="isOpen()"
          >
            <a
              class="nav-link"
              [routerLink]="link.route"
              [class.active]="currentRoute() === link.route"
              (click)="onNavClick()"
            >
              {{ link.label }}
            </a>
          </li>
        }
      </ul>

      <!-- CTA buttons (Zone 3b outlined) -->
      <div class="drawer-cta-group">
        @for (cta of config.ctaButtons; track cta.label) {
          <a
            class="drawer-cta"
            [routerLink]="cta.route"
            (click)="onNavClick()"
          >
            {{ cta.label }}
          </a>
        }
      </div>

      <!-- Footer contact -->
      <div class="drawer-footer">
        <span class="drawer-footer-text">
          Amarka · Stamford, CT · diego&#64;amarka.co
        </span>
      </div>
    </nav>
  `,
  styles: [
    `
      /* ===================================================
       * AMK-65: Mobile Navigation Drawer Styles
       * Brand Bible palette only — 6 approved colors
       * Zone 3b outlined CTAs with --ts-accent (#C7683B)
       * =================================================== */

      :host {
        /* Design tokens — all from Brand Bible approved palette */
        --amarka-bg: #181818;
        --amarka-surface: #484848;
        --amarka-gold: #906030;
        --amarka-text: #f0f0f0;
        --amarka-text-secondary: #c0c0c0;
        --amarka-text-muted: #909090;
        --ts-accent: #C7683B;

        /* Animation tokens (from AMK-53 micro-interaction system) */
        --amarka-duration-base: 250ms;
        --amarka-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
        --amarka-ease-in: cubic-bezier(0.7, 0, 0.84, 0);
        --amarka-lift-sm: translateY(-1px);
      }

      /* Backdrop overlay */
      .mobile-drawer-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(24, 24, 24, 0.6);
        z-index: 999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 200ms ease-out;
      }

      .mobile-drawer-backdrop.visible {
        opacity: 1;
        pointer-events: auto;
      }

      /* Drawer panel */
      .mobile-drawer {
        position: fixed;
        inset: 0;
        background: var(--amarka-bg);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        transform: translateX(100%);
        transition: transform 300ms var(--amarka-ease-out);
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .mobile-drawer.open {
        transform: translateX(0);
      }

      /* Close button — 48x48 tap target (WCAG 2.5.8) */
      .drawer-close {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: var(--amarka-text-secondary);
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        transition: color var(--amarka-duration-base) var(--amarka-ease-out);
        -webkit-tap-highlight-color: transparent;
      }

      .drawer-close:hover,
      .drawer-close:focus-visible {
        color: var(--amarka-text);
      }

      .drawer-close:focus-visible {
        outline: 2px solid var(--amarka-gold);
        outline-offset: 2px;
      }

      /* Logo */
      .drawer-logo {
        margin-bottom: 40px;
      }

      .drawer-logo-text {
        font-family: 'Playfair Display', serif;
        font-size: 28px;
        font-weight: 700;
        color: var(--amarka-text);
        letter-spacing: 0.15em;
      }

      /* Navigation list */
      .drawer-nav-list {
        list-style: none;
        padding: 0;
        margin: 0;
        width: 100%;
        max-width: 320px;
        text-align: center;
      }

      /* Staggered entrance animation */
      .drawer-nav-item {
        opacity: 0;
        transform: translateX(20px);
        transition:
          opacity 300ms var(--amarka-ease-out),
          transform 300ms var(--amarka-ease-out);
      }

      .drawer-nav-item.stagger-in {
        opacity: 1;
        transform: translateX(0);
      }

      /* Nav links — Source Sans 3, 600 weight, 20px */
      .nav-link {
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
        font-weight: 600;
        font-size: 20px;
        letter-spacing: 0.1em;
        color: var(--amarka-text);
        text-decoration: none;
        padding: 16px 24px;
        min-height: 48px; /* WCAG 2.5.8 touch target */
        border-bottom: 1px solid var(--amarka-surface);
        position: relative;
        transition: color var(--amarka-duration-base) var(--amarka-ease-out);
        -webkit-tap-highlight-color: transparent;
      }

      .nav-link:hover {
        color: var(--amarka-text);
      }

      .nav-link:focus-visible {
        outline: 2px solid var(--amarka-gold);
        outline-offset: 2px;
      }

      /* Active page indicator — gold left border accent */
      .nav-link.active {
        border-left: 4px solid var(--amarka-gold);
      }

      /* Zone 3b outlined CTAs */
      .drawer-cta-group {
        margin-top: 40px;
        width: 100%;
        max-width: 320px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .drawer-cta {
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
        font-weight: 600;
        font-size: 16px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        text-decoration: none;
        color: var(--ts-accent);
        background: transparent;
        border: 1px solid var(--ts-accent);
        border-radius: 2px; /* Sharp, premium — Brand Bible Zone 3b */
        padding: 14px 24px;
        min-height: 48px; /* WCAG 2.5.8 touch target */
        cursor: pointer;
        transition:
          background var(--amarka-duration-base) var(--amarka-ease-out),
          color var(--amarka-duration-base) var(--amarka-ease-out),
          transform var(--amarka-duration-base) var(--amarka-ease-out);
        -webkit-tap-highlight-color: transparent;
      }

      .drawer-cta:hover,
      .drawer-cta:active {
        background: var(--ts-accent);
        color: var(--amarka-text); /* #f0f0f0 on hover fill */
        transform: var(--amarka-lift-sm); /* translateY(-1px) */
      }

      .drawer-cta:focus-visible {
        outline: 2px solid var(--ts-accent);
        outline-offset: 2px;
      }

      /* Footer contact line */
      .drawer-footer {
        margin-top: auto;
        padding-top: 32px;
      }

      .drawer-footer-text {
        font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
        font-size: 13px;
        color: var(--amarka-text-muted);
        letter-spacing: 0.05em;
      }

      /* ===================================================
       * Reduced motion — WCAG compliance
       * =================================================== */
      @media (prefers-reduced-motion: reduce) {
        .mobile-drawer,
        .mobile-drawer-backdrop,
        .drawer-nav-item,
        .drawer-close,
        .nav-link,
        .drawer-cta {
          transition-duration: 0.01ms !important;
          animation-duration: 0.01ms !important;
        }

        .drawer-nav-item {
          opacity: 1;
          transform: none;
        }
      }

      /* ===================================================
       * Responsive — iPad landscape/portrait
       * Trade professionals use tablets at job sites
       * =================================================== */
      @media (min-width: 768px) {
        .nav-link {
          font-size: 24px;
          padding: 20px 32px;
        }

        .drawer-logo-text {
          font-size: 32px;
        }

        .drawer-cta {
          font-size: 18px;
          padding: 16px 32px;
        }
      }
    `,
  ],
})
export class MobileNavDrawerComponent implements OnInit, OnDestroy {
  /** Navigation configuration */
  @Input() config: MobileNavConfig = AMARKA_NAV_CONFIG;

  /** Emits when the drawer requests to be closed */
  @Output() drawerClose = new EventEmitter<void>();

  /** Open/closed state */
  readonly isOpen = signal(false);

  /** Current active route */
  readonly currentRoute = signal('/');

  private routerSub?: Subscription;
  private isBrowser: boolean;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Track current route for active link highlighting
    this.currentRoute.set(this.router.url.split('?')[0].split('#')[0]);
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        const navEnd = e as NavigationEnd;
        this.currentRoute.set(navEnd.urlAfterRedirects.split('?')[0].split('#')[0]);
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
  }

  /** Open the drawer */
  open(): void {
    this.isOpen.set(true);
    if (this.isBrowser) {
      document.body.style.overflow = 'hidden'; // Prevent body scroll
    }
  }

  /** Close the drawer */
  close(): void {
    this.isOpen.set(false);
    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
    this.drawerClose.emit();
  }

  /** Handle nav link click — close drawer after navigation */
  onNavClick(): void {
    this.close();
  }

  /** Close on Escape key */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen()) {
      this.close();
    }
  }
}
