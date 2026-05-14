import md5 from "md5";
import { getDb } from "@/lib/firebase-admin";

export async function POST(req) {
  const { form, subtotal, cart, shippingService, shippingCost, userId, promoCode, discount } = await req.json();

  const merchantId  = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL;

  const finalAmount = parseFloat(subtotal).toFixed(2);

  // Sanitize phone number to 10 digits starting with 0
  const cleanPhone = (form.phone || "")
    .replace(/\D/g, "")
    .replace(/^27/, "0");

  // Normalize name capitalization
  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

  const pfData = {
    merchant_id:   merchantId,
    merchant_key:  merchantKey,
    return_url:    `${siteUrl}/checkout/success`,
    cancel_url:    `${siteUrl}/cart`,
    notify_url:    `${siteUrl}/api/payfast-notify`,
    name_first:    capitalize(form.firstName),
    name_last:     capitalize(form.lastName),
    email_address: form.email,
    cell_number:   cleanPhone,
    amount:        finalAmount,
    item_name:     "RnR Agencies Order",
  };

  // Signature excludes merchant_key — no passphrase
  const signatureFields = { ...pfData };
  delete signatureFields.merchant_key;

  const pfParamString =
    Object.entries(signatureFields)
      .filter(([, val]) => String(val ?? "").trim() !== "")
      .map(([key, val]) =>
        `${key}=${encodeURIComponent(String(val).trim()).replace(/%20/g, "+")}`
      )
      .join("&");

  pfData.signature = md5(pfParamString);

  // ── DEBUG LOGS — remove once PayFast is working ──
  console.log("=== PAYFAST DEBUG ===");
  console.log("MERCHANT ID:", merchantId);
  console.log("MERCHANT KEY SET:", !!merchantKey);
  console.log("PASSPHRASE: none");
  console.log("SITE URL:", siteUrl);
  console.log("AMOUNT:", finalAmount);
  console.log("CLEAN PHONE:", cleanPhone);
  console.log("SIGNATURE:", pfData.signature);
  console.log("=====================");

  // Save pending order — wrapped so Firebase can't crash the PayFast response
  try {
    const db = getDb();
    await db.collection("pendingOrders").add({
      email_address:   form.email,
      cart:            cart || [],
      shippingService: shippingService || "",
      shippingCost:    shippingCost || 0,
      promoCode:       promoCode || null,
      discount:        parseFloat(discount || 0),
      userId:          userId || null,
      createdAt:       new Date(),
    });
  } catch (err) {
    console.error("Firebase write failed:", err.message);
    // Don't throw — still return PayFast data
  }

  return Response.json(pfData);
}