import { Component, OnInit, AfterViewInit, PLATFORM_ID, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Title, Meta } from '@angular/platform-browser';
import { ProductsService } from '../../../services/products.service';
import { MediaService } from '../../../services/media.service';
import { CartService } from '../../../services/cart.service';
import { CategoryService } from '../../../services/category.service';
import { ModelService } from '../../../services/model.service';
import { SeoSchemaService } from '../../../services/seo-schema.service';
import { BrandConfigService } from '../../../core/services/brand-config.service';
import { ProductReviewService } from '../../../services/product-review.service';
import { BulkPricingTier, Product, ProductVariant } from '../../../models/product';
import { Media } from '../../../models/media';
import { Category } from '../../../models/catalog';
import { Model } from '../../../models/catalog';
import { ReviewSummary } from '../../../models/review';
import { ImageLightboxComponent, LightboxImage } from '../../../shared/components/image-lightbox/image-lightbox.component';
import { ProductReviewsComponent } from '../../../shared/components/product-reviews/product-reviews.component';
import { StorageService } from '../../../services/storage.service';
import { firstValueFrom, Subscription } from 'rxjs';

@Component({
  selector: 'app-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, ImageLightboxComponent, ProductReviewsComponent],
  templateUrl: './detalle.component.html'
})
export class DetalleComponent implements OnInit, AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private productsService = inject(ProductsService);
  private mediaService = inject(MediaService);
  private cartService = inject(CartService);
  private categoryService = inject(CategoryService);
  private modelService = inject(ModelService);
  private reviewService = inject(ProductReviewService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private seoSchemaService = inject(SeoSchemaService);
  private brandConfig = inject(BrandConfigService);
  private cdr = inject(ChangeDetectorRef);
  private storageService = inject(StorageService);
  
  producto: Product | undefined;
  category: Category | undefined;
  model: Model | undefined;
  selectedVariant: ProductVariant | null = null;
  selectedVariantId: string | null = null;
  selectedVariantImageUrl: string | null = null;
  private variantImageCache: Record<string, string> = {};
  reviewSummary: ReviewSummary | null = null;
  productosRelacionados: Product[] = [];
  coverImage: Media | undefined;
  galleryImages: Media[] = [];
  carouselImages: LightboxImage[] = [];
  placeholderSlots: number[] = [];
  currentImageIndex = 0;
  loading = true;
  lightboxOpen = false;
  currentLightboxImage = '';
  currentLightboxAlt = '';
  private dataLoaded = false;
  addInProgress = false;
  addSuccess = false;
  addError = '';
  private routeSubscription?: Subscription;

  async ngOnInit() {
    // Subscribe to route param changes to reload when navigating between products
    this.routeSubscription = this.route.paramMap.subscribe(async (params) => {
      const slug = params.get('slug');
      if (slug) {
        // Scroll to top when loading new product
        if (isPlatformBrowser(this.platformId)) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        await this.loadProducto(slug);
      } else {
        this.loading = false;
      }
    });
  }

  async ngAfterViewInit() {
    // Ensure data loads even if ngOnInit was skipped during SSR
    if (!this.dataLoaded && isPlatformBrowser(this.platformId)) {
      const slug = this.route.snapshot.paramMap.get('slug');
      if (slug && !this.producto) {
        await this.loadProducto(slug);
        this.cdr.detectChanges();
      }
    }
  }

  private async loadProducto(slug: string) {
    this.dataLoaded = true;
    this.loading = true;

    try {
      const producto = await firstValueFrom(this.productsService.getProductBySlug(slug));

      if (!producto || producto.status !== 'published') {
        this.router.navigate(['/404']);
        return;
      }

      this.producto = producto;
      this.cdr.detectChanges();

      const [category, model, reviewSummary] = await Promise.all([
        producto.categoryId ? firstValueFrom(this.categoryService.getCategory(producto.categoryId)) : Promise.resolve(null),
        producto.modelId ? firstValueFrom(this.modelService.getModel(producto.modelId)) : Promise.resolve(null),
        this.reviewService.getReviewSummary(producto.id!).catch(() => null) // Load review summary
      ]);

      this.category = category || undefined;
      this.model = model || undefined;
      this.reviewSummary = reviewSummary;

      await this.loadProductMediaAssets();
      await this.resolveVariantImages();
      this.initVariantSelection();

      this.updatePlaceholderSlots();
      this.prepareCarouselImages();
      this.updateSEO();

      void this.loadProductosRelacionados();
    } catch (error) {
      console.error('Error loading product:', error);
      this.router.navigate(['/404']);
    } finally {
      this.loading = false;
      if (isPlatformBrowser(this.platformId)) {
        this.cdr.detectChanges();
      }
    }
  }

  private async loadProductMediaAssets(): Promise<void> {
    if (!this.producto) {
      this.coverImage = undefined;
      this.galleryImages = [];
      return;
    }

    try {
      if (this.producto.coverImage) {
        const isMediaId = !this.producto.coverImage.includes('http');
        if (isMediaId) {
          const media = await this.mediaService.getMediaById(this.producto.coverImage);
          if (media) {
            this.coverImage = media;
          } else if (this.producto.imageUrl) {
            this.coverImage = this.createMediaFromUrl(this.producto.imageUrl, this.producto.name);
          }
        } else {
          this.coverImage = this.createMediaFromUrl(this.producto.coverImage, this.producto.name);
        }
      } else if (this.producto.imageUrl) {
        this.coverImage = this.createMediaFromUrl(this.producto.imageUrl, this.producto.name);
      } else {
        this.coverImage = undefined;
      }

      if (this.producto.galleryImageIds && this.producto.galleryImageIds.length > 0) {
        this.galleryImages = await this.resolveGalleryEntries(this.producto.galleryImageIds);
      } else {
        this.galleryImages = [];
      }
    } catch (error) {
      console.error('Error loading product media:', error);
      if (!this.coverImage && this.producto.imageUrl) {
        this.coverImage = this.createMediaFromUrl(this.producto.imageUrl, this.producto.name);
      }
    }
  }

  getActiveVariants(): ProductVariant[] {
    return (this.producto?.variants || []).filter(variant => variant.active !== false);
  }

  private getVariantKey(variant: ProductVariant, index: number): string {
    return variant.id || variant.sku || variant.label || `variant-${index}`;
  }

  private getVariantImageUrl(variant: ProductVariant, index: number): string | null {
    if (variant.imageUrl) {
      return variant.imageUrl;
    }
    const key = this.getVariantKey(variant, index);
    return this.variantImageCache[key] || null;
  }

  private initVariantSelection(): void {
    const variants = this.getActiveVariants();
    if (!variants.length) {
      this.selectedVariant = null;
      this.selectedVariantId = null;
      this.selectedVariantImageUrl = null;
      return;
    }

    const existingIndex = variants.findIndex((variant, index) => this.getVariantKey(variant, index) === this.selectedVariantId);
    const targetIndex = existingIndex >= 0 ? existingIndex : 0;
    const variant = variants[targetIndex];
    this.selectedVariant = variant;
    this.selectedVariantId = this.getVariantKey(variant, targetIndex);
    this.selectedVariantImageUrl = this.getVariantImageUrl(variant, targetIndex);
  }

  async selectVariant(variant: ProductVariant, index: number): Promise<void> {
    this.selectedVariant = variant;
    this.selectedVariantId = this.getVariantKey(variant, index);
    this.selectedVariantImageUrl = this.getVariantImageUrl(variant, index);
    this.prepareCarouselImages();
    this.cdr.detectChanges();
  }

  private normalizeBulkPricingTiers(tiers?: BulkPricingTier[]): BulkPricingTier[] {
    if (!tiers || !Array.isArray(tiers)) {
      return [];
    }

    return tiers
      .map(tier => ({
        minQty: Math.max(1, Math.floor(Number(tier.minQty || 0))),
        unitPrice: Number(tier.unitPrice || 0),
        label: tier.label
      }))
      .filter(tier => Number.isFinite(tier.minQty) && Number.isFinite(tier.unitPrice) && tier.unitPrice >= 0)
      .sort((a, b) => a.minQty - b.minQty);
  }

  get bulkPricingTiers(): BulkPricingTier[] {
    return this.normalizeBulkPricingTiers(this.producto?.bulkPricingTiers);
  }

  get hasVariants(): boolean {
    return this.getActiveVariants().length > 0;
  }

  getVariantDisplayLabel(variant: ProductVariant, index: number): string {
    return variant.label || variant.finish || variant.sku || `Variant ${index + 1}`;
  }

  get displayPrice(): number {
    const basePrice = this.selectedVariant?.price ?? this.producto?.price ?? 0;
    if (!this.bulkPricingTiers.length) {
      return basePrice;
    }
    if (basePrice > 0) {
      const applicable = this.bulkPricingTiers.filter(tier => 1 >= tier.minQty);
      if (!applicable.length) {
        return basePrice;
      }
      return applicable[applicable.length - 1].unitPrice;
    }
    return this.bulkPricingTiers[0].unitPrice;
  }

  get minTierPrice(): number | null {
    if (!this.bulkPricingTiers.length) {
      return null;
    }
    return this.bulkPricingTiers.reduce((min, tier) => Math.min(min, tier.unitPrice), this.bulkPricingTiers[0].unitPrice);
  }

  private async resolveVariantImages(): Promise<void> {
    if (!this.producto?.variants?.length) {
      return;
    }

    const variants = this.producto.variants;
    for (let index = 0; index < variants.length; index += 1) {
      const variant = variants[index];
      const key = this.getVariantKey(variant, index);

      if (variant.imageUrl) {
        this.variantImageCache[key] = variant.imageUrl;
        continue;
      }

      if (!variant.imageId) {
        continue;
      }

      try {
        if (variant.imageId.startsWith('http')) {
          this.variantImageCache[key] = variant.imageId;
          variant.imageUrl = variant.imageId;
          continue;
        }

        if (variant.imageId.startsWith('gs://') || variant.imageId.startsWith('products/')) {
          const url = await this.storageService.getDownloadUrl(variant.imageId);
          this.variantImageCache[key] = url;
          variant.imageUrl = url;
          continue;
        }

        const media = await this.mediaService.getMediaById(variant.imageId);
        if (media?.url) {
          this.variantImageCache[key] = media.url;
          variant.imageUrl = media.url;
        }
      } catch (error) {
        console.error('Error resolving variant image:', error);
      }
    }
  }

  private async loadProductosRelacionados() {
    if (!this.producto) {
      this.productosRelacionados = [];
      return;
    }

    try {
      const todosLosProductos = await firstValueFrom(this.productsService.getAllProducts());

      let related = todosLosProductos
        .filter(p =>
          p.status === 'published' &&
          p.id !== this.producto!.id &&
          p.categoryId === this.producto!.categoryId
        )
        .slice(0, 3);

      if (related.length < 3) {
        const additional = todosLosProductos
          .filter(p =>
            p.status === 'published' &&
            p.id !== this.producto!.id &&
            !related.find(r => r.id === p.id)
          )
          .slice(0, 3 - related.length);

        related = [...related, ...additional];
      }

      this.productosRelacionados = await Promise.all(
        related.map(async (product) => {
          if (product.coverImage) {
            const isMediaId = !product.coverImage.includes('http');
            if (isMediaId) {
              const media = await this.mediaService.getMediaById(product.coverImage);
              if (media) {
                return { ...product, imageUrl: media.url };
              }
            } else {
              return { ...product, imageUrl: product.coverImage };
            }
          }
          return product;
        })
      );

      if (isPlatformBrowser(this.platformId)) {
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error loading related products:', error);
      this.productosRelacionados = [];
    }
  }

  private updateSEO() {
    if (!this.producto) return;
    
    // Update page title
    const title = this.producto.seo?.title || `${this.producto.name} - ${this.brandConfig.siteName}`;
    this.titleService.setTitle(title);
    
    // Update meta description
    const description = this.producto.seo?.metaDescription || this.producto.description || '';
    this.metaService.updateTag({ name: 'description', content: description });
    
    // Update Open Graph tags
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    
    if (this.coverImage?.url) {
      this.metaService.updateTag({ property: 'og:image', content: this.coverImage.url });
    }

    // 🎯 Generate Product Schema with Review Data
    const productSchemaData: any = {
      name: this.producto.name,
      description: description,
      imageUrl: this.coverImage?.url || this.producto.imageUrl || '',
      price: this.producto.price || 0,
      currency: 'EUR',
      sku: this.producto.sku || `TLM-${this.producto.id}`,
      brand: this.brandConfig.siteName,
      availability: (this.producto.stock && this.producto.stock > 0) ? 'InStock' : 'OutOfStock',
      condition: 'NewCondition',
      slug: this.producto.slug
    };

    // Add review rating if available
    if (this.reviewSummary && this.reviewSummary.totalReviews > 0) {
      productSchemaData.rating = {
        value: this.reviewSummary.averageRating,
        count: this.reviewSummary.totalReviews
      };
    }

    this.seoSchemaService.generateProductSchema(productSchemaData);

    // 🎯 Generate Breadcrumb Schema
    const breadcrumbs = [
      { name: 'Home', url: 'https://amarka.com/' },
      { name: 'Products', url: 'https://amarka.com/productos' }
    ];
    
    if (this.category) {
      breadcrumbs.push({
        name: this.category.name,
        url: `https://amarka.com/productos?category=${this.category.slug}`
      });
    }
    
    breadcrumbs.push({
      name: this.producto.name,
      url: `https://amarka.com/products/${this.producto.slug}`
    });

    this.seoSchemaService.generateBreadcrumbSchema(breadcrumbs);
  }

  get currentCarouselImage(): LightboxImage | undefined {
    if (!this.carouselImages.length) {
      return undefined;
    }
    const index = this.normalizeCarouselIndex(this.currentImageIndex);
    return this.carouselImages[index];
  }

  showNextImage(event?: Event) {
    event?.stopPropagation();
    if (this.carouselImages.length < 2) {
      return;
    }
    this.currentImageIndex = this.normalizeCarouselIndex(this.currentImageIndex + 1);
    this.syncCurrentLightboxData();
  }

  showPreviousImage(event?: Event) {
    event?.stopPropagation();
    if (this.carouselImages.length < 2) {
      return;
    }
    this.currentImageIndex = this.normalizeCarouselIndex(this.currentImageIndex - 1);
    this.syncCurrentLightboxData();
  }

  openLightboxAt(index: number) {
    if (this.carouselImages.length === 0) {
      const fallback = this.coverImage?.url || this.producto?.imageUrl || '';
      if (!fallback) {
        return;
      }
      this.currentLightboxImage = fallback;
      this.currentLightboxAlt = this.producto?.name || '';
      this.lightboxOpen = true;
      return;
    }

    this.currentImageIndex = this.normalizeCarouselIndex(index);
    this.syncCurrentLightboxData();
    if (this.currentLightboxImage) {
      this.lightboxOpen = true;
    }
  }

  openLightboxForGalleryImage(image: Media) {
    const index = this.findCarouselIndex({ id: image.id, url: image.url });
    if (index !== -1) {
      this.currentImageIndex = index;
      this.syncCurrentLightboxData();
      this.cdr.detectChanges();
    }
  }

  onLightboxIndexChange(index: number) {
    this.currentImageIndex = this.normalizeCarouselIndex(index);
    this.syncCurrentLightboxData();
  }

  isCurrentCarouselImage(image: Media): boolean {
    if (!this.carouselImages.length) {
      return false;
    }
    const index = this.findCarouselIndex({ id: image.id, url: image.url });
    if (index === -1) {
      return false;
    }
    return index === this.normalizeCarouselIndex(this.currentImageIndex);
  }

  goBack() {
    this.router.navigate(['/productos']);
  }

  openLightbox(imageUrl?: string, altText?: string) {
    if (imageUrl) {
      const index = this.findCarouselIndex({ url: imageUrl });
      if (index !== -1) {
        this.openLightboxAt(index);
        return;
      }
    }

    if (this.carouselImages.length > 0) {
      this.openLightboxAt(this.currentImageIndex);
      return;
    }

    const fallbackUrl = imageUrl || this.coverImage?.url || this.producto?.imageUrl || '';
    if (!fallbackUrl) {
      return;
    }

    this.currentLightboxImage = fallbackUrl;
    this.currentLightboxAlt = altText || this.producto?.name || '';
    this.lightboxOpen = true;
  }

  async addToCart() {
    if (!this.producto || this.addInProgress) return;

    const variants = this.getActiveVariants();
    if (variants.length > 0 && !this.selectedVariant) {
      this.addError = 'Please select a variant';
      this.cdr.detectChanges();
      return;
    }
    
    this.addInProgress = true;
    this.addError = '';
    this.cdr.detectChanges();

    try {
      await this.cartService.add(this.producto, 1, this.selectedVariant || undefined);
      this.addSuccess = true;
      setTimeout(() => {
        this.addSuccess = false;
        this.cdr.detectChanges();
      }, 2400);
    } catch (error: any) {
      console.error('Error adding product to cart:', error);
      this.addError = error?.message || 'Could not add to cart';
    } finally {
      this.addInProgress = false;
      this.cdr.detectChanges();
    }
  }

  getAdditionalSpecKeys(): string[] {
    if (!this.producto?.specs) return [];
    
    const knownKeys = [
      'size', 'finish', 'thicknessMm', 'usage',
      'hashRate', 'powerConsumption', 'efficiency', 'algorithm',
      'chipType', 'cooling', 'dimensions', 'weight', 'temperature',
      'network', 'voltage', 'warranty',
      'waterAbsorption', 'abrasionResistance', 'chemicalResistance', 'fireResistance'
    ];
    
    return Object.keys(this.producto.specs).filter(key => !knownKeys.includes(key));
  }

  formatSpecLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' ')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Get SVG path for benefit icon
   */
  getBenefitIconPath(iconType: string): string {
    const iconPaths: Record<string, string> = {
      'performance': 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
      'efficiency': 'M13 10V3L4 14h7v7l9-11h-7z',
      'reliability': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'support': 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z',
      'quality': 'M5 13l4 4L19 7',
      'security': 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      'warranty': 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      'design': 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
      'value': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    };
    return iconPaths[iconType] || iconPaths['performance'];
  }

  private prepareCarouselImages() {
    const images: LightboxImage[] = [];
    const productName = this.producto?.name || '';

    if (this.selectedVariantImageUrl) {
      images.push({
        id: `variant-${this.selectedVariantId || 'selected'}`,
        url: this.selectedVariantImageUrl,
        altText: this.selectedVariant?.label || productName
      });
    }

    if (this.coverImage?.url) {
      images.push({
        id: this.coverImage.id ?? 'cover-image',
        url: this.coverImage.url,
        altText: this.coverImage.altText || productName,
        thumbnailUrl: this.coverImage.thumbnailUrl,
        caption: this.coverImage.caption
      });
    } else if (this.producto?.coverImage && this.producto.coverImage.includes('http')) {
      images.push({
        id: 'cover-image',
        url: this.producto.coverImage,
        altText: productName
      });
    } else if (this.producto?.imageUrl) {
      images.push({
        id: 'legacy-cover-image',
        url: this.producto.imageUrl,
        altText: productName
      });
    }

    for (const galleryImage of this.galleryImages) {
      if (!galleryImage?.url) {
        continue;
      }
      images.push({
        id: galleryImage.id,
        url: galleryImage.url,
        altText: galleryImage.altText || productName,
        thumbnailUrl: galleryImage.thumbnailUrl,
        caption: galleryImage.caption
      });
    }

    const uniqueImages: LightboxImage[] = [];
    const seen = new Set<string>();
    for (const image of images) {
      if (!image.url || seen.has(image.url)) {
        continue;
      }
      seen.add(image.url);
      uniqueImages.push(image);
    }

    this.carouselImages = uniqueImages;
    this.currentImageIndex = this.normalizeCarouselIndex(this.currentImageIndex);
    this.syncCurrentLightboxData();
  }

  private updatePlaceholderSlots() {
    const count = Math.max(0, 4 - this.galleryImages.length);
    this.placeholderSlots = Array.from({ length: count }, (_, index) => index);
  }

  private normalizeCarouselIndex(index: number): number {
    const length = this.carouselImages.length;
    if (length === 0) {
      return 0;
    }

    const normalized = index % length;
    return normalized < 0 ? normalized + length : normalized;
  }

  private findCarouselIndex(image: { id?: string; url?: string }) {
    if (!this.carouselImages.length) {
      return -1;
    }

    return this.carouselImages.findIndex(item => {
      if (image.id && item.id && image.id === item.id) {
        return true;
      }
      if (image.url && item.url === image.url) {
        return true;
      }
      return false;
    });
  }

  private syncCurrentLightboxData() {
    const current = this.currentCarouselImage;
    if (current) {
      this.currentLightboxImage = current.url;
      this.currentLightboxAlt = current.altText || this.producto?.name || '';
      return;
    }

    if (this.coverImage?.url) {
      this.currentLightboxImage = this.coverImage.url;
      this.currentLightboxAlt = this.coverImage.altText || this.producto?.name || '';
      return;
    }

    this.currentLightboxImage = this.producto?.imageUrl || '';
    this.currentLightboxAlt = this.producto?.name || '';
  }

  private createMediaFromUrl(url: string, altText?: string): Media {
    return {
      url,
      filename: '',
      storagePath: '',
      width: 0,
      height: 0,
      size: 0,
      mimeType: '',
      uploadedAt: new Date(0),
      uploadedBy: '',
      tags: [],
      altText
    };
  }

  private async resolveGalleryEntries(entries: string[]): Promise<Media[]> {
    const resolved: Media[] = [];
    const productName = this.producto?.name || '';

    for (const raw of entries) {
      const entry = (raw || '').trim();
      if (!entry) continue;

      // Direct URL provided
      if (entry.startsWith('http://') || entry.startsWith('https://')) {
        resolved.push(this.createMediaFromUrl(entry, productName));
        continue;
      }

      // Storage path or gs:// URL
      if (entry.startsWith('gs://') || entry.includes('/')) {
        try {
          const url = await this.storageService.getDownloadUrl(entry);
          resolved.push(this.createMediaFromUrl(url, productName));
          continue;
        } catch (storageError) {
          console.warn('Unable to resolve storage path for gallery image', entry, storageError);
        }
      }

      // Firestore media document ID
      try {
        const media = await this.mediaService.getMediaById(entry);
        if (media?.url) {
          resolved.push(media);
        }
      } catch (mediaError) {
        console.warn('Unable to load media by ID', entry, mediaError);
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    return resolved.filter(image => {
      if (!image?.url) return false;
      if (seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
  }

  ngOnDestroy() {
    // Clean up route subscription
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }
}
