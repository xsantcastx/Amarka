import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { BrandConfigService } from './brand-config.service';
import { SeoService } from './seo.service';
import { ROUTE_SEO } from '../data/seo-routes';

describe('SeoService server document', () => {
  let doc: Document;
  let seo: SeoService;
  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('Test');
    TestBed.configureTestingModule({ providers: [
      { provide: DOCUMENT, useValue: doc },
      { provide: PLATFORM_ID, useValue: 'server' },
      { provide: BrandConfigService, useValue: {
        siteName: 'Amarka', site: { contact: { email: 'test@example.com', phone: '+1 555 0100' } },
        nav: { social: [] }
      } }, Meta, SeoService
    ] });
    seo = TestBed.inject(SeoService);
  });

  it('writes each retained route canonical and matching social metadata during SSR', () => {
    for (const [path, config] of Object.entries(ROUTE_SEO)) {
      seo.updateForRoute(`/${path}/?source=test#content`);
      expect(doc.querySelectorAll('link[rel=canonical]').length).toBe(1);
      expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe(`https://amarka.co/${path}`);
      expect(doc.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(config.title);
      expect(doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content')).toBe(config.description);
    }
  });

  it('has a single service-area schema using configured contact without invented location details', () => {
    seo.updateForRoute('/');
    seo.updateForRoute('/enquire');
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBe(1);
    const schema = JSON.parse(scripts[0].textContent!);
    expect(schema.email).toBe('test@example.com');
    expect(schema.telephone).toBe('+1 555 0100');
    expect(schema.areaServed.name).toBe('South Florida');
    expect(schema.address).toBeUndefined();
    expect(schema.openingHoursSpecification).toBeUndefined();
  });

  it('clears public SEO on error/unknown routes and restores it when returning', () => {
    seo.updateForRoute('/');
    for (const path of ['/404', '/500', '/offline', '/maintenance', '/enquire/missing', '/admin']) {
      seo.updateForRoute(path);
      expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex, follow');
      expect(doc.querySelector('link[rel=canonical]')).toBeNull();
      expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull();
    }
    seo.updateForRoute('/enquire');
    expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('index, follow');
    expect(doc.querySelector('link[rel=canonical]')).not.toBeNull();
    expect(doc.querySelector('meta[name=keywords]')).toBeNull();
  });
});
