'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CheckoutPage() {
  const [cart, setCart] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    zip: '',
  });

  useEffect(() => {
    setMounted(true);
    const stored = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(stored);
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePayFast = async (e) => {
    e.preventDefault();

    const required = ['firstName', 'lastName', 'email', 'phone'];
    for (const field of required) {
      if (!form[field].trim()) {
        alert(`Please fill in your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`);
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch('/api/payfast-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form,
          subtotal: subtotal.toFixed(2),
          cartLength: cart.length,
        }),
      });

      const pfData = await res.json();

      // TEMP DEBUG
      alert(JSON.stringify(pfData._debug_paramString));

      const pfForm = document.createElement('form');
      pfForm.method = 'POST';
      pfForm.action = 'https://www.payfast.co.za/eng/process'; // live
      // pfForm.action = 'https://sandbox.payfast.co.za/eng/process'; // sandbox

      Object.entries(pfData).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        pfForm.appendChild(input);
      });

      document.body.appendChild(pfForm);
      pfForm.submit();
    } catch (err) {
      console.error('PayFast error:', err);
      alert('Payment could not be initiated. Please try again.');
      setLoading(false);
    }
  };

  if (!mounted) return null;

  if (cart.length === 0) {
    return (
      <div style={{ paddingTop: '70px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#F5F0E8', marginBottom: '1rem' }}>Your cart is empty</h2>
          <Link href="/shop" className="btn-gold">Browse Collection</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '70px' }}>

      {/* HERO */}
      <section style={{
        padding: '6rem 2rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A0A 50%, #0A0A0A 100%)',
      }}>
        <p className="section-label">Final Step</p>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#F5F0E8', marginTop: '0.5rem' }}>Checkout</h1>
        <div className="divider-gold" />
        <p style={{ fontSize: '0.85rem', color: '#999', maxWidth: '500px', margin: '0 auto', lineHeight: 1.9 }}>
          Complete your details below and proceed to secure payment via PayFast.
        </p>
      </section>

      <section style={{ padding: '4rem 2rem 6rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '3rem', alignItems: 'start' }}>

          {/* FORM */}
          <div style={{ border: '1px solid rgba(201,168,76,0.2)', padding: '3rem', background: '#0F0F0F' }}>
            <p className="section-label" style={{ marginBottom: '0.5rem' }}>Your Details</p>
            <h2 style={{ fontSize: '1.8rem', color: '#F5F0E8', marginBottom: '2rem' }}>Delivery Information</h2>

            {/* Name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'First Name', name: 'firstName', placeholder: 'Rhea' },
                { label: 'Last Name', name: 'lastName', placeholder: 'Jugernath' },
              ].map(f => (
                <div key={f.name}>
                  <label style={labelStyle}>{f.label} *</label>
                  <input
                    type="text"
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'}
                    onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
                  />
                </div>
              ))}
            </div>

            {/* Email */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Email Address *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C9A84C'}
                onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
              />
            </div>

            {/* Phone */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="081 336 5266"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C9A84C'}
                onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
              />
            </div>

            {/* Address */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Street Address</label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="123 Main Road"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C9A84C'}
                onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
              />
            </div>

            {/* City / Province / ZIP */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
              {[
                { label: 'City', name: 'city', placeholder: 'Verulam' },
                { label: 'Province', name: 'province', placeholder: 'KwaZulu-Natal' },
                { label: 'Postal Code', name: 'zip', placeholder: '4340' },
              ].map(f => (
                <div key={f.name}>
                  <label style={labelStyle}>{f.label}</label>
                  <input
                    type="text"
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'}
                    onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
                  />
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: '2rem' }}>
              <p style={{ fontSize: '0.72rem', color: '#555', lineHeight: 1.8, marginBottom: '1.5rem' }}>
                🔒 You will be redirected to <span style={{ color: '#C9A84C' }}>PayFast</span> to complete secure payment. R&amp;R Agencies never stores your card details.
              </p>
              <button
                onClick={handlePayFast}
                disabled={loading}
                className="btn-gold"
                style={{ width: '100%', cursor: loading ? 'not-allowed' : 'pointer', border: 'none', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Redirecting to PayFast...' : `Pay R ${subtotal.toFixed(2)} via PayFast`}
              </button>
            </div>
          </div>

          {/* ORDER SUMMARY */}
          <div style={{
            border: '1px solid rgba(201,168,76,0.2)',
            padding: '2.5rem',
            background: '#0F0F0F',
            position: 'sticky',
            top: '90px',
          }}>
            <p className="section-label" style={{ marginBottom: '0.5rem' }}>Your Order</p>
            <h2 style={{ fontSize: '1.5rem', color: '#F5F0E8', marginBottom: '2rem' }}>Summary</h2>

            <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: '1.5rem' }}>
              {cart.map(item => (
                <div key={`${item.id}-${item.size}`} style={{
                  display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-start',
                }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        style={{ width: '40px', height: '48px', objectFit: 'cover', border: '1px solid rgba(201,168,76,0.15)' }}
                      />
                    )}
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#ccc', maxWidth: '160px', lineHeight: 1.4 }}>{item.name}</p>
                      <p style={{ fontSize: '0.6rem', color: '#555', letterSpacing: '0.1em' }}>Size: {item.size} · Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#888' }}>R {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div style={{
              borderTop: '1px solid rgba(201,168,76,0.15)',
              paddingTop: '1.5rem',
              marginTop: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <p style={{ fontSize: '0.65rem', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Total</p>
              <p style={{ fontSize: '1.5rem', color: '#C9A84C', fontFamily: 'Cormorant Garamond, serif' }}>
                R {subtotal.toFixed(2)}
              </p>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <Link href="/cart" style={{ fontSize: '0.65rem', color: '#555', textDecoration: 'none', letterSpacing: '0.1em' }}
                onMouseEnter={e => e.target.style.color = '#C9A84C'}
                onMouseLeave={e => e.target.style.color = '#555'}
              >
                ← Edit Cart
              </Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

const labelStyle = {
  fontSize: '0.65rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: '#C9A84C',
  display: 'block',
  marginBottom: '0.5rem',
};

const inputStyle = {
  width: '100%',
  background: '#1A1A1A',
  border: '1px solid rgba(201,168,76,0.2)',
  color: '#F5F0E8',
  padding: '0.85rem 1rem',
  fontSize: '0.82rem',
  fontFamily: 'Montserrat, sans-serif',
  outline: 'none',
  letterSpacing: '0.03em',
};