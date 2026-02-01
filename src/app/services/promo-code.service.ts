import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  increment
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { PromoCode } from '../models/cart';

export interface PromoCodeValidationResult {
  valid: boolean;
  error?: string;
  promoCode?: PromoCode;
  discountAmount?: number;
}

@Injectable({ providedIn: 'root' })
export class PromoCodeService {
  private firestore = inject(Firestore);

  /**
   * Get all promo codes
   */
  getAllPromoCodes(): Observable<PromoCode[]> {
    const promoCodesCollection = collection(this.firestore, 'promoCodes');
    const q = query(promoCodesCollection, orderBy('createdAt', 'desc'));
    return from(getDocs(q)).pipe(
      map(snapshot =>
        snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as PromoCode))
      )
    );
  }

  /**
   * Get active promo codes only
   */
  getActivePromoCodes(): Observable<PromoCode[]> {
    const promoCodesCollection = collection(this.firestore, 'promoCodes');
    const q = query(
      promoCodesCollection,
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    );
    return from(getDocs(q)).pipe(
      map(snapshot =>
        snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as PromoCode))
      )
    );
  }

  /**
   * Get single promo code by ID
   */
  getPromoCode(id: string): Observable<PromoCode | null> {
    const docRef = this.promoCodeDoc(id);
    return from(getDoc(docRef)).pipe(
      map(doc => doc.exists() ? { id: doc.id, ...doc.data() as any } as PromoCode : null)
    );
  }

  /**
   * Get promo code by code string
   */
  getPromoCodeByCode(code: string): Observable<PromoCode | null> {
    const promoCodesCollection = collection(this.firestore, 'promoCodes');
    const q = query(promoCodesCollection, where('code', '==', code.toUpperCase()));
    return from(getDocs(q)).pipe(
      map(snapshot => {
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() as any } as PromoCode;
      })
    );
  }

  /**
   * Create new promo code
   */
  async addPromoCode(promoCode: Omit<PromoCode, 'id'>): Promise<string> {
    const promoCodesCollection = collection(this.firestore, 'promoCodes');
    const now = Timestamp.now();
    const data = this.removeUndefinedFields({
      ...promoCode,
      code: promoCode.code.toUpperCase(),
      active: promoCode.active !== false,
      currentUses: 0,
      createdAt: now,
      updatedAt: now
    });
    const docRef = await addDoc(promoCodesCollection, data as any);
    return docRef.id;
  }

  /**
   * Update existing promo code
   */
  async updatePromoCode(id: string, updates: Partial<PromoCode>): Promise<void> {
    const docRef = this.promoCodeDoc(id);
    const cleanedUpdates = this.removeUndefinedFields({
      ...updates,
      ...(updates.code && { code: updates.code.toUpperCase() }),
      updatedAt: Timestamp.now()
    });
    await updateDoc(docRef, cleanedUpdates as any);
  }

  /**
   * Delete promo code
   */
  async deletePromoCode(id: string): Promise<void> {
    const docRef = this.promoCodeDoc(id);
    await deleteDoc(docRef);
  }

  /**
   * Validate a promo code for use
   */
  async validatePromoCode(
    code: string,
    cartSubtotal: number,
    userId?: string
  ): Promise<PromoCodeValidationResult> {
    try {
      // Find the promo code
      const promoCode = await new Promise<PromoCode | null>((resolve, reject) => {
        this.getPromoCodeByCode(code).subscribe({
          next: resolve,
          error: reject
        });
      });

      if (!promoCode) {
        return { valid: false, error: 'Invalid promo code' };
      }

      // Check if active
      if (!promoCode.active) {
        return { valid: false, error: 'This promo code is no longer active' };
      }

      // Check validity dates
      const now = Timestamp.now();
      if (promoCode.validFrom && promoCode.validFrom.toMillis() > now.toMillis()) {
        return { valid: false, error: 'This promo code is not yet valid' };
      }
      if (promoCode.validUntil && promoCode.validUntil.toMillis() < now.toMillis()) {
        return { valid: false, error: 'This promo code has expired' };
      }

      // Check max uses
      if (promoCode.maxUses && (promoCode.currentUses || 0) >= promoCode.maxUses) {
        return { valid: false, error: 'This promo code has reached its usage limit' };
      }

      // Check minimum order amount
      if (promoCode.minOrderAmount && cartSubtotal < promoCode.minOrderAmount) {
        return {
          valid: false,
          error: `Minimum order amount of $${promoCode.minOrderAmount.toFixed(2)} required`
        };
      }

      // Calculate discount
      let discountAmount: number;
      if (promoCode.type === 'percentage') {
        discountAmount = (cartSubtotal * promoCode.value) / 100;
      } else {
        discountAmount = Math.min(promoCode.value, cartSubtotal);
      }

      return {
        valid: true,
        promoCode,
        discountAmount
      };
    } catch (error: any) {
      console.error('Error validating promo code:', error);
      return { valid: false, error: 'Error validating promo code' };
    }
  }

  /**
   * Increment usage count when promo code is used
   */
  async incrementUsage(id: string): Promise<void> {
    const docRef = this.promoCodeDoc(id);
    await updateDoc(docRef, {
      currentUses: increment(1),
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Check if code already exists
   */
  async codeExists(code: string, excludeId?: string): Promise<boolean> {
    const promoCodesCollection = collection(this.firestore, 'promoCodes');
    const q = query(promoCodesCollection, where('code', '==', code.toUpperCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return false;
    if (excludeId) {
      return snapshot.docs.some(doc => doc.id !== excludeId);
    }
    return true;
  }

  /**
   * Remove undefined fields from object
   */
  private removeUndefinedFields(obj: any): any {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  }

  private promoCodeDoc(id: string) {
    return doc(this.firestore, `promoCodes/${id}`);
  }
}
