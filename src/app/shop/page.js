'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'products'));
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(items);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div style={{ paddingTop: '70px' }}>

      {/* HERO */}
      <section style={{
        padding: '5rem 2rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A0A 50%, #0A0A0A 100%)',
      }}>
        <p className="section-label">Browse</p>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#F5F0E8', marginTop: '0.5rem' }}>Our Collection</h1>
        <div className="divider-gold" />
        <p style={{ fontSize: '0.85rem', color: '#999', maxWidth: '500px', margin: '0 auto', lineHeight: 1.9 }}>
          Discover our range of premium clothing, designed with quality and style in mind.
        </p>
      </section>

      {/* PRODUCTS GRID */}
      <section style={{ padding: '4rem 2rem 6rem', maxWidth: '1200px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '6rem 0' }}>
            <div style={{ width: '40px', height: '1px', background: '#C9A84C', margin: '0 auto 1.5rem' }} />
            <p style={{ fontSize: '0.75rem', color: '#888', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Loading Collection...
            </p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0' }}>
            <div style={{ width: '40px', height: '1px', background: '#C9A84C', margin: '0 auto 1.5rem' }} />
            <p style={{ fontSize: '0.75rem', color: '#888', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              No products found
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.7rem', color: '#555', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2rem', textAlign: 'right' }}>
              {products.length} Items
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '2rem',
            }}>
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);

  const availableSizes = product.sizes
    ? Object.entries(product.sizes)
        .filter(([, qty]) => qty > 0)
        .map(([size]) => size)
    : [];

  return (
    <Link href={`/shop/${encodeURIComponent(product.id)}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          border: '1px solid',
          borderColor: hovered ? '#C9A84C' : 'rgba(201,168,76,0.15)',
          background: '#0F0F0F',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
        }}
      >
        {/* Image */}
        <div style={{
          width: '100%',
          height: '320px',
          background: '#1A1A1A',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.5s ease',
                transform: hovered ? 'scale(1.05)' : 'scale(1)',
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              <div style={{ fontSize: '2rem' }}>👕</div>
              <p style={{ fontSize: '0.65rem', color: '#444', letterSpacing: '0.2em', textTransform: 'uppercase' }}>No Image</p>
            </div>
          )}

          {/* Out of stock overlay */}
          {product.stock === 0 && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10,10,10,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <p style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Out of Stock</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: '#F5F0E8', marginBottom: '0.5rem', letterSpacing: '0.03em' }}>
            {product.name}
          </h3>

          {/* Sizes */}
          {availableSizes.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {availableSizes.map(size => (
                <span key={size} style={{
                  fontSize: '0.55rem',
                  color: '#888',
                  border: '1px solid rgba(201,168,76,0.2)',
                  padding: '0.2rem 0.45rem',
                  letterSpacing: '0.1em',
                }}>
                  {size}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '1.2rem', color: '#C9A84C', fontFamily: 'Cormorant Garamond, serif' }}>
              R {Number(product.price).toFixed(2)}
            </p>
            <p style={{ fontSize: '0.6rem', color: hovered ? '#C9A84C' : '#555', letterSpacing: '0.15em', textTransform: 'uppercase', transition: 'color 0.3s' }}>
              View →
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}