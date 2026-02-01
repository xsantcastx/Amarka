import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, query, setDoc, where } from '@angular/fire/firestore';
import { Observable, catchError, from, of } from 'rxjs';

export interface SiteStats {
  totalSales: number;
  customerSatisfaction: number;
  uptimeGuarantee: number;
  yearsExperience: number;
}

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private firestore = inject(Firestore);

  // Company founding date
  private readonly FOUNDING_DATE = new Date('2024-06-01');

  /**
   * Get all site statistics
   * First tries to get from a public stats document, falls back to calculating
   */
  getStats(): Observable<SiteStats> {
    return from(this.fetchStats()).pipe(
      catchError(error => {
        void 0;
        return of(this.getDefaultStats());
      })
    );
  }

  private async fetchStats(): Promise<SiteStats> {
    // Try to get pre-calculated stats from a public document
    // This should be updated by a Cloud Function or admin action
    try {
      const statsDocRef = doc(this.firestore, 'settings/public');
      const statsDoc = await getDoc(statsDocRef);

      if (statsDoc.exists()) {
        const data = statsDoc.data();
        if (data['stats']) {
          return this.normalizeStatsFromSource(data['stats']);
        }
      }
    } catch (error) {
      void 0;
    }

    // If no pre-calculated stats, try to fetch from surveys (public read)
    const customerSatisfaction = await this.getCustomerSatisfaction();

    return this.normalizeStats({
      totalSales: 0, // Will be updated via admin or Cloud Function
      customerSatisfaction,
      uptimeGuarantee: 99.9,
      yearsExperience: this.calculateYearsExperience()
    });
  }

  /**
   * Get average customer satisfaction from surveys
   * Assumes you have a 'surveys' collection with a 'rating' field (1-100 or 1-5 scale)
   */
  private async getCustomerSatisfaction(): Promise<number> {
    try {
      const surveysRef = collection(this.firestore, 'surveys');
      const snapshot = await getDocs(surveysRef);

      if (snapshot.empty) {
        // Default to 98% if no surveys yet
        void 0;
        return 98;
      }

      let totalRating = 0;
      let count = 0;

      snapshot.forEach(docSnapshot => {
        const data = docSnapshot.data();
        if (data['rating']) {
          // If rating is 1-5, convert to percentage
          const rating = data['rating'];
          const normalizedRating = rating <= 5 ? (rating / 5) * 100 : rating;
          totalRating += normalizedRating;
          count++;
        }
      });

      if (count === 0) {
        return 98;
      }

      return Math.round(totalRating / count);
    } catch (error: any) {
      // If surveys collection doesn't exist or permission denied, use default
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        void 0;
      } else {
        void 0;
      }
      return 98;
    }
  }

  /**
   * Calculate years of experience since founding
   * Returns decimal with 1 year minimum
   */
  private calculateYearsExperience(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.FOUNDING_DATE.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

    // Always show at least 1 year, round to 1 decimal
    return Math.max(1, Math.round(diffYears * 10) / 10);
  }

  /**
   * Get default stats if database fetch fails
   */
  private getDefaultStats(): SiteStats {
    return this.normalizeStats({
      totalSales: 0,
      customerSatisfaction: 98,
      uptimeGuarantee: 99.9,
      yearsExperience: this.calculateYearsExperience()
    });
  }

  /**
   * Persist stats for both admin and public views
   */
  async saveStats(stats: SiteStats): Promise<void> {
    const normalized = this.normalizeStats(stats);
    const payload = {
      ...normalized,
      lastUpdated: new Date().toISOString()
    };

    const adminDocRef = doc(this.firestore, 'settings', 'app');
    await setDoc(adminDocRef, { stats: payload }, { merge: true });

    const publicDocRef = doc(this.firestore, 'settings', 'public');
    await setDoc(publicDocRef, { stats: payload }, { merge: true });
  }

  /**
   * Admin function to update stats in settings/public document
   * This should be called from admin dashboard
   */
  async updatePublicStats(totalSales?: number): Promise<void> {
    try {
      // Get current customer satisfaction from surveys
      const customerSatisfaction = await this.getCustomerSatisfaction();

      // If totalSales not provided, try to count completed orders
      let sales = totalSales;
      if (sales === undefined) {
        try {
          const ordersRef = collection(this.firestore, 'orders');
          const completedOrdersQuery = query(
            ordersRef,
            where('status', 'in', ['shipped', 'delivered', 'completed'])
          );
          const ordersSnapshot = await getDocs(completedOrdersQuery);
          sales = ordersSnapshot.size;
          void 0;
        } catch (error: any) {
          if (error?.code === 'permission-denied') {
            void 0;
          } else {
            void 0;
          }
          sales = 0;
        }
      }

      await this.saveStats({
        totalSales: sales ?? 0,
        customerSatisfaction,
        uptimeGuarantee: 99.9,
        yearsExperience: this.calculateYearsExperience()
      });

      void 0;
    } catch (error) {
      void 0;
      throw error;
    }
  }

  private normalizeStats(stats: Partial<SiteStats>): SiteStats {
    const defaults = {
      totalSales: 0,
      customerSatisfaction: 98,
      uptimeGuarantee: 99.9,
      yearsExperience: this.calculateYearsExperience()
    };

    const totalSales = Number.isFinite(stats.totalSales)
      ? Math.max(0, Math.round(stats.totalSales as number))
      : defaults.totalSales;

    const customerSatisfaction = Number.isFinite(stats.customerSatisfaction)
      ? Math.min(100, Math.max(0, Math.round(stats.customerSatisfaction as number)))
      : defaults.customerSatisfaction;

    const uptimeGuarantee = Number.isFinite(stats.uptimeGuarantee)
      ? Math.min(100, Math.max(0, parseFloat((stats.uptimeGuarantee as number).toFixed(1))))
      : defaults.uptimeGuarantee;

    const yearsExperience = Number.isFinite(stats.yearsExperience)
      ? Math.max(0, parseFloat((stats.yearsExperience as number).toFixed(1)))
      : defaults.yearsExperience;

    return {
      totalSales,
      customerSatisfaction,
      uptimeGuarantee,
      yearsExperience
    };
  }

  private normalizeStatsFromSource(input: Record<string, any>): SiteStats {
    return this.normalizeStats({
      totalSales: input['totalSales'],
      customerSatisfaction: input['customerSatisfaction'],
      uptimeGuarantee: input['uptimeGuarantee'],
      yearsExperience: input['yearsExperience'] ?? this.calculateYearsExperience()
    });
  }
}

