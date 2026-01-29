import { Timestamp } from '@angular/fire/firestore';

export type Id = string;

export interface BulkPricingTierSnapshot {
  minQty: number;
  unitPrice: number;
  label?: string;
}

export interface CustomizationPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface CartItemCustomization {
  id?: string;
  logoUrl: string;
  logoFilename?: string;
  baseImageUrl?: string;
  placement: CustomizationPlacement;
}

// ===== Cart Item =====

export interface CartItem {
  productId: Id;
  variantId?: Id;              // Optional: if product has variants
  name: string;                // Product name snapshot
  variantLabel?: string;       // e.g., "Black / 128GB" - for display
  qty: number;
  unitPrice: number;           // Price at time of adding to cart
  basePrice?: number;          // Base unit price before tiering
  currency: string;            // e.g., "USD"
  priceSnapshotAtAdd: number;  // Historical record of price when added
  imageUrl?: string;           // Product image for cart display
  variantImageUrl?: string;    // Variant image if selected
  sku?: string;                // Product/variant SKU
  grosor?: string;             // Category/model identifier
  
  // Stock validation
  stockAvailable?: number;     // Current stock level (for validation)
  
  // Pricing tiers snapshot (for bulk pricing)
  bulkPricingTiers?: BulkPricingTierSnapshot[];

  // Customization snapshot (for customizable products)
  customizationId?: Id;
  customization?: CartItemCustomization;
}

// ===== Cart =====

export interface Cart {
  id?: Id;                     // Cart ID (typically uid or temp anonymous ID)
  uid?: Id;                    // User ID (null for anonymous, upgrades on sign-in)
  items: CartItem[];
  
  // Calculated totals (updated on any cart change)
  subtotal: number;
  shipping?: number;
  tax?: number;
  discount?: number;           // From promo codes
  total: number;
  currency: string;            // e.g., "USD"
  
  // Metadata
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  
  // Checkout state
  shippingMethodId?: Id;       // Selected shipping method
  promoCode?: string;          // Applied promo code
}

// ===== Address =====

export interface Address {
  id?: Id;
  userId?: Id;                 // Owner of this address
  
  // Required fields
  firstName: string;
  lastName: string;
  line1: string;               // Address line 1
  city: string;
  region: string;              // State/Province/Region
  postalCode: string;
  country: string;             // ISO 3166-1 alpha-2 (e.g., "US")
  phoneE164: string;           // Phone in E.164 format (e.g., "+14155551234")
  email: string;               // Contact email
  
  // Optional fields
  line2?: string;              // Apt/Suite/Unit
  company?: string;
  unit?: string;               // Apt/Unit number
  buzzer?: string;             // Buzzer code
  deliveryNotes?: string;      // Special delivery instructions
  
  // Metadata
  isDefault?: boolean;         // Default shipping address
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ===== Shipping Method =====

export interface ShippingMethod {
  id: Id;
  label: string;               // e.g., "Standard Shipping"
  description?: string;        // e.g., "5-7 business days"
  cost: number;
  currency: string;
  estimatedDays?: number;      // Delivery time estimate
  eta?: string;                // Formatted ETA string
  carrier?: string;            // e.g., "USPS", "UPS", "FedEx"
}

// ===== Order Item =====

export interface OrderItem {
  productId: Id;
  variantId?: Id;
  name: string;
  variantLabel?: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  currency: string;
  imageUrl?: string;
  grosor?: string;             // Category/model identifier
  customizationId?: Id;
  customization?: CartItemCustomization;
}

// ===== Order Totals =====

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
}

// ===== Order Contact =====

export interface OrderContact {
  email: string;
  phoneE164: string;
}

// ===== Payment Info =====

export interface PaymentInfo {
  provider: 'stripe';
  paymentIntentId: string;
  status: 'requires_payment_method' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  
  // Card details (if card payment)
  last4?: string;
  brand?: string;              // e.g., "visa", "mastercard"
  
  // Error details
  latestError?: string;
  
  // Timestamps
  createdAt?: Timestamp;
  paidAt?: Timestamp;
}

// ===== Order =====

export interface Order {
  id?: Id;
  orderNumber?: string;        // Human-readable order number (e.g., "ORD-2024-001234")
  uid: Id;                     // User who placed the order
  
  // Status tracking
  status: 'PLACED' | 'PAID' | 'FULFILLING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  
  // Order contents
  items: OrderItem[];
  totals: OrderTotals;
  
  // Shipping & contact
  shippingAddress: Address;
  contact: OrderContact;
  shippingMethod: ShippingMethod;
  
  // Payment
  payment: PaymentInfo;
  
  // Tracking
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  
  // Metadata
  meta: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    ip?: string;               // Customer IP (for fraud detection)
    userAgent?: string;        // Browser user agent
  };
  
  // Notes
  customerNotes?: string;
  internalNotes?: string;      // Admin-only notes
}

// ===== Payment (separate collection for tracking) =====

export interface Payment {
  id?: Id;                     // PaymentIntent ID from Stripe
  orderId: Id;
  uid: Id;
  
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  
  clientSecret?: string;       // For client-side confirmation
  
  // Stripe details
  customerId?: string;         // Stripe Customer ID
  paymentMethodId?: string;    // Stripe Payment Method ID
  
  // Error tracking
  latestError?: {
    code?: string;
    message?: string;
    declineCode?: string;
  };
  
  // Events log (for audit)
  events?: Array<{
    type: string;
    timestamp: Timestamp;
    data?: any;
  }>;
  
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ===== Webhook Log (for auditing) =====

export interface WebhookLog {
  id?: Id;
  type: string;                // e.g., "payment_intent.succeeded"
  provider: 'stripe';
  
  rawEvent: any;               // Full webhook payload
  processed: boolean;
  processedAt?: Timestamp;
  
  error?: string;
  
  createdAt: Timestamp;
}

// ===== Promo Code (optional for phase 2) =====

export interface PromoCode {
  id?: Id;
  code: string;                // e.g., "SUMMER2024"
  type: 'percentage' | 'fixed';
  value: number;               // Percentage (0-100) or fixed amount
  currency?: string;           // For fixed amount discounts
  
  // Usage limits
  maxUses?: number;
  currentUses?: number;
  maxUsesPerUser?: number;
  
  // Validity
  validFrom?: Timestamp;
  validUntil?: Timestamp;
  active: boolean;
  
  // Restrictions
  minOrderAmount?: number;
  applicableCategories?: Id[]; // Restrict to specific categories
  applicableProducts?: Id[];   // Restrict to specific products
  
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
