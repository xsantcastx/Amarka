import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * AMK-45 — Trade Client Trust Bar
 *
 * A horizontal social-proof strip that signals to trade visitors
 * (interior designers, GCs, hospitality groups, corporate offices)
 * that Amarka is built for the trade — not retail customers.
 *
 * Placed directly below the hero on the homepage.
 *
 * Brand Bible compliance:
 *   - Only 6-token palette (#181818, #484848, #906030, #f0f0f0, #c0c0c0, #909090)
 *   - Gold (#906030) used only as decorative rule — never as body text
 *   - Typography: Source Sans 3 body, Playfair Display section heading
 *   - Zone 3b ghost CTA: --ts-accent (#C7683B), 2px radius, fill-on-hover
 *   - Stamford, CT — zero NYC references
 *   - prefers-reduced-motion respected
 */

interface TradeArchetype {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'amarka-trade-trust-bar',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="trust-bar" aria-label="Built for the trade">
      <!-- Gold decorative rule -->
      <div class="trust-bar__rule" aria-hidden="true"></div>

      <div class="trust-bar__container">
        <div class="trust-bar__archetypes" role="list">
          @for (archetype of archetypes; track archetype.title) {
            <div class="trust-bar__archetype" role="listitem">
              <span class="trust-bar__icon" aria-hidden="true">{{ archetype.icon }}</span>
              <h3 class="trust-bar__title">{{ archetype.title }}</h3>
              <p class="trust-bar__desc">{{ archetype.description }}</p>
            </div>
          }
        </div>

        <div class="trust-bar__callout">
          <p>
            <strong>Trade accounts available</strong>
            — preferred pricing and dedicated lead times for qualifying professionals.
          </p>
        </div>

        <div class="trust-bar__action">
          <a routerLink="/trade" class="trust-bar__cta">Open a Trade Account</a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .trust-bar {
      padding: clamp(2.5rem, 5vw, 3.5rem) 0;
      background: var(--amarka-bg, #181818);
      position: relative;
    }

    /* Gold decorative rule above the section */
    .trust-bar__rule {
      position: absolute;
      top: 0;
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

    .trust-bar__container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 clamp(1.25rem, 4vw, 2rem);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.75rem;
    }

    /* Archetype grid */
    .trust-bar__archetypes {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
      width: 100%;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    @media (max-width: 860px) {
      .trust-bar__archetypes {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 480px) {
      .trust-bar__archetypes {
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }
    }

    .trust-bar__archetype {
      text-align: center;
      padding: 1.25rem 0.75rem;
    }

    .trust-bar__icon {
      display: block;
      font-size: 1.6rem;
      line-height: 1;
      margin-bottom: 0.65rem;
      color: var(--amarka-text-secondary, #c0c0c0);
    }

    .trust-bar__title {
      font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif;
      font-size: 0.92rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--amarka-text, #f0f0f0);
      margin: 0 0 0.4rem;
      line-height: 1.3;
    }

    .trust-bar__desc {
      font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif;
      font-size: 0.84rem;
      line-height: 1.55;
      color: var(--amarka-text-secondary, #c0c0c0);
      margin: 0;
      max-width: 22ch;
      margin-inline: auto;
    }

    /* Callout line */
    .trust-bar__callout {
      text-align: center;

      p {
        font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif;
        font-size: 0.88rem;
        line-height: 1.6;
        color: var(--amarka-text-secondary, #c0c0c0);
        margin: 0;
      }

      strong {
        color: var(--amarka-text, #f0f0f0);
        font-weight: 600;
      }
    }

    /* Zone 3b ghost CTA */
    .trust-bar__cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ts-accent, #C7683B);
      text-decoration: none;
      padding: 0.65rem 1.6rem;
      border: 1px solid var(--ts-accent, #C7683B);
      border-radius: 2px;
      background: transparent;
      min-height: 44px;
      cursor: pointer;
      transition:
        background var(--amarka-duration-base, 250ms) var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
        color var(--amarka-duration-base, 250ms) var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
        transform var(--amarka-duration-base, 250ms) var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1));

      &:hover {
        background: var(--ts-accent, #C7683B);
        color: var(--amarka-text, #f0f0f0);
        transform: translateY(-1px);
        text-decoration: none;
      }

      &:focus-visible {
        outline: 2px solid var(--ts-accent, #C7683B);
        outline-offset: 3px;
      }

      &:active {
        transform: scale(0.98);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .trust-bar__cta {
        transition-duration: 0.01ms !important;
      }
    }
  `]
})
export class TradeTrustBarComponent {
  readonly archetypes: TradeArchetype[] = [
    {
      icon: '\u25B3', // Triangle — architectural/design
      title: 'Interior Designers',
      description: 'Signage, donor walls, and branded panels for client projects'
    },
    {
      icon: '\u2302', // House — construction
      title: 'General Contractors',
      description: 'Wayfinding systems, room signs, and ADA-compliant plaques'
    },
    {
      icon: '\u2606', // Star — hospitality
      title: 'Hospitality Groups',
      description: 'Guest amenity cards, bar service pieces, and custom awards'
    },
    {
      icon: '\u25A1', // Square — corporate/office
      title: 'Corporate Offices',
      description: 'Door plates, conference room signs, and recognition plaques'
    }
  ];
}
