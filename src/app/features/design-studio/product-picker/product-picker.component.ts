import { Component, afterNextRender, EventEmitter, Output, inject, signal, computed } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ProductCatalogService } from '../product-catalog.service';
import { DesignProjectService } from '../design-project.service';
import { ProductCategory, ProductTemplate } from '../product-catalog.types';
import { StudioProjectIndexEntry } from '../studio-project.types';
import { ProductSilhouetteComponent } from '../product-silhouette/product-silhouette.component';

export interface ProductPickerSelection {
  productId: string;
  variantId: string;
  colorId: string;
  quantity: number;
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  apparel: 'Apparel',
  drinkware: 'Drinkware',
  promo: 'Promo & Accessories',
};

@Component({
  selector: 'amk-product-picker',
  standalone: true,
  imports: [CommonModule, ProductSilhouetteComponent],
  templateUrl: './product-picker.component.html',
  styleUrl: './product-picker.component.scss'
})
export class ProductPickerComponent {
  private catalog = inject(ProductCatalogService);
  private projectService = inject(DesignProjectService);
  private document = inject(DOCUMENT);

  @Output() productSelected = new EventEmitter<ProductPickerSelection>();
  @Output() projectResumed = new EventEmitter<string>();

  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly categories = this.catalog.getCategories();
  protected readonly activeCategory = signal<ProductCategory>(this.categories[0]);
  protected readonly selectedProduct = signal<ProductTemplate | null>(null);
  protected readonly selectedVariantId = signal<string>('');
  protected readonly selectedColorId = signal<string>('');
  protected readonly quantity = signal<number>(24);

  protected readonly productsInCategory = computed(() =>
    this.catalog.getByCategory(this.activeCategory())
  );

  protected readonly selectedColorHex = computed(() => {
    const product = this.selectedProduct();
    if (!product) return '#8a8a8a';
    return product.colors.find(c => c.id === this.selectedColorId())?.hex ?? product.colors[0]?.hex ?? '#8a8a8a';
  });

  protected readonly selectedColorLabel = computed(() => {
    const product = this.selectedProduct();
    if (!product) return '';
    return product.colors.find(c => c.id === this.selectedColorId())?.label ?? product.colors[0]?.label ?? '';
  });

  protected readonly savedProjects = signal<StudioProjectIndexEntry[]>([]);

  constructor() {
    afterNextRender(() => this.savedProjects.set(this.projectService.listSavedProjects()));
  }

  protected setCategory(category: ProductCategory): void {
    this.activeCategory.set(category);
  }

  protected pickProduct(product: ProductTemplate): void {
    this.selectedProduct.set(product);
    this.selectedVariantId.set(product.variants[0]?.id ?? '');
    this.selectedColorId.set(product.colors[0]?.id ?? '');
    requestAnimationFrame(() => {
      const detail = this.document.getElementById('product-config');
      if (!detail) return;
      const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      detail.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      detail.focus({ preventScroll: true });
    });
  }

  protected backToGrid(): void {
    this.selectedProduct.set(null);
  }

  protected setVariant(id: string): void {
    this.selectedVariantId.set(id);
  }

  protected setColor(id: string): void {
    this.selectedColorId.set(id);
  }

  protected adjustQuantity(delta: number): void {
    this.quantity.update(q => Math.max(1, q + delta));
  }

  protected startDesigning(): void {
    const product = this.selectedProduct();
    if (!product) return;
    this.productSelected.emit({
      productId: product.id,
      variantId: this.selectedVariantId(),
      colorId: this.selectedColorId(),
      quantity: this.quantity(),
    });
  }

  protected productNameFor(id: string): string {
    return this.catalog.getById(id)?.name ?? 'Product';
  }

  protected resume(id: string): void {
    this.projectResumed.emit(id);
  }
}
