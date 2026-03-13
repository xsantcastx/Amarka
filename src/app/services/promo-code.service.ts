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
import { Functions, httpsCallable } from '@angular/fire/functions';
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
  private functions = inject(Functions);

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
   * Validate a promo code via Cloud Function (server-side — Firestore not directly readable by clients)
   */
  async validatePromoCode(
    code: string,
    cartSubtotal: number,
    _userId?: string
  ): Promise<PromoCodeValidationResult> {
    try {
      const fn = httpsCallable<{ code: string; cartTotal: number }, any>(
        this.functions,
        'validatePromoCode'
      );
      const result = await fn({ code, cartTotal: cartSubtotal });
      const data = result.data;

      if (!data.valid) {
        const reasonMap: Record<string, string> = {
          not_found:     'Invalid promo code',
          inactive:      'This promo code is no longer active',
          not_started:   'This promo code is not yet valid',
          expired:       'This promo code has expired',
          exhausted:     'This promo code has reached its usage limit',
          below_minimum: `Minimum order of $${data.minimumAmount?.toFixed(2) ?? '?'} required`,
          invalid_format:'Invalid promo code format',
        };
        return { valid: false, error: reasonMap[data.reason] ?? 'Invalid promo code' };
      }

      return {
        valid: true,
        discountAmount: data.discountAmount,
        // Minimal PromoCode object for display purposes
        promoCode: {
          code: data.code,
          type: data.type,
          value: data.value,
          active: true,
        } as PromoCode,
      };
    } catch (error: any) {
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
