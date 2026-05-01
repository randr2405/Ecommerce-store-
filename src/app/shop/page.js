'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

/* ═══════════════════════════════════════════════
   CUSTOM CURSOR
═══════════════════════════════════════════════ */
function useCursor() {
  const [pos, setPos]         = useState({ x: 0, y: 0 });
  const [trail, setTrail]     = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const trailRef = useRef({ x: 0, y: 0 });
  const posRef   = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let raf;
    const loop = () => {
      trailRef.current.x += (posRef.current.x - trailRef.current.x) * 0.35;
      trailRef.current.y += (posRef.current.y - trailRef.current.y) * 0.35;
      setTrail({ x: trailRef.current.x, y: trailRef.current.y });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };
    const addHovers = () => {
      document.querySelectorAll('a, button, [data-hover]').forEach(el => {
        el.addEventListener('mouseenter', () => setHovered(true));
        el.addEventListener('mouseleave', () => setHovered(false));
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', () => setVisible(false));
    addHovers();
    const obs = new MutationObserver(addHovers);
    obs.observe(document.body, { subtree: true, childList: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      obs.disconnect();
    };
  }, []);

  return { pos, trail, visible, hovered };
}

/* ═══════════════════════════════════════════════
   FILTER PILL
═══════════════════════════════════════════════ */
function FilterPill({ label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '0.6rem 1.6rem',
        border: '1px solid',
        borderColor: active ? '#C9A84C' : hov ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)',
        background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
        color: active ? '#C9A84C' : hov ? 'rgba(201,168,76,0.8)' : '#555',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '0.52rem',
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
        cursor: 'none',
        transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {active && (
        <span style={{
          position: 'absolute', left: '0.6rem', top: '50%',
          transform: 'translateY(-50%)',
          width: '4px', height: '4px', borderRadius: '50%',
          background: '#C9A84C',
        }} />
      )}
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════
   PRODUCT CARD — magnetic 3D tilt + luxury reveal
═══════════════════════════════════════════════ */
function ProductCard({ product, index }) {
  const [hovered, setHovered]   = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [visible, setVisible]   = useState(false);
  const cardRef  = useRef(null);
  const obsRef   = useRef(null);

  /* Intersection observer — cards animate in as they enter viewport */
  useEffect(() => {
    obsRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (cardRef.current) obsRef.current.observe(cardRef.current);
    return () => obsRef.current?.disconnect();
  }, []);

  const handleMouseMove = useCallback((e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: (e.clientX - rect.left) / rect.width  - 0.5,
      y: (e.clientY - rect.top)  / rect.height - 0.5,
    });
  }, []);

  const availableSizes = product.sizes
    ? Object.entries(product.sizes).filter(([, qty]) => qty > 0).map(([s]) => s)
    : [];

  const isOutOfStock = product.stock === 0;

  /* Entry stagger */
  const stagger = (index % 4) * 0.08;

  const tiltX = hovered ? mousePos.y * -18 : 0;
  const tiltY = hovered ? mousePos.x *  22 : 0;

  return (
    <Link href={`/shop/${encodeURIComponent(product.name)}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        ref={cardRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setMousePos({ x: 0, y: 0 }); }}
        onMouseMove={handleMouseMove}
        style={{ perspective: '1000px' }}
      >
        <div style={{
          position: 'relative',
          border: '1px solid',
          borderColor: hovered ? 'rgba(201,168,76,0.75)' : 'rgba(201,168,76,0.1)',
          background: hovered
            ? 'linear-gradient(160deg, rgba(201,168,76,0.07) 0%, rgba(6,5,3,0.98) 60%)'
            : 'rgba(7,6,4,0.95)',
          backdropFilter: 'blur(12px)',
          overflow: 'hidden',
          transformStyle: 'preserve-3d',
          transform: `
            ${visible
              ? `rotateX(${tiltX}deg) rotateY(${tiltY}deg) ${hovered ? 'translateZ(12px)' : ''}`
              : 'translateY(60px) rotateX(8deg)'
            }
          `,
          opacity: visible ? 1 : 0,
          transition: visible
            ? hovered
              ? `border-color 0.25s, background 0.25s, box-shadow 0.25s, transform 0.07s ease`
              : `border-color 0.45s, background 0.45s, box-shadow 0.45s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${stagger}s, opacity 0.6s ease ${stagger}s`
            : `opacity 0.6s ease ${stagger}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${stagger}s`,
          boxShadow: hovered
            ? `0 40px 80px rgba(0,0,0,0.8), 0 0 50px rgba(201,168,76,0.12), inset 0 1px 0 rgba(201,168,76,0.15)`
            : `0 8px 30px rgba(0,0,0,0.6)`,
          willChange: 'transform, opacity',
          cursor: 'none',
        }}>

          {/* Corner brackets */}
          {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h], ci) => (
            <div key={ci} style={{
              position: 'absolute', [v]: 0, [h]: 0, zIndex: 3,
              width: hovered ? '28px' : '10px',
              height: hovered ? '28px' : '10px',
              borderTop:    v === 'top'    ? '1px solid #C9A84C' : 'none',
              borderBottom: v === 'bottom' ? '1px solid #C9A84C' : 'none',
              borderLeft:   h === 'left'   ? '1px solid #C9A84C' : 'none',
              borderRight:  h === 'right'  ? '1px solid #C9A84C' : 'none',
              transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
              opacity: hovered ? 1 : 0.4,
            }} />
          ))}

          {/* Sweep line bottom */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, zIndex: 3,
            height: '1px',
            width: hovered ? '100%' : '0%',
            background: 'linear-gradient(90deg, transparent, #C9A84C 30%, #C9A84C 70%, transparent)',
            transition: 'width 0.65s cubic-bezier(0.16,1,0.3,1)',
          }} />

          {/* ── IMAGE ── */}
          <div style={{
            width: '100%', height: '340px',
            background: 'rgba(12,10,6,1)',
            overflow: 'hidden', position: 'relative',
          }}>
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  transform: hovered ? 'scale(1.08)' : 'scale(1)',
                  filter: hovered
                    ? 'brightness(1.05) contrast(1.05)'
                    : isOutOfStock ? 'brightness(0.4) grayscale(0.5)' : 'brightness(0.85)',
                  transition: 'transform 0.7s cubic-bezier(0.16,1,0.3,1), filter 0.5s ease',
                }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '1rem',
              }}>
                <span style={{
                  fontSize: '3rem',
                  filter: 'grayscale(1)',
                  opacity: 0.3,
                  transform: hovered ? 'scale(1.15) rotate(-8deg)' : 'scale(1)',
                  transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
                }}>👕</span>
                <p style={{ fontSize: '0.5rem', color: '#333', letterSpacing: '0.3em', textTransform: 'uppercase' }}>No Image</p>
              </div>
            )}

            {/* Image vignette */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, transparent 40%, rgba(7,6,4,0.85) 100%)',
              pointerEvents: 'none',
              opacity: hovered ? 0.7 : 1,
              transition: 'opacity 0.5s',
            }} />

            {/* Out of stock */}
            {isOutOfStock && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(4,3,2,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2,
              }}>
                <div style={{
                  border: '1px solid rgba(201,168,76,0.3)',
                  padding: '0.5rem 1.4rem',
                }}>
                  <p style={{ fontSize: '0.52rem', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.4em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>
                    Sold Out
                  </p>
                </div>
              </div>
            )}

            {/* Category tag */}
            {product.category && (
              <div style={{
                position: 'absolute', top: '1rem', left: '1rem', zIndex: 2,
                background: 'rgba(4,3,2,0.8)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(201,168,76,0.2)',
                padding: '0.3rem 0.8rem',
              }}>
                <p style={{ fontSize: '0.45rem', color: '#C9A84C', letterSpacing: '0.35em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>
                  {product.category}
                </p>
              </div>
            )}

            {/* New badge */}
            {product.isNew && (
              <div style={{
                position: 'absolute', top: '1rem', right: '1rem', zIndex: 2,
                background: '#C9A84C',
                padding: '0.3rem 0.8rem',
              }}>
                <p style={{ fontSize: '0.45rem', color: '#080604', letterSpacing: '0.35em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}>
                  New
                </p>
              </div>
            )}
          </div>

          {/* ── CARD INFO ── */}
          <div style={{ padding: '1.8rem 1.8rem 2rem' }}>

            {/* Product name */}
            <h3 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '1.45rem', fontWeight: 300,
              color: hovered ? '#FFFFFF' : '#E8E0D0',
              marginBottom: '0.6rem',
              letterSpacing: '0.02em',
              textShadow: hovered ? '0 0 30px rgba(255,255,255,0.15)' : 'none',
              transition: 'color 0.3s, text-shadow 0.3s',
              lineHeight: 1.3,
            }}>{product.name}</h3>

            {/* Description snippet */}
            {product.description && (
              <p style={{
                fontSize: '0.6rem', color: '#4A4030',
                lineHeight: 1.9, letterSpacing: '0.06em',
                marginBottom: '1.2rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                transition: 'color 0.3s',
                ...(hovered && { color: '#666' }),
              }}>{product.description}</p>
            )}

            {/* Sizes */}
            {availableSizes.length > 0 && (
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {availableSizes.map(size => (
                  <span key={size} style={{
                    fontSize: '0.48rem',
                    color: hovered ? 'rgba(201,168,76,0.7)' : '#444',
                    border: '1px solid',
                    borderColor: hovered ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)',
                    padding: '0.2rem 0.5rem',
                    letterSpacing: '0.12em',
                    fontFamily: 'Montserrat, sans-serif',
                    transition: 'all 0.35s',
                  }}>{size}</span>
                ))}
              </div>
            )}

            {/* Price row */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
              borderTop: '1px solid rgba(201,168,76,0.08)',
              paddingTop: '1.2rem',
            }}>
              <div>
                <p style={{ fontSize: '0.44rem', color: '#3A3020', letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', marginBottom: '0.25rem' }}>
                  Price
                </p>
                <p style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: '1.7rem', fontWeight: 300,
                  color: hovered ? '#C9A84C' : 'rgba(201,168,76,0.8)',
                  textShadow: hovered ? '0 0 30px rgba(201,168,76,0.35)' : 'none',
                  transition: 'color 0.3s, text-shadow 0.3s',
                  lineHeight: 1,
                }}>
                  R {Number(product.price).toFixed(2)}
                </p>
              </div>

              {/* View arrow */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                opacity: hovered ? 1 : 0,
                transform: hovered ? 'translateX(0)' : 'translateX(-12px)',
                transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
              }}>
                <div style={{ width: '20px', height: '1px', background: '#C9A84C' }} />
                <span style={{
                  fontSize: '0.48rem', color: '#C9A84C',
                  letterSpacing: '0.35em', textTransform: 'uppercase',
                  fontFamily: 'Montserrat, sans-serif',
                }}>View</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════
   LOADING STATE
═══════════════════════════════════════════════ */
function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '8rem 0', position: 'relative' }}>
      {/* Pulsing rings */}
      {[1,2,3].map(i => (
        <div key={i} style={{
          position: 'absolute', top: '50%', left: '50%',
          width: `${i * 70}px`, height: `${i * 70}px`,
          borderRadius: '50%',
          border: '1px solid rgba(201,168,76,0.15)',
          transform: 'translate(-50%,-50%)',
          animation: `rrPulse ${1.5 + i * 0.4}s ease-in-out infinite alternate`,
          animationDelay: `${i * 0.3}s`,
        }} />
      ))}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '1px', height: '50px',
          background: 'linear-gradient(180deg, #C9A84C, transparent)',
          margin: '0 auto 2rem',
          animation: 'rrScrollPulse 1.8s ease-in-out infinite',
        }} />
        <p style={{
          fontSize: '0.52rem', color: '#C9A84C',
          letterSpacing: '0.5em', textTransform: 'uppercase',
          fontFamily: 'Montserrat, sans-serif',
        }}>Loading Collection</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════════ */
function EmptyState({ filtered }) {
  return (
    <div style={{ textAlign: 'center', padding: '8rem 0' }}>
      <p style={{
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: '2.5rem', fontWeight: 300,
        color: 'rgba(201,168,76,0.2)',
        marginBottom: '1.5rem',
      }}>
        {filtered ? 'No results' : 'Coming Soon'}
      </p>
      <div style={{ width: '50px', height: '1px', background: 'rgba(201,168,76,0.3)', margin: '0 auto 1.5rem' }} />
      <p style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>
        {filtered ? 'Try a different filter' : 'New pieces arriving soon'}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN SHOP PAGE
═══════════════════════════════════════════════ */
export default function ShopPage() {
  const [products,       setProducts]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy,         setSortBy]         = useState('default');
  const [heroVisible,    setHeroVisible]    = useState(false);
  const cursor = useCursor();

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

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

  /* Derive categories from product data */
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  /* Filter + sort */
  const filtered = products
    .filter(p => p.stock !== 0)
    .filter(p => activeCategory === 'All' || p.category === activeCategory)
    .sort((a, b) => {
      if (sortBy === 'price-asc')  return Number(a.price) - Number(b.price);
      if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
      if (sortBy === 'name')       return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div style={{ paddingTop: '70px', background: '#040302', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Custom cursor ── */}
      <div style={{
        position: 'fixed', left: cursor.pos.x, top: cursor.pos.y,
        width: cursor.hovered ? '5px' : '8px', height: cursor.hovered ? '5px' : '8px',
        background: '#C9A84C', borderRadius: '50%',
        pointerEvents: 'none', zIndex: 9999,
        transform: 'translate(-50%,-50%)',
        opacity: cursor.visible ? 1 : 0,
        transition: 'opacity 0.3s, width 0.2s, height 0.2s',
        mixBlendMode: 'difference',
      }} />
      <div style={{
        position: 'fixed', left: cursor.trail.x, top: cursor.trail.y,
        width: cursor.hovered ? '50px' : '36px', height: cursor.hovered ? '50px' : '36px',
        border: '1px solid rgba(201,168,76,0.55)',
        borderRadius: '50%',
        pointerEvents: 'none', zIndex: 9998,
        transform: 'translate(-50%,-50%)',
        opacity: cursor.visible ? 0.75 : 0,
        transition: 'opacity 0.3s, width 0.4s cubic-bezier(0.16,1,0.3,1), height 0.4s cubic-bezier(0.16,1,0.3,1)',
      }} />

      {/* ══════════════════════════════════
          HERO
      ══════════════════════════════════ */}
      <section style={{
        padding: '7rem 2rem 6rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(201,168,76,0.1)',
      }}>
        {/* Perspective grid floor */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          transform: 'perspective(700px) rotateX(60deg) translateZ(-60px) scale(2)',
          transformOrigin: '50% 100%',
          opacity: 0.5,
          pointerEvents: 'none',
        }} />

        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: '700px', height: '700px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Eyebrow */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
            marginBottom: '2.5rem',
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity 0.9s ease 0.15s, transform 0.9s ease 0.15s',
          }}>
            <div style={{ width: '35px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C)' }} />
            <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.55em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}>
              Browse
            </p>
            <div style={{ width: '35px', height: '1px', background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
          </div>

          {/* Heading */}
          <div style={{ overflow: 'hidden', marginBottom: '0.3rem' }}>
            <h1 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(3.5rem, 10vw, 8.5rem)',
              fontWeight: 300, color: '#FFFFFF',
              letterSpacing: '-0.01em', lineHeight: 1,
              textShadow: '0 0 80px rgba(255,255,255,0.1), 0 4px 40px rgba(0,0,0,0.9)',
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'none' : 'translateY(80%)',
              transition: 'opacity 1.1s cubic-bezier(0.16,1,0.3,1) 0.3s, transform 1.1s cubic-bezier(0.16,1,0.3,1) 0.3s',
            }}>
              Our{' '}
              <em style={{
                color: '#C9A84C', fontStyle: 'normal',
                textShadow: '0 0 60px rgba(201,168,76,0.5)',
              }}>Collection</em>
            </h1>
          </div>

          {/* Divider */}
          <div style={{
            width: heroVisible ? '100px' : '0px', height: '1px',
            background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
            margin: '2.5rem auto',
            transition: 'width 1.4s cubic-bezier(0.16,1,0.3,1) 0.7s',
          }} />

          {/* Subheading */}
          <p style={{
            fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)',
            maxWidth: '480px', margin: '0 auto',
            lineHeight: 2, letterSpacing: '0.12em',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 200,
            opacity: heroVisible ? 1 : 0,
            transition: 'opacity 1s ease 0.9s',
          }}>
            Discover our range of premium clothing, designed with quality and style in mind.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════
          FILTER + SORT BAR
      ══════════════════════════════════ */}
      <div style={{
        borderBottom: '1px solid rgba(201,168,76,0.08)',
        background: 'rgba(5,4,3,0.98)',
        backdropFilter: 'blur(16px)',
        position: 'sticky', top: '70px', zIndex: 10,
      }}>
        <div style={{
          maxWidth: '1380px', margin: '0 auto',
          padding: '1.2rem 4rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1rem',
        }}>
          {/* Category filters */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <FilterPill
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>

          {/* Right side: count + sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {!loading && (
              <p style={{
                fontSize: '0.5rem', color: '#3A3020',
                letterSpacing: '0.3em', textTransform: 'uppercase',
                fontFamily: 'Montserrat, sans-serif',
              }}>
                <span style={{ color: '#C9A84C' }}>{filtered.length}</span> items
              </p>
            )}

            {/* Sort select */}
            <div style={{ position: 'relative' }}>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  appearance: 'none',
                  background: 'transparent',
                  border: '1px solid rgba(201,168,76,0.15)',
                  color: '#666',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '0.5rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  padding: '0.5rem 2rem 0.5rem 0.9rem',
                  cursor: 'none',
                  outline: 'none',
                }}
              >
                <option value="default">Sort: Default</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="name">Name: A → Z</option>
              </select>
              <div style={{
                position: 'absolute', right: '0.7rem', top: '50%',
                transform: 'translateY(-50%)',
                width: '0', height: '0',
                borderLeft: '3px solid transparent',
                borderRight: '3px solid transparent',
                borderTop: '4px solid rgba(201,168,76,0.4)',
                pointerEvents: 'none',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          PRODUCT GRID
      ══════════════════════════════════ */}
      <section style={{
        padding: '5rem 4rem 8rem',
        maxWidth: '1380px', margin: '0 auto',
      }}>
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState filtered={activeCategory !== 'All'} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '2px',
            background: 'rgba(201,168,76,0.04)',
          }}>
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ══ GLOBAL STYLES ══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap');

        * { cursor: none !important; }

        select option {
          background: #080604;
          color: #888;
        }

        @keyframes rrPulse {
          from { opacity: 0.1; transform: translate(-50%,-50%) scale(0.95); }
          to   { opacity: 0.5; transform: translate(-50%,-50%) scale(1.05); }
        }
        @keyframes rrScrollPulse {
          0%,100% { opacity: 0.8; transform: scaleY(1); }
          50%     { opacity: 0.1; transform: scaleY(0.2); }
        }
      `}</style>
    </div>
  );
}