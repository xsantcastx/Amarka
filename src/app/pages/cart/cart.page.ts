import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CartService } from '../../services/cart.service';
import { AddressService } from '../../services/address.service';
import { ShippingService, ShippingMethod } from '../../services/shipping.service';
import { SettingsService, AppSettings } from '../../services/settings.service';
import { Auth } from '@angular/fire/auth';
import { map, startWith } from 'rxjs/operators';
import { combineLatest, Observable } from 'rxjs';
import { PageHeaderComponent, Breadcrumb } from '../../shared/components/page-header/page-header.component';
import { Address } from '../../models/cart';

interface CartViewModel {
  items: Array<{
    product: {
      id: string;
      name: string;
      imageUrl?: string;
      sku: string | undefined;
      grosor?: string;
      price: number;
    };
    qty: number;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
}

@Component({
  standalone: true,
  selector: 'ts-cart-page',
  imports: [CommonModule, RouterLink, TranslateModule, PageHeaderComponent, ReactiveFormsModule],
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss']
})
export class CartPage implements OnInit {
  private router = inject(Router);
  auth = inject(Auth); // Make public for template access
  private fb = inject(FormBuilder);
  private addressService = inject(AddressService);
  private shippingService = inject(ShippingService);
  private settingsService = inject(SettingsService);
  private translate = inject(TranslateService);
  cart = inject(CartService);

  // State
  showAddressForm = signal(false);
  savingAddress = signal(false);
  calculatingShipping = signal(false);
  addresses = signal<Address[]>([]);
  selectedAddress = signal<Address | null>(null);
  shippingMethods = signal<ShippingMethod[]>([]);
  selectedShippingMethod = signal<ShippingMethod | null>(null);
  cartId = signal<string | null>(null);
  shippingSettings = signal<AppSettings | null>(null);

  // Breadcrumbs for navigation
  breadcrumbs: Breadcrumb[] = [
    { label: 'nav.home', url: '/', icon: 'home' },
    { label: 'nav.products', url: '/productos', icon: 'products' },
    { label: 'cart.title', icon: 'cart' }
  ];

  // Form for address and shipping selection
  checkoutForm = this.fb.group({
    addressId: [''],
    shippingMethodId: ['standard']
  });

