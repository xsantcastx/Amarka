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

  void 0;
  if (envWebhook) {
    void 0;
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
    void 0;
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
      void 0;
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Email provider is not set to Brevo"
      );
    }

    if (!config.apiKey) {
      void 0;
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Brevo API key is not configured"
      );
    }

    if (!config.fromEmail) {
      void 0;
      throw new functions.https.HttpsError(
        "failed-precondition",
        "From email address is not configured"
      );
    }

    if (!isAllowedRecipient(to, config)) {
      void 0;
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
      void 0;
      void 0;
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
      void 0;
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
      void 0;
      void 0;
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

    const settingsDoc = await db.collection("settings").doc("app").get();
    const settings = settingsDoc.data() || {};
    const shippingTestMode = Boolean(settings.shippingTestMode);
    const shippingEnabled = settings.shippingEnabled !== false;
    const defaultShippingCostRaw = Number(settings.defaultShippingCost ?? 0);
    const defaultShippingCost = Number.isFinite(defaultShippingCostRaw) ? defaultShippingCostRaw : 0;
    const freeShippingThresholdRaw = Number(settings.freeShippingThreshold ?? 0);
    const freeShippingThreshold = Number.isFinite(freeShippingThresholdRaw) ? freeShippingThresholdRaw : 0;
    const shippingEstimate =
      typeof settings.shippingEstimate === "string" ? settings.shippingEstimate : "";
    const currency = cart.currency || "USD";

    const useFlatShipping = shippingTestMode || !shippingEnabled;

    let shippingMethods: ShippingMethod[];
    if (useFlatShipping) {
      const baseCost =
        freeShippingThreshold > 0 && subtotal >= freeShippingThreshold ? 0 : defaultShippingCost;
      const flatCost = Math.round(baseCost * 100) / 100;
      const label = shippingTestMode ? "Test Shipping" : "Flat Shipping";
      const description = shippingEstimate
        ? `${shippingTestMode ? "Test shipping" : "Flat shipping"} (${shippingEstimate})`
        : shippingTestMode
          ? "Test shipping rate"
          : "Flat shipping rate";

      shippingMethods = [
        {
          id: shippingTestMode ? "standard" : "flat-rate",
          name: label,
          description,
          cost: flatCost,
          currency,
          estimatedDays: shippingEstimate || "N/A",
        },
      ];
    } else {
      // Get shipping rates for the country
      const countryRates =
        SHIPPING_RATES[address.country as keyof typeof SHIPPING_RATES] || DEFAULT_RATES;

      // Calculate shipping options
      shippingMethods = [
        {
          id: "standard",
          name: "Standard Shipping",
          description: `Delivery in ${countryRates.standard.transitDays} business days`,
          cost:
            Math.round(
              (countryRates.standard.baseRate + countryRates.standard.perKg * totalWeight) * 100
            ) / 100,
          currency,
          estimatedDays: countryRates.standard.transitDays,
        },
        {
          id: "express",
          name: "Express Shipping",
          description: `Fast delivery in ${countryRates.express.transitDays} business days`,
          cost:
            Math.round(
              (countryRates.express.baseRate + countryRates.express.perKg * totalWeight) * 100
            ) / 100,
          currency,
          estimatedDays: countryRates.express.transitDays,
        },
      ];
    }

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
      void 0;
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
      currency,
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
    void 0;
    
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
    void 0;

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
    void 0;
    res.status(400).send("Missing Stripe signature");
    return;
  }

  // Get webhook secret from Firestore settings or .env file
  const config = await getStripeConfig();
  const webhookSecret = config.webhookSecret;

  if (!webhookSecret) {
    void 0;
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
    void 0;
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
        void 0;
    }

    // Mark webhook as processed
    await webhookLogRef.update({
      processed: true,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ received: true });
  } catch (error: any) {
    void 0;
    
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
  void 0;

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

  void 0;
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, webhookLogId: string) {
  void 0;

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

  void 0;
}

/**
 * Handle canceled payment
 */
