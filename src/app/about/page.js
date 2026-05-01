'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';

/* ═══════════════════════════════════════════════
   SCROLL PROGRESS — per-element
═══════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════
   THREE.JS — ZERO GRAVITY SPACE SCENE
═══════════════════════════════════════════════ */
function ThreeBackground({ scrollRef, mouseRef }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let cleanupFn = () => {};

    import('three').then((THREE) => {
      const scene    = new THREE.Scene();
      scene.fog      = new THREE.FogExp2(0x010101, 0.0025);
      const camera   = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1400);
      camera.position.set(0, 0, 120);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const GOLD     = 0xC9A84C;
      const GOLD_DIM = 0x8B6914;
      const WHITE    = 0xDDDDDD;

      const mat = (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      const matGB = mat(GOLD,     0.8);
      const matGM = mat(GOLD,     0.3);
      const matGF = mat(GOLD_DIM, 0.1);
      const matW  = mat(WHITE,    0.05);

      const objects = [];

      const makeCircle = (radius, segs, m) => {
        const pts = [];
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
        }
        return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m);
      };

      /* ── TUNNEL RINGS ── */
      for (let i = 0; i < 36; i++) {
        const z      = 80 - i * 20;
        const radius = 65 + i * 4;
        const m      = i < 3 ? matGB : i < 10 ? matGM : matGF;
        const ring   = makeCircle(radius, 128, m);
        ring.position.z = z;
        ring.userData   = { type: 'ring', ry: 0.00018 * (i % 2 === 0 ? 1 : -1), rx: 0.00008 * (i % 3 === 0 ? 1 : -1) };
        scene.add(ring); objects.push(ring);
        if (i % 4 === 0 && i < 24) {
          const inner = makeCircle(radius * 0.62, 128, matGF);
          inner.position.z = z;
          inner.userData   = { type: 'ring', ry: 0.00012 };
          scene.add(inner); objects.push(inner);
        }
      }

      /* ── FREE-FLOATING ORBITAL RINGS — zero gravity debris ── */
      const orbitalConfigs = [
        { x: -160, y:  40, z: -80,  r: 55,  rx: 1.1,  ry: 0.3,  m: matGM,  drift: { x: 0.004,  y: 0.003,  rz: 0.0006 } },
        { x:  170, y: -30, z: -120, r: 70,  rx: -0.8, ry: 0.5,  m: matGM,  drift: { x: -0.003, y: 0.005,  rz: -0.0005 } },
        { x: -80,  y: -90, z: -200, r: 90,  rx: 0.5,  ry: 1.2,  m: matGF,  drift: { x: 0.002,  y: -0.003, rz: 0.0004 } },
        { x:  100, y:  80, z: -180, r: 60,  rx: -1.4, ry: -0.6, m: matGF,  drift: { x: -0.005, y: 0.002,  rz: 0.0007 } },
        { x:  0,   y:  60, z: -350, r: 130, rx: 0.3,  ry: 0.8,  m: matGF,  drift: { x: 0.001,  y: -0.001, rz: -0.0003 } },
        { x: -220, y: -50, z: -300, r: 100, rx: 1.5,  ry: 0.2,  m: matGF,  drift: { x: 0.003,  y: 0.004,  rz: 0.0002 } },
        { x:  240, y:  20, z: -260, r: 85,  rx: -0.6, ry: 1.0,  m: matGF,  drift: { x: -0.002, y: -0.003, rz: -0.0006 } },
      ];
      orbitalConfigs.forEach(cfg => {
        const ring = makeCircle(cfg.r, 128, cfg.m);
        ring.position.set(cfg.x, cfg.y, cfg.z);
        ring.rotation.x = cfg.rx;
        ring.rotation.y = cfg.ry;
        ring.userData = { type: 'orbital', drift: cfg.drift, origin: { x: cfg.x, y: cfg.y, z: cfg.z }, t: Math.random() * 100 };
        scene.add(ring); objects.push(ring);
      });

      /* ── FLOATING SQUARE FRAGMENTS ── */
      for (let i = 0; i < 18; i++) {
        const size = 15 + Math.random() * 50;
        const pts = [
          new THREE.Vector3(-size/2, -size/2, 0), new THREE.Vector3( size/2, -size/2, 0),
          new THREE.Vector3( size/2,  size/2, 0), new THREE.Vector3(-size/2,  size/2, 0),
          new THREE.Vector3(-size/2, -size/2, 0),
        ];
        const sq = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), Math.random() > 0.6 ? matGF : matW);
        sq.position.set((Math.random()-0.5)*500, (Math.random()-0.5)*250, Math.random()*500 - 380);
        sq.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        sq.userData = {
          type: 'fragment',
          t: Math.random() * 100,
          driftX: (Math.random()-0.5) * 0.008,
          driftY: (Math.random()-0.5) * 0.008,
          driftZ: (Math.random()-0.5) * 0.003,
          rx: (Math.random()-0.5) * 0.0012,
          ry: (Math.random()-0.5) * 0.0012,
          rz: (Math.random()-0.5) * 0.0008,
        };
        scene.add(sq); objects.push(sq);
      }

      /* ── CURVED FABRIC SWEEPS ── */
      for (let i = 0; i < 16; i++) {
        const span = 80 + Math.random() * 120;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-span/2, (Math.random()-0.5)*40, 0),
          new THREE.Vector3(0, (Math.random()-0.5)*70, 0),
          new THREE.Vector3(span/2, (Math.random()-0.5)*40, 0)
        );
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve.getPoints(90)),
          Math.random() > 0.5 ? matGF : matW
        );
        line.position.set((Math.random()-0.5)*500, (Math.random()-0.5)*250, Math.random()*600 - 400);
        line.rotation.z = (Math.random()-0.5) * Math.PI;
        line.userData = {
          type: 'sweep', t: Math.random() * 100,
          driftX: (Math.random()-0.5)*0.007, driftY: (Math.random()-0.5)*0.007,
          ry: (Math.random()-0.5)*0.001,
        };
        scene.add(line); objects.push(line);
      }

      /* ── GOLD DUST — dense floating particles ── */
      {
        const COUNT = 900;
        const pos   = new Float32Array(COUNT * 3);
        for (let i = 0; i < COUNT; i++) {
          pos[i*3]   = (Math.random()-0.5) * 700;
          pos[i*3+1] = (Math.random()-0.5) * 350;
          pos[i*3+2] = Math.random() * 700 - 500;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const dust = new THREE.Points(geo, new THREE.PointsMaterial({ color: GOLD, size: 0.25, transparent: true, opacity: 0.55 }));
        dust.userData = { type: 'dust' };
        scene.add(dust); objects.push(dust);
      }

      /* ── SECONDARY WHITE DUST ── */
      {
        const COUNT = 400;
        const pos   = new Float32Array(COUNT * 3);
        for (let i = 0; i < COUNT; i++) {
          pos[i*3]   = (Math.random()-0.5) * 600;
          pos[i*3+1] = (Math.random()-0.5) * 300;
          pos[i*3+2] = Math.random() * 600 - 400;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const dust2 = new THREE.Points(geo, new THREE.PointsMaterial({ color: WHITE, size: 0.15, transparent: true, opacity: 0.2 }));
        dust2.userData = { type: 'dust2' };
        scene.add(dust2); objects.push(dust2);
      }

      let camZ = 120, camX = 0, camY = 0;
      let raf;

      const animate = () => {
        raf = requestAnimationFrame(animate);

        objects.forEach(o => {
          const d = o.userData;
          if (d.type === 'ring') {
            if (d.ry) o.rotation.y += d.ry;
            if (d.rx) o.rotation.x += d.rx;
          } else if (d.type === 'orbital') {
            d.t += 0.005;
            o.position.x = d.origin.x + Math.sin(d.t * 0.7) * 18;
            o.position.y = d.origin.y + Math.cos(d.t * 0.5) * 12;
            o.rotation.y += d.drift.rz;
            o.rotation.z += d.drift.rz * 0.5;
          } else if (d.type === 'fragment') {
            d.t += 0.005;
            o.position.x += d.driftX;
            o.position.y += d.driftY;
            o.position.z += d.driftZ;
            o.rotation.x += d.rx;
            o.rotation.y += d.ry;
            o.rotation.z += d.rz;
            if (o.position.x > 280)  o.position.x = -280;
            if (o.position.x < -280) o.position.x =  280;
            if (o.position.y > 140)  o.position.y = -140;
            if (o.position.y < -140) o.position.y =  140;
          } else if (d.type === 'sweep') {
            d.t += 0.004;
            o.position.y += d.driftY;
            o.position.x += d.driftX;
            o.rotation.y += d.ry;
            if (o.position.y > 150)  o.position.y = -150;
            if (o.position.y < -150) o.position.y =  150;
            if (o.position.x > 300)  o.position.x = -300;
            if (o.position.x < -300) o.position.x =  300;
          } else if (d.type === 'dust') {
            o.rotation.y += 0.0003;
            o.position.y += 0.004;
            if (o.position.y > 30) o.position.y = -30;
          } else if (d.type === 'dust2') {
            o.rotation.x += 0.0002;
            o.position.y -= 0.003;
            if (o.position.y < -30) o.position.y = 30;
          }
        });

        const targetZ = 120 - scrollRef.current * 500;
        camZ += (targetZ - camZ) * 0.03;
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        camX += (mx * 18 - camX) * 0.015;
        camY += (-my * 11 - camY) * 0.015;
        camera.position.set(camX, camY, camZ);
        camera.lookAt(camX * 0.1, camY * 0.1, camZ - 80);
        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', onResize);

      cleanupFn = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
        renderer.dispose();
      };
    });

    return () => cleanupFn();
  }, []);

  return <div ref={mountRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}

