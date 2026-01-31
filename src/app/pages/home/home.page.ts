import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ServiceService, ServiceItem } from '../../services/service.service';
import { ProductsService } from '../../services/products.service';
import { Product } from '../../models/product';
import { CollectionsService, CollectionDoc } from '../../services/collections.service';
import { HomeReviewsComponent } from '../../features/home/home-reviews/home-reviews.component';
import { LoadingComponentBase } from '../../core/classes/loading-component.base';
import { MetaService } from '../../services/meta.service';
import { BrandConfigService } from '../../core/services/brand-config.service';
import { LoggerService } from '../../services/logger.service';
import { ThemeService } from '../../services/theme.service';
import type { SeasonalThemeConfig } from '@config';
import { take } from 'rxjs/operators';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, HomeReviewsComponent, ProductCardComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss'
})
export class HomePageComponent extends LoadingComponentBase implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private serviceService = inject(ServiceService);
  private productsService = inject(ProductsService);
  private collectionsService = inject(CollectionsService);
  private metaService = inject(MetaService);
  private router = inject(Router);
  private brandConfig = inject(BrandConfigService);
  private logger = inject(LoggerService);
  private themeService = inject(ThemeService);
  protected override cdr = inject(ChangeDetectorRef);
  
  services: ServiceItem[] = [];
  featuredProducts: Product[] = [];
  featuredProductsAll: Product[] = [];
  bestSellerProducts: Product[] = [];
  newArrivalProducts: Product[] = [];
  heroProducts: Product[] = [];
  collections: CollectionDoc[] = [];
  categoryShowcase: CollectionDoc[] = [];
  collectionImages: Record<string, string> = {};
  heroCollections: CollectionDoc[] = [];
  brandName = this.brandConfig.siteName;
  
  private featuredRotationInterval?: any;
  private featuredRotationIndex = 0;
  private featuredRotationWindow = 8;
  private featuredRotationSeconds = 6;
  activeSeasonalTheme: SeasonalThemeConfig | null = null;
  isSeasonalFeatured = false;
  isValentineSeason = false;

  ngOnInit() {
    this.activeSeasonalTheme = this.themeService.activeSeasonalThemeSnapshot();
    this.isSeasonalFeatured = !!this.activeSeasonalTheme?.featuredProductsTag;
    this.isValentineSeason = this.activeSeasonalTheme?.id === 'valentine';
    this.featuredRotationSeconds = this.activeSeasonalTheme?.featuredRotationSeconds ?? this.featuredRotationSeconds;

    // Set page meta tags from settings
    this.metaService.setPageMeta({
      title: 'page_titles.home',
      description: 'home.hero.subtitle'
    });

    // Only load from service if in browser (not during SSR)
    if (isPlatformBrowser(this.platformId)) {
      this.setLoading(true);
      this.loadAllContent();
    } else {
      // During SSR, set loading to false to show empty state
      this.setLoading(false);
    }
  }

  private async loadAllContent() {
    // Load all content in parallel
    try {
      await Promise.all([
        this.loadCollections(),
        this.loadServicesAsync(),
        this.loadFeaturedProductsAsync(),
        this.loadBestSellersAsync(),
        this.loadNewArrivalsAsync(),
        this.loadHeroProductsAsync()
      ]);
      this.dedupeHomeProducts();
    } catch (error) {
      this.logger.error('HomePage error loading content', error);
    } finally {
      this.setLoading(false);
      this.cdr.detectChanges();
    }
  }

  private async loadServicesAsync() {
    try {
      const services = await this.serviceService.getServices().pipe(take(1)).toPromise();
      this.services = services?.slice(0, 6) || [];
      this.cdr.detectChanges();
    } catch (error) {
      this.logger.error('HomePage error loading services', error);
    }
  }

  private async loadCollections() {
    try {
      this.collections = await this.collectionsService.getAllCollections();
      const activeCollections = this.collections.filter(c => c.active !== false);
      
      this.categoryShowcase = activeCollections
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 6);
      
      // First 4 active collections for hero quick links
      this.heroCollections = activeCollections.slice(0, 4);
      
      // Optional images: map known fields into a lookup
      this.collectionImages = Object.fromEntries(
        this.collections.map(c => [
          c.slug,
          c.heroImageUrl || ''
        ])
      );
      this.cdr.detectChanges();
    } catch (error) {
      this.logger.error('HomePage error loading collections', error);
      this.collections = [];
      this.categoryShowcase = [];
      this.heroCollections = [];
      this.collectionImages = {};
    }
  }

  private async loadFeaturedProductsAsync() {
    try {
      // First try to get products explicitly marked as featured on home
      let products = await this.productsService
        .getFeaturedOnHomeProducts(Math.max(this.featuredRotationWindow, 8))
        .pipe(take(1))
        .toPromise();

      // Fallback: if no explicitly featured products, get latest published products
      if (!products || products.length === 0) {
        this.logger.debug('No products marked as featuredOnHome, falling back to latest products');
        products = await this.productsService
          .getFeaturedProducts(Math.max(this.featuredRotationWindow, 8))
          .pipe(take(1))
          .toPromise();
      }

      this.isSeasonalFeatured = !!this.activeSeasonalTheme?.featuredProductsTag;
      this.featuredProductsAll = products || [];
      this.featuredRotationIndex = 0;
      this.refreshFeaturedRotation();
      this.cdr.detectChanges();
    } catch (error) {
      this.logger.error('HomePage error loading featured products', error);
    }
  }

  private async loadBestSellersAsync() {
    try {
      const products = await this.productsService.getProductsByTag('bestseller', 8).pipe(take(1)).toPromise();
      this.bestSellerProducts = products || [];
      this.cdr.detectChanges();
    } catch (error) {
      this.logger.error('HomePage error loading best sellers', error);
    }
  }

  private async loadNewArrivalsAsync() {
    try {
      const products = await this.productsService.getFeaturedProducts(6).pipe(take(1)).toPromise();
      this.newArrivalProducts = products || [];
      this.cdr.detectChanges();
    } catch (error) {
      this.logger.error('HomePage error loading new arrivals', error);
    }
  }

  private async loadHeroProductsAsync() {
    try {
      const products = await this.productsService.getFeaturedProducts(4).pipe(take(1)).toPromise();
      this.heroProducts = products || [];
      this.cdr.detectChanges();
    } catch (error) {
      this.logger.error('HomePage error loading hero products', error);
    }
  }

  private dedupeHomeProducts() {
    const keyOf = (product: Product) => product.id || product.slug || product.name || '';
    const uniqueList = (list: Product[]) => {
      const seen = new Set<string>();
      return list.filter(product => {
        const key = keyOf(product);
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    this.featuredProductsAll = uniqueList(
      this.featuredProductsAll.length ? this.featuredProductsAll : this.featuredProducts
    );
    this.heroProducts = uniqueList(this.heroProducts);

    const seen = new Set<string>();
    const markSeen = (list: Product[]) => {
      for (const product of list) {
        const key = keyOf(product);
        if (key) {
          seen.add(key);
        }
      }
    };
    markSeen(this.featuredProductsAll);
    markSeen(this.heroProducts);

    const filterAgainstSeen = (list: Product[]) =>
      uniqueList(list).filter(product => {
        const key = keyOf(product);
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    this.bestSellerProducts = filterAgainstSeen(this.bestSellerProducts);
    this.newArrivalProducts = filterAgainstSeen(this.newArrivalProducts);
    this.featuredRotationIndex = 0;
    this.refreshFeaturedRotation();
  }


  private refreshFeaturedRotation() {
    this.stopFeaturedRotation();
    this.featuredProducts = this.buildFeaturedWindow();

    if (!this.shouldRotateFeatured()) {
      return;
    }

    const intervalMs = Math.max(3, this.featuredRotationSeconds) * 1000;
    this.featuredRotationInterval = setInterval(() => {
      if (!this.featuredProductsAll.length) {
        return;
      }
      this.featuredRotationIndex = (this.featuredRotationIndex + 1) % this.featuredProductsAll.length;
      this.featuredProducts = this.buildFeaturedWindow();
      this.cdr.detectChanges();
    }, intervalMs);
  }

  private buildFeaturedWindow(): Product[] {
    if (!this.featuredProductsAll.length) {
      return [];
    }

    if (!this.shouldRotateFeatured()) {
      return this.featuredProductsAll.slice(0, this.featuredRotationWindow);
    }

    const doubled = [...this.featuredProductsAll, ...this.featuredProductsAll];
    return doubled.slice(this.featuredRotationIndex, this.featuredRotationIndex + this.featuredRotationWindow);
  }

  private shouldRotateFeatured(): boolean {
    return this.isSeasonalFeatured && this.featuredProductsAll.length > this.featuredRotationWindow;
  }

  private stopFeaturedRotation() {
    if (this.featuredRotationInterval) {
      clearInterval(this.featuredRotationInterval);
      this.featuredRotationInterval = undefined;
    }
  }

  ngOnDestroy() {
    this.stopFeaturedRotation();
  }

  goToSearch(searchTerm: string) {
    if (searchTerm && searchTerm.trim()) {
      this.router.navigate(['/catalog'], { 
        queryParams: { search: searchTerm.trim() } 
      });
    }
  }

  get featuredBadgeKey(): string {
    return this.isValentineSeason ? 'home.featured.valentine_badge' : 'home.featured.badge';
  }

  get featuredTitleKey(): string {
    return this.isValentineSeason ? 'home.featured.valentine_title' : 'home.featured.title';
  }

  get featuredSubtitleKey(): string {
    return this.isValentineSeason ? 'home.featured.valentine_subtitle' : 'home.featured.subtitle';
  }

}



