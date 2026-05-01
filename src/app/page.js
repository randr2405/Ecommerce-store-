'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';

function useElementScroll() {
  const ref = useRef(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const update = () => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const vh = window.innerHeight;
      setP(Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height))));
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);
  return [ref, p];
}

function ClickSpark({ children, sparkColor = '#ffffff', sparkSize = 10, sparkRadius = 15, sparkCount = 8, duration = 400 }) {
  const [sparks, setSparks] = useState([]);
  const handleClick = useCallback((e) => {
    const id = Date.now() + Math.random();
    setSparks(prev => [...prev, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setSparks(prev => prev.filter(s => s.id !== id)), duration);
  }, [duration]);
  return (
    <div onClick={handleClick} style={{ position: 'relative' }}>
      {children}
      {sparks.map(spark => (
        <svg key={spark.id} style={{ position: 'fixed', left: spark.x, top: spark.y, width: sparkRadius * 2, height: sparkRadius * 2, transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 99999, overflow: 'visible' }}>
          {Array.from({ length: sparkCount }).map((_, i) => {
            const angle = (i / sparkCount) * Math.PI * 2;
            return <line key={i} x1="0" y1="0" x2={Math.cos(angle) * sparkRadius} y2={Math.sin(angle) * sparkRadius} stroke={sparkColor} strokeWidth={sparkSize / 5} strokeLinecap="round" style={{ animation: `sparkFade ${duration}ms ease-out forwards` }} />;
          })}
        </svg>
      ))}
      <style>{`@keyframes sparkFade { from { opacity:1; } to { opacity:0; } }`}</style>
    </div>
  );
}

function LineWaves({ speed = 0.3, innerLineCount = 28, outerLineCount = 32, warpIntensity = 1, rotation = -45, colorCycleSpeed = 0.6, brightness = 0.35, color1 = '#ffffff', color2 = '#ffffff', enableMouseInteraction = true, mouseInfluence = 2, edgeFadeWidth = 0 }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, t = 0;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const onMove = (e) => { mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }; };
    if (enableMouseInteraction) window.addEventListener('mousemove', onMove);
    const hexToRgb = (hex) => {
      const clean = hex.replace(/`/g, '').trim();
      return [parseInt(clean.slice(1,3),16), parseInt(clean.slice(3,5),16), parseInt(clean.slice(5,7),16)];
    };
    const c1 = hexToRgb(color1), c2 = hexToRgb(color2);
    const draw = () => {
      t += speed * 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const total = innerLineCount + outerLineCount;
      const rad = rotation * Math.PI / 180;
      for (let li = 0; li < total; li++) {
        const frac = li / total;
        const cycle = (Math.sin(t * colorCycleSpeed + frac * Math.PI * 2) + 1) / 2;
        ctx.strokeStyle = `rgba(${Math.round(c1[0]+(c2[0]-c1[0])*cycle)},${Math.round(c1[1]+(c2[1]-c1[1])*cycle)},${Math.round(c1[2]+(c2[2]-c1[2])*cycle)},${brightness})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let si = 0; si <= 80; si++) {
          const u = si / 80;
          const warp = Math.sin(u * Math.PI * 3 + t + frac * Math.PI * 2) * warpIntensity * 20;
          const mx2 = (mouseRef.current.x - 0.5) * mouseInfluence * 30;
          const my2 = (mouseRef.current.y - 0.5) * mouseInfluence * 30;
          const bx = u * canvas.width, by = canvas.height * frac + warp + my2 * Math.sin(u * Math.PI);
          const cx2 = bx * Math.cos(rad) - by * Math.sin(rad) + mx2;
          const cy2 = bx * Math.sin(rad) + by * Math.cos(rad);
          si === 0 ? ctx.moveTo(cx2, cy2) : ctx.lineTo(cx2, cy2);
        }
        ctx.stroke();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); if (enableMouseInteraction) window.removeEventListener('mousemove', onMove); };
  }, [speed, innerLineCount, outerLineCount, warpIntensity, rotation, colorCycleSpeed, brightness, color1, color2, enableMouseInteraction, mouseInfluence]);
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

