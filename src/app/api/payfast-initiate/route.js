import md5 from "md5";
import { getDb } from "@/lib/firebase-admin";

export async function POST(req) {
  const { form, subtotal, cart, shippingService, shippingCost, userId, promoCode, discount } = await req.json();

  const merchantId  = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase  = process.env.PAYFAST_PASSPHRASE;
  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL;

  const finalAmount = parseFloat(subtotal).toFixed(2);

  // Build the data object — field ORDER matters for PayFast
  const pfData = {
    merchant_id:   merchantId,
    merchant_key:  merchantKey,
    return_url:    `${siteUrl}/checkout/success`,
    cancel_url:    `${siteUrl}/cart`,
    notify_url:    `${siteUrl}/api/payfast-notify`,
    name_first:    form.firstName,
    name_last:     form.lastName,
    email_address: form.email,
    cell_number:   form.phone,
    amount:        finalAmount,
    item_name:     "RnR Agencies Order",
  };

  // Signature is built WITHOUT merchant_key, and WITHOUT empty fields
  const signatureFields = { ...pfData };
  delete signatureFields.merchant_key;

  const pfParamString =
    Object.entries(signatureFields)
      .filter(([, val]) => String(val ?? "").trim() !== "")
      .map(
        ([key, val]) =>
          `${key}=${encodeURIComponent(String(val).trim()).replace(/%20/g, "+")}`
      )
      .join("&") +
    (passphrase
      ? `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`
      : "");

  pfData.signature = md5(pfParamString);

  // Save pending order
  const db = getDb();
  await db.collection("pendingOrders").add({
    email_address: form.email,
    cart:            cart || [],
    shippingService: shippingService || "",
    shippingCost:    shippingCost || 0,
    promoCode:       promoCode || null,
    discount:        parseFloat(discount || 0),
    userId:          userId || null,
    createdAt:       new Date(),
  });

  return Response.json(pfData);
}