'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import LineWaves from './LineWaves';
import Ribbons from './Ribbons';
import Antigravity from './Antigravity';
import Ballpit from './Ballpit';
import BounceCards from './BounceCards';
import ClickSpark from './ClickSpark';
import GooeyNav from './GooeyNav';

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

function DepthText({ children, gold = false, style = {} }) {
  const layers = gold ? 10 : 6;
  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      {Array.from({ length: layers }).map((_, i) => (
        <span key={i} aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          transform: `translateX(${(i+1)*1.2}px) translateY(${(i+1)*0.8}px)`,
          color: gold
            ? `rgba(100,65,0,${0.35 - i*0.032})`
            : `rgba(0,0,0,${0.6 - i*0.08})`,
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          display: 'block',
        }}>{children}</span>
      ))}
      <span style={{ position: 'relative', display: 'block' }}>{children}</span>
    </div>
  );
}

function CategoryCard3D({ cat, index, sectionProgress }) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const delay = index * 0.13;
  const cardProgress = Math.max(0, Math.min(1, (sectionProgress - 0.1 - delay) / 0.45));

  const enterZ    = (1 - cardProgress) * -600;
  const enterRotY = (1 - cardProgress) * (index % 2 === 0 ? -55 : 55);
  const enterOp   = Math.min(1, cardProgress * 1.2);

  const handleMouseMove = useCallback((e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: (e.clientX - rect.left) / rect.width  - 0.5,
      y: (e.clientY - rect.top)  / rect.height - 0.5,
    });
  }, []);

  const tiltX = hovered ? mousePos.y * -22 : 0;
  const tiltY = hovered ? mousePos.x *  28 : 0;

  return (
    <Link href={`/shop?category=${cat.label.toLowerCase()}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        ref={cardRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setMousePos({ x: 0, y: 0 }); }}
        onMouseMove={handleMouseMove}
        style={{ perspective: '900px' }}
      >
        <div style={{
          border: '1px solid',
          borderColor: hovered ? 'rgba(82,39,255,0.7)' : 'rgba(82,39,255,0.12)',
          padding: '4rem 2.8rem',
          background: hovered
            ? 'linear-gradient(145deg, rgba(82,39,255,0.08) 0%, rgba(82,39,255,0.02) 100%)'
            : 'rgba(6,5,10,0.94)',
          backdropFilter: 'blur(18px)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transformStyle: 'preserve-3d',
          transform: `
            translateZ(${enterZ}px)
            rotateY(${enterRotY + tiltY}deg)
            rotateX(${tiltX}deg)
            ${hovered ? 'translateZ(20px)' : ''}
          `,
          opacity: enterOp,
          transition: hovered
            ? 'border-color 0.25s, background 0.25s, box-shadow 0.25s, transform 0.07s ease'
            : 'border-color 0.5s, background 0.5s, box-shadow 0.5s',
          boxShadow: hovered
            ? `0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(82,39,255,0.15), inset 0 1px 0 rgba(82,39,255,0.15)`
            : '0 10px 40px rgba(0,0,0,0.5)',
          willChange: 'transform',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(82,39,255,0.006) 2px, rgba(82,39,255,0.006) 3px)',
            pointerEvents: 'none',
          }} />

          {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h], ci) => (
            <div key={ci} style={{
              position: 'absolute', [v]: 0, [h]: 0,
              width: hovered ? '36px' : '14px',
              height: hovered ? '36px' : '14px',
              borderTop: v === 'top' ? '1px solid rgba(201,168,76,0.8)' : 'none',
              borderBottom: v === 'bottom' ? '1px solid rgba(201,168,76,0.8)' : 'none',
              borderLeft: h === 'left' ? '1px solid rgba(201,168,76,0.8)' : 'none',
              borderRight: h === 'right' ? '1px solid rgba(201,168,76,0.8)' : 'none',
              transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
            }} />
          ))}

          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            height: '1px', width: hovered ? '100%' : '0%',
            background: 'linear-gradient(90deg, transparent, #C9A84C 30%, #C9A84C 70%, transparent)',
            transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)',
          }} />

          <p style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '0.65rem',
            color: hovered ? '#C9A84C' : 'rgba(82,39,255,0.3)',
            letterSpacing: '0.3em',
            marginBottom: '2rem',
            transition: 'color 0.4s',
          }}>{String(index + 1).padStart(2, '0')}</p>

          <span style={{
            fontSize: '3.5rem', display: 'block', marginBottom: '2rem',
            transform: hovered ? 'scale(1.2) rotate(-10deg) translateZ(30px)' : 'scale(1) rotate(0) translateZ(0)',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.55s cubic-bezier(0.16,1,0.3,1)',
            filter: hovered ? 'drop-shadow(0 0 20px rgba(82,39,255,0.5))' : 'none',
          }}>{cat.icon}</span>

          <h3 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '2.1rem', fontWeight: 300,
            color: hovered ? '#FFFFFF' : '#E8E0D0',
            marginBottom: '0.8rem',
            textShadow: hovered ? '0 0 40px rgba(255,255,255,0.2)' : 'none',
            transition: 'color 0.3s, text-shadow 0.3s',
          }}>{cat.label}</h3>

          <p style={{ fontSize: '0.63rem', color: '#444', letterSpacing: '0.12em', lineHeight: 2 }}>
            {cat.desc}
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            marginTop: '2.2rem',
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateX(0)' : 'translateX(-16px)',
            transition: 'all 0.45s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{ width: '24px', height: '1px', background: '#C9A84C' }} />
            <span style={{
              fontSize: '0.52rem', color: '#C9A84C',
              letterSpacing: '0.35em', textTransform: 'uppercase',
              fontFamily: 'Montserrat, sans-serif',
            }}>Explore</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ValueCard3D({ value, index, sectionProgress }) {
  const [hovered, setHovered] = useState(false);
  const romans = ['I', 'II', 'III', 'IV'];

  const delay  = index * 0.15;
  const cardP  = Math.max(0, Math.min(1, (sectionProgress - 0.08 - delay) / 0.5));
  const entryY = (1 - cardP) * 120;
  const entryR = (1 - cardP) * (index % 2 === 0 ? -12 : 12);
  const depths = [0, -25, -12, -38];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(82,39,255,0.04)' : 'rgba(5,4,10,0.94)',
        padding: '4rem 2.2rem',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        border: '1px solid',
        borderColor: hovered ? 'rgba(82,39,255,0.25)' : 'rgba(82,39,255,0.07)',
        transform: `translateY(${entryY}px) rotateX(${entryR}deg) translateZ(${depths[index]}px)`,
        opacity: cardP,
        transition: hovered
          ? 'background 0.4s, border-color 0.4s, box-shadow 0.3s'
          : 'background 0.4s, border-color 0.4s',
        boxShadow: hovered ? `0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(82,39,255,0.1)` : 'none',
        willChange: 'transform, opacity',
      }}
    >
      <div style={{
        position: 'absolute', top: '-1rem', right: '1.2rem',
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: '6rem', fontWeight: 300,
        color: hovered ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.03)',
        transition: 'color 0.4s',
        userSelect: 'none', pointerEvents: 'none',
      }}>{romans[index]}</div>

      <div style={{
        width: hovered ? '60px' : '20px',
        height: '1px',
        background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
        margin: '0 auto 2rem',
        transition: 'width 0.55s cubic-bezier(0.16,1,0.3,1)',
      }} />

      <h3 style={{
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: '1.6rem', fontWeight: 300,
        color: hovered ? '#FFFFFF' : '#C9A84C',
        marginBottom: '1.2rem',
        textShadow: hovered ? '0 0 30px rgba(255,255,255,0.2)' : 'none',
        transition: 'color 0.3s, text-shadow 0.3s',
      }}>{value.title}</h3>

      <p style={{ fontSize: '0.64rem', color: '#555', lineHeight: 2.1, letterSpacing: '0.07em' }}>
        {value.desc}
      </p>
    </div>
  );
}

function Marquee() {
  const items = ['Premium Quality', '✦', 'South African Brand', '✦', 'Sport & Lifestyle', '✦', 'All Ages', '✦', 'Free Delivery', '✦', '118 Pieces', '✦'];
  return (
    <div style={{
      borderTop: '1px solid rgba(82,39,255,0.15)',
      borderBottom: '1px solid rgba(82,39,255,0.15)',
      padding: '1.3rem 0',
      overflow: 'hidden',
      background: 'rgba(4,3,10,0.98)',
      backdropFilter: 'blur(10px)',
      position: 'relative', zIndex: 2,
    }}>
      <div style={{ display: 'flex', gap: '3rem', animation: 'rrMarquee 28s linear infinite', width: 'max-content' }}>
        {[...items, ...items].map((t, i) => (
          <span key={i} style={{
            fontSize: '0.53rem',
            color: t === '✦' ? '#C9A84C' : 'rgba(82,39,255,0.4)',
            letterSpacing: '0.42em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', fontFamily: 'Montserrat, sans-serif',
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [heroVisible, setHeroVisible] = useState(false);
  const [cursor, setCursor]           = useState({ x: 0, y: 0 });
  const [cursorTrail, setCursorTrail] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorHover, setCursorHover]     = useState(false);

  const scrollRef = useRef(0);
  const mouseRef  = useRef({ x: 0, y: 0 });
  const trailRef  = useRef({ x: 0, y: 0 });

  const [heroRef,        heroScroll]        = useElementScroll();
  const [collectionsRef, collectionsScroll] = useElementScroll();
  const [antigravRef,    antigravScroll]    = useElementScroll();
  const [ballpitRef,     ballpitScroll]     = useElementScroll();
  const [brandRef,       brandScroll]       = useElementScroll();
  const [valuesRef,      valuesScroll]      = useElementScroll();
  const [ribbonRef,      ribbonScroll]      = useElementScroll();

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

  const categories = [
    { label: 'Menswear',   desc: 'Sport & lifestyle essentials for the modern man',  icon: '👔' },
    { label: 'Womenswear', desc: 'Elegant everyday wear, effortlessly refined',       icon: '👗' },
    { label: 'Kiddies',    desc: 'Stylish pieces crafted for little ones',            icon: '🧒' },
    { label: 'Baby Wear',  desc: 'Soft, premium comfort from day one',               icon: '👶' },
  ];

  const values = [
    { title: 'Quality',        desc: 'Only the finest materials, constructed to outlast trends and time.' },
    { title: 'Design',         desc: 'Style meets function — every piece is entirely intentional.' },
    { title: 'Customer Focus', desc: 'You are at the heart of everything we create and do.' },
    { title: 'Innovation',     desc: 'Always improving, always evolving, never standing still.' },
  ];

  const navItems = [
    { label: 'Home',       href: '/'         },
    { label: 'Shop',       href: '/shop'      },
    { label: 'Menswear',   href: '/shop?category=menswear'   },
    { label: 'Womenswear', href: '/shop?category=womenswear' },
    { label: 'About',      href: '/about'     },
  ];

  const bounceImages = [
    'https://picsum.photos/400/400?grayscale&random=10',
    'https://picsum.photos/500/500?grayscale&random=11',
    'https://picsum.photos/600/600?grayscale&random=12',
    'https://picsum.photos/700/700?grayscale&random=13',
    'https://picsum.photos/300/300?grayscale&random=14',
  ];

  const bounceTransforms = [
    'rotate(5deg) translate(-150px)',
    'rotate(0deg) translate(-70px)',
    'rotate(-5deg)',
    'rotate(5deg) translate(70px)',
    'rotate(-5deg) translate(150px)',
  ];

  const heroDepth   = heroScroll * 80;
  const heroTiltX   = heroScroll * 28;
  const heroOpacity = Math.max(0, 1 - heroScroll * 1.5);

  const brandTilt  = (brandScroll - 0.5) * 16;
  const brandScale = 0.85 + brandScroll * 0.28;

  return (
    <ClickSpark sparkColor="#ffffff" sparkSize={10} sparkRadius={15} sparkCount={8} duration={400}>
      <div style={{ paddingTop: '70px', background: '#04030a', overflowX: 'hidden' }}>

        {/* Hero background: white LineWaves */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.14 }}>
          <LineWaves
            speed={0.3}
            innerLineCount={32}
            outerLineCount={36}
            warpIntensity={1}
            rotation={-45}
            edgeFadeWidth={0}
            colorCycleSpeed={1}
            brightness={0.2}
            color1="#ffffff"
            color2="#ffffff"
            color3="#ffffff"
            enableMouseInteraction
            mouseInfluence={2}
          />
        </div>

        {/* Custom cursor */}
        <div style={{
          position: 'fixed', left: cursor.x, top: cursor.y,
          width: cursorHover ? '5px' : '8px', height: cursorHover ? '5px' : '8px',
          background: '#ffffff', borderRadius: '50%',
          pointerEvents: 'none', zIndex: 9999,
          transform: 'translate(-50%,-50%)',
          opacity: cursorVisible ? 1 : 0,
          transition: 'opacity 0.3s, width 0.2s, height 0.2s',
          mixBlendMode: 'difference',
        }} />
        <div style={{
          position: 'fixed', left: cursorTrail.x, top: cursorTrail.y,
          width: cursorHover ? '55px' : '38px', height: cursorHover ? '55px' : '38px',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: '50%',
          pointerEvents: 'none', zIndex: 9998,
          transform: 'translate(-50%,-50%)',
          opacity: cursorVisible ? 0.7 : 0,
          transition: 'opacity 0.3s, width 0.4s cubic-bezier(0.16,1,0.3,1), height 0.4s cubic-bezier(0.16,1,0.3,1)',
        }} />

        {/* ─── HERO ─── */}
        <section
          ref={heroRef}
          style={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center',
            padding: '4rem 2rem',
            position: 'relative',
            perspective: '1400px',
            perspectiveOrigin: '50% 50%',
          }}
        >
          {/* perspective grid floor */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              linear-gradient(rgba(82,39,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(82,39,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '90px 90px',
            transform: `perspective(800px) rotateX(${55 + heroScroll * 15}deg) translateZ(-80px) scale(2.2)`,
            transformOrigin: '50% 100%',
            opacity: 0.5,
            zIndex: 1,
            pointerEvents: 'none',
          }} />

          {/* radial bloom */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: '900px', height: '900px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(82,39,255,0.08) 0%, rgba(82,39,255,0.02) 35%, transparent 65%)',
            pointerEvents: 'none', zIndex: 1,
            animation: 'rrBloom 4s ease-in-out infinite alternate',
          }} />

          <div style={{
            maxWidth: '980px',
            position: 'relative', zIndex: 2,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${heroTiltX}deg) translateZ(${-heroDepth}px)`,
            opacity: heroOpacity,
            willChange: 'transform, opacity',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.2rem',
              marginBottom: '3rem',
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'none' : 'translateY(24px)',
              transition: 'opacity 1s ease 0.2s, transform 1s ease 0.2s',
            }}>
              <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(82,39,255,0.7))' }} />
              <p style={{
                fontSize: '0.58rem', color: 'rgba(82,39,255,0.7)',
                letterSpacing: '0.55em', textTransform: 'uppercase',
                fontFamily: 'Montserrat, sans-serif', fontWeight: 300,
              }}>Premium Sport &amp; Lifestyle</p>
              <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, rgba(82,39,255,0.7), transparent)' }} />
            </div>

            <div style={{ transformStyle: 'preserve-3d', perspective: '800px', marginBottom: '2rem' }}>
              {[
                { text: 'R&R',       gold: true,  z: 40, delay: 0.35 },
                { text: 'Sport &',   gold: false, z: 20, delay: 0.52 },
                { text: 'Lifestyle', gold: false, z: 0,  delay: 0.69 },
              ].map((word, i) => (
                <div key={i} style={{
                  overflow: 'hidden', lineHeight: 1.0,
                  transformStyle: 'preserve-3d',
                  transform: `translateZ(${word.z}px)`,
                }}>
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
                        display: 'block',
                        letterSpacing: word.gold ? '-0.02em' : '-0.01em',
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

            <div style={{
              width: heroVisible ? '140px' : '0px', height: '1px',
              background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
              margin: '3rem auto',
              transition: 'width 1.6s cubic-bezier(0.16,1,0.3,1) 0.9s',
            }} />

            <p style={{
              fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.4em', textTransform: 'uppercase',
              marginBottom: '4rem',
              fontFamily: 'Montserrat, sans-serif', fontWeight: 200,
              opacity: heroVisible ? 1 : 0,
              transition: 'opacity 1s ease 1.2s',
            }}>
              Own the Look · Own the Moment
            </p>

            <div style={{
              display: 'flex', gap: '1.4rem',
              justifyContent: 'center', flexWrap: 'wrap',
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'none' : 'translateY(24px)',
              transition: 'opacity 1s ease 1.5s, transform 1s ease 1.5s',
            }}>
              <Link href="/shop" className="rr-btn-primary">Shop the Collection</Link>
              <Link href="/about" className="rr-btn-outline">Our Story</Link>
            </div>

            <div style={{
              position: 'absolute', bottom: '-160px', left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem',
              opacity: heroVisible ? 0.6 : 0,
              transition: 'opacity 1s ease 2.2s',
            }}>
              <p style={{ fontSize: '0.44rem', color: 'rgba(82,39,255,0.7)', letterSpacing: '0.5em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>
                Scroll
              </p>
              <div style={{
                width: '1px', height: '70px',
                background: 'linear-gradient(180deg, rgba(82,39,255,0.7), transparent)',
                animation: 'rrScrollPulse 2s ease-in-out infinite',
              }} />
            </div>
          </div>

          {[0,1,2,3].map(i => (
            <div key={i} style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: `translateZ(${-100 - i * 80}px)`,
              pointerEvents: 'none', zIndex: 1,
            }}>
              <div style={{
                width: `${380 + i * 220}px`, height: `${380 + i * 220}px`,
                borderRadius: '50%',
                border: `1px solid rgba(82,39,255,${0.07 - i * 0.012})`,
                animation: `rrRingPulse ${3.5 + i * 0.9}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.7}s`,
              }} />
            </div>
          ))}
        </section>

        {/* ─── MARQUEE ─── */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Marquee />
        </div>

        {/* ─── RIBBON INTERLUDE — "Move in Gold" ─── */}
        <section
          ref={ribbonRef}
          style={{
            position: 'relative', zIndex: 2,
            height: '500px',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(82,39,255,0.1)',
          }}
        >
          <Ribbons
            baseThickness={30}
            colors={['#5227FF']}
            speedMultiplier={0.5}
            maxAge={500}
            enableFade={false}
            enableShaderEffect={false}
          />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '1rem',
            pointerEvents: 'none',
            background: 'linear-gradient(180deg, rgba(4,3,10,0.55) 0%, rgba(4,3,10,0.15) 50%, rgba(4,3,10,0.55) 100%)',
          }}>
            <p style={{
              fontSize: '0.52rem', color: 'rgba(82,39,255,0.55)',
              letterSpacing: '0.7em', textTransform: 'uppercase',
              fontFamily: 'Montserrat, sans-serif',
              opacity: Math.min(1, ribbonScroll * 3),
              transform: `translateY(${Math.max(0, (0.4 - ribbonScroll) * 30)}px)`,
            }}>Est. South Africa</p>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 300,
              color: 'rgba(255,255,255,0.1)',
              fontStyle: 'italic', letterSpacing: '0.08em',
              opacity: Math.min(1, ribbonScroll * 3),
            }}>Move in Gold</h2>
          </div>
        </section>

        {/* ─── ANTIGRAVITY — "Crafted with intention" ─── */}
        <section
          ref={antigravRef}
          style={{
            padding: '9rem 2rem',
            textAlign: 'center',
            background: 'rgba(4,3,10,0.99)',
            position: 'relative', zIndex: 2,
            overflow: 'hidden',
          }}
        >
          <div style={{
            maxWidth: '700px', margin: '0 auto 5rem',
            opacity: Math.min(1, antigravScroll * 3),
            transform: `translateY(${Math.max(0, (0.4 - antigravScroll) * 60)}px)`,
          }}>
            <p style={{ fontSize: '0.55rem', color: 'rgba(82,39,255,0.65)', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.2rem', fontFamily: 'Montserrat, sans-serif' }}>
              The Experience
            </p>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2.8rem, 7vw, 5rem)', fontWeight: 300,
              color: '#FFFFFF',
            }}>
              Crafted with <span style={{ color: '#C9A84C', fontStyle: 'italic' }}>intention</span>
            </h2>
            <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(82,39,255,0.6), transparent)', margin: '1.8rem auto 0' }} />
            <p style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', lineHeight: 2, marginTop: '2rem' }}>
              Move your cursor through the field. Every detail responds with intention.
            </p>
          </div>

          <div style={{ width: '100%', height: '400px', position: 'relative' }}>
            <Antigravity
              count={300}
              magnetRadius={6}
              ringRadius={7}
              waveSpeed={0.4}
              waveAmplitude={1}
              particleSize={1.5}
              lerpSpeed={0.05}
              color="#5227FF"
              autoAnimate
              particleVariance={1}
              rotationSpeed={0}
              depthFactor={1}
              pulseSpeed={3}
              particleShape="capsule"
              fieldStrength={10}
            />
          </div>
        </section>

        {/* ─── COLLECTIONS ─── */}
        <section
          ref={collectionsRef}
          style={{
            padding: '11rem 4rem 10rem',
            maxWidth: '1380px', margin: '0 auto',
            position: 'relative', zIndex: 2,
            perspective: '1600px',
            perspectiveOrigin: '50% 35%',
          }}
        >
          <div style={{
            textAlign: 'center', marginBottom: '5rem',
            transform: `translateY(${Math.max(0, (0.5 - collectionsScroll) * 70)}px)`,
            opacity: Math.min(1, collectionsScroll * 3.5),
          }}>
            <p style={{ fontSize: '0.55rem', color: 'rgba(82,39,255,0.65)', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.2rem', fontFamily: 'Montserrat, sans-serif' }}>
              Browse
            </p>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 300,
              color: '#FFFFFF',
              textShadow: '0 0 60px rgba(255,255,255,0.06)',
            }}>Our Collections</h2>
            <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '1.8rem auto 0' }} />
          </div>

          {/* BounceCards preview above the grid */}
          <div style={{
            display: 'flex', justifyContent: 'center',
            marginBottom: '7rem',
            opacity: Math.min(1, collectionsScroll * 2.5),
          }}>
            <BounceCards
              images={bounceImages}
              containerWidth={500}
              containerHeight={250}
              animationDelay={0.3}
              animationStagger={0.08}
              easeType="elastic.out(1, 0.5)"
              transformStyles={bounceTransforms}
              enableHover={false}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2px',
            background: 'rgba(82,39,255,0.05)',
            transformStyle: 'preserve-3d',
          }}>
            {categories.map((cat, i) => (
              <CategoryCard3D key={cat.label} cat={cat} index={i} sectionProgress={collectionsScroll} />
            ))}
          </div>
        </section>

        {/* ─── BALLPIT — "118 Pieces" ─── */}
        <section
          ref={ballpitRef}
          style={{
            overflow: 'hidden',
            position: 'relative', zIndex: 2,
            background: 'rgba(4,3,10,0.99)',
            borderTop: '1px solid rgba(82,39,255,0.08)',
            borderBottom: '1px solid rgba(82,39,255,0.08)',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.55rem', color: 'rgba(82,39,255,0.5)', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '0.8rem', fontFamily: 'Montserrat, sans-serif', opacity: Math.min(1, ballpitScroll * 3) }}>
                118 Pieces
              </p>
              <h2 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 300,
                color: 'rgba(255,255,255,0.06)', fontStyle: 'italic',
                opacity: Math.min(1, ballpitScroll * 2.5),
              }}>Premium</h2>
            </div>
          </div>
          <div style={{ position: 'relative', minHeight: '500px', maxHeight: '500px', width: '100%' }}>
            <Ballpit
              count={100}
              gravity={0.01}
              friction={0.9975}
              wallBounce={0.95}
              followCursor={false}
            />
          </div>
        </section>

        {/* ─── BRAND STATEMENT ─── */}
        <section
          ref={brandRef}
          style={{
            background: 'rgba(4,3,10,0.97)',
            backdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(82,39,255,0.1)',
            borderBottom: '1px solid rgba(82,39,255,0.1)',
            padding: '11rem 2rem',
            textAlign: 'center',
            position: 'relative', zIndex: 2,
            overflow: 'hidden',
            perspective: '1200px',
          }}
        >
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(10rem, 28vw, 24rem)',
            color: 'transparent',
            WebkitTextStroke: '1px rgba(82,39,255,0.04)',
            userSelect: 'none', pointerEvents: 'none',
            whiteSpace: 'nowrap', fontWeight: 300,
            transform: `translate(-50%,-50%) rotateX(${brandTilt}deg) scale(${brandScale})`,
            willChange: 'transform',
          }}>R&amp;R</div>

          <div style={{
            maxWidth: '900px', margin: '0 auto',
            position: 'relative', zIndex: 1,
            transform: `rotateX(${brandTilt * 0.45}deg) scale(${0.94 + brandScroll * 0.09})`,
            opacity: Math.min(1, brandScroll * 3),
            willChange: 'transform, opacity',
          }}>
            <p style={{ fontSize: '0.55rem', color: 'rgba(82,39,255,0.65)', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '2.2rem', fontFamily: 'Montserrat, sans-serif' }}>
              Our Mission
            </p>

            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2rem, 5vw, 3.8rem)',
              fontWeight: 300, fontStyle: 'italic',
              color: '#FFFFFF', lineHeight: 1.65,
              textShadow: '0 0 80px rgba(255,255,255,0.04)',
            }}>
              "Premium clothing that combines{' '}
              <span style={{
                color: '#C9A84C', fontStyle: 'normal',
                textShadow: '0 0 40px rgba(201,168,76,0.35)',
              }}>elegance with comfort</span>,
              designed for the modern individual who lives without compromise."
            </h2>

            <div style={{ width: '70px', height: '1px', background: '#C9A84C', margin: '3.5rem auto 3rem' }} />
            <Link href="/about" className="rr-btn-outline">Read Our Story</Link>
          </div>
        </section>

        {/* ─── GOOEY NAVIGATION ─── */}
        <section style={{
          padding: '9rem 2rem 8rem',
          textAlign: 'center',
          background: '#04030a',
          position: 'relative', zIndex: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: '600px', height: '600px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(82,39,255,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <p style={{ fontSize: '0.55rem', color: 'rgba(82,39,255,0.6)', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.5rem', fontFamily: 'Montserrat, sans-serif', position: 'relative', zIndex: 1 }}>
            Navigate
          </p>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(2.8rem, 6vw, 4.5rem)', fontWeight: 300, color: '#FFFFFF',
            marginBottom: '4rem', position: 'relative', zIndex: 1,
          }}>Explore R&amp;R</h2>
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <GooeyNav
              items={navItems}
              particleCount={15}
              particleDistances={[90, 10]}
              particleR={100}
              initialActiveIndex={0}
              animationTime={600}
              timeVariance={300}
              colors={[1, 2, 3, 1, 2, 3, 1, 4]}
            />
          </div>
        </section>

        {/* ─── VALUES ─── */}
        <section
          ref={valuesRef}
          style={{
            padding: '11rem 4rem', maxWidth: '1300px', margin: '0 auto',
            position: 'relative', zIndex: 2,
            perspective: '1400px',
            perspectiveOrigin: '50% 25%',
          }}
        >
          <div style={{
            textAlign: 'center', marginBottom: '6rem',
            transform: `translateY(${Math.max(0, (0.4 - valuesScroll) * 70)}px)`,
            opacity: Math.min(1, valuesScroll * 3.5),
          }}>
            <p style={{ fontSize: '0.55rem', color: 'rgba(82,39,255,0.65)', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.2rem', fontFamily: 'Montserrat, sans-serif' }}>
              What We Stand For
            </p>
            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 300, color: '#FFFFFF',
              textShadow: '0 0 60px rgba(255,255,255,0.06)',
            }}>Our Values</h2>
            <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '1.8rem auto 0' }} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '2px',
            background: 'rgba(82,39,255,0.04)',
            transformStyle: 'preserve-3d',
          }}>
            {values.map((v, i) => (
              <ValueCard3D key={v.title} value={v} index={i} sectionProgress={valuesScroll} />
            ))}
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section style={{
          padding: '14rem 2rem',
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(4,3,10,0.97) 0%, rgba(6,4,18,0.99) 100%)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(82,39,255,0.1)',
          position: 'relative', zIndex: 2,
          overflow: 'hidden',
          perspective: '1200px',
        }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{
              position: 'absolute', top: '50%', left: '50%',
              width: `${i * 20}vw`, height: `${i * 20}vw`,
              borderRadius: '50%',
              border: `1px solid rgba(82,39,255,${0.08 - i * 0.01})`,
              transform: `translate(-50%, -50%) translateZ(${-i * 100}px)`,
              animation: `rrRingPulse ${2.5 + i * 0.6}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.4}s`,
              pointerEvents: 'none',
            }} />
          ))}

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: '0.55rem', color: 'rgba(82,39,255,0.6)',
              letterSpacing: '0.6em', textTransform: 'uppercase',
              marginBottom: '2rem',
              fontFamily: 'Montserrat, sans-serif',
            }}>118 premium pieces — available now</p>

            <h2 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(3rem, 9vw, 7.5rem)',
              fontWeight: 300, lineHeight: 1.05,
              marginBottom: '4rem',
            }}>
              <span style={{
                color: '#FFFFFF',
                textShadow: '0 0 80px rgba(255,255,255,0.08)',
                display: 'block',
              }}>Ready to</span>
              <span style={{
                color: '#C9A84C',
                textShadow: '0 0 80px rgba(201,168,76,0.5), 0 0 160px rgba(201,168,76,0.2)',
                fontStyle: 'italic', display: 'block',
              }}>elevate</span>
              <span style={{
                color: '#FFFFFF',
                textShadow: '0 0 80px rgba(255,255,255,0.08)',
                display: 'block',
              }}>your wardrobe?</span>
            </h2>

            <Link href="/shop" className="rr-btn-primary">Shop Now</Link>
          </div>
        </section>

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
            from { opacity: 0.1; transform: translate(-50%,-50%) scale(0.96); }
            to   { opacity: 0.5; transform: translate(-50%,-50%) scale(1.04); }
          }
          @keyframes rrBloom {
            from { opacity: 0.5; transform: translate(-50%,-50%) scale(0.95); }
            to   { opacity: 0.9; transform: translate(-50%,-50%) scale(1.05); }
          }

          .rr-btn-primary {
            display: inline-block;
            padding: 1.15rem 3.2rem;
            background: #C9A84C;
            color: #080604;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.57rem; font-weight: 500;
            letter-spacing: 0.4em; text-transform: uppercase;
            text-decoration: none;
            position: relative; overflow: hidden;
            transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s;
            box-shadow: 0 8px 40px rgba(201,168,76,0.18);
          }
          .rr-btn-primary::before {
            content: '';
            position: absolute; inset: 0;
            background: #EDD070;
            transform: translateX(-101%);
            transition: transform 0.55s cubic-bezier(0.16,1,0.3,1);
          }
          .rr-btn-primary:hover::before { transform: translateX(0); }
          .rr-btn-primary:hover {
            transform: translateY(-5px);
            box-shadow: 0 25px 60px rgba(201,168,76,0.3);
          }

          .rr-btn-outline {
            display: inline-block;
            padding: 1.15rem 3.2rem;
            border: 1px solid rgba(201,168,76,0.45);
            color: #C9A84C;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.57rem; font-weight: 300;
            letter-spacing: 0.4em; text-transform: uppercase;
            text-decoration: none;
            position: relative; overflow: hidden;
            transition: border-color 0.4s, transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s;
          }
          .rr-btn-outline::before {
            content: '';
            position: absolute; inset: 0;
            background: rgba(201,168,76,0.07);
            transform: scaleX(0); transform-origin: left;
            transition: transform 0.55s cubic-bezier(0.16,1,0.3,1);
          }
          .rr-btn-outline:hover::before { transform: scaleX(1); }
          .rr-btn-outline:hover {
            border-color: #C9A84C;
            transform: translateY(-5px);
            box-shadow: 0 20px 50px rgba(201,168,76,0.12);
          }
        `}</style>
      </div>
    </ClickSpark>
  );
}