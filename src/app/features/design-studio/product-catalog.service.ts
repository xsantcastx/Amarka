import { Injectable } from '@angular/core';
import { PRODUCT_CATALOG } from './product-catalog.data';
import { ProductCategory, ProductTemplate } from './product-catalog.types';

/**
 * Reads the product catalog. Backed by a static in-memory array today;
 * swapping this to a Firestore-backed read (for admin-editable products
 * with zero code changes) only requires changing this one service —
 * every editor/canvas component consumes ProductTemplate objects, never
 * the raw data source.
 */
@Injectable({ providedIn: 'root' })
export class ProductCatalogService {
  private readonly catalog = [...PRODUCT_CATALOG].sort((a, b) => a.sortOrder - b.sortOrder);

  getAll(): ProductTemplate[] {
    return this.catalog;
  }

  getByCategory(category: ProductCategory): ProductTemplate[] {
    return this.catalog.filter(p => p.category === category);
  }

  getCategories(): ProductCategory[] {
    return Array.from(new Set(this.catalog.map(p => p.category)));
  }

  getById(id: string): ProductTemplate | undefined {
    return this.catalog.find(p => p.id === id);
  }

  getBySlug(slug: string): ProductTemplate | undefined {
    return this.catalog.find(p => p.slug === slug);
  }
}
