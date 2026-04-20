/**
 * AMK-58 — Brand Bible compliance + structural tests for vertical landing data.
 *
 * Anchors:
 *   - 4 verticals with unique slugs (hospitality, bar-restaurant, corporate, golf-clubs)
 *   - Substrate list is the 6 approved Brand Bible substrates
 *   - Zero NYC / "New York" references in any vertical content
 *   - SEO title/description within recommended length budgets
 *   - All slugs are lookable via findVerticalBySlug; missing slugs return undefined
 */

import {
  SERVICE_VERTICALS,
  SERVICE_VERTICAL_SLUGS,
  findVerticalBySlug
} from './service-vertical.data';

const APPROVED_SUBSTRATES = ['Brass', 'Aluminium', 'Stainless Steel', 'Acrylic', 'Hardwood', 'Glass'];
const NYC_PATTERN = /\b(NYC|New York(?: City)?)\b/i;

describe('SERVICE_VERTICALS (AMK-58)', () => {
  it('exposes exactly four verticals', () => {
    expect(SERVICE_VERTICALS.length).toBe(4);
  });

  it('exposes the four canonical slugs', () => {
    expect(SERVICE_VERTICAL_SLUGS.slice().sort()).toEqual(
      ['bar-restaurant', 'corporate', 'golf-clubs', 'hospitality'].sort()
    );
  });

  it('every vertical has unique slug', () => {
    const slugs = SERVICE_VERTICALS.map(v => v.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every vertical lists all 6 approved Brand Bible substrates only', () => {
    for (const v of SERVICE_VERTICALS) {
      expect(v.substrates.slice().sort()).toEqual(APPROVED_SUBSTRATES.slice().sort());
    }
  });

  it('every product substrate is one of the 6 approved substrates', () => {
    for (const v of SERVICE_VERTICALS) {
      for (const product of v.products) {
        expect(APPROVED_SUBSTRATES).toContain(product.substrate);
      }
    }
  });

  it('contains no NYC / New York references in any vertical content', () => {
    for (const v of SERVICE_VERTICALS) {
      const blob = JSON.stringify(v);
      expect(blob).not.toMatch(NYC_PATTERN);
    }
  });

  it('every vertical references Stamford or Connecticut for trade positioning', () => {
    for (const v of SERVICE_VERTICALS) {
      const blob = `${v.heroSubheading} ${v.seoDescription}`;
      expect(blob).toMatch(/Stamford|Connecticut/i);
    }
  });

  it('seoTitle stays under 70 characters (Google SERP soft cap)', () => {
    for (const v of SERVICE_VERTICALS) {
      expect(v.seoTitle.length).toBeLessThanOrEqual(70);
    }
  });

  it('seoDescription stays under 165 characters (Google SERP soft cap)', () => {
    for (const v of SERVICE_VERTICALS) {
      expect(v.seoDescription.length).toBeLessThanOrEqual(165);
    }
  });

  it('every vertical exposes at least 4 sections, 6 products, and 2 CTAs', () => {
    for (const v of SERVICE_VERTICALS) {
      expect(v.sections.length).toBeGreaterThanOrEqual(4);
      expect(v.products.length).toBeGreaterThanOrEqual(6);
      expect(v.ctas.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every vertical has at least 5 SEO keywords', () => {
    for (const v of SERVICE_VERTICALS) {
      expect(v.seoKeywords.length).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('findVerticalBySlug (AMK-58)', () => {
  it('returns the matching vertical for a known slug', () => {
    const v = findVerticalBySlug('hospitality');
    expect(v?.slug).toBe('hospitality');
    expect(v?.badge).toBe('Hospitality');
  });

  it('returns undefined for an unknown slug', () => {
    expect(findVerticalBySlug('does-not-exist')).toBeUndefined();
  });

  it('returns undefined for null / empty', () => {
    expect(findVerticalBySlug(null)).toBeUndefined();
    expect(findVerticalBySlug(undefined)).toBeUndefined();
    expect(findVerticalBySlug('')).toBeUndefined();
  });
});
