'use client';

import { useState, useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import './globals.css';

function GlobalStyles() {
  return (
    <style>{`
      .rr-pill-nav {
        position: fixed;
        top: 1.2rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 0.55rem 1.2rem 0.55rem 1.4rem;
        background: rgba(10,10,10,0.85);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(201,168,76,0.25);
        border-radius: 999px;
        box-shadow: 0 4px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.08);
        white-space: nowrap;
      }

      .rr-pill-logo {
        font-family: 'Cormorant Garamond', serif;
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: 0.18em;
        color: #C9A84C;
        text-decoration: none;
        text-transform: uppercase;
        transition: opacity 0.2s;
        flex-shrink: 0;
      }
      .rr-pill-logo span { color: #E8C96D; font-weight: 400; }
      .rr-pill-logo:hover { opacity: 0.8; }

      .rr-pill-track {
        display: flex;
        align-items: center;
        gap: 0.2rem;
      }

      .rr-pill {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.38rem 1rem;
        border-radius: 999px;
        text-decoration: none;
        overflow: hidden;
        transition: color 0.22s;
      }

      .rr-pill-bubble {
        position: absolute;
        inset: 0;
        border-radius: 999px;
        background: rgba(201,168,76,0.12);
        opacity: 0;
        transform: scale(0.85);
        transition: opacity 0.22s, transform 0.22s;
        pointer-events: none;
      }
      .rr-pill:hover .rr-pill-bubble,
      .rr-pill--hovered .rr-pill-bubble {
        opacity: 1;
        transform: scale(1);
      }
      .rr-pill--active .rr-pill-bubble {
        opacity: 1;
        transform: scale(1);
        background: rgba(201,168,76,0.18);
      }

      .rr-pill-label {
        position: relative;
        z-index: 1;
        font-family: 'Montserrat', sans-serif;
        font-size: 0.7rem;
        font-weight: 500;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: #aaa;
        transition: color 0.22s;
      }
      .rr-pill:hover .rr-pill-label,
      .rr-pill--hovered .rr-pill-label,
      .rr-pill--active .rr-pill-label { color: #C9A84C; }

      .rr-pill-icons {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-shrink: 0;
      }

      .rr-pill-icon-link {
        color: #888;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.3rem;
        border-radius: 50%;
        transition: color 0.2s, background 0.2s;
        text-decoration: none;
      }
      .rr-pill-icon-link:hover {
        color: #C9A84C;
        background: rgba(201,168,76,0.1);
      }

      .rr-pill-icon-cart { position: relative; }
      .rr-cart-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #C9A84C;
        color: #0A0A0A;
        font-family: 'Montserrat', sans-serif;
        font-size: 0.55rem;
        font-weight: 700;
        min-width: 16px;
        height: 16px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 3px;
        line-height: 1;
      }

      .rr-hamburger {
        display: none;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 4px;
        width: 32px;
        height: 32px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.3rem;
        border-radius: 6px;
        transition: background 0.2s;
      }
      .rr-hamburger:hover { background: rgba(201,168,76,0.1); }
      .rr-hamburger span {
        display: block;
        width: 18px;
        height: 1.5px;
        background: #888;
        border-radius: 2px;
        transition: transform 0.25s, opacity 0.25s, background 0.2s;
        transform-origin: center;
      }
      .rr-hamburger:hover span { background: #C9A84C; }
      .rr-hamburger--open span:nth-child(1) { transform: translateY(5.5px) rotate(45deg); }
      .rr-hamburger--open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
      .rr-hamburger--open span:nth-child(3) { transform: translateY(-5.5px) rotate(-45deg); }

      /* ─── Bubble Mobile Menu Overlay ───────────────────────────────── */
      .rr-bubble-overlay {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 998;
        background: rgba(5,5,5,0.92);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.35s ease;
        pointer-events: none;
      }
      .rr-bubble-overlay--visible {
        opacity: 1;
        pointer-events: auto;
      }

      .rr-bubble-grid {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 2rem;
        width: 100%;
      }

      .rr-bubble-item {
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        border-radius: 999px;
        border: 1px solid rgba(201,168,76,0.2);
        background: rgba(201,168,76,0.04);
        padding: 1rem 3rem;
        width: min(320px, 80vw);
        position: relative;
        overflow: hidden;
        transform: scale(0.75) translateY(20px);
        opacity: 0;
        transition:
          transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
          opacity 0.35s ease,
          background 0.25s,
          border-color 0.25s;
      }

      .rr-bubble-item--entered {
        transform: scale(1) translateY(0);
        opacity: 1;
      }

      .rr-bubble-item::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(201,168,76,0.15), transparent 60%);
        opacity: 0;
        transition: opacity 0.3s;
      }
      .rr-bubble-item:hover::before,
      .rr-bubble-item--active::before {
        opacity: 1;
      }
      .rr-bubble-item:hover,
      .rr-bubble-item--active {
        border-color: rgba(201,168,76,0.55);
        background: rgba(201,168,76,0.1);
      }

      .rr-bubble-item-label {
        font-family: 'Cormorant Garamond', serif;
        font-size: 1.5rem;
        font-weight: 600;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: #888;
        transition: color 0.25s;
        position: relative;
        z-index: 1;
      }
      .rr-bubble-item:hover .rr-bubble-item-label,
      .rr-bubble-item--active .rr-bubble-item-label {
        color: #E8C96D;
      }

      .rr-bubble-item-dot {
        position: absolute;
        right: 1.5rem;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #C9A84C;
        opacity: 0;
        transform: scale(0);
        transition: opacity 0.25s, transform 0.25s;
        z-index: 1;
      }
      .rr-bubble-item--active .rr-bubble-item-dot {
        opacity: 1;
        transform: scale(1);
      }

      .rr-bubble-close-hint {
        position: absolute;
        bottom: 2.5rem;
        left: 50%;
        transform: translateX(-50%);
        font-family: 'Montserrat', sans-serif;
        font-size: 0.6rem;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        color: #444;
        opacity: 0;
        transition: opacity 0.5s ease 0.6s;
        pointer-events: none;
      }
      .rr-bubble-overlay--visible .rr-bubble-close-hint {
        opacity: 1;
      }

      .rr-bubble-wordmark {
        position: absolute;
        top: 2rem;
        left: 50%;
        transform: translateX(-50%);
        font-family: 'Cormorant Garamond', serif;
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.3em;
        color: rgba(201,168,76,0.3);
        text-transform: uppercase;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.5s ease 0.2s;
      }
      .rr-bubble-overlay--visible .rr-bubble-wordmark {
        opacity: 1;
      }

      /* ─── Responsive ────────────────────────────────────────────────── */
      @media (max-width: 768px) {
        .rr-pill-track { display: none; }
        .rr-hamburger { display: flex; }
        .rr-bubble-overlay { display: flex; }
        .rr-pill-nav {
          top: 0.8rem;
          padding: 0.5rem 1rem;
          width: calc(100% - 2rem);
          max-width: 480px;
        }
      }
      @media (max-width: 480px) {
        .rr-pill-logo { font-size: 0.85rem; }
      }
    `}</style>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <GlobalStyles />
        <PillNav />
        <main>{children}</main>
        <Footer />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1A1A1A',
              color: '#E8C96D',
              border: '1px solid #C9A84C',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '0.8rem',
              letterSpacing: '0.05em',
            },
          }}
        />
      </body>
    </html>
  );
}

