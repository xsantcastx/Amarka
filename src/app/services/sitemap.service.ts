import { Injectable } from '@angular/core';
import { ProductsService } from './products.service';
import { firstValueFrom } from 'rxjs';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SitemapService {
  private baseUrl = 'https://amarka.com';

  constructor(private productsService: ProductsService) {}

  /**
   * Generate complete sitemap with all URLs
   */
  async generateSitemap(): Promise<string> {
    const urls: SitemapUrl[] = [];

    // Add static pages
    urls.push(...this.getStaticPages());

    // Add dynamic product pages
    const productUrls = await this.getProductPages();
    urls.push(...productUrls);

    // Generate XML
    return this.generateSitemapXML(urls);
  }

  /**
   * Get static page URLs
   */
  private getStaticPages(): SitemapUrl[] {
    const today = new Date().toISOString().split('T')[0];

    return [
      {
        loc: `${this.baseUrl}/`,
        lastmod: today,
        changefreq: 'daily',
        priority: 1.0
      },
      {
        loc: `${this.baseUrl}/productos`,
        lastmod: today,
        changefreq: 'weekly',
        priority: 0.9
      },
      {
        loc: `${this.baseUrl}/galeria`,
        lastmod: today,
        changefreq: 'weekly',
        priority: 0.7
      },
      {
        loc: `${this.baseUrl}/contacto`,
        lastmod: today,
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        loc: `${this.baseUrl}/datos-tecnicos`,
        lastmod: today,
        changefreq: 'monthly',
        priority: 0.6
      }
    ];
  }

  /**
   * Get product page URLs from Firestore
   */
  private async getProductPages(): Promise<SitemapUrl[]> {
    try {
      const products = await firstValueFrom(this.productsService.getAllProducts());
      
      if (!products || products.length === 0) {
        return [];
      }

      return products
        .filter(p => p.status === 'published' && p.slug) // Only published products with slugs
        .map(product => {
          let lastmod = new Date().toISOString().split('T')[0];
          
          // Handle Firestore Timestamp
          if (product.updatedAt) {
            try {
              const date = (product.updatedAt as any).toDate 
                ? (product.updatedAt as any).toDate() 
                : new Date();
              lastmod = date.toISOString().split('T')[0];
            } catch {
              lastmod = new Date().toISOString().split('T')[0];
            }
          }
          
          return {
            loc: `${this.baseUrl}/products/${product.slug}`,
            lastmod,
            changefreq: 'weekly' as const,
            priority: 0.8
          };
        });
    } catch (error) {
      console.error('Error loading products for sitemap:', error);
      return [];
    }
  }

  /**
   * Generate XML sitemap string
   */
  private generateSitemapXML(urls: SitemapUrl[]): string {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">';
    const urlsetClose = '</urlset>';

    const urlEntries = urls.map(url => {
      let entry = '  <url>\n';
      entry += `    <loc>${this.escapeXml(url.loc)}</loc>\n`;
      
      if (url.lastmod) {
        entry += `    <lastmod>${url.lastmod}</lastmod>\n`;
      }
      
      if (url.changefreq) {
        entry += `    <changefreq>${url.changefreq}</changefreq>\n`;
      }
      
      if (url.priority !== undefined) {
        entry += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
      }
      
      entry += '  </url>';
      return entry;
    }).join('\n');

    return `${xmlHeader}\n${urlsetOpen}\n${urlEntries}\n${urlsetClose}`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  /**
   * Download sitemap as XML file
   */
  async downloadSitemap(): Promise<void> {
    const xml = await this.generateSitemap();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sitemap.xml';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get sitemap URL count by type
   */
  async getSitemapStats(): Promise<{
    totalUrls: number;
    staticPages: number;
    productPages: number;
    lastGenerated: string;
  }> {
    const staticPages = this.getStaticPages();
    const productPages = await this.getProductPages();

    return {
      totalUrls: staticPages.length + productPages.length,
      staticPages: staticPages.length,
      productPages: productPages.length,
      lastGenerated: new Date().toISOString()
    };
  }
}