/* ═══════════════════════════════════════════════
   3D DEPTH TEXT
═══════════════════════════════════════════════ */
function DepthText({ children, gold = false, style = {} }) {
  const layers = gold ? 10 : 6;
  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      {Array.from({ length: layers }).map((_, i) => (
        <span key={i} aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          transform: `translateX(${(i+1)*1.2}px) translateY(${(i+1)*0.8}px)`,
          color: gold ? `rgba(100,65,0,${0.35 - i*0.032})` : `rgba(0,0,0,${0.6 - i*0.08})`,
          pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap', display: 'block',
        }}>{children}</span>
      ))}
      <span style={{ position: 'relative', display: 'block' }}>{children}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   FLOATING TILT CARD — zero-gravity hover
═══════════════════════════════════════════════ */
function FloatCard({ children, index, sectionProgress, delay = 0, style = {} }) {
  const [hovered, setHovered] = useState(false);
  const [mouse, setMouse]     = useState({ x: 0, y: 0 });
  const [floatY, setFloatY]   = useState(0);
  const cardRef = useRef(null);
  const floatRef = useRef(0);

  /* Independent floating animation per card */
  useEffect(() => {
    const seed   = index * 137.5;
    const speed  = 0.6 + (index % 3) * 0.2;
    let raf;
    const loop = (t) => {
      floatRef.current = Math.sin((t * 0.001 * speed) + seed) * 8;
      setFloatY(floatRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [index]);

  const cardDelay = delay + index * 0.12;
  const cardProgress = Math.max(0, Math.min(1, (sectionProgress - 0.05 - cardDelay) / 0.5));

  const onMouseMove = useCallback((e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({ x: (e.clientX - rect.left) / rect.width - 0.5, y: (e.clientY - rect.top) / rect.height - 0.5 });
  }, []);

  const tiltX = hovered ? mouse.y * -20 : 0;
  const tiltY = hovered ? mouse.x *  26 : 0;
  const floatTranslate = hovered ? 0 : floatY;

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMouse({ x: 0, y: 0 }); }}
      onMouseMove={onMouseMove}
      style={{ perspective: '1000px', ...style }}
    >
      <div style={{
        border: '1px solid',
        borderColor: hovered ? 'rgba(201,168,76,0.85)' : 'rgba(201,168,76,0.12)',
        background: hovered
          ? 'linear-gradient(145deg, rgba(201,168,76,0.09) 0%, rgba(4,3,2,0.97) 70%)'
          : 'rgba(5,4,3,0.88)',
        backdropFilter: 'blur(20px)',
        position: 'relative', overflow: 'hidden',
        transformStyle: 'preserve-3d',
        transform: `
          translateY(${(1 - cardProgress) * 80}px)
          rotateX(${tiltX + (1 - cardProgress) * 10}deg)
          rotateY(${tiltY + (1 - cardProgress) * (index % 2 === 0 ? -12 : 12)}deg)
          translateZ(${hovered ? 20 : floatTranslate * 0.3}px)
          translateY(${floatTranslate}px)
        `,
        opacity: cardProgress,
        transition: hovered
          ? 'border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.08s ease'
          : 'border-color 0.5s, background 0.5s, box-shadow 0.5s',
        boxShadow: hovered
          ? '0 50px 100px rgba(0,0,0,0.85), 0 0 60px rgba(201,168,76,0.15), inset 0 1px 0 rgba(201,168,76,0.2)'
          : '0 20px 60px rgba(0,0,0,0.5)',
        willChange: 'transform, opacity',
        cursor: 'none',
      }}>
        {/* Corner brackets */}
        {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h], ci) => (
          <div key={ci} style={{
            position: 'absolute', [v]: 0, [h]: 0, zIndex: 3,
            width: hovered ? '32px' : '12px', height: hovered ? '32px' : '12px',
            borderTop:    v==='top'    ? '1px solid #C9A84C' : 'none',
            borderBottom: v==='bottom' ? '1px solid #C9A84C' : 'none',
            borderLeft:   h==='left'   ? '1px solid #C9A84C' : 'none',
            borderRight:  h==='right'  ? '1px solid #C9A84C' : 'none',
            transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
            opacity: hovered ? 1 : 0.35,
          }} />
        ))}

        {/* Sweep line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, zIndex: 3,
          height: '1px', width: hovered ? '100%' : '0%',
          background: 'linear-gradient(90deg, transparent, #C9A84C 30%, #C9A84C 70%, transparent)',
          transition: 'width 0.65s cubic-bezier(0.16,1,0.3,1)',
        }} />

        {children(hovered)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MARQUEE
═══════════════════════════════════════════════ */
function Marquee() {
  const items = ['Our Story', '✦', 'Built for Movement', '✦', 'Designed for Life', '✦', 'South African Brand', '✦', 'Sport & Lifestyle', '✦', 'Verulam', '✦'];
  return (
    <div style={{
      borderTop: '1px solid rgba(201,168,76,0.18)', borderBottom: '1px solid rgba(201,168,76,0.18)',
      padding: '1.3rem 0', overflow: 'hidden',
      background: 'rgba(4,3,2,0.97)', backdropFilter: 'blur(10px)',
      position: 'relative', zIndex: 2,
    }}>
      <div style={{ display: 'flex', gap: '3rem', animation: 'rrMarquee 30s linear infinite', width: 'max-content' }}>
        {[...items, ...items].map((t, i) => (
          <span key={i} style={{
            fontSize: '0.53rem',
            color: t === '✦' ? '#C9A84C' : '#4A4030',
            letterSpacing: '0.42em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', fontFamily: 'Montserrat, sans-serif',
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN ABOUT PAGE
═══════════════════════════════════════════════ */
export default function AboutPage() {
  const [heroVisible, setHeroVisible] = useState(false);
  const [cursor,        setCursor]        = useState({ x: 0, y: 0 });
  const [cursorTrail,   setCursorTrail]   = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorHover,   setCursorHover]   = useState(false);

  const scrollRef = useRef(0);
  const mouseRef  = useRef({ x: 0, y: 0 });
  const trailRef  = useRef({ x: 0, y: 0 });

  const [heroRef,      heroScroll]      = useElementScroll();
  const [foundersRef,  foundersScroll]  = useElementScroll();
  const [collRef,      collScroll]      = useElementScroll();
  const [valuesRef,    valuesScroll]    = useElementScroll();
  const [missionRef,   missionScroll]   = useElementScroll();

  /* Smooth cursor trail */
  useEffect(() => {
    let raf;
    const loop = () => {
      trailRef.current.x += (cursor.x - trailRef.current.x) * 0.35;
      trailRef.current.y += (cursor.y - trailRef.current.y) * 0.35;
      setCursorTrail({ x: trailRef.current.x, y: trailRef.current.y });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cursor]);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);

    const onScroll = () => {
      const sy = window.scrollY;
      const mx = document.body.scrollHeight - window.innerHeight;
      scrollRef.current = mx > 0 ? sy / mx : 0;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const onMove = (e) => {
      setCursor({ x: e.clientX, y: e.clientY });
      setCursorVisible(true);
      mouseRef.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
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

    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMove);
      obs.disconnect();
    };
  }, []);

  const heroDepth   = heroScroll * 80;
  const heroTiltX   = heroScroll * 28;
  const heroOpacity = Math.max(0, 1 - heroScroll * 1.5);
  const missionTilt = (missionScroll - 0.5) * 16;

  const collections = [
    { tag: 'Sportswear', title: 'Active Performance', desc: 'Technical sportswear engineered for peak performance.', icon: '⚡', features: ['Moisture-wicking', 'Strategic mesh panels', 'Ergonomic fit'] },
    { tag: 'Training',   title: 'Training Essentials', desc: 'Versatile pieces designed for any workout.',          icon: '🔥', features: ['Flexible movement', 'Breathable fabrics', 'Durable construction'] },
    { tag: 'Lifestyle',  title: 'Urban Lifestyle',     desc: 'Contemporary streetwear with athletic DNA.',          icon: '✨', features: ['Modern aesthetics', 'Comfortable fits', 'Versatile styling'] },
    { tag: 'Luxury',     title: 'Premium Collection',  desc: 'Exclusive pieces crafted from the finest materials.', icon: '👑', features: ['Premium materials', 'Refined details', 'Exclusive designs'] },
  ];

  const values = [
    { title: 'Quality',        roman: 'I',  desc: 'Only the finest materials, constructed to outlast trends and time.' },
    { title: 'Design',         roman: 'II', desc: 'Style meets function — every piece is entirely intentional.' },
    { title: 'Customer Focus', roman: 'III',desc: 'You are at the heart of everything we create and do.' },
    { title: 'Innovation',     roman: 'IV', desc: 'Always improving, always evolving, never standing still.' },
  ];

  return (
    <div style={{ paddingTop: '70px', background: '#040302', minHeight: '100vh', overflowX: 'hidden' }}>

      <ThreeBackground scrollRef={scrollRef} mouseRef={mouseRef} />

      {/* ── Custom cursor ── */}
      <div style={{
        position: 'fixed', left: cursor.x, top: cursor.y,
        width: cursorHover ? '5px' : '8px', height: cursorHover ? '5px' : '8px',
        background: '#C9A84C', borderRadius: '50%',
        pointerEvents: 'none', zIndex: 9999,
        transform: 'translate(-50%,-50%)',
        opacity: cursorVisible ? 1 : 0,
        transition: 'opacity 0.3s, width 0.2s, height 0.2s',
        mixBlendMode: 'difference',
      }} />
      <div style={{
        position: 'fixed', left: cursorTrail.x, top: cursorTrail.y,
        width: cursorHover ? '55px' : '38px', height: cursorHover ? '55px' : '38px',
        border: '1px solid rgba(201,168,76,0.6)', borderRadius: '50%',
        pointerEvents: 'none', zIndex: 9998,
        transform: 'translate(-50%,-50%)',
        opacity: cursorVisible ? 0.8 : 0,
        transition: 'opacity 0.3s, width 0.4s cubic-bezier(0.16,1,0.3,1), height 0.4s cubic-bezier(0.16,1,0.3,1)',
      }} />

      {/* ══════════════════════════════════
          HERO
      ══════════════════════════════════ */}
      <section
        ref={heroRef}
        style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '4rem 2rem',
          position: 'relative', perspective: '1400px', perspectiveOrigin: '50% 50%',
        }}
      >
        {/* Perspective grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)`,
          backgroundSize: '90px 90px',
          transform: `perspective(800px) rotateX(${55 + heroScroll * 15}deg) translateZ(-80px) scale(2.2)`,
          transformOrigin: '50% 100%',
          opacity: 0.6, zIndex: 1, pointerEvents: 'none',
        }} />

        {/* Radial bloom */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: '900px', height: '900px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, rgba(201,168,76,0.02) 35%, transparent 65%)',
          pointerEvents: 'none', zIndex: 1,
          animation: 'rrBloom 4s ease-in-out infinite alternate',
        }} />

        <div style={{
          maxWidth: '980px', position: 'relative', zIndex: 2,
          transformStyle: 'preserve-3d',
          transform: `rotateX(${heroTiltX}deg) translateZ(${-heroDepth}px)`,
          opacity: heroOpacity,
          willChange: 'transform, opacity',
        }}>
          {/* Eyebrow */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.2rem',
            marginBottom: '3rem',
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(24px)',
            transition: 'opacity 1s ease 0.2s, transform 1s ease 0.2s',
          }}>
            <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C)' }} />
            <p style={{ fontSize: '0.58rem', color: '#C9A84C', letterSpacing: '0.55em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}>
              Who We Are
            </p>
            <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
          </div>

          {/* 3D Heading */}
          <div style={{ transformStyle: 'preserve-3d', perspective: '800px', marginBottom: '2rem' }}>
            {[
              { text: 'About', gold: false, z: 20, delay: 0.35 },
              { text: 'R&R',   gold: true,  z: 40, delay: 0.52 },
            ].map((word, i) => (
              <div key={i} style={{ overflow: 'hidden', lineHeight: 1.0, transformStyle: 'preserve-3d', transform: `translateZ(${word.z}px)` }}>
                <div style={{
                  opacity: heroVisible ? 1 : 0,
                  transform: heroVisible ? 'none' : 'translateY(100%)',
                  transition: `opacity 1.2s cubic-bezier(0.16,1,0.3,1) ${word.delay}s, transform 1.2s cubic-bezier(0.16,1,0.3,1) ${word.delay}s`,
                }}>
                  <DepthText gold={word.gold}>
                    <span style={{
                      fontFamily: 'Cormorant Garamond, serif',
                      fontSize: 'clamp(4rem, 12vw, 10rem)',
                      fontWeight: 300,
                      color: word.gold ? '#C9A84C' : '#FFFFFF',
                      display: 'block', letterSpacing: '-0.01em',
                      textShadow: word.gold
                        ? '0 0 80px rgba(201,168,76,0.5), 0 0 160px rgba(201,168,76,0.2)'
                        : '0 0 60px rgba(255,255,255,0.12), 0 4px 30px rgba(0,0,0,0.9)',
                      lineHeight: 1.02,
                    }} dangerouslySetInnerHTML={{ __html: word.text }} />
                  </DepthText>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{
            width: heroVisible ? '140px' : '0px', height: '1px',
            background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
            margin: '3rem auto',
            transition: 'width 1.6s cubic-bezier(0.16,1,0.3,1) 0.9s',
          }} />

          {/* Tagline */}
          <p style={{
            fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '4rem',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 200,
            opacity: heroVisible ? 1 : 0, transition: 'opacity 1s ease 1.2s',
          }}>
            Built for Movement · Designed for Life
          </p>

          {/* CTAs */}
          <div style={{
            display: 'flex', gap: '1.4rem', justifyContent: 'center', flexWrap: 'wrap',
            opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(24px)',
            transition: 'opacity 1s ease 1.5s, transform 1s ease 1.5s',
          }}>
            <Link href="/shop" className="rr-btn-primary">Shop the Collection</Link>
            <Link href="/contact" className="rr-btn-outline">Get in Touch</Link>
          </div>

          {/* Scroll indicator */}
          <div style={{
            position: 'absolute', bottom: '-160px', left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem',
            opacity: heroVisible ? 0.6 : 0, transition: 'opacity 1s ease 2.2s',
          }}>
            <p style={{ fontSize: '0.44rem', color: '#C9A84C', letterSpacing: '0.5em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>Scroll</p>
            <div style={{ width: '1px', height: '70px', background: 'linear-gradient(180deg, #C9A84C, transparent)', animation: 'rrScrollPulse 2s ease-in-out infinite' }} />
          </div>
        </div>

        {/* Floating concentric rings */}
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `translateZ(${-100 - i * 80}px)`,
            pointerEvents: 'none', zIndex: 1,
          }}>
            <div style={{
              width: `${380 + i * 220}px`, height: `${380 + i * 220}px`, borderRadius: '50%',
              border: `1px solid rgba(201,168,76,${0.07 - i * 0.012})`,
              animation: `rrRingPulse ${3.5 + i * 0.9}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.7}s`,
            }} />
          </div>
        ))}
      </section>

      {/* ══ MARQUEE ══ */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <Marquee />
      </div>

      {/* ══════════════════════════════════
          FOUNDERS
      ══════════════════════════════════ */}
      <section
        ref={foundersRef}
        style={{ padding: '11rem 4rem 10rem', maxWidth: '1300px', margin: '0 auto', position: 'relative', zIndex: 2 }}
      >
        {/* Section header */}
        <div style={{
          textAlign: 'center', marginBottom: '7rem',
          transform: `translateY(${Math.max(0, (0.5 - foundersScroll) * 70)}px)`,
          opacity: Math.min(1, foundersScroll * 3.5),
        }}>
          <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.2rem', fontFamily: 'Montserrat, sans-serif' }}>Our Story</p>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 300, color: '#FFFFFF', textShadow: '0 0 60px rgba(255,255,255,0.08)' }}>
            Where Sport Meets Style
          </h2>
          <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '1.8rem auto 0' }} />
          <p style={{ fontSize: '0.65rem', color: '#555', maxWidth: '560px', margin: '2rem auto 0', lineHeight: 2, letterSpacing: '0.06em', fontFamily: 'Montserrat, sans-serif', fontWeight: 200 }}>
            Two founders, two passions, one extraordinary brand born from the perfect fusion of athletic excellence and lifestyle sophistication.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2px', background: 'rgba(201,168,76,0.05)', marginBottom: '2px' }}>
          {/* Romario */}
          <FloatCard index={0} sectionProgress={foundersScroll}>
            {(hov) => (
              <div style={{ padding: '4rem 3rem' }}>
                <p style={{ fontSize: '0.48rem', color: hov ? '#C9A84C' : 'rgba(201,168,76,0.4)', letterSpacing: '0.4em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', marginBottom: '1.5rem', transition: 'color 0.3s' }}>
                  Sports & Performance
                </p>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.4rem', fontWeight: 300, color: hov ? '#FFFFFF' : '#E8E0D0', marginBottom: '0.4rem', textShadow: hov ? '0 0 40px rgba(255,255,255,0.2)' : 'none', transition: 'all 0.3s' }}>
                  Romario Govender
                </h3>
                <p style={{ fontSize: '0.52rem', color: '#C9A84C', letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', marginBottom: '2rem' }}>
                  Co-Founder · Athletic Excellence
                </p>
                <div style={{ width: hov ? '60px' : '30px', height: '1px', background: '#C9A84C', marginBottom: '2rem', transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
                <p style={{ fontSize: '0.65rem', color: hov ? '#888' : '#555', lineHeight: 2, letterSpacing: '0.05em', marginBottom: '1rem', transition: 'color 0.3s' }}>
                  A true athlete at heart, Romario has excelled in nearly every sport imaginable. As a semi-professional golfer, he brings an elite athlete's perspective to performance wear.
                </p>
                <p style={{ fontSize: '0.65rem', color: hov ? '#888' : '#555', lineHeight: 2, letterSpacing: '0.05em', transition: 'color 0.3s' }}>
                  His deep understanding of what athletes need ensures every sportswear piece performs at the highest level.
                </p>
              </div>
            )}
          </FloatCard>

          {/* Rhea */}
          <FloatCard index={1} sectionProgress={foundersScroll}>
            {(hov) => (
              <div style={{ padding: '4rem 3rem' }}>
                <p style={{ fontSize: '0.48rem', color: hov ? '#C9A84C' : 'rgba(201,168,76,0.4)', letterSpacing: '0.4em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', marginBottom: '1.5rem', transition: 'color 0.3s' }}>
                  Lifestyle & Luxury
                </p>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.4rem', fontWeight: 300, color: hov ? '#FFFFFF' : '#E8E0D0', marginBottom: '0.4rem', textShadow: hov ? '0 0 40px rgba(255,255,255,0.2)' : 'none', transition: 'all 0.3s' }}>
                  Rhea Jugernath
                </h3>
                <p style={{ fontSize: '0.52rem', color: '#C9A84C', letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', marginBottom: '2rem' }}>
                  Co-Founder · Style & Sophistication
                </p>
                <div style={{ width: hov ? '60px' : '30px', height: '1px', background: '#C9A84C', marginBottom: '2rem', transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
                <p style={{ fontSize: '0.65rem', color: hov ? '#888' : '#555', lineHeight: 2, letterSpacing: '0.05em', marginBottom: '1rem', transition: 'color 0.3s' }}>
                  With a passion for fashion and an eye for luxury, Rhea brings the lifestyle element that elevates our brand beyond performance wear.
                </p>
                <p style={{ fontSize: '0.65rem', color: hov ? '#888' : '#555', lineHeight: 2, letterSpacing: '0.05em', transition: 'color 0.3s' }}>
                  Her expertise in contemporary design ensures our lifestyle collections embody sophistication, comfort, and timeless style.
                </p>
              </div>
            )}
          </FloatCard>
        </div>

        {/* Combined statement */}
        <FloatCard index={2} sectionProgress={foundersScroll} style={{ gridColumn: '1 / -1' }}>
          {(hov) => (
            <div style={{ padding: '4rem 3rem', textAlign: 'center' }}>
              <p style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)', fontWeight: 300, fontStyle: 'italic',
                color: hov ? '#FFFFFF' : '#E8E0D0',
                lineHeight: 1.8, maxWidth: '750px', margin: '0 auto',
                textShadow: hov ? '0 0 40px rgba(255,255,255,0.1)' : 'none',
                transition: 'all 0.3s',
              }}>
                "Together, Romario and Rhea created R&R — a brand where athletic performance meets everyday elegance, where functionality embraces fashion, and where every piece tells the story of{' '}
                <span style={{ color: '#C9A84C', fontStyle: 'normal' }}>two passions perfectly combined.</span>"
              </p>
            </div>
          )}
        </FloatCard>
      </section>

      {/* ══════════════════════════════════
          MISSION STATEMENT
      ══════════════════════════════════ */}
      <section
        ref={missionRef}
        style={{
          background: 'rgba(6,5,3,0.95)', backdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(201,168,76,0.12)', borderBottom: '1px solid rgba(201,168,76,0.12)',
          padding: '11rem 2rem', textAlign: 'center',
          position: 'relative', zIndex: 2, overflow: 'hidden',
          perspective: '1200px',
        }}
      >
        {/* Watermark */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(10rem, 28vw, 24rem)',
          color: 'transparent',
          WebkitTextStroke: '1px rgba(201,168,76,0.05)',
          userSelect: 'none', pointerEvents: 'none',
          whiteSpace: 'nowrap', fontWeight: 300,
          transform: `translate(-50%,-50%) rotateX(${missionTilt}deg)`,
          willChange: 'transform',
        }}>R&amp;R</div>

        <div style={{
          maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1,
          transform: `rotateX(${missionTilt * 0.45}deg) scale(${0.94 + missionScroll * 0.09})`,
          opacity: Math.min(1, missionScroll * 3),
          willChange: 'transform, opacity',
        }}>
          <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '2.2rem', fontFamily: 'Montserrat, sans-serif' }}>
            Our Mission
          </p>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(2rem, 5vw, 3.8rem)', fontWeight: 300, fontStyle: 'italic',
            color: '#FFFFFF', lineHeight: 1.65,
            textShadow: '0 0 80px rgba(255,255,255,0.06)',
          }}>
            "Premium clothing that combines{' '}
            <span style={{ color: '#C9A84C', fontStyle: 'normal', textShadow: '0 0 40px rgba(201,168,76,0.4)' }}>elegance with comfort</span>,
            designed for the modern individual who lives without compromise."
          </h2>
          <div style={{ width: '70px', height: '1px', background: '#C9A84C', margin: '3.5rem auto' }} />
        </div>
      </section>

      {/* ══════════════════════════════════
          COLLECTIONS
      ══════════════════════════════════ */}
      <section
        ref={collRef}
        style={{ padding: '11rem 4rem 10rem', maxWidth: '1380px', margin: '0 auto', position: 'relative', zIndex: 2 }}
      >
        <div style={{
          textAlign: 'center', marginBottom: '7rem',
          transform: `translateY(${Math.max(0, (0.5 - collScroll) * 70)}px)`,
          opacity: Math.min(1, collScroll * 3.5),
        }}>
          <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.2rem', fontFamily: 'Montserrat, sans-serif' }}>What We Offer</p>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 300, color: '#FFFFFF', textShadow: '0 0 60px rgba(255,255,255,0.08)' }}>
            Our Collections
          </h2>
          <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '1.8rem auto 0' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2px', background: 'rgba(201,168,76,0.05)' }}>
          {collections.map((col, i) => (
            <FloatCard key={col.title} index={i} sectionProgress={collScroll}>
              {(hov) => (
                <div style={{ padding: '4rem 2.5rem' }}>
                  <p style={{ fontSize: '0.48rem', color: hov ? '#C9A84C' : 'rgba(201,168,76,0.35)', letterSpacing: '0.4em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', marginBottom: '1.5rem', transition: 'color 0.3s' }}>
                    {col.tag}
                  </p>
                  <span style={{
                    fontSize: '2.8rem', display: 'block', marginBottom: '1.5rem',
                    transform: hov ? 'scale(1.2) rotate(-8deg)' : 'scale(1)',
                    transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
                    filter: hov ? 'drop-shadow(0 0 16px rgba(201,168,76,0.5))' : 'none',
                  }}>{col.icon}</span>
                  <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.9rem', fontWeight: 300, color: hov ? '#FFFFFF' : '#E8E0D0', marginBottom: '0.8rem', transition: 'color 0.3s' }}>
                    {col.title}
                  </h3>
                  <p style={{ fontSize: '0.62rem', color: hov ? '#666' : '#444', lineHeight: 2, letterSpacing: '0.06em', marginBottom: '1.8rem', transition: 'color 0.3s' }}>
                    {col.desc}
                  </p>
                  <div style={{ width: '30px', height: '1px', background: 'rgba(201,168,76,0.4)', marginBottom: '1rem' }} />
                  {col.features.map(f => (
                    <p key={f} style={{ fontSize: '0.55rem', color: hov ? 'rgba(201,168,76,0.7)' : '#3A3020', marginBottom: '0.5rem', letterSpacing: '0.08em', fontFamily: 'Montserrat, sans-serif', transition: 'color 0.3s' }}>
                      <span style={{ color: '#C9A84C', marginRight: '0.6rem' }}>—</span>{f}
                    </p>
                  ))}
                </div>
              )}
            </FloatCard>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════
          VALUES
      ══════════════════════════════════ */}
      <section
        ref={valuesRef}
        style={{
          padding: '11rem 4rem', maxWidth: '1300px', margin: '0 auto',
          position: 'relative', zIndex: 2,
        }}
      >
        <div style={{
          textAlign: 'center', marginBottom: '6rem',
          transform: `translateY(${Math.max(0, (0.4 - valuesScroll) * 70)}px)`,
          opacity: Math.min(1, valuesScroll * 3.5),
        }}>
          <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.2rem', fontFamily: 'Montserrat, sans-serif' }}>What We Stand For</p>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 300, color: '#FFFFFF', textShadow: '0 0 60px rgba(255,255,255,0.08)' }}>
            Our Values
          </h2>
          <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '1.8rem auto 0' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2px', background: 'rgba(201,168,76,0.05)' }}>
          {values.map((v, i) => (
            <FloatCard key={v.title} index={i} sectionProgress={valuesScroll}>
              {(hov) => (
                <div style={{ padding: '4rem 2.2rem', textAlign: 'center', position: 'relative' }}>
                  {/* Ghost numeral */}
                  <div style={{
                    position: 'absolute', top: '-1rem', right: '1.2rem',
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: '6rem', fontWeight: 300,
                    color: hov ? 'rgba(201,168,76,0.12)' : 'rgba(201,168,76,0.04)',
                    transition: 'color 0.4s', userSelect: 'none', pointerEvents: 'none',
                  }}>{v.roman}</div>

                  <div style={{
                    width: hov ? '60px' : '20px', height: '1px',
                    background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
                    margin: '0 auto 2rem',
                    transition: 'width 0.55s cubic-bezier(0.16,1,0.3,1)',
                  }} />

                  <h3 style={{
                    fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', fontWeight: 300,
                    color: hov ? '#FFFFFF' : '#C9A84C', marginBottom: '1.2rem',
                    textShadow: hov ? '0 0 30px rgba(255,255,255,0.2)' : 'none',
                    transition: 'color 0.3s, text-shadow 0.3s',
                  }}>{v.title}</h3>

                  <p style={{ fontSize: '0.64rem', color: hov ? '#777' : '#555', lineHeight: 2.1, letterSpacing: '0.07em', transition: 'color 0.3s' }}>
                    {v.desc}
                  </p>
                </div>
              )}
            </FloatCard>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════
          FINAL CTA
      ══════════════════════════════════ */}
      <section style={{
        padding: '14rem 2rem', textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(4,3,2,0.97) 0%, rgba(8,6,3,0.99) 100%)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(201,168,76,0.12)',
        position: 'relative', zIndex: 2, overflow: 'hidden',
      }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: `${i * 20}vw`, height: `${i * 20}vw`, borderRadius: '50%',
            border: `1px solid rgba(201,168,76,${0.09 - i * 0.01})`,
            transform: `translate(-50%, -50%)`,
            animation: `rrRingPulse ${2.5 + i * 0.6}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.4}s`, pointerEvents: 'none',
          }} />
        ))}

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '2rem', fontFamily: 'Montserrat, sans-serif' }}>
            Ready to Explore?
          </p>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(3rem, 9vw, 7.5rem)', fontWeight: 300, lineHeight: 1.05, marginBottom: '4rem',
          }}>
            <span style={{ color: '#FFFFFF', textShadow: '0 0 80px rgba(255,255,255,0.1)', display: 'block' }}>Experience the</span>
            <span style={{ color: '#C9A84C', textShadow: '0 0 80px rgba(201,168,76,0.5), 0 0 160px rgba(201,168,76,0.2)', fontStyle: 'italic', display: 'block' }}>R&amp;R</span>
            <span style={{ color: '#FFFFFF', textShadow: '0 0 80px rgba(255,255,255,0.1)', display: 'block' }}>Difference</span>
          </h2>
          <div style={{ display: 'flex', gap: '1.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/shop" className="rr-btn-primary">Shop Now</Link>
            <Link href="/contact" className="rr-btn-outline">Contact Us</Link>
          </div>
        </div>
      </section>

      {/* ══ GLOBAL STYLES ══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap');

        * { cursor: none !important; }
        html { scroll-behavior: smooth; }

        @keyframes rrMarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes rrScrollPulse {
          0%,100% { opacity: 0.8; transform: scaleY(1); }
          50%     { opacity: 0.1; transform: scaleY(0.2); }
        }
        @keyframes rrRingPulse {
          from { opacity: 0.12; transform: translate(-50%,-50%) scale(0.96); }
          to   { opacity: 0.6;  transform: translate(-50%,-50%) scale(1.04); }
        }
        @keyframes rrBloom {
          from { opacity: 0.6; transform: translate(-50%,-50%) scale(0.95); }
          to   { opacity: 1.0; transform: translate(-50%,-50%) scale(1.05); }
        }

        .rr-btn-primary {
          display: inline-block; padding: 1.15rem 3.2rem;
          background: #C9A84C; color: #080604;
          font-family: 'Montserrat', sans-serif; font-size: 0.57rem; font-weight: 500;
          letter-spacing: 0.4em; text-transform: uppercase; text-decoration: none;
          position: relative; overflow: hidden;
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s;
          box-shadow: 0 8px 40px rgba(201,168,76,0.2);
        }
        .rr-btn-primary::before {
          content: ''; position: absolute; inset: 0; background: #EDD070;
          transform: translateX(-101%); transition: transform 0.55s cubic-bezier(0.16,1,0.3,1);
        }
        .rr-btn-primary:hover::before { transform: translateX(0); }
        .rr-btn-primary:hover { transform: translateY(-5px); box-shadow: 0 25px 60px rgba(201,168,76,0.35); }

        .rr-btn-outline {
          display: inline-block; padding: 1.15rem 3.2rem;
          border: 1px solid rgba(201,168,76,0.55); color: #C9A84C;
          font-family: 'Montserrat', sans-serif; font-size: 0.57rem; font-weight: 300;
          letter-spacing: 0.4em; text-transform: uppercase; text-decoration: none;
          position: relative; overflow: hidden;
          transition: border-color 0.4s, transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s;
        }
        .rr-btn-outline::before {
          content: ''; position: absolute; inset: 0; background: rgba(201,168,76,0.08);
          transform: scaleX(0); transform-origin: left; transition: transform 0.55s cubic-bezier(0.16,1,0.3,1);
        }
        .rr-btn-outline:hover::before { transform: scaleX(1); }
        .rr-btn-outline:hover { border-color: #C9A84C; transform: translateY(-5px); box-shadow: 0 20px 50px rgba(201,168,76,0.15); }
      `}</style>
    </div>
  );
}