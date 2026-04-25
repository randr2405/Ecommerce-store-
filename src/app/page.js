'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';

/* ─── Scroll reveal hook ─── */
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, delay = 0, direction = 'up', className = '' }) {
  const [ref, visible] = useReveal();
  const transforms = {
    up: 'translateY(60px)',
    left: 'translateX(-60px)',
    right: 'translateX(60px)',
    scale: 'scale(0.93)',
  };
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : transforms[direction],
        transition: `opacity 1s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 1s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── 3-D tilt card ─── */
function TiltCard({ children, style = {}, className = '' }) {
  const ref = useRef(null);
  const handleMove = useCallback((e) => {
    const card = ref.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;   // -0.5 → 0.5
    const y = (e.clientY - top) / height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x * 14}deg) rotateX(${-y * 10}deg) translateZ(12px)`;
    card.style.boxShadow = `${-x * 20}px ${y * 20}px 40px rgba(201,168,76,0.12)`;
  }, []);
  const handleLeave = useCallback(() => {
    const card = ref.current;
    if (!card) return;
    card.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) translateZ(0)';
    card.style.boxShadow = 'none';
  }, []);
  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={{ transformStyle: 'preserve-3d', transition: 'transform 0.1s ease, box-shadow 0.1s ease', ...style }}
    >
      {children}
    </div>
  );
}

