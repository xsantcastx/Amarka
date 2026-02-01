import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import * as dotenv from "dotenv";
import { withFlag } from "./lib/guard";

// Load environment variables from .env file
dotenv.config();

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

const withBrevoSecrets = functions.runWith({ secrets: ["BREVO_API_KEY"] });
const withStripeSecrets = functions.runWith({
  secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
});

/**
 * Get Stripe configuration from function secrets
 */
async function getStripeConfig(): Promise<{ secretKey: string; webhookSecret: string | null }> {
  const envKey = process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key;
  const envWebhook =
    process.env.STRIPE_WEBHOOK_SECRET ||
    functions.config().stripe?.webhook_secret ||
    null;

  if (!envKey) {
    throw new Error("Stripe secret key not configured. Set STRIPE_SECRET_KEY secret.");
  }

  console.log("Using Stripe secret key from function secrets");
  if (envWebhook) {
    console.log("Using Stripe webhook secret from function secrets");
  }
  return {
    secretKey: envKey,
    webhookSecret: envWebhook,
  };
}

/**
 * Get initialized Stripe instance with config from function secrets
 */
async function getStripe(): Promise<Stripe> {
  const config = await getStripeConfig();
  return new Stripe(config.secretKey, {
    apiVersion: "2023-10-16",
  });
}

interface EmailConfig {
  provider: string;
  apiKey: string | null;
  fromEmail: string;
  fromName: string;
  contactEmail: string;
  notificationEmail: string;
}

async function getEmailConfig(): Promise<EmailConfig> {
  try {
    const settingsDoc = await db.collection("settings").doc("app").get();
    const settings = settingsDoc.data() || {};

    const provider = String(settings.emailProvider || "").toLowerCase();
    const apiKeyFromSecret = (
      process.env.BREVO_API_KEY ||
      functions.config().brevo?.api_key ||
      ""
    ).trim();
    const apiKey = apiKeyFromSecret || null;

    const contactEmail = String(settings.contactEmail || "").trim();
    const notificationEmail = String(settings.notificationEmail || "").trim();
    const fromEmail = String(settings.emailFrom || contactEmail || notificationEmail || "").trim();
    const fromName = String(settings.emailFromName || settings.siteName || "Amarka").trim();

    return {
      provider,
      apiKey: apiKey || null,
      fromEmail,
      fromName,
      contactEmail,
      notificationEmail,
    };
  } catch (error) {
    console.error("Error fetching email config from Firestore:", error);
  }

  return {
    provider: "",
    apiKey: (process.env.BREVO_API_KEY || functions.config().brevo?.api_key || "").trim() || null,
    fromEmail: "",
    fromName: "Amarka",
    contactEmail: "",
    notificationEmail: "",
  };
}

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const isAllowedRecipient = (to: string, config: EmailConfig): boolean => {
  const allowed = [
    config.contactEmail,
    config.notificationEmail,
    config.fromEmail,
  ]
    .filter(Boolean)
    .map(normalizeEmail);

  return allowed.includes(normalizeEmail(to));
};

/**
 * Send email via Brevo API
 */
