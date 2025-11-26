import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, query, where, limit, getDocs } from '@angular/fire/firestore';
import { GalleryService, GalleryImage } from '../../services/gallery.service';
import { ServiceService, ServiceItem } from '../../services/service.service';
import { ProductsService } from '../../services/products.service';
import { Product } from '../../models/product';
import { CollectionsService, CollectionDoc } from '../../services/collections.service';
import { HomeReviewsComponent } from '../../features/home/home-reviews/home-reviews.component';
import { LoadingComponentBase } from '../../core/classes/loading-component.base';
import { MetaService } from '../../services/meta.service';
import { take } from 'rxjs/operators';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HomeReviewsComponent, ProductCardComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss'
})
export class HomePageComponent extends LoadingComponentBase implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private firestore = inject(Firestore);
  private galleryService = inject(GalleryService);
  private serviceService = inject(ServiceService);
  private productsService = inject(ProductsService);
  private collectionsService = inject(CollectionsService);
  private metaService = inject(MetaService);
  private router = inject(Router);
  
  services: ServiceItem[] = [];
  featuredProducts: Product[] = [];
  bestSellerProducts: Product[] = [];
  newArrivalProducts: Product[] = [];
  heroProducts: Product[] = [];
  collections: CollectionDoc[] = [];
  categoryShowcase: CollectionDoc[] = [];
  collectionImages: Record<string, string> = {};
  
  galleryImages: GalleryImage[] = [];
  currentImageIndex = 0;
  private imageRotationInterval?: any;

  ngOnInit() {
    // Set page meta tags from settings
    this.metaService.setPageMeta({
      title: 'page_titles.home',
      description: 'home.hero.subtitle'
    });

    // Only load from service if in browser (not during SSR)
    if (isPlatformBrowser(this.platformId)) {
      this.loadGalleryPreview();
      this.loadServices();
      this.loadFeaturedProducts();
      this.loadBestSellers();
      this.loadNewArrivals();
      this.loadHeroProducts();
      this.loadCollections();
    } else {
      // During SSR, set loading to false to show empty state
      this.setLoading(false);
    }
  }

  private loadServices() {
    this.serviceService.getServices()
      .pipe(take(1))
      .subscribe({
        next: (services: ServiceItem[]) => {
          // Show first 6 services on home page
          this.services = services.slice(0, 6);
        },
        error: (error: any) => {
          console.error('Error loading services:', error);
        }
      });
  }

  private async loadCollections() {
    try {
      this.collections = await this.collectionsService.getAllCollections();
      this.categoryShowcase = this.collections
        .filter(c => c.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 6);
      // Optional images: map known fields into a lookup
      this.collectionImages = Object.fromEntries(
        this.collections.map(c => [
          c.slug,
          (c as any).coverImage || (c as any).imageUrl || ''
        ])
      );
    } catch (error) {
      console.error('Error loading collections:', error);
      this.collections = [];
      this.categoryShowcase = [];
      this.collectionImages = {};
    }
  }

  private loadFeaturedProducts() {
    this.productsService
      .getFeaturedProducts(8)
      .pipe(take(1))
      .subscribe({
        next: products => {
          this.featuredProducts = products;
        },
        error: error => {
          console.error('Error loading featured products:', error);
        }
      });
  }

  private loadBestSellers() {
    this.productsService
      .getProductsByTag('bestseller', 8)
      .pipe(take(1))
      .subscribe({
        next: products => {
          // Fallback to featured if no tagged products
          this.bestSellerProducts = products.length ? products : this.featuredProducts;
        },
        error: error => {
          console.error('Error loading best sellers:', error);
          this.bestSellerProducts = this.featuredProducts;
        }
      });
  }

  private loadNewArrivals() {
    this.productsService
      .getFeaturedProducts(6)
      .pipe(take(1))
      .subscribe({
        next: products => {
          this.newArrivalProducts = products;
        },
        error: error => {
          console.error('Error loading new arrivals:', error);
          this.newArrivalProducts = this.featuredProducts;
        }
      });
  }

  private loadHeroProducts() {
    this.productsService
      .getFeaturedProducts(4)
      .pipe(take(1))
      .subscribe({
        next: products => {
          this.heroProducts = products;
        },
        error: error => {
          console.error('Error loading hero products:', error);
          this.heroProducts = [];
        }
      });
  }

  private async loadGalleryPreview() {
    console.log('Starting to load gallery images...');
    // Load from media collection (same as gallery page)
    const mediaQuery = query(
      collection(this.firestore, 'media'),
      where('relatedEntityType', '==', 'gallery'),
      limit(5)
    );
    
    try {
      const snapshot = await getDocs(mediaQuery);
      const mediaItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      console.log('Gallery images loaded:', mediaItems.length);
      console.log('First image:', mediaItems[0]);
      
      // Convert media items to GalleryImage format for display
      this.galleryImages = mediaItems.map(media => ({
        id: media.id,
        imageUrl: media.url,
        title: media.altText || media.caption,
        uploadedAt: media.uploadedAt
      })) as GalleryImage[];
      
      console.log('galleryImages set to:', this.galleryImages);
      
      // Start auto-rotation if we have multiple images
      if (this.galleryImages.length > 1) {
        this.startImageRotation();
      }
      
      this.setLoading(false);
    } catch (error: any) {
      console.error('Error loading gallery:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      this.setLoading(false);
    }
  }

  private loadLatestImages() {
    this.galleryService.getAllImages()
      .pipe(take(1))
      .subscribe({
        next: (images: GalleryImage[]) => {
          this.galleryImages = images.slice(0, 5);
          this.setLoading(false);
        },
        error: (error: any) => {
          console.error('Error loading gallery:', error);
          this.setLoading(false);
        }
      });
  }

  private startImageRotation() {
    // Clear any existing interval
    if (this.imageRotationInterval) {
      clearInterval(this.imageRotationInterval);
    }
    
    // Rotate image every 5 seconds
    this.imageRotationInterval = setInterval(() => {
      if (this.galleryImages.length > 0) {
        this.currentImageIndex = (this.currentImageIndex + 1) % this.galleryImages.length;
      }
    }, 5000);
  }

  ngOnDestroy() {
    // Clean up interval when component is destroyed
    if (this.imageRotationInterval) {
      clearInterval(this.imageRotationInterval);
    }
  }

  goToSearch(searchTerm: string) {
    if (searchTerm && searchTerm.trim()) {
      this.router.navigate(['/catalog'], { 
        queryParams: { search: searchTerm.trim() } 
      });
    }
  }

}



