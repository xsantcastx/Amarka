import { Component, Input, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Product } from '../../../models/product';
import { CartService } from '../../../services/cart.service';
import { ProductReviewService } from '../../../services/product-review.service';
import { ReviewSummary } from '../../../models/review';

@Component({
  standalone: true,
  selector: 'ts-product-card',
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private reviewService = inject(ProductReviewService);

  @Input() product!: Product;
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Input() categoryPath?: string; // e.g., "Antminer S19" for routing
  @Input() reviewSummary?: ReviewSummary; // Optional pre-loaded review summary

  adding = false;
  loadedReviewSummary: ReviewSummary | null = null;

  constructor(private cart: CartService, private router: Router) {}

  async ngOnInit() {
    // Load review summary if not provided and product has an ID
    if (!this.reviewSummary && this.product?.id && isPlatformBrowser(this.platformId)) {
      try {
        this.loadedReviewSummary = await this.reviewService.getReviewSummary(this.product.id);
      } catch {
        // Silently fail - reviews are optional
      }
    }
  }

  get effectiveReviewSummary(): ReviewSummary | null {
    return this.reviewSummary || this.loadedReviewSummary;
  }

  get hasReviews(): boolean {
    const summary = this.effectiveReviewSummary;
    return !!summary && summary.totalReviews > 0;
  }

  get averageRating(): number {
    return this.effectiveReviewSummary?.averageRating || 0;
  }

  get totalReviews(): number {
    return this.effectiveReviewSummary?.totalReviews || 0;
  }

  getStarClass(starIndex: number): string {
    const rating = this.averageRating;
    if (starIndex <= Math.floor(rating)) {
      return 'text-amber-400'; // Full star
    } else if (starIndex === Math.ceil(rating) && rating % 1 >= 0.5) {
      return 'text-amber-400'; // Half star (show as full for simplicity)
    }
    return 'text-gray-300'; // Empty star
  }

  // Stock indicator methods
  get stockLevel(): number {
    return this.product?.stock ?? -1; // -1 means stock not tracked
  }

  get isLowStock(): boolean {
    return this.stockLevel > 0 && this.stockLevel <= 5;
  }

  get isOutOfStock(): boolean {
    return this.stockLevel === 0;
  }

  get showStockIndicator(): boolean {
    return this.isLowStock || this.isOutOfStock;
  }

  get stockIndicatorText(): string {
    if (this.isOutOfStock) {
      return 'Out of stock';
    }
    if (this.isLowStock) {
      return `Only ${this.stockLevel} left`;
    }
    return '';
  }

  get stockIndicatorClass(): string {
    if (this.isOutOfStock) {
      return 'bg-rose-100 text-rose-700 border-rose-200';
    }
    if (this.isLowStock) {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    }
    return '';
  }

  add() {
    if (this.hasVariants()) {
      this.router.navigate(this.getProductRoute());
      return;
    }

    this.adding = true;
    this.cart.add(this.product, 1);
    setTimeout(() => this.adding = false, 800);
  }

  hasVariants(): boolean {
    return (this.product.variants || []).some(variant => variant.active !== false);
  }

  getProductRoute(): string[] {
    return ['/products', this.product.slug || this.product.id || ''];
  }
}
