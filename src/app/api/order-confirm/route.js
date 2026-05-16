import { getDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const { email, name, paymentId, amount } = await req.json();

    if (!email) return Response.json({ ok: false, reason: "no email" });

    const db = getDb();

    const existing = await db.collection("orders")
      .where("paymentId", "==", paymentId)
      .limit(1)
      .get();

    if (!existing.empty) {
      return Response.json({ ok: true, source: "already_saved" });
    }

    const pendingSnap = await db.collection("pendingOrders")
      .where("email_address", "==", email)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    let cart = [], shippingService = "", shippingCost = 0, userId = null;

    if (!pendingSnap.empty) {
      const pending = pendingSnap.docs[0].data();
      cart = pending.cart || [];
      shippingService = pending.shippingService || "";
      shippingCost = pending.shippingCost || 0;
      userId = pending.userId || null;
      await pendingSnap.docs[0].ref.delete();
    }

    await db.collection("orders").add({
      paymentId,
      email,
      name,
      amount,
      status: "paid",
      cart,
      shippingService,
      shippingCost,
      userId,
      createdAt: new Date(),
    });

    return Response.json({ ok: true, source: "success_page" });

  } catch (err) {
    console.error("order-confirm error:", err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
