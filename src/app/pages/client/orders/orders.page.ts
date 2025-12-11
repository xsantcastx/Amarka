import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeaderComponent, Breadcrumb } from '../../../shared/components/page-header/page-header.component';
import { AuthService } from '../../../services/auth.service';
import { InvoiceService } from '../../../services/invoice.service';
import { Firestore, collection, query, where, orderBy, getDocs, Timestamp, doc, updateDoc } from '@angular/fire/firestore';

export interface Order {
  id?: string;
  orderNumber: string;
  date: Date;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: OrderItem[];
  shippingAddress?: any;
  trackingNumber?: string;
  itemCount?: number;
  currency?: string;
}

export interface OrderItem {
  productId: string;
  name?: string;
  productName?: string;
  qty?: number;
  quantity?: number;
  unitPrice?: number;
  price?: number;
  image?: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, PageHeaderComponent],
  templateUrl: './orders.page.html',
  styleUrl: './orders.page.scss'
})
export class OrdersPageComponent implements OnInit {
  private translate = inject(TranslateService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private invoiceService = inject(InvoiceService);
  
  breadcrumbs: Breadcrumb[] = [
    { label: 'nav.home', url: '/', icon: 'home' },
    { label: 'nav.orders', icon: 'orders' }
  ];

  orders = signal<Order[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  selectedFilter: 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' = 'all';

  async ngOnInit() {
    await this.loadOrders();
  }

  private async loadOrders() {
    this.isLoading.set(true);
    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        this.router.navigate(['/client/login']);
        return;
      }

      // Fetch real orders from Firestore
      const ordersRef = collection(this.firestore, 'orders');
      const q = query(
        ordersRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const orders: Order[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          orderNumber: data['orderNumber'],
          date: data['createdAt'] instanceof Timestamp 
            ? data['createdAt'].toDate() 
            : new Date(data['createdAt']),
          status: data['status'] || 'pending',
          total: data['total'] || 0,
          items: data['items'] || [],
          shippingAddress: data['shippingAddress'],
          trackingNumber: data['trackingNumber'],
          itemCount: data['itemCount'],
          currency: data['currency'] || 'USD',
        });
      });

      this.orders.set(orders);
    } catch (error) {
      console.error('Error loading orders:', error);
      this.errorMessage.set('client.errors.load_orders_failed');
    } finally {
      this.isLoading.set(false);
    }
  }

  get filteredOrders(): Order[] {
    const ordersList = this.orders();
    if (this.selectedFilter === 'all') {
      return ordersList;
    }
    return ordersList.filter(order => order.status === this.selectedFilter);
  }

  setFilter(filter: 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled') {
    this.selectedFilter = filter;
  }

  getStatusClass(status: Order['status']): string {
    const classes: Record<Order['status'], string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      shipped: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return classes[status];
  }

  async logout() {
    try {
      await this.authService.signOutUser('/client/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  viewOrderDetails(orderId: string) {
    // Navigate to order details (you can create this page later)
    this.router.navigate(['/client/orders', orderId]);
  }

  trackShipment(trackingNumber?: string) {
    if (!trackingNumber) {
      alert('Tracking information is not available yet.');
      return;
    }
    // Open tracking page (you can customize this URL based on your carrier)
    window.open(`https://www.google.com/search?q=track+package+${trackingNumber}`, '_blank');
  }

  async downloadInvoice(orderId?: string, orderNumber?: string) {
    console.log('[downloadInvoice] Called with:', { orderId, orderNumber });
    
    if (!orderId) {
      console.error('[downloadInvoice] Order ID not found');
      alert('Order ID not found.');
      return;
    }
    
    try {
      // Find the order from the orders list
      const order = this.orders().find(o => o.id === orderId);
      
      if (!order) {
        console.error('[downloadInvoice] Order not found in list');
        alert('Order not found. Please try again.');
        return;
      }
      
      // Generate and download the PDF invoice
      console.log(`[downloadInvoice] Generating invoice for order ${order.orderNumber}`);
      await this.invoiceService.generateInvoice(order);
      
    } catch (error) {
      console.error('[downloadInvoice] Error generating invoice:', error);
      alert('Failed to generate invoice. Please try again or contact support.');
    }
  }

  async reorder(order: Order) {
    try {
      // TODO: Add items to cart and navigate to checkout
      console.log('Reordering:', order);
      alert(`Reordering ${order.itemCount} items from order ${order.orderNumber}`);
      // this.router.navigate(['/cart']);
    } catch (error) {
      console.error('Error reordering:', error);
      alert('Failed to reorder. Please try again.');
    }
  }

  async cancelOrder(orderId?: string, orderNumber?: string) {
    if (!orderId) {
      alert('Order ID not found.');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to cancel order #${orderNumber || orderId}?\n\n` +
      `This action cannot be undone. If payment was processed, a refund will be issued.`
    );
    if (!confirmed) return;

    try {
      this.isLoading.set(true);
      
      // Update order status to cancelled in Firestore
      const orderRef = doc(this.firestore, `orders/${orderId}`);
      await updateDoc(orderRef, {
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date()
      });

      // Reload orders to reflect the change
      await this.loadOrders();
      
      console.log(`[cancelOrder] Order ${orderNumber} cancelled successfully`);
      alert(`Order #${orderNumber || orderId} has been cancelled successfully.`);
      
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      this.errorMessage.set('client.errors.cancel_order_failed');
      alert('Failed to cancel order. Please contact support.');
    } finally {
      this.isLoading.set(false);
    }
  }

  leaveReview(orderId?: string) {
    if (!orderId) {
      alert('Order ID not found.');
      return;
    }
    // TODO: Navigate to review page or open modal
    console.log(`Leaving review for order ${orderId}`);
    alert('Product review feature will be available soon!');
  }
}
