import { db } from '@/lib/firebase-admin';

export async function POST(req) {
  const body = await req.text();
  const params = Object.fromEntries(new URLSearchParams(body));

  if (params.payment_status !== 'COMPLETE') {
    return new Response('ignored', { status: 200 });
  }

  const pendingSnap = await db
    .collection('pendingOrders')
    .where('email_address', '==', params.email_address)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  let cart = [];
  let shippingService = '';
  let shippingCost = 0;
  let userId = null;

  if (!pendingSnap.empty) {
    const pending = pendingSnap.docs[0].data();
    cart = pending.cart || [];
    shippingService = pending.shippingService || '';
    shippingCost = pending.shippingCost || 0;
    userId = pending.userId || null;
    await pendingSnap.docs[0].ref.delete();
  }

  await db.collection('orders').add({
    paymentId: params.pf_payment_id,
    email: params.email_address,
    name: `${params.name_first} ${params.name_last}`,
    amount: params.amount_gross,
    status: 'paid',
    cart,
    shippingService,
    shippingCost,
    userId,
    createdAt: new Date(),
  });

  return new Response('OK', { status: 200 });
}
