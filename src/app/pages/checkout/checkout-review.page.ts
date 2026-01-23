import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Auth } from '@angular/fire/auth';
import { combineLatest, map, startWith } from 'rxjs';

import { CartService } from '../../services/cart.service';
import { AddressService } from '../../services/address.service';
import { ShippingService, ShippingMethod } from '../../services/shipping.service';
import { SettingsService, AppSettings } from '../../services/settings.service';
import { AnalyticsService } from '../../services/analytics.service';
import { Address } from '../../models/cart';

interface CartItemDisplay {
  productId: string;
  name: string;
  imageUrl?: string;
  sku?: string;
  variantLabel?: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

@Component({
  standalone: true,
  selector: 'ts-checkout-review-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './checkout-review.page.html',
  styleUrls: ['./checkout-review.page.scss']
})
export class CheckoutReviewPage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(Auth);
  private cartService = inject(CartService);
  private addressService = inject(AddressService);
  private shippingService = inject(ShippingService);
  private settingsService = inject(SettingsService);
  private translate = inject(TranslateService);
  private analyticsService = inject(AnalyticsService);

  // State
  loading = signal(true);
  calculatingShipping = signal(false);
  error = signal<string | null>(null);
  showAddressForm = signal(false);
  savingAddress = signal(false);
  
  // Data
  addresses = signal<Address[]>([]);
  selectedAddress = signal<Address | null>(null);
  shippingMethods = signal<ShippingMethod[]>([]);
  selectedShippingMethod = signal<ShippingMethod | null>(null);
  shippingSettings = signal<AppSettings | null>(null);

  // Form for address selection
  form = this.fb.group({
    addressId: ['', Validators.required],
    shippingMethodId: ['standard', Validators.required]
  });