  // Form for adding new address
  addressForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneE164: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
    line1: ['', [Validators.required, Validators.minLength(3)]],
    line2: [''],
    city: ['', [Validators.required, Validators.minLength(2)]],
    region: ['', Validators.required],
    postalCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]],
    country: ['US', Validators.required],
    isDefault: [true]
  });

  // Map cart to display-friendly format
  vm$: Observable<CartViewModel> = combineLatest([
    this.cart.cart$,
    this.checkoutForm.valueChanges.pipe(startWith(this.checkoutForm.value))
  ]).pipe(
    map(([cart, formValue]) => ({
      items: cart?.items.map(item => ({
        product: {
          id: item.productId,
          name: item.name,
          imageUrl: item.imageUrl,
          sku: item.sku,
          price: item.unitPrice
        },
        qty: item.qty
      })) || [],
      subtotal: cart?.subtotal || 0,
      shipping: cart?.shipping || 0,
      tax: cart?.tax || 0,
      total: cart?.total || 0,
      currency: cart?.currency || 'USD'
    }))
  );

  ngOnInit() {
    this.settingsService.settings$.subscribe(settings => {
      this.shippingSettings.set(settings);
      if (settings && !settings.shippingEnabled && this.cart.snapshot()?.items?.length) {
        this.applyStaticShipping();
      }
    });
    this.settingsService.getSettings().then(settings => {
      this.shippingSettings.set(settings);
      if (settings && !settings.shippingEnabled && this.cart.snapshot()?.items?.length) {
        this.applyStaticShipping();
      }
    });

    // Subscribe to cart changes to track cart ID
    this.cart.cart$.subscribe(cart => {
      if (cart?.id) {
        this.cartId.set(cart.id);
      }
      const settings = this.shippingSettings();
      if (settings && !settings.shippingEnabled && cart?.items?.length) {
        this.applyStaticShipping();
      }
    });
    
    // Wait for auth to be ready before loading addresses
    if (this.auth.currentUser) {
      this.loadUserAddresses();
    } else {
      // Auth might still be initializing, wait for it
      const unsubscribe = this.auth.onAuthStateChanged((user) => {
        if (user) {
          this.loadUserAddresses();
          unsubscribe(); // Unsubscribe after first load
        }
      });
    }
  }

  /**
   * Load user addresses if authenticated
   */
  private loadUserAddresses() {
    const user = this.auth.currentUser;
    if (!user) return;

    this.addressService.getUserAddresses(user.uid).subscribe({
      next: (addresses) => {
        this.addresses.set(addresses);
        
        // Auto-select default address
        const defaultAddr = addresses.find(a => a.isDefault);
        if (defaultAddr?.id) {
          this.checkoutForm.patchValue({ addressId: defaultAddr.id }, { emitEvent: false });
          // Use the same flow as manual selection so the address is persisted to the cart
          void this.onAddressChange(defaultAddr.id);
        }
      },
      error: (err) => console.error('Failed to load addresses:', err)
    });
  }

  /**
   * Handle address selection change
   */
  async onAddressChange(addressId: string) {
    const address = this.addresses().find(a => a.id === addressId);
    if (address) {
      this.selectedAddress.set(address);
      
      // Save shipping address to cart in Firestore
      const currentCartId = this.cartId();
      if (currentCartId) {
        try {
          await this.cart.updateShippingAddress(currentCartId, {
            firstName: address.firstName,
            lastName: address.lastName,
            line1: address.line1,
            line2: address.line2 || null,
            city: address.city,
            region: address.region,
            state: address.region, // Alias for compatibility
            postalCode: address.postalCode,
            country: address.country,
            phoneE164: address.phoneE164,
            email: address.email
          });
          console.log('Shipping address saved to cart:', address);
        } catch (error) {
          console.error('Error saving shipping address:', error);
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
        this.cart.updateShippingCost(method.cost, method.id);
        return;
      }
      
      // Recalculate cart totals with the new shipping method
      const address = this.selectedAddress();
      const currentCartId = this.cartId();
      
      if (address && currentCartId) {
        this.calculatingShipping.set(true);
        
        this.shippingService
          .selectShippingMethod(currentCartId, address, methodId)
          .subscribe({
            next: (response) => {
              this.calculatingShipping.set(false);
              console.log('Cart totals updated with new shipping method:', response.totals);
            },
            error: (error) => {
              console.error('Error updating shipping method:', error);
              this.calculatingShipping.set(false);
            }
          });
      }
    }
  }

  /**
   * Calculate shipping costs based on selected address
   */
  private calculateShipping(address: Address) {
    const cartSnapshot = this.cart.snapshot();
    if (!cartSnapshot || !cartSnapshot.id) return;

    this.calculatingShipping.set(true);

    if (this.applyStaticShipping(address)) {
      return;
    }

    this.shippingService.calculateShipping(cartSnapshot.id, {
      country: address.country,
      region: address.region,
      postalCode: address.postalCode
    }).subscribe({
      next: (response) => {
        this.shippingMethods.set(response.shippingMethods);

        // If the function returned no methods, fall back to static settings so checkout isn't blocked
        if (!response.shippingMethods?.length) {
          if (this.applyStaticShipping(address, true)) {
            return;
          }
        }
        
        // Auto-select standard shipping
        const standard = response.shippingMethods.find(m => m.id === 'standard');
        if (standard) {
          this.selectedShippingMethod.set(standard);
          this.checkoutForm.patchValue({ shippingMethodId: 'standard' });
        } else if (response.shippingMethods[0]) {
          // Fallback to the first returned method if "standard" isn't present
          this.selectedShippingMethod.set(response.shippingMethods[0]);
          this.checkoutForm.patchValue({ shippingMethodId: response.shippingMethods[0].id });
        }

        this.calculatingShipping.set(false);
      },
      error: (err) => {
        console.error('Shipping calculation error:', err);
        if (!this.applyStaticShipping(address, true)) {
          this.calculatingShipping.set(false);
        }
      }
    });
  }

  private applyStaticShipping(_address?: Address | null, force = false): boolean {
    const settings = this.shippingSettings();
    if (!settings || (settings.shippingEnabled && !force)) {
      return false;
    }

    const cartSnapshot = this.cart.snapshot();
    if (!cartSnapshot) {
      this.calculatingShipping.set(false);
      return true;
    }

    if (!cartSnapshot.items || cartSnapshot.items.length === 0) {
      this.shippingMethods.set([]);
      this.selectedShippingMethod.set(null);
      this.calculatingShipping.set(false);
      return true;
    }

    const subtotal = cartSnapshot.subtotal || 0;
    const freeThreshold = Math.max(0, settings.freeShippingThreshold ?? 0);
    const baseCost = Math.max(0, settings.defaultShippingCost ?? 0);
    const shippingCost = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : baseCost;
    const description = settings.shippingEstimate || this.translate.instant('cart.shipping.estimate_default');

    const currentShipping = cartSnapshot.shipping ?? 0;
    const currentMethod = cartSnapshot.shippingMethodId;
    if (Math.abs(currentShipping - shippingCost) < 0.01 && currentMethod === 'flat-rate') {
      if (!this.shippingMethods().length) {
        const methodSnapshot: ShippingMethod = {
          id: 'flat-rate',
          name: this.translate.instant('cart.shipping.flat_rate'),
          description,
          cost: shippingCost,
          currency: cartSnapshot.currency || 'USD',
          estimatedDays: description
        };
        this.shippingMethods.set([methodSnapshot]);
        this.selectedShippingMethod.set(methodSnapshot);
        this.checkoutForm.patchValue({ shippingMethodId: methodSnapshot.id }, { emitEvent: false });
      }
      this.calculatingShipping.set(false);
      return true;
    }

    const method: ShippingMethod = {
      id: 'flat-rate',
      name: this.translate.instant('cart.shipping.flat_rate'),
      description,
      cost: shippingCost,
      currency: cartSnapshot.currency || 'USD',
      estimatedDays: description
    };

    this.shippingMethods.set([method]);
    this.selectedShippingMethod.set(method);
    this.checkoutForm.patchValue({ shippingMethodId: method.id }, { emitEvent: false });
    this.cart.updateShippingCost(shippingCost, method.id);
    this.calculatingShipping.set(false);
    return true;
  }

  /**
   * Build a shipping method from the current cart snapshot so checkout can continue
   * even if the rates UI is hidden.
   */
  private hydrateShippingFromCart(): ShippingMethod | null {
    const cartSnapshot = this.cart.snapshot();
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

  /**
   * Save new address from inline form
   */
  async saveNewAddress() {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    // Prevent duplicate submissions
    if (this.savingAddress()) {
      console.log('Already saving address, please wait...');
      return;
    }

    this.savingAddress.set(true);

    try {
      const addressData = this.addressForm.value as Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
      
      console.log('Creating new address:', addressData);
      const addressId = await this.addressService.createAddress(addressData);
      console.log('Address created with ID:', addressId);
      
      // Hide the form and reset it immediately to prevent re-submission
      this.showAddressForm.set(false);
      this.addressForm.reset({ country: 'US', isDefault: true });
      
      // Reload addresses
      const user = this.auth.currentUser;
      if (user) {
        this.addressService.getUserAddresses(user.uid).subscribe({
          next: (addresses) => {
            console.log('Loaded addresses after save:', addresses.length);
            this.addresses.set(addresses);
            
            // Auto-select the newly created address
            const newAddress = addresses.find(a => a.id === addressId);
            if (newAddress) {
              this.selectedAddress.set(newAddress);
              this.checkoutForm.patchValue({ addressId: newAddress.id });
              this.calculateShipping(newAddress);
            }
          },
          error: (err) => {
            console.error('Failed to reload addresses:', err);
          }
        });
      }
    } catch (err: any) {
      console.error('Failed to save address:', err);
      alert('Failed to save address: ' + err.message);
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
  }

  /**
   * Delete an address
   */
  async deleteAddress(addressId: string) {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      await this.addressService.deleteAddress(addressId);
      console.log('Address deleted:', addressId);
      
      // Reload addresses
      this.loadUserAddresses();
      
      // Clear selection if deleted address was selected
      if (this.selectedAddress()?.id === addressId) {
        this.selectedAddress.set(null);
        this.checkoutForm.patchValue({ addressId: '' });
        this.shippingMethods.set([]);
        this.selectedShippingMethod.set(null);
      }
    } catch (err: any) {
      console.error('Failed to delete address:', err);
      alert('Failed to delete address: ' + err.message);
    }
  }

  async updateQty(id: string, q: string) { 
    await this.cart.updateQty(id, +q); 
  }
  
  async remove(id: string) { 
    await this.cart.remove(id); 
  }
  
  async clear() { 
    await this.cart.clear(); 
  }

  /**
   * Proceed to checkout/payment - requires authentication and address
   */
  async checkout() {
    const user = this.auth.currentUser;
    
    if (!user) {
      // Redirect to login with return URL
      this.router.navigate(['/client/login'], {
        queryParams: { returnUrl: '/cart' }
      });
      return;
    }

    // Check if address and shipping are selected
    console.log('Checkout validation:', {
      selectedAddress: this.selectedAddress(),
      selectedShippingMethod: this.selectedShippingMethod(),
      formAddressId: this.checkoutForm.value.addressId,
      formShippingMethodId: this.checkoutForm.value.shippingMethodId
    });

    const address = this.selectedAddress() 
      || this.addresses().find(a => a.id === this.checkoutForm.value.addressId);

    let shippingMethod = this.selectedShippingMethod() 
      || this.shippingMethods().find(m => m.id === this.checkoutForm.value.shippingMethodId) 
      || this.hydrateShippingFromCart();

    if (address && !this.selectedAddress()) {
      this.selectedAddress.set(address);
    }
    if (shippingMethod && !this.selectedShippingMethod()) {
      this.selectedShippingMethod.set(shippingMethod);
      this.checkoutForm.patchValue({ shippingMethodId: shippingMethod.id }, { emitEvent: false });
    }
    
    if (!address || !shippingMethod) {
      alert('Please select a shipping address and shipping method');
      return;
    }

    // Verify cart has calculated totals
    const cartSnapshot = this.cart.snapshot();
    if (!cartSnapshot || !cartSnapshot.total || cartSnapshot.total <= 0) {
      alert('Cart totals are not calculated. Please refresh the page and try again.');
      console.error('Cart snapshot:', cartSnapshot);
      return;
    }

    console.log('Proceeding to payment with cart:', {
      id: cartSnapshot.id,
      total: cartSnapshot.total,
      shipping: cartSnapshot.shipping,
      shippingMethodId: cartSnapshot.shippingMethodId
    });

    // Persist selections to the cart so the payment step has everything it needs
    if (cartSnapshot.id) {
      try {
        await this.cart.updateShippingAddress(cartSnapshot.id, {
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

        if (shippingMethod) {
          const methodCost = shippingMethod.cost ?? cartSnapshot.shipping ?? 0;
          const methodId = shippingMethod.id;
          await this.cart.updateShippingCost(methodCost, methodId);
        }
      } catch (persistError) {
        console.error('Failed to persist checkout selections:', persistError);
      }
    }

    // Navigate directly to payment
    this.router.navigate(['/checkout/payment']);
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
}
