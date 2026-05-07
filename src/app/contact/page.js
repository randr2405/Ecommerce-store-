'use client';

import { useState, useRef, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import Grainient from './Grainient';

const LetterGlitch = ({
  glitchColors = ['#C9A84C', '#7A5F1A', '#1A1A0A'],
  className = '',
  glitchSpeed = 50,
  centerVignette = false,
  outerVignette = true,
  smooth = true,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789'
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const letters = useRef([]);
  const grid = useRef({ columns: 0, rows: 0 });
  const context = useRef(null);
  const lastGlitchTime = useRef(Date.now());

  const lettersAndSymbols = Array.from(characters);
  const fontSize = 16;
  const charWidth = 10;
  const charHeight = 20;

  const getRandomChar = () => lettersAndSymbols[Math.floor(Math.random() * lettersAndSymbols.length)];
  const getRandomColor = () => glitchColors[Math.floor(Math.random() * glitchColors.length)];

  const hexToRgb = hex => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : null;
  };

  const interpolateColor = (start, end, factor) => {
    const result = {
      r: Math.round(start.r + (end.r - start.r) * factor),
      g: Math.round(start.g + (end.g - start.g) * factor),
      b: Math.round(start.b + (end.b - start.b) * factor),
    };
    return `rgb(${result.r}, ${result.g}, ${result.b})`;
  };

  const calculateGrid = (width, height) => ({
    columns: Math.ceil(width / charWidth),
    rows: Math.ceil(height / charHeight),
  });

  const initializeLetters = (columns, rows) => {
    grid.current = { columns, rows };
    letters.current = Array.from({ length: columns * rows }, () => ({
      char: getRandomChar(),
      color: getRandomColor(),
      targetColor: getRandomColor(),
      colorProgress: 1,
    }));
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    if (context.current) context.current.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { columns, rows } = calculateGrid(rect.width, rect.height);
    initializeLetters(columns, rows);
    drawLetters();
  };

  const drawLetters = () => {
    if (!context.current || letters.current.length === 0) return;
    const ctx = context.current;
    const { width, height } = canvasRef.current.getBoundingClientRect();
    ctx.clearRect(0, 0, width, height);
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = 'top';
    letters.current.forEach((letter, index) => {
      const x = (index % grid.current.columns) * charWidth;
      const y = Math.floor(index / grid.current.columns) * charHeight;
      ctx.fillStyle = letter.color;
      ctx.fillText(letter.char, x, y);
    });
  };

  const updateLetters = () => {
    if (!letters.current || letters.current.length === 0) return;
    const updateCount = Math.max(1, Math.floor(letters.current.length * 0.05));
    for (let i = 0; i < updateCount; i++) {
      const index = Math.floor(Math.random() * letters.current.length);
      if (!letters.current[index]) continue;
      letters.current[index].char = getRandomChar();
      letters.current[index].targetColor = getRandomColor();
      if (!smooth) {
        letters.current[index].color = letters.current[index].targetColor;
        letters.current[index].colorProgress = 1;
      } else {
        letters.current[index].colorProgress = 0;
      }
    }
  };

  const handleSmoothTransitions = () => {
    let needsRedraw = false;
    letters.current.forEach(letter => {
      if (letter.colorProgress < 1) {
        letter.colorProgress += 0.05;
        if (letter.colorProgress > 1) letter.colorProgress = 1;
        const startRgb = hexToRgb(letter.color);
        const endRgb = hexToRgb(letter.targetColor);
        if (startRgb && endRgb) {
          letter.color = interpolateColor(startRgb, endRgb, letter.colorProgress);
          needsRedraw = true;
        }
      }
    });
    if (needsRedraw) drawLetters();
  };

  const animate = () => {
    const now = Date.now();
    if (now - lastGlitchTime.current >= glitchSpeed) {
      updateLetters();
      drawLetters();
      lastGlitchTime.current = now;
    }
    if (smooth) handleSmoothTransitions();
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    context.current = canvas.getContext('2d');
    resizeCanvas();
    animate();
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        cancelAnimationFrame(animationRef.current);
        resizeCanvas();
        animate();
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [glitchSpeed, smooth]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#0A0A0A', overflow: 'hidden' }} className={className}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {outerVignette && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 100%)',
        }} />
      )}
      {centerVignette && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)',
        }} />
      )}
    </div>
  );
};

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
        {
          from_name: formData.name,
          from_email: formData.email,
          message: formData.message,
        },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
      );
      setSubmitted(true);
    } catch (err) {
      console.log('EmailJS error:', JSON.stringify(err));
      console.log('Status:', err.status);
      console.log('Text:', err.text);
      setError('Something went wrong. Please try again or email us directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* ── Mobile nav ── */
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
          background: rgba(5, 5, 5, 0.97);
          z-index: 150;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2.5rem;
        }
        .mobile-nav.open { display: flex; }
        .mobile-nav a {
          font-size: 1.5rem;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #F5F0E8;
          text-decoration: none;
          font-family: Montserrat, sans-serif;
          transition: color 0.2s;
        }
        .mobile-nav a:hover { color: #C9A84C; }

        /* ── Contact grid ── */
        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 5rem;
          align-items: start;
        }

        /* ── WhatsApp section inner ── */
        .whatsapp-inner {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 4rem 2rem;
        }

        @media (max-width: 768px) {
          .hamburger { display: flex; }
          .desktop-nav { display: none !important; }

          .contact-grid {
            grid-template-columns: 1fr;
            gap: 3rem;
          }

          .hero-section {
            padding: 4rem 1.5rem !important;
          }

          .contact-section {
            padding: 4rem 1.5rem !important;
          }

          .form-box {
            padding: 2rem 1.5rem !important;
          }

          .whatsapp-inner {
            padding: 3rem 1.5rem;
          }
        }
      `}</style>

      {/* ── Mobile nav overlay ── */}
      <div className={`mobile-nav ${menuOpen ? 'open' : ''}`}>
        <a href="/shop" onClick={() => setMenuOpen(false)}>Shop</a>
        <a href="/about" onClick={() => setMenuOpen(false)}>About</a>
        <a href="/contact" onClick={() => setMenuOpen(false)}>Contact</a>
      </div>

      {/* ── Navbar (mobile hamburger injected via CSS; desktop nav hidden via class) ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem', height: '70px',
        background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(201,168,76,0.12)',
      }}>
        <a href="/" style={{ textDecoration: 'none', color: '#C9A84C', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.1em' }}>
          R&R <span style={{ color: '#F5F0E8', fontWeight: 300 }}>AGENCIES</span>
        </a>

        {/* Desktop nav */}
        <nav className="desktop-nav" style={{ display: 'flex', gap: '2.5rem' }}>
          {['Shop', 'About', 'Contact'].map(item => (
            <a key={item} href={`/${item.toLowerCase()}`} style={{
              fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase',
              color: '#ccc', textDecoration: 'none', fontFamily: 'Montserrat, sans-serif',
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => e.target.style.color = '#C9A84C'}
              onMouseLeave={e => e.target.style.color = '#ccc'}
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Hamburger */}
        <button className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
      </div>

      <div style={{ paddingTop: '70px' }}>

        {/* ── Hero ── */}
        <section className="hero-section" style={{
          position: 'relative',
          padding: '6rem 2rem',
          textAlign: 'center',
          borderBottom: '1px solid rgba(201,168,76,0.15)',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <LetterGlitch
              glitchColors={['#C9A84C', '#7A5F1A', '#1A1A0A']}
              glitchSpeed={60}
              outerVignette={true}
              centerVignette={true}
              smooth={true}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(10,10,10,0.82) 0%, rgba(26,26,10,0.72) 50%, rgba(10,10,10,0.82) 100%)',
            }} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p className="section-label">Get In Touch</p>
            <h1 style={{ fontSize: 'clamp(2rem, 6vw, 5rem)', color: '#F5F0E8', marginTop: '0.5rem' }}>Contact Us</h1>
            <div className="divider-gold" />
            <p style={{ fontSize: '0.85rem', color: '#999', maxWidth: '500px', margin: '0 auto', lineHeight: 1.9 }}>
              Have questions about our products or need assistance with your order? We're here to help.
            </p>
          </div>
        </section>

        {/* ── Contact form + details ── */}
        <section className="contact-section" style={{ padding: '6rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
          <div className="contact-grid">

            {/* Details */}
            <div>
              <p className="section-label" style={{ marginBottom: '2rem' }}>Our Details</p>
              {[
                { label: 'Our Location', value: 'SBDC Building, 2 Columbus Rd\nVerulam, Unit 13', icon: '📍' },
                { label: 'Email Us', value: 'info@randragencies.online', icon: '✉️', href: 'mailto:info@randragencies.online' },
                { label: 'Call Us', value: '081 336 5266', icon: '📞', href: 'tel:+27813365266' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', gap: '1.25rem', marginBottom: '2.5rem', alignItems: 'flex-start' }}>
                  <div style={{
                    fontSize: '1.2rem', width: '45px', height: '45px',
                    border: '1px solid rgba(201,168,76,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '0.4rem' }}>
                      {item.label}
                    </p>
                    {item.href ? (
                      <a href={item.href} style={{ fontSize: '0.85rem', color: '#ccc', textDecoration: 'none', lineHeight: 1.6 }}
                        onMouseEnter={e => e.target.style.color = '#C9A84C'}
                        onMouseLeave={e => e.target.style.color = '#ccc'}
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="form-box" style={{ border: '1px solid rgba(201,168,76,0.2)', padding: '3rem', background: '#0F0F0F' }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✉️</div>
                  <h3 style={{ fontSize: '1.8rem', color: '#C9A84C', marginBottom: '1rem' }}>Message Sent</h3>
                  <div style={{ width: '40px', height: '1px', background: '#C9A84C', margin: '0 auto 1.5rem' }} />
                  <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.8 }}>
                    Thank you for reaching out. We'll get back to you as soon as possible.
                  </p>
                  <button
                    onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', message: '' }); }}
                    className="btn-outline-gold"
                    style={{ marginTop: '2rem', cursor: 'pointer', border: '1px solid #C9A84C' }}
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <>
                  <p className="section-label" style={{ marginBottom: '0.5rem' }}>Send a Message</p>
                  <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', color: '#F5F0E8', marginBottom: '2rem' }}>We'd Love to Hear From You</h2>

                  {[
                    { key: 'name', label: 'Name', type: 'text', placeholder: 'Your full name' },
                    { key: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
                  ].map(field => (
                    <div key={field.key} style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', display: 'block', marginBottom: '0.5rem' }}>
                        {field.label} *
                      </label>
                      <input
                        type={field.type}
                        value={formData[field.key]}
                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        style={{
                          width: '100%', background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.2)',
                          color: '#F5F0E8', padding: '0.85rem 1rem', fontSize: '0.82rem',
                          fontFamily: 'Montserrat, sans-serif', outline: 'none', letterSpacing: '0.03em',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => e.target.style.borderColor = '#C9A84C'}
                        onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
                      />
                    </div>
                  ))}

                  <div style={{ marginBottom: '2rem' }}>
                    <label style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', display: 'block', marginBottom: '0.5rem' }}>
                      Message *
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we help you?"
                      rows={5}
                      style={{
                        width: '100%', background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.2)',
                        color: '#F5F0E8', padding: '0.85rem 1rem', fontSize: '0.82rem',
                        fontFamily: 'Montserrat, sans-serif', outline: 'none', letterSpacing: '0.03em',
                        resize: 'vertical', boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = '#C9A84C'}
                      onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
                    />
                  </div>

                  {error && (
                    <p style={{ fontSize: '0.78rem', color: '#c0392b', marginBottom: '1rem', lineHeight: 1.6 }}>
                      {error}
                    </p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={loading || !formData.name || !formData.email || !formData.message}
                    className="btn-gold"
                    style={{
                      width: '100%', cursor: loading || !formData.name || !formData.email || !formData.message ? 'not-allowed' : 'pointer',
                      border: 'none', opacity: loading || !formData.name || !formData.email || !formData.message ? 0.6 : 1,
                    }}
                  >
                    {loading ? 'Sending...' : 'Send Message'}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── WhatsApp section with Grainient background ── */}
        <section style={{
          position: 'relative',
          borderTop: '1px solid rgba(201,168,76,0.15)',
          overflow: 'hidden',
        }}>
          {/* Grainient background — themed to gold/dark */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <Grainient
              color1="#C9A84C"
              color2="#1A1A0A"
              color3="#7A5F1A"
              timeSpeed={0.25}
              colorBalance={0}
              warpStrength={1}
              warpFrequency={5}
              warpSpeed={2}
              warpAmplitude={50}
              blendAngle={0}
              blendSoftness={0.05}
              rotationAmount={500}
              noiseScale={2}
              grainAmount={0.12}
              grainScale={2}
              grainAnimated={false}
              contrast={1.5}
              gamma={1}
              saturation={0.7}
              centerX={0}
              centerY={0}
              zoom={0.9}
            />
            {/* Dark overlay so text stays readable */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(5,5,5,0.78) 0%, rgba(10,10,5,0.65) 50%, rgba(5,5,5,0.78) 100%)',
            }} />
          </div>

          {/* Content */}
          <div className="whatsapp-inner">
            <p className="section-label">Stay Connected</p>
            <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', color: '#F5F0E8', margin: '0.5rem 0 1rem' }}>Join Our WhatsApp Group</h2>
            <div className="divider-gold" />
            <p style={{ fontSize: '0.82rem', color: 'rgba(245,240,232,0.65)', maxWidth: '400px', margin: '0 auto 2rem', lineHeight: 1.8 }}>
              Get exclusive updates, new arrivals, and special offers directly on WhatsApp.
            </p>
            <a
              href="https://chat.whatsapp.com/BOOmpqMbaIoGTRSHWuOZrJ"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                background: '#25D366', color: '#fff',
                padding: '0.9rem 2rem',
                fontSize: '0.82rem', fontFamily: 'Montserrat, sans-serif',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                textDecoration: 'none', fontWeight: '600', transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Join R&R Privé
            </a>
          </div>
        </section>

      </div>
    </>
  );
}