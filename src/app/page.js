'use client';

/**
 * R&R Sport & Lifestyle — Homepage
 * Drop this file into: src/app/page.js
 *
 * Dependencies to install (if not already):
 *   npm install three
 *
 * Firebase is already configured in your project.
 * This file reads from your Firestore "products" collection.
 * Adjust the collection name / field names to match yours.
 */

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // ← adjust path if needed

/* ─────────────────────────────────────────────────────
   HOOK: scroll reveal
───────────────────────────────────────────────────── */
function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Reveal({ children, delay = 0, className = '', style = {} }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(52px)',
        transition: `opacity .9s cubic-bezier(.16,1,.3,1) ${delay}s,
                     transform .9s cubic-bezier(.16,1,.3,1) ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   THREE.JS — 3D BACKGROUND
───────────────────────────────────────────────────── */
function ThreeBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    /* scene / camera */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
    camera.position.set(0, 0, 22);

    /* lights */
    scene.add(new THREE.AmbientLight(0xffffff, 0.12));
    const pA = new THREE.PointLight(0xC9A84C, 3.5, 60);
    pA.position.set(12, 8, 15);
    scene.add(pA);
    const pB = new THREE.PointLight(0x8B6A20, 2, 50);
    pB.position.set(-15, -10, 10);
    scene.add(pB);
    const rim = new THREE.DirectionalLight(0xC9A84C, 0.5);
    rim.position.set(0, 20, -10);
    scene.add(rim);

    /* shared materials */
    const matSolid = new THREE.MeshStandardMaterial({
      color: 0xA8842A, metalness: 1, roughness: 0.18,
      transparent: true, opacity: 0.75,
    });
    const matWire = new THREE.MeshStandardMaterial({
      color: 0xC9A84C, metalness: 0.9, roughness: 0.25,
      transparent: true, opacity: 0.52, side: THREE.DoubleSide,
    });
    const matGlass = new THREE.MeshStandardMaterial({
      color: 0xC9A84C, metalness: 0.6, roughness: 0.05,
      transparent: true, opacity: 0.2, side: THREE.DoubleSide,
    });
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xC9A84C, transparent: true, opacity: 0.3,
    });
    const withEdges = (mesh, geo) =>
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat.clone()));

    /* meshes */
    const objs = [];

    const addObj = (geo, mat, px, py, pz, rx, ry, rz, fs, fa, edges = false) => {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.set(px, py, pz);
      mesh.rotation.set(rx, ry, rz);
      if (edges) withEdges(mesh, geo);
      scene.add(mesh);
      objs.push({ mesh, rx: rx + .001, ry, rz, drx: .003, dry: .006, drz: .001, fs, fa });
      return mesh;
    };

    // central torus
    const tGeo = new THREE.TorusGeometry(4.5, 0.9, 24, 80);
    const tor  = new THREE.Mesh(tGeo, matSolid.clone());
    tor.position.set(0, 0, -5); tor.rotation.x = Math.PI / 5;
    scene.add(tor);
    objs.push({ mesh: tor, drx: .003, dry: .006, drz: .001, fs: .4, fa: .4 });

    const iGeo = new THREE.IcosahedronGeometry(2.2, 0);
    const ico  = new THREE.Mesh(iGeo, matWire.clone());
    ico.position.set(-10, 2, -3); withEdges(ico, iGeo); scene.add(ico);
    objs.push({ mesh: ico, drx: .008, dry: .005, drz: .003, fs: .6, fa: .6 });

    const oGeo = new THREE.OctahedronGeometry(2, 0);
    const oct  = new THREE.Mesh(oGeo, matGlass.clone());
    oct.position.set(11, -1, -2); withEdges(oct, oGeo); scene.add(oct);
    objs.push({ mesh: oct, drx: .006, dry: .009, drz: .004, fs: .5, fa: .5 });

    const t2Geo = new THREE.TorusGeometry(2, 0.35, 16, 60);
    const tor2  = new THREE.Mesh(t2Geo, matGlass.clone());
    tor2.position.set(7, 7, -8); tor2.rotation.x = Math.PI / 3; scene.add(tor2);
    objs.push({ mesh: tor2, drx: .01, dry: .004, drz: .007, fs: .35, fa: .45 });

    const teGeo = new THREE.TetrahedronGeometry(1.8, 0);
    const te    = new THREE.Mesh(teGeo, matWire.clone());
    te.position.set(-9, -5, -2); withEdges(te, teGeo); scene.add(te);
    objs.push({ mesh: te, drx: .007, dry: .012, drz: .005, fs: .7, fa: .7 });

    const kGeo = new THREE.TorusKnotGeometry(1.5, 0.35, 80, 12, 2, 3);
    const kn   = new THREE.Mesh(kGeo, matWire.clone());
    kn.position.set(-7, 6, -9); scene.add(kn);
    objs.push({ mesh: kn, drx: .009, dry: .006, drz: .004, fs: .55, fa: .65 });

    const rGeo = new THREE.TorusGeometry(3, 0.06, 8, 120);
    const rn   = new THREE.Mesh(rGeo, new THREE.MeshStandardMaterial({
      color: 0xC9A84C, metalness: 1, roughness: 0.1, transparent: true, opacity: 0.32,
    }));
    rn.position.set(2, -7, -6); rn.rotation.x = Math.PI / 4; scene.add(rn);
    objs.push({ mesh: rn, drx: .004, dry: .008, drz: .002, fs: .3, fa: .3 });

    /* particles */
    const N = 280, pPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pPos[i * 3]     = (Math.random() - .5) * 70;
      pPos[i * 3 + 1] = (Math.random() - .5) * 50;
      pPos[i * 3 + 2] = (Math.random() - .5) * 40 - 5;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: 0xC9A84C, size: 0.07, transparent: true, opacity: 0.45, sizeAttenuation: true,
    })));

    /* state */
    let mouseX = 0, mouseY = 0, tX = 0, tY = 0, scrollTop = 0, raf;

    const onMouse  = e => { mouseX = (e.clientX / innerWidth - .5) * 2; mouseY = (e.clientY / innerHeight - .5) * 2; };
    const onScroll = () => { scrollTop = window.scrollY; };
    const onResize = () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    };
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    /* animation loop */
    const clock = new THREE.Clock();
    function animate() {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      tX += (mouseX - tX) * .04;
      tY += (mouseY - tY) * .04;
      camera.position.x = tX * 2.5;
      camera.position.y = -tY * 1.5 - scrollTop * .003;
      camera.position.z = 22 - scrollTop * .004;
      camera.lookAt(0, -scrollTop * .003, 0);
      objs.forEach((o, i) => {
        o.mesh.rotation.x += o.drx;
        o.mesh.rotation.y += o.dry;
        o.mesh.rotation.z += o.drz;
        o.mesh.position.y += Math.sin(t * (o.fs || .5) + i) * (o.fa || .5) * .005;
      });
      pA.intensity = 3.5 + Math.sin(t * .8) * .5;
      pB.intensity = 2.0 + Math.cos(t * .6) * .4;
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={mountRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
  );
}

/* ─────────────────────────────────────────────────────
   CUSTOM CURSOR
───────────────────────────────────────────────────── */
function Cursor() {
  const dotRef  = useRef(null);
  const ringRef = useRef(null);
  const ringPos = useRef({ x: 0, y: 0 });
  const mouse   = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [big,     setBig]     = useState(false);

  useEffect(() => {
    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const onMove = e => {
      mouse.current = { x: e.clientX, y: e.clientY };
      dot.style.left = e.clientX + 'px';
      dot.style.top  = e.clientY + 'px';
      setVisible(true);
    };

    let raf;
    const lerp = () => {
      ringPos.current.x += (mouse.current.x - ringPos.current.x) * .12;
      ringPos.current.y += (mouse.current.y - ringPos.current.y) * .12;
      ring.style.left = ringPos.current.x + 'px';
      ring.style.top  = ringPos.current.y + 'px';
      raf = requestAnimationFrame(lerp);
    };
    lerp();

    const over = () => setBig(true);
    const out  = () => setBig(false);
    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', over);
      el.addEventListener('mouseleave', out);
    });

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', () => setVisible(false));
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  const base = {
    position: 'fixed', borderRadius: '50%',
    pointerEvents: 'none', zIndex: 9999,
    transform: 'translate(-50%, -50%)',
    opacity: visible ? 1 : 0,
    transition: 'opacity .3s',
  };

  return (
    <>
      <div ref={dotRef} style={{
        ...base,
        width:  big ? '6px'  : '9px',
        height: big ? '6px'  : '9px',
        background: '#C9A84C',
        mixBlendMode: 'difference',
        transition: 'opacity .3s, width .2s, height .2s',
      }} />
      <div ref={ringRef} style={{
        ...base,
        width:  big ? '54px' : '36px',
        height: big ? '54px' : '36px',
        border: '1px solid rgba(201,168,76,.5)',
        transition: 'opacity .3s, width .3s, height .3s',
      }} />
    </>
  );
}

/* ─────────────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────────────── */
function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '1.6rem 4rem',
      background:      scrolled ? 'rgba(5,5,3,.82)'       : 'transparent',
      backdropFilter:  scrolled ? 'blur(16px)'             : 'none',
      borderBottom:    scrolled ? '1px solid rgba(201,168,76,.1)' : '1px solid transparent',
      transition: 'all .4s ease',
    }}>
      <Link href="/" style={s.logo}>R&amp;R</Link>

      <div style={{ display: 'flex', gap: '2.8rem' }}>
        {['Shop', 'Collections', 'About', 'Contact'].map(l => (
          <Link key={l} href={`/${l.toLowerCase()}`} style={s.navLink}>{l}</Link>
        ))}
      </div>

      <Link href="/shop" style={s.navCta}>Shop Now</Link>
    </nav>
  );
}

/* ─────────────────────────────────────────────────────
   MARQUEE
───────────────────────────────────────────────────── */
function Marquee() {
  const items = ['Premium Quality', '✦', 'South African Brand', '✦',
    'Sport & Lifestyle', '✦', 'All Ages', '✦', 'Free Delivery', '✦', '118 Pieces Available', '✦'];
  const doubled = [...items, ...items];
  return (
    <div style={{ borderTop: '1px solid rgba(201,168,76,.12)', borderBottom: '1px solid rgba(201,168,76,.12)', padding: '1rem 0', overflow: 'hidden', background: '#080806' }}>
      <div style={{ display: 'flex', gap: '3rem', animation: 'rrMarquee 28s linear infinite', width: 'max-content' }}>
        {doubled.map((t, i) => (
          <span key={i} style={{
            fontSize: t === '✦' ? '.8rem' : '.48rem',
            color: t === '✦' ? '#C9A84C' : '#444',
            letterSpacing: '.35em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', fontFamily: "'Montserrat', sans-serif",
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   TILT CARD (3D hover)
───────────────────────────────────────────────────── */
function TiltCard({ children, style = {} }) {
  const ref = useRef(null);
  const onMove = useCallback(e => {
    const card = ref.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left) / width  - .5;
    const y = (e.clientY - top)  / height - .5;
    card.style.transform = `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 8}deg) translateZ(10px)`;
  }, []);
  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) translateZ(0)';
  }, []);
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ transformStyle: 'preserve-3d', transition: 'transform .18s ease', ...style }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   CATEGORY CARD
───────────────────────────────────────────────────── */
const categories = [
  { label: 'Menswear',   icon: '👔', desc: 'Sport & lifestyle essentials for the modern man',    slug: 'menswear'   },
  { label: 'Womenswear', icon: '👗', desc: 'Elegant everyday wear, effortlessly refined',         slug: 'womenswear' },
  { label: 'Kiddies',    icon: '🧒', desc: 'Stylish pieces designed for little ones',             slug: 'kiddies'    },
  { label: 'Baby Wear',  icon: '👶', desc: 'Soft, premium comfort from day one',                  slug: 'baby-wear'  },
];

function CategoryCard({ cat, index }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={`/shop?category=${cat.slug}`} style={{ textDecoration: 'none' }}>
      <TiltCard>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            border: `1px solid ${hovered ? 'rgba(201,168,76,.55)' : 'rgba(201,168,76,.06)'}`,
            padding: '3.8rem 2.8rem',
            background: hovered ? 'rgba(201,168,76,.022)' : '#050503',
            position: 'relative', overflow: 'hidden',
            transition: 'border-color .4s, background .4s',
            cursor: 'pointer',
          }}
        >
          {/* sweep */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, height: '2px',
            width: hovered ? '100%' : '0%',
            background: 'linear-gradient(90deg,transparent,#C9A84C,transparent)',
            transition: 'width .55s cubic-bezier(.16,1,.3,1)',
          }} />

          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '.68rem', color: hovered ? '#C9A84C' : 'rgba(201,168,76,.18)', letterSpacing: '.22em', display: 'block', marginBottom: '1.6rem', transition: 'color .4s' }}>
            {String(index + 1).padStart(2, '0')}
          </span>

          <span style={{ fontSize: '2.6rem', display: 'block', marginBottom: '1.6rem', transition: 'transform .45s cubic-bezier(.16,1,.3,1)', transform: hovered ? 'scale(1.14) rotate(-6deg)' : 'scale(1)' }}>
            {cat.icon}
          </span>

          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.9rem', fontWeight: 200, color: hovered ? '#C9A84C' : '#F5F0E8', marginBottom: '.5rem', transition: 'color .3s' }}>
            {cat.label}
          </h3>

          <p style={{ fontSize: '.58rem', color: '#4a4a4a', letterSpacing: '.07em', lineHeight: 1.95 }}>
            {cat.desc}
          </p>

          <span style={{ display: 'inline-block', color: '#C9A84C', fontSize: '1.2rem', marginTop: '1.6rem', opacity: hovered ? 1 : 0, transform: hovered ? 'translateX(8px)' : 'translateX(-6px)', transition: 'all .4s' }}>
            →
          </span>
        </div>
      </TiltCard>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────
   FEATURED PRODUCTS — pulled from Firebase
───────────────────────────────────────────────────── */
function FeaturedProducts() {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        /**
         * Adjust collection name and orderBy field to match yours.
         * Common patterns: 'products', 'items', 'inventory'
         * Common sort fields: 'createdAt', 'name', 'price'
         */
        const q = query(
          collection(db, 'products'),
          orderBy('createdAt', 'desc'),
          limit(4)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(data);
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  return (
    <section style={{ padding: '10rem 4rem 8rem', maxWidth: '1340px', margin: '0 auto' }}>
      <Reveal>
        <div style={{ textAlign: 'center', marginBottom: '5.5rem' }}>
          <span style={s.sectionLabel}>Featured</span>
          <h2 style={s.sectionTitle}>New Arrivals</h2>
        </div>
      </Reveal>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={s.spinner} />
        </div>
      ) : products.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#444', letterSpacing: '.2em', fontSize: '.55rem' }}>
          No products found. Check your Firestore collection name.
        </p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5px',
          background: 'rgba(201,168,76,.05)',
        }}>
          {products.map((product, i) => (
            <Reveal key={product.id} delay={i * 0.1}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      )}

      <Reveal delay={0.3}>
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <Link href="/shop" className="rr-btn-outline">View All Products</Link>
        </div>
      </Reveal>
    </section>
  );
}

function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);

  /* Adjust these field names to match your Firestore schema */
  const name     = product.name     || product.title       || 'Untitled Product';
  const price    = product.price    || product.amount      || 0;
  const imageUrl = product.imageUrl || product.image       || product.imageURL || null;
  const category = product.category || product.type        || '';
  const slug     = product.id;

  const formatted = new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: 'ZAR', minimumFractionDigits: 0,
  }).format(price);

  return (
    <Link href={`/shop/${slug}`} style={{ textDecoration: 'none' }}>
      <TiltCard>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: hovered ? 'rgba(201,168,76,.018)' : '#050503',
            border: `1px solid ${hovered ? 'rgba(201,168,76,.45)' : 'rgba(201,168,76,.07)'}`,
            overflow: 'hidden', position: 'relative',
            transition: 'background .4s, border-color .4s',
            cursor: 'pointer',
          }}
        >
          {/* image */}
          <div style={{
            aspectRatio: '4/5', overflow: 'hidden',
            background: 'rgba(201,168,76,.04)',
            position: 'relative',
          }}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  transform: hovered ? 'scale(1.06)' : 'scale(1)',
                  transition: 'transform .7s cubic-bezier(.16,1,.3,1)',
                  filter: 'brightness(.92)',
                }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(201,168,76,.15)',
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '4rem', fontWeight: 200,
              }}>
                R&amp;R
              </div>
            )}

            {/* hover overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(5,5,3,.5)',
              opacity: hovered ? 1 : 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity .4s',
            }}>
              <span style={{ ...s.pillBtn }}>View Product</span>
            </div>
          </div>

          {/* info */}
          <div style={{ padding: '1.6rem 1.8rem 2rem' }}>
            {category && (
              <span style={{ fontSize: '.44rem', color: '#C9A84C', letterSpacing: '.35em', textTransform: 'uppercase', display: 'block', marginBottom: '.6rem' }}>
                {category}
              </span>
            )}
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.35rem', fontWeight: 200, color: '#F5F0E8', marginBottom: '.6rem', lineHeight: 1.25 }}>
              {name}
            </h3>
            <p style={{ fontSize: '.7rem', color: '#C9A84C', letterSpacing: '.1em', fontWeight: 300 }}>
              {formatted}
            </p>
          </div>

          {/* bottom sweep */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, height: '1px',
            width: hovered ? '100%' : '0%',
            background: 'linear-gradient(90deg,transparent,#C9A84C,transparent)',
            transition: 'width .5s cubic-bezier(.16,1,.3,1)',
          }} />
        </div>
      </TiltCard>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────
   VALUES
───────────────────────────────────────────────────── */
const values = [
  { title: 'Quality',        roman: 'I',   desc: 'Only the finest materials, constructed to outlast trends and time.' },
  { title: 'Design',         roman: 'II',  desc: 'Style meets function — every piece is entirely intentional.' },
  { title: 'Customer Focus', roman: 'III', desc: 'You are at the heart of everything we create and do.' },
  { title: 'Innovation',     roman: 'IV',  desc: 'Always improving, always evolving, never standing still.' },
];

function ValueCard({ value }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(201,168,76,.018)' : '#050503',
        padding: '3.2rem 2.2rem', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
        transition: 'background .4s',
      }}
    >
      <div style={{
        position: 'absolute', top: '-.6rem', right: '1.2rem',
        fontFamily: "'Cormorant Garamond', serif", fontSize: '5.5rem', fontWeight: 200,
        color: hovered ? 'rgba(201,168,76,.08)' : 'rgba(201,168,76,.025)',
        userSelect: 'none', pointerEvents: 'none', transition: 'color .4s',
      }}>{value.roman}</div>

      <div style={{
        width: hovered ? '52px' : '22px', height: '1px',
        background: '#C9A84C', margin: '0 auto 1.6rem',
        transition: 'width .45s cubic-bezier(.16,1,.3,1)',
      }} />

      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 200, color: '#C9A84C', marginBottom: '.8rem' }}>
        {value.title}
      </h3>
      <p style={{ fontSize: '.6rem', color: '#5a5a5a', lineHeight: 1.95, letterSpacing: '.05em' }}>
        {value.desc}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   VERTICAL AMBIENT LINES (decorative)
───────────────────────────────────────────────────── */
function VLines({ positions = [12, 28, 50, 72, 88] }) {
  return (
    <>
      {positions.map((left, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${left}%`, top: 0, bottom: 0, width: '1px',
          background: 'linear-gradient(180deg,transparent,rgba(201,168,76,.055),transparent)',
          animation: `rrPulse ${2.2 + i * .5}s ease-in-out ${i * .4}s infinite alternate`,
          pointerEvents: 'none', zIndex: 1,
        }} />
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────────
   SHARED STYLES OBJECT
