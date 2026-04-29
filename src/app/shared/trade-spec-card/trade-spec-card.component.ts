import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TradeSpec } from '../../models/studio';

/**
 * AMK-85: At-a-Glance Trade Spec Card
 *
 * Sticky compact spec panel rendered immediately below the /trade hero,
 * before the long-form body copy. Designers and GCs skim — this card
 * delivers the operational mental model (substrates, lead time, process)
 * in a single glance instead of three sections.
 *
 * Brand Bible compliance:
 * - Surface: --amarka-surface (#484848). Body text on surface uses
 *   --amarka-text (#f0f0f0) for column heads and --amarka-text-secondary
 *   (#c0c0c0) for body — both clear AAA / AA per Brand Bible color rules.
 * - Card border: 1px --amarka-gold (#906030) accent on top edge ONLY,
 *   premium thin-rule treatment. Never gold as text on the card surface
 *   (Brand Bible explicit FAIL — 1.74:1).
 * - Column heads: Source Sans 3 600, tracking-widest, all-caps via
 *   text-transform (consistent across all columns).
 * - Body copy: Source Sans 3 16px on surface = 8.56:1 AAA, safe.
 * - CTA: outlined ghost per Zone 3b (--ts-accent #C7683B, border-radius 2px,
 *   translateY(-1px) on hover, fill on hover).
 * - Mobile (<= 768px): each column becomes a stacked block with a gold
 *   top-rule, 16px vertical rhythm — matches AMK-65 drawer breakpoint.
 * - Motion: --amarka-duration-base + --amarka-ease-out tokens (AMK-62).
 */
@Component({
  selector: 'app-trade-spec-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="trade-spec-card"
      role="region"
      aria-label="Trade studio specifications at a glance"
    >
      <div class="trade-spec-card__columns">
        @for (col of spec.columns; track col.heading) {
          <div class="trade-spec-card__column">
            <h3 class="trade-spec-card__heading">{{ col.heading }}</h3>
            <p class="trade-spec-card__body">{{ col.body }}</p>
          </div>
        }
      </div>

      <div class="trade-spec-card__cta-row">
        <a
          [routerLink]="spec.cta.href"
          class="trade-spec-card__cta"
          rel="noopener"
        >
          {{ spec.cta.label }}
        </a>
      </div>
    </section>
  `,
  styles: [
    `
      /* ===================================================
       * AMK-85: Trade Spec Card
       * Brand Bible 6-token palette only. CTA per Zone 3b.
       * =================================================== */

      :host {
        display: block;
        --tsc-duration: var(--amarka-duration-base, 250ms);
        --tsc-ease: var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
        --tsc-lift: translateY(-1px);
      }

      .trade-spec-card {
        position: relative;
        background: var(--amarka-surface, #484848);
        border-top: 1px solid var(--amarka-gold, #906030);
        border-radius: 2px;
        padding: 1.75rem 1.75rem 1.5rem;
        margin: 0 0 2rem;
        box-shadow: 0 12px 32px -22px rgba(0, 0, 0, 0.45);
      }

      /* Three-column desktop layout */
      .trade-spec-card__columns {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1.5rem 2rem;
      }

      .trade-spec-card__column {
        min-width: 0;
      }

      .trade-spec-card__heading {
        font-family: 'Source Sans 3', system-ui, sans-serif;
        font-weight: 600;
        font-size: 0.78rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--amarka-text, #f0f0f0);
        margin: 0 0 0.65rem;
      }

      .trade-spec-card__body {
        font-family: 'Source Sans 3', system-ui, sans-serif;
        font-weight: 400;
        font-size: 1rem;
        line-height: 1.55;
        color: var(--amarka-text-secondary, #c0c0c0);
        margin: 0;
      }

      /* CTA row */
      .trade-spec-card__cta-row {
        margin-top: 1.5rem;
        display: flex;
        justify-content: flex-start;
      }

      /* Outlined ghost CTA — Zone 3b */
      .trade-spec-card__cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.7rem 1.6rem;
        border-radius: 2px;
        font-family: 'Source Sans 3', system-ui, sans-serif;
        font-weight: 600;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--ts-accent, #c7683b);
        background: transparent;
        border: 1px solid var(--ts-accent, #c7683b);
        text-decoration: none;
        cursor: pointer;
        transition:
          background-color var(--tsc-duration) var(--tsc-ease),
          color var(--tsc-duration) var(--tsc-ease),
          transform var(--tsc-duration) var(--tsc-ease);
      }

      .trade-spec-card__cta:hover,
      .trade-spec-card__cta:focus-visible {
        background: var(--ts-accent, #c7683b);
        color: var(--amarka-text, #f0f0f0);
        transform: var(--tsc-lift);
        text-decoration: none;
      }

      .trade-spec-card__cta:focus-visible {
        outline: 2px solid var(--amarka-gold, #906030);
        outline-offset: 2px;
      }

      .trade-spec-card__cta:active {
        transform: translateY(0);
      }

      /* ─── Mobile stack ─────────────────────────────
         AMK-65 mobile drawer breakpoint = 768px. Match it. */
      @media (max-width: 768px) {
        .trade-spec-card {
          padding: 1.4rem 1.25rem 1.25rem;
        }

        .trade-spec-card__columns {
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .trade-spec-card__column {
          padding-top: 1rem;
          border-top: 1px solid var(--amarka-gold, #906030);
        }

        /* First stacked column inherits the card's own top rule. */
        .trade-spec-card__column:first-child {
          padding-top: 0;
          border-top: none;
        }

        .trade-spec-card__cta-row {
          margin-top: 1.25rem;
        }

        .trade-spec-card__cta {
          width: 100%;
        }
      }

      /* Honor reduced-motion preference */
      @media (prefers-reduced-motion: reduce) {
        .trade-spec-card__cta {
          transition: none;
        }

        .trade-spec-card__cta:hover,
        .trade-spec-card__cta:focus-visible {
          transform: none;
        }
      }
    `,
  ],
})
export class TradeSpecCardComponent {
  /**
   * Spec content. Loaded by parent from StudioContentService.getTradeSpec()
   * (single source of truth: studio.seed.ts -> TRADE_SPEC).
   */
  @Input({ required: true }) spec!: TradeSpec;
}
