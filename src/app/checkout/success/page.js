'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
  useEffect(() => {
    // Clear cart after successful payment
    localStorage.removeItem('cart');
  }, []);

  return (
    <div style={{ paddingTop: '70px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: '500px', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>✅</div>
        <p className="section-label" style={{ marginBottom: '0.5rem' }}>Payment Received</p>
        <h1 style={{ fontSize: '2.5rem', color: '#F5F0E8', marginBottom: '1rem' }}>Order Confirmed</h1>
        <div className="divider-gold" />
        <p style={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.9, marginBottom: '2.5rem' }}>
          Thank you for your purchase! We've received your order and will be in touch shortly at the email address you provided.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/shop" className="btn-gold">Continue Shopping</Link>
          <Link href="/contact" className="btn-outline-gold">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}