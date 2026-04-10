import {
  Component,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ProgressiveImageComponent } from './progressive-image.component';
import { ResponsiveImageSource, ArtDirectionBreakpoint } from './progressive-image.model';

/**
 * AMK-57: Image Card Grid Component
 *
 * Renders a responsive grid of progressive images on #484848 surface cards.
 * Designed for portfolio pages, product grids, and gallery sections.
 *
 * Grid layout:
 * - Desktop (1200px+): 3 columns
 * - Tablet (768-1199px): 2 columns
 * - Mobile (<768px): 1 column
 *
 * Brand Bible Compliance:
 * - Cards use --amarka-surface (#484848)
 * - Text: --amarka-text (#f0f0f0) for titles
 * - Text: --amarka-text-secondary (#c0c0c0) for descriptions
 * - Gold used only as hover border accent (Zone 2 compliant)
 * - No gold text on surface cards
 * - prefers-reduced-motion respected
 */

export interface ImageCardData {
  source: ResponsiveImageSource;
  title: string;
  description?: string;
  href?: string;
}

/** Card grid breakpoints (tighter crops for cards). */
const CARD_BREAKPOINTS: ArtDirectionBreakpoint[] = [
  {
    minWidth: 1200,
    aspectRatio: '16/9',
    widths: [400],
    sizes: '(min-width: 1200px) 400px',
  },
  {
    minWidth: 768,
    aspectRatio: '16/10',
    widths: [400],
    sizes: '(min-width: 768px) 350px',
  },
  {
    minWidth: 0,
    aspectRatio: '4/3',
    widths: [400, 800],
    sizes: '100vw',
  },
];

@Component({
  selector: 'amarka-image-card-grid',
  standalone: true,
  imports: [NgFor, NgIf, ProgressiveImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="image-card-grid" role="list" [attr.aria-label]="gridLabel">
      <div
        *ngFor="let card of cards; trackBy: trackByTitle"
        class="image-card"
        role="listitem"
        tabindex="0"
      >
        <amarka-progressive-image
          [source]="card.source"
          [breakpoints]="cardBreakpoints"
          [aboveFold]="false"
          [showPlaceholderBorder]="true"
        ></amarka-progressive-image>
        <div class="image-card-content">
          <h3 class="image-card-title">{{ card.title }}</h3>
          <p *ngIf="card.description" class="image-card-description">
            {{ card.description }}
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .image-card-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      padding: 0;
      margin: 0;
      list-style: none;
    }

    /* Tablet: 2 columns */
    @media (max-width: 1199px) {
      .image-card-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
      }
    }

    /* Mobile: 1 column */
    @media (max-width: 767px) {
      .image-card-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }

    .image-card {
      background-color: var(--amarka-surface, #484848);
      border-radius: 2px;
      overflow: hidden;
      border: 1px solid transparent;
      transition:
        border-color 250ms ease-out,
        transform 250ms ease-out,
        box-shadow 250ms ease-out;
    }

    .image-card:hover {
      border-color: var(--amarka-gold, #906030);
      transform: translateY(-2px) scale(1.01);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .image-card:focus-visible {
      outline: 2px solid var(--amarka-gold, #906030);
      outline-offset: 2px;
    }

    .image-card-content {
      padding: 16px;
    }

    .image-card-title {
      font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
      font-weight: 600;
      font-size: 16px;
      color: var(--amarka-text, #f0f0f0);
      margin: 0 0 4px 0;
      line-height: 1.3;
    }

    .image-card-description {
      font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
      font-weight: 400;
      font-size: 14px;
      color: var(--amarka-text-secondary, #c0c0c0);
      margin: 0;
      line-height: 1.5;
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .image-card {
        transition-duration: 0.01ms;
      }
    }
  `],
})
export class ImageCardGridComponent {
  /** Array of image cards to display. */
  @Input() cards: ImageCardData[] = [];

  /** Accessible label for the grid. */
  @Input() gridLabel = 'Image gallery';

  /** Breakpoints for card images. */
  readonly cardBreakpoints = CARD_BREAKPOINTS;

  trackByTitle(_index: number, card: ImageCardData): string {
    return card.title;
  }
}