───────────────────────────────────────────────────── */
const s = {
  logo: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '1.75rem', fontWeight: 200, letterSpacing: '.14em',
    color: '#C9A84C', textDecoration: 'none',
  },
  navLink: {
    fontSize: '.5rem', letterSpacing: '.35em', textTransform: 'uppercase',
    color: '#777', textDecoration: 'none', transition: 'color .3s',
  },
  navCta: {
    fontSize: '.48rem', letterSpacing: '.3em', textTransform: 'uppercase',
    padding: '.65rem 1.8rem',
    border: '1px solid rgba(201,168,76,.35)',
    color: '#C9A84C', textDecoration: 'none',
    transition: 'border-color .3s, background .3s',
  },
  sectionLabel: {
    display: 'block',
    fontSize: '.5rem', color: '#C9A84C', letterSpacing: '.5em',
    textTransform: 'uppercase', marginBottom: '.9rem',
    fontFamily: "'Montserrat', sans-serif",
  },
  sectionTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 'clamp(2.8rem,6vw,5.5rem)', fontWeight: 200, color: '#F5F0E8',
  },
  pillBtn: {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '.48rem', fontWeight: 400, letterSpacing: '.3em',
    textTransform: 'uppercase', color: '#C9A84C',
    border: '1px solid rgba(201,168,76,.5)',
    padding: '.7rem 1.8rem',
  },
  spinner: {
    width: '28px', height: '28px', margin: '0 auto',
    border: '1px solid rgba(201,168,76,.15)',
    borderTop: '1px solid #C9A84C',
    borderRadius: '50%',
    animation: 'rrSpin .9s linear infinite',
  },
};