export const sendBrevoEmail = withBrevoSecrets.https.onCall(
  withFlag("emailNotifications", async (data: any) => {
    const to = typeof data?.to === "string" ? data.to.trim() : "";
    const subject = typeof data?.subject === "string" ? data.subject.trim() : "";
    const html = typeof data?.html === "string" ? data.html.trim() : "";
    const replyToEmail = typeof data?.replyTo?.email === "string" ? data.replyTo.email.trim() : "";
    const replyToName = typeof data?.replyTo?.name === "string" ? data.replyTo.name.trim() : "";

    if (!to || !subject || !html) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "to, subject, and html are required"
      );
    }

    const config = await getEmailConfig();

    if (config.provider && config.provider !== "brevo") {
      console.error("sendBrevoEmail blocked: provider not brevo", {
        provider: config.provider,
      });
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Email provider is not set to Brevo"
      );
    }

    if (!config.apiKey) {
      console.error("sendBrevoEmail blocked: Brevo API key missing");
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Brevo API key is not configured"
      );
    }

    if (!config.fromEmail) {
      console.error("sendBrevoEmail blocked: From email missing");
      throw new functions.https.HttpsError(
        "failed-precondition",
        "From email address is not configured"
      );
    }

    if (!isAllowedRecipient(to, config)) {
      console.error("sendBrevoEmail blocked: recipient not allowed", {
        to,
        allowed: [
          config.contactEmail,
          config.notificationEmail,
          config.fromEmail,
        ].filter(Boolean),
      });
      throw new functions.https.HttpsError(
        "permission-denied",
        "Recipient is not allowed"
      );
    }

    const fetchFn = (globalThis as any).fetch as any;
    if (!fetchFn) {
      throw new functions.https.HttpsError("internal", "Fetch is not available");
    }

    const payload: Record<string, any> = {
      sender: {
        name: config.fromName || "Amarka",
        email: config.fromEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    };

    if (replyToEmail) {
      payload.replyTo = {
        email: replyToEmail,
        name: replyToName || replyToEmail,
      };
    }

    const response = await fetchFn("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Brevo send error:", response.status, errorText, {
        keyLength: config.apiKey?.length || 0,
        keyStartsWithXkeysib: config.apiKey?.startsWith("xkeysib-") || false,
      });
      throw new functions.https.HttpsError(
        "internal",
        `Brevo send failed (${response.status})`
      );
    }

    const result = await response.json().catch(() => ({}));
    return {
      success: true,
      messageId: result?.messageId || null,
    };
  })
);

/**
 * Send password reset email via Brevo
 */
export const sendPasswordResetBrevo = withBrevoSecrets.https.onCall(
  withFlag("emailNotifications", async (data: any) => {
    const email = typeof data?.email === "string" ? data.email.trim() : "";

    if (!email) {
      throw new functions.https.HttpsError("invalid-argument", "email is required");
    }

    const config = await getEmailConfig();

    if (config.provider && config.provider !== "brevo") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Email provider is not set to Brevo"
      );
    }

    if (!config.apiKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Brevo API key is not configured"
      );
    }

    if (!config.fromEmail) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "From email address is not configured"
      );
    }

    let resetLink = "";
    try {
      resetLink = await admin.auth().generatePasswordResetLink(email);
    } catch (error: any) {
      const code = error?.code || "";
      if (code === "auth/user-not-found") {
        return { success: true };
      }
      console.error("Error generating password reset link:", error);
      throw new functions.https.HttpsError("internal", "Failed to generate reset link");
    }

    const brandName = config.fromName || "Amarka";
    const subject = `Reset your ${brandName} password`;
    const html = `
      <div style="font-family:Arial, sans-serif; color:#111827; line-height:1.6;">
        <h2 style="margin:0 0 12px;">Reset your password</h2>
        <p>We received a request to reset your ${brandName} password.</p>
        <p style="margin:24px 0;">
          <a href="${resetLink}" style="background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;display:inline-block;">
            Reset password
          </a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break:break-all;">${resetLink}</p>
        <p style="font-size:12px;color:#6b7280;margin-top:24px;">If you didn't request this, you can ignore this email.</p>
      </div>
    `;

    const fetchFn = (globalThis as any).fetch as any;
    if (!fetchFn) {
      throw new functions.https.HttpsError("internal", "Fetch is not available");
    }

    const response = await fetchFn("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: brandName,
          email: config.fromEmail,
        },
        to: [{ email }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Brevo reset send error:", response.status, errorText);
      throw new functions.https.HttpsError(
        "internal",
        `Brevo send failed (${response.status})`
      );
    }

    return { success: true };
  })
);