const NAV_ITEMS = [
  { label: 'Home',    href: '/' },
  { label: 'Shop',    href: '/shop' },
  { label: 'About',   href: '/about' },
  { label: 'Contact', href: '/contact' },
];

function PillNav() {
  const [cartCount, setCartCount] = useState(0);
  const [activeHref, setActiveHref] = useState('/');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [enteredItems, setEnteredItems] = useState([]);
  const overlayRef = useRef(null);
  const timerRefs = useRef([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setActiveHref(window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const updateCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const total = cart.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(total);
    };
    updateCount();
    window.addEventListener('storage', updateCount);
    window.addEventListener('cartUpdated', updateCount);
    return () => {
      window.removeEventListener('storage', updateCount);
      window.removeEventListener('cartUpdated', updateCount);
    };
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      timerRefs.current.forEach(t => clearTimeout(t));
      setEnteredItems([]);
      NAV_ITEMS.forEach((_, i) => {
        const t = setTimeout(() => {
          setEnteredItems(prev => [...prev, i]);
        }, 80 + i * 80);
        timerRefs.current[i] = t;
      });
    } else {
      document.body.style.overflow = '';
      timerRefs.current.forEach(t => clearTimeout(t));
      setEnteredItems([]);
    }
    return () => {
      document.body.style.overflow = '';
      timerRefs.current.forEach(t => clearTimeout(t));
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      <nav className="rr-pill-nav">
        <a href="/" className="rr-pill-logo">
          R&amp;R <span>AGENCIES</span>
        </a>

        <div className="rr-pill-track">
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              className={`rr-pill${activeHref === item.href ? ' rr-pill--active' : ''}${hoveredIndex === i ? ' rr-pill--hovered' : ''}`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <span className="rr-pill-bubble" aria-hidden="true" />
              <span className="rr-pill-label">{item.label}</span>
            </a>
          ))}
        </div>

        <div className="rr-pill-icons">
          <a href="/profile" title="Profile" className="rr-pill-icon-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </a>
          <a href="/cart" title="Cart" className="rr-pill-icon-link rr-pill-icon-cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {cartCount > 0 && (
              <span className="rr-cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>
            )}
          </a>

          <button
            className={`rr-hamburger${mobileOpen ? ' rr-hamburger--open' : ''}`}
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      <div
        ref={overlayRef}
        className={`rr-bubble-overlay${mobileOpen ? ' rr-bubble-overlay--visible' : ''}`}
        onClick={(e) => { if (e.target === overlayRef.current) setMobileOpen(false); }}
        aria-hidden={!mobileOpen}
      >
        <span className="rr-bubble-wordmark">R&amp;R AGENCIES</span>

        <div className="rr-bubble-grid">
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              className={`rr-bubble-item${enteredItems.includes(i) ? ' rr-bubble-item--entered' : ''}${activeHref === item.href ? ' rr-bubble-item--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="rr-bubble-item-label">{item.label}</span>
              <span className="rr-bubble-item-dot" aria-hidden="true" />
            </a>
          ))}
        </div>

        <span className="rr-bubble-close-hint">tap outside to close</span>
      </div>
    </>
  );
}

function Footer() {
  return (
    <footer style={{
      background: '#0A0A0A',
      borderTop: '1px solid rgba(201,168,76,0.2)',
      padding: '4rem 2rem 2rem',
      marginTop: '5rem',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', color: '#C9A84C', letterSpacing: '0.2em', marginBottom: '1rem' }}>
              R&amp;R AGENCIES
            </div>
            <p style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.8, letterSpacing: '0.03em' }}>
              Premium sport &amp; lifestyle clothing. Based in Verulam, South Africa.
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '1.2rem' }}>Navigate</p>
            {[
              { label: 'Home',           href: '/' },
              { label: 'Shop',           href: '/shop' },
              { label: 'About Us',       href: '/about' },
              { label: 'Contact Us',     href: '/contact' },
              { label: 'Returns Policy', href: '/returns' },
            ].map(link => (
              <div key={link.href} style={{ marginBottom: '0.6rem' }}>
                <a
                  href={link.href}
                  style={{ fontSize: '0.75rem', color: '#888', textDecoration: 'none', letterSpacing: '0.05em' }}
                  onMouseEnter={e => e.target.style.color = '#C9A84C'}
                  onMouseLeave={e => e.target.style.color = '#888'}
                >
                  {link.label}
                </a>
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '1.2rem' }}>Contact</p>
            <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.6rem' }}>SBDC Building, 2 Columbus Rd,<br />Verulam, Unit 13</p>
            <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.6rem' }}>info@randragencies.online</p>
            <p style={{ fontSize: '0.75rem', color: '#888' }}>081 336 5266</p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.65rem', color: '#555', letterSpacing: '0.1em' }}>
            © {new Date().getFullYear()} R&amp;R AGENCIES. ALL RIGHTS RESERVED. · randragencies.online
          </p>
        </div>
      </div>
    </footer>
  );
}