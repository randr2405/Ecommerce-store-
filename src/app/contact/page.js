'use client';

import { useState, useRef, useEffect } from 'react';

const LetterGlitch = ({
  glitchColors = ['#C9A84C', '#8B6914', '#1A1A0A'],
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ paddingTop: '70px' }}>

      <section style={{
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
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#F5F0E8', marginTop: '0.5rem' }}>Contact Us</h1>
          <div className="divider-gold" />
          <p style={{ fontSize: '0.85rem', color: '#999', maxWidth: '500px', margin: '0 auto', lineHeight: 1.9 }}>
            Have questions about our products or need assistance with your order? We're here to help.
          </p>
        </div>
      </section>

      <section style={{ padding: '6rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '5rem', alignItems: 'start' }}>

          <div>
            <p className="section-label" style={{ marginBottom: '2rem' }}>Our Details</p>

            {[
              {
                label: 'Our Location',
                value: 'SBDC Building, 2 Columbus Rd\nVerulam, Unit 13',
                icon: '📍',
              },
              {
                label: 'Email Us',
                value: 'info@randragencies.online',
                icon: '✉️',
                href: 'mailto:info@randragencies.online',
              },
              {
                label: 'Call Us',
                value: '081 336 5266',
                icon: '📞',
                href: 'tel:+27813365266',
              },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', gap: '1.25rem', marginBottom: '2.5rem', alignItems: 'flex-start' }}>
                <div style={{
                  fontSize: '1.2rem',
                  width: '45px',
                  height: '45px',
                  border: '1px solid rgba(201,168,76,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
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

            <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: '2rem', marginTop: '1rem' }}>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '1rem' }}>
                Business Hours
              </p>
              {[
                { day: 'Monday – Friday', hours: '8:00 AM – 5:00 PM' },
                { day: 'Saturday', hours: '9:00 AM – 2:00 PM' },
                { day: 'Sunday', hours: 'Closed' },
              ].map(h => (
                <div key={h.day} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <p style={{ fontSize: '0.78rem', color: '#888' }}>{h.day}</p>
                  <p style={{ fontSize: '0.78rem', color: h.hours === 'Closed' ? '#555' : '#ccc' }}>{h.hours}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid rgba(201,168,76,0.2)', padding: '3rem', background: '#0F0F0F' }}>
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
                <h2 style={{ fontSize: '1.8rem', color: '#F5F0E8', marginBottom: '2rem' }}>We'd Love to Hear From You</h2>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', display: 'block', marginBottom: '0.5rem' }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your full name"
                    style={{
                      width: '100%', background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.2)',
                      color: '#F5F0E8', padding: '0.85rem 1rem', fontSize: '0.82rem',
                      fontFamily: 'Montserrat, sans-serif', outline: 'none', letterSpacing: '0.03em',
                    }}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'}
                    onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', display: 'block', marginBottom: '0.5rem' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    style={{
                      width: '100%', background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.2)',
                      color: '#F5F0E8', padding: '0.85rem 1rem', fontSize: '0.82rem',
                      fontFamily: 'Montserrat, sans-serif', outline: 'none', letterSpacing: '0.03em',
                    }}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'}
                    onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
                  />
                </div>

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
                      fontFamily: 'Montserrat, sans-serif', outline: 'none', letterSpacing: '0.03em', resize: 'vertical',
                    }}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'}
                    onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  className="btn-gold"
                  style={{ width: '100%', cursor: 'pointer', border: 'none' }}
                >
                  Send Message
                </button>
              </>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}