// Shipping rates by country (in USD)
const SHIPPING_RATES = {
  US: {
    standard: { baseRate: 15, perKg: 2, transitDays: "5-7" },
    express: { baseRate: 35, perKg: 4, transitDays: "2-3" },
  },
  CA: {
    standard: { baseRate: 20, perKg: 3, transitDays: "7-10" },
    express: { baseRate: 45, perKg: 5, transitDays: "3-5" },
  },
  MX: {
    standard: { baseRate: 25, perKg: 3.5, transitDays: "7-14" },
    express: { baseRate: 50, perKg: 6, transitDays: "4-7" },
  },
  GB: {
    standard: { baseRate: 30, perKg: 4, transitDays: "10-14" },
    express: { baseRate: 60, perKg: 7, transitDays: "5-7" },
  },
  FR: {
    standard: { baseRate: 30, perKg: 4, transitDays: "10-14" },
    express: { baseRate: 60, perKg: 7, transitDays: "5-7" },
  },
  DE: {
    standard: { baseRate: 30, perKg: 4, transitDays: "10-14" },
    express: { baseRate: 60, perKg: 7, transitDays: "5-7" },
  },
  ES: {
    standard: { baseRate: 30, perKg: 4, transitDays: "10-14" },
    express: { baseRate: 60, perKg: 7, transitDays: "5-7" },
  },
  IT: {
    standard: { baseRate: 30, perKg: 4, transitDays: "10-14" },
    express: { baseRate: 60, perKg: 7, transitDays: "5-7" },
  },
  CN: {
    standard: { baseRate: 35, perKg: 5, transitDays: "14-21" },
    express: { baseRate: 70, perKg: 8, transitDays: "7-10" },
  },
  JP: {
    standard: { baseRate: 35, perKg: 5, transitDays: "14-21" },
    express: { baseRate: 70, perKg: 8, transitDays: "7-10" },
  },
  AU: {
    standard: { baseRate: 40, perKg: 6, transitDays: "14-21" },
    express: { baseRate: 80, perKg: 9, transitDays: "7-10" },
  },
};

// Default rates for countries not in the list
const DEFAULT_RATES = {
  standard: { baseRate: 40, perKg: 6, transitDays: "14-28" },
  express: { baseRate: 80, perKg: 9, transitDays: "7-14" },
};

// US State Sales Tax Rates (2025)
const US_STATE_TAX_RATES: Record<string, number> = {
  AL: 0.04, // Alabama
  AK: 0.00, // Alaska (no state sales tax)
  AZ: 0.056, // Arizona
  AR: 0.065, // Arkansas
  CA: 0.0725, // California
  CO: 0.029, // Colorado
  CT: 0.0635, // Connecticut
  DE: 0.00, // Delaware (no sales tax)
  FL: 0.06, // Florida
  GA: 0.04, // Georgia
  HI: 0.04, // Hawaii
  ID: 0.06, // Idaho
  IL: 0.0625, // Illinois
  IN: 0.07, // Indiana
  IA: 0.06, // Iowa
  KS: 0.065, // Kansas
  KY: 0.06, // Kentucky
  LA: 0.0445, // Louisiana
  ME: 0.055, // Maine
  MD: 0.06, // Maryland
  MA: 0.0625, // Massachusetts
  MI: 0.06, // Michigan
  MN: 0.06875, // Minnesota
  MS: 0.07, // Mississippi
  MO: 0.04225, // Missouri
  MT: 0.00, // Montana (no sales tax)
  NE: 0.055, // Nebraska
  NV: 0.0685, // Nevada
  NH: 0.00, // New Hampshire (no sales tax)
  NJ: 0.06625, // New Jersey
  NM: 0.05125, // New Mexico
  NY: 0.04, // New York
  NC: 0.0475, // North Carolina
  ND: 0.05, // North Dakota
  OH: 0.0575, // Ohio
  OK: 0.045, // Oklahoma
  OR: 0.00, // Oregon (no sales tax)
  PA: 0.06, // Pennsylvania
  RI: 0.07, // Rhode Island
  SC: 0.06, // South Carolina
  SD: 0.045, // South Dakota
  TN: 0.07, // Tennessee
  TX: 0.0625, // Texas
  UT: 0.0595, // Utah
  VT: 0.06, // Vermont
  VA: 0.053, // Virginia
  WA: 0.065, // Washington
  WV: 0.06, // West Virginia
  WI: 0.05, // Wisconsin
  WY: 0.04, // Wyoming
  DC: 0.06, // District of Columbia
};

