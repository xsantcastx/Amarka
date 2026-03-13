import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ProductsService } from '../../services/products.service';
import { Product } from '../../models/product';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { MetaService } from '../../services/meta.service';
import { SeoSchemaService } from '../../services/seo-schema.service';
import { BrandConfigService } from '../../core/services/brand-config.service';
import { CollectionsService, CollectionDoc } from '../../services/collections.service';

type SortOption = 'newest' | 'price-asc' | 'price-desc';

@Component({
  selector: 'app-collection-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, PageHeaderComponent, ProductCardComponent],
  templateUrl: './collection.page.html',
  styleUrls: ['./collection.page.scss']
})
export class CollectionPageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private productsService = inject(ProductsService);
  private metaService = inject(MetaService);
  private seoService = inject(SeoSchemaService);
  private brandConfig = inject(BrandConfigService);
  private collectionsService = inject(CollectionsService);
  private cdr = inject(ChangeDetectorRef);

  slug = '';
  collectionId = '';
  title = '';
  subtitle = '';
  private readonly defaultSubtitle = 'Curated personalised gifts crafted with warm materials and thoughtful engraving.';
  collection: CollectionDoc | null = null;

  products: Product[] = [];
  filtered: Product[] = [];
  tags: string[] = [];
  selectedTags = new Set<string>();
  searchTerm = '';
  sort: SortOption = 'newest';
  isLoading = true;

  async ngOnInit() {
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    await this.loadCollection();
    await this.loadProducts();
  }

  ngOnDestroy(): void {
    this.seoService.removeAllSchemas();
  }

  private async loadCollection() {
    this.collection = await this.collectionsService.getCollectionBySlugOnce(this.slug);
    const siteUrl = this.brandConfig.siteUrl;
    const siteName = this.brandConfig.siteName;

    if (this.collection) {
      this.collectionId = this.collection.id || '';
      this.title = this.collection.name;
      const description = (this.collection.description || '').trim();
      this.subtitle = description;
      const metaTitle = this.collection.seo?.title || `${this.collection.name} | ${siteName}`;
      const metaDesc = this.collection.seo?.description || description || this.defaultSubtitle;
      const ogImage = this.collection.seo?.image || this.collection.heroImageUrl || '';
      this.metaService.setPageMeta({
        title: metaTitle,
        description: metaDesc,
        image: ogImage || undefined,
        url: `${siteUrl}/collections/${this.slug}`
      });
      this.seoService.setCanonicalUrl(`${siteUrl}/collections/${this.slug}`);
      this.seoService.generateBreadcrumbSchema([
        { name: 'Home', url: siteUrl },
        { name: 'Collections', url: `${siteUrl}/collections` },
        { name: this.collection.name, url: `${siteUrl}/collections/${this.slug}` }
      ]);
    } else {
      this.title = this.slugToTitle(this.slug);
      this.subtitle = '';
      this.metaService.setPageMeta({
        title: `${this.title} | ${siteName}`,
        description: this.defaultSubtitle,
        url: `${siteUrl}/collections/${this.slug}`
      });
      this.seoService.setCanonicalUrl(`${siteUrl}/collections/${this.slug}`);
    }
    this.cdr.detectChanges();
  }

  private async loadProducts() {
    this.isLoading = true;
    this.cdr.detectChanges();
    try {
      const all = await this.productsService.getAllProductsOnce();
      const published = all.filter(p => p.status === 'published');
      // Filter by collectionIds if available, else by tag fallback
      const slugLower = this.slug.toLowerCase();
      const collectionIdLower = (this.collectionId || '').toLowerCase();

      this.products = published.filter(p => {
        const matchesCollectionToken = (token: unknown): boolean => {
          if (!token) return false;
          if (typeof token === 'string') {
            const normalized = token.toLowerCase();
            return normalized === slugLower || (!!collectionIdLower && normalized === collectionIdLower);
          }
          if (typeof token === 'object') {
            const obj = token as { id?: string; slug?: string };
            const id = (obj.id || '').toLowerCase();
            const slug = (obj.slug || '').toLowerCase();
            return (
              (!!id && (id === slugLower || (!!collectionIdLower && id === collectionIdLower))) ||
              (!!slug && (slug === slugLower || (!!collectionIdLower && slug === collectionIdLower)))
            );
          }
          return false;
        };

        const collectionTokens: unknown[] = [
          ...(p.collectionIds || []),
          (p as any).collectionId,
          ...(Array.isArray((p as any).collections) ? (p as any).collections : [])
        ];

        const inCollection = collectionTokens.some(matchesCollectionToken);
        return inCollection;
      });
      this.tags = Array.from(new Set(this.products.flatMap(p => p.tags || []))).slice(0, 12);
      this.applyFilters();
      if (this.products.length > 0) {
        const siteUrl = this.brandConfig.siteUrl;
        this.seoService.generateItemListSchema(
          this.products.map(p => ({
            name: p.name,
            description: p.description || '',
            imageUrl: p.imageUrl || p.coverImage || '',
            price: p.price || 0,
            currency: 'USD',
            sku: p.sku || p.id || '',
            brand: this.brandConfig.siteName,
            availability: (p.stock && p.stock > 0) ? 'InStock' : 'OutOfStock',
            slug: p.slug
          })),
          this.title || this.slugToTitle(this.slug)
        );
      }
    } catch (err) {
      void 0;
      this.products = [];
      this.filtered = [];
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  applyFilters() {
    const term = this.searchTerm.toLowerCase().trim();
    const activeTags = Array.from(this.selectedTags);

    this.filtered = this.products
      .filter(p => {
        const matchesTerm =
          !term ||
          p.name?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term);
        const matchesTags =
          activeTags.length === 0 ||
          (p.tags || []).some(t => activeTags.includes(t));
        return matchesTerm && matchesTags;
      })
      .sort((a, b) => {
        if (this.sort === 'price-asc') return (a.price || 0) - (b.price || 0);
        if (this.sort === 'price-desc') return (b.price || 0) - (a.price || 0);
        // newest: assume createdAt exists
        return (b.createdAt as any)?.toMillis?.() - (a.createdAt as any)?.toMillis?.();
      });
  }

  toggleTag(tag: string) {
    if (this.selectedTags.has(tag)) {
      this.selectedTags.delete(tag);
    } else {
      this.selectedTags.add(tag);
    }
    this.applyFilters();
  }

  clearFilters() {
    this.selectedTags.clear();
    this.searchTerm = '';
    this.sort = 'newest';
    this.applyFilters();
  }

  private slugToTitle(slug: string): string {
    if (!slug) return 'Collection';
    return slug
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
