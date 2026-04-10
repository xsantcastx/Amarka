import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ElementRef,
  NgZone,
  Inject,
  PLATFORM_ID,
  Renderer2,
  ChangeDetectorRef,
} from '@angular/core';
import { isPlatformBrowser, NgIf, NgFor } from '@angular/common';
import {
  ResponsiveImageSource,
  ArtDirectionBreakpoint,
  DEFAULT_BREAKPOINTS,
} from './progressive-image.model';

/**
 * AMK-57: Progressive Image Component
 *
 * Implements the blur-up progressive loading pattern:
 * 1. Reserve exact aspect ratio space (no CLS)
 * 2. Show tiny blurred LQIP placeholder on --amarka-bg
 * 3. Load full-resolution image (WebP with JPEG fallback)
 * 4. Cross-fade from blur to sharp over 400ms
 * 5. Subtle scale(1.02) -> scale(1.0) settle on reveal
 *
 * Brand Bible Compliance:
 * - Placeholder bg: #181818 (--amarka-bg) only
 * - Optional border: #484848 (--amarka-surface) — no gold
 * - No gold in any loading state
 * - prefers-reduced-motion: instant swap, no animation
 * - SSR-safe via isPlatformBrowser guard
 *
 * Usage:
 *   <amarka-progressive-image
 *     [source]="{ basePath: '/assets/images/hero', alt: 'Lobby signage', width: 1200, height: 675 }"
 *     [aboveFold]="true"
 *   ></amarka-progressive-image>
 */
