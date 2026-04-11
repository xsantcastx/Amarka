/**
 * AMK-55: Premium Page Transition & Route Animation System
 *
 * Angular 18 standalone attribute directive that applies a subtle cross-fade
 * with vertical slide between router navigations. Hangs off Router events
 * (NavigationStart / NavigationEnd) and toggles two CSS classes on the host
 * element — all the motion is CSS-driven using the Amarka design tokens
 * shipped in src/styles.scss by AMK-62.
 *
 * Usage (app.html):
 *   <main amarkaPageTransition id="main-content" class="main-shell">
 *     <router-outlet />
 *   </main>
 *
 * Behavior:
 * - NavigationStart  → add .page-transition--exiting (opacity 0, translateY(-8px))
 * - NavigationEnd    → remove .page-transition--exiting, add .page-transition--entering
 *                      (opacity 0, translateY(8px)) then remove on next frame so
 *                      the transition plays from initial → settled.
 * - Navigation errors / cancellations → reset both classes so nothing stays stuck.
 *
 * Brand Bible compliance:
 * - Motion only — no color, typography, or layout changes.
 * - Uses --amarka-duration-base and --amarka-ease-out tokens from styles.scss.
 * - Background during transition stays var(--amarka-bg) (#181818) — no white flash.
 * - Navbar is a sibling of this host in app.html so it stays fixed and does not
 *   animate with the page content.
 * - prefers-reduced-motion fully respected (handled in the paired CSS block).
 * - SSR-safe via isPlatformBrowser guard.
 */
import {
  Directive,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Renderer2,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Event as RouterEvent,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { Subscription } from 'rxjs';

/** Host base class — resting state. */
export const PAGE_TRANSITION_HOST_CLASS = 'page-transition';

/** Applied during NavigationStart — old page fades and lifts away. */
export const PAGE_TRANSITION_EXITING_CLASS = 'page-transition--exiting';

/** Applied at NavigationEnd (for one frame) — new page enters from below. */
export const PAGE_TRANSITION_ENTERING_CLASS = 'page-transition--entering';

@Directive({
  selector: '[amarkaPageTransition]',
  standalone: true,
})
export class PageTransitionDirective implements OnInit, OnDestroy {
  private readonly isBrowser: boolean;
  private routerSub: Subscription | null = null;

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    private readonly router: Router,
    private readonly ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Always tag the host so CSS can render the resting state.
    this.renderer.addClass(this.el.nativeElement, PAGE_TRANSITION_HOST_CLASS);

    // SSR → leave the host in its resting state, never subscribe.
    if (!this.isBrowser) {
      return;
    }

    // Run router subscription outside NgZone — class toggles are DOM-only,
    // they must not trigger unnecessary change detection.
    this.ngZone.runOutsideAngular(() => {
      this.routerSub = this.router.events.subscribe((event: RouterEvent) =>
        this.onRouterEvent(event),
      );
    });
  }

  ngOnDestroy(): void {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
      this.routerSub = null;
    }
  }

  private onRouterEvent(event: RouterEvent): void {
    if (event instanceof NavigationStart) {
      this.beginExit();
      return;
    }

    if (event instanceof NavigationEnd) {
      this.completeEnter();
      return;
    }

    if (event instanceof NavigationCancel || event instanceof NavigationError) {
      this.reset();
    }
  }

  /** Phase 1 — outgoing page fades out with a small upward lift. */
  private beginExit(): void {
    const host = this.el.nativeElement;
    this.renderer.removeClass(host, PAGE_TRANSITION_ENTERING_CLASS);
    this.renderer.addClass(host, PAGE_TRANSITION_EXITING_CLASS);
  }

  /**
   * Phase 2 — incoming page starts from below with zero opacity, then settles
   * on the next animation frame so the browser actually runs the transition.
   */
  private completeEnter(): void {
    const host = this.el.nativeElement;

    // Drop the exit class immediately so the host can accept the enter state.
    this.renderer.removeClass(host, PAGE_TRANSITION_EXITING_CLASS);
    // Prime the enter state (opacity 0, translateY(8px)).
    this.renderer.addClass(host, PAGE_TRANSITION_ENTERING_CLASS);

    const raf =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb: () => void) => setTimeout(cb, 0);

    // Two nested rAFs guarantee the browser has committed the initial state
    // to the style system before we remove the class and trigger the settle
    // transition. A single rAF can coalesce with the style write on some
    // engines and skip the transition entirely.
    raf(() => {
      raf(() => {
        this.renderer.removeClass(host, PAGE_TRANSITION_ENTERING_CLASS);
      });
    });
  }

  /** Safety net for cancelled / errored navigations. */
  private reset(): void {
    const host = this.el.nativeElement;
    this.renderer.removeClass(host, PAGE_TRANSITION_EXITING_CLASS);
    this.renderer.removeClass(host, PAGE_TRANSITION_ENTERING_CLASS);
  }
}
