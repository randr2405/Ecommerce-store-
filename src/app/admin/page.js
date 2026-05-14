'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    async function fetchOrders() {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    fetchOrders();
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Orders</h1>
      {orders.map(order => (
        <div key={order.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', borderRadius: '8px' }}>
          <p><strong>{order.name}</strong> — {order.email}</p>
          <p>Amount: R{order.amount} | Shipping: {order.shippingService} (R{order.shippingCost})</p>
          <p>Status: {order.status} | {order.createdAt?.toDate?.().toLocaleString()}</p>
          <ul>
            {order.cart?.map((item, i) => (
              <li key={i}>{item.name} x {item.quantity} — R{item.price}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
