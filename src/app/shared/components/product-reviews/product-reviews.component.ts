import { Component, Input, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Auth } from '@angular/fire/auth';
import { ProductReviewService } from '../../../services/product-review.service';
import { AuthService } from '../../../services/auth.service';
import { ProductReview, ReviewSummary } from '../../../models/review';

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './product-reviews.component.html',
  styleUrl: './product-reviews.component.scss'
})
export class ProductReviewsComponent implements OnInit {
  @Input({ required: true }) productId!: string;
  @Input() productName?: string;

  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private reviewService = inject(ProductReviewService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  reviews = signal<ProductReview[]>([]);
  summary = signal<ReviewSummary | null>(null);
  canReview = signal(false);
  canReviewReason = signal<string>('');
  orderId = signal<string>('');
  showReviewForm = signal(false);
  submitting = signal(false);
  loading = signal(true);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  reviewForm = this.fb.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
    comment: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1000)]]
  });

  async ngOnInit() {
    await this.loadReviews();
    await this.checkReviewEligibility();
    this.cdr.detectChanges();
  }

  private async loadReviews() {
    this.loading.set(true);
    try {
      const [reviews, summary] = await Promise.all([
        this.reviewService.getProductReviews(this.productId, 20),
        this.reviewService.getReviewSummary(this.productId)
      ]);

      this.reviews.set(reviews);
      this.summary.set(summary);
    } catch (err: any) {
      console.error('Error loading reviews:', err);
      this.error.set('Failed to load reviews');
    } finally {
      this.loading.set(false);
      this.cdr.detectChanges();
    }
  }

  private async checkReviewEligibility() {
    const user = this.auth.currentUser;
    if (!user) {
      this.canReview.set(false);
      this.canReviewReason.set('Please log in to leave a review');
      return;
    }

    try {
      const result = await this.reviewService.canUserReview(user.uid, this.productId);
      this.canReview.set(result.canReview);
      
      if (result.orderId) {
        this.orderId.set(result.orderId);
      }
      
      if (result.reason) {
        this.canReviewReason.set(result.reason);
      }
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error checking review eligibility:', err);
    }
  }

  toggleReviewForm() {
    this.showReviewForm.set(!this.showReviewForm());
    if (this.showReviewForm()) {
      this.reviewForm.reset({ rating: 5 });
      this.error.set(null);
      this.success.set(null);
    }
  }

  async submitReview() {
    if (this.reviewForm.invalid || !this.canReview()) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    const user = this.auth.currentUser;
    if (!user) {
      this.error.set('You must be logged in to submit a review');
      return;
    }

    const userProfile = await this.authService.getUserProfile(user.uid);
    if (!userProfile) {
      this.error.set('Unable to load user profile');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      const formValue = this.reviewForm.value;
      
      await this.reviewService.submitReview({
        productId: this.productId,
        userId: user.uid,
        orderId: this.orderId(),
        userName: userProfile.displayName || 'Anonymous',
        userEmail: userProfile.email,
        rating: formValue.rating!,
        title: formValue.title!,
        comment: formValue.comment!,
        status: 'pending'
      });

      this.success.set('Review submitted successfully! It will appear after admin approval.');
      this.showReviewForm.set(false);
      this.canReview.set(false);
      this.canReviewReason.set('You have already reviewed this product');
      this.reviewForm.reset();

      // Reload reviews after a delay
      setTimeout(() => {
        this.loadReviews();
        this.success.set(null);
      }, 3000);

    } catch (err: any) {
      console.error('Error submitting review:', err);
      this.error.set(err.message || 'Failed to submit review. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  async markHelpful(reviewId: string) {
    const user = this.auth.currentUser;
    if (!user) {
      this.error.set('Please log in to mark reviews as helpful');
      return;
    }

    try {
      await this.reviewService.markHelpful(reviewId, user.uid);
      await this.loadReviews(); // Reload to update helpful count
    } catch (err: any) {
      console.error('Error marking review as helpful:', err);
      this.error.set('Failed to update. Please try again.');
    }
  }

  isHelpfulMarkedByUser(review: ProductReview): boolean {
    const user = this.auth.currentUser;
    if (!user) return false;
    return review.helpfulBy.includes(user.uid);
  }

  setRating(rating: number) {
    this.reviewForm.patchValue({ rating });
  }

  getStarArray(count: number): number[] {
    return Array(count).fill(0);
  }

  getRatingPercentage(rating: number): number {
    const summary = this.summary();
    if (!summary || summary.totalReviews === 0) return 0;
    return (summary.ratingDistribution[rating as keyof typeof summary.ratingDistribution] / summary.totalReviews) * 100;
  }

  getRatingCount(rating: number): number {
    const summary = this.summary();
    if (!summary) return 0;
    return summary.ratingDistribution[rating as keyof typeof summary.ratingDistribution];
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