async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent, webhookLogId: string) {
  void 0;

  // Update payment record
  const paymentRef = db.collection("payments").doc(paymentIntent.id);
  await paymentRef.update({
    status: "canceled",
    canceledReason: paymentIntent.cancellation_reason || "User canceled",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  void 0;
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
          url: `${functions.config().app?.url || "https://amarka.co"}/checkout/confirmation?custom_order=${customOrderId}`,
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

    void 0;

    // Return payment link to frontend
    return {
      success: true,
      paymentLinkUrl: paymentLink.url,
      paymentLinkId: paymentLink.id,
    };
  } catch (error: any) {
    void 0;

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
    void 0;
    res.status(400).send("Missing Stripe signature");
    return;
  }

  // Get webhook secret
  const config = await getStripeConfig();
  const webhookSecret = config.webhookSecret;

  if (!webhookSecret) {
    void 0;
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
    void 0;
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
        void 0;
        
        // Update custom order status to paid
        const orderRef = db.collection("customOrders").doc(customOrderId);
        await orderRef.update({
          status: "paid",
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          paymentSessionId: session.id,
          paymentStatus: session.payment_status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        void 0;
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    void 0;
    res.status(500).send("Webhook processing failed");
  }
  })
);

// ─── Admin Role Management ────────────────────────────────────────────────────

/**
 * Set a user's role as a custom JWT claim.
 * Must be called by an authenticated admin.
 * Also updates the Firestore users document for consistency.
 */
export const setAdminRole = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
  }

  // Verify caller is admin via JWT claim (fast) or Firestore doc (migration fallback)
  const callerClaim = context.auth.token?.role;
  let callerIsAdmin = callerClaim === "admin";

  if (!callerIsAdmin) {
    const callerDoc = await db.collection("users").doc(context.auth.uid).get();
    callerIsAdmin = callerDoc.data()?.role === "admin";
  }

  if (!callerIsAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Must be admin to set roles");
  }

  const { uid, role } = data;
  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "uid is required");
  }
  if (role !== "admin" && role !== "client") {
    throw new functions.https.HttpsError("invalid-argument", "role must be 'admin' or 'client'");
  }

  // Set custom JWT claim
  await admin.auth().setCustomUserClaims(uid, { role });

  // Keep Firestore in sync
  await db.collection("users").doc(uid).update({
    role,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, uid, role };
});

/**
 * Sync the caller's JWT custom claim from their Firestore role.
 * Call on login to ensure the claim matches the Firestore role (migration helper).
 */
export const syncUserClaims = functions.https.onCall(async (_data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
  }

  const uid = context.auth.uid;
  const currentClaim = context.auth.token?.role as string | undefined;

  const userDoc = await db.collection("users").doc(uid).get();
  const firestoreRole: string = userDoc.data()?.role || "client";

  if (currentClaim !== firestoreRole) {
    await admin.auth().setCustomUserClaims(uid, { role: firestoreRole });
    return { updated: true, role: firestoreRole };
  }

  return { updated: false, role: currentClaim };
});

// ─── JWT Claim Auto-Sync Trigger ──────────────────────────────────────────────

/**
 * Firestore trigger: whenever a user document's `role` field changes,
 * immediately propagate it to their Firebase Auth custom JWT claim.
 * This means the Firestore fallback in security rules is no longer needed.
 */
export const onUserRoleChanged = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    const roleBefore = before?.role ?? null;
    const roleAfter = after?.role ?? null;

    // Skip if role didn't change or document was deleted
    if (roleBefore === roleAfter || !after) return;

    const userId = context.params.userId;
    const role = typeof roleAfter === "string" ? roleAfter : "client";

    await admin.auth().setCustomUserClaims(userId, { role });
    functions.logger.info(`JWT claim updated: user=${userId} role=${role}`);
  });

/**
 * One-time migration: backfill JWT custom claims for all users that already
 * have a `role` field in Firestore but whose JWT claim is missing or stale.
 * Call once from the Admin panel after deploying; safe to call multiple times.
 */