/* ─────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────── */
export default function HomePage() {
  const [heroIn,  setHeroIn]  = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setHeroIn(true), 80);
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', fn, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener('scroll', fn); };
  }, []);

  const wordStyle = delay => ({
    display: 'inline-block',
    opacity: heroIn ? 1 : 0,
    transform: heroIn ? 'none' : 'translateY(110%)',
    transition: `opacity 1.1s cubic-bezier(.16,1,.3,1) ${delay}s,
                 transform 1.1s cubic-bezier(.16,1,.3,1) ${delay}s`,
  });

  return (
    <div style={{ paddingTop: '70px', background: '#050503', overflowX: 'hidden' }}>

      {/* Global styles */}
      <GlobalStyles />

      {/* 3D canvas background */}
      <ThreeBackground />

      {/* Custom cursor */}
      <Cursor />

      {/* Nav */}
      <NavBar />

      {/* ══ HERO ══ */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 2rem', position: 'relative', overflow: 'hidden' }}>
        <VLines />

        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%,-50%) translateY(${scrollY * .15}px)`,
          width: '700px', height: '700px', borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(201,168,76,.06) 0%,transparent 65%)',
          pointerEvents: 'none', zIndex: 1,
        }} />

        <div style={{ maxWidth: '960px', position: 'relative', zIndex: 2 }}>
          {/* Eyebrow */}
          <p style={{
            fontSize: '.5rem', color: '#C9A84C', letterSpacing: '.55em',
            textTransform: 'uppercase', marginBottom: '2.5rem',
            fontFamily: "'Montserrat', sans-serif", fontWeight: 200,
            opacity: heroIn ? 1 : 0, transform: heroIn ? 'none' : 'translateY(20px)',
            transition: 'opacity 1s ease .3s, transform 1s ease .3s',
          }}>✦ &nbsp; Premium Sport &amp; Lifestyle &nbsp; ✦</p>

          {/* Heading */}
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 200, fontSize: 'clamp(4rem,11vw,9.5rem)', lineHeight: '.9', margin: 0 }}>
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

          {/* Gold divider */}
          <div style={{
            width: heroIn ? '110px' : '0px', height: '1px',
            background: 'linear-gradient(90deg,transparent,#C9A84C,transparent)',
            margin: '2.6rem auto',
            transition: 'width 1.3s cubic-bezier(.16,1,.3,1) .9s',
          }} />

          {/* Tagline */}
          <p style={{
            fontSize: '.58rem', color: '#5a5a5a', letterSpacing: '.35em',
            textTransform: 'uppercase', marginBottom: '3.5rem', fontWeight: 200,
            fontFamily: "'Montserrat', sans-serif",
            opacity: heroIn ? 1 : 0, transition: 'opacity 1s ease 1.3s',
          }}>Own the Look, Own the Moment</p>

          {/* CTAs */}
          <div style={{
            display: 'flex', gap: '1.2rem', justifyContent: 'center', flexWrap: 'wrap',
            opacity: heroIn ? 1 : 0, transform: heroIn ? 'none' : 'translateY(18px)',
            transition: 'opacity 1s ease 1.6s, transform 1s ease 1.6s',
          }}>
            <Link href="/shop" className="rr-btn-primary"><span>Shop the Collection</span></Link>
            <Link href="/about" className="rr-btn-outline">Our Story</Link>
          </div>

          {/* Scroll indicator */}
          <div style={{
            position: 'absolute', bottom: '-160px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.6rem',
            opacity: heroIn ? 1 : 0, transition: 'opacity 1s ease 2.4s',
          }}>
            <p style={{ fontSize: '.42rem', color: '#333', letterSpacing: '.45em', textTransform: 'uppercase' }}>Scroll</p>
            <div style={{ width: '1px', height: '60px', background: 'linear-gradient(180deg,#C9A84C,transparent)', animation: 'rrScrollPulse 1.7s ease-in-out infinite' }} />
          </div>
        </div>
      </section>

      {/* ══ MARQUEE ══ */}
      <Marquee />

      {/* ══ COLLECTIONS ══ */}
      <section style={{ padding: '10rem 4rem 8rem', maxWidth: '1340px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '5.5rem' }}>
            <span style={s.sectionLabel}>Browse</span>
            <h2 style={s.sectionTitle}>Our Collections</h2>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(265px,1fr))', gap: '1.5px', background: 'rgba(201,168,76,.05)' }}>
          {categories.map((cat, i) => (
            <Reveal key={cat.label} delay={i * .1}>
              <CategoryCard cat={cat} index={i} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ FEATURED PRODUCTS ══ */}
      <FeaturedProducts />

      {/* ══ BRAND STATEMENT ══ */}
      <section style={{ background: '#080806', borderTop: '1px solid rgba(201,168,76,.1)', borderBottom: '1px solid rgba(201,168,76,.1)', padding: '11rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Watermark */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%,-50%) translateY(${scrollY * .04}px)`,
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(8rem,23vw,18rem)', color: 'rgba(201,168,76,.018)',
          userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap', fontWeight: 200,
        }}>R&amp;R</div>

        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal><span style={s.sectionLabel}>Our Mission</span></Reveal>
          <Reveal delay={.2}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.9rem,4.5vw,3.6rem)', fontWeight: 200, fontStyle: 'italic', color: '#F5F0E8', lineHeight: 1.6 }}>
              "Premium clothing that combines{' '}
              <em style={{ color: '#C9A84C', fontStyle: 'normal' }}>elegance with comfort</em>,
              designed for the modern individual who lives without compromise."
            </h2>
          </Reveal>
          <Reveal delay={.4}>
            <div style={{ width: '60px', height: '1px', background: '#C9A84C', margin: '3rem auto 2.8rem' }} />
            <Link href="/about" className="rr-btn-outline">Read Our Story</Link>
          </Reveal>
        </div>
      </section>

      {/* ══ VALUES ══ */}
      <section style={{ padding: '9rem 4rem', maxWidth: '1240px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '5.5rem' }}>
            <span style={s.sectionLabel}>What We Stand For</span>
            <h2 style={s.sectionTitle}>Our Values</h2>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(225px,1fr))', gap: '1px', background: 'rgba(201,168,76,.05)' }}>
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * .15}>
              <ValueCard value={v} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ FINAL CTA ══ */}
      <section style={{ padding: '12rem 2rem', textAlign: 'center', background: 'linear-gradient(135deg,#050503,#0c0c07,#050503)', borderTop: '1px solid rgba(201,168,76,.1)', position: 'relative', overflow: 'hidden' }}>
        <VLines positions={[8, 22, 50, 78, 92]} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(3rem,8vw,7rem)', fontWeight: 200, lineHeight: .95, marginBottom: '1.2rem' }}>
              Ready to{' '}<span style={{ color: '#C9A84C' }}>elevate</span>{' '}your wardrobe?
            </h2>
          </Reveal>
          <Reveal delay={.2}>
            <p style={{ fontSize: '.56rem', color: '#444', letterSpacing: '.22em', marginBottom: '3.2rem' }}>
              118 premium pieces — available now
            </p>
            <Link href="/shop" className="rr-btn-primary"><span>Shop Now</span></Link>
          </Reveal>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ borderTop: '1px solid rgba(201,168,76,.1)', padding: '3rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#030302' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 200, color: '#C9A84C', letterSpacing: '.14em' }}>
          R&amp;R Sport &amp; Lifestyle
        </div>
        <div style={{ display: 'flex', gap: '2.5rem' }}>
          {['Shop', 'About', 'Collections', 'Contact'].map(l => (
            <Link key={l} href={`/${l.toLowerCase()}`} style={{ fontSize: '.46rem', letterSpacing: '.3em', textTransform: 'uppercase', color: '#333', textDecoration: 'none' }}>{l}</Link>
          ))}
        </div>
        <p style={{ fontSize: '.46rem', color: '#2a2a2a', letterSpacing: '.18em' }}>© 2025 R&amp;R · South Africa</p>
      </footer>

    </div>
  );
}

