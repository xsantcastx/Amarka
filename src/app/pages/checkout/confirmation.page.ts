import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Firestore, collection, query, where, getDocs, Timestamp } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { CartService } from '../../services/cart.service';
import { InvoiceService } from '../../services/invoice.service';
import { AnalyticsService } from '../../services/analytics.service';

interface OrderItem {
  productId: string;
  name: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  imageUrl?: string;
}

interface Order {
  orderNumber: string;
  userId: string;
  status: string;
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  shippingMethod: string;
  shippingAddress: any;
  trackingNumber?: string;
  estimatedDelivery?: string;
  createdAt: any;
  paidAt: any;
}

@Component({
  standalone: true,
  selector: 'app-confirmation',
  imports: [CommonModule],
  templateUrl: './confirmation.page.html',
  styleUrls: ['./confirmation.page.scss']
})
export class ConfirmationPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private cartService = inject(CartService);
  private invoiceService = inject(InvoiceService);
  private analyticsService = inject(AnalyticsService);

  // State
  order = signal<Order | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  orderId = signal<string | null>(null);
  retryCount = 0;
  maxRetries = 5;
  cartCleared = false; // Track if cart has been cleared
  private purchaseTracked = false;

  ngOnInit() {
    // Get payment_intent from query params (redirected from payment page)
    const paymentIntentId = this.route.snapshot.queryParamMap.get('payment_intent');
    
    if (!paymentIntentId) {
      this.error.set('Payment intent ID not provided');
      this.loading.set(false);
      return;
    }

    this.loadOrderByPaymentIntent(paymentIntentId);
  }

  private async loadOrderByPaymentIntent(paymentIntentId: string) {
    try {
      console.log(`[Confirmation] Looking for order with payment_intent: ${paymentIntentId}`);
      
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        this.error.set('You must be logged in to view this order');
        this.loading.set(false);
        return;
      }

      console.log(`[Confirmation] Querying for userId: ${currentUser.uid}`);
      
      // Query orders collection for the order with this payment intent
      const ordersRef = collection(this.firestore, 'orders');
      const q = query(
        ordersRef,
        where('paymentIntentId', '==', paymentIntentId),
        where('userId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);

      console.log(`[Confirmation] Found ${querySnapshot.docs.length} orders`);

      if (querySnapshot.empty) {
        // Retry if webhook hasn't processed yet
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`Order not found, retrying (${this.retryCount}/${this.maxRetries})...`);
          setTimeout(() => {
            this.loadOrderByPaymentIntent(paymentIntentId);
          }, 2000); // Retry every 2 seconds
          return;
        }
        
        console.error('[Confirmation] Max retries reached, order still not found');
        this.error.set('Order not found. The order may still be processing. Please check your orders page or contact support.');
        this.loading.set(false);
        return;
      }

      const orderDoc = querySnapshot.docs[0];
      const orderData = orderDoc.data();
      
      // Convert Firestore Timestamp to Date for display
      const order = {
        id: orderDoc.id,
        ...orderData,
        createdAt: orderData['createdAt'] instanceof Timestamp 
          ? orderData['createdAt'].toDate() 
          : orderData['createdAt'],
        paidAt: orderData['paidAt'] instanceof Timestamp 
          ? orderData['paidAt'].toDate() 
          : orderData['paidAt'],
      } as unknown as Order;

      this.order.set(order);
      this.orderId.set(orderDoc.id);
      this.loading.set(false);

      if (!this.purchaseTracked) {
        const itemsPayload = order.items.map(item => ({
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          quantity: item.qty,
          price: item.unitPrice
        }));

        this.analyticsService.trackPurchase({
          transactionId: order.orderNumber || orderDoc.id,
          currency: order.currency || 'USD',
          value: order.total,
          tax: order.tax,
          shipping: order.shipping,
          discount: order.discount,
          items: itemsPayload
        });

        this.purchaseTracked = true;
      }
      
      // Clear the cart AFTER the order is successfully loaded
      if (!this.cartCleared) {
        console.log('[Confirmation] Order loaded successfully, clearing cart now...');
        await this.cartService.clearCart();
        this.cartCleared = true;
      }
      
    } catch (err: any) {
      console.error('Error loading order:', err);
      this.error.set('Failed to load order details. Please try again.');
      this.loading.set(false);
    }
  }

  getEstimatedDeliveryDate(): string {
    const order = this.order();
    if (!order) return 'Calculating...';

    // Calculate based on shipping method
    const method = typeof order.shippingMethod === 'string' ? order.shippingMethod : 'standard';
    const daysToAdd = method === 'express' ? 3 : 7;
    
    // Handle both Date objects and Firestore Timestamps
    let orderDate: Date;
    if (order.createdAt instanceof Date) {
      orderDate = order.createdAt;
    } else if (order.createdAt && typeof order.createdAt.toDate === 'function') {
      orderDate = order.createdAt.toDate();
    } else {
      orderDate = new Date();
    }
    
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);

    return deliveryDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getShippingMethodLabel(): string {
    const order = this.order();
    if (!order) return '';
    
    // Handle different shipping method formats
    const method = order.shippingMethod;
    if (typeof method === 'string') {
      return method === 'express' 
        ? 'Express Shipping (2-3 business days)' 
        : 'Standard Shipping (5-7 business days)';
    }
    
    // If shippingMethod is an object with label
    return (method as any)?.label || 'Standard Shipping (5-7 business days)';
  }

  continueShopping() {
    this.router.navigate(['/productos']);
  }

  viewOrders() {
    this.router.navigate(['/client/orders']);
  }

  async downloadInvoice() {
    const order = this.order();
    if (!order) {
      alert('Order information not found.');
      return;
    }
    
    try {
      console.log(`Downloading invoice for order ${order.orderNumber}`);
      await this.invoiceService.generateInvoice(order);
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    }
  }

  trackOrder() {
    const order = this.order();
    if (order?.trackingNumber) {
      // Open Google search for tracking (you can customize this based on carrier)
      window.open(`https://www.google.com/search?q=track+package+${order.trackingNumber}`, '_blank');
    } else {
      alert('Tracking information will be available once your order ships');
    }
  }
}
