/**
 * AMK-64: Skeleton Loading States
 *
 * Premium placeholder shimmer system for content-heavy pages.
 * Provides reusable skeleton components that display branded loading
 * placeholders while real content loads.
 *
 * Brand Bible compliance:
 * - Skeleton base: --amarka-surface (#484848)
 * - Shimmer highlight: subtle rgba(255,255,255,0.04) sweep — NOT a new color
 * - Background: --amarka-bg (#181818)
 * - No gold in skeleton states — gold is reserved for interactive/accent elements
 * - No text content in skeletons
 * - prefers-reduced-motion fully respected (no shimmer animation)
 * - SSR-safe (isPlatformBrowser guard)
 *
 * Usage:
 *   <amarka-skeleton type="text" [lines]="3"></amarka-skeleton>
 *   <amarka-skeleton type="image" [aspectRatio]="'16/9'"></amarka-skeleton>
 *   <amarka-skeleton type="card"></amarka-skeleton>
 *   <amarka-skeleton type="card-grid" [columns]="3" [count]="6"></amarka-skeleton>
 *   <amarka-skeleton type="form" [fields]="4"></amarka-skeleton>
 */
import {
  Component,
  Input,
  ChangeDetectionStrategy,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

/** Supported skeleton layout types */
export type SkeletonType =
  | 'text'
  | 'image'
  | 'card'
  | 'card-grid'
  | 'form'
  | 'detail';

/** Configuration defaults */
export const SKELETON_DEFAULTS = {
  lines: 3,
  columns: 3,
  count: 6,
  fields: 4,
  aspectRatio: '16/9',
  animationDuration: '1.8s',
} as const;

@Component({
  selector: 'amarka-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Text skeleton: variable-width lines -->
    <ng-container *ngIf="type === 'text'">
      <div class="skeleton-text" [attr.aria-label]="'Loading content'" role="status">
        <span class="sr-only">Loading...</span>
        <div
          *ngFor="let width of lineWidths"
          class="skeleton skeleton--line"
          [style.width]="width"
        ></div>
      </div>
    </ng-container>

    <!-- Image skeleton: aspect-ratio placeholder -->
    <ng-container *ngIf="type === 'image'">
      <div
        class="skeleton skeleton--image"
        [style.aspect-ratio]="aspectRatio"
        [attr.aria-label]="'Loading image'"
        role="status"
      >
        <span class="sr-only">Loading...</span>
      </div>
    </ng-container>

    <!-- Single card skeleton -->
    <ng-container *ngIf="type === 'card'">
      <div class="skeleton-card" [attr.aria-label]="'Loading card'" role="status">
        <span class="sr-only">Loading...</span>
        <div class="skeleton skeleton--card-image" style="aspect-ratio: 16/9"></div>
        <div class="skeleton-card__body">
          <div class="skeleton skeleton--line skeleton--line-title"></div>
          <div class="skeleton skeleton--line skeleton--line-short"></div>
          <div class="skeleton-card__tags">
            <div class="skeleton skeleton--pill"></div>
            <div class="skeleton skeleton--pill"></div>
          </div>
        </div>
      </div>
    </ng-container>

    <!-- Card grid skeleton -->
    <ng-container *ngIf="type === 'card-grid'">
      <div
        class="skeleton-grid"
        [style.--skeleton-columns]="columns"
        [attr.aria-label]="'Loading content grid'"
        role="status"
      >
        <span class="sr-only">Loading...</span>
        <div
          *ngFor="let i of gridItems; let idx = index"
          class="skeleton-card skeleton-card--staggered"
          [style.animation-delay]="isBrowser ? (idx * 50) + 'ms' : '0ms'"
        >
          <div class="skeleton skeleton--card-image" style="aspect-ratio: 16/9"></div>
          <div class="skeleton-card__body">
            <div class="skeleton skeleton--line skeleton--line-title"></div>
            <div class="skeleton skeleton--line skeleton--line-short"></div>
            <div class="skeleton-card__tags">
              <div class="skeleton skeleton--pill"></div>
              <div class="skeleton skeleton--pill"></div>
            </div>
          </div>
        </div>
      </div>
    </ng-container>

    <!-- Form skeleton -->
    <ng-container *ngIf="type === 'form'">
      <div class="skeleton-form" [attr.aria-label]="'Loading form'" role="status">
        <span class="sr-only">Loading...</span>
        <div
          *ngFor="let i of formFields; let idx = index"
          class="skeleton-form__field"
          [style.animation-delay]="isBrowser ? (idx * 50) + 'ms' : '0ms'"
        >
          <div class="skeleton skeleton--line skeleton--label"></div>
          <div class="skeleton skeleton--input"></div>
        </div>
        <div class="skeleton skeleton--button"></div>
      </div>
    </ng-container>

    <!-- Product detail skeleton -->
    <ng-container *ngIf="type === 'detail'">
      <div class="skeleton-detail" [attr.aria-label]="'Loading product details'" role="status">
        <span class="sr-only">Loading...</span>
        <div class="skeleton-detail__image">
          <div class="skeleton skeleton--image" style="aspect-ratio: 1/1"></div>
        </div>
        <div class="skeleton-detail__content">
          <div class="skeleton skeleton--line skeleton--line-title" style="width: 75%"></div>
          <div class="skeleton skeleton--line" style="width: 100%"></div>
          <div class="skeleton skeleton--line" style="width: 90%"></div>
          <div class="skeleton skeleton--line" style="width: 60%"></div>
          <div class="skeleton skeleton--button" style="margin-top: 24px"></div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    /* =========================================================
     * AMK-64: Skeleton Loading System
     * Brand Bible palette only:
     *   --amarka-bg:      #181818
     *   --amarka-surface:  #484848
     * Shimmer: rgba(255,255,255,0.04) — subtle tint of surface
     * ========================================================= */

    :host {
      display: block;
    }

    /* Screen-reader only utility */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    /* Base skeleton element */
    .skeleton {
      background: var(--amarka-surface, #484848);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    /* Shimmer sweep — subtle, 1.8s feels calm and premium */
    .skeleton::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.04) 50%,
        transparent 100%
      );
      animation: amarka-shimmer 1.8s ease-in-out infinite;
    }

    @keyframes amarka-shimmer {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    /* Respect prefers-reduced-motion */
    @media (prefers-reduced-motion: reduce) {
      .skeleton::after {
        animation: none;
      }
    }

    /* ---- Text skeleton ---- */
    .skeleton-text {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .skeleton--line {
      height: 14px;
      width: 100%;
    }

    .skeleton--line-title {
      height: 20px;
      width: 65%;
    }

    .skeleton--line-short {
      width: 45%;
    }

    /* ---- Image skeleton ---- */
    .skeleton--image {
      width: 100%;
    }

    /* ---- Card skeleton ---- */
    .skeleton-card {
      background: var(--amarka-surface, #484848);
      border-radius: 4px;
      overflow: hidden;
    }

    .skeleton--card-image {
      width: 100%;
      border-radius: 0;
    }

    .skeleton-card__body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .skeleton-card__tags {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }

    .skeleton--pill {
      height: 22px;
      width: 60px;
      border-radius: 11px;
      background: var(--amarka-bg, #181818);
    }

    .skeleton--pill::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.04) 50%,
        transparent 100%
      );
      animation: amarka-shimmer 1.8s ease-in-out infinite;
    }

    /* ---- Card grid skeleton ---- */
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(var(--skeleton-columns, 3), 1fr);
      gap: 24px;
    }

    @media (max-width: 1024px) {
      .skeleton-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .skeleton-grid {
        grid-template-columns: 1fr;
      }
    }

    .skeleton-card--staggered {
      animation: amarka-skeleton-fade-in 0.3s ease-out both;
    }

    @keyframes amarka-skeleton-fade-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .skeleton-card--staggered {
        animation: none;
        opacity: 1;
        transform: none;
      }
    }

    /* ---- Form skeleton ---- */
    .skeleton-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 480px;
    }

    .skeleton-form__field {
      display: flex;
      flex-direction: column;
      gap: 8px;
      animation: amarka-skeleton-fade-in 0.3s ease-out both;
    }

    .skeleton--label {
      height: 12px;
      width: 120px;
    }

    .skeleton--input {
      height: 44px;
      border-radius: 4px;
      background: var(--amarka-surface, #484848);
      position: relative;
      overflow: hidden;
    }

    .skeleton--input::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.04) 50%,
        transparent 100%
      );
      animation: amarka-shimmer 1.8s ease-in-out infinite;
    }

    .skeleton--button {
      height: 48px;
      width: 180px;
      border-radius: 2px;
      background: var(--amarka-surface, #484848);
      position: relative;
      overflow: hidden;
    }

    .skeleton--button::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.04) 50%,
        transparent 100%
      );
      animation: amarka-shimmer 1.8s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .skeleton--input::after,
      .skeleton--button::after,
      .skeleton--pill::after {
        animation: none;
      }
      .skeleton-form__field {
        animation: none;
        opacity: 1;
        transform: none;
      }
    }

    /* ---- Product detail skeleton ---- */
    .skeleton-detail {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      align-items: start;
    }

    @media (max-width: 768px) {
      .skeleton-detail {
        grid-template-columns: 1fr;
      }
    }

    .skeleton-detail__content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
  `],
})
export class SkeletonLoaderComponent implements OnInit {
  /** Skeleton layout type */
  @Input() type: SkeletonType = 'text';

  /** Number of text lines (type='text') */
  @Input() lines: number = SKELETON_DEFAULTS.lines;

  /** Grid columns (type='card-grid') */
  @Input() columns: number = SKELETON_DEFAULTS.columns;

  /** Number of cards (type='card-grid') */
  @Input() count: number = SKELETON_DEFAULTS.count;

  /** Number of form fields (type='form') */
  @Input() fields: number = SKELETON_DEFAULTS.fields;

  /** Aspect ratio for image skeletons (type='image') */
  @Input() aspectRatio: string = SKELETON_DEFAULTS.aspectRatio;

  /** Pre-computed arrays for *ngFor */
  lineWidths: string[] = [];
  gridItems: number[] = [];
  formFields: number[] = [];
  isBrowser = false;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Build varied line widths for natural text appearance
    const widthPresets = ['100%', '92%', '85%', '60%', '78%', '95%', '70%'];
    this.lineWidths = Array.from({ length: this.lines }, (_, i) =>
      i === 0 ? '65%' : widthPresets[i % widthPresets.length]
    );

    this.gridItems = Array.from({ length: this.count }, (_, i) => i);
    this.formFields = Array.from({ length: this.fields }, (_, i) => i);
  }
}