// Tax rates by country (percentage)
const TAX_RATES: Record<string, number> = {
  US: 0.0, // Sales tax varies by state - see US_STATE_TAX_RATES
  CA: 0.13, // GST+PST average
  MX: 0.16, // IVA
  GB: 0.20, // VAT
  FR: 0.20, // TVA
  DE: 0.19, // MwSt
  ES: 0.21, // IVA
  IT: 0.22, // IVA
  CN: 0.13, // VAT
  JP: 0.10, // Consumption tax
  AU: 0.10, // GST
};

interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  weight?: number; // in kg
}

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  cost: number;
  currency: string;
  estimatedDays: string;
}

/**
 * Calculate shipping cost and tax for a cart
 * POST /cart/reprice
 * Body: { cartId: string, address: ShippingAddress, shippingMethodId?: string }
 */
export const cartReprice = functions.https.onCall(
  withFlag("payments", async (data: any, context: any) => {
  try {
    const { cartId, address, shippingMethodId } = data;

    // Validate input
    if (!cartId || typeof cartId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "cartId is required and must be a string"
      );
    }

    if (!address || !address.country) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "address with country is required"
      );
    }

    // Fetch cart from Firestore
    const cartRef = db.collection("carts").doc(cartId);
    const cartDoc = await cartRef.get();

    if (!cartDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Cart not found");
    }

    const cart = cartDoc.data();
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new functions.https.HttpsError("invalid-argument", "Cart is empty");
    }

    // Calculate subtotal and total weight
    let subtotal = 0;
    let totalWeight = 0;

    for (const item of cart.items as CartItem[]) {
      subtotal += item.unitPrice * item.qty;
      // Estimate weight: 5kg per mining hardware unit if not specified
      const itemWeight = item.weight || 5;
      totalWeight += itemWeight * item.qty;
    }

    // Get shipping rates for the country
    const countryRates = SHIPPING_RATES[address.country as keyof typeof SHIPPING_RATES] || DEFAULT_RATES;

    // Calculate shipping options
    const shippingMethods: ShippingMethod[] = [
      {
        id: "standard",
        name: "Standard Shipping",
        description: `Delivery in ${countryRates.standard.transitDays} business days`,
        cost: Math.round((countryRates.standard.baseRate + countryRates.standard.perKg * totalWeight) * 100) / 100,
        currency: "USD",
        estimatedDays: countryRates.standard.transitDays,
      },
      {
        id: "express",
        name: "Express Shipping",
        description: `Fast delivery in ${countryRates.express.transitDays} business days`,
        cost: Math.round((countryRates.express.baseRate + countryRates.express.perKg * totalWeight) * 100) / 100,
        currency: "USD",
        estimatedDays: countryRates.express.transitDays,
      },
    ];

    // Select shipping method (use provided ID or default to standard)
    let selectedShipping = shippingMethods.find(m => m.id === shippingMethodId);
    if (!selectedShipping) {
      selectedShipping = shippingMethods[0]; // Default to standard
    }

    // Calculate tax based on country and state
    let taxRate = TAX_RATES[address.country] || 0;
    
    // For US addresses, use state-specific tax rate
    if (address.country === "US" && address.region) {
      const stateCode = address.region.toUpperCase();
      taxRate = US_STATE_TAX_RATES[stateCode] || 0;
      console.log(`[cartReprice] US State tax for ${stateCode}: ${(taxRate * 100).toFixed(2)}%`);
    }
    
    const tax = Math.round((subtotal + selectedShipping.cost) * taxRate * 100) / 100;

    // Calculate discount (if promo code applied)
    const discount = cart.discount || 0;

    // Calculate total
    const total = Math.round((subtotal + selectedShipping.cost + tax - discount) * 100) / 100;

    // Update cart in Firestore
    await cartRef.update({
      subtotal: Math.round(subtotal * 100) / 100,
      shipping: selectedShipping.cost,
      tax,
      discount,
      total,
      shippingMethod: selectedShipping.id,
      currency: cart.currency || "USD",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Return shipping methods and totals
    return {
      success: true,
      shippingMethods,
      totals: {
        subtotal: Math.round(subtotal * 100) / 100,
        shipping: selectedShipping.cost,
        tax,
        discount,
        total,
        currency: cart.currency || "USD",
      },
    };
  } catch (error: any) {
    console.error("Error in cartReprice:", error);
    
    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Wrap other errors
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to calculate shipping"
    );
  }
  })
);

