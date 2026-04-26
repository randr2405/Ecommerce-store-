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
   THREE.JS FLYING-CAMERA BACKGROUND
═══════════════════════════════════════════════ */
function ThreeBackground({ scrollRef, mouseRef }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let cleanupFn = () => {};

    import('three').then((THREE) => {
      /* Scene */
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x040404, 0.0045);

      /* Camera */
      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 800);
      camera.position.set(0, 0, 90);

      /* Renderer */
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      /* Materials — gold thread hierarchy */
      const matThread     = new THREE.LineBasicMaterial({ color: 0xC9A84C, transparent: true, opacity: 0.8 });
      const matThreadDim  = new THREE.LineBasicMaterial({ color: 0xC9A84C, transparent: true, opacity: 0.35 });
      const matFabricEdge = new THREE.LineBasicMaterial({ color: 0xE8D080, transparent: true, opacity: 0.14 });
      const matFabricFill = new THREE.LineBasicMaterial({ color: 0xC9A84C, transparent: true, opacity: 0.06 });

      const objects = [];
      const fabricPanels = []; /* store for wave animation */

      /* ── 1. FLOWING FABRIC PANELS
         Large draped PlaneGeometry meshes — look like silk panels floating in space ── */
      for (let i = 0; i < 14; i++) {
        const w = 18 + Math.random() * 22;
        const h = 28 + Math.random() * 35;
        const segsX = 10, segsY = 16;
        const geo = new THREE.PlaneGeometry(w, h, segsX, segsY);

        /* Initial drape displacement — random wave phase per panel */
        const phaseX = Math.random() * Math.PI * 2;
        const phaseY = Math.random() * Math.PI * 2;
        const ampX   = 1.5 + Math.random() * 3;
        const ampY   = 2 + Math.random() * 4;
        const pos    = geo.attributes.position;
        for (let v = 0; v < pos.count; v++) {
          const x = pos.getX(v);
          const y = pos.getY(v);
          pos.setZ(v, Math.sin(x * 0.25 + phaseX) * ampX + Math.cos(y * 0.18 + phaseY) * ampY);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();

        const wf   = new THREE.WireframeGeometry(geo);
        const mat  = Math.random() > 0.4 ? matFabricEdge : matFabricFill;
        const mesh = new THREE.LineSegments(wf, mat);

        mesh.position.set(
          (Math.random() - 0.5) * 280,
          (Math.random() - 0.5) * 160,
          Math.random() * 360 - 240
        );
        mesh.rotation.set(
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.3
        );

        mesh.userData = {
          type: 'fabric',
          phaseX, phaseY, ampX, ampY,
          segsX, segsY, w, h,
          speed: 0.004 + Math.random() * 0.006,
          ry: (Math.random() - 0.5) * 0.0008,
        };

        scene.add(mesh);
        objects.push(mesh);
        fabricPanels.push({ mesh, geo, originalGeo: geo });
      }

      /* ── 2. GOLDEN THREAD FILAMENTS
         CatmullRom spline curves rendered as single lines — loose floating threads ── */
      for (let i = 0; i < 40; i++) {
        const depth = Math.random() * 400 - 280;
        const cx    = (Math.random() - 0.5) * 260;
        const cy    = (Math.random() - 0.5) * 150;

        /* Build a flowing curve with 5-8 control points */
        const numPts = 5 + Math.floor(Math.random() * 4);
        const pts = [];
        for (let p = 0; p < numPts; p++) {
          pts.push(new THREE.Vector3(
            cx + (Math.random() - 0.5) * (20 + Math.random() * 40),
            cy + (Math.random() - 0.5) * (15 + Math.random() * 30),
            depth + (Math.random() - 0.5) * 8
          ));
        }
        const curve  = new THREE.CatmullRomCurve3(pts);
        const points = curve.getPoints(80);
        const geo    = new THREE.BufferGeometry().setFromPoints(points);
        const mat    = Math.random() > 0.35 ? matThread : matThreadDim;
        const line   = new THREE.Line(geo, mat);

        line.userData = {
          type: 'thread',
          pts,
          baseY: cy,
          speed: 0.002 + Math.random() * 0.004,
          phase: Math.random() * Math.PI * 2,
          driftY: (Math.random() - 0.5) * 0.012,
        };

        scene.add(line);
        objects.push(line);
      }

      /* ── 3. STITCH DASHES
         Short straight line segments scattered like scattered stitching / seam lines ── */
      for (let i = 0; i < 55; i++) {
        const len    = 1.5 + Math.random() * 6;
        const angle  = Math.random() * Math.PI;
        const geo    = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-Math.cos(angle) * len, -Math.sin(angle) * len, 0),
          new THREE.Vector3( Math.cos(angle) * len,  Math.sin(angle) * len, 0),
        ]);
        const mat    = Math.random() > 0.5 ? matThread : matThreadDim;
        const line   = new THREE.Line(geo, mat);

        line.position.set(
          (Math.random() - 0.5) * 300,
          (Math.random() - 0.5) * 170,
          Math.random() * 380 - 260
        );
        line.userData = {
          type: 'stitch',
          ry: (Math.random() - 0.5) * 0.003,
          driftY: (Math.random() - 0.5) * 0.015,
        };

        scene.add(line);
        objects.push(line);
      }

      /* ── 4. FINE FABRIC GRAIN PARTICLES
         Point cloud suggesting fabric texture / loose fibres in the air ── */
      {
        const COUNT  = 500;
        const posArr = new Float32Array(COUNT * 3);
        for (let i = 0; i < COUNT; i++) {
          posArr[i * 3]     = (Math.random() - 0.5) * 380;
          posArr[i * 3 + 1] = (Math.random() - 0.5) * 220;
          posArr[i * 3 + 2] = Math.random() * 420 - 300;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        const pts = new THREE.Points(geo, new THREE.PointsMaterial({
          color: 0xC9A84C, size: 0.28, transparent: true, opacity: 0.45,
        }));
        pts.userData = { type: 'particles', driftY: 0.006 };
        scene.add(pts);
        objects.push(pts);
      }

      /* Camera smooth state */
      let camZ = 90, camX = 0, camY = 0;
      let raf, clock = 0;

      const animate = () => {
        raf = requestAnimationFrame(animate);
        clock += 0.01;

        objects.forEach(o => {
          const d = o.userData;

          if (d.type === 'fabric') {
            /* Gently ripple fabric vertices — simulates silk catching a breeze */
            const geo = o.geometry.sourceGeometry || o.geometry;
            /* Rebuild wireframe each frame for animated fabric */
            const planeGeo = new THREE.PlaneGeometry(d.w, d.h, d.segsX, d.segsY);
            const pos = planeGeo.attributes.position;
            for (let v = 0; v < pos.count; v++) {
              const x = pos.getX(v);
              const y = pos.getY(v);
              pos.setZ(v,
                Math.sin(x * 0.25 + d.phaseX + clock * d.speed * 3) * d.ampX +
                Math.cos(y * 0.18 + d.phaseY + clock * d.speed * 2) * d.ampY
              );
            }
            pos.needsUpdate = true;
            planeGeo.computeVertexNormals();
            const newWf = new THREE.WireframeGeometry(planeGeo);
            o.geometry.dispose();
            o.geometry = newWf;
            planeGeo.dispose();
            o.rotation.y += d.ry;

          } else if (d.type === 'thread') {
            /* Threads drift slowly upward and sway */
            o.position.y += d.driftY;
            if (o.position.y > 120) o.position.y = -120;
            /* Subtle sway */
            o.rotation.z = Math.sin(clock * d.speed + d.phase) * 0.08;

          } else if (d.type === 'stitch') {
            /* Stitches float gently */
            o.position.y += d.driftY;
            if (o.position.y > 110) o.position.y = -110;
            o.rotation.y += d.ry;

          } else if (d.type === 'particles') {
            /* Grain particles drift upward very slowly */
            o.position.y += d.driftY;
            if (o.position.y > 40) o.position.y = -40;
          }
        });

        /* Drive camera Z from scroll (0→1 maps to z 90→-310) */
        const targetZ = 90 - scrollRef.current * 400;
        camZ += (targetZ - camZ) * 0.035;

        /* Mouse-based camera drift */
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        camX += (mx * 14 - camX) * 0.018;
        camY += (-my * 9 - camY) * 0.018;

        camera.position.set(camX, camY, camZ);
        /* Look slightly ahead + toward center */
        camera.lookAt(camX * 0.15, camY * 0.15, camZ - 60);

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

  return (
    <div
      ref={mountRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  );
}

/* ═══════════════════════════════════════════════
   DEPTH TEXT — stacked z-layers for 3D letters
═══════════════════════════════════════════════ */
function DepthText({ children, style = {}, layers = 5 }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      {/* Shadow layers */}
      {Array.from({ length: layers }).map((_, i) => (
        <span key={i} aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          transform: `translateZ(${-(i + 1) * 6}px) translateX(${(i + 1) * 1.5}px) translateY(${(i + 1) * 1}px)`,
          color: `rgba(201,168,76,${0.08 - i * 0.012})`,
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}>{children}</span>
      ))}
      {/* Real text */}
      <span style={{ position: 'relative', display: 'block' }}>{children}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   3D CATEGORY CARD
═══════════════════════════════════════════════ */
function CategoryCard3D({ cat, index, sectionProgress }) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  /* Per-card entry stagger */
  const delay = index * 0.12;
  const cardProgress = Math.max(0, Math.min(1, (sectionProgress - 0.15 - delay) / 0.4));
  const enterZ = (1 - cardProgress) * -400;
  const enterRotY = (1 - cardProgress) * (index % 2 === 0 ? -45 : 45);
  const enterOpacity = cardProgress;

  const handleMouseMove = useCallback((e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    });
  }, []);

  const tiltX = hovered ? mousePos.y * -20 : 0;
  const tiltY = hovered ? mousePos.x * 25 : 0;
  const tiltZ = hovered ? 30 : 0;

  return (
    <Link href={`/shop?category=${cat.label.toLowerCase()}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        ref={cardRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setMousePos({ x: 0, y: 0 }); }}
        onMouseMove={handleMouseMove}
        style={{
          perspective: '800px',
        }}
      >
        <div style={{
          border: '1px solid',
          borderColor: hovered ? 'rgba(201,168,76,0.8)' : 'rgba(201,168,76,0.12)',
          padding: '3.5rem 2.5rem',
          background: hovered
            ? 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.02))'
            : 'rgba(8,8,6,0.85)',
          backdropFilter: 'blur(12px)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transformStyle: 'preserve-3d',
          transform: `
            translateZ(${enterZ}px)
            rotateY(${enterRotY + tiltY}deg)
            rotateX(${tiltX}deg)
            translateZ(${tiltZ}px)
          `,
          opacity: enterOpacity,
          transition: hovered
            ? 'border-color 0.3s, background 0.3s, transform 0.08s ease, box-shadow 0.3s'
            : 'border-color 0.5s, background 0.5s, box-shadow 0.5s',
          boxShadow: hovered
            ? `-${mousePos.x * 30}px ${mousePos.y * 20}px 60px rgba(201,168,76,0.15), inset 0 0 40px rgba(201,168,76,0.03)`
            : 'none',
          willChange: 'transform',
        }}>
          {/* Scanline texture overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(201,168,76,0.012) 3px, rgba(201,168,76,0.012) 4px)',
            pointerEvents: 'none',
          }} />

          {/* Corner accent */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: hovered ? '40px' : '16px',
            height: hovered ? '40px' : '16px',
            borderTop: '1px solid #C9A84C',
            borderLeft: '1px solid #C9A84C',
            transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: hovered ? '40px' : '16px',
            height: hovered ? '40px' : '16px',
            borderBottom: '1px solid #C9A84C',
            borderRight: '1px solid #C9A84C',
            transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
          }} />

          {/* Bottom sweep */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            height: '1px', width: hovered ? '100%' : '0%',
            background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
            transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
          }} />

          <p style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '0.7rem',
            color: hovered ? '#C9A84C' : 'rgba(201,168,76,0.2)',
            letterSpacing: '0.25em',
            marginBottom: '1.5rem',
            transition: 'color 0.4s',
          }}>{String(index + 1).padStart(2, '0')}</p>

          <span style={{
            fontSize: '3rem',
            display: 'block',
            marginBottom: '1.5rem',
            transform: hovered ? 'scale(1.15) rotate(-8deg) translateZ(20px)' : 'scale(1) rotate(0) translateZ(0)',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
            filter: hovered ? 'drop-shadow(0 0 12px rgba(201,168,76,0.4))' : 'none',
          }}>{cat.icon}</span>

          <h3 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.9rem',
            fontWeight: 300,
            color: hovered ? '#C9A84C' : '#F5F0E8',
            marginBottom: '0.7rem',
            transition: 'color 0.3s',
          }}>{cat.label}</h3>

          <p style={{ fontSize: '0.65rem', color: '#555', letterSpacing: '0.1em', lineHeight: 1.9 }}>
            {cat.desc}
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginTop: '2rem',
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateX(0) translateZ(20px)' : 'translateX(-12px)',
            transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{ width: '20px', height: '1px', background: '#C9A84C' }} />
            <span style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>
              Explore
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════
   3D VALUE CARD
═══════════════════════════════════════════════ */
function ValueCard3D({ value, index, sectionProgress }) {
  const [hovered, setHovered] = useState(false);
  const romans = ['I', 'II', 'III', 'IV'];

  const delay = index * 0.15;
  const cardP = Math.max(0, Math.min(1, (sectionProgress - 0.1 - delay) / 0.5));

  /* Different depth per card — creates staggered Z plane effect */
  const depthZ = [0, -30, -15, -45][index];
  const entryY = (1 - cardP) * 100;
  const entryRot = (1 - cardP) * (index % 2 === 0 ? -8 : 8);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(201,168,76,0.04)' : 'rgba(6,6,6,0.9)',
        padding: '3.5rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
        border: '1px solid',
        borderColor: hovered ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.04)',
        transform: `translateY(${entryY}px) rotateX(${entryRot}deg) translateZ(${depthZ}px)`,
        opacity: cardP,
        transition: hovered
          ? 'background 0.4s, border-color 0.4s, box-shadow 0.3s'
          : 'background 0.4s, border-color 0.4s',
        boxShadow: hovered ? `0 20px 60px rgba(201,168,76,0.1), 0 0 0 1px rgba(201,168,76,0.1)` : 'none',
        willChange: 'transform, opacity',
      }}
    >
      <div style={{
        position: 'absolute', top: '-0.8rem', right: '1rem',
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: '5.5rem', fontWeight: 300,
        color: hovered ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.03)',
        transition: 'color 0.4s',
        userSelect: 'none', pointerEvents: 'none',
      }}>{romans[index]}</div>

      <div style={{
        width: hovered ? '55px' : '22px',
        height: '1px',
        background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
        margin: '0 auto 1.8rem',
        transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)',
      }} />

      <h3 style={{
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: '1.5rem', fontWeight: 300,
        color: '#C9A84C', marginBottom: '1rem',
        transform: hovered ? 'translateZ(10px)' : 'translateZ(0)',
        transition: 'transform 0.3s',
      }}>{value.title}</h3>

      <p style={{ fontSize: '0.65rem', color: '#666', lineHeight: 2, letterSpacing: '0.06em' }}>
        {value.desc}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MARQUEE
═══════════════════════════════════════════════ */
function Marquee() {
  const items = ['Premium Quality', '✦', 'South African Brand', '✦', 'Sport & Lifestyle', '✦', 'All Ages', '✦', 'Free Delivery', '✦', '118 Pieces', '✦'];
  return (
    <div style={{
      borderTop: '1px solid rgba(201,168,76,0.12)',
      borderBottom: '1px solid rgba(201,168,76,0.12)',
      padding: '1.2rem 0',
      overflow: 'hidden',
      background: 'rgba(4,4,4,0.95)',
      backdropFilter: 'blur(10px)',
      position: 'relative', zIndex: 2,
    }}>
      <div style={{ display: 'flex', gap: '3rem', animation: 'rrMarquee 28s linear infinite', width: 'max-content' }}>
        {[...items, ...items].map((text, i) => (
          <span key={i} style={{
            fontSize: '0.55rem',
            color: text === '✦' ? '#C9A84C' : '#444',
            letterSpacing: '0.38em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            fontFamily: 'Montserrat, sans-serif',
          }}>{text}</span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════ */
export default function HomePage() {
  const [heroVisible, setHeroVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorHover, setCursorHover] = useState(false);

  /* Shared refs for Three.js animation loop */
  const scrollRef = useRef(0);   /* 0–1 overall progress */
  const mouseRef = useRef({ x: 0, y: 0 });

  /* Section scroll progress */
  const [heroRef, heroScroll] = useElementScroll();
  const [collectionsRef, collectionsScroll] = useElementScroll();
  const [brandRef, brandScroll] = useElementScroll();
  const [valuesRef, valuesScroll] = useElementScroll();

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 120);

    const onScroll = () => {
      const sy = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      scrollRef.current = maxScroll > 0 ? sy / maxScroll : 0;
      setScrollY(sy);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const onMove = (e) => {
      setCursor({ x: e.clientX, y: e.clientY });
      setCursorVisible(true);
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    const onLeave = () => setCursorVisible(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    const enterHover = () => setCursorHover(true);
    const leaveHover = () => setCursorHover(false);
    const updateInteractive = () => {
      document.querySelectorAll('a, button').forEach(el => {
        el.removeEventListener('mouseenter', enterHover);
        el.removeEventListener('mouseleave', leaveHover);
        el.addEventListener('mouseenter', enterHover);
        el.addEventListener('mouseleave', leaveHover);
      });
    };
    updateInteractive();
    const obs = new MutationObserver(updateInteractive);
    obs.observe(document.body, { subtree: true, childList: true });

    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      obs.disconnect();
    };
  }, []);

  const categories = [
    { label: 'Menswear',   desc: 'Sport & lifestyle essentials for the modern man', icon: '👔' },
    { label: 'Womenswear', desc: 'Elegant everyday wear, effortlessly refined',      icon: '👗' },
    { label: 'Kiddies',    desc: 'Stylish pieces designed for little ones',           icon: '🧒' },
    { label: 'Baby Wear',  desc: 'Soft, premium comfort from day one',               icon: '👶' },
  ];

  const values = [
    { title: 'Quality',        desc: 'Only the finest materials, constructed to outlast trends and time.' },
    { title: 'Design',         desc: 'Style meets function — every piece is entirely intentional.' },
    { title: 'Customer Focus', desc: 'You are at the heart of everything we create and do.' },
    { title: 'Innovation',     desc: 'Always improving, always evolving, never standing still.' },
  ];

  /* Hero parallax — content tilts back + recedes as you scroll past */
  const heroDepth = heroScroll * 60;
  const heroTiltX = heroScroll * 22;
  const heroOpacity = Math.max(0, 1 - heroScroll * 1.6);

  /* Brand statement parallax */
  const brandTilt = (brandScroll - 0.5) * 14;
  const brandScale = 0.88 + brandScroll * 0.24;

  return (
    <div style={{ paddingTop: '70px', background: '#060606', overflowX: 'hidden' }}>

      {/* ── Three.js background ── */}
      <ThreeBackground scrollRef={scrollRef} mouseRef={mouseRef} />

      {/* ── Custom cursor ── */}
      <div style={{
        position: 'fixed',
        left: cursor.x, top: cursor.y,
        width: cursorHover ? '6px' : '10px',
        height: cursorHover ? '6px' : '10px',
        background: '#C9A84C',
        borderRadius: '50%',
        pointerEvents: 'none', zIndex: 9999,
        transform: 'translate(-50%,-50%)',
        opacity: cursorVisible ? 1 : 0,
        transition: 'opacity 0.3s, width 0.2s, height 0.2s',
        mixBlendMode: 'difference',
      }} />
      <div style={{
        position: 'fixed',
        left: cursor.x, top: cursor.y,
        width: cursorHover ? '50px' : '34px',
        height: cursorHover ? '50px' : '34px',
        border: '1px solid rgba(201,168,76,0.55)',
        borderRadius: '50%',
        pointerEvents: 'none', zIndex: 9998,
        transform: 'translate(-50%,-50%)',
        opacity: cursorVisible ? 1 : 0,
        transition: 'left 0.08s, top 0.08s, opacity 0.3s, width 0.3s, height 0.3s',
      }} />

      {/* ══════════════════════════════════
          HERO — CSS 3D depth layers
      ══════════════════════════════════ */}
      <section
        ref={heroRef}
        style={{
          minHeight: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center',
          padding: '4rem 2rem',
          position: 'relative',
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
        }}
      >
        {/* Depth grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          transform: `translateZ(-120px) scale(1.4) rotateX(${heroScroll * 8}deg)`,
          transformStyle: 'preserve-3d',
          zIndex: 1,
        }} />

        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%,-50%) translateZ(-60px)`,
          width: '800px', height: '800px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.055) 0%, transparent 65%)',
          pointerEvents: 'none', zIndex: 1,
        }} />

        {/* Main content — tilts back on scroll */}
        <div style={{
          maxWidth: '920px',
          position: 'relative', zIndex: 2,
          transformStyle: 'preserve-3d',
          transform: `
            rotateX(${heroTiltX}deg)
            translateZ(${-heroDepth}px)
          `,
          opacity: heroOpacity,
          transition: 'none',
          willChange: 'transform, opacity',
        }}>
          {/* Eyebrow */}
          <p style={{
            fontSize: '0.6rem', color: '#C9A84C',
            letterSpacing: '0.55em', textTransform: 'uppercase',
            marginBottom: '2.5rem',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 300,
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity 1s ease 0.2s, transform 1s ease 0.2s',
          }}>
            ✦ &nbsp; Premium Sport &amp; Lifestyle &nbsp; ✦
          </p>

          {/* 3D stacked heading */}
          <div style={{ transformStyle: 'preserve-3d', perspective: '600px' }}>
            {[
              { text: 'R&R',       gold: true,  z: 30  },
              { text: 'Sport &',   gold: false, z: 15  },
              { text: 'Lifestyle', gold: false, z: 0   },
            ].map((word, i) => (
              <div key={i} style={{ overflow: 'hidden', lineHeight: 1.02, transformStyle: 'preserve-3d' }}>
                <DepthText
                  layers={word.gold ? 8 : 4}
                  style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: 'clamp(3.5rem, 11vw, 9rem)',
                    fontWeight: 300,
                    color: word.gold ? '#C9A84C' : '#F5F0E8',
                    display: 'block',
                    transformStyle: 'preserve-3d',
                    transform: `translateZ(${word.z}px)`,
                    opacity: heroVisible ? 1 : 0,
                    transition: `opacity 1.1s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.18}s`,
                    willChange: 'transform',
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: word.text }} />
                </DepthText>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{
            width: heroVisible ? '120px' : '0px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
            margin: '2.8rem auto',
            transition: 'width 1.4s cubic-bezier(0.16,1,0.3,1) 0.9s',
          }} />

          {/* Tagline */}
          <p style={{
            fontSize: '0.68rem', color: '#777',
            letterSpacing: '0.35em', textTransform: 'uppercase',
            marginBottom: '3.5rem',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 200,
            opacity: heroVisible ? 1 : 0,
            transform: `translateZ(${heroVisible ? 20 : 0}px)`,
            transition: 'opacity 1s ease 1.2s',
          }}>
            Own the Look, Own the Moment
          </p>

          {/* CTAs */}
          <div style={{
            display: 'flex', gap: '1.2rem',
            justifyContent: 'center', flexWrap: 'wrap',
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity 1s ease 1.5s, transform 1s ease 1.5s',
          }}>
            <Link href="/shop" className="rr-btn-primary">Shop the Collection</Link>
            <Link href="/about" className="rr-btn-outline">Our Story</Link>
          </div>

          {/* Scroll indicator */}
          <div style={{
            position: 'absolute', bottom: '-140px', left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7rem',
            opacity: heroVisible ? 1 : 0,
            transition: 'opacity 1s ease 2s',
          }}>
            <p style={{ fontSize: '0.48rem', color: '#333', letterSpacing: '0.45em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>
              Scroll
            </p>
            <div style={{
              width: '1px', height: '65px',
              background: 'linear-gradient(180deg, #C9A84C, transparent)',
              animation: 'rrScrollPulse 1.8s ease-in-out infinite',
            }} />
          </div>
        </div>

        {/* Floating depth rings — CSS only */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `translateZ(${-80 - i * 60}px)`,
            pointerEvents: 'none', zIndex: 1,
          }}>
            <div style={{
              width: `${400 + i * 200}px`,
              height: `${400 + i * 200}px`,
              borderRadius: '50%',
              border: `1px solid rgba(201,168,76,${0.06 - i * 0.015})`,
              animation: `rrRingPulse ${3 + i}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.8}s`,
            }} />
          </div>
        ))}
      </section>

      {/* ══ MARQUEE ══ */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <Marquee />
      </div>

      {/* ══════════════════════════════════
          COLLECTIONS — 3D card entrance
      ══════════════════════════════════ */}
      <section
        ref={collectionsRef}
        style={{
          padding: '10rem 4rem 9rem',
          maxWidth: '1300px', margin: '0 auto',
          position: 'relative', zIndex: 2,
          perspective: '1400px',
          perspectiveOrigin: '50% 40%',
        }}
      >
        <div style={{
          textAlign: 'center', marginBottom: '6rem',
          transform: `translateY(${Math.max(0, (0.5 - collectionsScroll) * 60)}px)`,
          opacity: Math.min(1, collectionsScroll * 3),
          transition: 'none',
        }}>
          <p style={{ fontSize: '0.58rem', color: '#C9A84C', letterSpacing: '0.55em', textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
            Browse
          </p>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(2.5rem,6vw,5rem)', fontWeight: 300, color: '#F5F0E8',
          }}>Our Collections</h2>
          <div style={{ width: '60px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '1.5rem auto 0' }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1px',
          background: 'rgba(201,168,76,0.04)',
          transformStyle: 'preserve-3d',
        }}>
          {categories.map((cat, i) => (
            <CategoryCard3D
              key={cat.label}
              cat={cat}
              index={i}
              sectionProgress={collectionsScroll}
            />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════
          BRAND STATEMENT — 3D perspective text
      ══════════════════════════════════ */}
      <section
        ref={brandRef}
        style={{
          background: 'rgba(8,8,6,0.92)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(201,168,76,0.1)',
          borderBottom: '1px solid rgba(201,168,76,0.1)',
          padding: '10rem 2rem',
          textAlign: 'center',
          position: 'relative', zIndex: 2,
          overflow: 'hidden',
          perspective: '1000px',
        }}
      >
        {/* Massive 3D watermark */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(8rem, 24vw, 20rem)',
          color: 'transparent',
          WebkitTextStroke: '1px rgba(201,168,76,0.04)',
          userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap', fontWeight: 300,
          transform: `translate(-50%,-50%) rotateX(${brandTilt}deg) scale(${brandScale})`,
          transition: 'none',
          willChange: 'transform',
        }}>R&amp;R</div>

        <div style={{
          maxWidth: '880px', margin: '0 auto',
          position: 'relative', zIndex: 1,
          transform: `rotateX(${brandTilt * 0.5}deg) scale(${0.95 + brandScroll * 0.08})`,
          opacity: Math.min(1, brandScroll * 2.5),
          transition: 'none',
          willChange: 'transform, opacity',
        }}>
          <p style={{ fontSize: '0.58rem', color: '#C9A84C', letterSpacing: '0.55em', textTransform: 'uppercase', marginBottom: '2rem', fontFamily: 'Montserrat, sans-serif' }}>
            Our Mission
          </p>

          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(1.8rem, 4.5vw, 3.5rem)',
            fontWeight: 300, fontStyle: 'italic',
            color: '#F5F0E8', lineHeight: 1.6,
          }}>
            "Premium clothing that combines{' '}
            <span style={{ color: '#C9A84C', fontStyle: 'normal' }}>elegance with comfort</span>,
            designed for the modern individual who lives without compromise."
          </h2>

          <div style={{ width: '60px', height: '1px', background: '#C9A84C', margin: '3rem auto 2.5rem' }} />
          <Link href="/about" className="rr-btn-outline">Read Our Story</Link>
        </div>
      </section>

      {/* ══════════════════════════════════
          VALUES — depth-stacked cards
      ══════════════════════════════════ */}
      <section
        ref={valuesRef}
        style={{
          padding: '10rem 4rem', maxWidth: '1200px', margin: '0 auto',
          position: 'relative', zIndex: 2,
          perspective: '1200px',
          perspectiveOrigin: '50% 30%',
        }}
      >
        <div style={{
          textAlign: 'center', marginBottom: '5rem',
          transform: `translateY(${Math.max(0, (0.4 - valuesScroll) * 60)}px)`,
          opacity: Math.min(1, valuesScroll * 3),
        }}>
          <p style={{ fontSize: '0.58rem', color: '#C9A84C', letterSpacing: '0.55em', textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
            What We Stand For
          </p>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.5rem,6vw,5rem)', fontWeight: 300, color: '#F5F0E8' }}>
            Our Values
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1px',
          background: 'rgba(201,168,76,0.04)',
          transformStyle: 'preserve-3d',
        }}>
          {values.map((v, i) => (
            <ValueCard3D
              key={v.title}
              value={v}
              index={i}
              sectionProgress={valuesScroll}
            />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════
          FINAL CTA — 3D tunnel effect
      ══════════════════════════════════ */}
      <section style={{
        padding: '12rem 2rem',
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(4,4,4,0.96), rgba(12,12,8,0.96))',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(201,168,76,0.1)',
        position: 'relative', zIndex: 2,
        overflow: 'hidden',
        perspective: '1000px',
      }}>
        {/* 3D receding rings tunnel */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: `${i * 22}vw`, height: `${i * 22}vw`,
            borderRadius: '50%',
            border: `1px solid rgba(201,168,76,${0.08 - i * 0.012})`,
            transform: `translate(-50%, -50%) translateZ(${-i * 80}px)`,
            animation: `rrRingPulse ${2.5 + i * 0.7}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.5}s`,
            pointerEvents: 'none',
          }} />
        ))}

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(2.5rem, 8vw, 6.5rem)',
            fontWeight: 300, color: '#F5F0E8',
            lineHeight: 1.05, marginBottom: '1rem',
          }}>
            Ready to{' '}
            <span style={{ color: '#C9A84C' }}>elevate</span>
            {' '}your wardrobe?
          </h2>
          <p style={{
            fontSize: '0.65rem', color: '#444',
            letterSpacing: '0.3em', marginBottom: '3.5rem',
            fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase',
          }}>
            118 premium pieces — available now
          </p>
          <Link href="/shop" className="rr-btn-primary">Shop Now</Link>
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
          0%,100% { opacity: 1; transform: scaleY(1); }
          50%     { opacity: 0.15; transform: scaleY(0.3); }
        }
        @keyframes rrRingPulse {
          from { opacity: 0.15; transform: translate(-50%,-50%) scale(0.97); }
          to   { opacity: 0.55; transform: translate(-50%,-50%) scale(1.03); }
        }

        .rr-btn-primary {
          display: inline-block;
          padding: 1.1rem 3rem;
          background: #C9A84C;
          color: #0a0a0a;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.58rem;
          font-weight: 500;
          letter-spacing: 0.38em;
          text-transform: uppercase;
          text-decoration: none;
          position: relative; overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s;
          clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
        }
        .rr-btn-primary::before {
          content: '';
          position: absolute; inset: 0;
          background: #E8C96A;
          transform: translateX(-101%);
          transition: transform 0.48s cubic-bezier(0.16,1,0.3,1);
        }
        .rr-btn-primary:hover::before { transform: translateX(0); }
        .rr-btn-primary:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(201,168,76,0.25);
        }
        .rr-btn-primary span { position: relative; z-index: 1; }

        .rr-btn-outline {
          display: inline-block;
          padding: 1.1rem 3rem;
          border: 1px solid rgba(201,168,76,0.5);
          color: #C9A84C;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.58rem; font-weight: 300;
          letter-spacing: 0.38em; text-transform: uppercase;
          text-decoration: none;
          position: relative; overflow: hidden;
          transition: border-color 0.4s, transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s;
        }
        .rr-btn-outline::before {
          content: '';
          position: absolute; inset: 0;
          background: rgba(201,168,76,0.07);
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.48s cubic-bezier(0.16,1,0.3,1);
        }
        .rr-btn-outline:hover::before { transform: scaleX(1); }
        .rr-btn-outline:hover {
          border-color: #C9A84C;
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(201,168,76,0.12);
        }
      `}</style>
    </div>
  );
}