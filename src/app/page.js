'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ paddingTop: '70px' }}>

      {/* HERO */}
      <section style={{
        minHeight: '92vh',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A0A 50%, #0A0A0A 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 2rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />

       <div style={{ maxWidth: '800px' }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)', color: '#F5F0E8', lineHeight: 1.1, marginBottom: '0.5rem' }}>
            R&amp;R <span style={{ color: '#C9A84C' }}>Sports &amp; Lifestyle</span>
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#aaa', letterSpacing: '0.35em', textTransform: 'uppercase', margin: '0.8rem 0 1.5rem' }}>
            Own the Look, Own the Moment
          </p>
          <div className="divider-gold" />
          <p style={{ fontSize: '0.9rem', color: '#999', letterSpacing: '0.1em', lineHeight: 1.9, maxWidth: '500px', margin: '0 auto 3rem' }}>
            Premium sport &amp; lifestyle clothing for every generation — from the youngest to the boldest.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/shop" className="btn-gold">Shop the Collection</Link>
            <Link href="/about" className="btn-outline-gold">Our Story</Link>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p className="section-label">Browse by Category</p>
          <h2 style={{ fontSize: '2.5rem', color: '#F5F0E8', marginTop: '0.5rem' }}>Collections</h2>
          <div className="divider-gold" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[
            { label: 'Menswear', desc: 'Sport & lifestyle essentials', icon: '👔' },
            { label: 'Womenswear', desc: 'Elegant everyday wear', icon: '👗' },
            { label: 'Kiddies', desc: 'Stylish pieces for little ones', icon: '🧒' },
            { label: 'Baby Wear', desc: 'Soft, premium comfort', icon: '👶' },
          ].map(cat => (
            <Link key={cat.label} href={`/shop?category=${cat.label.toLowerCase()}`} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  border: '1px solid rgba(201,168,76,0.2)',
                  padding: '2.5rem',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  background: '#0F0F0F',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{cat.icon}</div>
                <h3 style={{ fontSize: '1.4rem', color: '#F5F0E8', marginBottom: '0.5rem' }}>{cat.label}</h3>
                <p style={{ fontSize: '0.75rem', color: '#888', letterSpacing: '0.05em' }}>{cat.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* BRAND STATEMENT */}
      <section style={{
        background: '#0F0F0F',
        borderTop: '1px solid rgba(201,168,76,0.15)',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        padding: '6rem 2rem',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <p className="section-label">Our Mission</p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#F5F0E8', marginTop: '1rem', lineHeight: 1.4 }}>
            "Premium clothing that combines <span style={{ color: '#C9A84C' }}>elegance with comfort</span>, designed for the modern individual."
          </h2>
          <div className="divider-gold" />
          <Link href="/about" className="btn-outline-gold" style={{ display: 'inline-block', marginTop: '1rem' }}>Read Our Story</Link>
        </div>
      </section>

      {/* VALUES */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p className="section-label">What We Stand For</p>
          <h2 style={{ fontSize: '2.5rem', color: '#F5F0E8', marginTop: '0.5rem' }}>Our Values</h2>
          <div className="divider-gold" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
          {[
            { title: 'Quality', desc: 'Only the finest materials, built to last.' },
            { title: 'Design', desc: 'Style meets function in every piece.' },
            { title: 'Customer Focus', desc: 'You are at the heart of everything we do.' },
            { title: 'Innovation', desc: 'Always improving, always evolving.' },
          ].map(v => (
            <div key={v.title} style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ width: '40px', height: '1px', background: '#C9A84C', margin: '0 auto 1.5rem' }} />
              <h3 style={{ fontSize: '1.3rem', color: '#C9A84C', marginBottom: '0.75rem' }}>{v.title}</h3>
              <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.8, letterSpacing: '0.03em' }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}