export const migrateAdminClaims = functions.https.onCall(async (_data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
  }

  // Only an existing admin (via JWT claim OR Firestore doc during migration) can run this
  const callerClaim = context.auth.token?.role;
  let callerIsAdmin = callerClaim === "admin";
  if (!callerIsAdmin) {
    const callerDoc = await db.collection("users").doc(context.auth.uid).get();
    callerIsAdmin = callerDoc.data()?.role === "admin";
  }
  if (!callerIsAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Must be admin");
  }

  const snapshot = await db.collection("users").where("role", "in", ["admin", "client"]).get();
  const updates: Promise<void>[] = [];
  let updated = 0;

  for (const doc of snapshot.docs) {
    const role: string = doc.data().role || "client";
    updates.push(
      admin.auth().setCustomUserClaims(doc.id, { role }).then(() => { updated++; })
    );
  }

  await Promise.allSettled(updates);
  functions.logger.info(`migrateAdminClaims: backfilled ${updated} users`);
  return { success: true, updated };
});

// ─── Promo Code Validation ────────────────────────────────────────────────────

/**
 * Validate a promo code server-side and return discount details.
 * Replaces the insecure pattern of public Firestore reads on promoCodes.
 */
export const validatePromoCode = functions.https.onCall(async (data: any, _context: any) => {
  const rawCode = typeof data?.code === "string" ? data.code.trim() : "";
  const cartTotal: number = typeof data?.cartTotal === "number" ? data.cartTotal : 0;

  if (!rawCode) {
    throw new functions.https.HttpsError("invalid-argument", "code is required");
  }

  // Sanitize: only allow alphanumeric, dashes, underscores
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (code !== rawCode.toUpperCase()) {
    return { valid: false, reason: "invalid_format" };
  }

  const promoDoc = await db.collection("promoCodes").doc(code).get();
  if (!promoDoc.exists) {
    return { valid: false, reason: "not_found" };
  }

  const promo = promoDoc.data()!;

  if (!promo.active) {
    return { valid: false, reason: "inactive" };
  }

  const now = admin.firestore.Timestamp.now();
  if (promo.validFrom && promo.validFrom > now) {
    return { valid: false, reason: "not_started" };
  }
  if (promo.validUntil && promo.validUntil < now) {
    return { valid: false, reason: "expired" };
  }
  if (promo.maxUses && (promo.currentUses || 0) >= promo.maxUses) {
    return { valid: false, reason: "exhausted" };
  }
  if (promo.minOrderAmount && cartTotal < promo.minOrderAmount) {
    return { valid: false, reason: "below_minimum", minimumAmount: promo.minOrderAmount };
  }

  let discountAmount = 0;
  if (promo.type === "percentage") {
    discountAmount = Math.round(cartTotal * (promo.value / 100) * 100) / 100;
  } else if (promo.type === "fixed") {
    discountAmount = Math.min(promo.value, cartTotal);
  }

  return {
    valid: true,
    code,
    type: promo.type as string,
    value: promo.value as number,
    discountAmount,
    description: (promo.description as string) || null,
  };
});

// ─── Engraving Input Validation ───────────────────────────────────────────────

const ALLOWED_FONT_IDS: readonly string[] = [
  "cormorant",
  "sans",
  "mono",
  "georgia",
  "palatino",
  "impact",
];

/**
 * Validate and sanitize engraving text input before it reaches cart/order logic.
 * No authentication required — called from the product page before checkout.
 */
