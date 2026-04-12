'use client';

import { Toaster } from 'react-hot-toast';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
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

function Navbar() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(10,10,10,0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(201,168,76,0.2)',
      padding: '0 2rem',
      height: '70px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {/* Logo */}
      <a href="/" style={{ textDecoration: 'none' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', color: '#C9A84C', letterSpacing: '0.2em', fontWeight: 600 }}>
          R&amp;R <span style={{ color: '#F5F0E8', fontWeight: 300 }}>AGENCIES</span>
        </div>
      </a>

      {/* Nav Links */}
      <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
        {[
          { label: 'Shop', href: '/shop' },
          { label: 'About', href: '/about' },
          { label: 'Contact', href: '/contact' },
       ].map(link => (
        <a
            key={link.href}
            href={link.href}

            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#F5F0E8',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.target.style.color = '#C9A84C'}
            onMouseLeave={e => e.target.style.color = '#F5F0E8'}
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Icons */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <a href="/profile" title="Profile" style={{ color: '#F5F0E8', textDecoration: 'none', fontSize: '1.1rem' }}>👤</a>
        <a href="/cart" title="Cart" style={{ color: '#C9A84C', textDecoration: 'none', fontSize: '1.1rem' }}>🛒</a>
      </div>
    </nav>
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

          {/* Brand */}
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', color: '#C9A84C', letterSpacing: '0.2em', marginBottom: '1rem' }}>
              R&amp;R AGENCIES
            </div>
            <p style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.8, letterSpacing: '0.03em' }}>
              Premium sport &amp; lifestyle clothing. Based in Verulam, South Africa.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '1.2rem' }}>Navigate</p>
            {[
              { label: 'Shop', href: '/shop' },
              { label: 'About Us', href: '/about' },
              { label: 'Contact Us', href: '/contact' },
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

          {/* Contact */}
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