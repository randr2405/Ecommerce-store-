'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import LiquidEther from './LiquidEther';

function useCursor() {
  const [pos, setPos]         = useState({ x: 0, y: 0 });
  const [trail, setTrail]     = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const trailRef = useRef({ x: 0, y: 0 });
  const posRef   = useRef({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);
  }, []);

  useEffect(() => {
    if (isMobile) return;
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
  }, [isMobile]);

  return { pos, trail, visible, hovered, isMobile };
}

function FilterPill({ label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '0.6rem 1.4rem',
        border: '1px solid',
        borderColor: active ? '#C9A84C' : hov ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)',
        background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
        color: active ? '#C9A84C' : hov ? 'rgba(201,168,76,0.8)' : '#555',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '0.52rem',
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
        position: 'relative',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
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

function BorderGlowCard({ children }) {
  const cardRef = useRef(null);

  const handlePointerMove = useCallback((e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    let kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
    let ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
    const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    card.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`);
    card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!e.touches.length) return;
    const touch = e.touches[0];
    handlePointerMove({ clientX: touch.clientX, clientY: touch.clientY });
  }, [handlePointerMove]);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onTouchMove={handleTouchMove}
      style={{
        position: 'relative',
        borderRadius: '0px',
        '--glow-color': 'hsl(40deg 70% 65% / 100%)',
        '--glow-color-60': 'hsl(40deg 70% 65% / 60%)',
        '--glow-color-50': 'hsl(40deg 70% 65% / 50%)',
        '--glow-color-40': 'hsl(40deg 70% 65% / 40%)',
        '--glow-color-30': 'hsl(40deg 70% 65% / 30%)',
        '--glow-color-20': 'hsl(40deg 70% 65% / 20%)',
        '--glow-color-10': 'hsl(40deg 70% 65% / 10%)',
        '--edge-proximity': '0',
        '--cursor-angle': '0deg',
        '--cone-spread': '25',
        '--glow-padding': '40px',
        '--border-radius': '0px',
      }}
    >
      <style>{`
        .bglow-wrap {
          position: relative;
          isolation: isolate;
        }
        .bglow-wrap::before {
          content: '';
          position: absolute;
          inset: calc(-1 * var(--glow-padding));
          border-radius: calc(var(--border-radius) + var(--glow-padding));
          background: conic-gradient(
            from calc(var(--cursor-angle) - calc(var(--cone-spread) * 1deg)),
            transparent 0deg,
            var(--glow-color) calc(var(--cone-spread) * 1deg),
            var(--glow-color-60) calc(var(--cone-spread) * 2deg),
            var(--glow-color-50) calc(var(--cone-spread) * 3deg),
            var(--glow-color-40) calc(var(--cone-spread) * 4deg),
            var(--glow-color-30) calc(var(--cone-spread) * 5deg),
            var(--glow-color-20) calc(var(--cone-spread) * 6deg),
            var(--glow-color-10) calc(var(--cone-spread) * 7deg),
            transparent calc(var(--cone-spread) * 8deg) 360deg
          );
          opacity: calc(var(--edge-proximity) / 100);
          -webkit-mask:
            linear-gradient(black, black) content-box,
            linear-gradient(black, black);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          padding: 1px;
          pointer-events: none;
          z-index: 2;
          transition: opacity 0.3s ease;
        }
        .bglow-wrap::after {
          content: '';
          position: absolute;
          inset: calc(-1 * var(--glow-padding));
          border-radius: calc(var(--border-radius) + var(--glow-padding));
          background: conic-gradient(
            from calc(var(--cursor-angle) - calc(var(--cone-spread) * 1deg)),
            transparent 0deg,
            var(--glow-color-10) calc(var(--cone-spread) * 1deg),
            transparent calc(var(--cone-spread) * 3deg) 360deg
          );
          opacity: calc(var(--edge-proximity) / 100);
          pointer-events: none;
          z-index: 1;
          filter: blur(8px);
          transition: opacity 0.3s ease;
        }
      `}</style>
      <div className="bglow-wrap" style={{ position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}

function ProductCard({ product, index }) {
  const [hovered, setHovered]   = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [visible, setVisible]   = useState(false);
  const cardRef    = useRef(null);
  const obsRef     = useRef(null);
  const resetTimer = useRef(null);

  useEffect(() => {
    obsRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (cardRef.current) obsRef.current.observe(cardRef.current);
    return () => obsRef.current?.disconnect();
  }, []);

  useEffect(() => {
    return () => { if (resetTimer.current) clearTimeout(resetTimer.current); };
  }, []);

  const handleMouseMove = useCallback((e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: (e.clientX - rect.left) / rect.width  - 0.5,
      y: (e.clientY - rect.top)  / rect.height - 0.5,
    });
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setHovered(true);
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMousePos({
        x: (touch.clientX - rect.left) / rect.width  - 0.5,
        y: (touch.clientY - rect.top)  / rect.height - 0.5,
      });
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMousePos({
        x: (touch.clientX - rect.left) / rect.width  - 0.5,
        y: (touch.clientY - rect.top)  / rect.height - 0.5,
      });
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    resetTimer.current = setTimeout(() => {
      setHovered(false);
      setMousePos({ x: 0, y: 0 });
    }, 320);
  }, []);

  const availableSizes = product.sizes
    ? Object.entries(product.sizes).filter(([, qty]) => qty > 0).map(([s]) => s)
    : [];

  const isOutOfStock = product.stock === 0;
  const stagger = (index % 4) * 0.08;
  const tiltX = hovered ? mousePos.y * -12 : 0;
  const tiltY = hovered ? mousePos.x *  15 : 0;

  return (
    <Link href={`/shop/${encodeURIComponent(product.name)}`} style={{ textDecoration: 'none', display: 'block' }}>
      <BorderGlowCard>
        <div
          ref={cardRef}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => { setHovered(false); setMousePos({ x: 0, y: 0 }); }}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ perspective: '1000px' }}
        >
          <div style={{
            position: 'relative',
            border: '1px solid',
            borderColor: hovered ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.1)',
            background: hovered
              ? 'linear-gradient(160deg, rgba(201,168,76,0.07) 0%, rgba(6,5,3,0.98) 60%)'
              : 'rgba(7,6,4,0.95)',
            overflow: 'hidden',
            transformStyle: 'preserve-3d',
            transform: `
              ${visible
                ? `rotateX(${tiltX}deg) rotateY(${tiltY}deg) ${hovered ? 'translateZ(8px)' : ''}`
                : 'translateY(60px) rotateX(8deg)'
              }
            `,
            opacity: visible ? 1 : 0,
            transition: visible
              ? hovered
                ? 'border-color 0.25s, background 0.25s, box-shadow 0.25s, transform 0.12s ease'
                : `border-color 0.45s, background 0.45s, box-shadow 0.45s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${stagger}s, opacity 0.6s ease ${stagger}s`
              : `opacity 0.6s ease ${stagger}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${stagger}s`,
            boxShadow: hovered
              ? '0 40px 80px rgba(0,0,0,0.8), 0 0 50px rgba(201,168,76,0.1), inset 0 1px 0 rgba(201,168,76,0.12)'
              : '0 8px 30px rgba(0,0,0,0.6)',
            willChange: 'transform, opacity',
            cursor: 'pointer',
          }}>

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

            <div style={{
              position: 'absolute', bottom: 0, left: 0, zIndex: 3,
              height: '1px',
              width: hovered ? '100%' : '0%',
              background: 'linear-gradient(90deg, transparent, #C9A84C 30%, #C9A84C 70%, transparent)',
              transition: 'width 0.65s cubic-bezier(0.16,1,0.3,1)',
            }} />

            <div style={{
              width: '100%', height: '320px',
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
                  <span style={{ fontSize: '3rem', filter: 'grayscale(1)', opacity: 0.3 }}>👕</span>
                  <p style={{ fontSize: '0.5rem', color: '#333', letterSpacing: '0.3em', textTransform: 'uppercase' }}>No Image</p>
                </div>
              )}

              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, transparent 40%, rgba(7,6,4,0.85) 100%)',
                pointerEvents: 'none',
                opacity: hovered ? 0.7 : 1,
                transition: 'opacity 0.5s',
              }} />

              {isOutOfStock && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(4,3,2,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 2,
                }}>
                  <div style={{ border: '1px solid rgba(201,168,76,0.3)', padding: '0.5rem 1.4rem' }}>
                    <p style={{ fontSize: '0.52rem', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.4em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>
                      Sold Out
                    </p>
                  </div>
                </div>
              )}

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

            <div style={{ padding: '1.6rem 1.6rem 2rem' }}>
              <h3 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '1.4rem', fontWeight: 300,
                color: hovered ? '#FFFFFF' : '#E8E0D0',
                marginBottom: '0.6rem',
                letterSpacing: '0.02em',
                textShadow: hovered ? '0 0 30px rgba(255,255,255,0.15)' : 'none',
                transition: 'color 0.3s, text-shadow 0.3s',
                lineHeight: 1.3,
              }}>{product.name}</h3>

              {product.description && (
                <p style={{
                  fontSize: '0.6rem', color: hovered ? '#666' : '#4A4030',
                  lineHeight: 1.9, letterSpacing: '0.06em',
                  marginBottom: '1.2rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  transition: 'color 0.3s',
                }}>{product.description}</p>
              )}

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
      </BorderGlowCard>
    </Link>
  );
}

function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '8rem 0', position: 'relative' }}>
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

export default function ShopPage() {
  const [products,       setProducts]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy,         setSortBy]         = useState('default');
  const [heroVisible,    setHeroVisible]    = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);
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

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

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

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap');

        @keyframes rrPulse {
          from { opacity: 0.1; transform: translate(-50%,-50%) scale(0.95); }
          to   { opacity: 0.5; transform: translate(-50%,-50%) scale(1.05); }
        }
        @keyframes rrScrollPulse {
          0%,100% { opacity: 0.8; transform: scaleY(1); }
          50%     { opacity: 0.1; transform: scaleY(0.2); }
        }
        @keyframes menuSlideIn {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          z-index: 200;
        }
        .hamburger span {
          display: block;
          width: 24px;
          height: 2px;
          background: #C9A84C;
          transition: all 0.3s ease;
          transform-origin: center;
        }
        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        .mobile-nav {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(4,3,2,0.97);
          z-index: 150;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2.5rem;
        }
        .mobile-nav.open {
          display: flex;
          animation: menuSlideIn 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .mobile-nav a {
          font-size: 1.5rem;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #F5F0E8;
          text-decoration: none;
          font-family: Montserrat, sans-serif;
          font-weight: 200;
          transition: color 0.2s;
        }
        .mobile-nav a:hover { color: #C9A84C; }
        .mobile-nav a.active-nav { color: #C9A84C; }

        /* LiquidEther fills its positioned parent naturally */
        .liquid-ether-container {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }

        .filter-bar-inner {
          max-width: 1380px;
          margin: 0 auto;
          padding: 1.2rem 4rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2px;
          background: rgba(201,168,76,0.04);
        }

        .shop-section {
          padding: 5rem 4rem 8rem;
          max-width: 1380px;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .hamburger { display: flex !important; }
          .desktop-nav { display: none !important; }

          .filter-bar-inner {
            padding: 1rem 1.5rem;
            flex-direction: column;
            align-items: flex-start;
          }

          .filter-pills {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-bottom: 4px;
            width: 100%;
          }
          .filter-pills::-webkit-scrollbar { display: none; }
          .filter-pills-inner {
            display: flex;
            gap: 0.5rem;
            width: max-content;
          }

          .sort-count-row {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .product-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1px;
          }

          .shop-section {
            padding: 3rem 1rem 5rem;
          }

          .hero-section {
            padding: 5rem 1.5rem 4rem !important;
          }

          .hero-h1 {
            font-size: clamp(2.5rem, 12vw, 5rem) !important;
          }
        }

        @media (max-width: 480px) {
          .product-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (min-width: 769px) {
          * { cursor: none !important; }
          select { cursor: none !important; }
        }

        select option {
          background: #080604;
          color: #888;
        }
      `}</style>

      <div className={`mobile-nav ${menuOpen ? 'open' : ''}`}>
        <a href="/" onClick={() => setMenuOpen(false)}>Home</a>
        <a href="/shop" className="active-nav" onClick={() => setMenuOpen(false)}>Shop</a>
        <a href="/about" onClick={() => setMenuOpen(false)}>About</a>
        <a href="/contact" onClick={() => setMenuOpen(false)}>Contact</a>
      </div>

      {/* Navbar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem', height: '70px',
        background: 'rgba(4,3,2,0.92)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(201,168,76,0.12)',
      }}>
        <a href="/" style={{ textDecoration: 'none', color: '#C9A84C', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.1em' }}>
          R&R <span style={{ color: '#F5F0E8', fontWeight: 300 }}>AGENCIES</span>
        </a>

        <nav className="desktop-nav" style={{ display: 'flex', gap: '2.5rem' }}>
          {['Shop', 'About', 'Contact'].map(item => (
            <a key={item} href={`/${item.toLowerCase()}`} style={{
              fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase',
              color: item === 'Shop' ? '#C9A84C' : '#ccc',
              textDecoration: 'none', fontFamily: 'Montserrat, sans-serif',
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => e.target.style.color = '#C9A84C'}
              onMouseLeave={e => e.target.style.color = item === 'Shop' ? '#C9A84C' : '#ccc'}
            >
              {item}
            </a>
          ))}
        </nav>

        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
          style={{ display: 'none' }}
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Custom cursor — desktop only */}
      {!cursor.isMobile && (
        <>
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
        </>
      )}

      {/* ─── Hero ─── */}
      <section className="hero-section" style={{
        padding: '7rem 2rem 6rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(201,168,76,0.1)',
        background: '#040302',
        minHeight: '420px',
      }}>

        {/* Layer 0 — Liquid gold fluid simulation */}
        <LiquidEther
          colors={['#C9A84C', '#E8C86A', '#A07830', '#5C3D10', '#1A0E00']}
          mouseForce={28}
          cursorSize={110}
          resolution={0.5}
          dt={0.014}
          BFECC={true}
          isBounce={false}
          isViscous={false}
          autoDemo={true}
          autoSpeed={0.28}
          autoIntensity={2.0}
          autoResumeDelay={1200}
          autoRampDuration={0.8}
          takeoverDuration={0.3}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
          }}
        />

        {/* Layer 1 — Perspective grid overlay (blends over fluid) */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          backgroundImage: `
            linear-gradient(rgba(201,168,76,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.07) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          transform: 'perspective(700px) rotateX(60deg) translateZ(-60px) scale(2)',
          transformOrigin: '50% 100%',
          opacity: 0.5,
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
        }} />

        {/* Layer 2 — Radial vignette: keeps edges dark, fluid glows at centre */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          background: `radial-gradient(ellipse 85% 75% at 50% 50%,
            transparent 20%,
            rgba(4,3,2,0.5) 65%,
            rgba(4,3,2,0.92) 100%
          )`,
          pointerEvents: 'none',
        }} />

        {/* Layer 3 — Bottom fade so hero dissolves cleanly into page */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '80px', zIndex: 3,
          background: 'linear-gradient(to bottom, transparent, #040302)',
          pointerEvents: 'none',
        }} />

        {/* Layer 4 — Text content */}
        <div style={{ position: 'relative', zIndex: 4 }}>
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

          <div style={{ overflow: 'hidden', marginBottom: '0.3rem' }}>
            <h1 className="hero-h1" style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(3.5rem, 10vw, 8.5rem)',
              fontWeight: 300, color: '#FFFFFF',
              letterSpacing: '-0.01em', lineHeight: 1,
              textShadow: '0 0 80px rgba(255,255,255,0.1), 0 4px 40px rgba(0,0,0,0.95), 0 0 120px rgba(201,168,76,0.2)',
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'none' : 'translateY(80%)',
              transition: 'opacity 1.1s cubic-bezier(0.16,1,0.3,1) 0.3s, transform 1.1s cubic-bezier(0.16,1,0.3,1) 0.3s',
            }}>
              Our{' '}
              <em style={{
                color: '#C9A84C',
                fontStyle: 'normal',
                textShadow: '0 0 60px rgba(201,168,76,0.7), 0 0 120px rgba(201,168,76,0.4), 0 4px 40px rgba(0,0,0,0.9)',
              }}>Collection</em>
            </h1>
          </div>

          <div style={{
            width: heroVisible ? '100px' : '0px', height: '1px',
            background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
            margin: '2.5rem auto',
            transition: 'width 1.4s cubic-bezier(0.16,1,0.3,1) 0.7s',
          }} />

          <p style={{
            fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)',
            maxWidth: '480px', margin: '0 auto',
            lineHeight: 2, letterSpacing: '0.12em',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 200,
            opacity: heroVisible ? 1 : 0,
            transition: 'opacity 1s ease 0.9s',
            textShadow: '0 2px 16px rgba(0,0,0,0.9)',
          }}>
            Discover our range of premium clothing, designed with quality and style in mind.
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <div style={{
        borderBottom: '1px solid rgba(201,168,76,0.08)',
        background: 'rgba(5,4,3,0.98)',
        backdropFilter: 'blur(16px)',
        position: 'sticky', top: '70px', zIndex: 10,
      }}>
        <div className="filter-bar-inner">
          <div className="filter-pills">
            <div className="filter-pills-inner">
              {categories.map(cat => (
                <FilterPill
                  key={cat}
                  label={cat}
                  active={activeCategory === cat}
                  onClick={() => setActiveCategory(cat)}
                />
              ))}
            </div>
          </div>

          <div className="sort-count-row" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {!loading && (
              <p style={{
                fontSize: '0.5rem', color: '#3A3020',
                letterSpacing: '0.3em', textTransform: 'uppercase',
                fontFamily: 'Montserrat, sans-serif',
              }}>
                <span style={{ color: '#C9A84C' }}>{filtered.length}</span> items
              </p>
            )}
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
                  cursor: 'pointer',
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

      {/* Product grid */}
      <section className="shop-section">
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState filtered={activeCategory !== 'All'} />
        ) : (
          <div className="product-grid">
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}