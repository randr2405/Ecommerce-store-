'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';

function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, vis];
}

function Reveal({ children, delay = 0, y = 60 }) {
  const [ref, vis] = useReveal();
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : `translateY(${y}px)`,
      transition: `opacity 1.1s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 1.1s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
    }}>{children}</div>
  );
}

function ThreeHero() {
  const mountRef = useRef(null);
  useEffect(() => {
    if (!window.THREE) return;
    const THREE = window.THREE;
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060606, 0.032);
    const camera = new THREE.PerspectiveCamera(65, mount.clientWidth / mount.clientHeight, 0.1, 200);
    camera.position.set(0, 0, 14);
    scene.add(new THREE.AmbientLight(0xc9a84c, 0.2));
    const goldLight = new THREE.PointLight(0xc9a84c, 4, 40);
    goldLight.position.set(5, 5, 8);
    scene.add(goldLight);
    const mouseLight = new THREE.PointLight(0xe8c96a, 3, 25);
    mouseLight.position.set(0, 0, 10);
    scene.add(mouseLight);
    const goldWire = new THREE.MeshBasicMaterial({ color: 0xc9a84c, wireframe: true, opacity: 0.22, transparent: true });
    const goldSolid = new THREE.MeshStandardMaterial({ color: 0xc9a84c, metalness: 1.0, roughness: 0.22, emissive: 0x3a2800, emissiveIntensity: 0.4 });
    const dimGold = new THREE.MeshStandardMaterial({ color: 0x8a6a20, metalness: 0.9, roughness: 0.5, emissive: 0x1a0a00, emissiveIntensity: 0.2 });
    const torus1 = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.06, 16, 120), goldWire);
    torus1.rotation.x = 0.4;
    scene.add(torus1);
    const torus2 = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.04, 12, 90), new THREE.MeshBasicMaterial({ color: 0xc9a84c, wireframe: true, opacity: 0.12, transparent: true }));
    torus2.rotation.x = -0.6; torus2.rotation.y = 0.5;
    scene.add(torus2);
    const torusKnot = new THREE.Mesh(new THREE.TorusKnotGeometry(2.2, 0.28, 200, 20, 2, 3), goldSolid);
    scene.add(torusKnot);
    const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(6.5, 1), new THREE.MeshBasicMaterial({ color: 0xc9a84c, wireframe: true, opacity: 0.055, transparent: true }));
    scene.add(ico);
    const smallSpheres = [];
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.2, 8, 8), dimGold.clone());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 3 + Math.random() * 5;
      s.position.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi) - 2);
      s.userData = { speed: 0.3 + Math.random() * 0.7, offset: Math.random() * Math.PI * 2 };
      scene.add(s); smallSpheres.push(s);
    }
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(600 * 3);
    for (let i = 0; i < 600 * 3; i++) pPos[i] = (Math.random() - 0.5) * 60;
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xc9a84c, size: 0.04, transparent: true, opacity: 0.45 }));
    scene.add(particles);
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => { mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2; mouse.ty = -(e.clientY / window.innerHeight - 0.5) * 2; };
    window.addEventListener('mousemove', onMove);
    let scrollProgress = 0;
    const onScroll = () => { scrollProgress = window.scrollY / (document.body.scrollHeight - window.innerHeight || 1); };
    window.addEventListener('scroll', onScroll, { passive: true });
    const onResize = () => { camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight); };
    window.addEventListener('resize', onResize);
    let raf;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      mouseLight.position.set(mouse.x * 10, mouse.y * 6, 10);
      camera.position.x += (mouse.x * 1.5 - camera.position.x) * 0.04;
      camera.position.y += (mouse.y * 1.0 - camera.position.y) * 0.04;
      camera.position.z = 14 - scrollProgress * 6;
      camera.lookAt(0, 0, 0);
      torusKnot.rotation.x = t * 0.18; torusKnot.rotation.y = t * 0.28;
      torus1.rotation.z = t * 0.07; torus1.rotation.y = t * 0.04;
      torus2.rotation.z = -t * 0.09; torus2.rotation.x = -0.6 + Math.sin(t * 0.3) * 0.15;
      ico.rotation.y = t * 0.03; ico.rotation.x = t * 0.02;
      smallSpheres.forEach(s => { s.position.y += Math.sin(t * s.userData.speed + s.userData.offset) * 0.003; s.rotation.y = t * s.userData.speed; });
      particles.rotation.y = t * 0.008; particles.rotation.x = t * 0.004;
      goldLight.intensity = 3 + Math.sin(t * 1.2) * 1.5;
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);
  return <div ref={mountRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />;
}

function TiltCard({ children, style = {} }) {
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 16}deg) rotateX(${-y * 12}deg) translateZ(16px) scale(1.02)`;
    el.style.boxShadow = `${-x * 28}px ${y * 28}px 50px rgba(201,168,76,0.15)`;
  }, []);
  const onLeave = useCallback(() => {
    const el = ref.current; if (!el) return;
    el.style.transform = 'perspective(900px) rotateY(0) rotateX(0) translateZ(0) scale(1)';
    el.style.boxShadow = 'none';
  }, []);
  return <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ transformStyle: 'preserve-3d', transition: 'transform 0.15s ease, box-shadow 0.15s ease', ...style }}>{children}</div>;
}

