import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from '@angular/fire/firestore';
import { ProductReview, ReviewSummary } from '../models/review';
import { Observable, from, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductReviewService {
  private firestore = inject(Firestore);

  /**
   * Check if user has purchased a product
   */
  async canUserReview(userId: string, productId: string): Promise<{ canReview: boolean; orderId?: string; reason?: string }> {
    try {
      // Check if user has completed orders with this product
      const ordersRef = collection(this.firestore, 'orders');
      const q = query(
        ordersRef,
        where('userId', '==', userId),
        where('status', 'in', ['pending', 'processing', 'shipped', 'delivered'])
      );

      const snapshot = await getDocs(q);
      
      for (const orderDoc of snapshot.docs) {
        const orderData = orderDoc.data();
        const items = orderData['items'] || [];
        
        // Check if this order contains the product
        const hasProduct = items.some((item: any) => item.productId === productId);
        
        if (hasProduct) {
          // Check if user already reviewed this product
          const existingReview = await this.getUserReviewForProduct(userId, productId);
          
          if (existingReview) {
            return { 
              canReview: false, 
              reason: 'You have already reviewed this product' 
            };
          }
          
          return { 
            canReview: true, 
            orderId: orderDoc.id 
          };
        }
      }

      return { 
        canReview: false, 
        reason: 'You must purchase this product before leaving a review' 
      };
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      return { 
        canReview: false, 
        reason: 'Unable to verify purchase. Please try again later.' 
      };
    }
  }

  /**
   * Get user's existing review for a product
   */
  private async getUserReviewForProduct(userId: string, productId: string): Promise<ProductReview | null> {
    try {
      const reviewsRef = collection(this.firestore, 'productReviews');
      const q = query(
        reviewsRef,
        where('userId', '==', userId),
        where('productId', '==', productId),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return this.convertToReview(doc.id, doc.data());
    } catch (error) {
      console.error('Error fetching user review:', error);
      return null;
    }
  }

  /**
   * Submit a new product review
   */
  async submitReview(review: Omit<ProductReview, 'id' | 'createdAt' | 'helpful' | 'helpfulBy' | 'verified'>): Promise<string> {
    try {
      const reviewsRef = collection(this.firestore, 'productReviews');
      
      const reviewData = {
        ...review,
        verified: true, // Verified because they must have purchased
        helpful: 0,
        helpfulBy: [],
        status: 'pending', // Requires admin approval
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(reviewsRef, reviewData);
      
      console.log('Review submitted successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error submitting review:', error);
      throw new Error('Failed to submit review. Please try again.');
    }
  }

  /**
   * Get approved reviews for a product
   */
  async getProductReviews(productId: string, limitCount = 10): Promise<ProductReview[]> {
    try {
      const reviewsRef = collection(this.firestore, 'productReviews');
      const q = query(
        reviewsRef,
        where('productId', '==', productId),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => this.convertToReview(doc.id, doc.data()));
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      // Fallback without index: query by productId only and filter locally
      try {
        const reviewsRef = collection(this.firestore, 'productReviews');
        const qFallback = query(
          reviewsRef,
          where('productId', '==', productId),
          limit(limitCount * 2) // grab extra, filter for approved
        );
        const snapshot = await getDocs(qFallback);
        const reviews = snapshot.docs
          .map(doc => this.convertToReview(doc.id, doc.data()))
          .filter(r => r.status === 'approved')
          .sort((a, b) => {
            const aTime = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : 0;
            const bTime = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : 0;
            return bTime - aTime;
          })
          .slice(0, limitCount);
        return reviews;
      } catch (fallbackError) {
        console.error('Fallback review fetch failed:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Get review summary for a product
   */
  async getReviewSummary(productId: string): Promise<ReviewSummary> {
    try {
      const reviewsRef = collection(this.firestore, 'productReviews');
      const q = query(
        reviewsRef,
        where('productId', '==', productId),
        where('status', '==', 'approved')
      );

      const snapshot = await getDocs(q);
      
      const reviews = snapshot.docs.map(doc => this.convertToReview(doc.id, doc.data()));
      
      if (reviews.length === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          verifiedPurchaseCount: 0
        };
      }

      const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      let totalRating = 0;
      let verifiedCount = 0;

      reviews.forEach(review => {
        totalRating += review.rating;
        ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
        if (review.verified) verifiedCount++;
      });

      return {
        averageRating: totalRating / reviews.length,
        totalReviews: reviews.length,
        ratingDistribution,
        verifiedPurchaseCount: verifiedCount
      };
    } catch (error) {
      console.error('Error calculating review summary:', error);
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        verifiedPurchaseCount: 0
      };
    }
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(reviewId: string, userId: string): Promise<void> {
    try {
      const reviewRef = doc(this.firestore, `productReviews/${reviewId}`);
      const reviewDoc = await getDoc(reviewRef);
      
      if (!reviewDoc.exists()) {
        throw new Error('Review not found');
      }

      const helpfulBy = reviewDoc.data()['helpfulBy'] || [];
      
      if (helpfulBy.includes(userId)) {
        // User already marked as helpful, remove it
        await updateDoc(reviewRef, {
          helpful: increment(-1),
          helpfulBy: arrayRemove(userId),
          updatedAt: serverTimestamp()
        });
      } else {
        // Add helpful mark
        await updateDoc(reviewRef, {
          helpful: increment(1),
          helpfulBy: arrayUnion(userId),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error marking review as helpful:', error);
      throw error;
    }
  }

  /**
   * Update review status (admin only)
   */
  async updateReviewStatus(reviewId: string, status: 'approved' | 'rejected'): Promise<void> {
    try {
      const reviewRef = doc(this.firestore, `productReviews/${reviewId}`);
      await updateDoc(reviewRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating review status:', error);
      throw error;
    }
  }

  /**
   * Add admin response to review
   */
  async addAdminResponse(reviewId: string, message: string, adminName: string): Promise<void> {
    try {
      const reviewRef = doc(this.firestore, `productReviews/${reviewId}`);
      await updateDoc(reviewRef, {
        adminResponse: {
          message,
          respondedBy: adminName,
          respondedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding admin response:', error);
      throw error;
    }
  }

  /**
   * Get all reviews (admin only)
   */
  async getAllReviews(status?: 'pending' | 'approved' | 'rejected'): Promise<ProductReview[]> {
    try {
      const reviewsRef = collection(this.firestore, 'productReviews');
      
      let q = query(reviewsRef, orderBy('createdAt', 'desc'));
      
      if (status) {
        q = query(reviewsRef, where('status', '==', status), orderBy('createdAt', 'desc'));
      }

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => this.convertToReview(doc.id, doc.data()));
    } catch (error) {
      console.error('Error fetching all reviews:', error);
      return [];
    }
  }

  /**
   * Delete review (admin only)
   */
  async deleteReview(reviewId: string): Promise<void> {
    try {
      const reviewRef = doc(this.firestore, `productReviews/${reviewId}`);
      await deleteDoc(reviewRef);
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  }

  /**
   * Convert Firestore data to ProductReview
   */
  private convertToReview(id: string, data: any): ProductReview {
    return {
      id,
      productId: data['productId'],
      userId: data['userId'],
      orderId: data['orderId'],
      userName: data['userName'],
      userEmail: data['userEmail'],
      rating: data['rating'],
      title: data['title'],
      comment: data['comment'],
      verified: data['verified'] || false,
      helpful: data['helpful'] || 0,
      helpfulBy: data['helpfulBy'] || [],
      status: data['status'] || 'pending',
      images: data['images'] || [],
      createdAt: data['createdAt']?.toDate() || new Date(),
      updatedAt: data['updatedAt']?.toDate(),
      adminResponse: data['adminResponse'] ? {
        message: data['adminResponse'].message,
        respondedBy: data['adminResponse'].respondedBy,
        respondedAt: data['adminResponse'].respondedAt?.toDate() || new Date()
      } : undefined
    };
  }
}