export const validateEngravingInput = functions.https.onCall(
  async (data: unknown, _context: functions.https.CallableContext): Promise<{
    valid: true;
    lines: string[];
    fontId: string;
  }> => {
    const payload = data as {
      lines?: unknown;
      fontId?: unknown;
      maxCharsPerLine?: unknown;
    };

    // ── Validate lines array ─────────────────────────────────────────────────
    if (!Array.isArray(payload?.lines)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "lines must be an array of strings"
      );
    }

    const rawLines = payload.lines as unknown[];

    if (rawLines.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "lines must not be empty"
      );
    }

    if (rawLines.length > 4) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Too many lines: maximum 4 lines allowed",
        { received: rawLines.length, max: 4 }
      );
    }

    // ── Validate fontId ──────────────────────────────────────────────────────
    if (typeof payload?.fontId !== "string" || !payload.fontId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "fontId must be a non-empty string"
      );
    }

    const fontId: string = payload.fontId;

    if (!ALLOWED_FONT_IDS.includes(fontId)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `fontId must be one of: ${ALLOWED_FONT_IDS.join(", ")}`,
        { received: fontId }
      );
    }

    // ── Validate maxCharsPerLine ─────────────────────────────────────────────
    const DEFAULT_MAX_CHARS = 200;
    let maxCharsPerLine: number = DEFAULT_MAX_CHARS;

    if (payload?.maxCharsPerLine !== undefined) {
      if (
        typeof payload.maxCharsPerLine !== "number" ||
        !Number.isInteger(payload.maxCharsPerLine) ||
        payload.maxCharsPerLine < 1
      ) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "maxCharsPerLine must be a positive integer"
        );
      }
      maxCharsPerLine = payload.maxCharsPerLine as number;
    }

    // ── Sanitize and validate each line ─────────────────────────────────────
    const sanitizedLines: string[] = rawLines.map(
      (rawLine: unknown, index: number): string => {
        if (typeof rawLine !== "string") {
          throw new functions.https.HttpsError(
            "invalid-argument",
            `lines[${index}] must be a string`
          );
        }

        // Strip HTML tags
        let sanitized: string = rawLine.replace(/<[^>]*>/g, "");

        // Strip dangerous characters: control chars, null bytes, backticks,
        // backslashes, and common injection delimiters
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F`\\]/g, "");

        // Trim leading/trailing whitespace
        sanitized = sanitized.trim();

        if (sanitized.length > maxCharsPerLine) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            `lines[${index}] exceeds the maximum of ${maxCharsPerLine} characters`,
            { line: index, length: sanitized.length, max: maxCharsPerLine }
          );
        }

        return sanitized;
      }
    );

    return { valid: true, lines: sanitizedLines, fontId };
  }
);

interface LeadUploadRef {
  storagePath: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface StudioEnquiryPayload {
  type: "standard" | "trade";
  fullName: string;
  company?: string;
  email: string;
  role: "designer" | "gc" | "hospitality" | "corporate" | "other";
  projectType: string;
  preferredMaterial?: string;
  estimatedQuantity?: string;
  targetTimeline?: string;
  projectDescription: string;
  fileUploads?: LeadUploadRef[];
  sourcePage: string;
  leadTags?: string[];
}

interface TradeApplicationPayload {
  companyName: string;
  contactName: string;
  email: string;
  role: "designer" | "gc" | "other";
  projectType: string;
  estimatedQuantity: string;
  materialPreference?: string;
  timeline?: string;
  notes?: string;
  specSheetUploads?: LeadUploadRef[];
  leadTags?: string[];
}

function validateLeadUploads(files: LeadUploadRef[] = []) {
  for (const file of files) {
    if (!file.storagePath || !file.storagePath.startsWith("private/")) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid upload path");
    }
    if (Number(file.size || 0) > 20 * 1024 * 1024) {
      throw new functions.https.HttpsError("invalid-argument", "Upload exceeds 20MB limit");
    }
  }
}

function buildLeadTags(payload: { role?: string; sourcePage?: string; type?: string }, extra: string[] = []) {
  const tags = new Set<string>(extra.filter(Boolean));
  if (payload.type) tags.add(payload.type);
  if (payload.role) tags.add(payload.role);
  if (payload.sourcePage === "/trade") tags.add("trade_page");
  return Array.from(tags);
}

async function sendLeadEmail(
  to: string,
  subject: string,
  html: string,
  replyTo?: { email: string; name?: string }
) {
  const config = await getEmailConfig();
  if (!config.apiKey || !config.fromEmail || !to) {
    return;
  }

  const fetchFn = (globalThis as any).fetch as any;
  if (!fetchFn) {
    return;
  }

  await fetchFn("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: config.fromName || "Amarka",
        email: config.fromEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      replyTo: replyTo?.email ? { email: replyTo.email, name: replyTo.name || replyTo.email } : undefined,
    }),
  });
}

export const submitStudioEnquiry = withBrevoSecrets.https.onCall(
  withFlag("emailNotifications", async (data: StudioEnquiryPayload) => {
    if (!data?.fullName || !data?.email || !data?.projectType || !data?.projectDescription) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required enquiry fields");
    }

    validateLeadUploads(data.fileUploads);
    const leadTags = buildLeadTags(data, data.leadTags);
    const docRef = await db.collection("enquiries").add({
      ...data,
      leadTags,
      responseSla: "24h",
      status: "new",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const emailConfig = await getEmailConfig();
    const internalTarget = emailConfig.notificationEmail || emailConfig.contactEmail;

    await Promise.all([
      internalTarget
        ? sendLeadEmail(
            internalTarget,
            `New enquiry: ${data.projectType}`,
            `<div style="font-family:Arial,sans-serif">
              <h2>New Amarka enquiry</h2>
              <p><strong>Name:</strong> ${data.fullName}</p>
              <p><strong>Company:</strong> ${data.company || "—"}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Role:</strong> ${data.role}</p>
              <p><strong>Project type:</strong> ${data.projectType}</p>
              <p><strong>Description:</strong><br>${data.projectDescription}</p>
            </div>`,
            { email: data.email, name: data.fullName }
          )
        : Promise.resolve(),
      sendLeadEmail(
        data.email,
        "Amarka received your enquiry",
        `<div style="font-family:Arial,sans-serif">
          <h2>Thanks for contacting Amarka</h2>
          <p>We’ve received your project brief and will respond within 24 hours.</p>
          <p><strong>Project type:</strong> ${data.projectType}</p>
          <p>Studio based in Stamford, CT · Serving the NYC metro.</p>
        </div>`
      ),
    ]);

    return { ok: true, id: docRef.id };
  })
);

// ─── SSR ─────────────────────────────────────────────────────────────────────

/**
 * Angular SSR handler. Renders the app server-side for all non-static requests.
 * Static files (JS, CSS, images) are served directly by Firebase Hosting.
 */
export const ssr = functions.https.onRequest(async (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ssrModule: any = await import(`${__dirname}/../ssr/server.mjs`);
  return ssrModule.reqHandler(req, res);
});

export const submitTradeApplication = withBrevoSecrets.https.onCall(
  withFlag("emailNotifications", async (data: TradeApplicationPayload) => {
    if (!data?.companyName || !data?.contactName || !data?.email || !data?.projectType || !data?.estimatedQuantity) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required trade application fields");
    }

    validateLeadUploads(data.specSheetUploads);
    const leadTags = buildLeadTags({ role: data.role, sourcePage: "/trade", type: "trade_application" }, data.leadTags);
    const docRef = await db.collection("tradeApplications").add({
      ...data,
      leadTags,
      status: "new",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const emailConfig = await getEmailConfig();
    const internalTarget = emailConfig.notificationEmail || emailConfig.contactEmail;

    await Promise.all([
      internalTarget
        ? sendLeadEmail(
            internalTarget,
            `New trade application: ${data.companyName}`,
            `<div style="font-family:Arial,sans-serif">
              <h2>New trade application</h2>
              <p><strong>Company:</strong> ${data.companyName}</p>
              <p><strong>Contact:</strong> ${data.contactName}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Role:</strong> ${data.role}</p>
              <p><strong>Project type:</strong> ${data.projectType}</p>
              <p><strong>Estimated quantity:</strong> ${data.estimatedQuantity}</p>
            </div>`,
            { email: data.email, name: data.contactName }
          )
        : Promise.resolve(),
      sendLeadEmail(
        data.email,
        "Amarka received your trade application",
        `<div style="font-family:Arial,sans-serif">
          <h2>Trade application received</h2>
          <p>Thanks for applying to the Amarka trade programme. We’ll review the details and respond within 24 hours.</p>
        </div>`
      ),
    ]);

    return { ok: true, id: docRef.id };
  })
);
