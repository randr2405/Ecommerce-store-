"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      router.push("/");
      return;
    }
    async function fetchOrders() {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    fetchOrders();
  }, [user, loading]);

  if (loading || !user) return <p style={{ padding: "2rem" }}>Loading...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Orders Dashboard</h1>
      <p style={{ color: "#666" }}>{orders.length} orders total</p>
      {orders.map((order) => (
        <div key={order.id} style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem", borderRadius: "8px" }}>
          <p><strong>{order.name}</strong> - {order.email}</p>
          <p>Amount: R{order.amount} | Shipping: {order.shippingService} (R{order.shippingCost})</p>
          <p>Status: {order.status} | {order.createdAt?.toDate?.().toLocaleString()}</p>
          <ul>
            {order.cart?.map((item, i) => (
              <li key={i}>{item.name} x {item.quantity} - R{item.price}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}