/**
 * Create a Stripe PaymentIntent for checkout
 * POST /checkout/create-payment-intent
 * Body: { cartId: string, orderId?: string }
 */
export const createPaymentIntent = withStripeSecrets.https.onCall(
  withFlag("payments", async (data: any, context: any) => {
  try {
    // Verify user authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to create payment intent"
      );
    }

    const { cartId, orderId } = data;
    const userId = context.auth.uid;

    // Validate input
    if (!cartId || typeof cartId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "cartId is required and must be a string"
      );
    }

    // Fetch cart from Firestore
    const cartRef = db.collection("carts").doc(cartId);
    const cartDoc = await cartRef.get();

    if (!cartDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Cart not found");
    }

    const cart = cartDoc.data();
    if (!cart) {
      throw new functions.https.HttpsError("not-found", "Cart data is invalid");
    }

    // Verify cart ownership (user's cart or anonymous cart being claimed)
    if (cart.userId && cart.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You don't have permission to access this cart"
      );
    }

    // Validate cart has items and totals
    if (!cart.items || cart.items.length === 0) {
      throw new functions.https.HttpsError("invalid-argument", "Cart is empty");
    }

    if (!cart.total || cart.total <= 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Cart total must be greater than zero. Please ensure shipping has been calculated."
      );
    }

    // Convert amount to cents (Stripe requires integer cents)
    const amount = Math.round(cart.total * 100);
    const currency = (cart.currency || "usd").toLowerCase();

    // Prepare metadata
    const metadata: Record<string, string> = {
      cartId,
      userId,
      itemCount: cart.items.length.toString(),
      subtotal: cart.subtotal?.toString() || "0",
      shipping: cart.shipping?.toString() || "0",
      tax: cart.tax?.toString() || "0",
    };

    if (orderId) {
      metadata.orderId = orderId;
    }

    // Prepare shipping details if available
    const shippingAddress = cart.shippingAddress;
    let shipping: any = undefined;
    
    if (shippingAddress) {
      shipping = {
        name: `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() || 'Customer',
        phone: shippingAddress.phoneE164 || undefined,
        address: {
          line1: shippingAddress.line1 || '',
          line2: shippingAddress.line2 || undefined,
          city: shippingAddress.city || '',
          state: shippingAddress.region || shippingAddress.state || '',
          postal_code: shippingAddress.postalCode || '',
          country: shippingAddress.country || '',
        },
      };
    }

    // Get Stripe instance with config from Firestore
    const stripe = await getStripe();

    // Create PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
      description: `Amarka Order - ${cart.items.length} item(s)`,
      shipping: shipping,
      receipt_email: shippingAddress?.email || undefined,
    });

    // Store payment record in Firestore
    const paymentRef = db.collection("payments").doc(paymentIntent.id);
    await paymentRef.set({
      paymentIntentId: paymentIntent.id,
      cartId,
      userId,
      orderId: orderId || null,
      amount: cart.total,
      currency: currency.toUpperCase(),
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret,
      metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update cart with payment intent ID
    await cartRef.update({
      paymentIntentId: paymentIntent.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Return clientSecret to frontend
    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: cart.total,
      currency: currency.toUpperCase(),
    };
  } catch (error: any) {
    console.error("Error in createPaymentIntent:", error);

    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Wrap Stripe errors
    if (error.type === "StripeError") {
      throw new functions.https.HttpsError(
        "internal",
        `Stripe error: ${error.message}`
      );
    }

    // Wrap other errors
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to create payment intent"
    );
  }
  })
);

/**
 * Handle Stripe webhooks for payment events
 * POST /webhooks/stripe
 * Processes payment_intent.succeeded and payment_intent.payment_failed events
 */
export const handleStripeWebhook = withStripeSecrets.https.onRequest(
  withFlag("payments", async (req, res) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  // Get webhook signature from headers
  const sig = req.headers["stripe-signature"];
  
  if (!sig || typeof sig !== "string") {
    console.error("No Stripe signature found in headers");
    res.status(400).send("Missing Stripe signature");
    return;
  }

  // Get webhook secret from Firestore settings or .env file
  const config = await getStripeConfig();
  const webhookSecret = config.webhookSecret;

  if (!webhookSecret) {
    console.error("⚠️  Stripe webhook secret not configured! Add it in Admin Settings or functions/.env");
    res.status(500).send("Webhook secret not configured");
    return;
  }

  // Get Stripe instance with config from Firestore
  const stripe = await getStripe();

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Log webhook event
  const webhookLogRef = db.collection("webhooks_log").doc();
  await webhookLogRef.set({
    eventId: event.id,
    type: event.type,
    created: admin.firestore.Timestamp.fromDate(new Date(event.created * 1000)),
    data: event.data.object,
    processed: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Handle different event types
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent, webhookLogRef.id);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, webhookLogRef.id);
        break;

      case "payment_intent.canceled":
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent, webhookLogRef.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark webhook as processed
    await webhookLogRef.update({
      processed: true,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ received: true });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    
    // Log error in webhook log
    await webhookLogRef.update({
      processed: false,
      error: error.message,
      errorAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(500).send("Webhook processing failed");
  }
  })
);

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent, webhookLogId: string) {
  console.log("Processing payment success:", paymentIntent.id);

  const metadata = paymentIntent.metadata;
  const cartId = metadata.cartId;
  const userId = metadata.userId;

  if (!cartId || !userId) {
    throw new Error("Missing cartId or userId in payment intent metadata");
  }

  // Update payment record in Firestore
  const paymentRef = db.collection("payments").doc(paymentIntent.id);
  await paymentRef.update({
    status: "succeeded",
    amount: paymentIntent.amount / 100, // Convert from cents
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Load cart data
  const cartRef = db.collection("carts").doc(cartId);
  const cartDoc = await cartRef.get();

  if (!cartDoc.exists) {
    throw new Error(`Cart ${cartId} not found`);
  }

  const cart = cartDoc.data();
  if (!cart) {
    throw new Error(`Cart ${cartId} has no data`);
  }

  // Generate order number (format: LUX-YYYYMMDD-XXXX)
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `LUX-${dateStr}-${randomSuffix}`;

  // Create order in Firestore
  const orderRef = db.collection("orders").doc();
  const orderId = orderRef.id;

  await orderRef.set({
    orderNumber,
    userId,
    cartId,
    paymentIntentId: paymentIntent.id,
    status: "pending", // pending → processing → shipped → delivered
    
    // Items
    items: cart.items || [],
    itemCount: cart.items?.length || 0,
    
    // Totals
    subtotal: cart.subtotal || 0,
    shipping: cart.shipping || 0,
    tax: cart.tax || 0,
    discount: cart.discount || 0,
    total: cart.total || 0,
    currency: cart.currency || "USD",
    
    // Shipping
    shippingMethod: cart.shippingMethod || "standard",
    shippingAddress: cart.shippingAddress || null,
    billingAddress: null, // Will be populated from payment method if needed
    
    // Tracking
    trackingNumber: null,
    estimatedDelivery: null,
    
    // Timestamps
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    paidAt: admin.firestore.Timestamp.fromDate(new Date(paymentIntent.created * 1000)),
    
    // Metadata
    webhookLogId,
    notes: [],
  });

  // Update payment record with orderId
  await paymentRef.update({
    orderId,
    orderNumber,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Decrement product stock (using transactions for atomicity)
  const batch = db.batch();
  
  for (const item of cart.items || []) {
    const productRef = db.collection("products").doc(item.productId);
    const productDoc = await productRef.get();
    
    if (productDoc.exists) {
      const productData = productDoc.data() || {};
      const variants = Array.isArray(productData.variants) ? productData.variants : [];
      const rawVariantId = item.variantId || null;
      const normalizedVariantId = rawVariantId
        ? rawVariantId.replace(/^sku:/, "").replace(/^label:/, "").replace(/^finish:/, "")
        : null;
      let updatedVariant = false;

      if (rawVariantId && variants.length > 0) {
        const variantIndex = variants.findIndex((variant: any) => {
          return variant?.id === rawVariantId
            || variant?.id === normalizedVariantId
            || variant?.sku === normalizedVariantId
            || variant?.label === normalizedVariantId
            || variant?.finish === normalizedVariantId;
        });

        if (variantIndex >= 0) {
          const variant = variants[variantIndex] || {};
          const currentVariantStock = Number(variant.stock || 0);
          const newVariantStock = Math.max(0, currentVariantStock - item.qty);
          variants[variantIndex] = {
            ...variant,
            stock: newVariantStock
          };

          batch.update(productRef, {
            variants,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const stockLogRef = db.collection("stock_log").doc();
          batch.set(stockLogRef, {
            productId: item.productId,
            variantId: rawVariantId,
            orderId,
            orderNumber,
            change: -item.qty,
            previousStock: currentVariantStock,
            newStock: newVariantStock,
            reason: "order_placed_variant",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          updatedVariant = true;
        }
      }

      if (!updatedVariant) {
        const currentStock = Number(productData.stock || 0);
        const newStock = Math.max(0, currentStock - item.qty);
        
        batch.update(productRef, {
          stock: newStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // Log stock change
        const stockLogRef = db.collection("stock_log").doc();
        batch.set(stockLogRef, {
          productId: item.productId,
          orderId,
          orderNumber,
          change: -item.qty,
          previousStock: currentStock,
          newStock,
          reason: "order_placed",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }
  
  await batch.commit();

  // Clear user's cart (soft delete by marking as completed)
  await cartRef.update({
    status: "completed",
    orderId,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // TODO: Send order confirmation email (Step 15)
  // await sendOrderConfirmationEmail(userId, orderId, orderNumber);

  console.log(`Order created successfully: ${orderNumber} (${orderId})`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, webhookLogId: string) {
  console.log("Processing payment failure:", paymentIntent.id);

  const metadata = paymentIntent.metadata;
  const userId = metadata.userId;

  // Update payment record
  const paymentRef = db.collection("payments").doc(paymentIntent.id);
  await paymentRef.update({
    status: "failed",
    failureReason: paymentIntent.last_payment_error?.message || "Unknown error",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Log failure for admin review
  await db.collection("payment_failures").add({
    paymentIntentId: paymentIntent.id,
    userId,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    failureReason: paymentIntent.last_payment_error?.message || "Unknown error",
    failureCode: paymentIntent.last_payment_error?.code,
    webhookLogId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // TODO: Send payment failure notification email
  // await sendPaymentFailureEmail(userId, paymentIntent.id);

  console.log(`Payment failed: ${paymentIntent.id}`);
}

/**
 * Handle canceled payment
 */
async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent, webhookLogId: string) {
  console.log("Processing payment cancellation:", paymentIntent.id);

  // Update payment record
  const paymentRef = db.collection("payments").doc(paymentIntent.id);
  await paymentRef.update({
    status: "canceled",
    canceledReason: paymentIntent.cancellation_reason || "User canceled",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Payment canceled: ${paymentIntent.id}`);
}

