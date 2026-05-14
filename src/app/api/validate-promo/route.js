import { getDb } from "@/lib/firebase-admin";

export async function POST(req) {
  const { code, subtotal } = await req.json();
  if (!code) return Response.json({ valid: false, message: "No code provided." });

  const db = getDb();
  const snap = await db.collection("promoCodes")
    .where("code", "==", code.toUpperCase().trim())
    .limit(1)
    .get();

  if (snap.empty) return Response.json({ valid: false, message: "Invalid promo code." });

  const promo = snap.docs[0].data();

  if (!promo.active) return Response.json({ valid: false, message: "This code is no longer active." });

  if (promo.expiresAt && promo.expiresAt.toDate() < new Date())
    return Response.json({ valid: false, message: "This code has expired." });

  if (promo.maxUses && promo.usedCount >= promo.maxUses)
    return Response.json({ valid: false, message: "This code has reached its usage limit." });

  return Response.json({ valid: true, promo: { id: snap.docs[0].id, ...promo } });
}