'use client';

import { useState, useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import './PillNav.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
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
  const mobileRef = useRef(null);

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
    const handleClickOutside = (e) => {
      if (mobileRef.current && !mobileRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    if (mobileOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileOpen]);

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

      <div className={`rr-mobile-menu${mobileOpen ? ' rr-mobile-menu--open' : ''}`} ref={mobileRef}>
        {NAV_ITEMS.map(item => (
          <a
            key={item.href}
            href={item.href}
            className={`rr-mobile-link${activeHref === item.href ? ' rr-mobile-link--active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            {item.label}
          </a>
        ))}
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