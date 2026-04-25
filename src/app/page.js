'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// Hook to detect when element enters viewport
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, inView];
}

// Animated section wrapper
function Reveal({ children, delay = 0, direction = 'up' }) {
  const [ref, inView] = useInView();
  const transforms = {
    up: 'translateY(60px)',
    left: 'translateX(-60px)',
    right: 'translateX(60px)',
    scale: 'scale(0.92)',
  };
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : transforms[direction],
        transition: `opacity 0.9s ease ${delay}s, transform 0.9s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  const [heroVisible, setHeroVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);

  useEffect(() => {
    // Hero entrance
    const t = setTimeout(() => setHeroVisible(true), 100);

    // Parallax scroll
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });

    // Custom cursor
    const onMove = (e) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      setCursorVisible(true);
    };
    const onLeave = () => setCursorVisible(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div style={{ paddingTop: '70px', background: '#0A0A0A', overflowX: 'hidden' }}>

      {/* Custom cursor */}
      <div style={{
        position: 'fixed',
        left: cursorPos.x,
        top: cursorPos.y,
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: '1px solid #C9A84C',
        pointerEvents: 'none',
        zIndex: 9999,
        transform: 'translate(-50%, -50%)',
        opacity: cursorVisible ? 0.6 : 0,
        transition: 'opacity 0.3s, left 0.08s, top 0.08s',
        mixBlendMode: 'difference',
      }} />

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 2rem',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #111108 50%, #0A0A0A 100%)',
      }}>
        {/* Animated background lines */}
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${10 + i * 20}%`,
            top: 0,
            bottom: 0,
            width: '1px',
            background: 'linear-gradient(180deg, transparent, rgba(201,168,76,0.08), transparent)',
            animation: `pulse ${2 + i * 0.4}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}

        {/* Glowing orb */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translateY(${scrollY * 0.2}px)`,
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '860px', position: 'relative', zIndex: 1 }}>

          {/* Eyebrow */}
          <div style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity 1s ease 0.1s, transform 1s ease 0.1s',
          }}>
            <p style={{
              fontSize: '0.65rem',
              color: '#C9A84C',
              letterSpacing: '0.5em',
              textTransform: 'uppercase',
              marginBottom: '2rem',
              fontFamily: 'Montserrat, sans-serif',
            }}>
              ✦ &nbsp; Premium Sport &amp; Lifestyle &nbsp; ✦
            </p>
          </div>

          {/* Main heading — each word animates separately */}
          <h1 style={{
            fontSize: 'clamp(3rem, 9vw, 7rem)',
            lineHeight: 1.0,
            marginBottom: '1.5rem',
            fontFamily: 'Cormorant Garamond, serif',
          }}>
            {['R&R', 'Sport', '&', 'Lifestyle'].map((word, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  color: i === 0 || i === 2 ? '#C9A84C' : '#F5F0E8',
                  opacity: heroVisible ? 1 : 0,
                  transform: heroVisible ? 'none' : 'translateY(80px)',
                  transition: `opacity 1s ease ${0.2 + i * 0.15}s, transform 1s ease ${0.2 + i * 0.15}s`,
                  marginRight: '0.3em',
                }}
                dangerouslySetInnerHTML={{ __html: word }}
              />
            ))}
          </h1>

          {/* Divider line animates in */}
          <div style={{
            width: heroVisible ? '80px' : '0px',
            height: '1px',
            background: '#C9A84C',
            margin: '2rem auto',
            transition: 'width 1s ease 0.8s',
          }} />

          {/* Tagline */}
          <p style={{
            fontSize: '0.85rem',
            color: '#999',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '3rem',
            opacity: heroVisible ? 1 : 0,
            transition: 'opacity 1s ease 1s',
            fontFamily: 'Montserrat, sans-serif',
          }}>
            Own the Look, Own the Moment
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity 1s ease 1.2s, transform 1s ease 1.2s',
          }}>
            <Link href="/shop" className="btn-gold">Shop the Collection</Link>
            <Link href="/about" className="btn-outline-gold">Our Story</Link>
          </div>

          {/* Scroll indicator */}
          <div style={{
            position: 'absolute',
            bottom: '-120px',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: heroVisible ? 1 : 0,
            transition: 'opacity 1s ease 1.8s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <p style={{ fontSize: '0.55rem', color: '#555', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Scroll</p>
            <div style={{
              width: '1px',
              height: '50px',
              background: 'linear-gradient(180deg, #C9A84C, transparent)',
              animation: 'scrollPulse 1.5s ease-in-out infinite',
            }} />
          </div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ── */}
      <div style={{
        borderTop: '1px solid rgba(201,168,76,0.2)',
        borderBottom: '1px solid rgba(201,168,76,0.2)',
        padding: '1rem 0',
        overflow: 'hidden',
        background: '#0F0F0F',
      }}>
        <div style={{
          display: 'flex',
          gap: '3rem',
          animation: 'marquee 20s linear infinite',
          whiteSpace: 'nowrap',
        }}>
          {[...Array(3)].map((_, i) =>
            ['Premium Quality', '✦', 'South African Brand', '✦', 'Sport & Lifestyle', '✦', 'All Ages', '✦', 'Free Delivery', '✦'].map((text, j) => (
              <span key={`${i}-${j}`} style={{
                fontSize: '0.65rem',
                color: text === '✦' ? '#C9A84C' : '#666',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                fontFamily: 'Montserrat, sans-serif',
              }}>{text}</span>
            ))
          )}
        </div>
      </div>

      {/* ── CATEGORIES ── */}
      <section style={{ padding: '8rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <p style={{ fontSize: '0.65rem', color: '#C9A84C', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '1rem' }}>Browse</p>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', color: '#F5F0E8', fontFamily: 'Cormorant Garamond, serif' }}>Our Collections</h2>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {[
            { label: 'Menswear', desc: 'Sport & lifestyle essentials', icon: '👔', delay: 0 },
            { label: 'Womenswear', desc: 'Elegant everyday wear', icon: '👗', delay: 0.1 },
            { label: 'Kiddies', desc: 'Stylish pieces for little ones', icon: '🧒', delay: 0.2 },
            { label: 'Baby Wear', desc: 'Soft, premium comfort', icon: '👶', delay: 0.3 },
          ].map(cat => (
            <Reveal key={cat.label} delay={cat.delay} direction="up">
              <CategoryCard cat={cat} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── BRAND STATEMENT ── */}
      <section style={{
        background: '#0F0F0F',
        borderTop: '1px solid rgba(201,168,76,0.15)',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        padding: '8rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background text watermark */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translateY(${scrollY * 0.05}px)`,
          fontSize: 'clamp(6rem, 20vw, 16rem)',
          color: 'rgba(201,168,76,0.03)',
          fontFamily: 'Cormorant Garamond, serif',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>R&amp;R</div>

        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <p style={{ fontSize: '0.65rem', color: '#C9A84C', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '2rem' }}>Our Mission</p>
          </Reveal>
          <Reveal delay={0.2}>
            <h2 style={{
              fontSize: 'clamp(1.6rem, 4vw, 3rem)',
              color: '#F5F0E8',
              lineHeight: 1.5,
              fontFamily: 'Cormorant Garamond, serif',
              fontStyle: 'italic',
            }}>
              "Premium clothing that combines <span style={{ color: '#C9A84C' }}>elegance with comfort</span>, designed for the modern individual."
            </h2>
          </Reveal>
          <Reveal delay={0.4}>
            <div style={{ width: '60px', height: '1px', background: '#C9A84C', margin: '2.5rem auto' }} />
            <Link href="/about" className="btn-outline-gold">Read Our Story</Link>
          </Reveal>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section style={{ padding: '8rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <p style={{ fontSize: '0.65rem', color: '#C9A84C', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '1rem' }}>What We Stand For</p>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', color: '#F5F0E8', fontFamily: 'Cormorant Garamond, serif' }}>Our Values</h2>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
          {[
            { title: 'Quality', desc: 'Only the finest materials, built to last.', delay: 0 },
            { title: 'Design', desc: 'Style meets function in every piece.', delay: 0.15 },
            { title: 'Customer Focus', desc: 'You are at the heart of everything we do.', delay: 0.3 },
            { title: 'Innovation', desc: 'Always improving, always evolving.', delay: 0.45 },
          ].map(v => (
            <Reveal key={v.title} delay={v.delay} direction="up">
              <div style={{ textAlign: 'center', padding: '2rem 1.5rem', border: '1px solid rgba(201,168,76,0.1)', background: '#0F0F0F' }}>
                <div style={{ width: '30px', height: '1px', background: '#C9A84C', margin: '0 auto 1.5rem' }} />
                <h3 style={{ fontSize: '1.2rem', color: '#C9A84C', marginBottom: '0.75rem', fontFamily: 'Cormorant Garamond, serif' }}>{v.title}</h3>
                <p style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.9, letterSpacing: '0.03em' }}>{v.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{
        padding: '8rem 2rem',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #0A0A0A, #111108, #0A0A0A)',
        borderTop: '1px solid rgba(201,168,76,0.15)',
      }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', color: '#F5F0E8', fontFamily: 'Cormorant Garamond, serif', marginBottom: '1rem' }}>
            Ready to <span style={{ color: '#C9A84C' }}>elevate</span> your wardrobe?
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p style={{ fontSize: '0.8rem', color: '#888', letterSpacing: '0.1em', marginBottom: '2.5rem' }}>118 premium pieces available now</p>
          <Link href="/shop" className="btn-gold">Shop Now</Link>
        </Reveal>
      </section>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-33.33%); }
        }
        @keyframes pulse {
          from { opacity: 0.3; }
          to { opacity: 1; }
        }
        @keyframes scrollPulse {
          0%, 100% { opacity: 1; transform: scaleY(1); }
          50% { opacity: 0.3; transform: scaleY(0.6); }
        }
      `}</style>
    </div>
  );
}

function CategoryCard({ cat }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={`/shop?category=${cat.label.toLowerCase()}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          border: '1px solid',
          borderColor: hovered ? '#C9A84C' : 'rgba(201,168,76,0.15)',
          padding: '3rem 2rem',
          textAlign: 'center',
          transition: 'all 0.4s ease',
          cursor: 'pointer',
          background: hovered ? 'rgba(201,168,76,0.04)' : '#0F0F0F',
          transform: hovered ? 'translateY(-6px)' : 'none',
        }}
      >
        <div style={{
          fontSize: '2.5rem',
          marginBottom: '1.5rem',
          transform: hovered ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.3s ease',
          display: 'block',
        }}>{cat.icon}</div>
        <h3 style={{
          fontSize: '1.4rem',
          color: hovered ? '#C9A84C' : '#F5F0E8',
          marginBottom: '0.5rem',
          fontFamily: 'Cormorant Garamond, serif',
          transition: 'color 0.3s',
        }}>{cat.label}</h3>
        <p style={{ fontSize: '0.72rem', color: '#777', letterSpacing: '0.08em' }}>{cat.desc}</p>
        <div style={{
          width: hovered ? '40px' : '0px',
          height: '1px',
          background: '#C9A84C',
          margin: '1.2rem auto 0',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </Link>
  );
}