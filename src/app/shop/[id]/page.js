'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ProductPage({ params }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productName = decodeURIComponent(params.id);
        const q = query(
          collection(db, 'products'),
          where('name', '==', productName)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          setProduct({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [params.id]);

  const availableSizes = product?.sizes
    ? Object.entries(product.sizes).filter(([, qty]) => qty > 0).map(([size]) => size)
    : [];

  const addToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingIndex = cart.findIndex(
      item => item.id === product.id && item.size === selectedSize
    );
    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        size: selectedSize,
        quantity,
        sku: product.sku,
      });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    toast.success(`${product.name} added to cart`);
  };

  if (loading) return (
    <div style={{ paddingTop: '70px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '1px', background: '#C9A84C', margin: '0 auto 1.5rem' }} />
        <p style={{ fontSize: '0.75rem', color: '#888', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading...</p>
      </div>
    </div>
  );

  if (!product) return (
    <div style={{ paddingTop: '70px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#F5F0E8', marginBottom: '1rem' }}>Product not found</h2>
        <Link href="/shop" className="btn-outline-gold">Back to Shop</Link>
      </div>
    </div>
  );

  return (
    <div style={{ paddingTop: '70px' }}>
      <section style={{ padding: '4rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: '3rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link href="/shop" style={{ fontSize: '0.7rem', color: '#888', textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase' }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = '#888'}
          >Shop</Link>
          <span style={{ color: '#444', fontSize: '0.7rem' }}>→</span>
          <span style={{ fontSize: '0.7rem', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{product.name}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'start' }}>

          {/* IMAGE */}
          <div style={{
            background: '#0F0F0F',
            border: '1px solid rgba(201,168,76,0.15)',
            overflow: 'hidden',
            aspectRatio: '3/4',
          }}>
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: '0.7rem', color: '#444', letterSpacing: '0.2em' }}>NO IMAGE</p>
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div style={{ paddingTop: '1rem' }}>
            {product.sku && (
              <p style={{ fontSize: '0.6rem', color: '#555', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                SKU: {product.sku}
              </p>
            )}

            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#F5F0E8', marginBottom: '0.5rem', lineHeight: 1.2 }}>
              {product.name}
            </h1>

            <div style={{ width: '40px', height: '1px', background: '#C9A84C', margin: '1.5rem 0' }} />

            <p style={{ fontSize: '1.8rem', color: '#C9A84C', fontFamily: 'Cormorant Garamond, serif', marginBottom: '2rem' }}>
              R {Number(product.price).toFixed(2)}
            </p>

            {product.description && (
              <p style={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.9, marginBottom: '2rem', letterSpacing: '0.03em' }}>
                {product.description}
              </p>
            )}

            {/* SIZE SELECTOR */}
            {availableSizes.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '1rem' }}>
                  Select Size {selectedSize && <span style={{ color: '#888' }}>— {selectedSize}</span>}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {availableSizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      style={{
                        minWidth: '48px',
                        height: '48px',
                        padding: '0 0.75rem',
                        fontSize: '0.75rem',
                        letterSpacing: '0.1em',
                        fontFamily: 'Montserrat, sans-serif',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: selectedSize === size ? '#C9A84C' : 'transparent',
                        color: selectedSize === size ? '#0A0A0A' : '#888',
                        border: '1px solid',
                        borderColor: selectedSize === size ? '#C9A84C' : 'rgba(201,168,76,0.2)',
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* QUANTITY */}
            <div style={{ marginBottom: '2rem' }}>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '1rem' }}>
                Quantity
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  style={{
                    width: '42px', height: '42px', background: 'transparent',
                    border: '1px solid rgba(201,168,76,0.2)', color: '#888',
                    fontSize: '1.2rem', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                  }}
                >−</button>
                <div style={{
                  width: '60px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(201,168,76,0.2)', borderLeft: 'none', borderRight: 'none',
                  fontSize: '0.85rem', color: '#F5F0E8',
                }}>
                  {quantity}
                </div>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  style={{
                    width: '42px', height: '42px', background: 'transparent',
                    border: '1px solid rgba(201,168,76,0.2)', color: '#888',
                    fontSize: '1.2rem', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                  }}
                >+</button>
              </div>
            </div>

            {/* ADD TO CART */}
            <button
              onClick={addToCart}
              className="btn-gold"
              style={{ width: '100%', cursor: 'pointer', border: 'none', fontSize: '0.75rem' }}
            >
              Add to Cart
            </button>

            {/* Stock info */}
            <p style={{ fontSize: '0.7rem', color: '#555', marginTop: '1rem', letterSpacing: '0.1em' }}>
              {product.stock > 0 ? `${product.stock} items in stock` : 'Out of stock'}
            </p>

            <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', marginTop: '2rem', paddingTop: '2rem' }}>
              <Link href="/returns" style={{ fontSize: '0.7rem', color: '#666', textDecoration: 'none', letterSpacing: '0.1em' }}
                onMouseEnter={e => e.target.style.color = '#C9A84C'}
                onMouseLeave={e => e.target.style.color = '#666'}
              >
                30-Day Returns Policy →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}