@Component({
  selector: 'amarka-progressive-image',
  standalone: true,
  imports: [NgIf, NgFor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="progressive-image-wrapper"
      [class]="wrapperClass"
      [style.aspect-ratio]="currentAspectRatio"
      role="img"
      [attr.aria-label]="source.alt"
    >
      <!-- LQIP placeholder layer -->
      <div
        class="progressive-image-placeholder"
        [class.has-border]="showPlaceholderBorder"
        [class.loaded]="imageLoaded"
      >
        <img
          *ngIf="source.lqip"
          [src]="source.lqip"
          alt=""
          aria-hidden="true"
          class="progressive-image-lqip"
        />
      </div>

      <!-- Full-resolution image with <picture> for art direction -->
      <picture>
        <!-- WebP sources per breakpoint (desktop-first) -->
        <source
          *ngFor="let bp of breakpoints"
          [attr.media]="bp.minWidth > 0 ? '(min-width: ' + bp.minWidth + 'px)' : undefined"
          [attr.srcset]="buildSrcset(bp.widths, 'webp')"
          [attr.sizes]="bp.sizes"
          type="image/webp"
        />
        <!-- JPEG fallback sources per breakpoint -->
        <source
          *ngFor="let bp of breakpoints"
          [attr.media]="bp.minWidth > 0 ? '(min-width: ' + bp.minWidth + 'px)' : undefined"
          [attr.srcset]="buildSrcset(bp.widths, 'jpg')"
          [attr.sizes]="bp.sizes"
          type="image/jpeg"
        />
        <!-- Fallback <img> -->
        <img
          [src]="source.basePath + '-800w.jpg'"
          [alt]="source.alt"
          [width]="source.width"
          [height]="source.height"
          [attr.loading]="aboveFold ? 'eager' : 'lazy'"
          [attr.fetchpriority]="aboveFold ? 'high' : 'auto'"
          [attr.decoding]="aboveFold ? 'sync' : 'async'"
          class="progressive-image-full"
          [class.loaded]="imageLoaded"
          (load)="onImageLoad()"
          (error)="onImageError()"
        />
      </picture>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .progressive-image-wrapper {
      position: relative;
      overflow: hidden;
      background-color: var(--amarka-bg, #181818);
      width: 100%;
    }

    /* Placeholder layer */
    .progressive-image-placeholder {
      position: absolute;
      inset: 0;
      background-color: var(--amarka-bg, #181818);
      z-index: 1;
      transition: opacity 400ms ease-out;
    }

    .progressive-image-placeholder.has-border {
      border: 1px solid var(--amarka-surface, #484848);
    }

    .progressive-image-placeholder.loaded {
      opacity: 0;
      pointer-events: none;
    }

    /* LQIP blurred thumbnail */
    .progressive-image-lqip {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: blur(20px);
      transform: scale(1.1); /* Prevent blur edges from showing */
    }

    /* Full resolution image */
    .progressive-image-full {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transform: scale(1.02);
      transition:
        opacity 400ms ease-out,
        transform 400ms ease-out;
    }

    .progressive-image-full.loaded {
      opacity: 1;
      transform: scale(1.0);
    }

    /* Reduced motion: instant swap, no animation */
    @media (prefers-reduced-motion: reduce) {
      .progressive-image-placeholder {
        transition-duration: 0.01ms;
      }
      .progressive-image-full {
        transition-duration: 0.01ms;
      }
    }
  `],
})
export class ProgressiveImageComponent implements OnInit, OnDestroy {
  /** Image source configuration (required). */
  @Input() source!: ResponsiveImageSource;

  /** Art direction breakpoints. Defaults to AMK-57 standard breakpoints. */
  @Input() breakpoints: ArtDirectionBreakpoint[] = DEFAULT_BREAKPOINTS;

  /** Whether this image is above the fold. Default: false. */
  @Input() aboveFold = false;

  /** Optional wrapper CSS class. */
  @Input() wrapperClass = '';

  /** Show subtle surface-color border on placeholder. Default: false. */
  @Input() showPlaceholderBorder = false;

  /** Current aspect ratio for the container (responsive). */
  currentAspectRatio = '16/9';

  /** Whether the full image has finished loading. */
  imageLoaded = false;

  private isBrowser: boolean;
  private resizeCleanup: (() => void) | null = null;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private ngZone: NgZone,
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.updateAspectRatio();

    if (this.isBrowser && this.aboveFold) {
      this.injectPreloadLink();
    }

    // Listen for viewport changes to update aspect ratio (art direction)
    if (this.isBrowser && this.breakpoints.length > 1) {
      this.ngZone.runOutsideAngular(() => {
        const handler = () => {
          const newRatio = this.getAspectRatioForViewport();
          if (newRatio !== this.currentAspectRatio) {
            this.currentAspectRatio = newRatio;
            this.cdr.detectChanges();
          }
        };

        window.addEventListener('resize', handler, { passive: true });
        this.resizeCleanup = () => window.removeEventListener('resize', handler);
      });
    }
  }

  ngOnDestroy(): void {
    if (this.resizeCleanup) {
      this.resizeCleanup();
      this.resizeCleanup = null;
    }
  }

  /** Build srcset string for given widths and format. */
  buildSrcset(widths: number[], format: string): string {
    return widths
      .map((w) => `${this.source.basePath}-${w}w.${format} ${w}w`)
      .join(', ');
  }

  /** Handle successful image load. */
  onImageLoad(): void {
    this.imageLoaded = true;
    this.cdr.detectChanges();
  }

  /** Handle image load error — still reveal to avoid stuck placeholder. */
  onImageError(): void {
    this.imageLoaded = true;
    this.cdr.detectChanges();
  }

  /** Determine aspect ratio based on current viewport width. */
  private getAspectRatioForViewport(): string {
    if (!this.isBrowser) {
      return this.breakpoints[0]?.aspectRatio ?? '16/9';
    }

    const vw = window.innerWidth;
    // Breakpoints are desktop-first (largest minWidth first)
    for (const bp of this.breakpoints) {
      if (vw >= bp.minWidth) {
        return bp.aspectRatio;
      }
    }
    return this.breakpoints[this.breakpoints.length - 1]?.aspectRatio ?? '16/9';
  }

  /** Update the container aspect ratio. */
  private updateAspectRatio(): void {
    this.currentAspectRatio = this.getAspectRatioForViewport();
  }

  /**
   * Inject <link rel="preload"> for above-fold hero images.
   * This ensures the browser starts fetching the hero image ASAP,
   * before it parses the component template.
   */
  private injectPreloadLink(): void {
    if (!this.isBrowser) return;

    const doc = this.elementRef.nativeElement.ownerDocument;
    if (!doc?.head) return;

    // Preload the largest WebP source
    const largestWidth = Math.max(
      ...this.breakpoints.flatMap((bp) => bp.widths)
    );
    const preloadHref = `${this.source.basePath}-${largestWidth}w.webp`;

    // Avoid duplicate preload links
    const existing = doc.head.querySelector(
      `link[rel="preload"][href="${preloadHref}"]`
    );
    if (existing) return;

    const link = this.renderer.createElement('link');
    this.renderer.setAttribute(link, 'rel', 'preload');
    this.renderer.setAttribute(link, 'as', 'image');
    this.renderer.setAttribute(link, 'href', preloadHref);
    this.renderer.setAttribute(link, 'type', 'image/webp');
    this.renderer.appendChild(doc.head, link);
  }
}
