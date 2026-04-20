import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * AMK-44 — By the Numbers
 *
 * A compact full-width metrics strip that reinforces trade credibility
 * with four concrete, defensible facts. Placed between the trade trust
 * bar (archetypes) and the substrate explorer on the homepage.
 *
 * Distinct from:
 *   - AMK-45 (trade-trust-bar): shows buyer archetypes, not numbers
 *   - AMK-66 (home-stats): larger marketing cards (Projects Delivered,
 *     Client Satisfaction, In-House Production, Years in Stamford, CT)
 *
 * This strip is tighter, data-first, and sits above the fold on most
 * viewports — it's the "proof line" between archetype trust and
 * material exploration.
 *
 * Brand Bible compliance:
 *   - Only 6-token palette (#181818, #484848, #906030, #f0f0f0, #c0c0c0, #909090)
 *   - Gold (#906030) used only as decorative rule — never as body text
 *   - Typography: Playfair Display for the numbers, Source Sans 3 for labels
 *   - No CTA (pure trust-building, no decision fatigue)
 *   - Stamford, CT positioning — zero NYC references
 *   - prefers-reduced-motion respected
 */

interface Metric {
  value: string;
  label: string;
  caption: string;
}

@Component({
  selector: 'amarka-by-the-numbers',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="numbers" aria-label="By the numbers">
      <!-- Gold decorative rule above -->
      <div class="numbers__rule numbers__rule--top" aria-hidden="true"></div>

      <div class="numbers__container">
        <div class="numbers__grid" role="list">
          @for (metric of metrics; track metric.label) {
            <div class="numbers__metric" role="listitem">
              <div class="numbers__value" aria-hidden="true">{{ metric.value }}</div>
              <div class="numbers__label">{{ metric.label }}</div>
              <div class="numbers__caption">{{ metric.caption }}</div>
            </div>
          }
        </div>
      </div>

      <!-- Gold decorative rule below -->
      <div class="numbers__rule numbers__rule--bottom" aria-hidden="true"></div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .numbers {
      position: relative;
      padding: clamp(2.25rem, 4.5vw, 3rem) 0;
      background: var(--amarka-bg, #181818);
    }

    .numbers__rule {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: min(80%, 800px);
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent,
        var(--amarka-gold, #906030) 30%,
        var(--amarka-gold, #906030) 70%,
        transparent
      );
    }

    .numbers__rule--top {
      top: 0;
    }

    .numbers__rule--bottom {
      bottom: 0;
    }

    .numbers__container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 clamp(1.25rem, 4vw, 2rem);
    }

    .numbers__grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: clamp(1.25rem, 3vw, 2.5rem);
      width: 100%;
    }

    @media (max-width: 860px) {
      .numbers__grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1.75rem;
      }
    }

    @media (max-width: 420px) {
      .numbers__grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
    }

    .numbers__metric {
      text-align: center;
      padding: 0.25rem 0.5rem;
    }

    .numbers__value {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(2.25rem, 4.5vw, 2.75rem);
      font-weight: 500;
      line-height: 1;
      color: var(--amarka-text, #f0f0f0);
      margin-bottom: 0.5rem;
      letter-spacing: -0.01em;
      font-variant-numeric: lining-nums tabular-nums;
    }

    .numbers__label {
      font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--amarka-text, #f0f0f0);
      margin-bottom: 0.35rem;
      line-height: 1.3;
    }

    .numbers__caption {
      font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif;
      font-size: 0.8rem;
      line-height: 1.5;
      color: var(--amarka-text-secondary, #c0c0c0);
      max-width: 22ch;
      margin-inline: auto;
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        animation: none !important;
        transition: none !important;
      }
    }
  `]
})
export class ByTheNumbersComponent {
  readonly metrics: Metric[] = [
    {
      value: '6',
      label: 'Premium Substrates',
      caption: 'Brass, stainless, aluminum, acrylic, wood, and leather'
    },
    {
      value: '5\u201310',
      label: 'Business-Day Turnaround',
      caption: 'Standard lead time on approved artwork'
    },
    {
      value: '72h',
      label: 'Rush Available',
      caption: 'Expedited production for qualifying trade orders'
    },
    {
      value: '100%',
      label: 'Engraved In-House',
      caption: 'Every piece cut and finished in Stamford, CT'
    }
  ];
}
