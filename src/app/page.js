'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

/* ─────────────────────────────────────────
   THREE.JS 3D BACKGROUND
───────────────────────────────────────── */
function ThreeBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    /* ── Scene & Camera ── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 22);

    /* ── Lights ── */
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    const pointA = new THREE.PointLight(0xC9A84C, 3.5, 60);
    pointA.position.set(12, 8, 15);
    scene.add(pointA);

    const pointB = new THREE.PointLight(0x8B6A20, 2, 50);
    pointB.position.set(-15, -10, 10);
    scene.add(pointB);

    const rimLight = new THREE.DirectionalLight(0xC9A84C, 0.6);
    rimLight.position.set(0, 20, -10);
    scene.add(rimLight);

    /* ── Materials ── */
    const matSolid = new THREE.MeshStandardMaterial({
      color: 0xA8842A, metalness: 1, roughness: 0.18,
      transparent: true, opacity: 0.75,
    });
    const matWire = new THREE.MeshStandardMaterial({
      color: 0xC9A84C, metalness: 0.9, roughness: 0.25,
      transparent: true, opacity: 0.55, side: THREE.DoubleSide,
    });
    const matGlass = new THREE.MeshStandardMaterial({
      color: 0xC9A84C, metalness: 0.6, roughness: 0.05,
      transparent: true, opacity: 0.22, side: THREE.DoubleSide,
    });
    const matEdge = new THREE.LineBasicMaterial({
      color: 0xC9A84C, transparent: true, opacity: 0.35,
    });

    function withEdges(mesh, geo) {
      const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo), matEdge.clone());
      mesh.add(lines);
    }

    /* ── Objects ── */
    const objects = [];

    // Large central torus
    const torusGeo = new THREE.TorusGeometry(4.5, 0.9, 24, 80);
    const torus = new THREE.Mesh(torusGeo, matSolid.clone());
    torus.position.set(0, 0, -5);
    torus.rotation.x = Math.PI / 5;
    scene.add(torus);
    objects.push({ mesh: torus, rx: 0.003, ry: 0.006, rz: 0.001, fs: 0.4, fa: 0.4 });

    // Icosahedron left
    const icoGeo = new THREE.IcosahedronGeometry(2.2, 0);
    const ico = new THREE.Mesh(icoGeo, matWire.clone());
    ico.position.set(-10, 2, -3);
    withEdges(ico, icoGeo);
    scene.add(ico);
    objects.push({ mesh: ico, rx: 0.008, ry: 0.005, rz: 0.003, fs: 0.6, fa: 0.6 });

    // Octahedron right
    const octGeo = new THREE.OctahedronGeometry(2, 0);
    const oct = new THREE.Mesh(octGeo, matGlass.clone());
    oct.position.set(11, -1, -2);
    withEdges(oct, octGeo);
    scene.add(oct);
    objects.push({ mesh: oct, rx: 0.006, ry: 0.009, rz: 0.004, fs: 0.5, fa: 0.5 });

    // Small torus top-right
    const torus2Geo = new THREE.TorusGeometry(2, 0.35, 16, 60);
    const torus2 = new THREE.Mesh(torus2Geo, matGlass.clone());
    torus2.position.set(7, 7, -8);
    torus2.rotation.x = Math.PI / 3;
    scene.add(torus2);
    objects.push({ mesh: torus2, rx: 0.01, ry: 0.004, rz: 0.007, fs: 0.35, fa: 0.45 });

    // Tetrahedron bottom-left
    const tetraGeo = new THREE.TetrahedronGeometry(1.8, 0);
    const tetra = new THREE.Mesh(tetraGeo, matWire.clone());
    tetra.position.set(-9, -5, -2);
    withEdges(tetra, tetraGeo);
    scene.add(tetra);
    objects.push({ mesh: tetra, rx: 0.007, ry: 0.012, rz: 0.005, fs: 0.7, fa: 0.7 });

    // Dodecahedron far
    const dodecGeo = new THREE.DodecahedronGeometry(1.6, 0);
    const dodec = new THREE.Mesh(dodecGeo, matSolid.clone());
    dodec.position.set(13, 5, -12);
    scene.add(dodec);
    objects.push({ mesh: dodec, rx: 0.005, ry: 0.007, rz: 0.003, fs: 0.45, fa: 0.55 });

    // Torus knot
    const knotGeo = new THREE.TorusKnotGeometry(1.5, 0.35, 80, 12, 2, 3);
    const knot = new THREE.Mesh(knotGeo, matWire.clone());
    knot.position.set(-7, 6, -9);
    scene.add(knot);
    objects.push({ mesh: knot, rx: 0.009, ry: 0.006, rz: 0.004, fs: 0.55, fa: 0.65 });

    // Thin ring
    const ringGeo = new THREE.TorusGeometry(3, 0.06, 8, 120);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({
      color: 0xC9A84C, metalness: 1, roughness: 0.1, transparent: true, opacity: 0.35,
    }));
    ring.position.set(2, -7, -6);
    ring.rotation.x = Math.PI / 4;
    scene.add(ring);
    objects.push({ mesh: ring, rx: 0.004, ry: 0.008, rz: 0.002, fs: 0.3, fa: 0.3 });

    /* ── Particles ── */
    const COUNT = 300;
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 70;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40 - 5;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: 0xC9A84C, size: 0.07, transparent: true, opacity: 0.5, sizeAttenuation: true,
    })));

    /* ── State ── */
    let mouseX = 0, mouseY = 0;
    let tX = 0, tY = 0;
    let scrollY = 0;
    let raf;

    const onMouse = (e) => {
      mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => { scrollY = window.scrollY; };
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', onMouse);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    /* ── Animation ── */
    const clock = new THREE.Clock();
    function animate() {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      tX += (mouseX - tX) * 0.04;
      tY += (mouseY - tY) * 0.04;

      camera.position.x = tX * 2.5;
      camera.position.y = -tY * 1.5 - scrollY * 0.003;
      camera.position.z = 22 - scrollY * 0.004;
      camera.lookAt(0, -scrollY * 0.003, 0);

      objects.forEach((o, i) => {
        o.mesh.rotation.x += o.rx;
        o.mesh.rotation.y += o.ry;
        o.mesh.rotation.z += o.rz;
        o.mesh.position.y += Math.sin(t * o.fs + i) * o.fa * 0.005;
      });

      pointA.intensity = 3.5 + Math.sin(t * 0.8) * 0.5;
      pointB.intensity = 2.0 + Math.cos(t * 0.6) * 0.4;

      renderer.render(scene, camera);
    }
    animate();

    /* ── Cleanup ── */
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      }}
    />
  );
}

