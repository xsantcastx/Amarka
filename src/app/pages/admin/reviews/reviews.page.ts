import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductReviewService } from '../../../services/product-review.service';
import { ProductsService } from '../../../services/products.service';
import { AuthService } from '../../../services/auth.service';
import { ProductReview } from '../../../models/review';
import { Product } from '../../../models/product';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminSidebarComponent],
  templateUrl: './reviews.page.html',
  styleUrls: ['./reviews.page.scss']
})
export class AdminReviewsPage implements OnInit {
  reviews = signal<ProductReview[]>([]);
  products = signal<Map<string, Product>>(new Map());
  loading = signal(true);
  error = signal<string | null>(null);
  
  selectedStatus = signal<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  selectedReview = signal<ProductReview | null>(null);
  adminResponse = signal('');
  submitting = signal(false);

  constructor(
    private reviewService: ProductReviewService,
    private productsService: ProductsService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.loadReviews();
    await this.loadProducts();
  }

  async loadReviews() {
    this.loading.set(true);
    this.error.set(null);
    
    try {
      const selectedStatus = this.selectedStatus();
      const status = selectedStatus === 'all' ? undefined : selectedStatus as 'pending' | 'approved' | 'rejected';
      const reviews = await this.reviewService.getAllReviews(status);
      this.reviews.set(reviews);
    } catch (err: any) {
      void 0;
      this.error.set('Failed to load reviews. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadProducts() {
    try {
      const products = await this.productsService.getAllProducts().toPromise();
      const productMap = new Map<string, Product>();
      products?.forEach(p => productMap.set(p.id!, p));
      this.products.set(productMap);
    } catch (err) {
      void 0;
    }
  }

  async filterByStatus(status: 'all' | 'pending' | 'approved' | 'rejected') {
    this.selectedStatus.set(status);
    await this.loadReviews();
  }

  async approveReview(reviewId: string) {
    if (!confirm('Approve this review?')) return;

    this.submitting.set(true);
    try {
      await this.reviewService.updateReviewStatus(reviewId, 'approved');
      await this.loadReviews();
    } catch (err: any) {
      void 0;
      this.error.set('Failed to approve review. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  async rejectReview(reviewId: string) {
    if (!confirm('Reject this review? It will not be visible to customers.')) return;

    this.submitting.set(true);
    try {
      await this.reviewService.updateReviewStatus(reviewId, 'rejected');
      await this.loadReviews();
    } catch (err: any) {
      void 0;
      this.error.set('Failed to reject review. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  async deleteReview(reviewId: string) {
    if (!confirm('Permanently delete this review? This action cannot be undone.')) return;

    this.submitting.set(true);
    try {
      await this.reviewService.deleteReview(reviewId);
      await this.loadReviews();
    } catch (err: any) {
      void 0;
      this.error.set('Failed to delete review. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  openResponseModal(review: ProductReview) {
    this.selectedReview.set(review);
    this.adminResponse.set(review.adminResponse?.message || '');
  }

  closeResponseModal() {
    this.selectedReview.set(null);
    this.adminResponse.set('');
  }

  async submitResponse() {
    const review = this.selectedReview();
    if (!review || !this.adminResponse().trim()) return;

    const user = await this.authService.getCurrentUser();
    if (!user) {
      this.error.set('You must be logged in to respond');
      return;
    }

    this.submitting.set(true);
    try {
      await this.reviewService.addAdminResponse(
        review.id!,
        this.adminResponse().trim(),
        user.displayName || user.email || 'Admin'
      );
      await this.loadReviews();
      this.closeResponseModal();
    } catch (err: any) {
      void 0;
      this.error.set('Failed to submit response. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  getProductName(productId: string): string {
    return this.products().get(productId)?.name || 'Unknown Product';
  }

  getStarArray(rating: number): number[] {
    return Array(rating).fill(0);
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-ts-bg-soft text-ts-ink-soft border-ts-line';
    }
  }

  getFilterButtonClass(status: 'all' | 'pending' | 'approved' | 'rejected'): string {
    const isActive = this.selectedStatus() === status;
    return isActive
      ? 'px-4 py-2 rounded-full bg-accent text-neutral text-sm font-semibold shadow-sm'
      : 'px-4 py-2 rounded-full border border-ts-line text-ts-ink-soft text-sm font-semibold hover:text-ts-ink hover:border-ts-ink/30 transition-colors';
  }
}
