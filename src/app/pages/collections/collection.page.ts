import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ProductsService } from '../../services/products.service';
import { Product } from '../../models/product';
import { PageHeaderComponent, Breadcrumb } from '../../shared/components/page-header/page-header.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { MetaService } from '../../services/meta.service';
import { CollectionsService, CollectionDoc } from '../../services/collections.service';

type SortOption = 'newest' | 'price-asc' | 'price-desc';

@Component({
  selector: 'app-collection-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, PageHeaderComponent, ProductCardComponent],
  templateUrl: './collection.page.html',
  styleUrls: ['./collection.page.scss']
})
export class CollectionPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productsService = inject(ProductsService);
  private metaService = inject(MetaService);
  private collectionsService = inject(CollectionsService);
  private cdr = inject(ChangeDetectorRef);

  slug = '';
  collectionId = '';
  title = '';
  subtitle = 'Curated personalised gifts crafted with warm materials and thoughtful engraving.';
  collection: CollectionDoc | null = null;
  breadcrumbs: Breadcrumb[] = [
    { label: 'Home', url: '/', icon: 'home' },
    { label: 'Collections', url: '/collections' }
  ];

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
    this.breadcrumbs.push({ label: this.title });
    await this.loadProducts();
  }

  private async loadCollection() {
    this.collection = await this.collectionsService.getCollectionBySlugOnce(this.slug);
    if (this.collection) {
      this.collectionId = this.collection.id || '';
      this.title = this.collection.name;
      this.subtitle = this.collection.description || this.subtitle;
      this.metaService.setPageMeta({
        title: this.collection.seo?.title || this.collection.name,
        description: this.collection.seo?.description || this.subtitle,
        image: this.collection.seo?.image
      });
    } else {
      this.title = this.slugToTitle(this.slug);
      this.metaService.setPageMeta({
        title: this.title,
        description: this.subtitle
      });
    }
    this.cdr.detectChanges();
  }

  private async loadProducts() {
    this.isLoading = true;
    this.cdr.detectChanges();
    try {
      const all = await this.productsService.getAllProductsOnce();
      // Filter by collectionIds if available, else by tag fallback
      const slugLower = this.slug.toLowerCase();
      const collectionIdLower = (this.collectionId || '').toLowerCase();

      this.products = all.filter(p => {
        const inCollection = (p.collectionIds || []).some(id => {
          const normalized = (id || '').toLowerCase();
          return normalized === slugLower || (!!collectionIdLower && normalized === collectionIdLower);
        });
        const tagMatch = (p.tags || []).some(t => t?.toLowerCase() === slugLower);
        return inCollection || tagMatch;
      });
      if (this.products.length === 0) {
        this.products = all.filter(p => p.status !== 'archived');
      }
      this.tags = Array.from(new Set(this.products.flatMap(p => p.tags || []))).slice(0, 12);
      this.applyFilters();
    } catch (err) {
      console.error('Error loading collection products', err);
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
