import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, map, Observable, of, combineLatest } from 'rxjs';
import { BulkPricingTier, Product, ProductVariant } from '../models/product';
import { BulkPricingTierSnapshot, Cart, CartItem } from '../models/cart';
import { Firestore, doc, docData, setDoc, Timestamp, serverTimestamp, updateDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { SettingsService } from './settings.service';
import { AnalyticsService } from './analytics.service';

// Legacy support for old CartItem interface
interface LegacyCartItem {
  product: Product;
  qty: number;
}

interface LegacyCartState {
  items: LegacyCartItem[];
}

const LS_KEY = 'ts_cart_v1';
const ANON_CART_KEY = 'ts_anon_cart_id';

@Injectable({ providedIn: 'root' })
export class CartService {
  private platformId = inject(PLATFORM_ID);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private settingsService = inject(SettingsService);
  private analyticsService = inject(AnalyticsService);
  
  private cartState$ = new BehaviorSubject<Cart | null>(null);
  readonly cart$ = this.cartState$.asObservable();
  readonly count$ = this.cart$.pipe(
    map(cart => cart?.items.reduce((sum, item) => sum + item.qty, 0) || 0)
  );

  // Track current user to avoid duplicate loads
  private currentUserId: string | null = null;

  constructor() {
    // Debug: Expose auth state checker
    if (typeof window !== 'undefined') {
      (window as any).checkAuthState = () => {
        const user = this.auth.currentUser;

        console.log('Current User:', user ? {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        } : 'NOT LOGGED IN');
        console.log('Cart State:', this.cartState$.value);

        return user;
      };
    }

    // Subscribe to auth state changes to sync cart
    // Note: This fires immediately with null, then again with user when auth loads
    this.auth.onAuthStateChanged(user => {
      const userId = user?.uid || null;
      
      // Skip if this is the same user we already loaded
      if (userId === this.currentUserId) {
        return;
      }
      
      this.currentUserId = userId;
      
      if (user) {
        this.loadUserCart(user.uid);
      } else {

        this.loadAnonymousCart();
      }
    });

    // Also check immediately if user is already logged in (for SSR/fast refresh cases)
    setTimeout(() => {
      const currentUser = this.auth.currentUser;
      if (currentUser && currentUser.uid !== this.currentUserId) {

        // Only reload if cart is still anonymous
        const currentCart = this.cartState$.value;
        if (!currentCart || currentCart.id?.startsWith('anon_') || !currentCart.id) {
          this.currentUserId = currentUser.uid;
          this.loadUserCart(currentUser.uid);
        }
      }
    }, 100);
  }

  /**
   * Load user's cart from Firestore
   */
  private async loadUserCart(uid: string) {
    // Check if we have an anonymous cart to migrate
    const currentCart = this.cartState$.value;
    const hasAnonymousCart = currentCart && currentCart.id?.startsWith('anon_') && currentCart.items.length > 0;
    
    if (hasAnonymousCart) {
      // Migrate anonymous cart to user cart
      const userCart = {
        ...currentCart,
        id: uid,
        uid: uid
      };
      await this.saveCart(userCart);
      
      // Clear anonymous cart from localStorage
      if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem(ANON_CART_KEY);
      }
      
      return;
    }
    
    // Load existing user cart
    const cartRef = doc(this.firestore, `carts/${uid}`);
    docData(cartRef, { idField: 'id' }).pipe(

      catchError(err => {
        console.error('[CartService] Error loading user cart:', err);
        // Create empty cart with user ID
        const emptyCart = this.createEmptyCart(uid);
        emptyCart.uid = uid;

        return of(emptyCart);
      })
    ).subscribe(cart => {
      const cartData = cart as Cart;
      // Ensure cart has the correct user ID
      if (cartData && !cartData.id) {
        cartData.id = uid;
        cartData.uid = uid;
      }
      // Recalculate totals in case they're stale
      const cartWithTotals = cartData && cartData.items?.length > 0 
        ? this.calculateTotals(cartData) 
        : cartData;

      this.cartState$.next(cartWithTotals);
    });
  }

  /**
   * Load anonymous cart (browser-only, localStorage temp ID)
   */
  private loadAnonymousCart() {
    if (!isPlatformBrowser(this.platformId)) {
      this.cartState$.next(this.createEmptyCart());
      return;
    }

    // Try to get existing anonymous cart ID
    let anonId = localStorage.getItem(ANON_CART_KEY);
    
    if (!anonId) {
      // Generate new anonymous cart ID
      anonId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(ANON_CART_KEY, anonId);
    }

    // Load from Firestore or create empty
    const cartRef = doc(this.firestore, `carts/${anonId}`);
    docData(cartRef, { idField: 'id' }).pipe(
      catchError(() => of(this.createEmptyCart(anonId!)))
    ).subscribe(cart => {
      const cartData = cart as Cart;
      // Recalculate totals in case they're stale
      const cartWithTotals = cartData && cartData.items?.length > 0 
        ? this.calculateTotals(cartData) 
        : cartData;
      this.cartState$.next(cartWithTotals);
    });
  }

  /**
   * Create an empty cart
   */
  private createEmptyCart(id?: string): Cart {
    return {
      id,
      items: [],
      subtotal: 0,
      total: 0,
      currency: 'USD',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
  }

  /**
   * Calculate cart totals
   */
  private calculateTotals(cart: Cart): Cart {
    const subtotal = cart.items.reduce((sum, item) => {
      if (item.bulkPricingTiers?.length) {
        const { unitPrice } = this.getUnitPriceForQty(
          item.basePrice ?? item.unitPrice,
          item.qty,
          item.bulkPricingTiers
        );
        item.unitPrice = unitPrice;
      }
      const itemTotal = (item.unitPrice * item.qty);
      return sum + itemTotal;
    }, 0);
    const shipping = cart.shipping || 0;
    const tax = cart.tax || 0;
    const discount = cart.discount || 0;
    const total = subtotal + shipping + tax - discount;

    return {
      ...cart,
      subtotal,
      total,
      updatedAt: Timestamp.now()
    };
  }

  /**
   * Update shipping cost manually (used when dynamic shipping is disabled)
   */
  async updateShippingCost(cost: number, methodId?: string): Promise<void> {
    const currentCart = this.cartState$.value;
    if (!currentCart) {
      return;
    }

    currentCart.shipping = Math.max(0, Number.isFinite(cost) ? cost : 0);
    if (methodId) {
      currentCart.shippingMethodId = methodId;
    }

    await this.saveCart(currentCart);
  }

  /**
   * Save cart to Firestore
   */
  private async saveCart(cart: Cart): Promise<void> {
    if (!cart.id) {
      console.error('Cannot save cart without ID');
      return;
    }

    const cartRef = doc(this.firestore, `carts/${cart.id}`);
    const cartWithTotals = this.calculateTotals(cart);
    // Optimistically update local state so UI badges react immediately
    this.cartState$.next(cartWithTotals);
    
    // Filter out undefined values to prevent Firestore errors
    const cleanCart = this.removeUndefinedFields({
      ...cartWithTotals,
      updatedAt: serverTimestamp()
    });
    
    try {
      await setDoc(cartRef, cleanCart);
    } catch (err) {
      console.error('Error saving cart:', err);
      throw err;
    }
  }

  /**
   * Remove undefined fields from object (Firestore doesn't accept undefined)
   */
  private removeUndefinedFields(obj: any): any {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        if (Array.isArray(obj[key])) {
          cleaned[key] = obj[key].map((item: any) => 
            typeof item === 'object' && item !== null 
              ? this.removeUndefinedFields(item) 
              : item
          );
        } else if (typeof obj[key] === 'object' && obj[key] !== null && !(obj[key] instanceof Timestamp)) {
          cleaned[key] = this.removeUndefinedFields(obj[key]);
        } else {
          cleaned[key] = obj[key];
        }
      }
    }
    return cleaned;
  }

  private normalizeBulkPricingTiers(tiers?: BulkPricingTier[]): BulkPricingTierSnapshot[] {
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

  private resolveVariantKey(variant?: ProductVariant): string | undefined {
    if (!variant) {
      return undefined;
    }
    if (variant.id) {
      return variant.id;
    }
    if (variant.sku) {
      return `sku:${variant.sku}`;
    }
    if (variant.label) {
      return `label:${variant.label}`;
    }
    if (variant.finish) {
      return `finish:${variant.finish}`;
    }
    return undefined;
  }

  private resolveVariantLabel(variant?: ProductVariant): string | undefined {
    if (!variant) {
      return undefined;
    }
    return variant.label || variant.finish || variant.sku;
  }

  private resolveVariantImageUrl(variant?: ProductVariant): string | undefined {
    if (!variant) {
      return undefined;
    }
    return variant.imageUrl;
  }

  private getUnitPriceForQty(
    basePrice: number,
    qty: number,
    tiers?: BulkPricingTierSnapshot[]
  ): { unitPrice: number; appliedTier?: BulkPricingTierSnapshot } {
    if (!tiers || tiers.length === 0) {
      return { unitPrice: basePrice };
    }

    const applicable = tiers.filter(tier => qty >= tier.minQty);
    if (applicable.length === 0) {
      return { unitPrice: basePrice };
    }

    const appliedTier = applicable[applicable.length - 1];
    return { unitPrice: appliedTier.unitPrice, appliedTier };
  }

  /**
   * Add product to cart
   */
  async add(product: Product, qty = 1, variant?: ProductVariant): Promise<void> {
    // Get inventory settings
    const settings = await this.settingsService.getSettings();

    const variantKey = this.resolveVariantKey(variant);
    const variantLabel = this.resolveVariantLabel(variant);
    const variantImageUrl = this.resolveVariantImageUrl(variant);
    const bulkPricingTiers = this.normalizeBulkPricingTiers(product.bulkPricingTiers);
    const basePrice = (variant?.price ?? product.price ?? 0);
    
    // Check inventory if tracking is enabled
    if (settings.trackInventory) {
      const stockSource = (variant && typeof variant.stock === 'number')
        ? variant.stock
        : (product.stock || 0);
      const stockLabel = variantLabel ? `${product.name} (${variantLabel})` : product.name;
      
      // Check if product is out of stock and backorders are disabled
      if (stockSource <= 0 && !settings.allowBackorders) {
        console.warn('[CartService] Product out of stock and backorders disabled:', stockLabel);
        throw new Error(`Product "${stockLabel}" is out of stock`);
      }
      
      // Check if requested quantity exceeds available stock (when backorders disabled)
      if (!settings.allowBackorders && qty > stockSource) {
        console.warn('[CartService] Requested quantity exceeds stock:', { requested: qty, available: stockSource });
        throw new Error(`Only ${stockSource} units available for "${stockLabel}"`);
      }
    }

    let currentCart = this.cartState$.value;
    
    // If no cart exists, create one
    if (!currentCart || !currentCart.id) {

      const user = this.auth.currentUser;
      
      if (user) {
        // Create user cart
        currentCart = this.createEmptyCart(user.uid);
        currentCart.uid = user.uid;
      } else {
        // Create anonymous cart
        if (isPlatformBrowser(this.platformId)) {
          let anonId = localStorage.getItem(ANON_CART_KEY);
          if (!anonId) {
            anonId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem(ANON_CART_KEY, anonId);
          }
          currentCart = this.createEmptyCart(anonId);
        } else {
          console.error('[CartService] Cannot create cart on server');
          return;
        }
      }
    }
    
    // Check if item already exists
    const existingItemIndex = currentCart.items.findIndex(
      item => item.productId === product.id && item.variantId === variantKey
    );

    if (existingItemIndex >= 0) {
      // Check total quantity if inventory tracking enabled
      if (settings.trackInventory && !settings.allowBackorders) {
        const newTotalQty = currentCart.items[existingItemIndex].qty + qty;
        const stockSource = (variant && typeof variant.stock === 'number')
          ? variant.stock
          : (product.stock || 0);
        if (newTotalQty > stockSource) {
          console.warn('[CartService] Total cart quantity would exceed stock:', { 
            currentQty: currentCart.items[existingItemIndex].qty, 
            adding: qty, 
            total: newTotalQty, 
            available: stockSource 
          });
          const stockLabel = variantLabel ? `${product.name} (${variantLabel})` : product.name;
          throw new Error(`Cannot add more. Only ${stockSource} units available for "${stockLabel}"`);
        }
      }
      
      // Update quantity
      const existingItem = currentCart.items[existingItemIndex];
      const updatedQty = existingItem.qty + qty;
      existingItem.qty = updatedQty;
      if (!existingItem.basePrice) {
        existingItem.basePrice = basePrice;
      }
      if (!existingItem.bulkPricingTiers?.length && bulkPricingTiers.length) {
        existingItem.bulkPricingTiers = bulkPricingTiers;
      }
      const { unitPrice } = this.getUnitPriceForQty(
        existingItem.basePrice ?? basePrice,
        updatedQty,
        existingItem.bulkPricingTiers || bulkPricingTiers
      );
      existingItem.unitPrice = unitPrice;

    } else {
      // Add new item
      const { unitPrice } = this.getUnitPriceForQty(basePrice, qty, bulkPricingTiers);
      const newItem: CartItem = {
        productId: product.id!,
        ...(variantKey && { variantId: variantKey }),
        name: product.name,
        ...(variantLabel && { variantLabel }),
        qty,
        unitPrice,
        basePrice,
        currency: 'USD',
        priceSnapshotAtAdd: unitPrice,
        ...(variantImageUrl && { imageUrl: variantImageUrl, variantImageUrl }),
        ...(!variantImageUrl && product.imageUrl && { imageUrl: product.imageUrl }),
        ...(variant?.sku && { sku: variant.sku }),
        ...(!variant?.sku && product.sku && { sku: product.sku }),
        ...(bulkPricingTiers.length > 0 && { bulkPricingTiers })
      };

      currentCart.items.push(newItem);
    }

    await this.saveCart(currentCart);
    this.analyticsService.trackAddToCart(product, qty, currentCart.currency);
  }

  /**
   * Remove item from cart
   */
  async remove(productId: string, variantId?: string): Promise<void> {
    const currentCart = this.cartState$.value;
    if (!currentCart) return;

    currentCart.items = currentCart.items.filter(item => !(item.productId === productId && item.variantId === variantId));
    await this.saveCart(currentCart);
  }

  /**
   * Update item quantity
   */
  async updateQty(productId: string, qty: number, variantId?: string): Promise<void> {
    const currentCart = this.cartState$.value;
    if (!currentCart) return;

    const item = currentCart.items.find(i => i.productId === productId && i.variantId === variantId);
    if (item) {
      item.qty = Math.max(1, Math.floor(qty));
      if (item.bulkPricingTiers?.length) {
        const { unitPrice } = this.getUnitPriceForQty(
          item.basePrice ?? item.unitPrice,
          item.qty,
          item.bulkPricingTiers
        );
        item.unitPrice = unitPrice;
      }
      await this.saveCart(currentCart);
    }
  }

  /**
   * Clear cart
   */
  async clear(): Promise<void> {
    const currentCart = this.cartState$.value;
    if (!currentCart) return;

    currentCart.items = [];
    await this.saveCart(currentCart);
  }

  /**
   * Get current cart snapshot
   */
  snapshot(): Cart | null {
    return this.cartState$.value;
  }

  /**
   * Migrate anonymous cart to user cart on sign-in
   */
  async migrateAnonymousCart(uid: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const anonId = localStorage.getItem(ANON_CART_KEY);
    if (!anonId) return;

    const anonCart = this.cartState$.value;
    if (!anonCart || anonCart.items.length === 0) {
      // No items to migrate, just cleanup
      localStorage.removeItem(ANON_CART_KEY);
      return;
    }

    // Load user's existing cart
    const userCartRef = doc(this.firestore, `carts/${uid}`);
    let userCart: Cart;
    
    try {
      const userCartDoc = await docData(userCartRef, { idField: 'id' }).pipe(
        catchError(() => of(null))
      ).toPromise();
      
      userCart = userCartDoc as Cart || this.createEmptyCart(uid);
    } catch {
      userCart = this.createEmptyCart(uid);
    }

    // Merge anonymous cart items into user cart
    for (const anonItem of anonCart.items) {
      const existingItem = userCart.items.find(i => i.productId === anonItem.productId);
      if (existingItem) {
        existingItem.qty += anonItem.qty;
      } else {
        userCart.items.push(anonItem);
      }
    }

    // Save merged cart
    await this.saveCart(userCart);

    // Delete anonymous cart and cleanup
    try {
      const anonCartRef = doc(this.firestore, `carts/${anonId}`);
      // Note: Firestore deleteDoc needs to be imported separately
      // For now, we'll just clear localStorage
      localStorage.removeItem(ANON_CART_KEY);
    } catch (err) {
      console.error('Error deleting anonymous cart:', err);
    }
  }

  /**
   * Legacy support: Load from localStorage and migrate
   */
  private migrateLegacyCart() {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const legacyData = localStorage.getItem(LS_KEY);
      if (!legacyData) return;

      const legacyCart: LegacyCartState = JSON.parse(legacyData);
      if (legacyCart.items.length === 0) return;

      // Convert legacy items to new format
      const currentCart = this.cartState$.value || this.createEmptyCart();
      
      for (const legacyItem of legacyCart.items) {
        const newItem: CartItem = {
          productId: legacyItem.product.id!,
          name: legacyItem.product.name,
          qty: legacyItem.qty,
          unitPrice: legacyItem.product.price || 0,
          basePrice: legacyItem.product.price || 0,
          currency: 'USD',
          priceSnapshotAtAdd: legacyItem.product.price || 0,
          imageUrl: legacyItem.product.imageUrl,
          sku: legacyItem.product.sku
        };
        currentCart.items.push(newItem);
      }

      // Save to Firestore
      this.saveCart(currentCart);

      // Remove legacy cart
      localStorage.removeItem(LS_KEY);
    } catch (err) {
      console.error('Error migrating legacy cart:', err);
    }
  }

  /**
   * Update shipping address in cart
   */
  async updateShippingAddress(cartId: string, address: any): Promise<void> {
    const cartRef = doc(this.firestore, `carts/${cartId}`);
    await updateDoc(cartRef, {
      shippingAddress: address,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Clear cart after successful purchase
   */
  async clearCart(): Promise<void> {
    const currentCart = this.cartState$.value;
    if (!currentCart) return;

    // Create new empty cart with same uid
    const emptyCart = this.createEmptyCart(currentCart.uid || '');
    
    // Update Firestore if cart has an ID
    if (currentCart.id && !currentCart.id.startsWith('anon_')) {
      const cartRef = doc(this.firestore, `carts/${currentCart.id}`);
      await setDoc(cartRef, emptyCart);
    }

    // Update local state
    this.cartState$.next(emptyCart);
  }
}
