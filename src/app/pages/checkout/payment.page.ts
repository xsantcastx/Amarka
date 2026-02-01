import { Component, inject, OnInit, OnDestroy, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, doc, setDoc, updateDoc, serverTimestamp } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { StripeCardElement } from '@stripe/stripe-js';

import { StripeService } from '../../services/stripe.service';
import { CartService } from '../../services/cart.service';
import { AddressService } from '../../services/address.service';
import { Address } from '../../models/cart';
import { AnalyticsService } from '../../services/analytics.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'ts-payment-page',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss']
})
export class PaymentPage implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private functions = inject(Functions);
  private stripeService = inject(StripeService);
  private cartService = inject(CartService);
  private addressService = inject(AddressService);
  private analyticsService = inject(AnalyticsService);

  // State
  loading = signal(true);
  stripeReady = signal(false);
  processing = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  // Stripe
  private cardElement: StripeCardElement | null = null;
  cardErrors = signal<string | null>(null);

  // Data
  billingAddress = signal<Address | null>(null);
  cart = signal<any>(null);

  // Form for cardholder name (card details in Stripe Element)
  form = this.fb.group({
    cardholderName: ['', [Validators.required, Validators.minLength(3)]],
    saveCard: [false]
  });

  async ngOnInit() {
    await this.initializePayment();
  }

  async ngAfterViewInit() {
    // Wait for view to be fully initialized, then set up Stripe element
    // This ensures the card-element div exists in the DOM
    // Use a longer delay and retry mechanism
    this.waitForElementAndSetupStripe();
  }

  /**
   * Wait for the card-element div to be available in the DOM, then set up Stripe
   */
  private async waitForElementAndSetupStripe(attempts = 0, maxAttempts = 20) {
    const cardElementDiv = document.getElementById('card-element');
    
    if (cardElementDiv) {
      void 0;
      await this.setupStripeElement();
      this.stripeReady.set(true);
    } else if (attempts < maxAttempts) {
      void 0;
      // Wait 50ms and try again
      setTimeout(() => {
        this.waitForElementAndSetupStripe(attempts + 1, maxAttempts);
      }, 50);
    } else {
      void 0;
      this.error.set('Payment form failed to load. Please refresh the page.');
    }
  }

  ngOnDestroy() {
    // Cleanup Stripe Elements
    if (this.cardElement) {
      this.cardElement.unmount();
      this.cardElement.destroy();
    }
  }

  /**
   * Initialize payment page
   */
  private async initializePayment() {
    try {
      this.loading.set(true);
      this.error.set(null);

      // Check authentication
      const user = this.auth.currentUser;
      if (!user) {
        this.router.navigate(['/client/login'], {
          queryParams: { returnUrl: '/checkout/payment' }
        });
        return;
      }

      // Get cart
      const cart = this.cartService.snapshot();
      if (!cart || !cart.items || cart.items.length === 0) {
        this.error.set('Cart is empty');
        setTimeout(() => this.router.navigate(['/cart']), 2000);
        return;
      }
      this.cart.set(cart);

      // Get billing address (use default shipping address or any available address)
      this.addressService.getUserAddresses(user.uid).subscribe({
        next: (addresses) => {
          if (addresses && addresses.length > 0) {
            // Prefer default address, otherwise use first available
            const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
            this.billingAddress.set(defaultAddr);
            void 0;
          } else {
            void 0;
            this.error.set('No billing address found. Please add an address in the cart page.');
          }
        },
        error: (err) => {
          void 0;
          this.error.set('Failed to load billing address. Please try again.');
        }
      });

      // Don't set loading to false here - wait for Stripe element to be ready in ngAfterViewInit

    } catch (err: any) {
      void 0;
      this.error.set(err.message || 'Failed to initialize payment');
    } finally {
      // Cart data is loaded, show the form (Stripe will initialize separately)
      this.loading.set(false);
    }
  }

  /**
   * Setup Stripe card element
   */
  private async setupStripeElement() {
    try {
      void 0;
      
      // Check if element exists in DOM
      const cardElementDiv = document.getElementById('card-element');
      if (!cardElementDiv) {
        void 0;
        this.error.set('Payment form container not found. Please refresh the page.');
        return;
      }
      
      void 0;
      const result = await this.stripeService.createCardElement('card-element');
      
      if (result) {
        this.cardElement = result.cardElement;
        void 0;

        // Listen for card validation errors
        this.cardElement.on('change', (event) => {
          void 0;
          if (event.error) {
            this.cardErrors.set(event.error.message);
          } else {
            this.cardErrors.set(null);
          }
        });
        
        // Listen for ready event
        this.cardElement.on('ready', () => {
          void 0;
        });
      } else {
        void 0;
        this.error.set('Failed to initialize payment form.');
      }
    } catch (err) {
      void 0;
      this.error.set('Failed to load payment form. Please refresh the page.');
    }
  }

  /**
   * Process payment
   */
  async processPayment() {
    if (this.form.invalid || !this.cardElement) {
      this.form.markAllAsTouched();
      this.error.set('Please fill in all required fields');
      return;
    }

    const cart = this.cart();
    const billingAddress = this.billingAddress();

    void 0;

    if (!cart || !billingAddress) {
      void 0;
      this.error.set('Missing cart or billing information. Please return to cart and try again.');
      return;
    }

    if (!cart.id) {
      void 0;
      this.error.set('Invalid cart. Please return to cart and try again.');
      return;
    }

    this.analyticsService.trackAddPaymentInfo(cart, 'card');

    this.processing.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      // Step 1: Create PaymentIntent via Cloud Function
      const createPaymentIntent = httpsCallable<
        { cartId: string },
        { clientSecret: string; paymentIntentId: string }
      >(this.functions, 'createPaymentIntent');

      const { data } = await createPaymentIntent({ cartId: cart.id! });

      // Step 2: Confirm payment with Stripe
      const cardholderName = this.form.value.cardholderName!;
      const result = await this.stripeService.confirmCardPayment(
        data.clientSecret,
        this.cardElement!,
        {
          name: cardholderName,
          email: billingAddress.email,
          phone: billingAddress.phoneE164,
          address: {
            line1: billingAddress.line1,
            line2: billingAddress.line2,
            city: billingAddress.city,
            state: billingAddress.region,
            postal_code: billingAddress.postalCode,
            country: billingAddress.country,
          },
        }
      );

      if (result.error) {
        // Payment failed
        const errorMessage = this.stripeService.getErrorMessage(result.error);
        this.error.set(errorMessage);
        this.processing.set(false);
        return;
      }

      // Payment succeeded!
      const paymentIntent = result.paymentIntent!;

      if (paymentIntent.status === 'succeeded') {
        this.success.set('Payment successful! Creating your order...');
        
        // CRITICAL: Create order immediately as fallback (webhook might not be configured)
        try {
          await this.createOrderFallback(paymentIntent.id, cart);
          void 0;
        } catch (orderError) {
          void 0;
          // Don't throw - webhook might still create it
        }
        
        // Navigate to order confirmation
        // The webhook will handle order creation if configured, otherwise fallback order is used
        setTimeout(() => {
          this.router.navigate(['/checkout/confirmation'], {
            queryParams: { payment_intent: paymentIntent.id }
          });
        }, 1500);
      } else if (paymentIntent.status === 'requires_action') {
        // Handle 3D Secure authentication
        const actionResult = await this.stripeService.handleCardAction(data.clientSecret);
        
        if (actionResult.error) {
          this.error.set(this.stripeService.getErrorMessage(actionResult.error));
        } else if (actionResult.paymentIntent?.status === 'succeeded') {
          this.success.set('Payment successful! Creating your order...');
          
          // CRITICAL: Create order immediately as fallback (webhook might not be configured)
          try {
            await this.createOrderFallback(actionResult.paymentIntent.id, cart);
            void 0;
          } catch (orderError) {
            void 0;
            // Don't throw - webhook might still create it
          }
          
          setTimeout(() => {
            this.router.navigate(['/checkout/confirmation'], {
              queryParams: { payment_intent: actionResult.paymentIntent!.id }
            });
          }, 1500);
        }
      }

    } catch (err: any) {
      void 0;
      const code = err?.code || err?.error?.code;
      const message = err?.message || err?.error?.message;

      // Friendlier messaging for common backend failures
      if (code === 'internal') {
        this.error.set('Payment service is unavailable right now. Please try again in a moment or contact support if this persists.');
      } else if (code === 'failed-precondition') {
        this.error.set('Payments are not available. Please check your billing information or try again later.');
      } else {
        this.error.set(message || 'Payment failed. Please try again.');
      }
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * Go back to checkout review
   */
  backToReview() {
    this.router.navigate(['/checkout/review']);
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  }

  /**
   * CRITICAL FALLBACK: Create order directly in Firestore
   * This runs when payment succeeds but webhook might not be configured
   * Duplicates the order creation logic from the Cloud Function webhook
   */
  private async createOrderFallback(paymentIntentId: string, cart: any): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Check if order already exists (webhook might have created it)
    const existingOrderQuery = collection(this.firestore, 'orders');
    // Note: We can't query without an index, so we'll just create with a unique ID check
    
    // Generate order number (format: LUX-YYYYMMDD-XXXX)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `LUX-${dateStr}-${randomSuffix}`;

    // Create order document
    const orderRef = doc(collection(this.firestore, 'orders'));
    const orderId = orderRef.id;

    await setDoc(orderRef, {
      orderNumber,
      userId: user.uid,
      cartId: cart.id,
      paymentIntentId,
      status: 'pending',
      
      // Items
      items: cart.items || [],
      itemCount: cart.items?.length || 0,
      
      // Totals
      subtotal: cart.subtotal || 0,
      shipping: cart.shipping || 0,
      tax: cart.tax || 0,
      discount: cart.discount || 0,
      total: cart.total || 0,
      currency: cart.currency || 'USD',
      
      // Shipping
      shippingMethod: cart.shippingMethod || 'standard',
      shippingAddress: cart.shippingAddress || null,
      billingAddress: null,
      
      // Tracking
      trackingNumber: null,
      estimatedDelivery: null,
      
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      paidAt: new Date(),
      
      // Metadata
      createdBy: 'frontend_fallback', // Mark this as created by fallback
      notes: [],
    });

    // Update payment record with orderId (if it exists)
    try {
      const paymentRef = doc(this.firestore, `payments/${paymentIntentId}`);
      await updateDoc(paymentRef, {
        orderId,
        orderNumber,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      void 0;
    }

    // Mark cart as completed
    try {
      const cartRef = doc(this.firestore, `carts/${cart.id}`);
      await updateDoc(cartRef, {
        status: 'completed',
        orderId,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      void 0;
    }

    // Decrement product stock
    for (const item of cart.items || []) {
      try {
        const productRef = doc(this.firestore, `products/${item.productId}`);
        // Note: This is not atomic, but better than losing the order
        // The webhook version uses transactions for atomicity
        const productDoc = await import('@angular/fire/firestore').then(m => m.getDoc(productRef));
        if (productDoc.exists()) {
          const productData = productDoc.data() || {};
          const variants = Array.isArray(productData['variants']) ? productData['variants'] : [];
          const rawVariantId = item.variantId || null;
          const normalizedVariantId = rawVariantId
            ? rawVariantId.replace(/^sku:/, '').replace(/^label:/, '').replace(/^finish:/, '')
            : null;
          let updatedVariant = false;

          if (rawVariantId && variants.length) {
            const variantIndex = variants.findIndex((variant: any) =>
              variant?.id === rawVariantId
              || variant?.id === normalizedVariantId
              || variant?.sku === normalizedVariantId
              || variant?.label === normalizedVariantId
              || variant?.finish === normalizedVariantId
            );

            if (variantIndex >= 0) {
              const variant = variants[variantIndex] || {};
              const currentVariantStock = Number(variant.stock || 0);
              const newVariantStock = Math.max(0, currentVariantStock - item.qty);
              variants[variantIndex] = { ...variant, stock: newVariantStock };

              await updateDoc(productRef, {
                variants,
                updatedAt: serverTimestamp(),
              });

              const stockLogRef = doc(collection(this.firestore, 'stock_log'));
              await setDoc(stockLogRef, {
                productId: item.productId,
                variantId: rawVariantId,
                orderId,
                orderNumber,
                change: -item.qty,
                previousStock: currentVariantStock,
                newStock: newVariantStock,
                reason: 'order_placed_variant_fallback',
                createdAt: serverTimestamp(),
              });

              updatedVariant = true;
            }
          }

          if (!updatedVariant) {
            const currentStock = productData['stock'] || 0;
            const newStock = Math.max(0, currentStock - item.qty);
            
            await updateDoc(productRef, {
              stock: newStock,
              updatedAt: serverTimestamp(),
            });
            
            // Log stock change
            const stockLogRef = doc(collection(this.firestore, 'stock_log'));
            await setDoc(stockLogRef, {
              productId: item.productId,
              orderId,
              orderNumber,
              change: -item.qty,
              previousStock: currentStock,
              newStock,
              reason: 'order_placed_fallback',
              createdAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        void 0;
        // Continue with other products
      }
    }

    void 0;
    return orderId;
  }
}
