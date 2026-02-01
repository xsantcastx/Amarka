import { Injectable, inject } from '@angular/core';
import { loadStripe, Stripe, StripeElements, StripeCardElement, PaymentIntent } from '@stripe/stripe-js';
import { environment } from '../../environments/environment';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { SettingsService } from './settings.service';

/**
 * Service for Stripe payment processing
 * Handles card tokenization, payment confirmation, and 3D Secure authentication
 * Now reads Stripe publishable key from Settings instead of environment
 */
@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private settingsService = inject(SettingsService);
  private stripePromise: Promise<Stripe | null> | null = null;
  private stripe$ = new BehaviorSubject<Stripe | null>(null);
  
  constructor() {
    // Initialize Stripe with settings
    this.initializeStripeFromSettings();
  }

  /**
   * Initialize Stripe with publishable key from settings
   */
  private async initializeStripeFromSettings() {
    try {
      const settings = await this.settingsService.getSettings();
      const publishableKey = settings.stripePublicKey || environment.stripe.publishableKey;
      
      if (!publishableKey) {
        void 0;
        return;
      }

      void 0;
      
      this.stripePromise = loadStripe(publishableKey);
      const stripe = await this.stripePromise;
      this.stripe$.next(stripe);
    } catch (error) {
      void 0;
      // Fallback to environment key
      this.stripePromise = loadStripe(environment.stripe.publishableKey);
      const stripe = await this.stripePromise;
      this.stripe$.next(stripe);
    }
  }

  /**
   * Get Stripe instance
   */
  async getStripe(): Promise<Stripe | null> {
    return this.stripePromise;
  }

  /**
   * Create card Elements for payment form
   * @param elementId - HTML element ID to mount the card element
   */
  async createCardElement(elementId: string): Promise<{
    elements: StripeElements;
    cardElement: StripeCardElement;
  } | null> {
    const stripe = await this.getStripe();
    if (!stripe) {
      void 0;
      throw new Error('Stripe failed to load');
    }

    void 0;

    // Create Elements instance
    const elements = stripe.elements({
      appearance: {
        theme: 'stripe', // Light theme to match Amarka aesthetic
        variables: {
          colorPrimary: '#C7683B', // Amarka terracotta
          colorBackground: '#FEFCF8',
          colorText: '#17130F', // ts-ink
          colorDanger: '#ef4444',
          fontFamily: 'system-ui, sans-serif',
          spacingUnit: '4px',
          borderRadius: '12px',
        },
        rules: {
          '.Input': {
            backgroundColor: '#FEFCF8',
            border: '1px solid rgba(199, 104, 59, 0.2)',
            padding: '12px',
          },
          '.Input:focus': {
            border: '2px solid rgba(199, 104, 59, 0.5)',
            boxShadow: '0 0 0 3px rgba(199, 104, 59, 0.1)',
          },
          '.Label': {
            color: '#4B3B2F', // ts-ink-soft
            fontSize: '14px',
            fontWeight: '600',
          },
        },
      },
    });

    void 0;

    // Create card element
    const cardElement = elements.create('card', {
      style: {
        base: {
          iconColor: '#C7683B', // Amarka terracotta
          color: '#17130F', // ts-ink
          fontWeight: '500',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          fontSmoothing: 'antialiased',
          '::placeholder': {
            color: '#9ca3af',
          },
        },
        invalid: {
          iconColor: '#ef4444',
          color: '#ef4444',
        },
      },
      hidePostalCode: true, // We collect this separately
      disableLink: false, // Enable Link for autofill
      iconStyle: 'solid', // Use solid icons
    });

    void 0;

    // Mount to DOM
    const element = document.getElementById(elementId);
    if (element) {
      try {
        cardElement.mount(`#${elementId}`);
        void 0;
      } catch (mountError) {
        void 0;
        throw mountError;
      }
    } else {
      void 0;
      throw new Error(`Element #${elementId} not found`);
    }

    return { elements, cardElement };
  }

  /**
   * Confirm a payment with client secret
   * @param clientSecret - PaymentIntent client secret from backend
   * @param cardElement - Stripe card element
   * @param billingDetails - Billing address information
   */
  async confirmCardPayment(
    clientSecret: string,
    cardElement: StripeCardElement,
    billingDetails: {
      name: string;
      email: string;
      phone?: string;
      address?: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
      };
    }
  ): Promise<{ paymentIntent?: PaymentIntent; error?: any }> {
    const stripe = await this.getStripe();
    if (!stripe) {
      return { error: { message: 'Stripe not loaded' } };
    }

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: billingDetails,
        },
      });

      if (result.error) {
        // Payment failed
        void 0;
        return { error: result.error };
      }

      // Payment succeeded
      return { paymentIntent: result.paymentIntent };
    } catch (error) {
      void 0;
      return { error };
    }
  }

  /**
   * Handle card action (e.g., 3D Secure authentication)
   * This is called when payment requires additional authentication
   */
  async handleCardAction(clientSecret: string): Promise<{ paymentIntent?: PaymentIntent; error?: any }> {
    const stripe = await this.getStripe();
    if (!stripe) {
      return { error: { message: 'Stripe not loaded' } };
    }

    try {
      const result = await stripe.handleCardAction(clientSecret);

      if (result.error) {
        return { error: result.error };
      }

      return { paymentIntent: result.paymentIntent };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Retrieve a PaymentIntent by client secret
   */
  async retrievePaymentIntent(clientSecret: string): Promise<PaymentIntent | null> {
    const stripe = await this.getStripe();
    if (!stripe) {
      return null;
    }

    try {
      const result = await stripe.retrievePaymentIntent(clientSecret);
      if (result.error) {
        void 0;
        return null;
      }
      return result.paymentIntent;
    } catch (error) {
      void 0;
      return null;
    }
  }

  /**
   * Get user-friendly error message from Stripe error
   */
  getErrorMessage(error: any): string {
    if (!error) return 'An unknown error occurred';

    switch (error.code) {
      case 'card_declined':
        return 'Your card was declined. Please try a different payment method.';
      case 'expired_card':
        return 'Your card has expired. Please use a different card.';
      case 'incorrect_cvc':
        return 'The security code is incorrect. Please check and try again.';
      case 'processing_error':
        return 'An error occurred processing your card. Please try again.';
      case 'incorrect_number':
        return 'The card number is incorrect. Please check and try again.';
      case 'invalid_expiry_month':
      case 'invalid_expiry_year':
        return 'The expiration date is invalid. Please check and try again.';
      case 'insufficient_funds':
        return 'Your card has insufficient funds. Please use a different payment method.';
      default:
        return error.message || 'Payment failed. Please try again.';
    }
  }

  /**
   * Format amount for display (cents to dollars)
   */
  formatAmount(amountInCents: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amountInCents / 100);
  }

  /**
   * Convert dollars to cents for Stripe
   */
  toCents(amount: number): number {
    return Math.round(amount * 100);
  }
}
