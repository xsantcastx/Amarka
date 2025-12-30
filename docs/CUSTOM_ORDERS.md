# Custom Orders with Stripe Payment Links

This feature allows administrators to create custom invoices and generate Stripe payment links for clients. It's useful for custom orders that aren't available through the regular product catalog.

## Features

### Admin Panel
- **Create Custom Orders**: Add client information, line items, and automatically calculate totals
- **Invoice Generation**: Automatically generates invoice numbers (format: INV-YYYYMMDD-XXXX)
- **Stripe Payment Links**: Creates shareable payment links via Stripe
- **Tax Calculation**: Supports configurable tax rates
- **PDF Invoices**: Download professional PDF invoices with company branding
- **Order Management**: View all custom orders with filtering by status

### Order Creation Flow
1. Admin navigates to `/admin/custom-orders`
2. Clicks "Create Custom Order"
3. Fills in:
   - Client name, email, phone
   - Order line items (name, description, quantity, unit price)
   - Tax rate and currency
   - Optional notes
4. System automatically:
   - Generates unique invoice number
   - Calculates subtotal, tax, and total
   - Creates Stripe Payment Link
   - Stores order in Firestore

### Payment Processing
- Payment links are hosted by Stripe
- Clients can pay using credit/debit cards
- Webhook automatically updates order status to "paid" upon successful payment
- No client account required - just click and pay

### Invoice Download
- Professional PDF invoices with Amarka branding
- Includes all order details and payment information
- Can be downloaded from order list or detail view
- Suitable for record keeping and client communication

## Technical Implementation

### Frontend Components
- **Component**: `CustomOrdersAdminComponent` (`src/app/pages/admin/custom-orders/`)
- **Route**: `/admin/custom-orders`
- **Service**: `InvoiceService` (extended to support custom orders)

### Backend Functions
- **`createCustomOrderPaymentLink`**: Creates Stripe Payment Link for custom order
- **`handleCustomOrderPayment`**: Webhook handler for payment completion events

### Firestore Collections
- **`customOrders`**: Stores all custom order data
  ```typescript
  {
    invoiceNumber: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    items: Array<{
      name: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subtotal: number;
    tax: number;
    taxRate: number;
    total: number;
    currency: string;
    notes?: string;
    paymentLinkUrl?: string;
    paymentLinkId?: string;
    status: 'pending' | 'paid' | 'cancelled';
    createdAt: Timestamp;
    createdBy: string;
    paidAt?: Timestamp;
  }
  ```

## Usage

### For Admins
1. Log in to admin panel
2. Navigate to "Custom Orders" in sidebar
3. Click "Create Custom Order"
4. Fill in client and order details
5. Submit form - payment link is automatically generated
6. Copy payment link and share with client
7. Download invoice if needed

### For Clients
1. Receive payment link from admin
2. Click link to go to Stripe checkout
3. Enter payment information
4. Submit payment
5. Receive confirmation

## Configuration

### Stripe Setup
Ensure Stripe is properly configured in Firebase Functions:
- Secret key in Firestore settings or environment variables
- Webhook secret for payment completion events
- Payment links feature enabled in Stripe dashboard

### Webhook Configuration
Set up Stripe webhook endpoint:
- URL: `https://your-domain.com/handleCustomOrderPayment`
- Events: `checkout.session.completed`

## Future Enhancements
- Email notifications to clients with payment link
- Recurring/subscription-based custom orders
- Multi-currency support with automatic conversion
- Order templates for frequently used items
- Bulk invoice generation
- Payment reminders for unpaid orders