/**
 * Create a Stripe Payment Link for a custom order
 * POST /custom-orders/create-payment-link
 * Body: { customOrderId: string }
 */
export const createCustomOrderPaymentLink = withStripeSecrets.https.onCall(
  withFlag("payments", async (data: any, context: any) => {
  try {
    // Verify user authentication and admin role
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to create payment link"
      );
    }

    // Check if user is admin
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can create custom order payment links"
      );
    }

    const { customOrderId } = data;

    // Validate input
    if (!customOrderId || typeof customOrderId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "customOrderId is required and must be a string"
      );
    }

    // Fetch custom order from Firestore
    const orderRef = db.collection("customOrders").doc(customOrderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Custom order not found");
    }

    const order = orderDoc.data();
    if (!order) {
      throw new functions.https.HttpsError("not-found", "Custom order data is invalid");
    }

    // Validate order has required fields
    if (!order.total || order.total <= 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Order total must be greater than zero"
      );
    }

    const currency = (order.currency || "usd").toLowerCase();

    // Get Stripe instance
    const stripe = await getStripe();

    // Create line items for Stripe
    const lineItems = order.items.map((item: any) => ({
      price_data: {
        currency: currency,
        product_data: {
          name: item.name,
          description: item.description || undefined,
        },
        unit_amount: Math.round(item.unitPrice * 100),
      },
      quantity: item.quantity,
    }));

    // Add tax as a separate line item if applicable
    if (order.tax && order.tax > 0) {
      lineItems.push({
        price_data: {
          currency: currency,
          product_data: {
            name: `Tax (${order.taxRate}%)`,
          },
          unit_amount: Math.round(order.tax * 100),
        },
        quantity: 1,
      });
    }

    // Create Stripe Payment Link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: lineItems,
      metadata: {
        customOrderId,
        invoiceNumber: order.invoiceNumber,
        clientName: order.clientName,
        clientEmail: order.clientEmail,
      },
      after_completion: {
        type: "redirect",
        redirect: {
          url: `${functions.config().app?.url || "https://amarka.com"}/checkout/confirmation?custom_order=${customOrderId}`,
        },
      },
      // Allow promotion codes
      allow_promotion_codes: false,
      // Billing address collection
      billing_address_collection: "auto",
      // Customer email prefill
      custom_text: {
        submit: {
          message: `Payment for Invoice ${order.invoiceNumber}`,
        },
      },
    });

    // Update custom order with payment link
    await orderRef.update({
      paymentLinkUrl: paymentLink.url,
      paymentLinkId: paymentLink.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Payment link created for custom order ${customOrderId}: ${paymentLink.url}`);

    // Return payment link to frontend
    return {
      success: true,
      paymentLinkUrl: paymentLink.url,
      paymentLinkId: paymentLink.id,
    };
  } catch (error: any) {
    console.error("Error in createCustomOrderPaymentLink:", error);

    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Wrap Stripe errors
    if (error.type === "StripeError") {
      throw new functions.https.HttpsError(
        "internal",
        `Stripe error: ${error.message}`
      );
    }

    // Wrap other errors
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to create payment link"
    );
  }
  })
);

/**
 * Handle webhook events for custom order payment links
 * This is called automatically when Stripe Payment Link checkout completes
 */
export const handleCustomOrderPayment = withStripeSecrets.https.onRequest(
  withFlag("payments", async (req, res) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  // Get webhook signature
  const sig = req.headers["stripe-signature"];
  
  if (!sig || typeof sig !== "string") {
    console.error("No Stripe signature found in headers");
    res.status(400).send("Missing Stripe signature");
    return;
  }

  // Get webhook secret
  const config = await getStripeConfig();
  const webhookSecret = config.webhookSecret;

  if (!webhookSecret) {
    console.error("Stripe webhook secret not configured");
    res.status(500).send("Webhook secret not configured");
    return;
  }

  // Get Stripe instance
  const stripe = await getStripe();

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle checkout.session.completed event for Payment Links
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Check if this is a custom order payment
      const customOrderId = session.metadata?.customOrderId;
      
      if (customOrderId) {
        console.log(`Processing custom order payment: ${customOrderId}`);
        
        // Update custom order status to paid
        const orderRef = db.collection("customOrders").doc(customOrderId);
        await orderRef.update({
          status: "paid",
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          paymentSessionId: session.id,
          paymentStatus: session.payment_status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        console.log(`Custom order ${customOrderId} marked as paid`);
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("Error processing custom order webhook:", error);
    res.status(500).send("Webhook processing failed");
  }
  })
);