/* ─────────────────────────────────────────
   SCROLL REVEAL HOOK
───────────────────────────────────────── */
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

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(55px)',
        transition: `opacity .95s cubic-bezier(.16,1,.3,1) ${delay}s, transform .95s cubic-bezier(.16,1,.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────
   3D TILT CARD
───────────────────────────────────────── */
function TiltCard({ children, className = '', style = {} }) {
  const ref = useRef(null);

  const onMove = useCallback((e) => {
    const card = ref.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left) / width  - 0.5;
    const y = (e.clientY - top)  / height - 0.5;
    card.style.transform   = `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 8}deg) translateZ(10px)`;
    card.style.boxShadow   = `${-x * 18}px ${y * 18}px 38px rgba(201,168,76,0.1)`;
  }, []);

  const onLeave = useCallback(() => {
    const card = ref.current;
    if (!card) return;
    card.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) translateZ(0)';
    card.style.boxShadow = 'none';
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{ transformStyle: 'preserve-3d', transition: 'transform .15s ease, box-shadow .15s ease', ...style }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────
   CATEGORY CARD
───────────────────────────────────────── */
function CategoryCard({ cat, index }) {
  const [hovered, setHovered] = useState(false);
  const num = String(index + 1).padStart(2, '0');

  return (
    <Link href={`/shop?category=${cat.label.toLowerCase()}`} style={{ textDecoration: 'none' }}>
      <TiltCard>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            border: '1px solid',
            borderColor: hovered ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.07)',
            padding: '3.8rem 2.8rem',
            background: hovered ? 'rgba(201,168,76,0.025)' : '#050503',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            transition: 'border-color .4s, background .4s',
          }}
        >
          {/* Bottom sweep line */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            height: '2px',
            width: hovered ? '100%' : '0%',
            background: 'linear-gradient(90deg,transparent,#C9A84C,transparent)',
            transition: 'width .55s cubic-bezier(.16,1,.3,1)',
          }} />

          <p style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '.7rem', color: hovered ? '#C9A84C' : 'rgba(201,168,76,.18)',
            letterSpacing: '.22em', marginBottom: '1.6rem', transition: 'color .4s',
          }}>{num}</p>

          <span style={{
            fontSize: '2.8rem', display: 'block', marginBottom: '1.6rem',
            transform: hovered ? 'scale(1.14) rotate(-6deg)' : 'scale(1)',
            transition: 'transform .45s cubic-bezier(.16,1,.3,1)',
          }}>{cat.icon}</span>

          <h3 style={{
            fontFamily: 'Cormorant Garamond, serif', fontSize: '1.9rem', fontWeight: 200,
            color: hovered ? '#C9A84C' : '#F5F0E8',
            marginBottom: '.5rem', transition: 'color .3s',
          }}>{cat.label}</h3>

          <p style={{ fontSize: '.6rem', color: '#4a4a4a', letterSpacing: '.07em', lineHeight: 1.95 }}>
            {cat.desc}
          </p>

          <span style={{
            display: 'inline-block', color: '#C9A84C', fontSize: '1.3rem',
            marginTop: '1.6rem',
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateX(8px)' : 'translateX(-6px)',
            transition: 'all .4s',
          }}>→</span>
        </div>
      </TiltCard>
    </Link>
  );
}

/* ─────────────────────────────────────────
   MARQUEE
───────────────────────────────────────── */
function Marquee() {
  const items = [
    'Premium Quality','✦','South African Brand','✦',
    'Sport & Lifestyle','✦','All Ages','✦',
    'Free Delivery','✦','118 Pieces Available','✦',
  ];
  return (
    <div style={{
      borderTop: '1px solid rgba(201,168,76,.12)',
      borderBottom: '1px solid rgba(201,168,76,.12)',
      padding: '1.1rem 0', overflow: 'hidden', background: '#080806',
    }}>
      <div style={{
        display: 'flex', gap: '3rem',
        animation: 'rrMarquee 28s linear infinite',
        width: 'max-content',
      }}>
        {[...items, ...items].map((t, i) => (
          <span key={i} style={{
            fontSize: t === '✦' ? '.8rem' : '.5rem',
            color: t === '✦' ? '#C9A84C' : '#444',
            letterSpacing: '.35em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', fontFamily: 'Montserrat, sans-serif',
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   VALUE CARD
───────────────────────────────────────── */
function ValueCard({ value, index }) {
  const [hovered, setHovered] = useState(false);
  const romans = ['I', 'II', 'III', 'IV'];
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(201,168,76,.022)' : '#050503',
        padding: '3.2rem 2.2rem', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
        transition: 'background .4s',
      }}
    >
      <div style={{
        position: 'absolute', top: '-.6rem', right: '1.2rem',
        fontFamily: 'Cormorant Garamond, serif', fontSize: '5.5rem', fontWeight: 200,
        color: hovered ? 'rgba(201,168,76,.09)' : 'rgba(201,168,76,.03)',
        userSelect: 'none', pointerEvents: 'none', transition: 'color .4s',
      }}>{romans[index]}</div>

      <div style={{
        width: hovered ? '52px' : '24px', height: '1px',
        background: '#C9A84C', margin: '0 auto 1.6rem',
        transition: 'width .45s cubic-bezier(.16,1,.3,1)',
      }} />

      <h3 style={{
        fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 200,
        color: '#C9A84C', marginBottom: '.8rem',
      }}>{value.title}</h3>

      <p style={{ fontSize: '.62rem', color: '#5a5a5a', lineHeight: 1.95, letterSpacing: '.05em' }}>
        {value.desc}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────
   CUSTOM CURSOR
───────────────────────────────────────── */
function Cursor() {
  const dotRef  = useRef(null);
  const ringRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [big, setBig] = useState(false);

  useEffect(() => {
    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const onMove = (e) => {
      dot.style.left  = e.clientX + 'px';
      dot.style.top   = e.clientY + 'px';
      ring.style.left = e.clientX + 'px';
      ring.style.top  = e.clientY + 'px';
      setVisible(true);
    };
    const onLeave = () => setVisible(false);

    const onEnter = () => setBig(true);
    const onExit  = () => setBig(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onExit);
    });

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const base = {
    position: 'fixed', borderRadius: '50%',
    pointerEvents: 'none', zIndex: 9999,
    transform: 'translate(-50%,-50%)',
    opacity: visible ? 1 : 0,
    transition: 'opacity .3s',
  };

  return (
    <>
      <div ref={dotRef} style={{
        ...base,
        width: big ? '7px' : '10px',
        height: big ? '7px' : '10px',
        background: '#C9A84C',
        mixBlendMode: 'difference',
        transition: 'opacity .3s, width .2s, height .2s',
      }} />
      <div ref={ringRef} style={{
        ...base,
        width: big ? '54px' : '38px',
        height: big ? '54px' : '38px',
        border: '1px solid rgba(201,168,76,.45)',
        transition: 'left .08s, top .08s, opacity .3s, width .3s, height .3s',
      }} />
    </>
  );
}

/* ═════════════════════════════════════════
   MAIN PAGE
═════════════════════════════════════════ */
export default function HomePage() {
  const [heroIn, setHeroIn] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setHeroIn(true), 120);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); };
  }, []);

  const categories = [
    { label: 'Menswear',   icon: '👔', desc: 'Sport & lifestyle essentials for the modern man' },
    { label: 'Womenswear', icon: '👗', desc: 'Elegant everyday wear, effortlessly refined' },
    { label: 'Kiddies',    icon: '🧒', desc: 'Stylish pieces designed for little ones' },
    { label: 'Baby Wear',  icon: '👶', desc: 'Soft, premium comfort from day one' },
  ];

  const values = [
    { title: 'Quality',        desc: 'Only the finest materials, constructed to outlast trends and time.' },
    { title: 'Design',         desc: 'Style meets function — every piece is entirely intentional.' },
    { title: 'Customer Focus', desc: 'You are at the heart of everything we create and do.' },
    { title: 'Innovation',     desc: 'Always improving, always evolving, never standing still.' },
  ];

  const wordStyle = (delay) => ({
    display: 'inline-block',
    opacity: heroIn ? 1 : 0,
    transform: heroIn ? 'none' : 'translateY(105%)',
    transition: `opacity 1.1s cubic-bezier(.16,1,.3,1) ${delay}s, transform 1.1s cubic-bezier(.16,1,.3,1) ${delay}s`,
  });

  return (
    <div style={{ paddingTop: '70px', background: '#050503', overflowX: 'hidden' }}>

      {/* 3D Background */}
      <ThreeBackground />

      {/* Custom cursor */}
      <Cursor />

      {/* ══ NAV ══ */}
      <NavBar />

      {/* ══ HERO ══ */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '4rem 2rem',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Vertical ambient lines */}
        {[12, 28, 50, 72, 88].map((left, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${left}%`, top: 0, bottom: 0,
            width: '1px',
            background: 'linear-gradient(180deg,transparent,rgba(201,168,76,.055),transparent)',
            animation: `rrPulse ${2.2 + i * 0.5}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.4}s`,
            zIndex: 1, pointerEvents: 'none',
          }} />
        ))}

        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%,-50%) translateY(${scrollY * 0.15}px)`,
          width: '700px', height: '700px', borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(201,168,76,.06) 0%,transparent 65%)',
          pointerEvents: 'none', zIndex: 1,
        }} />

        <div style={{ maxWidth: '960px', position: 'relative', zIndex: 2 }}>
          {/* Eyebrow */}
          <p style={{
            fontSize: '.52rem', color: '#C9A84C', letterSpacing: '.55em',
            textTransform: 'uppercase', marginBottom: '2.5rem',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 200,
            opacity: heroIn ? 1 : 0, transform: heroIn ? 'none' : 'translateY(20px)',
            transition: 'opacity 1s ease .3s, transform 1s ease .3s',
          }}>✦ &nbsp; Premium Sport &amp; Lifestyle &nbsp; ✦</p>

          {/* Heading */}
          <h1 style={{
            fontFamily: 'Cormorant Garamond, serif', fontWeight: 200,
            fontSize: 'clamp(4rem,11vw,9.5rem)', lineHeight: '.88', marginBottom: 0,
          }}>
            {[
              { text: 'R&R',       gold: true,  delay: .32 },
              { text: 'Sport &',   gold: false, delay: .5  },
              { text: 'Lifestyle', gold: false, delay: .68 },
            ].map((w, i) => (
              <span key={i} style={{ display: 'block', overflow: 'hidden', lineHeight: 1.05 }}>
                <span
                  dangerouslySetInnerHTML={{ __html: w.text }}
                  style={{ ...wordStyle(w.delay), color: w.gold ? '#C9A84C' : '#F5F0E8' }}
                />
              </span>
            ))}
          </h1>

          {/* Divider */}
          <div style={{
            width: heroIn ? '110px' : '0px', height: '1px',
            background: 'linear-gradient(90deg,transparent,#C9A84C,transparent)',
            margin: '2.6rem auto',
            transition: 'width 1.3s cubic-bezier(.16,1,.3,1) .9s',
          }} />

          {/* Tagline */}
          <p style={{
            fontSize: '.62rem', color: '#5a5a5a', letterSpacing: '.35em',
            textTransform: 'uppercase', marginBottom: '3.5rem',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 200,
            opacity: heroIn ? 1 : 0, transition: 'opacity 1s ease 1.3s',
          }}>Own the Look, Own the Moment</p>

          {/* CTAs */}
          <div style={{
            display: 'flex', gap: '1.2rem', justifyContent: 'center', flexWrap: 'wrap',
            opacity: heroIn ? 1 : 0, transform: heroIn ? 'none' : 'translateY(18px)',
            transition: 'opacity 1s ease 1.6s, transform 1s ease 1.6s',
          }}>
            <Link href="/shop" className="rr-btn-primary">Shop the Collection</Link>
            <Link href="/about" className="rr-btn-outline">Our Story</Link>
          </div>

          {/* Scroll indicator */}
          <div style={{
            position: 'absolute', bottom: '-160px', left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.6rem',
            opacity: heroIn ? 1 : 0, transition: 'opacity 1s ease 2.4s',
          }}>
            <p style={{ fontSize: '.44rem', color: '#333', letterSpacing: '.45em', textTransform: 'uppercase' }}>Scroll</p>
            <div style={{
              width: '1px', height: '64px',
              background: 'linear-gradient(180deg,#C9A84C,transparent)',
              animation: 'rrScrollPulse 1.7s ease-in-out infinite',
            }} />
          </div>
        </div>
      </section>

      {/* ══ MARQUEE ══ */}
      <Marquee />

      {/* ══ COLLECTIONS ══ */}
      <section style={{ padding: '10rem 4rem 8rem', maxWidth: '1340px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '5.5rem' }}>
            <p style={{ fontSize: '.52rem', color: '#C9A84C', letterSpacing: '.5em', textTransform: 'uppercase', marginBottom: '.9rem', fontFamily: 'Montserrat, sans-serif' }}>Browse</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem,6vw,5.5rem)', fontWeight: 200, color: '#F5F0E8' }}>Our Collections</h2>
          </div>
        </Reveal>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(265px,1fr))',
          gap: '1.5px', background: 'rgba(201,168,76,.05)',
        }}>
          {categories.map((cat, i) => (
            <Reveal key={cat.label} delay={i * 0.1}>
              <CategoryCard cat={cat} index={i} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ BRAND STATEMENT ══ */}
      <section style={{
        background: '#080806',
        borderTop: '1px solid rgba(201,168,76,.1)',
        borderBottom: '1px solid rgba(201,168,76,.1)',
        padding: '11rem 2rem', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Watermark */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%,-50%) translateY(${scrollY * 0.04}px)`,
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(8rem,23vw,18rem)',
          color: 'rgba(201,168,76,.022)',
          userSelect: 'none', pointerEvents: 'none',
          whiteSpace: 'nowrap', fontWeight: 200,
        }}>R&amp;R</div>

        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <p style={{ fontSize: '.52rem', color: '#C9A84C', letterSpacing: '.5em', textTransform: 'uppercase', marginBottom: '2rem', fontFamily: 'Montserrat, sans-serif' }}>Our Mission</p>
          </Reveal>
          <Reveal delay={0.2}>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(1.9rem,4.5vw,3.6rem)',
              fontWeight: 200, fontStyle: 'italic',
              color: '#F5F0E8', lineHeight: 1.6,
            }}>
              "Premium clothing that combines{' '}
              <span style={{ color: '#C9A84C', fontStyle: 'normal' }}>elegance with comfort</span>,
              designed for the modern individual who lives without compromise."
            </h2>
          </Reveal>
          <Reveal delay={0.4}>
            <div style={{ width: '60px', height: '1px', background: '#C9A84C', margin: '3rem auto 2.8rem' }} />
            <Link href="/about" className="rr-btn-outline">Read Our Story</Link>
          </Reveal>
        </div>
      </section>

      {/* ══ VALUES ══ */}
      <section style={{ padding: '9rem 4rem', maxWidth: '1240px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '5.5rem' }}>
            <p style={{ fontSize: '.52rem', color: '#C9A84C', letterSpacing: '.5em', textTransform: 'uppercase', marginBottom: '.9rem', fontFamily: 'Montserrat, sans-serif' }}>What We Stand For</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem,6vw,5.5rem)', fontWeight: 200, color: '#F5F0E8' }}>Our Values</h2>
          </div>
        </Reveal>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(225px,1fr))',
          gap: '1px', background: 'rgba(201,168,76,.05)',
        }}>
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.15}>
              <ValueCard value={v} index={i} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ FINAL CTA ══ */}
      <section style={{
        padding: '12rem 2rem', textAlign: 'center',
        background: 'linear-gradient(135deg,#050503,#0c0c07,#050503)',
        borderTop: '1px solid rgba(201,168,76,.1)',
        position: 'relative', overflow: 'hidden',
      }}>
        {[8, 22, 50, 78, 92].map((left, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${left}%`, top: 0, bottom: 0, width: '1px',
            background: 'linear-gradient(180deg,transparent,rgba(201,168,76,.05),transparent)',
            animation: `rrPulse ${2 + i * 0.6}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(3rem,8vw,7rem)',
              fontWeight: 200, lineHeight: .95, marginBottom: '1.2rem',
            }}>
              Ready to{' '}<span style={{ color: '#C9A84C' }}>elevate</span>
              {' '}your wardrobe?
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p style={{ fontSize: '.58rem', color: '#444', letterSpacing: '.22em', marginBottom: '3.2rem' }}>
              118 premium pieces — available now
            </p>
            <Link href="/shop" className="rr-btn-primary">Shop Now</Link>
          </Reveal>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{
        borderTop: '1px solid rgba(201,168,76,.1)',
        padding: '3rem 4rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem', background: '#030302',
      }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 200, color: '#C9A84C', letterSpacing: '.14em' }}>
          R&amp;R Sport &amp; Lifestyle
        </div>
        <div style={{ display: 'flex', gap: '2.5rem' }}>
          {['Shop','About','Collections','Contact'].map(l => (
            <Link key={l} href={`/${l.toLowerCase()}`} style={{ fontSize: '.48rem', letterSpacing: '.3em', textTransform: 'uppercase', color: '#333', textDecoration: 'none' }}>{l}</Link>
          ))}
        </div>
        <p style={{ fontSize: '.48rem', color: '#2a2a2a', letterSpacing: '.18em' }}>© 2025 R&amp;R · South Africa</p>
      </footer>

      {/* ══ GLOBAL STYLES ══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,200;0,300;0,400;1,200;1,300&family=Montserrat:wght@100;200;300;400;500&display=swap');

        * { cursor: none !important; }

        @keyframes rrMarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes rrPulse {
          from { opacity: .2; }
          to   { opacity: 1; }
        }
        @keyframes rrScrollPulse {
          0%,100% { opacity:1; transform:scaleY(1); }
          50%     { opacity:.15; transform:scaleY(.35); }
        }

        .rr-btn-primary {
          display: inline-block;
          padding: 1.05rem 3rem;
          background: #C9A84C;
          color: #050503;
          font-family: 'Montserrat', sans-serif;
          font-size: .55rem;
          font-weight: 500;
          letter-spacing: .38em;
          text-transform: uppercase;
          text-decoration: none;
          position: relative;
          overflow: hidden;
          transition: transform .3s cubic-bezier(.16,1,.3,1);
        }
        .rr-btn-primary::before {
          content: '';
          position: absolute; inset: 0;
          background: #E8C96A;
          transform: translateX(-100%);
          transition: transform .48s cubic-bezier(.16,1,.3,1);
        }
        .rr-btn-primary:hover::before { transform: translateX(0); }
        .rr-btn-primary:hover { transform: translateY(-3px); }

        .rr-btn-outline {
          display: inline-block;
          padding: 1.05rem 3rem;
          border: 1px solid rgba(201,168,76,.4);
          color: #C9A84C;
          font-family: 'Montserrat', sans-serif;
          font-size: .55rem;
          font-weight: 200;
          letter-spacing: .38em;
          text-transform: uppercase;
          text-decoration: none;
          position: relative;
          overflow: hidden;
          transition: border-color .4s, transform .3s cubic-bezier(.16,1,.3,1);
        }
        .rr-btn-outline::before {
          content: '';
          position: absolute; inset: 0;
          background: rgba(201,168,76,.07);
          transform: scaleX(0); transform-origin: left;
          transition: transform .45s cubic-bezier(.16,1,.3,1);
        }
        .rr-btn-outline:hover::before { transform: scaleX(1); }
        .rr-btn-outline:hover { border-color: #C9A84C; transform: translateY(-3px); }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────
   NAVBAR (separate component to use scroll)
───────────────────────────────────────── */
function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '1.8rem 4rem',
      borderBottom: `1px solid ${scrolled ? 'rgba(201,168,76,.1)' : 'transparent'}`,
      background: scrolled ? 'rgba(5,5,3,.75)' : 'transparent',
      backdropFilter: scrolled ? 'blur(14px)' : 'none',
      transition: 'all .4s',
    }}>
      <Link href="/" style={{
        fontFamily: 'Cormorant Garamond, serif', fontSize: '1.75rem',
        fontWeight: 200, letterSpacing: '.14em', color: '#C9A84C', textDecoration: 'none',
      }}>R&amp;R</Link>

      <div style={{ display: 'flex', gap: '3rem' }}>
        {['Shop','Collections','About','Contact'].map(l => (
          <Link key={l} href={`/${l.toLowerCase()}`} style={{
            fontSize: '.52rem', letterSpacing: '.35em', textTransform: 'uppercase',
            color: '#777', textDecoration: 'none',
          }}>{l}</Link>
        ))}
      </div>

      <Link href="/shop" style={{
        fontSize: '.5rem', letterSpacing: '.32em', textTransform: 'uppercase',
        padding: '.72rem 2rem', border: '1px solid rgba(201,168,76,.35)',
        color: '#C9A84C', textDecoration: 'none',
      }}>Shop Now</Link>
    </nav>
  );
}