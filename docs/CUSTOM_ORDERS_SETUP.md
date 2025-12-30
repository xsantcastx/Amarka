# Custom Orders Setup & Testing Guide

## Prerequisites

1. **Stripe Account**
   - Active Stripe account
   - Test mode enabled for development
   - Payment Links feature enabled

2. **Firebase Setup**
   - Firebase project initialized
   - Firestore database created
   - Cloud Functions deployed

3. **Admin Access**
   - User account with `role: 'admin'` in Firestore `users` collection

## Setup Steps

### 1. Configure Stripe Keys

Add Stripe keys to Firebase settings or environment variables:

**Option A: Via Admin Settings UI**
1. Log in as admin
2. Navigate to `/admin/settings`
3. Add:
   - Stripe Public Key
   - Stripe Secret Key
   - Stripe Webhook Secret (optional but recommended)

**Option B: Via Environment Variables**
```bash
# In functions/.env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 2. Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

This deploys:
- `createCustomOrderPaymentLink`
- `handleCustomOrderPayment`

### 3. Configure Stripe Webhook (Optional)

For automatic payment status updates:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://YOUR-PROJECT-ID.cloudfunctions.net/handleCustomOrderPayment`
3. Select event: `checkout.session.completed`
4. Copy webhook signing secret
5. Add to Firebase settings or environment variables

### 4. Build & Deploy Frontend

```bash
npm install
npm run build
firebase deploy --only hosting
```

## Testing the Feature

### Test Scenario 1: Create Custom Order

1. **Navigate to Custom Orders**
   - Log in as admin
   - Click "Custom Orders" in sidebar
   - Should see empty list if first time

2. **Create New Order**
   - Click "Create Custom Order" button
   - Fill in client details:
     ```
     Name: John Doe
     Email: john@example.com
     Phone: +1 (555) 123-4567
     ```
   - Add line item:
     ```
     Item Name: ASIC Miner S19 Pro
     Description: Custom configuration
     Quantity: 2
     Unit Price: 3500.00
     ```
   - Set tax rate: 8.5
   - Currency: USD
   - Add notes: "Rush order - 2 day shipping"
   - Click "Create & Generate Link"

3. **Expected Results**
   - Success message appears
   - Order appears in list
   - Invoice number generated (e.g., INV-20251230-1234)
   - Payment link created
   - Status shows "pending"

### Test Scenario 2: View Order Details

1. Click "View" on an order in the list
2. Verify modal shows:
   - Client information
   - All line items
   - Correct calculations:
     - Subtotal: $7,000.00
     - Tax (8.5%): $595.00
     - Total: $7,595.00
   - Payment link URL
   - Notes

### Test Scenario 3: Download Invoice

1. Click download icon in order list OR
2. Click "Download Invoice" in details modal
3. PDF should download with:
   - Company logo and branding
   - Invoice number
   - Client details
   - Itemized list
   - Tax calculation
   - Total amount
   - Payment link (clickable)

### Test Scenario 4: Payment Link

1. Copy payment link from order details
2. Open in incognito/private browser window
3. Should redirect to Stripe checkout page
4. Enter test card: `4242 4242 4242 4242`
5. Any future date, any CVC
6. Complete payment
7. Should redirect back to confirmation page
8. Check order status - should update to "paid"

### Test Scenario 5: Copy Payment Link

1. Open order details
2. Click copy button next to payment link
3. Verify clipboard contains full URL
4. Should see success message
5. Paste in browser - should work

## Stripe Test Cards

Use these test cards in Stripe test mode:

| Card Number         | Description           |
|--------------------|-----------------------|
| 4242 4242 4242 4242 | Successful payment    |
| 4000 0025 0000 3155 | Requires 3D Secure    |
| 4000 0000 0000 9995 | Declined              |

Any future expiry date and any 3-digit CVC works.

## Troubleshooting

### Payment Link Not Generated

**Issue**: "Failed to generate payment link"

**Solutions**:
1. Check Stripe keys are configured correctly
2. Verify Cloud Functions are deployed
3. Check function logs: `firebase functions:log`
4. Ensure Stripe account has Payment Links enabled

### Order Status Not Updating

**Issue**: Order stays "pending" after payment

**Solutions**:
1. Verify webhook is configured in Stripe
2. Check webhook secret matches configuration
3. Check function logs for webhook errors
4. Manually test webhook with Stripe CLI

### Invoice Download Not Working

**Issue**: Invoice doesn't download or shows errors

**Solutions**:
1. Check browser console for errors
2. Verify jsPDF is installed: `npm list jspdf`
3. Check for ad blockers blocking downloads
4. Try different browser

### Permission Denied

**Issue**: "Only admins can create custom order payment links"

**Solutions**:
1. Verify user has `role: 'admin'` in Firestore
2. Check authentication is working
3. Refresh browser after updating user role
4. Check Firebase security rules

## Firebase Security Rules

Ensure Firestore rules allow admin access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Custom orders - admin only
    match /customOrders/{orderId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Next Steps

After successful testing:

1. **Production Setup**
   - Switch to live Stripe keys
   - Configure production webhook endpoint
   - Test with real payment (refund after)

2. **User Training**
   - Train admins on feature usage
   - Document internal processes
   - Set up email templates for sharing links

3. **Monitoring**
   - Set up alerts for failed payments
   - Monitor webhook delivery
   - Track order completion rates

4. **Future Enhancements**
   - Email notifications
   - Recurring orders
   - Order templates
   - Bulk operations
