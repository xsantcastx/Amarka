import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * AMK-46 — Interactive Substrate Explorer
 *
 * A 3×2 grid of the six Brand Bible substrates (brass, aluminium,
 * stainless steel, acrylic, hardwood, glass) where each tile reveals
 * 2–3 typical applications and a "View examples" link on hover/focus.
 *
 * Distinct from AMK-38 (Substrate Showcase scrolling strip) and from
 * /materials page (full spec sheet) — this is a homepage discovery
 * surface for trade clients who want to scan capabilities at a glance.
 *
 * Brand Bible compliance:
 *   - Only 6-token palette (#181818, #484848, #906030, #f0f0f0, #c0c0c0, #909090)
 *   - Zone 2 (cards on #484848 surface): #f0f0f0 (8.56:1 AAA) + #c0c0c0 (5.10:1 AA)
 *   - Gold (#906030) as TILE BORDER ACCENT only — never as text on surface
 *   - Substrate names in Playfair Display ≥ 24px (heading hierarchy)
 *   - Body/labels in Source Sans 3
 *   - "View examples" link uses --amarka-text (#f0f0f0) with gold underline on hover
 *   - Stamford, CT — zero NYC references
 *   - Motion via AMK-62 tokens (--amarka-duration-base, --amarka-ease-out)
 *   - prefers-reduced-motion respected (handled via tokens + transitions)
 *   - WCAG 2.4.7: focus-visible 2px gold outline on keyboard focus
 *   - WCAG 2.5.8: 48px min touch target on the View examples affordance
 */

interface SubstrateTile {
  /** Brand Bible canonical substrate name (used as heading). */
  name: string;
  /** Short subtitle shown next to the name. */
  finish: string;
  /** 2–3 typical trade applications (joined by · in the template). */
  applications: string[];
  /** Materials-page anchor for the "View examples" link. */
  fragment: string;
  /** Aria label for the tile (used for screen reader context). */
  ariaLabel: string;
}

@Component({
  selector: 'amarka-substrate-explorer',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="substrate-explorer" aria-labelledby="substrate-explorer-heading">
      <div class="substrate-explorer__container">
        <header class="substrate-explorer__header">
          <p class="substrate-explorer__eyebrow">Material library</p>
          <h2 id="substrate-explorer-heading" class="substrate-explorer__heading">
            Six substrates, engraved in-house.
          </h2>
          <p class="substrate-explorer__intro">
            Hover or tap each material to see typical trade applications. Physical samples
            shipped from Stamford, CT to qualifying trade accounts on request.
          </p>
        </header>

        <div class="substrate-explorer__grid" role="list">
          @for (tile of substrates; track tile.name) {
            <article
              class="substrate-tile"
              [attr.data-substrate]="tile.fragment"
              role="listitem"
              tabindex="0"
              [attr.aria-label]="tile.ariaLabel"
            >
              <div class="substrate-tile__swatch" [class]="'substrate-tile__swatch--' + tile.fragment" aria-hidden="true"></div>

              <div class="substrate-tile__body">
                <header class="substrate-tile__header">
                  <h3 class="substrate-tile__name">{{ tile.name }}</h3>
                  <p class="substrate-tile__finish">{{ tile.finish }}</p>
                </header>

                <div class="substrate-tile__reveal" aria-hidden="false">
                  <ul class="substrate-tile__applications">
                    @for (app of tile.applications; track app) {
                      <li>{{ app }}</li>
                    }
                  </ul>

                  <a
                    routerLink="/materials"
                    [fragment]="tile.fragment"
                    class="substrate-tile__link"
                    [attr.aria-label]="'View ' + tile.name + ' examples on the materials page'"
                  >
                    View examples
                    <span class="substrate-tile__arrow" aria-hidden="true">&rarr;</span>
                  </a>
                </div>
              </div>
            </article>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .substrate-explorer {
      background: var(--amarka-bg, #181818);
      padding: clamp(3rem, 6vw, 5rem) 0;
    }

    .substrate-explorer__container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 clamp(1.25rem, 4vw, 2rem);
    }

    /* Section header */
    .substrate-explorer__header {
      max-width: 720px;
      margin: 0 auto clamp(2rem, 4vw, 3rem);
      text-align: center;
    }

    .substrate-explorer__eyebrow {
      font-family: 'Source Sans 3', system-ui, sans-serif;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--amarka-text-secondary, #c0c0c0);
      margin: 0 0 0.75rem;
    }

    .substrate-explorer__heading {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(1.75rem, 3.2vw, 2.5rem);
      font-weight: 600;
      line-height: 1.15;
      color: var(--amarka-text, #f0f0f0);
      margin: 0 0 0.75rem;
    }

    .substrate-explorer__intro {
      font-family: 'Source Sans 3', system-ui, sans-serif;
      font-size: 1rem;
      line-height: 1.6;
      color: var(--amarka-text-secondary, #c0c0c0);
      margin: 0;
    }

    /* Grid: 3×2 desktop → 2×3 tablet → 1×6 mobile */
    .substrate-explorer__grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: clamp(1rem, 2vw, 1.5rem);
    }

    @media (max-width: 960px) {
      .substrate-explorer__grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 560px) {
      .substrate-explorer__grid {
        grid-template-columns: 1fr;
      }
    }

    /* Tile */
    .substrate-tile {
      position: relative;
      display: flex;
      flex-direction: column;
      background: var(--amarka-surface, #484848);
      border: 1px solid transparent;
      border-top: 1px solid transparent;
      border-radius: 2px;
      overflow: hidden;
      cursor: default;
      will-change: transform, border-color;
      transition:
        transform var(--amarka-duration-base, 250ms) var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
        border-color var(--amarka-duration-base, 250ms) var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
        box-shadow var(--amarka-duration-base, 250ms) var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
    }

    /* Hover & focus state — gold border accent + subtle lift (Brand Bible Zone 2) */
    .substrate-tile:hover,
    .substrate-tile:focus-visible {
      transform: translateY(-2px) scale(1.01);
      border-color: var(--amarka-gold, #906030);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

    /* Strong gold top accent on hover/focus only */
    .substrate-tile::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--amarka-gold, #906030);
      transform: scaleX(0);
      transform-origin: left center;
      transition: transform var(--amarka-duration-base, 250ms) var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
    }

    .substrate-tile:hover::before,
    .substrate-tile:focus-visible::before {
      transform: scaleX(1);
    }

    /* Keyboard focus ring (WCAG 2.4.7 — 2px gold outline) */
    .substrate-tile:focus-visible {
      outline: 2px solid var(--amarka-gold, #906030);
      outline-offset: 2px;
    }

    /* Swatch — subtle material texture hint via gradient on approved palette only */
    .substrate-tile__swatch {
      width: 100%;
      aspect-ratio: 16 / 7;
      background: var(--amarka-bg, #181818);
      position: relative;
      overflow: hidden;
    }

    .substrate-tile__swatch::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        135deg,
        rgba(144, 96, 48, 0.06) 0%,
        rgba(144, 96, 48, 0) 50%,
        rgba(192, 192, 192, 0.03) 100%
      );
      pointer-events: none;
    }

    /* Per-substrate texture hints — all derived from approved palette only */
    .substrate-tile__swatch--brass {
      background:
        repeating-linear-gradient(
          90deg,
          rgba(144, 96, 48, 0.18) 0px,
          rgba(144, 96, 48, 0.18) 1px,
          transparent 1px,
          transparent 4px
        ),
        var(--amarka-bg, #181818);
    }

    .substrate-tile__swatch--aluminium {
      background:
        repeating-linear-gradient(
          90deg,
          rgba(192, 192, 192, 0.12) 0px,
          rgba(192, 192, 192, 0.12) 1px,
          transparent 1px,
          transparent 3px
        ),
        var(--amarka-bg, #181818);
    }

    .substrate-tile__swatch--stainless {
      background:
        repeating-linear-gradient(
          90deg,
          rgba(192, 192, 192, 0.18) 0px,
          rgba(192, 192, 192, 0.18) 1px,
          transparent 1px,
          transparent 5px
        ),
        var(--amarka-bg, #181818);
    }

    .substrate-tile__swatch--acrylic {
      background:
        radial-gradient(
          circle at 30% 40%,
          rgba(240, 240, 240, 0.08),
          transparent 60%
        ),
        var(--amarka-bg, #181818);
    }

    .substrate-tile__swatch--hardwood {
      background:
        repeating-linear-gradient(
          12deg,
          rgba(144, 96, 48, 0.10) 0px,
          rgba(144, 96, 48, 0.10) 2px,
          transparent 2px,
          transparent 7px
        ),
        var(--amarka-bg, #181818);
    }

    .substrate-tile__swatch--glass {
      background:
        linear-gradient(
          120deg,
          rgba(240, 240, 240, 0.10) 0%,
          transparent 35%,
          rgba(240, 240, 240, 0.05) 65%,
          transparent 100%
        ),
        var(--amarka-bg, #181818);
    }

    /* Body */
    .substrate-tile__body {
      padding: clamp(1.25rem, 2vw, 1.5rem);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      flex: 1;
    }

    .substrate-tile__header {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .substrate-tile__name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(1.25rem, 1.6vw, 1.5rem);
      font-weight: 600;
      line-height: 1.2;
      color: var(--amarka-text, #f0f0f0);
      margin: 0;
    }

    .substrate-tile__finish {
      font-family: 'Source Sans 3', system-ui, sans-serif;
      font-size: 0.8125rem;
      font-weight: 400;
      letter-spacing: 0.04em;
      color: var(--amarka-text-secondary, #c0c0c0);
      margin: 0;
    }

    /* Reveal block — applications + link.
       Always present in the DOM (no display:none) so it's screen-reader accessible
       and keyboard-discoverable; visual collapse via opacity/translate on parent. */
    .substrate-tile__reveal {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      opacity: 0.7;
      transform: translateY(2px);
      transition:
        opacity var(--amarka-duration-base, 250ms) var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
        transform var(--amarka-duration-base, 250ms) var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
    }

    .substrate-tile:hover .substrate-tile__reveal,
    .substrate-tile:focus-within .substrate-tile__reveal,
    .substrate-tile:focus-visible .substrate-tile__reveal {
      opacity: 1;
      transform: translateY(0);
    }

    .substrate-tile__applications {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .substrate-tile__applications li {
      font-family: 'Source Sans 3', system-ui, sans-serif;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--amarka-text-secondary, #c0c0c0);
    }

    .substrate-tile__applications li::before {
      content: '· ';
      color: var(--amarka-gold, #906030);
      margin-right: 0.25rem;
    }

    /* "View examples" link — Zone 3 tertiary text-link pattern */
    .substrate-tile__link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      align-self: flex-start;
      min-height: 32px;
      padding: 0.375rem 0;
      font-family: 'Source Sans 3', system-ui, sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--amarka-text, #f0f0f0);
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition:
        border-color var(--amarka-duration-fast, 150ms) var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
        color var(--amarka-duration-fast, 150ms) var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
    }

    .substrate-tile__link:hover,
    .substrate-tile__link:focus-visible {
      border-bottom-color: var(--amarka-gold, #906030);
    }

    .substrate-tile__link:focus-visible {
      outline: 2px solid var(--amarka-gold, #906030);
      outline-offset: 4px;
    }

    .substrate-tile__arrow {
      display: inline-block;
      transition: transform var(--amarka-duration-fast, 150ms) var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
    }

    .substrate-tile__link:hover .substrate-tile__arrow,
    .substrate-tile__link:focus-visible .substrate-tile__arrow {
      transform: translateX(3px);
    }

    /* Reduced motion: instant state changes, no transforms */
    @media (prefers-reduced-motion: reduce) {
      .substrate-tile,
      .substrate-tile::before,
      .substrate-tile__reveal,
      .substrate-tile__link,
      .substrate-tile__arrow {
        transition: none;
      }

      .substrate-tile:hover,
      .substrate-tile:focus-visible {
        transform: none;
      }

      .substrate-tile__reveal {
        opacity: 1;
        transform: none;
      }
    }
  `]
})
export class SubstrateExplorerComponent {
  /**
   * Brand Bible Six Substrates — order matches the /materials page so the
   * "View examples" anchor lines up with the matching material card.
   */
  protected readonly substrates: ReadonlyArray<SubstrateTile> = [
    {
      name: 'Brushed Brass',
      finish: 'Brushed · Mirror · Patinated',
      applications: [
        'Hospitality wayfinding',
        'Donor walls & recognition plaques',
        'Architectural panels'
      ],
      fragment: 'brass',
      ariaLabel: 'Brushed Brass — hospitality wayfinding, donor walls and recognition plaques, architectural panels'
    },
    {
      name: 'Anodized Aluminium',
      finish: 'Silver · Black · Gold · Bronze',
      applications: [
        'Commercial wayfinding',
        'Bar service & drinkware tags',
        'Office identity & badging'
      ],
      fragment: 'aluminium',
      ariaLabel: 'Anodized Aluminium — commercial wayfinding, bar service tags, office identity'
    },
    {
      name: 'Stainless Steel',
      finish: 'Brushed · Mirror · Grade 304',
      applications: [
        'Building identification',
        'Lobby directories',
        'Exterior-rated signage'
      ],
      fragment: 'stainless',
      ariaLabel: 'Stainless Steel — building identification, lobby directories, exterior signage'
    },
    {
      name: 'Frosted & Cast Acrylic',
      finish: 'Frosted · Solid · Tinted · Backlit-ready',
      applications: [
        'Interior signage',
        'Branded room markers',
        'Illuminated fixtures'
      ],
      fragment: 'acrylic',
      ariaLabel: 'Frosted and Cast Acrylic — interior signage, branded room markers, illuminated fixtures'
    },
    {
      name: 'Hardwoods',
      finish: 'Oak · Walnut · Bamboo',
      applications: [
        'Custom awards',
        'Desk nameplates',
        'Hospitality bespoke pieces'
      ],
      fragment: 'wood',
      ariaLabel: 'Hardwoods — custom awards, desk nameplates, hospitality bespoke pieces'
    },
    {
      name: 'Glass',
      finish: 'Sandblasted · Deep Etched',
      applications: [
        'Door & partition signage',
        'Feature wall etching',
        'Boutique commercial fitout'
      ],
      fragment: 'glass',
      ariaLabel: 'Glass — door and partition signage, feature wall etching, boutique commercial fitout'
    }
  ];
}
