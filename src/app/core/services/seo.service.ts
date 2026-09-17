import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import {
  BASE_OG_IMAGE,
  BASE_URL,
  ROUTE_SEO,
  RouteSeoConfig,
  normalizeSeoPath
} from '../data/seo-routes';
import { BrandConfigService } from './brand-config.service';

/** Updates the server-rendered document and hydrated pages from one route map. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly brand = inject(BrandConfigService);

  private static readonly JSONLD_ROUTE_ID = 'seo-jsonld-route';
  private static readonly JSONLD_LOCAL_ID = 'seo-jsonld-localbusiness';

  /**
   * Update SEO tags for the given router path (leading slash allowed).
   * Call on every NavigationEnd event.
   */
  updateForRoute(urlPath: string): void {
    const normalized = normalizeSeoPath(urlPath);
    const config = ROUTE_SEO[normalized];
    this.updateMeta('robots', config ? 'index, follow' : 'noindex, follow');
    if (!config) {
      this.updateMeta('description', 'This page is unavailable.');
      this.meta.removeTag("name='keywords'");
      ['og:url', 'og:title', 'og:description', 'og:image'].forEach(property => this.meta.removeTag(`property='${property}'`));
      ['twitter:title', 'twitter:description', 'twitter:image'].forEach(name => this.meta.removeTag(`name='${name}'`));
      this.doc.head.querySelectorAll("link[rel='canonical'], #seo-jsonld-localbusiness, #seo-jsonld-route").forEach(node => node.remove());
      return;
    }
    const canonicalUrl = this.canonical(normalized);

    this.updateMeta('description', config.description);
    if (config.keywords) {
      this.updateMeta('keywords', config.keywords);
    } else {
      this.meta.removeTag("name='keywords'");
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

    this.setCanonical(canonicalUrl);
    this.ensureLocalBusinessJsonLd();
    this.setRouteJsonLd(config.jsonLd);
  }

  private canonical(normalized: string): string {
    return normalized === '' ? `${BASE_URL}/` : `${BASE_URL}/${normalized}`;
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

  ensureLocalBusinessJsonLd(): void {
    const head = this.doc.head;
    if (!head) return;
    let node = head.querySelector<HTMLScriptElement>(
      `script#${SeoService.JSONLD_LOCAL_ID}`
    );
    if (!node) {
      node = this.doc.createElement('script');
      node.id = SeoService.JSONLD_LOCAL_ID;
      node.setAttribute('type', 'application/ld+json');
      head.appendChild(node);
    }
    const contact = this.brand.site.contact;
    node.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      '@id': `${BASE_URL}/#business`,
      name: this.brand.siteName,
      url: `${BASE_URL}/`,
      description: ROUTE_SEO[''].description,
      image: BASE_OG_IMAGE,
      logo: BASE_OG_IMAGE,
      email: contact.email,
      ...(contact.phone ? { telephone: contact.phone } : {}),
      areaServed: { '@type': 'AdministrativeArea', name: 'South Florida' },
      sameAs: this.brand.nav.social.map(item => item.href)
    }).replace(/</g, '\\u003c');
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
