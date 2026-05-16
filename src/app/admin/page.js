"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { collection, getDocs, orderBy, query, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const labelStyle = { fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#C9A84C", display: "block", marginBottom: "0.4rem", fontFamily: "Montserrat, sans-serif" };
const inputStyle = { width: "100%", background: "#1A1A1A", border: "1px solid rgba(201,168,76,0.2)", color: "#F5F0E8", padding: "0.7rem 0.9rem", fontSize: "0.78rem", fontFamily: "Montserrat, sans-serif", outline: "none", boxSizing: "border-box", borderRadius: "6px" };

const STATUS_OPTIONS = ["paid", "processing", "shipped", "delivered", "cancelled"];

const statusColor = (s) => {
  switch ((s || "").toLowerCase()) {
    case "delivered":  return { color: "#7ec87e", border: "rgba(80,180,80,0.3)" };
    case "shipped":    return { color: "#7ab4d4", border: "rgba(122,180,212,0.3)" };
    case "processing": return { color: "#C9A84C", border: "rgba(201,168,76,0.3)" };
    case "cancelled":  return { color: "#e07070", border: "rgba(220,80,80,0.3)" };
    default:           return { color: "#d4a843", border: "rgba(212,168,67,0.3)" };
  }
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [promos, setPromos] = useState([]);
  const [promoForm, setPromoForm] = useState({ code: "", type: "freeshipping", value: "", expiresAt: "", maxUses: "" });
  const [promoMsg, setPromoMsg] = useState(null);
  const [promoSaving, setPromoSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/"); return; }
    if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) { router.push("/"); return; }
    fetchOrders();
    fetchPromos();
  }, [user, loading]);

  async function fetchOrders() {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  async function fetchPromos() {
    const snap = await getDocs(collection(db, "promoCodes"));
    setPromos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  async function updateOrderStatus(id, status) {
    await updateDoc(doc(db, "orders", id), { status });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  }

  async function handleAddPromo(e) {
    e.preventDefault();
    if (!promoForm.code) return setPromoMsg({ type: "error", text: "Code is required." });
    if (promoForm.type !== "freeshipping" && !promoForm.value) return setPromoMsg({ type: "error", text: "Value is required for this type." });
    setPromoSaving(true);
    try {
      await addDoc(collection(db, "promoCodes"), {
        code: promoForm.code.toUpperCase().trim(),
        type: promoForm.type,
        value: promoForm.value ? parseFloat(promoForm.value) : 0,
        expiresAt: promoForm.expiresAt ? Timestamp.fromDate(new Date(promoForm.expiresAt)) : null,
        maxUses: promoForm.maxUses ? parseInt(promoForm.maxUses) : null,
        usedCount: 0,
        active: true,
        createdAt: new Date(),
      });
      setPromoForm({ code: "", type: "freeshipping", value: "", expiresAt: "", maxUses: "" });
      setPromoMsg({ type: "success", text: "Promo code created!" });
      fetchPromos();
    } catch { setPromoMsg({ type: "error", text: "Failed to create code." }); }
    finally { setPromoSaving(false); }
  }

  async function togglePromo(id, active) {
    await updateDoc(doc(db, "promoCodes", id), { active: !active });
    fetchPromos();
  }

  async function deletePromo(id) {
    if (!confirm("Delete this promo code?")) return;
    await deleteDoc(doc(db, "promoCodes", id));
    fetchPromos();
  }

  if (loading || !user) return <p style={{ padding: "2rem", color: "#fff" }}>Loading...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "Montserrat, sans-serif", background: "#0A0A0A", minHeight: "100vh", color: "#fff", paddingTop: "5rem" }}>
      <h1 style={{ color: "#C9A84C", fontFamily: "Cormorant Garamond, serif", fontSize: "2rem", marginBottom: "2rem" }}>Admin Dashboard</h1>

      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid rgba(201,168,76,0.15)", marginBottom: "2rem" }}>
        {["orders", "promos"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", borderBottom: tab === t ? "2px solid #C9A84C" : "2px solid transparent", color: tab === t ? "#C9A84C" : "#555", cursor: "pointer", padding: "0.75rem 1.5rem", fontFamily: "Montserrat, sans-serif", fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "-1px" }}>
            {t === "orders" ? "Orders" : "Promo Codes"}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div>
          <p style={{ color: "#666", fontSize: "0.7rem", marginBottom: "1.5rem" }}>{orders.length} orders total</p>
          {orders.length === 0 && <p style={{ color: "#444" }}>No orders yet.</p>}
          {orders.map((order) => {
            const sc = statusColor(order.status);
            const isOpen = expanded === order.id;
            return (
              <div key={order.id} style={{ marginBottom: "0.8rem" }}>

                {/* Header row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  style={{ border: "1px solid rgba(201,168,76,0.2)", padding: "1.1rem 1.5rem", borderRadius: isOpen ? "8px 8px 0 0" : "8px", background: "#0F0F0F", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.8rem" }}
                >
                  <div>
                    <div style={{ color: "#C9A84C", fontFamily: "Cormorant Garamond, serif", fontSize: "1rem", letterSpacing: "0.05em" }}>{order.name}</div>
                    <div style={{ color: "#555", fontSize: "0.62rem", letterSpacing: "0.05em", marginTop: "0.2rem" }}>
                      {order.email} · {order.createdAt?.toDate?.().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.1rem", color: "#E8C96D" }}>R {parseFloat(order.amount || 0).toFixed(2)}</div>
                    <span style={{ fontSize: "0.55rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", padding: "0.25rem 0.7rem", borderRadius: "999px", color: sc.color, border: `1px solid ${sc.border}`, background: `${sc.color}18` }}>
                      {order.status || "paid"}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div style={{ border: "1px solid rgba(201,168,76,0.2)", borderTop: "none", borderRadius: "0 0 8px 8px", background: "#0A0A0A", padding: "1.5rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>

                      {/* Ship to */}
                      <div>
                        <div style={{ fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A84C", marginBottom: "0.6rem" }}>Ship To</div>
                        {order.address ? (
                          <div style={{ fontSize: "0.72rem", color: "#888", lineHeight: 1.9 }}>
                            <div style={{ color: "#ddd" }}>{order.name}</div>
                            {order.address.line1 && <div>{order.address.line1}</div>}
                            {order.address.line2 && <div>{order.address.line2}</div>}
                            {order.address.city && <div>{order.address.city}{order.address.province ? `, ${order.address.province}` : ""} {order.address.postal}</div>}
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.68rem", color: "#444" }}>No address saved</div>
                        )}
                      </div>

                      {/* Shipping & payment */}
                      <div>
                        <div style={{ fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A84C", marginBottom: "0.6rem" }}>Shipping</div>
                        <div style={{ fontSize: "0.72rem", color: "#888", lineHeight: 1.9 }}>
                          <div>{order.shippingService || "—"}</div>
                          <div>{parseFloat(order.shippingCost) > 0 ? `R ${parseFloat(order.shippingCost).toFixed(2)}` : "FREE"}</div>
                          {order.promoCode && <div style={{ color: "#7ec87e" }}>Promo: {order.promoCode} · −R{order.discount}</div>}
                          {order.paymentId && <div style={{ color: "#555", marginTop: "0.3rem" }}>Ref: #{order.paymentId}</div>}
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    {order.cart?.length > 0 && (
                      <div style={{ marginBottom: "1.2rem" }}>
                        <div style={{ fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A84C", marginBottom: "0.6rem" }}>Items</div>
                        {order.cart.map((item, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <div>
                              <div style={{ fontSize: "0.75rem", color: "#ddd" }}>{item.name}</div>
                              {item.size && <div style={{ fontSize: "0.62rem", color: "#555", marginTop: "0.1rem" }}>Size: {item.size} · Qty: {item.quantity} · SKU: {item.sku || "—"}</div>}
                            </div>
                            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "0.95rem", color: "#E8C96D" }}>
                              R {(item.price * item.quantity).toFixed(2)}
                            </div>
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "0.8rem", fontFamily: "Cormorant Garamond, serif", fontSize: "1.1rem", color: "#C9A84C" }}>
                          Total: R {parseFloat(order.amount || 0).toFixed(2)}
                        </div>
                      </div>
                    )}

                    {/* Status update */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", paddingTop: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: "0.58rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#555" }}>Update Status:</div>
                      {STATUS_OPTIONS.map(s => {
                        const c = statusColor(s);
                        const active = (order.status || "paid") === s;
                        return (
                          <button
                            key={s}
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, s); }}
                            style={{ padding: "0.3rem 0.8rem", borderRadius: "999px", border: `1px solid ${active ? c.border : "rgba(255,255,255,0.08)"}`, background: active ? `${c.color}18` : "none", color: active ? c.color : "#444", fontSize: "0.55rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "Montserrat, sans-serif", transition: "all 0.15s" }}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "promos" && (
        <div>
          <div style={{ border: "1px solid rgba(201,168,76,0.2)", padding: "1.5rem", borderRadius: "8px", background: "#0F0F0F", marginBottom: "2rem" }}>
            <p style={{ color: "#C9A84C", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.2rem" }}>Create Promo Code</p>
            {promoMsg && <div style={{ padding: "0.6rem 0.9rem", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.68rem", background: promoMsg.type === "error" ? "rgba(220,80,80,0.08)" : "rgba(80,180,80,0.08)", border: promoMsg.type === "error" ? "1px solid rgba(220,80,80,0.3)" : "1px solid rgba(80,180,80,0.3)", color: promoMsg.type === "error" ? "#e07070" : "#7ec87e" }}>{promoMsg.text}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div><label style={labelStyle}>Code</label><input style={inputStyle} value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="FREESHIP" /></div>
              <div><label style={labelStyle}>Type</label>
                <select style={{ ...inputStyle, appearance: "none" }} value={promoForm.type} onChange={e => setPromoForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="freeshipping">Free Shipping</option>
                  <option value="percent">% Discount</option>
                  <option value="fixed">Fixed Amount Off (R)</option>
                </select>
              </div>
              {promoForm.type !== "freeshipping" && <div><label style={labelStyle}>{promoForm.type === "percent" ? "Discount %" : "Amount (R)"}</label><input style={inputStyle} type="number" value={promoForm.value} onChange={e => setPromoForm(f => ({ ...f, value: e.target.value }))} placeholder={promoForm.type === "percent" ? "10" : "50"} /></div>}
              <div><label style={labelStyle}>Expiry Date (optional)</label><input style={inputStyle} type="date" value={promoForm.expiresAt} onChange={e => setPromoForm(f => ({ ...f, expiresAt: e.target.value }))} /></div>
              <div><label style={labelStyle}>Max Uses (optional)</label><input style={inputStyle} type="number" value={promoForm.maxUses} onChange={e => setPromoForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="100" /></div>
            </div>
            <button onClick={handleAddPromo} disabled={promoSaving} style={{ padding: "0.7rem 1.8rem", background: "linear-gradient(135deg, #C9A84C, #E8C96D)", border: "none", borderRadius: "6px", cursor: "pointer", fontFamily: "Montserrat, sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", color: "#0A0A0A" }}>
              {promoSaving ? "Saving..." : "Create Code"}
            </button>
          </div>

          <p style={{ color: "#666", fontSize: "0.7rem", marginBottom: "1rem" }}>{promos.length} codes total</p>
          {promos.length === 0 && <p style={{ color: "#444" }}>No promo codes yet.</p>}
          {promos.map(promo => (
            <div key={promo.id} style={{ border: `1px solid ${promo.active ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.06)"}`, padding: "1rem 1.4rem", marginBottom: "0.8rem", borderRadius: "8px", background: "#0F0F0F", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.8rem" }}>
              <div>
                <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.1rem", color: promo.active ? "#C9A84C" : "#444", letterSpacing: "0.1em" }}>{promo.code}</span>
                <span style={{ marginLeft: "0.8rem", fontSize: "0.62rem", color: "#555" }}>
                  {promo.type === "freeshipping" ? "Free Shipping" : promo.type === "percent" ? `${promo.value}% off` : `R${promo.value} off`}
                  {promo.maxUses ? ` · ${promo.usedCount}/${promo.maxUses} uses` : ""}
                  {promo.expiresAt ? ` · Expires ${promo.expiresAt.toDate().toLocaleDateString()}` : ""}
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button onClick={() => togglePromo(promo.id, promo.active)} style={{ padding: "0.4rem 0.9rem", background: "none", border: `1px solid ${promo.active ? "rgba(201,168,76,0.3)" : "rgba(80,180,80,0.3)"}`, borderRadius: "6px", cursor: "pointer", fontSize: "0.6rem", color: promo.active ? "#C9A84C" : "#7ec87e", fontFamily: "Montserrat, sans-serif" }}>
                  {promo.active ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => deletePromo(promo.id)} style={{ padding: "0.4rem 0.9rem", background: "none", border: "1px solid rgba(220,80,80,0.3)", borderRadius: "6px", cursor: "pointer", fontSize: "0.6rem", color: "#e07070", fontFamily: "Montserrat, sans-serif" }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}