/* ─────────────────────────────────────────────────────
   GLOBAL STYLES (injected once)
───────────────────────────────────────────────────── */
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,200;0,300;0,400;1,200;1,300&family=Montserrat:wght@100;200;300;400;500&display=swap');

      *, *::before, *::after { box-sizing: border-box; }
      * { cursor: none !important; }

      @keyframes rrMarquee   { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      @keyframes rrPulse     { from { opacity: .2; } to { opacity: 1; } }
      @keyframes rrScrollPulse { 0%,100% { opacity:1; transform:scaleY(1); } 50% { opacity:.15; transform:scaleY(.35); } }
      @keyframes rrSpin      { to { transform: rotate(360deg); } }

      .rr-btn-primary {
        display: inline-block;
        padding: 1.05rem 3rem;
        background: #C9A84C;
        color: #050503;
        font-family: 'Montserrat', sans-serif;
        font-size: .53rem;
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
      .rr-btn-primary span  { position: relative; z-index: 1; }

      .rr-btn-outline {
        display: inline-block;
        padding: 1.05rem 3rem;
        border: 1px solid rgba(201,168,76,.4);
        color: #C9A84C;
        font-family: 'Montserrat', sans-serif;
        font-size: .53rem;
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
        transform: scaleX(0);
        transform-origin: left;
        transition: transform .45s cubic-bezier(.16,1,.3,1);
      }
      .rr-btn-outline:hover::before { transform: scaleX(1); }
      .rr-btn-outline:hover { border-color: #C9A84C; transform: translateY(-3px); }
    `}</style>
  );
}