  // Form for adding new address
  addressForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneE164: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{1,14}$/)]],
    line1: ['', Validators.required],
    line2: [''],
    city: ['', Validators.required],
    region: ['', Validators.required],
    postalCode: ['', Validators.required],
    country: ['US', Validators.required],
    isDefault: [true]
  });

  // View model combining cart and display data
  vm$ = combineLatest([
    this.cartService.cart$,
    this.form.valueChanges.pipe(
      // Start with current form value so observable emits immediately
      startWith(this.form.value)
    )
  ]).pipe(
    map(([cart, formValue]) => {
      console.log('[CheckoutReview] vm$ - cart:', cart, 'formValue:', formValue);
      if (!cart || !cart.items.length) {
        console.log('[CheckoutReview] vm$ - No cart or empty cart');
        return null;
      }

      const items: CartItemDisplay[] = cart.items.map(item => ({
        productId: item.productId,
        name: item.name,
        imageUrl: item.imageUrl,
        sku: item.sku,
        variantLabel: item.variantLabel,
        qty: item.qty,
        unitPrice: item.unitPrice,
        subtotal: item.unitPrice * item.qty
      }));

      const vm = {
        items,
        subtotal: cart.subtotal || 0,
        shipping: cart.shipping || 0,
        tax: cart.tax || 0,
        discount: cart.discount || 0,
        total: cart.total || 0,
        currency: cart.currency || 'USD',
        shippingMethodId: cart.shippingMethodId
      };
      
      console.log('[CheckoutReview] vm$ - returning vm:', vm);
      return vm;
    })
  );

  ngOnInit() {
    this.settingsService.settings$.subscribe(settings => {
      this.shippingSettings.set(settings);
      if (settings && !settings.shippingEnabled) {
        this.applyStaticShipping(null);
      }
    });
    this.settingsService.getSettings().then(settings => this.shippingSettings.set(settings));
    this.loadCheckoutData();
  }

  /**
   * Load user addresses and cart data
   */
  private async loadCheckoutData() {
    try {
      this.loading.set(true);
      this.error.set(null);

      const user = this.auth.currentUser;
      if (!user) {
        // Redirect to login if not authenticated
        this.router.navigate(['/client/login'], {
          queryParams: { returnUrl: '/checkout/review' }
        });
        return;
      }

      // Check if cart has items
      const cart = this.cartService.snapshot();
      if (!cart || !cart.items || cart.items.length === 0) {
        this.error.set('Your cart is empty. Please add items before checking out.');
        setTimeout(() => {
          this.router.navigate(['/cart']);
        }, 2000);
        return;
      }

      this.analyticsService.trackBeginCheckout(cart);

      // Load user addresses
      this.addressService.getUserAddresses(user.uid).subscribe({
        next: (addresses) => {
          this.addresses.set(addresses);
          
          // Auto-select default address
          const defaultAddr = addresses.find(a => a.isDefault);
          if (defaultAddr?.id) {
            this.selectedAddress.set(defaultAddr);
            this.form.patchValue({ addressId: defaultAddr.id }, { emitEvent: false });
            
            // Calculate shipping for default address
            void this.onAddressChange(defaultAddr.id);
          }
        },
        error: (err) => {
          console.error('Failed to load addresses:', err);
          this.error.set('Failed to load shipping addresses. Please try again.');
        }
      });

    } catch (err: any) {
      console.error('Checkout initialization error:', err);
      this.error.set(err.message || 'Failed to initialize checkout');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Handle address selection change
   */
  async onAddressChange(addressId: string) {
    const address = this.addresses().find(a => a.id === addressId);
    if (address) {
      this.selectedAddress.set(address);

      const cart = this.cartService.snapshot();
      if (cart?.id) {
        try {
          await this.cartService.updateShippingAddress(cart.id, {
            firstName: address.firstName,
            lastName: address.lastName,
            line1: address.line1,
            line2: address.line2 || null,
            city: address.city,
            region: address.region,
            state: address.region,
            postalCode: address.postalCode,
            country: address.country,
            phoneE164: address.phoneE164,
            email: address.email
          });
        } catch (persistError) {
          console.error('Failed to save shipping address to cart:', persistError);
        }
      }

      this.calculateShipping(address);
    }
  }

  /**
   * Handle shipping method selection change
   */
  onShippingMethodChange(methodId: string) {
    const method = this.shippingMethods().find(m => m.id === methodId);
    if (method) {
      this.selectedShippingMethod.set(method);
      const settings = this.shippingSettings();
      if (settings && !settings.shippingEnabled) {
        this.cartService.updateShippingCost(method.cost, method.id);
        return;
      }
      // TODO: When dynamic shipping is enabled, invoke the Cloud Function to reprice the cart
    }
  }

  /**
   * Calculate shipping costs based on selected address
   */
  private calculateShipping(address: Address) {
    const cart = this.cartService.snapshot();
    if (!cart || !cart.id) {
      this.error.set('Cart not found');
      return;
    }

    this.calculatingShipping.set(true);
    this.error.set(null);

    if (this.applyStaticShipping(address)) {
      return;
    }

    this.shippingService.calculateShipping(cart.id, {
      country: address.country,
      region: address.region,
      postalCode: address.postalCode
    }).subscribe({
      next: (response) => {
        this.shippingMethods.set(response.shippingMethods);

        if (!response.shippingMethods?.length) {
          if (this.applyStaticShipping(address, true)) {
            return;
          }
        }
        
        // Auto-select standard shipping
        const standard = response.shippingMethods.find(m => m.id === 'standard');
        if (standard) {
          this.selectedShippingMethod.set(standard);
          this.form.patchValue({ shippingMethodId: 'standard' });
        } else if (response.shippingMethods[0]) {
          this.selectedShippingMethod.set(response.shippingMethods[0]);
          this.form.patchValue({ shippingMethodId: response.shippingMethods[0].id });
        }

        // Cart totals are automatically updated by the Cloud Function
        this.calculatingShipping.set(false);
      },
      error: (err) => {
        console.error('Shipping calculation error:', err);
        this.error.set('Failed to calculate shipping. Please try again.');
        if (!this.applyStaticShipping(address, true)) {
          this.calculatingShipping.set(false);
        }
      }
    });
  }

  /**
   * Navigate to add new address
   */
  addNewAddress() {
    this.router.navigate(['/client/addresses/new'], {
      queryParams: { returnUrl: '/checkout/review' }
    });
  }

  /**
   * Save new address from inline form
   */
  async saveNewAddress() {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      this.error.set('Please fill in all required fields');
      return;
    }

    this.savingAddress.set(true);
    this.error.set(null);

    try {
      const addressData = this.addressForm.value as Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
      const addressId = await this.addressService.createAddress(addressData);
      
      console.log('[CheckoutReview] Address created:', addressId);
      
      // Reload addresses
      const user = this.auth.currentUser;
      if (user) {
        this.addressService.getUserAddresses(user.uid).subscribe({
          next: (addresses) => {
            this.addresses.set(addresses);
            
            // Auto-select the newly created address
            const newAddress = addresses.find(a => a.id === addressId);
            if (newAddress) {
              this.selectedAddress.set(newAddress);
              this.form.patchValue({ addressId: newAddress.id });
              this.calculateShipping(newAddress);
            }
            
            // Hide the form
            this.showAddressForm.set(false);
            this.addressForm.reset({ country: 'US', isDefault: true });
          }
        });
      }
    } catch (err: any) {
      console.error('[CheckoutReview] Failed to save address:', err);
      this.error.set(err.message || 'Failed to save address');
    } finally {
      this.savingAddress.set(false);
    }
  }

  /**
   * Cancel adding new address
   */
  cancelAddAddress() {
    this.showAddressForm.set(false);
    this.addressForm.reset({ country: 'US', isDefault: true });
    this.error.set(null);
  }

  /**
   * Proceed to payment
   */
  async proceedToPayment() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please select a shipping address and method');
      return;
    }

    const address = this.selectedAddress() 
      || this.addresses().find(a => a.id === this.form.value.addressId);
    let shippingMethod = this.selectedShippingMethod() 
      || this.shippingMethods().find(m => m.id === this.form.value.shippingMethodId) 
      || this.hydrateShippingFromCart();

    if (address && !this.selectedAddress()) {
      this.selectedAddress.set(address);
    }
    if (shippingMethod && !this.selectedShippingMethod()) {
      this.selectedShippingMethod.set(shippingMethod);
      this.form.patchValue({ shippingMethodId: shippingMethod.id }, { emitEvent: false });
    }

    if (!address || !shippingMethod) {
      this.error.set('Please select a shipping address and method');
      return;
    }

    const cart = this.cartService.snapshot();
    if (cart?.id) {
      try {
        await this.cartService.updateShippingAddress(cart.id, {
          firstName: address.firstName,
          lastName: address.lastName,
          line1: address.line1,
          line2: address.line2 || null,
          city: address.city,
          region: address.region,
          state: address.region,
          postalCode: address.postalCode,
          country: address.country,
          phoneE164: address.phoneE164,
          email: address.email
        });

        const methodCost = shippingMethod.cost ?? cart.shipping ?? 0;
        await this.cartService.updateShippingCost(methodCost, shippingMethod.id);
      } catch (persistError) {
        console.error('Failed to persist checkout selections:', persistError);
      }
    }

    // Navigate to payment page
    this.router.navigate(['/checkout/payment']);
  }

  /**
   * Go back to cart
   */
  backToCart() {
    this.router.navigate(['/cart']);
  }

  /**
   * Format currency
   */
  private applyStaticShipping(_address?: Address | null, force = false): boolean {
    const settings = this.shippingSettings();
    if (!settings || (settings.shippingEnabled && !force)) {
      return false;
    }

    const cartSnapshot = this.cartService.snapshot();
    if (!cartSnapshot) {
      this.calculatingShipping.set(false);
      return true;
    }

    const subtotal = cartSnapshot.subtotal || 0;
    const freeThreshold = settings.freeShippingThreshold ?? 0;
    const baseCost = settings.defaultShippingCost ?? 0;
    const shippingCost = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : baseCost;

    const currentShipping = cartSnapshot.shipping ?? 0;
    const currentMethod = cartSnapshot.shippingMethodId;
    if (Math.abs(currentShipping - shippingCost) < 0.01 && currentMethod === 'flat-rate') {
      if (!this.shippingMethods().length) {
        const methodSnapshot: ShippingMethod = {
          id: 'flat-rate',
          name: this.translate.instant('cart.shipping.flat_rate'),
          description: settings.shippingEstimate || this.translate.instant('cart.shipping.estimate_default'),
          cost: shippingCost,
          currency: cartSnapshot.currency || 'USD',
          estimatedDays: settings.shippingEstimate || ''
        };
        this.shippingMethods.set([methodSnapshot]);
        this.selectedShippingMethod.set(methodSnapshot);
        this.form.patchValue({ shippingMethodId: methodSnapshot.id }, { emitEvent: false });
      }
      this.calculatingShipping.set(false);
      return true;
    }

    const method: ShippingMethod = {
      id: 'flat-rate',
      name: this.translate.instant('cart.shipping.flat_rate'),
      description: settings.shippingEstimate || this.translate.instant('cart.shipping.estimate_default'),
      cost: shippingCost,
      currency: cartSnapshot.currency || 'USD',
      estimatedDays: settings.shippingEstimate || ''
    };

    this.shippingMethods.set([method]);
    this.selectedShippingMethod.set(method);
    this.form.patchValue({ shippingMethodId: method.id }, { emitEvent: false });
    this.cartService.updateShippingCost(shippingCost, method.id);
    this.calculatingShipping.set(false);
    return true;
  }

  private hydrateShippingFromCart(): ShippingMethod | null {
    const cartSnapshot = this.cartService.snapshot();
    if (!cartSnapshot) {
      return null;
    }

    const methodId = cartSnapshot.shippingMethodId || (cartSnapshot as any).shippingMethod;
    if (!methodId) {
      return null;
    }

    return {
      id: methodId,
      name: methodId === 'flat-rate'
        ? this.translate.instant('cart.shipping.flat_rate')
        : this.translate.instant('cart.shipping.standard') || 'Standard Shipping',
      description: this.translate.instant('cart.shipping.estimate_default'),
      cost: cartSnapshot.shipping ?? 0,
      currency: cartSnapshot.currency || 'USD',
      estimatedDays: this.shippingSettings()?.shippingEstimate || ''
    };
  }

  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  }
}