function Ribbons({ baseThickness = 30, colors = ['#5227FF'], speedMultiplier = 0.5, maxAge = 500, enableFade = false }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, t = 0;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const ribbons = colors.map((color, i) => ({ color, points: [], x: canvas.width * (0.2 + i * 0.3), y: canvas.height / 2, vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2 }));
    const hexToRgba = (hex, a) => {
      const clean = hex.replace(/`/g,'').trim();
      return `rgba(${parseInt(clean.slice(1,3),16)},${parseInt(clean.slice(3,5),16)},${parseInt(clean.slice(5,7),16)},${a})`;
    };
    const draw = () => {
      t += speedMultiplier * 0.5;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ribbons.forEach(r => {
        r.vx += Math.sin(t * 0.013 + r.y * 0.003) * 0.4;
        r.vy += Math.cos(t * 0.011 + r.x * 0.003) * 0.4;
        r.vx *= 0.97; r.vy *= 0.97;
        r.x += r.vx; r.y += r.vy;
        if (r.x < 0 || r.x > canvas.width) r.vx *= -1;
        if (r.y < 0 || r.y > canvas.height) r.vy *= -1;
        r.points.push({ x: r.x, y: r.y });
        if (r.points.length > maxAge) r.points.shift();
        if (r.points.length < 2) return;
        for (let i = 1; i < r.points.length; i++) {
          const prog = i / r.points.length;
          ctx.beginPath();
          ctx.moveTo(r.points[i-1].x, r.points[i-1].y);
          ctx.lineTo(r.points[i].x, r.points[i].y);
          ctx.strokeStyle = hexToRgba(r.color, enableFade ? prog * 0.7 : 0.6);
          ctx.lineWidth = baseThickness * prog;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [baseThickness, colors, speedMultiplier, maxAge, enableFade]);
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

function Antigravity({ count = 300, waveSpeed = 0.4, waveAmplitude = 1, particleSize = 1.5, lerpSpeed = 0.05, color = '#5227FF', particleVariance = 1, pulseSpeed = 3, particleShape = 'capsule', fieldStrength = 10 }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, t = 0;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const onMove = (e) => { const r = canvas.getBoundingClientRect(); mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }; };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', () => { mouseRef.current = { x: -9999, y: -9999 }; });
    const cleanColor = color.replace(/`/g,'').trim();
    const particles = Array.from({ length: count }).map(() => ({ ox: Math.random(), oy: Math.random(), x: Math.random(), y: Math.random(), phase: Math.random() * Math.PI * 2, size: particleSize * (0.5 + Math.random() * particleVariance) }));
    const draw = () => {
      t += waveSpeed * 0.016;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const mx = mouseRef.current.x, my = mouseRef.current.y;
      particles.forEach(p => {
        const wave = Math.sin(t * pulseSpeed + p.phase) * waveAmplitude * 8;
        const tx2 = p.ox * W + wave;
        const ty2 = p.oy * H + Math.cos(t * waveSpeed + p.phase) * waveAmplitude * 5;
        const dx = mx - tx2, dy = my - ty2;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const pull = dist < fieldStrength * 20 ? (1 - dist / (fieldStrength * 20)) * fieldStrength * 2 : 0;
        const fx = tx2 + dx * pull * 0.05, fy = ty2 + dy * pull * 0.05;
        p.x += (fx / W - p.x) * lerpSpeed; p.y += (fy / H - p.y) * lerpSpeed;
        ctx.fillStyle = cleanColor;
        ctx.globalAlpha = 0.7 + Math.sin(t * pulseSpeed + p.phase) * 0.3;
        ctx.beginPath();
        const px = p.x * W, py = p.y * H;
        if (particleShape === 'capsule') {
          const w = p.size * 3, h = p.size;
          if (ctx.roundRect) ctx.roundRect(px - w/2, py - h/2, w, h, h/2);
          else ctx.ellipse(px, py, w/2, h/2, 0, 0, Math.PI*2);
        } else {
          ctx.arc(px, py, p.size, 0, Math.PI*2);
        }
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); canvas.removeEventListener('mousemove', onMove); window.removeEventListener('resize', resize); };
  }, [count, waveSpeed, waveAmplitude, particleSize, lerpSpeed, color, particleVariance, pulseSpeed, particleShape, fieldStrength]);
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

function Ballpit({ count = 100, gravity = 0.01, friction = 0.9975, wallBounce = 0.95, followCursor = false }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    if (followCursor) {
      const onMove = (e) => { const r = canvas.getBoundingClientRect(); mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }; };
      canvas.addEventListener('mousemove', onMove);
    }
    const palette = ['#C9A84C','#C9A84C','#8B6914','#EDD070','#1a1a1a','#222','#2a2a2a','#111'];
    const balls = Array.from({ length: count }).map((_, i) => {
      const isGold = i % 3 === 0;
      return { x: Math.random() * (canvas.width || 800), y: Math.random() * 200, r: 8 + Math.random() * 18, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*2, color: isGold ? `hsl(${38+Math.random()*20},${70+Math.random()*20}%,${45+Math.random()*20}%)` : `hsl(0,0%,${8+Math.random()*22}%)`, isGold };
    });
    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      balls.forEach(b => {
        b.vy += gravity; b.vx *= friction; b.vy *= friction;
        b.x += b.vx; b.y += b.vy;
        if (b.x - b.r < 0) { b.x = b.r; b.vx *= -wallBounce; }
        if (b.x + b.r > W) { b.x = W - b.r; b.vx *= -wallBounce; }
        if (b.y - b.r < 0) { b.y = b.r; b.vy *= -wallBounce; }
        if (b.y + b.r > H) { b.y = H - b.r; b.vy *= -wallBounce; }
        for (let o of balls) {
          if (o === b) continue;
          const dx = o.x - b.x, dy = o.y - b.y, dist = Math.sqrt(dx*dx+dy*dy), minD = b.r + o.r;
          if (dist < minD && dist > 0) {
            const nx = dx/dist, ny = dy/dist, ov = (minD-dist)/2;
            b.x -= nx*ov; b.y -= ny*ov; o.x += nx*ov; o.y += ny*ov;
            const rv = (b.vx-o.vx)*nx + (b.vy-o.vy)*ny;
            if (rv > 0) { b.vx -= rv*nx; b.vy -= rv*ny; o.vx += rv*nx; o.vy += rv*ny; }
          }
        }
        const grad = ctx.createRadialGradient(b.x-b.r*0.3, b.y-b.r*0.3, b.r*0.1, b.x, b.y, b.r);
        grad.addColorStop(0, b.isGold ? 'rgba(255,220,100,0.95)' : 'rgba(60,60,60,0.9)');
        grad.addColorStop(1, b.color);
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
        ctx.fillStyle = grad; ctx.fill();
        if (b.isGold) { ctx.strokeStyle = 'rgba(201,168,76,0.5)'; ctx.lineWidth = 1; ctx.stroke(); }
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [count, gravity, friction, wallBounce, followCursor]);
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

function BounceCards({ images = [], containerWidth = 500, containerHeight = 250, animationDelay = 1, animationStagger = 0.08, transformStyles = [], enableHover = false }) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(-1);
  useEffect(() => { const t = setTimeout(() => setVisible(true), animationDelay * 1000); return () => clearTimeout(t); }, [animationDelay]);
  return (
    <div style={{ width: containerWidth, height: containerHeight, position: 'relative', margin: '0 auto' }}>
      {images.map((src, i) => (
        <div key={i} onMouseEnter={() => enableHover && setHovered(i)} onMouseLeave={() => enableHover && setHovered(-1)} style={{ position: 'absolute', left: '50%', top: '50%', width: '140px', height: '180px', marginLeft: '-70px', marginTop: '-90px', transform: visible ? (hovered === i ? 'scale(1.12) translateY(-12px)' : transformStyles[i] || 'none') : 'translateY(60px) scale(0.85)', opacity: visible ? 1 : 0, transition: `all 0.7s cubic-bezier(0.34,1.56,0.64,1) ${i * animationStagger}s`, borderRadius: '4px', overflow: 'hidden', boxShadow: hovered === i ? '0 30px 60px rgba(0,0,0,0.8), 0 0 40px rgba(201,168,76,0.15)' : '0 15px 50px rgba(0,0,0,0.7)', border: '1px solid rgba(201,168,76,0.1)' }}>
          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'contrast(1.1) brightness(0.9)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(4,3,2,0.7) 100%)' }} />
        </div>
      ))}
    </div>
  );
}

