import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { BrandConfigService } from '../core/services/brand-config.service';

export interface ProductSchemaData {
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  currency?: string;
  sku?: string;
  brand?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  condition?: 'NewCondition' | 'UsedCondition' | 'RefurbishedCondition';
  rating?: {
    value: number;
    count: number;
  };
  slug?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoSchemaService {
  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private meta: Meta,
    private titleService: Title,
    private brandConfig: BrandConfigService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Generate Product schema markup for individual product pages
   */
  generateProductSchema(product: ProductSchemaData): void {
    if (!this.isBrowser) return;

    const schema = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.imageUrl,
      sku: product.sku || `TLM-${product.name.replace(/\s+/g, '-').toUpperCase()}`,
      brand: {
        '@type': 'Brand',
        name: product.brand || this.brandConfig.siteName
      },
      offers: {
        '@type': 'Offer',
        url: product.slug 
          ? `https://amarka.com/productos/${product.slug}` 
          : 'https://amarka.com/productos',
        priceCurrency: product.currency || 'USD',
        price: product.price.toFixed(2),
        availability: product.availability 
          ? `https://schema.org/${product.availability}` 
          : 'https://schema.org/InStock',
        priceValidUntil: this.getNextYearDate(),
        itemCondition: product.condition 
          ? `https://schema.org/${product.condition}` 
          : 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: this.brandConfig.siteName
        }
      }
    };

    // Add aggregate rating if reviews exist
    if (product.rating && product.rating.count > 0) {
      (schema as any).aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: product.rating.value.toFixed(1),
        reviewCount: product.rating.count.toString()
      };
    }

    this.injectSchema('product-schema', schema);
  }

  /**
   * Generate FAQ schema markup for pages with FAQs
   */
  generateFAQSchema(faqs: FAQItem[]): void {
    if (!this.isBrowser || !faqs || faqs.length === 0) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };

    this.injectSchema('faq-schema', schema);
  }

  /**
   * Generate BreadcrumbList schema for navigation
   */
  generateBreadcrumbSchema(items: { name: string; url: string }[]): void {
    if (!this.isBrowser || !items || items.length === 0) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    };

    this.injectSchema('breadcrumb-schema', schema);
  }

  /**
   * Generate ItemList schema for product listings
   */
  generateItemListSchema(products: ProductSchemaData[], listName: string): void {
    if (!this.isBrowser || !products || products.length === 0) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: listName,
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.name,
          url: product.slug 
            ? `https://amarka.com/productos/${product.slug}` 
            : 'https://amarka.com/productos',
          image: product.imageUrl,
          offers: {
            '@type': 'Offer',
            price: product.price.toFixed(2),
            priceCurrency: product.currency || 'USD'
          }
        }
      }))
    };

    this.injectSchema('itemlist-schema', schema);
  }

  /**
   * Generate Article schema for blog posts
   */
  generateArticleSchema(article: {
    headline: string;
    description: string;
    imageUrl: string;
    datePublished: string;
    dateModified?: string;
    authorName: string;
    slug: string;
  }): void {
    if (!this.isBrowser) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.headline,
      description: article.description,
      image: article.imageUrl,
      datePublished: article.datePublished,
      dateModified: article.dateModified || article.datePublished,
      author: {
        '@type': 'Person',
        name: article.authorName
      },
      publisher: {
        '@type': 'Organization',
        name: this.brandConfig.siteName,
        logo: {
          '@type': 'ImageObject',
          url: 'https://amarka.com/assets/brand/amarka-logo.svg'
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://amarka.com/blog/${article.slug}`
      }
    };

    this.injectSchema('article-schema', schema);
  }

  /**
   * Update page title dynamically
   */
  setTitle(title: string): void {
    this.titleService.setTitle(title);
  }

  /**
   * Update meta description dynamically
   */
  setMetaDescription(description: string): void {
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ name: 'twitter:description', content: description });
  }

  /**
   * Update meta keywords dynamically
   */
  setMetaKeywords(keywords: string): void {
    this.meta.updateTag({ name: 'keywords', content: keywords });
  }

  /**
   * Update canonical URL
   */
  setCanonicalUrl(url: string): void {
    if (!this.isBrowser) return;
    
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * Update Open Graph image
   */
  setOgImage(imageUrl: string): void {
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
  }

  /**
   * Update Open Graph title
   */
  setOgTitle(title: string): void {
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ name: 'twitter:title', content: title });
  }

  /**
   * Remove all dynamic schema scripts
   */
  removeAllSchemas(): void {
    if (!this.isBrowser) return;
    
    const schemaIds = ['product-schema', 'faq-schema', 'breadcrumb-schema', 'itemlist-schema', 'article-schema'];
    schemaIds.forEach(id => this.removeSchema(id));
  }

  /**
   * Remove specific schema by ID
   */
  removeSchema(id: string): void {
    if (!this.isBrowser) return;
    
    const existingScript = document.getElementById(id);
    if (existingScript) {
      existingScript.remove();
    }
  }

  /**
   * Inject schema JSON-LD into the document head
   */
  private injectSchema(id: string, schema: any): void {
    // Remove existing schema with this ID
    this.removeSchema(id);

    // Create new script element
    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema, null, 2);
    document.head.appendChild(script);
  }

  /**
   * Get date one year from now for price validity
   */
  private getNextYearDate(): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  }

  /**
   * Complete SEO setup for a product page
   */
  setupProductPageSEO(product: ProductSchemaData, breadcrumbs?: { name: string; url: string }[]): void {
    // Set title
    this.setTitle(`${product.name} | Bitcoin Mining Equipment | ${this.brandConfig.siteName}`);
    
    // Set meta description
    this.setMetaDescription(
      product.description.length > 160 
        ? product.description.substring(0, 157) + '...' 
        : product.description
    );
    
    // Set OG tags
    this.setOgTitle(`${product.name} | ${this.brandConfig.siteName}`);
    this.setOgImage(product.imageUrl);
    
    // Set canonical URL
    if (product.slug) {
      this.setCanonicalUrl(`https://amarka.com/productos/${product.slug}`);
    }
    
    // Generate product schema
    this.generateProductSchema(product);
    
    // Generate breadcrumb schema if provided
    if (breadcrumbs && breadcrumbs.length > 0) {
      this.generateBreadcrumbSchema(breadcrumbs);
    }
  }

  /**
   * Complete SEO setup for a category/listing page
   */
  setupCategoryPageSEO(
    title: string, 
    description: string, 
    keywords: string,
    products?: ProductSchemaData[],
    listName?: string
  ): void {
    this.setTitle(title);
    this.setMetaDescription(description);
    this.setMetaKeywords(keywords);
    this.setOgTitle(title);
    
    // Generate product list schema if products provided
    if (products && products.length > 0 && listName) {
      this.generateItemListSchema(products, listName);
    }
  }
}
