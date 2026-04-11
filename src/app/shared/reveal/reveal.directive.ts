/**
 * AMK-62: Scroll-Triggered Section Reveal System
 *
 * Angular 18 standalone directive that animates elements into view on scroll
 * using the native IntersectionObserver API (no libraries, GPU-composited
 * opacity + transform).
 *
 * Usage:
 *   <section amarkaReveal>…</section>
 *   <div amarkaReveal [revealThreshold]="0.25">…</div>
 *   <div amarkaRevealStagger><div amarkaReveal>…</div><div amarkaReveal>…</div></div>
 *
 * Brand Bible compliance:
 * - Purely motion — touches no colors or typography
 * - Uses --amarka-ease-out / --amarka-duration-base design tokens (styles.scss)
 * - prefers-reduced-motion fully respected (instant, no translate)
 * - SSR-safe (isPlatformBrowser guard)
 * - Zero JavaScript animation; CSS transitions only
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

/** Default intersection threshold — fires when 15% of the element is visible. */
export const DEFAULT_REVEAL_THRESHOLD = 0.15;

/** Default root margin — fire a touch early so content feels present on scroll. */
export const DEFAULT_REVEAL_ROOT_MARGIN = '0px 0px -5% 0px';

@Directive({
  selector: '[amarkaReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  /** Optional: override the intersection threshold (0–1). */
  @Input() revealThreshold?: number;

  /** Optional: disable the reveal (for elements already above the fold). */
  @Input() revealDisabled = false;

  private observer: IntersectionObserver | null = null;
  private readonly isBrowser: boolean;

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    private readonly ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Always tag the element so CSS can render the initial resting state.
    this.renderer.addClass(this.el.nativeElement, 'reveal');

    // SSR, disabled, or reduced-motion → mark revealed immediately.
    if (!this.isBrowser || this.revealDisabled) {
      this.markRevealed();
      return;
    }

    // Respect user OS motion preferences — no animation at all.
    if (this.prefersReducedMotion()) {
      this.markRevealed();
      return;
    }

    // IntersectionObserver missing on very old browsers → graceful fallback.
    if (typeof IntersectionObserver === 'undefined') {
      this.markRevealed();
      return;
    }

    const threshold =
      this.revealThreshold != null
        ? this.clampThreshold(this.revealThreshold)
        : DEFAULT_REVEAL_THRESHOLD;

    // Run observer outside Angular to avoid change detection on every scroll.
    this.ngZone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => this.handleIntersect(entries),
        { threshold, rootMargin: DEFAULT_REVEAL_ROOT_MARGIN },
      );
      this.observer.observe(this.el.nativeElement);
    });
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /** Observer callback — reveal on first entry, then disconnect (fire-once). */
  private handleIntersect(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        this.markRevealed();
        // One-shot: once revealed, stop observing.
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
        break;
      }
    }
  }

  /** Apply the revealed class + drop will-change for GC. */
  private markRevealed(): void {
    this.renderer.addClass(this.el.nativeElement, 'revealed');
  }

  /** Detect prefers-reduced-motion safely. */
  private prefersReducedMotion(): boolean {
    if (!this.isBrowser || typeof window.matchMedia !== 'function') {
      return false;
    }
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  /** Clamp threshold input into the [0, 1] range IntersectionObserver requires. */
  private clampThreshold(value: number): number {
    if (Number.isNaN(value)) {
      return DEFAULT_REVEAL_THRESHOLD;
    }
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }
}

/**
 * Marker directive for a stagger wrapper. Adds the `reveal-stagger` class so
 * nested [amarkaReveal] children pick up the staggered transition-delay rules
 * defined in styles.scss.
 */
@Directive({
  selector: '[amarkaRevealStagger]',
  standalone: true,
})
export class RevealStaggerDirective implements OnInit {
  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  ngOnInit(): void {
    this.renderer.addClass(this.el.nativeElement, 'reveal-stagger');
  }
}
