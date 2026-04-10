/**
 * AMK-63: Scroll-Aware Smart Sticky Navigation
 *
 * Angular directive that adds scroll-aware compact/expanded behavior
 * to the existing navbar component. Applies 'scrolled' CSS class
 * when the user scrolls past the configured threshold.
 *
 * Brand Bible compliance:
 * - Gold (#906030) bottom border on scroll — decorative accent, Zone 1 compliant
 * - Only approved palette colors via CSS custom properties
 * - prefers-reduced-motion fully respected (instant state swap, no transition)
 * - No new colors, no hardcoded hex outside the design system
 */
import {
  Directive,
  ElementRef,
  Inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Renderer2,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  DEFAULT_STICKY_NAV_CONFIG,
  StickyNavConfig,
} from './smart-sticky-nav.model';

@Directive({
  selector: '[amarkaSmartStickyNav]',
  standalone: true,
})
export class SmartStickyNavDirective implements OnInit, OnDestroy {
  /**
   * Optional override for the scroll threshold (default: 80px).
   * Usage: <nav amarkaSmartStickyNav [stickyNavThreshold]="100">
   */
  @Input() stickyNavThreshold?: number;

  private config: StickyNavConfig = { ...DEFAULT_STICKY_NAV_CONFIG };
  private scrollListener: (() => void) | null = null;
  private resizeListener: (() => void) | null = null;
  private rafId: number | null = null;
  private isScrolled = false;
  private isMobile = false;
  private isBrowser: boolean;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    // Apply threshold override if provided
    if (this.stickyNavThreshold != null) {
      this.config.scrollThreshold = this.stickyNavThreshold;
    }

    // Add the base CSS class for the directive
    this.renderer.addClass(this.el.nativeElement, 'amarka-sticky-nav');

    // Check initial viewport size
    this.checkMobileState();

    // Check initial scroll position (page may be scrolled on load / back-nav)
    this.checkScrollState();

    // Run scroll & resize listeners outside Angular zone for performance
    this.ngZone.runOutsideAngular(() => {
      this.scrollListener = this.renderer.listen(
        'window',
        'scroll',
        () => this.onScroll(),
      );
      this.resizeListener = this.renderer.listen(
        'window',
        'resize',
        () => this.onResize(),
      );
    });
  }

  ngOnDestroy(): void {
    if (this.scrollListener) {
      this.scrollListener();
      this.scrollListener = null;
    }
    if (this.resizeListener) {
      this.resizeListener();
      this.resizeListener = null;
    }
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** Throttle scroll handling with requestAnimationFrame */
  private onScroll(): void {
    if (this.rafId != null) {
      return; // Already scheduled
    }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.checkScrollState();
    });
  }

  /** Re-check mobile state on resize (debounce not needed — rAF is cheap) */
  private onResize(): void {
    this.checkMobileState();
    this.checkScrollState();
  }

  /** Determine whether to show the compact (scrolled) state */
  private checkScrollState(): void {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const shouldBeScrolled =
      this.isMobile || scrollY > this.config.scrollThreshold;

    if (shouldBeScrolled !== this.isScrolled) {
      this.isScrolled = shouldBeScrolled;
      if (this.isScrolled) {
        this.renderer.addClass(this.el.nativeElement, 'scrolled');
      } else {
        this.renderer.removeClass(this.el.nativeElement, 'scrolled');
      }
    }
  }

  /** Check if viewport is below mobile breakpoint */
  private checkMobileState(): void {
    if (!this.config.compactOnMobile) {
      return;
    }
    this.isMobile = window.innerWidth < this.config.mobileBreakpoint;
  }
}
