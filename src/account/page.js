'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/lib/context/AuthContext';

function AccountContent() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'account');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (tab === 'orders' && user) {
      setOrdersLoading(true);
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      getDocs(q)
        .then(snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        .catch(() => setOrders([]))
        .finally(() => setOrdersLoading(false));
    }
  }, [tab, user]);

  if (loading || !user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
      <div style={{ width: 40, height: 40, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const TABS = [
    { id: 'account',   label: 'Account' },
    { id: 'orders',    label: 'Orders' },
    { id: 'addresses', label: 'Addresses' },
    { id: 'security',  label: 'Security' },
  ];

  return (
    <>
      <style>{`
        .acc-page {
          min-height: 100vh;
          background: #0A0A0A;
          padding: 7rem 1.5rem 4rem;
        }
        .acc-inner {
          max-width: 900px;
          margin: 0 auto;
        }
        .acc-hero {
          display: flex;
          align-items: center;
          gap: 1.2rem;
          margin-bottom: 3rem;
        }
        .acc-avatar {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #C9A84C, #E8C96D);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.4rem; font-weight: 600;
          color: #0A0A0A;
          flex-shrink: 0;
          letter-spacing: 0.05em;
        }
        .acc-hero-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.6rem; font-weight: 600;
          color: #E8C96D; letter-spacing: 0.08em;
          line-height: 1.1;
        }
        .acc-hero-email {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.65rem; color: #555;
          letter-spacing: 0.08em; margin-top: 0.2rem;
        }

        .acc-tabs {
          display: flex; gap: 0;
          border-bottom: 1px solid rgba(201,168,76,0.12);
          margin-bottom: 2.5rem;
          overflow-x: auto;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .acc-tabs::-webkit-scrollbar { display: none; }
        .acc-tab {
          background: none; border: none; cursor: pointer;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.65rem; font-weight: 500;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: #555; padding: 0.75rem 1.4rem;
          border-bottom: 1px solid transparent;
          margin-bottom: -1px;
          transition: color 0.2s, border-color 0.2s;
          white-space: nowrap;
        }
        .acc-tab:hover { color: #999; }
        .acc-tab--active { color: #C9A84C; border-bottom-color: #C9A84C; }

        .acc-section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem; font-weight: 600;
          color: #C9A84C; letter-spacing: 0.1em;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
        }

        .acc-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(201,168,76,0.12);
          border-radius: 12px;
          padding: 1.8rem;
          margin-bottom: 1.5rem;
        }

        .acc-field { margin-bottom: 1.2rem; }
        .acc-label {
          display: block;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.58rem; font-weight: 500;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: #555; margin-bottom: 0.4rem;
        }
        .acc-input {
          width: 100%; padding: 0.7rem 0.9rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(201,168,76,0.15);
          border-radius: 8px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.78rem; color: #ddd;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .acc-input::placeholder { color: #333; }
        .acc-input:focus { border-color: rgba(201,168,76,0.4); }
        .acc-input:disabled { opacity: 0.4; cursor: not-allowed; }

        .acc-input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        @media (max-width: 560px) { .acc-input-row { grid-template-columns: 1fr; } }

        .acc-btn {
          padding: 0.72rem 1.8rem;
          background: linear-gradient(135deg, #C9A84C, #E8C96D);
          border: none; border-radius: 8px; cursor: pointer;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.65rem; font-weight: 700;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: #0A0A0A;
          transition: opacity 0.2s, transform 0.2s;
        }
        .acc-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        .acc-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .acc-btn--ghost {
          background: none;
          border: 1px solid rgba(201,168,76,0.3);
          color: #C9A84C;
        }
        .acc-btn--ghost:hover:not(:disabled) {
          background: rgba(201,168,76,0.07);
          border-color: rgba(201,168,76,0.5);
        }
        .acc-btn--danger {
          background: none;
          border: 1px solid rgba(220,80,80,0.3);
          color: #e07070;
        }
        .acc-btn--danger:hover:not(:disabled) {
          background: rgba(220,80,80,0.07);
          border-color: rgba(220,80,80,0.5);
        }

        .acc-msg {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.65rem; letter-spacing: 0.05em;
          padding: 0.6rem 0.9rem; border-radius: 6px;
          margin-bottom: 1rem;
        }
        .acc-msg--error { color: #e07070; background: rgba(220,80,80,0.08); border: 1px solid rgba(220,80,80,0.2); }
        .acc-msg--success { color: #7ec87e; background: rgba(80,180,80,0.08); border: 1px solid rgba(80,180,80,0.2); }

        .acc-divider {
          height: 1px; background: rgba(201,168,76,0.1);
          margin: 1.5rem 0;
        }

        .acc-order-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.1rem 1.4rem;
          border: 1px solid rgba(201,168,76,0.1);
          border-radius: 10px; margin-bottom: 0.8rem;
          transition: border-color 0.2s, background 0.2s;
          flex-wrap: wrap; gap: 0.8rem;
        }
        .acc-order-row:hover {
          border-color: rgba(201,168,76,0.25);
          background: rgba(201,168,76,0.03);
        }
        .acc-order-id {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.65rem; color: #888;
          letter-spacing: 0.08em;
        }
        .acc-order-date {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.6rem; color: #555;
          letter-spacing: 0.05em; margin-top: 0.2rem;
        }
        .acc-order-amount {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1rem; color: #E8C96D;
          letter-spacing: 0.05em;
        }
        .acc-order-badge {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.55rem; font-weight: 600;
          letter-spacing: 0.15em; text-transform: uppercase;
          padding: 0.25rem 0.7rem; border-radius: 999px;
        }
        .acc-order-badge--pending   { color: #d4a843; background: rgba(212,168,67,0.1);  border: 1px solid rgba(212,168,67,0.25); }
        .acc-order-badge--delivered { color: #7ec87e; background: rgba(80,180,80,0.1);   border: 1px solid rgba(80,180,80,0.25); }
        .acc-order-badge--shipped   { color: #7ab4d4; background: rgba,122,180,212,0.1); border: 1px solid rgba(122,180,212,0.25); }
        .acc-order-badge--cancelled { color: #e07070; background: rgba(220,80,80,0.1);   border: 1px solid rgba(220,80,80,0.25); }

        .acc-empty {
          text-align: center; padding: 3.5rem 1rem;
        }
        .acc-empty-icon { color: #2a2a2a; margin-bottom: 1rem; }
        .acc-empty-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem; color: #444;
          letter-spacing: 0.1em; margin-bottom: 0.5rem;
        }
        .acc-empty-sub {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.65rem; color: #333;
          letter-spacing: 0.05em;
        }

        .acc-address-card {
          border: 1px solid rgba(201,168,76,0.12);
          border-radius: 10px; padding: 1.2rem 1.4rem;
          margin-bottom: 0.8rem; position: relative;
          background: rgba(255,255,255,0.01);
          transition: border-color 0.2s;
        }
        .acc-address-card:hover { border-color: rgba(201,168,76,0.25); }
        .acc-address-default {
          position: absolute; top: 0.8rem; right: 0.9rem;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.55rem; font-weight: 600;
          letter-spacing: 0.15em; text-transform: uppercase;
          color: #C9A84C; background: rgba(201,168,76,0.1);
          border: 1px solid rgba(201,168,76,0.2);
          padding: 0.2rem 0.6rem; border-radius: 999px;
        }
        .acc-address-line {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.72rem; color: #888;
          letter-spacing: 0.04em; line-height: 1.7;
        }
        .acc-address-actions {
          display: flex; gap: 0.6rem; margin-top: 0.8rem;
        }

        .acc-add-addr-form {
          border: 1px dashed rgba(201,168,76,0.15);
          border-radius: 10px; padding: 1.5rem;
          margin-top: 1rem;
          animation: fadeIn 0.25s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="acc-page">
        <div className="acc-inner">
          <div className="acc-hero">
            <div className="acc-avatar">
              {user.displayName
                ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : user.email[0].toUpperCase()}
            </div>
            <div>
              <div className="acc-hero-name">{user.displayName || 'My Account'}</div>
              <div className="acc-hero-email">{user.email}</div>
            </div>
          </div>

          <div className="acc-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`acc-tab${tab === t.id ? ' acc-tab--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'account'   && <AccountTab user={user} />}
          {tab === 'orders'    && <OrdersTab orders={orders} loading={ordersLoading} />}
          {tab === 'addresses' && <AddressesTab user={user} profile={profile} />}
          {tab === 'security'  && <SecurityTab />}
        </div>
      </div>
    </>
  );
}

function AccountTab({ user }) {
  const [name, setName] = useState(user.displayName || '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setMsg({ type: 'error', text: 'Name cannot be empty.' });
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: name.trim() });
      await updateDoc(doc(db, 'users', user.uid), { displayName: name.trim(), phone });
      setMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch {
      setMsg({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally { setSaving(false); }
  };

  return (
    <div>
      <p className="acc-section-title">Profile Details</p>
      <div className="acc-card">
        {msg && <div className={`acc-msg acc-msg--${msg.type}`}>{msg.text}</div>}
        <form onSubmit={handleSave}>
          <div className="acc-field">
            <label className="acc-label">Full Name</label>
            <input
              className="acc-input"
              value={name}
              onChange={e => { setName(e.target.value); setMsg(null); }}
              placeholder="Your full name"
            />
          </div>
          <div className="acc-field">
            <label className="acc-label">Email Address</label>
            <input className="acc-input" value={user.email} disabled />
          </div>
          <div className="acc-field">
            <label className="acc-label">Phone Number</label>
            <input
              className="acc-input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+27 81 000 0000"
            />
          </div>
          <button type="submit" className="acc-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

function OrdersTab({ orders, loading }) {
  if (loading) return (
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
    </div>
  );

  if (!orders.length) return (
    <div className="acc-empty">
      <div className="acc-empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>
        </svg>
      </div>
      <div className="acc-empty-title">No orders yet</div>
      <div className="acc-empty-sub">Your order history will appear here.</div>
      <div style={{ marginTop: '1.5rem' }}>
        <a href="/shop" className="acc-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Shop Now
        </a>
      </div>
    </div>
  );

  const statusClass = (s) => {
    switch ((s || '').toLowerCase()) {
      case 'delivered':  return 'acc-order-badge--delivered';
      case 'shipped':    return 'acc-order-badge--shipped';
      case 'cancelled':  return 'acc-order-badge--cancelled';
      default:           return 'acc-order-badge--pending';
    }
  };

  return (
    <div>
      <p className="acc-section-title">Order History</p>
      {orders.map(order => (
        <div key={order.id} className="acc-order-row">
          <div>
            <div className="acc-order-id">#{order.id.slice(-8).toUpperCase()}</div>
            <div className="acc-order-date">
              {order.createdAt?.toDate
                ? order.createdAt.toDate().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Date unavailable'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="acc-order-amount">R {(order.total || 0).toFixed(2)}</div>
            <span className={`acc-order-badge ${statusClass(order.status)}`}>
              {order.status || 'Pending'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AddressesTab({ user, profile }) {
  const [addresses, setAddresses] = useState(profile?.addresses || []);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ label: '', line1: '', line2: '', city: '', province: '', postal: '', country: 'South Africa' });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.line1 || !form.city || !form.postal) return setMsg({ type: 'error', text: 'Please fill in the required address fields.' });
    setSaving(true);
    const newAddr = { ...form, id: Date.now().toString() };
    const updated = [...addresses, newAddr];
    try {
      await updateDoc(doc(db, 'users', user.uid), { addresses: updated });
      setAddresses(updated);
      setAdding(false);
      setForm({ label: '', line1: '', line2: '', city: '', province: '', postal: '', country: 'South Africa' });
      setMsg({ type: 'success', text: 'Address added.' });
    } catch {
      setMsg({ type: 'error', text: 'Failed to save address.' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const updated = addresses.filter(a => a.id !== id);
    try {
      await updateDoc(doc(db, 'users', user.uid), { addresses: updated });
      setAddresses(updated);
    } catch {
      setMsg({ type: 'error', text: 'Failed to remove address.' });
    }
  };

  return (
    <div>
      <p className="acc-section-title">Saved Addresses</p>
      {msg && <div className={`acc-msg acc-msg--${msg.type}`}>{msg.text}</div>}

      {!addresses.length && !adding && (
        <div className="acc-empty">
          <div className="acc-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div className="acc-empty-title">No addresses saved</div>
          <div className="acc-empty-sub">Add a delivery address to speed up checkout.</div>
        </div>
      )}

      {addresses.map((addr, i) => (
        <div key={addr.id} className="acc-address-card">
          {i === 0 && <span className="acc-address-default">Default</span>}
          {addr.label && (
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.62rem', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              {addr.label}
            </div>
          )}
          <div className="acc-address-line">
            {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
            {addr.city}, {addr.province} {addr.postal}<br />
            {addr.country}
          </div>
          <div className="acc-address-actions">
            <button className="acc-btn acc-btn--danger" style={{ fontSize: '0.58rem', padding: '0.4rem 0.9rem' }} onClick={() => handleDelete(addr.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}

      {!adding && (
        <button className="acc-btn acc-btn--ghost" style={{ marginTop: '0.5rem' }} onClick={() => { setAdding(true); setMsg(null); }}>
          + Add Address
        </button>
      )}

      {adding && (
        <div className="acc-add-addr-form">
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.95rem', color: '#C9A84C', letterSpacing: '0.1em', marginBottom: '1.2rem' }}>
            New Address
          </div>
          <form onSubmit={handleAdd}>
            <div className="acc-field">
              <label className="acc-label">Label (optional, e.g. Home / Work)</label>
              <input className="acc-input" value={form.label} onChange={set('label')} placeholder="Home" />
            </div>
            <div className="acc-field">
              <label className="acc-label">Street Address *</label>
              <input className="acc-input" value={form.line1} onChange={set('line1')} placeholder="123 Main Street" />
            </div>
            <div className="acc-field">
              <label className="acc-label">Apartment / Suite</label>
              <input className="acc-input" value={form.line2} onChange={set('line2')} placeholder="Unit 4B (optional)" />
            </div>
            <div className="acc-input-row">
              <div className="acc-field">
                <label className="acc-label">City *</label>
                <input className="acc-input" value={form.city} onChange={set('city')} placeholder="Durban" />
              </div>
              <div className="acc-field">
                <label className="acc-label">Province</label>
                <input className="acc-input" value={form.province} onChange={set('province')} placeholder="KwaZulu-Natal" />
              </div>
            </div>
            <div className="acc-input-row">
              <div className="acc-field">
                <label className="acc-label">Postal Code *</label>
                <input className="acc-input" value={form.postal} onChange={set('postal')} placeholder="4001" />
              </div>
              <div className="acc-field">
                <label className="acc-label">Country</label>
                <input className="acc-input" value={form.country} onChange={set('country')} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.4rem' }}>
              <button type="submit" className="acc-btn" disabled={saving}>
                {saving ? 'Saving...' : 'Save Address'}
              </button>
              <button type="button" className="acc-btn acc-btn--ghost" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function SecurityTab() {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleChange = async (e) => {
    e.preventDefault();
    if (!current || !newPass || !confirm) return setMsg({ type: 'error', text: 'Please fill in all fields.' });
    if (newPass !== confirm) return setMsg({ type: 'error', text: 'New passwords do not match.' });
    if (newPass.length < 8) return setMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPass);
      setMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrent(''); setNewPass(''); setConfirm('');
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setMsg({ type: 'error', text: 'Current password is incorrect.' });
      } else {
        setMsg({ type: 'error', text: 'Failed to change password. Please try again.' });
      }
    } finally { setSaving(false); }
  };

  return (
    <div>
      <p className="acc-section-title">Change Password</p>
      <div className="acc-card">
        {msg && <div className={`acc-msg acc-msg--${msg.type}`}>{msg.text}</div>}
        <form onSubmit={handleChange}>
          <div className="acc-field">
            <label className="acc-label">Current Password</label>
            <input className="acc-input" type="password" value={current} onChange={e => { setCurrent(e.target.value); setMsg(null); }} placeholder="••••••••" autoComplete="current-password" />
          </div>
          <div className="acc-divider" />
          <div className="acc-field">
            <label className="acc-label">New Password</label>
            <input className="acc-input" type="password" value={newPass} onChange={e => { setNewPass(e.target.value); setMsg(null); }} placeholder="Min. 8 characters" autoComplete="new-password" />
          </div>
          <div className="acc-field">
            <label className="acc-label">Confirm New Password</label>
            <input className="acc-input" type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setMsg(null); }} placeholder="••••••••" autoComplete="new-password" />
          </div>
          <button type="submit" className="acc-btn" disabled={saving}>
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountContent />
    </Suspense>
  );
}