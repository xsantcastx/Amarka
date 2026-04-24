import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import {
  BASE_OG_IMAGE,
  BASE_URL,
  LOCAL_BUSINESS_JSONLD,
  ROUTE_SEO,
  RouteSeoConfig,
  SERVICE_VERTICAL_SEO
} from '../data/seo-routes';

/**
 * AMK-9 — SEO service.
 *
 * Owner: xsantcastx (Amarka — Stamford, CT laser engraving studio).
 * Shipped: 2026-04-24 by amarka-backlog-executor-v2 scheduled agent.
 *
 * Responsibility:
 *   - Update meta description, keywords, OG tags, Twitter tags, and canonical
 *     URL on every route change.
 *   - Inject per-route JSON-LD structured data alongside a persistent
 *     LocalBusiness block.
 *
 * Non-responsibilities:
 *   - Does NOT set the document title — that is owned by PageTitleStrategy
 *     (see page-title.strategy.ts). Title strings here are informational only.
 *
 * SSR safety:
 *   - Canonical link + JSON-LD are only mutated in the browser.
 *   - Meta tag updates go through Angular's Meta service which is SSR-safe.
 *
 * Brand Bible compliance:
 *   - Stamford, CT only — zero NYC / Miami positioning in descriptions.
 *   - Contacts: diego@amarka.co, jessica@amarka.co (no email in tag text
 *     to avoid bot scraping, but LocalBusiness schema carries diego@).
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private static readonly JSONLD_ROUTE_ID = 'seo-jsonld-route';
  private static readonly JSONLD_LOCAL_ID = 'seo-jsonld-localbusiness';

  /**
   * Update SEO tags for the given router path (leading slash allowed).
   * Call on every NavigationEnd event.
   */
  updateForRoute(urlPath: string): void {
    const normalized = this.normalizePath(urlPath);
    const config = this.resolveConfig(normalized);
    const canonicalUrl = this.canonical(normalized);

    this.updateMeta('description', config.description);
    if (config.keywords) {
      this.updateMeta('keywords', config.keywords);
    }

    // Open Graph
    this.updateProperty('og:url', canonicalUrl);
    if (config.title) {
      this.updateProperty('og:title', config.title);
    }
    this.updateProperty('og:description', config.description);
    this.updateProperty('og:image', config.ogImage ?? BASE_OG_IMAGE);

    // Twitter Card
    if (config.title) {
      this.updateMeta('twitter:title', config.title);
    }
    this.updateMeta('twitter:description', config.description);
    this.updateMeta('twitter:image', config.ogImage ?? BASE_OG_IMAGE);

    // Canonical + JSON-LD (browser-only DOM writes)
    if (isPlatformBrowser(this.platformId)) {
      this.setCanonical(canonicalUrl);
      this.ensureLocalBusinessJsonLd();
      this.setRouteJsonLd(config.jsonLd);
    }
  }

  // ---- internals ---------------------------------------------------------

  private resolveConfig(normalized: string): RouteSeoConfig {
    // Root
    if (normalized === '') {
      return ROUTE_SEO['']!;
    }

    // Top-level keys are matched directly.
    const topLevel = normalized.split('/')[0] ?? '';
    const topHit = ROUTE_SEO[topLevel];

    // /services/:slug handling
    if (topLevel === 'services') {
      const slug = normalized.split('/')[1];
      if (slug) {
        const verticalHit = SERVICE_VERTICAL_SEO[slug];
        if (verticalHit) {
          return verticalHit;
        }
      }
    }

    return topHit ?? ROUTE_SEO['']!;
  }

  private normalizePath(url: string): string {
    // Strip query/fragment, leading slash, trailing slash.
    const noHash = url.split('#')[0] ?? '';
    const noQuery = noHash.split('?')[0] ?? '';
    return noQuery.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  private canonical(normalized: string): string {
    return normalized === '' ? BASE_URL : `${BASE_URL}/${normalized}`;
  }

  private updateMeta(name: string, content: string): void {
    this.meta.updateTag({ name, content }, `name='${name}'`);
  }

  private updateProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content }, `property='${property}'`);
  }

  private setCanonical(url: string): void {
    const head = this.doc.head;
    if (!head) return;
    let link = head.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private ensureLocalBusinessJsonLd(): void {
    const head = this.doc.head;
    if (!head) return;
    let node = head.querySelector<HTMLScriptElement>(
      `script#${SeoService.JSONLD_LOCAL_ID}`
    );
    if (!node) {
      node = this.doc.createElement('script');
      node.id = SeoService.JSONLD_LOCAL_ID;
      node.setAttribute('type', 'application/ld+json');
      node.textContent = JSON.stringify(LOCAL_BUSINESS_JSONLD);
      head.appendChild(node);
    }
  }

  private setRouteJsonLd(
    payload: RouteSeoConfig['jsonLd'] | undefined
  ): void {
    const head = this.doc.head;
    if (!head) return;
    const existing = head.querySelector<HTMLScriptElement>(
      `script#${SeoService.JSONLD_ROUTE_ID}`
    );
    if (!payload) {
      if (existing) existing.remove();
      return;
    }
    const node = existing ?? this.doc.createElement('script');
    if (!existing) {
      node.id = SeoService.JSONLD_ROUTE_ID;
      node.setAttribute('type', 'application/ld+json');
      head.appendChild(node);
    }
    node.textContent = JSON.stringify(payload);
  }
}