function GooeyNav({ items = [], initialActiveIndex = 0, particleCount = 15, animationTime = 600, colors = [1,2,3,1,2,3,1,4] }) {
  const [active, setActive] = useState(initialActiveIndex);
  const colorMap = { 1: '#C9A84C', 2: '#EDD070', 3: '#8B6914', 4: '#F5E6C8' };
  const [particles, setParticles] = useState([]);

  const triggerParticles = useCallback((x, y) => {
    const newP = Array.from({ length: particleCount }).map((_, i) => ({
      id: Date.now() + i,
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      color: colorMap[colors[i % colors.length]] || '#C9A84C',
      size: 4 + Math.random() * 8,
    }));
    setParticles(prev => [...prev, ...newP]);
    setTimeout(() => setParticles(prev => prev.filter(p => !newP.find(np => np.id === p.id))), animationTime);
  }, [particleCount, colors, animationTime]);

  return (
    <nav style={{ display: 'flex', gap: '2px', alignItems: 'center', background: 'rgba(6,5,3,0.98)', border: '1px solid rgba(201,168,76,0.2)', padding: '6px', backdropFilter: 'blur(30px)', position: 'relative' }}>
      {particles.map(p => (
        <div key={p.id} style={{ position: 'fixed', left: p.x, top: p.y, width: p.size, height: p.size, borderRadius: '50%', background: p.color, pointerEvents: 'none', zIndex: 99999, animation: `particleFly ${animationTime}ms ease-out forwards`, transform: `translate(${p.vx * 10}px, ${p.vy * 10}px)` }} />
      ))}
      {items.map((item, i) => (
        <Link key={i} href={item.href} onClick={(e) => { setActive(i); const rect = e.currentTarget.getBoundingClientRect(); triggerParticles(rect.left + rect.width/2, rect.top + rect.height/2); }} style={{ padding: '1rem 2rem', fontFamily: 'Montserrat, sans-serif', fontSize: '0.5rem', letterSpacing: '0.4em', textTransform: 'uppercase', textDecoration: 'none', color: active === i ? '#080604' : '#C9A84C', background: active === i ? 'linear-gradient(135deg, #C9A84C, #EDD070)' : 'transparent', transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)', display: 'block', position: 'relative' }}>
          {item.label}
        </Link>
      ))}
      <style>{`@keyframes particleFly { from { opacity:1; transform: scale(1); } to { opacity:0; transform: scale(0) translate(30px,-30px); } }`}</style>
    </nav>
  );
}

function DepthText({ children, gold = false, style = {} }) {
  const layers = gold ? 10 : 6;
  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      {Array.from({ length: layers }).map((_, i) => (
        <span key={i} aria-hidden="true" style={{ position: 'absolute', inset: 0, transform: `translateX(${(i+1)*1.2}px) translateY(${(i+1)*0.8}px)`, color: gold ? `rgba(100,65,0,${0.35 - i*0.032})` : `rgba(0,0,0,${0.6 - i*0.08})`, pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap', display: 'block' }}>{children}</span>
      ))}
      <span style={{ position: 'relative', display: 'block' }}>{children}</span>
    </div>
  );
}

function CategoryCard({ cat, index, sectionProgress }) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);
  const delay = index * 0.13;
  const cardProgress = Math.max(0, Math.min(1, (sectionProgress - 0.1 - delay) / 0.45));
  const enterZ = (1 - cardProgress) * -600;
  const enterRotY = (1 - cardProgress) * (index % 2 === 0 ? -55 : 55);
  const enterOp = Math.min(1, cardProgress * 1.2);
  const handleMouseMove = useCallback((e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: (e.clientX - rect.left) / rect.width - 0.5, y: (e.clientY - rect.top) / rect.height - 0.5 });
  }, []);
  const tiltX = hovered ? mousePos.y * -22 : 0;
  const tiltY = hovered ? mousePos.x * 28 : 0;
  return (
    <Link href={`/shop?category=${cat.label.toLowerCase()}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div ref={cardRef} onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setMousePos({ x: 0, y: 0 }); }} onMouseMove={handleMouseMove} style={{ perspective: '900px' }}>
        <div style={{ border: '1px solid', borderColor: hovered ? 'rgba(201,168,76,0.9)' : 'rgba(201,168,76,0.12)', padding: '4rem 2.8rem', background: hovered ? 'linear-gradient(145deg, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.02) 100%)' : 'rgba(5,4,3,0.97)', backdropFilter: 'blur(18px)', cursor: 'pointer', position: 'relative', overflow: 'hidden', transformStyle: 'preserve-3d', transform: `translateZ(${enterZ}px) rotateY(${enterRotY + tiltY}deg) rotateX(${tiltX}deg) ${hovered ? 'translateZ(20px)' : ''}`, opacity: enterOp, transition: hovered ? 'border-color 0.25s, background 0.25s, box-shadow 0.25s, transform 0.07s ease' : 'border-color 0.5s, background 0.5s, box-shadow 0.5s', boxShadow: hovered ? '0 40px 80px rgba(0,0,0,0.8), 0 0 60px rgba(201,168,76,0.15), inset 0 1px 0 rgba(201,168,76,0.15)' : '0 10px 40px rgba(0,0,0,0.5)', willChange: 'transform' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(201,168,76,0.006) 2px, rgba(201,168,76,0.006) 3px)', pointerEvents: 'none' }} />
          {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h], ci) => (
            <div key={ci} style={{ position: 'absolute', [v]: 0, [h]: 0, width: hovered ? '36px' : '14px', height: hovered ? '36px' : '14px', borderTop: v==='top' ? '1px solid #C9A84C' : 'none', borderBottom: v==='bottom' ? '1px solid #C9A84C' : 'none', borderLeft: h==='left' ? '1px solid #C9A84C' : 'none', borderRight: h==='right' ? '1px solid #C9A84C' : 'none', transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
          ))}
          <div style={{ position: 'absolute', bottom: 0, left: 0, height: '1px', width: hovered ? '100%' : '0%', background: 'linear-gradient(90deg, transparent, #C9A84C 30%, #C9A84C 70%, transparent)', transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)' }} />
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.65rem', color: hovered ? '#C9A84C' : 'rgba(201,168,76,0.2)', letterSpacing: '0.3em', marginBottom: '2rem', transition: 'color 0.4s' }}>{String(index + 1).padStart(2, '0')}</p>
          <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '2rem', transform: hovered ? 'scale(1.2) rotate(-10deg)' : 'scale(1) rotate(0)', transition: 'transform 0.55s cubic-bezier(0.16,1,0.3,1)', filter: hovered ? 'drop-shadow(0 0 20px rgba(201,168,76,0.5))' : 'none' }}>{cat.icon}</span>
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.1rem', fontWeight: 300, color: hovered ? '#FFFFFF' : '#D8D0C0', marginBottom: '0.8rem', transition: 'color 0.3s' }}>{cat.label}</h3>
          <p style={{ fontSize: '0.63rem', color: '#4A4030', letterSpacing: '0.12em', lineHeight: 2 }}>{cat.desc}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '2.2rem', opacity: hovered ? 1 : 0, transform: hovered ? 'translateX(0)' : 'translateX(-16px)', transition: 'all 0.45s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{ width: '24px', height: '1px', background: '#C9A84C' }} />
            <span style={{ fontSize: '0.52rem', color: '#C9A84C', letterSpacing: '0.35em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>Explore</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ValueCard({ value, index, sectionProgress }) {
  const [hovered, setHovered] = useState(false);
  const romans = ['I', 'II', 'III', 'IV'];
  const delay = index * 0.15;
  const cardP = Math.max(0, Math.min(1, (sectionProgress - 0.08 - delay) / 0.5));
  const entryY = (1 - cardP) * 120;
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ background: hovered ? 'rgba(201,168,76,0.04)' : 'rgba(4,3,2,0.97)', padding: '4rem 2.2rem', textAlign: 'center', position: 'relative', overflow: 'hidden', backdropFilter: 'blur(12px)', border: '1px solid', borderColor: hovered ? 'rgba(201,168,76,0.28)' : 'rgba(201,168,76,0.05)', transform: `translateY(${entryY}px)`, opacity: cardP, transition: hovered ? 'background 0.4s, border-color 0.4s, box-shadow 0.3s' : 'background 0.4s, border-color 0.4s', boxShadow: hovered ? '0 30px 80px rgba(0,0,0,0.7)' : 'none', willChange: 'transform, opacity' }}>
      <div style={{ position: 'absolute', top: '-1rem', right: '1.2rem', fontFamily: 'Cormorant Garamond, serif', fontSize: '6rem', fontWeight: 300, color: hovered ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.03)', transition: 'color 0.4s', userSelect: 'none', pointerEvents: 'none' }}>{romans[index]}</div>
      <div style={{ width: hovered ? '60px' : '20px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '0 auto 2rem', transition: 'width 0.55s cubic-bezier(0.16,1,0.3,1)' }} />
      <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', fontWeight: 300, color: hovered ? '#FFFFFF' : '#C9A84C', marginBottom: '1.2rem', transition: 'color 0.3s' }}>{value.title}</h3>
      <p style={{ fontSize: '0.64rem', color: '#555', lineHeight: 2.1, letterSpacing: '0.07em' }}>{value.desc}</p>
    </div>
  );
}

function Marquee() {
  const items = ['Premium Quality', '✦', 'South African Brand', '✦', 'Sport & Lifestyle', '✦', 'All Ages', '✦', 'Free Delivery', '✦', '118 Pieces', '✦'];
  return (
    <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', borderBottom: '1px solid rgba(201,168,76,0.15)', padding: '1.3rem 0', overflow: 'hidden', background: 'rgba(3,2,1,0.99)', backdropFilter: 'blur(10px)', position: 'relative', zIndex: 2 }}>
      <div style={{ display: 'flex', gap: '3rem', animation: 'rrMarquee 28s linear infinite', width: 'max-content' }}>
        {[...items, ...items].map((t, i) => (
          <span key={i} style={{ fontSize: '0.53rem', color: t === '✦' ? '#C9A84C' : '#3A3020', letterSpacing: '0.42em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: 'Montserrat, sans-serif' }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [heroVisible, setHeroVisible] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [cursorTrail, setCursorTrail] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorHover, setCursorHover] = useState(false);
  const trailRef = useRef({ x: 0, y: 0 });

  const [heroRef, heroScroll] = useElementScroll();
  const [collectionsRef, collectionsScroll] = useElementScroll();
  const [antigravRef, antigravScroll] = useElementScroll();
  const [brandRef, brandScroll] = useElementScroll();
  const [valuesRef, valuesScroll] = useElementScroll();

  useEffect(() => {
    let raf;
    const loop = () => {
      trailRef.current.x += (cursor.x - trailRef.current.x) * 0.1;
      trailRef.current.y += (cursor.y - trailRef.current.y) * 0.1;
      setCursorTrail({ x: trailRef.current.x, y: trailRef.current.y });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cursor]);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    const onMove = (e) => { setCursor({ x: e.clientX, y: e.clientY }); setCursorVisible(true); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', () => setCursorVisible(false));
    const addHover = () => {
      document.querySelectorAll('a, button').forEach(el => {
        el.addEventListener('mouseenter', () => setCursorHover(true));
        el.addEventListener('mouseleave', () => setCursorHover(false));
      });
    };
    addHover();
    const obs = new MutationObserver(addHover);
    obs.observe(document.body, { subtree: true, childList: true });
    return () => { clearTimeout(t); window.removeEventListener('mousemove', onMove); obs.disconnect(); };
  }, []);

  const categories = [
    { label: 'Menswear', desc: 'Sport & lifestyle essentials for the modern man', icon: '👔' },
    { label: 'Womenswear', desc: 'Elegant everyday wear, effortlessly refined', icon: '👗' },
    { label: 'Kiddies', desc: 'Stylish pieces crafted for little ones', icon: '🧒' },
    { label: 'Baby Wear', desc: 'Soft, premium comfort from day one', icon: '👶' },
  ];

  const values = [
    { title: 'Quality', desc: 'Only the finest materials, constructed to outlast trends and time.' },
    { title: 'Design', desc: 'Style meets function — every piece is entirely intentional.' },
    { title: 'Customer Focus', desc: 'You are at the heart of everything we create and do.' },
    { title: 'Innovation', desc: 'Always improving, always evolving, never standing still.' },
  ];

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    { label: 'Menswear', href: '/shop?category=menswear' },
    { label: 'Womenswear', href: '/shop?category=womenswear' },
    { label: 'About', href: '/about' },
  ];

  const bounceImages = [
    'https://picsum.photos/400/400?grayscale&random=10',
    'https://picsum.photos/500/500?grayscale&random=11',
    'https://picsum.photos/600/600?grayscale&random=12',
    'https://picsum.photos/700/700?grayscale&random=13',
    'https://picsum.photos/300/300?grayscale&random=14',
  ];

  const bounceTransforms = [
    'rotate(8deg) translate(-180px)',
    'rotate(3deg) translate(-90px)',
    'rotate(-2deg) translate(0px)',
    'rotate(-5deg) translate(90px)',
    'rotate(4deg) translate(180px)',
  ];

  const heroDepth = heroScroll * 80;
  const heroTiltX = heroScroll * 28;
  const heroOpacity = Math.max(0, 1 - heroScroll * 1.5);
  const brandTilt = (brandScroll - 0.5) * 16;
  const brandScale = 0.85 + brandScroll * 0.28;

  return (
    <ClickSpark sparkColor="#C9A84C" sparkSize={8} sparkRadius={18} sparkCount={10} duration={500}>
      <div style={{ paddingTop: '70px', background: '#040302', overflowX: 'hidden' }}>

        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.15 }}>
          <LineWaves speed={0.3} innerLineCount={32} outerLineCount={36} warpIntensity={1} rotation={-45} edgeFadeWidth={0} colorCycleSpeed={1} brightness={0.2} color1="#ffffff" color2="#ffffff" enableMouseInteraction mouseInfluence={2} />
        </div>

        <div style={{ position: 'fixed', left: cursor.x, top: cursor.y, width: cursorHover ? '5px' : '8px', height: cursorHover ? '5px' : '8px', background: '#C9A84C', borderRadius: '50%', pointerEvents: 'none', zIndex: 9999, transform: 'translate(-50%,-50%)', opacity: cursorVisible ? 1 : 0, transition: 'opacity 0.3s, width 0.2s, height 0.2s', mixBlendMode: 'difference' }} />
        <div style={{ position: 'fixed', left: cursorTrail.x, top: cursorTrail.y, width: cursorHover ? '55px' : '38px', height: cursorHover ? '55px' : '38px', border: '1px solid rgba(201,168,76,0.6)', borderRadius: '50%', pointerEvents: 'none', zIndex: 9998, transform: 'translate(-50%,-50%)', opacity: cursorVisible ? 0.8 : 0, transition: 'opacity 0.3s, width 0.4s cubic-bezier(0.16,1,0.3,1), height 0.4s cubic-bezier(0.16,1,0.3,1)' }} />

        <section ref={heroRef} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 2rem', position: 'relative', perspective: '1400px', perspectiveOrigin: '50% 50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)`, backgroundSize: '90px 90px', transform: `perspective(800px) rotateX(${55 + heroScroll * 15}deg) translateZ(-80px) scale(2.2)`, transformOrigin: '50% 100%', opacity: 0.5, zIndex: 1, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '900px', height: '900px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.015) 35%, transparent 65%)', pointerEvents: 'none', zIndex: 1, animation: 'rrBloom 4s ease-in-out infinite alternate' }} />

          <div style={{ maxWidth: '980px', position: 'relative', zIndex: 2, transformStyle: 'preserve-3d', transform: `rotateX(${heroTiltX}deg) translateZ(${-heroDepth}px)`, opacity: heroOpacity, willChange: 'transform, opacity' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.2rem', marginBottom: '3rem', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(24px)', transition: 'opacity 1s ease 0.2s, transform 1s ease 0.2s' }}>
              <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C)' }} />
              <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.55em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}>Premium Sport &amp; Lifestyle</p>
              <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
            </div>

            <div style={{ transformStyle: 'preserve-3d', perspective: '800px', marginBottom: '2rem' }}>
              {[{ text: 'R&R', gold: true, z: 40, delay: 0.35 }, { text: 'Sport &', gold: false, z: 20, delay: 0.52 }, { text: 'Lifestyle', gold: false, z: 0, delay: 0.69 }].map((word, i) => (
                <div key={i} style={{ overflow: 'hidden', lineHeight: 1.0, transformStyle: 'preserve-3d', transform: `translateZ(${word.z}px)` }}>
                  <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(100%)', transition: `opacity 1.2s cubic-bezier(0.16,1,0.3,1) ${word.delay}s, transform 1.2s cubic-bezier(0.16,1,0.3,1) ${word.delay}s` }}>
                    <DepthText gold={word.gold}>
                      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(4rem, 12vw, 10rem)', fontWeight: 300, color: word.gold ? '#C9A84C' : '#FFFFFF', display: 'block', letterSpacing: word.gold ? '-0.02em' : '-0.01em', textShadow: word.gold ? '0 0 80px rgba(201,168,76,0.5), 0 0 160px rgba(201,168,76,0.2)' : '0 0 60px rgba(255,255,255,0.1), 0 4px 30px rgba(0,0,0,0.9)', lineHeight: 1.02 }} dangerouslySetInnerHTML={{ __html: word.text }} />
                    </DepthText>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ width: heroVisible ? '140px' : '0px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '3rem auto', transition: 'width 1.6s cubic-bezier(0.16,1,0.3,1) 0.9s' }} />
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '4rem', fontFamily: 'Montserrat, sans-serif', fontWeight: 200, opacity: heroVisible ? 1 : 0, transition: 'opacity 1s ease 1.2s' }}>Own the Look · Own the Moment</p>

            <div style={{ display: 'flex', gap: '1.4rem', justifyContent: 'center', flexWrap: 'wrap', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(24px)', transition: 'opacity 1s ease 1.5s, transform 1s ease 1.5s' }}>
              <Link href="/shop" className="rr-btn-primary">Shop the Collection</Link>
              <Link href="/about" className="rr-btn-outline">Our Story</Link>
            </div>

            <div style={{ position: 'absolute', bottom: '-160px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', opacity: heroVisible ? 0.5 : 0, transition: 'opacity 1s ease 2.2s' }}>
              <p style={{ fontSize: '0.44rem', color: '#C9A84C', letterSpacing: '0.5em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>Scroll</p>
              <div style={{ width: '1px', height: '70px', background: 'linear-gradient(180deg, #C9A84C, transparent)', animation: 'rrScrollPulse 2s ease-in-out infinite' }} />
            </div>
          </div>

          {[0,1,2,3].map(i => (
            <div key={i} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 1 }}>
              <div style={{ width: `${380 + i * 220}px`, height: `${380 + i * 220}px`, borderRadius: '50%', border: `1px solid rgba(201,168,76,${0.06 - i * 0.01})`, animation: `rrRingPulse ${3.5 + i * 0.9}s ease-in-out infinite alternate`, animationDelay: `${i * 0.7}s` }} />
            </div>
          ))}
        </section>

        <div style={{ position: 'relative', zIndex: 2 }}>
          <Marquee />
        </div>

        <section style={{ position: 'relative', zIndex: 2, height: '500px', overflow: 'hidden', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
          <Ribbons baseThickness={30} colors={['#C9A84C', '#8B6914', '#EDD070']} speedMultiplier={0.5} maxAge={500} enableFade={false} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(4,3,2,0.6) 0%, rgba(4,3,2,0.25) 50%, rgba(4,3,2,0.6) 100%)' }}>
            <p style={{ fontSize: '0.5rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.7em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>Est. South Africa</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 300, color: 'rgba(255,255,255,0.1)', fontStyle: 'italic', letterSpacing: '0.08em' }}>Move in Gold</h2>
          </div>
        </section>

        <section style={{ padding: '11rem 4rem 10rem', maxWidth: '1380px', margin: '0 auto', position: 'relative', zIndex: 2, perspective: '1600px', perspectiveOrigin: '50% 35%' }} ref={collectionsRef}>
          <div style={{ textAlign: 'center', marginBottom: '5rem', transform: `translateY(${Math.max(0, (0.5 - collectionsScroll) * 70)}px)`, opacity: Math.min(1, collectionsScroll * 3.5) }}>
            <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.2rem', fontFamily: 'Montserrat, sans-serif' }}>Browse</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 300, color: '#FFFFFF', textShadow: '0 0 60px rgba(255,255,255,0.06)' }}>Our Collections</h2>
            <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '1.8rem auto 0' }} />
          </div>

          <div style={{ marginBottom: '6rem' }}>
            <BounceCards images={bounceImages} containerWidth={700} containerHeight={260} animationDelay={0.3} animationStagger={0.08} transformStyles={bounceTransforms} enableHover={true} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2px', background: 'rgba(201,168,76,0.04)', transformStyle: 'preserve-3d' }}>
            {categories.map((cat, i) => (
              <CategoryCard key={cat.label} cat={cat} index={i} sectionProgress={collectionsScroll} />
            ))}
          </div>
        </section>

        <section ref={antigravRef} style={{ padding: '9rem 2rem', textAlign: 'center', background: 'rgba(4,3,2,0.99)', position: 'relative', zIndex: 2, overflow: 'hidden', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto 5rem', opacity: Math.min(1, antigravScroll * 3), transform: `translateY(${Math.max(0, (0.4 - antigravScroll) * 60)}px)` }}>
            <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.2rem', fontFamily: 'Montserrat, sans-serif' }}>The Experience</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem, 7vw, 5rem)', fontWeight: 300, color: '#FFFFFF' }}>
              Crafted with <span style={{ color: '#C9A84C', fontStyle: 'italic' }}>intention</span>
            </h2>
            <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '1.8rem auto 0' }} />
            <p style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', lineHeight: 2, marginTop: '2rem' }}>Move your cursor through the field. Every detail responds with intention.</p>
          </div>
          <div style={{ width: '100%', height: '400px', position: 'relative' }}>
            <Antigravity count={300} waveSpeed={0.4} waveAmplitude={1} particleSize={1.5} lerpSpeed={0.05} color="#C9A84C" particleVariance={1} pulseSpeed={3} particleShape="capsule" fieldStrength={10} />
          </div>
        </section>

        <section style={{ overflow: 'hidden', position: 'relative', zIndex: 2, background: 'rgba(3,2,1,0.99)', borderTop: '1px solid rgba(201,168,76,0.08)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
          <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '0.8rem', fontFamily: 'Montserrat, sans-serif', opacity: 0.5 }}>118 Pieces</p>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 300, color: 'rgba(255,255,255,0.06)', fontStyle: 'italic' }}>Premium</h2>
            </div>
          </div>
          <div style={{ position: 'relative', minHeight: '500px', maxHeight: '500px', width: '100%' }}>
            <Ballpit count={100} gravity={0.01} friction={0.9975} wallBounce={0.95} followCursor={false} />
          </div>
        </section>

        <section ref={brandRef} style={{ background: 'rgba(5,4,2,0.98)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '11rem 2rem', textAlign: 'center', position: 'relative', zIndex: 2, overflow: 'hidden', perspective: '1200px' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(10rem, 28vw, 24rem)', color: 'transparent', WebkitTextStroke: '1px rgba(201,168,76,0.04)', userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap', fontWeight: 300, transform: `translate(-50%,-50%) rotateX(${brandTilt}deg) scale(${brandScale})`, willChange: 'transform' }}>R&amp;R</div>
          <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1, transform: `rotateX(${brandTilt * 0.45}deg) scale(${0.94 + brandScroll * 0.09})`, opacity: Math.min(1, brandScroll * 3), willChange: 'transform, opacity' }}>
            <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '2.2rem', fontFamily: 'Montserrat, sans-serif' }}>Our Mission</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2rem, 5vw, 3.8rem)', fontWeight: 300, fontStyle: 'italic', color: '#FFFFFF', lineHeight: 1.65, textShadow: '0 0 80px rgba(255,255,255,0.05)' }}>
              "Premium clothing that combines{' '}
              <span style={{ color: '#C9A84C', fontStyle: 'normal', textShadow: '0 0 40px rgba(201,168,76,0.35)' }}>elegance with comfort</span>,
              designed for the modern individual who lives without compromise."
            </h2>
            <div style={{ width: '70px', height: '1px', background: '#C9A84C', margin: '3.5rem auto 3rem' }} />
            <Link href="/about" className="rr-btn-outline">Read Our Story</Link>
          </div>
        </section>

        <section style={{ padding: '9rem 2rem', textAlign: 'center', background: '#040302', position: 'relative', zIndex: 2 }}>
          <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.5rem', fontFamily: 'Montserrat, sans-serif' }}>Navigate</p>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem, 6vw, 4.5rem)', fontWeight: 300, color: '#FFFFFF', marginBottom: '4rem' }}>Explore R&amp;R</h2>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GooeyNav items={navItems} initialActiveIndex={0} particleCount={15} animationTime={600} colors={[1, 2, 3, 1, 2, 3, 1, 4]} />
          </div>
        </section>

        <section ref={valuesRef} style={{ padding: '11rem 4rem', maxWidth: '1300px', margin: '0 auto', position: 'relative', zIndex: 2, perspective: '1400px', perspectiveOrigin: '50% 25%' }}>
          <div style={{ textAlign: 'center', marginBottom: '6rem', transform: `translateY(${Math.max(0, (0.4 - valuesScroll) * 70)}px)`, opacity: Math.min(1, valuesScroll * 3.5) }}>
            <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.2rem', fontFamily: 'Montserrat, sans-serif' }}>What We Stand For</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 300, color: '#FFFFFF', textShadow: '0 0 60px rgba(255,255,255,0.06)' }}>Our Values</h2>
            <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '1.8rem auto 0' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2px', background: 'rgba(201,168,76,0.04)', transformStyle: 'preserve-3d' }}>
            {values.map((v, i) => (
              <ValueCard key={v.title} value={v} index={i} sectionProgress={valuesScroll} />
            ))}
          </div>
        </section>

        <section style={{ padding: '14rem 2rem', textAlign: 'center', background: 'linear-gradient(180deg, rgba(4,3,2,0.97) 0%, rgba(6,5,2,0.99) 100%)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(201,168,76,0.1)', position: 'relative', zIndex: 2, overflow: 'hidden', perspective: '1200px' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: `${i * 20}vw`, height: `${i * 20}vw`, borderRadius: '50%', border: `1px solid rgba(201,168,76,${0.08 - i * 0.01})`, transform: `translate(-50%, -50%)`, animation: `rrRingPulse ${2.5 + i * 0.6}s ease-in-out infinite alternate`, animationDelay: `${i * 0.4}s`, pointerEvents: 'none' }} />
          ))}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '2rem', fontFamily: 'Montserrat, sans-serif' }}>118 premium pieces — available now</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(3rem, 9vw, 7.5rem)', fontWeight: 300, lineHeight: 1.05, marginBottom: '4rem' }}>
              <span style={{ color: '#FFFFFF', textShadow: '0 0 80px rgba(255,255,255,0.08)', display: 'block' }}>Ready to</span>
              <span style={{ color: '#C9A84C', textShadow: '0 0 80px rgba(201,168,76,0.5), 0 0 160px rgba(201,168,76,0.18)', fontStyle: 'italic', display: 'block' }}>elevate</span>
              <span style={{ color: '#FFFFFF', textShadow: '0 0 80px rgba(255,255,255,0.08)', display: 'block' }}>your wardrobe?</span>
            </h2>
            <Link href="/shop" className="rr-btn-primary">Shop Now</Link>
          </div>
        </section>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap');
          * { cursor: none !important; }
          html { scroll-behavior: smooth; }
          @keyframes rrMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          @keyframes rrScrollPulse { 0%,100% { opacity:0.8; transform:scaleY(1); } 50% { opacity:0.1; transform:scaleY(0.2); } }
          @keyframes rrRingPulse { from { opacity:0.1; transform:translate(-50%,-50%) scale(0.96); } to { opacity:0.5; transform:translate(-50%,-50%) scale(1.04); } }
          @keyframes rrBloom { from { opacity:0.5; transform:translate(-50%,-50%) scale(0.95); } to { opacity:1.0; transform:translate(-50%,-50%) scale(1.05); } }
          .rr-btn-primary { display:inline-block; padding:1.15rem 3.2rem; background:#C9A84C; color:#080604; font-family:'Montserrat',sans-serif; font-size:0.57rem; font-weight:500; letter-spacing:0.4em; text-transform:uppercase; text-decoration:none; position:relative; overflow:hidden; transition:transform 0.35s cubic-bezier(0.16,1,0.3,1),box-shadow 0.35s; box-shadow:0 8px 40px rgba(201,168,76,0.18); }
          .rr-btn-primary::before { content:''; position:absolute; inset:0; background:#EDD070; transform:translateX(-101%); transition:transform 0.55s cubic-bezier(0.16,1,0.3,1); }
          .rr-btn-primary:hover::before { transform:translateX(0); }
          .rr-btn-primary:hover { transform:translateY(-5px); box-shadow:0 25px 60px rgba(201,168,76,0.3); }
          .rr-btn-outline { display:inline-block; padding:1.15rem 3.2rem; border:1px solid rgba(201,168,76,0.5); color:#C9A84C; font-family:'Montserrat',sans-serif; font-size:0.57rem; font-weight:300; letter-spacing:0.4em; text-transform:uppercase; text-decoration:none; position:relative; overflow:hidden; transition:border-color 0.4s,transform 0.35s cubic-bezier(0.16,1,0.3,1),box-shadow 0.35s; }
          .rr-btn-outline::before { content:''; position:absolute; inset:0; background:rgba(201,168,76,0.07); transform:scaleX(0); transform-origin:left; transition:transform 0.55s cubic-bezier(0.16,1,0.3,1); }
          .rr-btn-outline:hover::before { transform:scaleX(1); }
          .rr-btn-outline:hover { border-color:#C9A84C; transform:translateY(-5px); box-shadow:0 20px 50px rgba(201,168,76,0.12); }
        `}</style>
      </div>
    </ClickSpark>
  );
}