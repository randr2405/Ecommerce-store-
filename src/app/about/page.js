'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div style={{ paddingTop: '70px' }}>

      {/* HERO */}
      <section style={{
        padding: '6rem 2rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A0A 50%, #0A0A0A 100%)',
      }}>
        <p className="section-label">Who We Are</p>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#F5F0E8', marginTop: '0.5rem' }}>About Us</h1>
        <div className="divider-gold" />
        <p style={{ fontSize: '1.1rem', color: '#C9A84C', fontFamily: 'Cormorant Garamond, serif', maxWidth: '600px', margin: '0 auto 1rem', lineHeight: 1.6 }}>
          Built for Movement, Designed for Life
        </p>
        <p style={{ fontSize: '0.85rem', color: '#999', maxWidth: '650px', margin: '0 auto', lineHeight: 1.9, letterSpacing: '0.03em' }}>
          R&amp;R Sports &amp; Lifestyle is our answer to the modern athlete and lifestyle enthusiast who demands more from their apparel. We believe that performance wear shouldn't sacrifice style, and street fashion shouldn't compromise on functionality.
        </p>
      </section>

      {/* FOUNDERS */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p className="section-label">Our Story</p>
          <h2 style={{ fontSize: '2.5rem', color: '#F5F0E8', marginTop: '0.5rem' }}>Where Sport Meets Style</h2>
          <div className="divider-gold" />
          <p style={{ fontSize: '0.85rem', color: '#888', maxWidth: '600px', margin: '0 auto', lineHeight: 1.9 }}>
            R&amp;R Sports &amp; Lifestyle was born from the perfect fusion of athletic excellence and lifestyle sophistication. Two founders, two passions, one extraordinary brand.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          {/* Romario */}
          <div style={{
            border: '1px solid rgba(201,168,76,0.2)',
            padding: '3rem',
            background: '#0F0F0F',
            transition: 'border-color 0.3s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'}
          >
            <p className="section-label" style={{ marginBottom: '1rem' }}>Sports & Performance</p>
            <h3 style={{ fontSize: '1.8rem', color: '#F5F0E8', marginBottom: '0.25rem' }}>Romario Govender</h3>
            <p style={{ fontSize: '0.7rem', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Co-Founder · Athletic Excellence</p>
            <div style={{ width: '40px', height: '1px', background: '#C9A84C', marginBottom: '1.5rem' }} />
            <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.9, marginBottom: '1rem' }}>
              A true athlete at heart, Romario has excelled in nearly every sport imaginable. As a semi-professional golfer, he brings an elite athlete's perspective to performance wear.
            </p>
            <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.9 }}>
              His deep understanding of what athletes need — from moisture-wicking technology to ergonomic design — ensures every sportswear piece performs at the highest level.
            </p>
          </div>

          {/* Rhea */}
          <div style={{
            border: '1px solid rgba(201,168,76,0.2)',
            padding: '3rem',
            background: '#0F0F0F',
            transition: 'border-color 0.3s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'}
          >
            <p className="section-label" style={{ marginBottom: '1rem' }}>Lifestyle & Luxury</p>
            <h3 style={{ fontSize: '1.8rem', color: '#F5F0E8', marginBottom: '0.25rem' }}>Rhea Jugernath</h3>
            <p style={{ fontSize: '0.7rem', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Co-Founder · Style & Sophistication</p>
            <div style={{ width: '40px', height: '1px', background: '#C9A84C', marginBottom: '1.5rem' }} />
            <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.9, marginBottom: '1rem' }}>
              With a passion for fashion and an eye for luxury, Rhea brings the lifestyle element that elevates our brand beyond performance wear.
            </p>
            <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.9 }}>
              Her expertise in contemporary design and premium materials ensures our lifestyle and luxury collections embody sophistication, comfort, and timeless style.
            </p>
          </div>
        </div>

        {/* Combined statement */}
        <div style={{
          marginTop: '2rem',
          padding: '3rem',
          border: '1px solid rgba(201,168,76,0.15)',
          textAlign: 'center',
          background: '#0F0F0F',
        }}>
          <p style={{ fontSize: '1rem', color: '#F5F0E8', fontFamily: 'Cormorant Garamond, serif', lineHeight: 1.8, maxWidth: '700px', margin: '0 auto' }}>
            "Together, Romario and Rhea created R&amp;R Sports &amp; Lifestyle — a brand where athletic performance meets everyday elegance, where functionality embraces fashion, and where every piece tells the story of <span style={{ color: '#C9A84C' }}>two passions perfectly combined.</span>"
          </p>
        </div>
      </section>

      {/* COLLECTIONS */}
      <section style={{
        background: '#0F0F0F',
        borderTop: '1px solid rgba(201,168,76,0.15)',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        padding: '6rem 2rem',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p className="section-label">Our Collections</p>
            <h2 style={{ fontSize: '2.5rem', color: '#F5F0E8', marginTop: '0.5rem' }}>Designed for Every Aspect of Your Active Life</h2>
            <div className="divider-gold" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {[
              {
                tag: 'Sportswear',
                title: 'Active Performance Line',
                desc: 'Technical sportswear engineered for peak performance.',
                features: ['Moisture-wicking technology', 'Strategic mesh panels', 'Ergonomic fit'],
              },
              {
                tag: 'Training',
                title: 'Training Essentials',
                desc: 'Versatile pieces designed for any workout.',
                features: ['Flexible movement', 'Breathable fabrics', 'Durable construction'],
              },
              {
                tag: 'Lifestyle',
                title: 'Urban Lifestyle',
                desc: 'Contemporary streetwear with athletic DNA.',
                features: ['Modern aesthetics', 'Comfortable fits', 'Versatile styling'],
              },
              {
                tag: 'Luxury',
                title: 'Premium Collection',
                desc: 'Exclusive pieces crafted from the finest materials.',
                features: ['Premium materials', 'Refined details', 'Exclusive designs'],
              },
            ].map(col => (
              <div key={col.title} style={{
                border: '1px solid rgba(201,168,76,0.15)',
                padding: '2rem',
                transition: 'border-color 0.3s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)'}
              >
                <p className="section-label" style={{ marginBottom: '0.75rem' }}>{col.tag}</p>
                <h3 style={{ fontSize: '1.2rem', color: '#F5F0E8', marginBottom: '0.75rem' }}>{col.title}</h3>
                <p style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.8, marginBottom: '1.25rem' }}>{col.desc}</p>
                <div style={{ width: '30px', height: '1px', background: '#C9A84C', marginBottom: '1rem' }} />
                {col.features.map(f => (
                  <p key={f} style={{ fontSize: '0.75rem', color: '#777', marginBottom: '0.4rem' }}>
                    <span style={{ color: '#C9A84C', marginRight: '0.5rem' }}>✓</span>{f}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT SETS US APART */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p className="section-label">What Sets Us Apart</p>
          <h2 style={{ fontSize: '2.5rem', color: '#F5F0E8', marginTop: '0.5rem' }}>Quality in Every Detail</h2>
          <div className="divider-gold" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {[
            { icon: '🧵', title: 'Premium Fabrics', desc: 'We source only the finest technical fabrics from trusted suppliers. Each material is selected for its specific performance characteristics and durability.' },
            { icon: '🎨', title: 'Contemporary Design', desc: 'Our in-house design team creates original collections that blend athletic functionality with street-style aesthetics. Never basic, always authentic.' },
            { icon: '✨', title: 'Limited Edition Exclusivity', desc: 'Every garment is produced in limited quantities. Once a design sells out, we never reproduce it — making each piece truly exclusive and collectible.' },
          ].map(item => (
            <div key={item.title} style={{ textAlign: 'center', padding: '2.5rem 1.5rem', border: '1px solid rgba(201,168,76,0.1)', transition: 'border-color 0.3s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.1)'}
            >
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{item.icon}</div>
              <h3 style={{ fontSize: '1.2rem', color: '#C9A84C', marginBottom: '0.75rem' }}>{item.title}</h3>
              <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.8 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VALUES */}
      <section style={{
        background: '#0F0F0F',
        borderTop: '1px solid rgba(201,168,76,0.15)',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        padding: '6rem 2rem',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p className="section-label">What Drives Us</p>
            <h2 style={{ fontSize: '2.5rem', color: '#F5F0E8', marginTop: '0.5rem' }}>Our Values</h2>
            <div className="divider-gold" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
            {[
              { title: 'Quality', desc: 'We use only the finest materials to ensure our products stand the test of time.' },
              { title: 'Design', desc: 'Every piece is thoughtfully designed to combine style and functionality.' },
              { title: 'Customer Focus', desc: 'We place our customers at the heart of everything we do.' },
              { title: 'Innovation', desc: 'We continuously strive to innovate and improve our products.' },
            ].map(v => (
              <div key={v.title} style={{ textAlign: 'center', padding: '2.5rem 1.5rem', border: '1px solid rgba(201,168,76,0.1)', transition: 'border-color 0.3s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.1)'}
              >
                <div style={{ width: '40px', height: '1px', background: '#C9A84C', margin: '0 auto 1.5rem' }} />
                <h3 style={{ fontSize: '1.3rem', color: '#C9A84C', marginBottom: '0.75rem' }}>{v.title}</h3>
                <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.8 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <p className="section-label">Ready to Explore?</p>
        <h2 style={{ fontSize: '2.5rem', color: '#F5F0E8', marginTop: '0.5rem', marginBottom: '1rem' }}>Experience the R&amp;R Difference</h2>
        <div className="divider-gold" />
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '2.5rem', letterSpacing: '0.05em', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
          Discover our latest collections and elevate your wardrobe with pieces designed for performance, style, and exclusivity.
        </p>
        <Link href="/shop" className="btn-gold">Shop Now</Link>
      </section>

    </div>
  );
}