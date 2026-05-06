'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import DotGrid from './DotGrid';

export default function AboutPage() {
  const [whatVis, setWhatVis] = useState(false);
  const whatRef = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setWhatVis(true);
    }, { threshold: 0.2 });

    if (whatRef.current) obs.observe(whatRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ paddingTop: '70px', background: '#03020a', minHeight: '100vh' }}>

      <section ref={whatRef} style={{ position: 'relative', height: '420px', overflow: 'hidden' }}>
        <DotGrid
          baseColor="#3d2a05"
          activeColor="#C9A84C"
          gap={28}
          dotSize={6}
          proximity={140}
          shockRadius={260}
          shockStrength={6}
        />

        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          pointerEvents: 'none'
        }}>
          <h2 style={{
            fontFamily: 'Cormorant Garamond,serif',
            fontSize: 'clamp(2.5rem,6vw,4.5rem)',
            fontWeight: 300,
            color: '#fff',
            opacity: whatVis ? 1 : 0,
            transform: whatVis ? 'none' : 'translateY(40px)',
            transition: 'all 1s cubic-bezier(0.16,1,0.3,1)',
            textShadow: '0 0 60px rgba(201,168,76,0.35)'
          }}>
            What Sets Us Apart
          </h2>
        </div>
      </section>

      <section style={{ padding: '5rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {[
            { title: 'Premium Fabrics', desc: 'Only the finest technical materials, selected for performance and durability.' },
            { title: 'Contemporary Design', desc: 'Original collections blending athletic functionality with street-style aesthetics.' },
            { title: 'Limited Edition', desc: 'Every garment produced in limited quantities. Once gone, never reproduced.' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '2.5rem',
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(16px)'
            }}>
              <h3 style={{
                fontFamily: 'Cormorant Garamond,serif',
                fontSize: '1.6rem',
                color: '#C9A84C',
                marginBottom: '0.8rem'
              }}>{item.title}</h3>
              <p style={{
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.4)',
                lineHeight: 1.9
              }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '1.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/shop" className="rr-btn-primary">Shop the Collection</Link>
          <Link href="/contact" className="rr-btn-ghost">Get in Touch</Link>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Montserrat:wght@300;400&display=swap');

        .rr-btn-primary {
          padding:1rem 2.5rem;
          background:#C9A84C;
          color:#03020a;
          text-decoration:none;
          font-size:0.55rem;
          letter-spacing:0.35em;
          text-transform:uppercase;
          font-family:'Montserrat',sans-serif;
          transition:0.3s;
        }
        .rr-btn-primary:hover {
          transform:translateY(-4px);
          box-shadow:0 20px 50px rgba(201,168,76,0.4);
        }

        .rr-btn-ghost {
          padding:1rem 2.5rem;
          border:1px solid rgba(255,255,255,0.1);
          color:rgba(255,255,255,0.5);
          text-decoration:none;
          font-size:0.55rem;
          letter-spacing:0.35em;
          text-transform:uppercase;
          font-family:'Montserrat',sans-serif;
          transition:0.3s;
        }
        .rr-btn-ghost:hover {
          border-color:#C9A84C;
          color:#C9A84C;
          transform:translateY(-4px);
        }
      `}</style>

    </div>
  );
}