/* ─── Three.js particle field ─── */
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let mouse = { x: -9999, y: -9999 };

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    /* Build particles */
    const COUNT = 180;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random(),              // depth 0=far 1=near
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.3,
    }));

    /* Connection lines */
    const LINK_DIST = 130;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      /* Subtle radial glow at mouse */
      const grd = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 300);
      grd.addColorStop(0, 'rgba(201,168,76,0.07)');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      /* Update & draw particles */
      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];

        /* Mouse repulsion */
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120 * 0.6;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        /* Dampen */
        p.vx *= 0.97;
        p.vy *= 0.97;

        p.x += p.vx;
        p.y += p.vy;

        /* Wrap edges */
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        /* Draw dot — depth-scaled */
        const alpha = 0.2 + p.z * 0.6;
        const radius = p.r * (0.5 + p.z * 0.8);
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,168,76,${alpha})`;
        ctx.fill();
      }

      /* Draw connecting lines */
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            const alpha = (1 - d / LINK_DIST) * 0.12;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(201,168,76,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
    />
  );
}

/* ─── Category card ─── */
function CategoryCard({ cat, index }) {
  const [hovered, setHovered] = useState(false);
  const num = String(index + 1).padStart(2, '0');

  return (
    <Link href={`/shop?category=${cat.label.toLowerCase()}`} style={{ textDecoration: 'none' }}>
      <TiltCard
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            border: '1px solid',
            borderColor: hovered ? 'rgba(201,168,76,0.7)' : 'rgba(201,168,76,0.1)',
            padding: '3.5rem 2.5rem',
            background: hovered ? 'rgba(201,168,76,0.04)' : '#0C0C0A',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            transition: 'border-color 0.4s, background 0.4s',
          }}
        >
          {/* Hover line sweep */}
          <div style={{
            position: 'absolute',
            bottom: 0, left: 0,
            height: '2px',
            width: hovered ? '100%' : '0%',
            background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
            transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)',
          }} />

          <p style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '0.75rem',
            color: hovered ? '#C9A84C' : 'rgba(201,168,76,0.25)',
            letterSpacing: '0.2em',
            marginBottom: '1.5rem',
            transition: 'color 0.4s',
          }}>{num}</p>

          <span style={{
            fontSize: '2.8rem',
            display: 'block',
            marginBottom: '1.5rem',
            transform: hovered ? 'scale(1.12) rotate(-5deg)' : 'scale(1)',
            transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
          }}>{cat.icon}</span>

          <h3 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.8rem',
            fontWeight: 300,
            color: hovered ? '#C9A84C' : '#F5F0E8',
            marginBottom: '0.6rem',
            transition: 'color 0.3s',
          }}>{cat.label}</h3>

          <p style={{ fontSize: '0.68rem', color: '#666', letterSpacing: '0.08em', lineHeight: 1.8 }}>{cat.desc}</p>

          <span style={{
            display: 'inline-block',
            color: '#C9A84C',
            fontSize: '1.2rem',
            marginTop: '1.5rem',
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateX(8px)' : 'translateX(0)',
            transition: 'all 0.4s',
          }}>→</span>
        </div>
      </TiltCard>
    </Link>
  );
}

/* ─── Marquee ─── */
function Marquee() {
  const items = ['Premium Quality', '✦', 'South African Brand', '✦', 'Sport & Lifestyle', '✦', 'All Ages', '✦', 'Free Delivery', '✦', '118 Pieces Available', '✦'];
  return (
    <div style={{
      borderTop: '1px solid rgba(201,168,76,0.15)',
      borderBottom: '1px solid rgba(201,168,76,0.15)',
      padding: '1.1rem 0',
      overflow: 'hidden',
      background: '#080808',
    }}>
      <div style={{ display: 'flex', gap: '3rem', animation: 'rrMarquee 28s linear infinite', width: 'max-content' }}>
        {[...items, ...items].map((text, i) => (
          <span key={i} style={{
            fontSize: '0.58rem',
            color: text === '✦' ? '#C9A84C' : '#555',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            fontFamily: 'Montserrat, sans-serif',
          }}>{text}</span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function HomePage() {
  const [heroVisible, setHeroVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorHover, setCursorHover] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });

    const onMove = (e) => { setCursor({ x: e.clientX, y: e.clientY }); setCursorVisible(true); };
    const onLeave = () => setCursorVisible(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    /* Cursor scale on interactive elements */
    const enter = () => setCursorHover(true);
    const leave = () => setCursorHover(false);
    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
    });

    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const categories = [
    { label: 'Menswear',   desc: 'Sport & lifestyle essentials for the modern man', icon: '👔' },
    { label: 'Womenswear', desc: 'Elegant everyday wear, effortlessly refined',      icon: '👗' },
    { label: 'Kiddies',    desc: 'Stylish pieces designed for little ones',           icon: '🧒' },
    { label: 'Baby Wear',  desc: 'Soft, premium comfort from day one',               icon: '👶' },
  ];

  const values = [
    { title: 'Quality',         desc: 'Only the finest materials, constructed to outlast trends and time.' },
    { title: 'Design',          desc: 'Style meets function — every piece is entirely intentional.' },
    { title: 'Customer Focus',  desc: 'You are at the heart of everything we create and do.' },
    { title: 'Innovation',      desc: 'Always improving, always evolving, never standing still.' },
  ];

  return (
    <div style={{ paddingTop: '70px', background: '#060606', overflowX: 'hidden' }}>

      {/* ── Custom cursor ── */}
      <div style={{
        position: 'fixed',
        left: cursor.x, top: cursor.y,
        width: cursorHover ? '8px' : '12px',
        height: cursorHover ? '8px' : '12px',
        background: '#C9A84C',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 9999,
        transform: 'translate(-50%,-50%)',
        opacity: cursorVisible ? 1 : 0,
        transition: 'opacity 0.3s, width 0.2s, height 0.2s',
        mixBlendMode: 'difference',
      }} />
      <div style={{
        position: 'fixed',
        left: cursor.x, top: cursor.y,
        width: cursorHover ? '52px' : '36px',
        height: cursorHover ? '52px' : '36px',
        border: '1px solid rgba(201,168,76,0.5)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 9998,
        transform: 'translate(-50%,-50%)',
        opacity: cursorVisible ? 1 : 0,
        transition: 'left 0.1s, top 0.1s, opacity 0.3s, width 0.3s, height 0.3s',
      }} />

      {/* ══ HERO ══ */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 2rem',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #060606 0%, #0E0E08 50%, #060606 100%)',
      }}>
        {/* Particle canvas */}
        <ParticleCanvas />

        {/* Ambient glow that follows scroll */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: `translate(-50%,-50%) translateY(${scrollY * 0.15}px)`,
          width: '700px', height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 65%)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        {/* Floating vertical lines */}
        {[15, 30, 50, 70, 85].map((left, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${left}%`, top: 0, bottom: 0,
            width: '1px',
            background: 'linear-gradient(180deg,transparent,rgba(201,168,76,0.06),transparent)',
            animation: `rrPulse ${2.2 + i * 0.5}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.4}s`,
            zIndex: 1,
          }} />
        ))}

        <div style={{ maxWidth: '900px', position: 'relative', zIndex: 2 }}>

          {/* Eyebrow */}
          <p style={{
            fontSize: '0.62rem',
            color: '#C9A84C',
            letterSpacing: '0.55em',
            textTransform: 'uppercase',
            marginBottom: '2.5rem',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 300,
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity 1s ease 0.2s, transform 1s ease 0.2s',
          }}>
            ✦ &nbsp; Premium Sport &amp; Lifestyle &nbsp; ✦
          </p>

          {/* Main heading — each word clips and slides up */}
          <h1 style={{
            fontSize: 'clamp(3.5rem, 11vw, 9rem)',
            lineHeight: 0.9,
            marginBottom: '1.5rem',
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 300,
          }}>
            {[
              { text: 'R&R',       gold: true  },
              { text: 'Sport &',   gold: false },
              { text: 'Lifestyle', gold: false },
            ].map((word, i) => (
              <span key={i} style={{ display: 'block', overflow: 'hidden', lineHeight: 1.05 }}>
                <span
                  dangerouslySetInnerHTML={{ __html: word.text }}
                  style={{
                    display: 'inline-block',
                    color: word.gold ? '#C9A84C' : '#F5F0E8',
                    opacity: heroVisible ? 1 : 0,
                    transform: heroVisible ? 'none' : 'translateY(100%)',
                    transition: `opacity 1.1s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.18}s, transform 1.1s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.18}s`,
                  }}
                />
              </span>
            ))}
          </h1>

          {/* Animated divider */}
          <div style={{
            width: heroVisible ? '100px' : '0px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
            margin: '2.5rem auto',
            transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1) 0.9s',
          }} />

          {/* Tagline */}
          <p style={{
            fontSize: '0.7rem',
            color: '#888',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            marginBottom: '3.5rem',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 200,
            opacity: heroVisible ? 1 : 0,
            transition: 'opacity 1s ease 1.2s',
          }}>
            Own the Look, Own the Moment
          </p>

          {/* CTAs */}
          <div style={{
            display: 'flex',
            gap: '1.2rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity 1s ease 1.5s, transform 1s ease 1.5s',
          }}>
            <Link href="/shop" className="rr-btn-primary">Shop the Collection</Link>
            <Link href="/about" className="rr-btn-outline">Our Story</Link>
          </div>

          {/* Scroll indicator */}
          <div style={{
            position: 'absolute',
            bottom: '-130px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.6rem',
            opacity: heroVisible ? 1 : 0,
            transition: 'opacity 1s ease 2s',
          }}>
            <p style={{ fontSize: '0.5rem', color: '#444', letterSpacing: '0.4em', textTransform: 'uppercase' }}>Scroll</p>
            <div style={{
              width: '1px',
              height: '60px',
              background: 'linear-gradient(180deg, #C9A84C, transparent)',
              animation: 'rrScrollPulse 1.6s ease-in-out infinite',
            }} />
          </div>
        </div>
      </section>

      {/* ══ MARQUEE ══ */}
      <Marquee />

      {/* ══ COLLECTIONS ══ */}
      <section style={{ padding: '9rem 4rem 8rem', maxWidth: '1280px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <p style={{ fontSize: '0.6rem', color: '#C9A84C', letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>Browse</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.5rem,6vw,5rem)', fontWeight: 300, color: '#F5F0E8' }}>Our Collections</h2>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5px', background: 'rgba(201,168,76,0.06)' }}>
          {categories.map((cat, i) => (
            <Reveal key={cat.label} delay={i * 0.1}>
              <CategoryCard cat={cat} index={i} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ BRAND STATEMENT ══ */}
      <section style={{
        background: '#0A0A08',
        borderTop: '1px solid rgba(201,168,76,0.12)',
        borderBottom: '1px solid rgba(201,168,76,0.12)',
        padding: '9rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Watermark */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%,-50%) translateY(${scrollY * 0.04}px)`,
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(7rem, 22vw, 17rem)',
          color: 'rgba(201,168,76,0.025)',
          userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap', fontWeight: 300,
        }}>R&amp;R</div>

        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <p style={{ fontSize: '0.6rem', color: '#C9A84C', letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '2rem', fontFamily: 'Montserrat, sans-serif' }}>Our Mission</p>
          </Reveal>
          <Reveal delay={0.2}>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(1.8rem,4.5vw,3.4rem)',
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#F5F0E8',
              lineHeight: 1.55,
            }}>
              "Premium clothing that combines{' '}
              <span style={{ color: '#C9A84C', fontStyle: 'normal' }}>elegance with comfort</span>,
              designed for the modern individual who lives without compromise."
            </h2>
          </Reveal>
          <Reveal delay={0.4}>
            <div style={{ width: '60px', height: '1px', background: '#C9A84C', margin: '3rem auto 2.5rem' }} />
            <Link href="/about" className="rr-btn-outline">Read Our Story</Link>
          </Reveal>
        </div>
      </section>

      {/* ══ VALUES ══ */}
      <section style={{ padding: '9rem 4rem', maxWidth: '1200px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <p style={{ fontSize: '0.6rem', color: '#C9A84C', letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>What We Stand For</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.5rem,6vw,5rem)', fontWeight: 300, color: '#F5F0E8' }}>Our Values</h2>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1px', background: 'rgba(201,168,76,0.06)' }}>
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.15} direction="up">
              <ValueCard value={v} index={i} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ FINAL CTA ══ */}
      <section style={{
        padding: '10rem 2rem',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #060606, #0E0E08, #060606)',
        borderTop: '1px solid rgba(201,168,76,0.12)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative lines */}
        {[10, 25, 50, 75, 90].map((left, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${left}%`, top: 0, bottom: 0,
            width: '1px',
            background: 'linear-gradient(180deg,transparent,rgba(201,168,76,0.05),transparent)',
            animation: `rrPulse ${2 + i * 0.6}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2.5rem, 7vw, 6rem)',
              fontWeight: 300,
              color: '#F5F0E8',
              lineHeight: 1,
              marginBottom: '1rem',
            }}>
              Ready to{' '}
              <span style={{ color: '#C9A84C' }}>elevate</span>
              {' '}your wardrobe?
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p style={{ fontSize: '0.68rem', color: '#555', letterSpacing: '0.2em', marginBottom: '3rem', fontFamily: 'Montserrat, sans-serif' }}>
              118 premium pieces — available now
            </p>
            <Link href="/shop" className="rr-btn-primary">Shop Now</Link>
          </Reveal>
        </div>
      </section>

      {/* ══ GLOBAL STYLES ══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap');

        * { cursor: none !important; }

        @keyframes rrMarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes rrPulse {
          from { opacity: 0.2; }
          to   { opacity: 1; }
        }
        @keyframes rrScrollPulse {
          0%,100% { opacity: 1; transform: scaleY(1); }
          50%      { opacity: 0.2; transform: scaleY(0.4); }
        }

        /* Buttons */
        .rr-btn-primary {
          display: inline-block;
          padding: 1rem 2.8rem;
          background: #C9A84C;
          color: #0a0a0a;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.6rem;
          font-weight: 500;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          text-decoration: none;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .rr-btn-primary::before {
          content: '';
          position: absolute; inset: 0;
          background: #E8C96A;
          transform: translateX(-100%);
          transition: transform 0.45s cubic-bezier(0.16,1,0.3,1);
        }
        .rr-btn-primary:hover::before { transform: translateX(0); }
        .rr-btn-primary:hover { transform: translateY(-3px); }
        .rr-btn-primary > * { position: relative; z-index: 1; }

        .rr-btn-outline {
          display: inline-block;
          padding: 1rem 2.8rem;
          border: 1px solid rgba(201,168,76,0.45);
          color: #C9A84C;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.6rem;
          font-weight: 300;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          text-decoration: none;
          position: relative; overflow: hidden;
          transition: border-color 0.4s, transform 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .rr-btn-outline::before {
          content: '';
          position: absolute; inset: 0;
          background: rgba(201,168,76,0.07);
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.45s cubic-bezier(0.16,1,0.3,1);
        }
        .rr-btn-outline:hover::before { transform: scaleX(1); }
        .rr-btn-outline:hover { border-color: #C9A84C; transform: translateY(-3px); }
      `}</style>
    </div>
  );
}

/* ─── Value card with hover ─── */
function ValueCard({ value, index }) {
  const [hovered, setHovered] = useState(false);
  const romans = ['I', 'II', 'III', 'IV'];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(201,168,76,0.03)' : '#060606',
        padding: '3rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.4s',
      }}
    >
      {/* Background numeral */}
      <div style={{
        position: 'absolute',
        top: '-0.5rem', right: '1rem',
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: '5rem',
        fontWeight: 300,
        color: hovered ? 'rgba(201,168,76,0.09)' : 'rgba(201,168,76,0.035)',
        transition: 'color 0.4s',
        userSelect: 'none', pointerEvents: 'none',
      }}>{romans[index]}</div>

      <div style={{
        width: hovered ? '50px' : '24px',
        height: '1px',
        background: '#C9A84C',
        margin: '0 auto 1.5rem',
        transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)',
      }} />

      <h3 style={{
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: '1.4rem',
        fontWeight: 300,
        color: '#C9A84C',
        marginBottom: '0.8rem',
      }}>{value.title}</h3>

      <p style={{ fontSize: '0.68rem', color: '#777', lineHeight: 1.9, letterSpacing: '0.05em' }}>{value.desc}</p>
    </div>
  );
}