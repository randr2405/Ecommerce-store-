import md5 from "md5";
import { getDb } from "@/lib/firebase-admin";

export async function POST(req) {
  const { form, subtotal, cart, shippingService, shippingCost, userId, promoCode, discount } = await req.json();

  const merchantId  = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase  = process.env.PAYFAST_PASSPHRASE;
  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL;

  const finalAmount = parseFloat(subtotal).toFixed(2);
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
    amount:        finalAmount,
    item_name:     "RnR Agencies Order",
  };

  // Include merchant_key in signature this time
  const pfParamString =
    Object.entries(pfData)
      .filter(([, val]) => String(val ?? "").trim() !== "")
      .map(([key, val]) =>
        `${key}=${encodeURIComponent(String(val).trim()).replace(/%20/g, "+")}`
      )
      .join("&") +
    `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`;

  pfData.signature = md5(pfParamString);

  console.log("=== PAYFAST DEBUG ===");
  console.log("PARAM STRING:", pfParamString);
  console.log("SIGNATURE:", pfData.signature);
  console.log("=====================");

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
  }

  return Response.json(pfData);
}