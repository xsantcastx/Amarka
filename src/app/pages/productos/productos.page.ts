import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ProductsService } from '../../services/products.service';
import { MediaService } from '../../services/media.service';
import { CategoryService } from '../../services/category.service';
import { ModelService } from '../../services/model.service';
import { TagService } from '../../services/tag.service';
import { CartService } from '../../services/cart.service';
import { SettingsService } from '../../services/settings.service';
import { MetaService } from '../../services/meta.service';
import { Product } from '../../models/product';
import { Category, Model, Tag } from '../../models/catalog';
import { Media } from '../../models/media';
import { PageHeaderComponent, Breadcrumb } from '../../shared/components/page-header/page-header.component';
import { LoadingComponentBase } from '../../core/classes/loading-component.base';
import { firstValueFrom } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-productos-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslateModule, PageHeaderComponent],
  templateUrl: './productos.page.html',
  styleUrl: './productos.page.scss'
})
export class ProductosPageComponent extends LoadingComponentBase implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private productsService = inject(ProductsService);
  private mediaService = inject(MediaService);
  private categoryService = inject(CategoryService);
  private modelService = inject(ModelService);
  private tagService = inject(TagService);
  private cartService = inject(CartService);
  private settingsService = inject(SettingsService);
  private metaService = inject(MetaService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  // Breadcrumbs for navigation
  breadcrumbs: Breadcrumb[] = [
    { label: 'nav.home', url: '/', icon: 'home' },
    { label: 'nav.products', icon: 'products' }
  ];
  
  // Firestore products
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  
  // Products by thickness for display
  productos12mm: Product[] = [];
  productos15mm: Product[] = [];
  productos20mm: Product[] = [];
  
  // Filter options
  categories: Category[] = [];
  models: Model[] = [];
  tags: Tag[] = [];
  allTags: string[] = [];
  selectedCategoryId = '';
  selectedModelId = '';
  selectedTags: string[] = [];
  searchTerm = '';

  async ngOnInit() {
    // Seed search from query param if provided
    this.route.queryParamMap.subscribe(params => {
      const search = params.get('search');
      if (search) {
        this.searchTerm = search;
      }
    });

    // Load filter options
    await this.loadFilterOptions();
    
    // Load products if in browser
    if (isPlatformBrowser(this.platformId)) {
      await this.loadProducts();
    } else {
      // During SSR, set loading to false
      this.setLoading(false);
    }
  }

  private async loadFilterOptions(): Promise<void> {
    try {
      const [categoriesResult, modelsResult, tagsResult] = await Promise.allSettled([
        firstValueFrom(this.categoryService.getActiveCategories()),
        firstValueFrom(this.modelService.getActiveModels()),
        firstValueFrom(this.tagService.getActiveTags())
      ]);

      if (categoriesResult.status === 'fulfilled') {
        this.categories = categoriesResult.value ?? [];
      } else if (categoriesResult.reason) {
        console.error('Error loading categories:', categoriesResult.reason);
      }

      if (modelsResult.status === 'fulfilled') {
        this.models = modelsResult.value ?? [];
      } else if (modelsResult.reason) {
        console.error('Error loading models:', modelsResult.reason);
      }

      if (tagsResult.status === 'fulfilled') {
        this.tags = tagsResult.value ?? [];
      } else if (tagsResult.reason) {
        console.error('Error loading tags:', tagsResult.reason);
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    } finally {
      this.forceUpdate();
    }
  }

  private async loadProducts(): Promise<void> {
    await this.withLoading(async () => {
      // Set page meta tags from settings (fire and forget)
      this.metaService.setPageMeta({
        title: 'NAV.PRODUCTS',
        description: 'PRODUCTS.DESCRIPTION'
      });

      const productsPromise = firstValueFrom(this.productsService.getAllProducts());
      const publicSettingsPromise = this.settingsService.getPublicSettings()
        .catch(error => {
          console.error('Error loading public settings:', error);
          return null;
        });

      const [products, publicSettings] = await Promise.all([productsPromise, publicSettingsPromise]);

      // Filter only published products
      let publishedProducts = (products || []).filter(p => p.status === 'published');

      // Filter out-of-stock products if hideOutOfStock is enabled in public settings
      if (publicSettings?.hideOutOfStock) {
        publishedProducts = publishedProducts.filter(p => {
          const stock = typeof p.stock === 'number' ? p.stock : 0;
          return stock > 0;
        });
      }

      // Show products immediately while cover images resolve asynchronously
      this.allProducts = publishedProducts.map(product => {
        const hasExternalCover = product.coverImage && product.coverImage.includes('http');
        const imageUrl = product.imageUrl || (hasExternalCover ? product.coverImage! : '');
        return { ...product, imageUrl };
      });

      this.extractAllTags();
      this.applyFilters();
      this.forceUpdate();

      if (publishedProducts.length === 0) {
        return;
      }

      // Resolve media covers in the background so the page is responsive sooner
      this.loadProductCovers(publishedProducts)
        .then(productsWithCovers => {
          this.allProducts = productsWithCovers;
          this.applyFilters();
          this.forceUpdate();
        })
        .catch(error => {
          console.error('Error loading product covers:', error);
        });
    });
  }

  private async loadProductCovers(products: Product[]): Promise<Product[]> {
    const productsWithCovers = await Promise.all(
      products.map(async (product) => {
        if (product.coverImage) {
          try {
            // Check if coverImage is a media ID or a URL
            const isMediaId = !product.coverImage.includes('http');
            
            if (isMediaId) {
              const media = await this.mediaService.getMediaById(product.coverImage);
              if (media) {
                return { ...product, imageUrl: media.url };
              }
            } else {
              // Already a URL (legacy products)
              return { ...product, imageUrl: product.coverImage };
            }
          } catch (error) {
            console.error('Error loading cover for product:', product.name, error);
          }
        }
        
        // No cover image or error loading it
        return { ...product, imageUrl: '' };
      })
    );

    return productsWithCovers;
  }

  private extractAllTags() {
    const tagsSet = new Set<string>();
    this.allProducts.forEach(product => {
      if (product.tags && Array.isArray(product.tags)) {
        product.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    this.allTags = Array.from(tagsSet).sort();
  }

  getTagName(tagSlug: string): string {
    const tag = this.tags.find(t => t.slug === tagSlug);
    return tag?.name || tagSlug;
  }

  getTagColor(tagSlug: string): string {
    const tag = this.tags.find(t => t.slug === tagSlug);
    return tag?.color || '#F7931A';
  }

  applyFilters() {
    let filtered = [...this.allProducts];

    // Filter by category
    if (this.selectedCategoryId) {
      filtered = filtered.filter(p => p.categoryId === this.selectedCategoryId);
    }

    // Filter by model
    if (this.selectedModelId) {
      filtered = filtered.filter(p => p.modelId === this.selectedModelId);
    }

    // Filter by tags (products must have ALL selected tags)
    if (this.selectedTags.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.tags || !Array.isArray(p.tags)) return false;
        return this.selectedTags.every(tag => p.tags!.includes(tag));
      });
    }

    // Filter by search term (search in name and slug)
    if (this.searchTerm && this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term) ||
        (p.search_name && p.search_name.includes(term))
      );
    }

    this.filteredProducts = filtered;
    
    // No longer grouping by hardcoded thickness values
    // Products will be grouped dynamically by their actual categories from Firestore
  }

  onCategoryChange() {
    this.applyFilters();
  }

  onModelChange() {
    this.applyFilters();
  }

  onSearchChange() {
    this.applyFilters();
  }

  clearFilters() {
    this.selectedCategoryId = '';
    this.selectedModelId = '';
    this.selectedTags = [];
    this.searchTerm = '';
    this.applyFilters();
  }

  toggleTag(tag: string) {
    const index = this.selectedTags.indexOf(tag);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tag);
    }
    this.applyFilters();
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags.includes(tag);
  }

  goToProduct(product: Product, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (product?.slug) {
      this.router.navigate(['/products', product.slug]);
    }
  }

  addToCart(product: Product, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.cartService.add(product, 1);
  }

  get hasFilters(): boolean {
    return !!(this.selectedCategoryId || this.selectedModelId || this.selectedTags.length > 0 || this.searchTerm);
  }

  get totalProductsCount(): number {
    return this.allProducts.length;
  }

  get filteredProductsCount(): number {
    return this.filteredProducts.length;
  }

  getCategoryName(categoryId: string | undefined): string {
    if (!categoryId) return '';
    const category = this.categories.find(c => c.id === categoryId);
    return category?.name || '';
  }

  getModelName(modelId: string | undefined): string {
    if (!modelId) return '';
    const model = this.models.find(m => m.id === modelId);
    return model?.name || '';
  }

  // Filter panel visibility
  showFilters = false;

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }
}