function CategoryCard({ cat, index }) {
  const [hov, setHov] = useState(false);
  return (
    <Link href={`/shop?category=${cat.label.toLowerCase()}`} style={{ textDecoration: 'none', display: 'block' }}>
      <TiltCard>
        <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ border: '1px solid', borderColor: hov ? 'rgba(201,168,76,0.8)' : 'rgba(201,168,76,0.1)', padding: '3.5rem 2.5rem', background: hov ? 'linear-gradient(135deg, rgba(201,168,76,0.07) 0%, rgba(0,0,0,0) 100%)' : 'linear-gradient(135deg, #0e0e0a 0%, #080808 100%)', position: 'relative', overflow: 'hidden', transition: 'border-color 0.4s, background 0.4s', minHeight: '300px' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: hov ? '60px' : '0px', height: '1px', background: '#c9a84c', transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: '1px', height: hov ? '60px' : '0px', background: '#c9a84c', transition: 'height 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', width: hov ? '100%' : '0%', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.75rem', color: hov ? '#C9A84C' : 'rgba(201,168,76,0.2)', letterSpacing: '0.25em', marginBottom: '1.5rem', transition: 'color 0.4s' }}>{String(index + 1).padStart(2, '0')}</p>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1.5rem', transform: hov ? 'scale(1.15) rotate(-8deg)' : 'scale(1)', transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)' }}>{cat.icon}</span>
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.9rem', fontWeight: 300, color: hov ? '#C9A84C' : '#F5F0E8', marginBottom: '0.6rem', transition: 'color 0.3s' }}>{cat.label}</h3>
          <p style={{ fontSize: '0.68rem', color: '#666', letterSpacing: '0.08em', lineHeight: 1.9 }}>{cat.desc}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.8rem', opacity: hov ? 1 : 0, transform: hov ? 'translateX(0)' : 'translateX(-10px)', transition: 'all 0.4s' }}>
            <div style={{ width: '20px', height: '1px', background: '#C9A84C' }} />
            <span style={{ fontSize: '0.58rem', color: '#C9A84C', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Explore</span>
          </div>
        </div>
      </TiltCard>
    </Link>
  );
}

function ValueCard({ v, index }) {
  const [hov, setHov] = useState(false);
  const romans = ['I', 'II', 'III', 'IV'];
  return (
    <TiltCard>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ background: hov ? 'rgba(201,168,76,0.04)' : '#060606', padding: '3.5rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden', transition: 'background 0.4s', height: '100%' }}>
        <div style={{ position: 'absolute', top: '-0.5rem', right: '1rem', fontFamily: 'Cormorant Garamond, serif', fontSize: '5.5rem', fontWeight: 300, color: hov ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.03)', transition: 'color 0.5s', userSelect: 'none' }}>{romans[index]}</div>
        <div style={{ width: hov ? '55px' : '24px', height: '1px', background: '#C9A84C', margin: '0 auto 1.8rem', transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
        <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 300, color: '#C9A84C', marginBottom: '1rem' }}>{v.title}</h3>
        <p style={{ fontSize: '0.68rem', color: '#777', lineHeight: 2, letterSpacing: '0.05em' }}>{v.desc}</p>
      </div>
    </TiltCard>
  );
}

export default function HomePage() {
  const [threeReady, setThreeReady] = useState(false);
  const [heroVis, setHeroVis] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [cursor, setCursor] = useState({ x: -100, y: -100 });
  const [cursorVis, setCursorVis] = useState(false);
  const [cursorBig, setCursorBig] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVis(true), 150);
    const onScroll = () => setScrollY(window.scrollY);
    const onMove = (e) => { setCursor({ x: e.clientX, y: e.clientY }); setCursorVis(true); };
    const onLeave = () => setCursorVis(false);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    const hIn = () => setCursorBig(true);
    const hOut = () => setCursorBig(false);
    document.querySelectorAll('a, button').forEach(el => { el.addEventListener('mouseenter', hIn); el.addEventListener('mouseleave', hOut); });
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseleave', onLeave); };
  }, []);

  const CATS = [
    { label: 'Menswear',   desc: 'Sport & lifestyle essentials for the modern man', icon: '👔' },
    { label: 'Womenswear', desc: 'Elegant everyday wear, effortlessly refined',     icon: '👗' },
    { label: 'Kiddies',    desc: 'Stylish pieces designed for little ones',          icon: '🧒' },
    { label: 'Baby Wear',  desc: 'Soft, premium comfort from day one',              icon: '👶' },
  ];
  const VALS = [
    { title: 'Quality',        desc: 'Only the finest materials, built to outlast every season.' },
    { title: 'Design',         desc: 'Style meets function — each piece is entirely intentional.' },
    { title: 'Customer First', desc: 'You are the heart of everything we create and build.' },
    { title: 'Innovation',     desc: 'Always improving, always evolving, never standing still.' },
  ];
  const MARQUEE = ['Premium Quality','✦','South African Brand','✦','Sport & Lifestyle','✦','All Ages','✦','Free Delivery','✦','118 Pieces','✦'];

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" strategy="beforeInteractive" onLoad={() => setThreeReady(true)} />
      <div style={{ background: '#060606', overflowX: 'hidden', paddingTop: '70px' }}>

        <div style={{ position: 'fixed', left: cursor.x, top: cursor.y, width: cursorBig ? '8px' : '10px', height: cursorBig ? '8px' : '10px', background: '#C9A84C', borderRadius: '50%', pointerEvents: 'none', zIndex: 9999, transform: 'translate(-50%,-50%)', opacity: cursorVis ? 1 : 0, transition: 'opacity 0.3s, width 0.2s, height 0.2s', mixBlendMode: 'difference' }} />
        <div style={{ position: 'fixed', left: cursor.x, top: cursor.y, width: cursorBig ? '55px' : '38px', height: cursorBig ? '55px' : '38px', border: '1px solid rgba(201,168,76,0.55)', borderRadius: '50%', pointerEvents: 'none', zIndex: 9998, transform: 'translate(-50%,-50%)', opacity: cursorVis ? 1 : 0, transition: 'left 0.1s, top 0.1s, opacity 0.3s, width 0.35s, height 0.35s' }} />

        {/* HERO */}
        <section style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 60%, #12100a 0%, #060606 70%)' }}>
          {threeReady && <ThreeHero />}
          <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(6,6,6,0.65) 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: '920px', padding: '2rem' }}>
            <p style={{ fontSize: '0.6rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '2.5rem', fontFamily: 'Montserrat, sans-serif', fontWeight: 300, opacity: heroVis ? 1 : 0, transform: heroVis ? 'none' : 'translateY(20px)', transition: 'opacity 1s ease 0.3s, transform 1s ease 0.3s' }}>✦ &nbsp; Premium Sport &amp; Lifestyle &nbsp; ✦</p>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(3.8rem, 12vw, 10rem)', lineHeight: 0.88 }}>
              {[{t:'R&R',gold:true},{t:'Sport &',gold:false},{t:'Lifestyle',gold:false}].map((w,i) => (
                <span key={i} style={{ display: 'block', overflow: 'hidden', lineHeight: 1.05 }}>
                  <span dangerouslySetInnerHTML={{ __html: w.t }} style={{ display: 'inline-block', color: w.gold ? '#C9A84C' : '#F5F0E8', textShadow: w.gold ? '0 0 60px rgba(201,168,76,0.4)' : '0 0 40px rgba(245,240,232,0.1)', opacity: heroVis ? 1 : 0, transform: heroVis ? 'none' : 'translateY(110%)', transition: `opacity 1.2s cubic-bezier(0.16,1,0.3,1) ${0.4+i*0.2}s, transform 1.2s cubic-bezier(0.16,1,0.3,1) ${0.4+i*0.2}s` }} />
                </span>
              ))}
            </h1>
            <div style={{ width: heroVis ? '120px' : '0px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '2.5rem auto', transition: 'width 1.4s cubic-bezier(0.16,1,0.3,1) 1s', boxShadow: '0 0 12px rgba(201,168,76,0.5)' }} />
            <p style={{ fontSize: '0.68rem', color: 'rgba(245,240,232,0.5)', letterSpacing: '0.35em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', fontWeight: 200, marginBottom: '3.5rem', opacity: heroVis ? 1 : 0, transition: 'opacity 1s ease 1.3s' }}>Own the Look, Own the Moment</p>
            <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'center', flexWrap: 'wrap', opacity: heroVis ? 1 : 0, transform: heroVis ? 'none' : 'translateY(20px)', transition: 'opacity 1s ease 1.6s, transform 1s ease 1.6s' }}>
              <Link href="/shop" className="rr-btn-primary">Shop the Collection</Link>
              <Link href="/about" className="rr-btn-outline">Our Story</Link>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', opacity: heroVis ? 1 : 0, transition: 'opacity 1s ease 2.2s', zIndex: 2 }}>
            <p style={{ fontSize: '0.5rem', color: '#444', letterSpacing: '0.4em', textTransform: 'uppercase' }}>Scroll</p>
            <div style={{ width: '1px', height: '55px', background: 'linear-gradient(180deg, #C9A84C, transparent)', animation: 'rrScroll 1.6s ease-in-out infinite' }} />
          </div>
        </section>

        {/* MARQUEE */}
        <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', borderBottom: '1px solid rgba(201,168,76,0.15)', padding: '1.1rem 0', overflow: 'hidden', background: '#070707' }}>
          <div style={{ display: 'flex', gap: '3rem', animation: 'rrMarquee 30s linear infinite', width: 'max-content' }}>
            {[...MARQUEE,...MARQUEE,...MARQUEE].map((t,i) => (
              <span key={i} style={{ fontSize: '0.58rem', color: t==='✦' ? '#C9A84C' : '#555', letterSpacing: '0.35em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: 'Montserrat, sans-serif' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* COLLECTIONS */}
        <section style={{ padding: '9rem 4rem 8rem', maxWidth: '1300px', margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <p style={{ fontSize: '0.6rem', color: '#C9A84C', letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>Browse</p>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.5rem,6vw,5.5rem)', fontWeight: 300, color: '#F5F0E8' }}>Our Collections</h2>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5px', background: 'rgba(201,168,76,0.07)' }}>
            {CATS.map((cat,i) => (<Reveal key={cat.label} delay={i*0.1}><CategoryCard cat={cat} index={i} /></Reveal>))}
          </div>
        </section>

        {/* BRAND STATEMENT */}
        <section style={{ background: '#090907', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '9rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%,-50%) translateY(${scrollY*0.05}px)`, fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(8rem,24vw,18rem)', color: 'rgba(201,168,76,0.025)', userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap', fontWeight: 300 }}>R&amp;R</div>
          <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <Reveal><p style={{ fontSize: '0.6rem', color: '#C9A84C', letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '2rem', fontFamily: 'Montserrat, sans-serif' }}>Our Mission</p></Reveal>
            <Reveal delay={0.2}>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1.9rem,4.5vw,3.6rem)', fontWeight: 300, fontStyle: 'italic', color: '#F5F0E8', lineHeight: 1.55 }}>
                &ldquo;Premium clothing that combines <span style={{ color: '#C9A84C', fontStyle: 'normal' }}>elegance with comfort</span>, designed for the modern individual who lives without compromise.&rdquo;
              </h2>
            </Reveal>
            <Reveal delay={0.4}>
              <div style={{ width: '60px', height: '1px', background: '#C9A84C', margin: '3rem auto 2.5rem', boxShadow: '0 0 12px rgba(201,168,76,0.4)' }} />
              <Link href="/about" className="rr-btn-outline">Read Our Story</Link>
            </Reveal>
          </div>
        </section>

        {/* VALUES */}
        <section style={{ padding: '9rem 4rem', maxWidth: '1200px', margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <p style={{ fontSize: '0.6rem', color: '#C9A84C', letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>What We Stand For</p>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.5rem,6vw,5.5rem)', fontWeight: 300, color: '#F5F0E8' }}>Our Values</h2>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1px', background: 'rgba(201,168,76,0.06)' }}>
            {VALS.map((v,i) => (<Reveal key={v.title} delay={i*0.12}><ValueCard v={v} index={i} /></Reveal>))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ padding: '10rem 2rem', textAlign: 'center', background: 'linear-gradient(180deg, #060606 0%, #0e0b06 50%, #060606 100%)', borderTop: '1px solid rgba(201,168,76,0.1)', position: 'relative', overflow: 'hidden' }}>
          {[10,25,50,75,90].map((l,i) => (<div key={i} style={{ position: 'absolute', left: `${l}%`, top: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg,transparent,rgba(201,168,76,0.06),transparent)', animation: `rrPulse ${2+i*0.6}s ease-in-out infinite alternate`, animationDelay: `${i*0.3}s` }} />))}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Reveal>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem, 8vw, 7rem)', fontWeight: 300, color: '#F5F0E8', lineHeight: 1, marginBottom: '1rem' }}>
                Ready to <span style={{ color: '#C9A84C', textShadow: '0 0 40px rgba(201,168,76,0.4)' }}>elevate</span> your wardrobe?
              </h2>
            </Reveal>
            <Reveal delay={0.25}>
              <p style={{ fontSize: '0.68rem', color: '#555', letterSpacing: '0.25em', marginBottom: '3.5rem', fontFamily: 'Montserrat, sans-serif' }}>118 premium pieces — available now</p>
              <Link href="/shop" className="rr-btn-primary">Shop Now</Link>
            </Reveal>
          </div>
        </section>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap');
          * { cursor: none !important; }
          @keyframes rrMarquee { from{transform:translateX(0)} to{transform:translateX(-33.33%)} }
          @keyframes rrPulse { from{opacity:0.15} to{opacity:1} }
          @keyframes rrScroll { 0%,100%{opacity:1;transform:scaleY(1)} 50%{opacity:0.2;transform:scaleY(0.4)} }
          .rr-btn-primary { display:inline-block; padding:1.1rem 3rem; background:#C9A84C; color:#060606; font-family:'Montserrat',sans-serif; font-size:0.58rem; font-weight:500; letter-spacing:0.38em; text-transform:uppercase; text-decoration:none; position:relative; overflow:hidden; transition:transform 0.35s cubic-bezier(0.16,1,0.3,1),box-shadow 0.35s; }
          .rr-btn-primary::before { content:''; position:absolute; inset:0; background:#e8c96a; transform:translateX(-101%); transition:transform 0.45s cubic-bezier(0.16,1,0.3,1); }
          .rr-btn-primary:hover::before { transform:translateX(0); }
          .rr-btn-primary:hover { transform:translateY(-4px); box-shadow:0 16px 40px rgba(201,168,76,0.3); }
          .rr-btn-outline { display:inline-block; padding:1.1rem 3rem; border:1px solid rgba(201,168,76,0.5); color:#C9A84C; font-family:'Montserrat',sans-serif; font-size:0.58rem; font-weight:300; letter-spacing:0.38em; text-transform:uppercase; text-decoration:none; position:relative; overflow:hidden; transition:border-color 0.4s,transform 0.35s cubic-bezier(0.16,1,0.3,1),box-shadow 0.35s; }
          .rr-btn-outline::before { content:''; position:absolute; inset:0; background:rgba(201,168,76,0.07); transform:scaleX(0); transform-origin:left; transition:transform 0.45s cubic-bezier(0.16,1,0.3,1); }
          .rr-btn-outline:hover::before { transform:scaleX(1); }
          .rr-btn-outline:hover { border-color:#C9A84C; transform:translateY(-4px); box-shadow:0 16px 40px rgba(201,168,76,0.15); }
        `}</style>
      </div>
    </>
  );
}