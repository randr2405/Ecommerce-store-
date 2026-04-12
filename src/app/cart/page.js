'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(stored);
  }, []);

  const updateQuantity = (id, size, delta) => {
    const updated = cart.map(item => {
      if (item.id === id && item.size === size) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    });
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const removeItem = (id, size) => {
    const updated = cart.filter(item => !(item.id === id && item.size === size));
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!mounted) return null;

  return (
    <div style={{ paddingTop: '70px' }}>

      {/* HERO */}
      <section style={{
        padding: '6rem 2rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A0A 50%, #0A0A0A 100%)',
      }}>
        <p className="section-label">Your Selection</p>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#F5F0E8', marginTop: '0.5rem' }}>Shopping Cart</h1>
        <div className="divider-gold" />
        <p style={{ fontSize: '0.85rem', color: '#999', maxWidth: '500px', margin: '0 auto', lineHeight: 1.9 }}>
          {cart.length === 0 ? 'Your cart is currently empty.' : `${cart.length} item${cart.length > 1 ? 's' : ''} in your cart`}
        </p>
      </section>

      <section style={{ padding: '4rem 2rem 6rem', maxWidth: '1100px', margin: '0 auto' }}>

        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🛒</div>
            <h2 style={{ fontSize: '1.8rem', color: '#F5F0E8', marginBottom: '1rem' }}>Your cart is empty</h2>
            <div style={{ width: '40px', height: '1px', background: '#C9A84C', margin: '0 auto 1.5rem' }} />
            <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '2.5rem' }}>
              Discover our latest collection and find something you love.
            </p>
            <Link href="/shop" className="btn-gold">Browse Collection</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '3rem', alignItems: 'start' }}>

            {/* CART ITEMS */}
            <div>
              {cart.map((item, i) => (
                <div key={`${item.id}-${item.size}`} style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr auto',
                  gap: '1.5rem',
                  alignItems: 'center',
                  padding: '2rem 0',
                  borderBottom: i < cart.length - 1 ? '1px solid rgba(201,168,76,0.1)' : 'none',
                }}>

                  {/* Image */}
                  <div style={{
                    width: '100px',
                    height: '120px',
                    background: '#0F0F0F',
                    border: '1px solid rgba(201,168,76,0.15)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.5rem' }}>👕</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', color: '#F5F0E8', marginBottom: '0.3rem' }}>{item.name}</h3>
                    <p style={{ fontSize: '0.65rem', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                      Size: {item.size}
                    </p>
                    <p style={{ fontSize: '1rem', color: '#C9A84C', fontFamily: 'Cormorant Garamond, serif', marginBottom: '1rem' }}>
                      R {Number(item.price).toFixed(2)}
                    </p>

                    {/* Quantity controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <button
                        onClick={() => updateQuantity(item.id, item.size, -1)}
                        style={{
                          width: '36px', height: '36px', background: 'transparent',
                          border: '1px solid rgba(201,168,76,0.2)', color: '#888',
                          fontSize: '1rem', cursor: 'pointer',
                        }}
                      >−</button>
                      <div style={{
                        width: '50px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid rgba(201,168,76,0.2)', borderLeft: 'none', borderRight: 'none',
                        fontSize: '0.82rem', color: '#F5F0E8',
                      }}>
                        {item.quantity}
                      </div>
                      <button
                        onClick={() => updateQuantity(item.id, item.size, 1)}
                        style={{
                          width: '36px', height: '36px', background: 'transparent',
                          border: '1px solid rgba(201,168,76,0.2)', color: '#888',
                          fontSize: '1rem', cursor: 'pointer',
                        }}
                      >+</button>
                    </div>
                  </div>

                  {/* Remove + line total */}
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.1rem', color: '#F5F0E8', fontFamily: 'Cormorant Garamond, serif', marginBottom: '0.75rem' }}>
                      R {(item.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeItem(item.id, item.size)}
                      style={{
                        background: 'transparent', border: 'none', color: '#555',
                        fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                        cursor: 'pointer', transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => e.target.style.color = '#C9A84C'}
                      onMouseLeave={e => e.target.style.color = '#555'}
                    >
                      Remove
                    </button>
                  </div>

                </div>
              ))}

              <div style={{ marginTop: '2rem' }}>
                <Link href="/shop" style={{
                  fontSize: '0.65rem', color: '#666', textDecoration: 'none',
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                }}
                  onMouseEnter={e => e.target.style.color = '#C9A84C'}
                  onMouseLeave={e => e.target.style.color = '#666'}
                >
                  ← Continue Shopping
                </Link>
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
              <p className="section-label" style={{ marginBottom: '0.5rem' }}>Order Summary</p>
              <h2 style={{ fontSize: '1.5rem', color: '#F5F0E8', marginBottom: '2rem' }}>Your Total</h2>

              <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: '1.5rem' }}>
                {cart.map(item => (
                  <div key={`${item.id}-${item.size}-summary`} style={{
                    display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem',
                  }}>
                    <p style={{ fontSize: '0.75rem', color: '#888', maxWidth: '180px' }}>
                      {item.name} <span style={{ color: '#555' }}>× {item.quantity}</span>
                      <span style={{ display: 'block', fontSize: '0.6rem', color: '#555', letterSpacing: '0.1em' }}>Size: {item.size}</span>
                    </p>
                    <p style={{ fontSize: '0.78rem', color: '#ccc' }}>R {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div style={{
                borderTop: '1px solid rgba(201,168,76,0.15)',
                paddingTop: '1.5rem',
                marginTop: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
              }}>
                <p style={{ fontSize: '0.65rem', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Subtotal</p>
                <p style={{ fontSize: '1.5rem', color: '#C9A84C', fontFamily: 'Cormorant Garamond, serif' }}>
                  R {subtotal.toFixed(2)}
                </p>
              </div>

              <p style={{ fontSize: '0.7rem', color: '#555', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                Shipping and taxes calculated at checkout.
              </p>

              <Link href="/checkout" className="btn-gold" style={{ display: 'block', textAlign: 'center' }}>
                Proceed to Checkout
              </Link>

              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <Link href="/returns" style={{ fontSize: '0.65rem', color: '#555', textDecoration: 'none', letterSpacing: '0.1em' }}
                  onMouseEnter={e => e.target.style.color = '#C9A84C'}
                  onMouseLeave={e => e.target.style.color = '#555'}
                >
                  30-Day Returns Policy →
                </Link>
              </div>
            </div>

          </div>
        )}
      </section>
    </div>
  );
}