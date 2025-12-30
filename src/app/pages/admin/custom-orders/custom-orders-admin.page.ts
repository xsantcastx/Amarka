import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Firestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { AuthService } from '../../../services/auth.service';

interface CustomOrderItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface CustomOrder {
  id?: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  items: CustomOrderItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  currency: string;
  notes?: string;
  paymentLinkUrl?: string;
  paymentLinkId?: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt?: any;
  createdBy?: string;
  paidAt?: any;
}

@Component({
  selector: 'app-custom-orders-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    AdminSidebarComponent
  ],
  templateUrl: './custom-orders-admin.page.html',
  styleUrl: './custom-orders-admin.page.scss'
})
export class CustomOrdersAdminComponent implements OnInit {
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private functions = inject(Functions);
  private authService = inject(AuthService);
  private router = inject(Router);

  // State
  customOrders = signal<CustomOrder[]>([]);
  isLoading = signal(false);
  showCreateModal = signal(false);
  showDetailsModal = signal(false);
  selectedOrder = signal<CustomOrder | null>(null);
  successMessage = signal('');
  errorMessage = signal('');
  generatingLink = signal(false);

  // Form
  orderForm = this.fb.group({
    clientName: ['', [Validators.required, Validators.minLength(2)]],
    clientEmail: ['', [Validators.required, Validators.email]],
    clientPhone: [''],
    taxRate: [0, [Validators.min(0), Validators.max(100)]],
    currency: ['USD', Validators.required],
    notes: [''],
    items: this.fb.array([this.createItemFormGroup()])
  });

  ngOnInit(): void {
    // Check if user is admin
    this.authService.userProfile$.subscribe(profile => {
      if (!profile) return;
      
      if (profile.role !== 'admin') {
        console.log('Access denied: User is not admin');
        this.router.navigate(['/']);
        return;
      }

      // Load custom orders
      if (this.customOrders().length === 0 && !this.isLoading()) {
        this.loadCustomOrders();
      }
    });
  }

  createItemFormGroup() {
    return this.fb.group({
      name: ['', Validators.required],
      description: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]]
    });
  }

  get items(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  addItem(): void {
    this.items.push(this.createItemFormGroup());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  calculateItemTotal(item: any): number {
    return (item.value.quantity || 0) * (item.value.unitPrice || 0);
  }

  calculateSubtotal(): number {
    return this.items.controls.reduce((sum, item) => {
      return sum + this.calculateItemTotal(item);
    }, 0);
  }

  calculateTax(): number {
    const subtotal = this.calculateSubtotal();
    const taxRate = this.orderForm.value.taxRate || 0;
    return (subtotal * taxRate) / 100;
  }

  calculateTotal(): number {
    return this.calculateSubtotal() + this.calculateTax();
  }

  loadCustomOrders(): void {
    this.isLoading.set(true);
    
    const ordersRef = collection(this.firestore, 'customOrders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    onSnapshot(q, (snapshot) => {
      const orders: CustomOrder[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          invoiceNumber: data['invoiceNumber'],
          clientName: data['clientName'],
          clientEmail: data['clientEmail'],
          clientPhone: data['clientPhone'],
          items: data['items'] || [],
          subtotal: data['subtotal'] || 0,
          tax: data['tax'] || 0,
          taxRate: data['taxRate'] || 0,
          total: data['total'] || 0,
          currency: data['currency'] || 'USD',
          notes: data['notes'],
          paymentLinkUrl: data['paymentLinkUrl'],
          paymentLinkId: data['paymentLinkId'],
          status: data['status'] || 'pending',
          createdAt: data['createdAt'],
          createdBy: data['createdBy'],
          paidAt: data['paidAt']
        });
      });
      
      this.customOrders.set(orders);
      this.isLoading.set(false);
    }, (error) => {
      console.error('Error loading custom orders:', error);
      this.errorMessage.set('Failed to load custom orders');
      this.isLoading.set(false);
    });
  }

  openCreateModal(): void {
    this.orderForm.reset({
      currency: 'USD',
      taxRate: 0
    });
    this.items.clear();
    this.items.push(this.createItemFormGroup());
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  openDetailsModal(order: CustomOrder): void {
    this.selectedOrder.set(order);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedOrder.set(null);
  }

  async createCustomOrder(): Promise<void> {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all required fields');
      setTimeout(() => this.errorMessage.set(''), 3000);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const formValue = this.orderForm.value;
      
      // Generate invoice number
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

      // Calculate totals
      const items: CustomOrderItem[] = formValue.items!.map((item: any) => ({
        name: item.name,
        description: item.description || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice
      }));

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const taxRate = formValue.taxRate || 0;
      const tax = (subtotal * taxRate) / 100;
      const total = subtotal + tax;

      // Save to Firestore
      const customOrder: Partial<CustomOrder> = {
        invoiceNumber,
        clientName: formValue.clientName!,
        clientEmail: formValue.clientEmail!,
        clientPhone: formValue.clientPhone || '',
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        taxRate,
        total: Math.round(total * 100) / 100,
        currency: formValue.currency || 'USD',
        notes: formValue.notes || '',
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: this.authService.currentUser?.uid || 'admin'
      };

      const ordersRef = collection(this.firestore, 'customOrders');
      const docRef = await addDoc(ordersRef, customOrder);

      // Generate payment link
      await this.generatePaymentLink(docRef.id);

      this.successMessage.set('Custom order created successfully!');
      setTimeout(() => this.successMessage.set(''), 3000);
      
      this.closeCreateModal();
    } catch (error: any) {
      console.error('Error creating custom order:', error);
      this.errorMessage.set(error.message || 'Failed to create custom order');
      setTimeout(() => this.errorMessage.set(''), 5000);
    } finally {
      this.isLoading.set(false);
    }
  }

  async generatePaymentLink(orderId: string): Promise<void> {
    this.generatingLink.set(true);
    
    try {
      const createPaymentLink = httpsCallable<
        { customOrderId: string },
        { paymentLinkUrl: string; paymentLinkId: string }
      >(this.functions, 'createCustomOrderPaymentLink');

      const result = await createPaymentLink({ customOrderId: orderId });
      
      console.log('Payment link created:', result.data);
      
      this.successMessage.set('Payment link generated successfully!');
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error: any) {
      console.error('Error generating payment link:', error);
      this.errorMessage.set(error.message || 'Failed to generate payment link');
      setTimeout(() => this.errorMessage.set(''), 5000);
    } finally {
      this.generatingLink.set(false);
    }
  }

  async copyPaymentLink(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.successMessage.set('Payment link copied to clipboard!');
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      this.errorMessage.set('Failed to copy link');
      setTimeout(() => this.errorMessage.set(''), 3000);
    }
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/30',
      paid: 'bg-bitcoin-gold/30 text-bitcoin-gold border border-bitcoin-gold/30',
      cancelled: 'bg-red-500/30 text-red-400 border border-red-500/30'
    };
    return classes[status] || classes.pending;
  }

  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  }

  async logout(): Promise<void> {
    await this.authService.signOutUser('/client/login');
  }
}
