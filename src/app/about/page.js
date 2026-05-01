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

function StarField({ mouseRef }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;

    const stars = Array.from({ length: 350 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      z: Math.random(), size: 0.3 + Math.random() * 1.8,
      gold: Math.random() < 0.12,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.004 + Math.random() * 0.01,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      [
        { x: W*0.2, y: H*0.3, r: 380, c: 'rgba(201,168,76,0.025)' },
        { x: W*0.8, y: H*0.6, r: 300, c: 'rgba(201,168,76,0.018)' },
        { x: W*0.5, y: H*0.85,r: 450, c: 'rgba(60,40,10,0.035)' },
      ].forEach(n => {
        const g = ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r);
        g.addColorStop(0, n.c); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();
      });

      const pmx = mouseRef.current.x * 20, pmy = mouseRef.current.y * 14;
      stars.forEach(s => {
        s.twinkle += s.speed;
        const a = 0.3 + (s.gold ? 0.5 : 0.4) * s.z + Math.sin(s.twinkle) * 0.15;
        const px = ((s.x + pmx * s.z) % W + W) % W;
        const py = ((s.y + pmy * s.z) % H + H) % H;
        const sz = s.size * (0.5 + s.z * 0.8);
        ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI*2);
        ctx.fillStyle = s.gold ? `rgba(201,168,76,${a})` : `rgba(255,255,255,${a*0.55})`;
        ctx.fill();
        if (s.gold && s.z > 0.7) {
          const g = ctx.createRadialGradient(px,py,0,px,py,sz*6);
          g.addColorStop(0,'rgba(201,168,76,0.12)'); g.addColorStop(1,'transparent');
          ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,sz*6,0,Math.PI*2); ctx.fill();
        }
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const onResize = () => { W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:'fixed',inset:0,zIndex:0,pointerEvents:'none',background:'#03020a' }} />;
}

function FloatingSlab({ children, driftX=0, driftY=0, driftRot=0, delay=0, style={} }) {
  const [pos, setPos] = useState({ y:0, x:0, rot:0 });
  const tRef = useRef(delay * 80);
  useEffect(() => {
    let raf;
    const loop = () => {
      tRef.current += 0.008;
      const t = tRef.current;
      setPos({ y: Math.sin(t*0.7+delay)*driftY, x: Math.cos(t*0.5+delay)*driftX, rot: Math.sin(t*0.4+delay)*driftRot });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div style={{ transform:`translate(${pos.x}px,${pos.y}px) rotate(${pos.rot}deg)`, willChange:'transform', ...style }}>{children}</div>;
}

function OrbitRing({ size, tilt, speed, color, style={} }) {
  const [rot, setRot] = useState(0);
  const rRef = useRef(0);
  useEffect(() => {
    let raf;
    const loop = () => { rRef.current += speed; setRot(rRef.current); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [speed]);
  return <div style={{ width:size, height:size, borderRadius:'50%', border:`1px solid ${color}`, transform:`rotateX(${tilt}deg) rotateZ(${rot}deg)`, willChange:'transform', position:'absolute', ...style }} />;
}

function GlassPanel({ children, index=0, visible=true, delay=0, style={} }) {
  const [hov, setHov] = useState(false);
  const [mouse, setMouse] = useState({ x:0, y:0 });
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setMouse({ x:(e.clientX-r.left)/r.width-0.5, y:(e.clientY-r.top)/r.height-0.5 });
  }, []);
  const d = delay + index * 0.1;
  return (
    <div ref={ref} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{setHov(false);setMouse({x:0,y:0});}} onMouseMove={onMove} style={{ perspective:'800px', ...style }}>
      <div style={{
        background: hov ? 'rgba(201,168,76,0.055)' : 'rgba(255,255,255,0.022)',
        backdropFilter:'blur(24px)',
        border:'1px solid', borderColor: hov ? 'rgba(201,168,76,0.55)' : 'rgba(255,255,255,0.07)',
        position:'relative', overflow:'hidden',
        transform:`rotateX(${hov?mouse.y*-16:0}deg) rotateY(${hov?mouse.x*20:0}deg) translateZ(${hov?16:0}px) translateY(${visible?0:50}px)`,
        opacity: visible ? 1 : 0,
        transition: hov
          ? 'background 0.3s, border-color 0.3s, box-shadow 0.3s, transform 0.08s'
          : `background 0.5s, border-color 0.5s, box-shadow 0.5s, opacity 0.85s ease ${d}s, transform 0.85s cubic-bezier(0.16,1,0.3,1) ${d}s`,
        boxShadow: hov ? '0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(201,168,76,0.18), inset 0 1px 0 rgba(201,168,76,0.12)' : '0 8px 40px rgba(0,0,0,0.35)',
        cursor:'none',
      }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:'1px', background:`linear-gradient(90deg,transparent,rgba(201,168,76,${hov?0.55:0.12}),transparent)`, transition:'all 0.4s' }} />
        <div style={{ position:'absolute',top:0,left:hov?'100%':'-100%',width:'60%',height:'100%', background:'linear-gradient(90deg,transparent,rgba(201,168,76,0.04),transparent)', transition:'left 0.8s ease', pointerEvents:'none' }} />
        {children(hov)}
      </div>
    </div>
  );
}

export default function AboutPage() {
  const [heroVis, setHeroVis] = useState(false);
  const [cursor,  setCursor]  = useState({ x:-100, y:-100 });
  const [trail,   setTrail]   = useState({ x:-100, y:-100 });
  const [cursorVis, setCursorVis] = useState(false);
  const [cursorHov, setCursorHov] = useState(false);
  const [scroll, setScroll] = useState(0);

  const [foundVis, setFoundVis] = useState(false);
  const [collVis,  setCollVis]  = useState(false);
  const [valVis,   setValVis]   = useState(false);
  const [whatVis,  setWhatVis]  = useState(false);

  const mouseRef = useRef({ x:0, y:0 });
  const trailRef = useRef({ x:-100, y:-100 });

  const foundRef = useRef(null);
  const collRef  = useRef(null);
  const valRef   = useRef(null);
  const whatRef  = useRef(null);

  useEffect(() => {
    let raf;
    const loop = () => {
      trailRef.current.x += (cursor.x - trailRef.current.x) * 0.35;
      trailRef.current.y += (cursor.y - trailRef.current.y) * 0.35;
      setTrail({ x:trailRef.current.x, y:trailRef.current.y });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cursor]);

  useEffect(() => {
    const t = setTimeout(() => setHeroVis(true), 120);
    const observe = (ref, setter) => {
      const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setter(true); }, { threshold: 0.12 });
      if (ref.current) obs.observe(ref.current);
      return obs;
    };
    const o1 = observe(foundRef, setFoundVis);
    const o2 = observe(collRef,  setCollVis);
    const o3 = observe(valRef,   setValVis);
    const o4 = observe(whatRef,  setWhatVis);

    const onMove = (e) => {
      setCursor({ x:e.clientX, y:e.clientY });
      setCursorVis(true);
      mouseRef.current = { x:(e.clientX/window.innerWidth-0.5), y:(e.clientY/window.innerHeight-0.5) };
    };
    const onScroll = () => setScroll(window.scrollY);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', () => setCursorVis(false));
    window.addEventListener('scroll', onScroll, { passive:true });
    const addHov = () => {
      document.querySelectorAll('a,button').forEach(el => {
        el.addEventListener('mouseenter', () => setCursorHov(true));
        el.addEventListener('mouseleave', () => setCursorHov(false));
      });
    };
    addHov();
    const mut = new MutationObserver(addHov);
    mut.observe(document.body, { subtree:true, childList:true });
    return () => {
      clearTimeout(t);
      [o1,o2,o3,o4].forEach(o => o.disconnect());
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      mut.disconnect();
    };
  }, []);

  return (
    <div style={{ paddingTop:'70px', background:'#03020a', minHeight:'100vh', overflowX:'hidden' }}>
      <StarField mouseRef={mouseRef} />

      {/* Cursor */}
      <div style={{ position:'fixed',left:cursor.x,top:cursor.y,zIndex:9999, width:cursorHov?'6px':'9px',height:cursorHov?'6px':'9px', background:'#C9A84C',borderRadius:'50%', transform:'translate(-50%,-50%)', opacity:cursorVis?1:0, pointerEvents:'none', transition:'opacity 0.3s,width 0.2s,height 0.2s', boxShadow:'0 0 10px rgba(201,168,76,0.8)' }} />
      <div style={{ position:'fixed',left:trail.x,top:trail.y,zIndex:9998, width:cursorHov?'60px':'42px',height:cursorHov?'60px':'42px', border:'1px solid rgba(201,168,76,0.5)',borderRadius:'50%', transform:'translate(-50%,-50%)', opacity:cursorVis?0.7:0, pointerEvents:'none', transition:'opacity 0.3s,width 0.45s cubic-bezier(0.16,1,0.3,1),height 0.45s cubic-bezier(0.16,1,0.3,1)' }} />

      {/* ── HERO ── */}
      <section style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', perspective:'1200px' }}>

        {/* Orbit rings */}
        <FloatingSlab driftX={6} driftY={10} driftRot={0.3} delay={0} style={{ position:'absolute',top:'15%',left:'8%',zIndex:1 }}>
          <OrbitRing size="180px" tilt={65} speed={0.12} color="rgba(201,168,76,0.15)" />
        </FloatingSlab>
        <FloatingSlab driftX={8} driftY={14} driftRot={-0.2} delay={1} style={{ position:'absolute',bottom:'18%',right:'7%',zIndex:1 }}>
          <OrbitRing size="250px" tilt={45} speed={-0.08} color="rgba(201,168,76,0.1)" />
        </FloatingSlab>
        <FloatingSlab driftX={4} driftY={8} delay={2} style={{ position:'absolute',top:'42%',right:'14%',zIndex:1 }}>
          <OrbitRing size="120px" tilt={30} speed={0.18} color="rgba(255,255,255,0.05)" />
        </FloatingSlab>
        <FloatingSlab driftX={10} driftY={6} driftRot={-0.2} delay={0.5} style={{ position:'absolute',bottom:'38%',left:'5%',zIndex:1 }}>
          <OrbitRing size="200px" tilt={70} speed={-0.1} color="rgba(201,168,76,0.08)" />
        </FloatingSlab>
        <FloatingSlab driftX={5} driftY={9} delay={1.5} style={{ position:'absolute',top:'25%',left:'20%',zIndex:1 }}>
          <OrbitRing size="90px" tilt={20} speed={0.22} color="rgba(201,168,76,0.12)" />
        </FloatingSlab>

        {/* Gold line fragments */}
        {[
          { top:'12%',left:'35%',  w:'60px',rot:'-20deg',delay:0.8 },
          { top:'75%',left:'22%',  w:'40px',rot:'15deg', delay:1.2 },
          { top:'30%',right:'24%', w:'80px',rot:'-8deg', delay:0.4 },
          { top:'65%',right:'18%', w:'50px',rot:'25deg', delay:1.6 },
          { top:'88%',left:'55%',  w:'35px',rot:'-12deg',delay:2.0 },
        ].map((f,i) => (
          <FloatingSlab key={i} driftX={5} driftY={12} delay={f.delay} style={{ position:'absolute',top:f.top,left:f.left,right:f.right,zIndex:1 }}>
            <div style={{ width:f.w, height:'1px', background:'rgba(201,168,76,0.3)', transform:`rotate(${f.rot})` }} />
          </FloatingSlab>
        ))}

        {/* Hero text */}
        <div style={{ position:'relative',zIndex:2, transform:`translateY(${-scroll*0.12}px)`, textAlign:'center', padding:'2rem' }}>

          <FloatingSlab driftY={5} driftX={2} delay={0.3}>
            <div style={{ display:'inline-flex',alignItems:'center',gap:'1rem',marginBottom:'3rem', opacity:heroVis?1:0,transform:heroVis?'none':'translateY(20px)', transition:'opacity 1s ease 0.2s,transform 1s ease 0.2s' }}>
              <div style={{ width:'28px',height:'1px',background:'linear-gradient(90deg,transparent,#C9A84C)' }} />
              <p style={{ fontSize:'0.5rem',color:'#C9A84C',letterSpacing:'0.58em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif',fontWeight:300 }}>Who We Are</p>
              <div style={{ width:'28px',height:'1px',background:'linear-gradient(90deg,#C9A84C,transparent)' }} />
            </div>
          </FloatingSlab>

          <FloatingSlab driftY={10} driftX={4} delay={0}>
            <div style={{ overflow:'hidden' }}>
              <h1 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'clamp(3.5rem,11vw,9.5rem)', fontWeight:300, lineHeight:0.9, color:'rgba(255,255,255,0.93)', letterSpacing:'-0.02em', display:'block', opacity:heroVis?1:0, transform:heroVis?'none':'translateY(80px)', transition:'opacity 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s,transform 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s', textShadow:'0 0 80px rgba(255,255,255,0.07)' }}>About</h1>
            </div>
          </FloatingSlab>

          <FloatingSlab driftY={14} driftX={-6} delay={1.5}>
            <div style={{ overflow:'hidden' }}>
              <h1 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'clamp(3.5rem,11vw,9.5rem)', fontWeight:300, lineHeight:0.9, color:'#C9A84C', letterSpacing:'-0.02em', fontStyle:'italic', display:'block', opacity:heroVis?1:0, transform:heroVis?'none':'translateY(80px)', transition:'opacity 1.2s cubic-bezier(0.16,1,0.3,1) 0.52s,transform 1.2s cubic-bezier(0.16,1,0.3,1) 0.52s', textShadow:'0 0 100px rgba(201,168,76,0.65),0 0 200px rgba(201,168,76,0.2)' }}>R&amp;R</h1>
            </div>
          </FloatingSlab>

          <FloatingSlab driftY={8} driftX={5} delay={0.8}>
            <div style={{ overflow:'hidden' }}>
              <h1 style={{ fontFamily:'Cormorant Garamond,serif', fontSize:'clamp(3.5rem,11vw,9.5rem)', fontWeight:300, lineHeight:0.9, color:'rgba(255,255,255,0.93)', letterSpacing:'-0.02em', display:'block', opacity:heroVis?1:0, transform:heroVis?'none':'translateY(80px)', transition:'opacity 1.2s cubic-bezier(0.16,1,0.3,1) 0.72s,transform 1.2s cubic-bezier(0.16,1,0.3,1) 0.72s', textShadow:'0 0 80px rgba(255,255,255,0.07)' }}>Agencies</h1>
            </div>
          </FloatingSlab>

          <FloatingSlab driftY={7} driftX={-3} delay={2}>
            <p style={{ fontSize:'0.68rem',color:'rgba(255,255,255,0.22)',letterSpacing:'0.3em',textTransform:'uppercase', fontFamily:'Montserrat,sans-serif',fontWeight:200,marginTop:'3rem', opacity:heroVis?1:0,transition:'opacity 1s ease 1.3s' }}>
              Built for Movement · Designed for Life
            </p>
          </FloatingSlab>

          <div style={{ marginTop:'5rem',opacity:heroVis?0.45:0,transition:'opacity 1s ease 2s', display:'flex',flexDirection:'column',alignItems:'center',gap:'0.8rem' }}>
            <p style={{ fontSize:'0.43rem',color:'#C9A84C',letterSpacing:'0.5em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif' }}>Drift down</p>
            <div style={{ width:'1px',height:'60px',background:'linear-gradient(180deg,#C9A84C,transparent)',animation:'aboutPulse 2s ease-in-out infinite' }} />
          </div>
        </div>
      </section>

      {/* ── FOUNDERS ── */}
      <section ref={foundRef} style={{ padding:'10rem 3rem',position:'relative',zIndex:2,maxWidth:'1100px',margin:'0 auto' }}>

        <FloatingSlab driftY={7} delay={0.2}>
          <div style={{ textAlign:'center',marginBottom:'6rem',opacity:foundVis?1:0,transform:foundVis?'none':'translateY(30px)',transition:'opacity 0.9s,transform 0.9s' }}>
            <div style={{ display:'inline-flex',alignItems:'center',gap:'1.5rem',marginBottom:'1rem' }}>
              <div style={{ width:'45px',height:'1px',background:'linear-gradient(90deg,transparent,rgba(201,168,76,0.45))' }} />
              <p style={{ fontSize:'0.49rem',color:'rgba(201,168,76,0.55)',letterSpacing:'0.5em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif' }}>The Founders</p>
              <div style={{ width:'45px',height:'1px',background:'linear-gradient(90deg,rgba(201,168,76,0.45),transparent)' }} />
            </div>
            <h2 style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(2.2rem,5vw,4rem)',fontWeight:300,color:'rgba(255,255,255,0.88)' }}>Two Passions, One Vision</h2>
          </div>
        </FloatingSlab>

        <div style={{ display:'flex',flexDirection:'column',gap:'2.5rem' }}>

          {/* Romario */}
          <FloatingSlab driftY={12} driftX={-4} delay={0}>
            <GlassPanel index={0} visible={foundVis} delay={0.1}>
              {(hov) => (
                <div style={{ padding:'4rem',display:'grid',gridTemplateColumns:'auto 1fr',gap:'4rem',alignItems:'center' }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ width:'90px',height:'90px',borderRadius:'50%',border:`1px solid rgba(201,168,76,${hov?0.55:0.18})`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.2rem',transition:'border-color 0.4s',position:'relative' }}>
                      <span style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'2.2rem',color:'#C9A84C',fontWeight:300 }}>01</span>
                      <div style={{ position:'absolute',inset:'-8px',borderRadius:'50%',border:`1px solid rgba(201,168,76,${hov?0.18:0.05})`,transition:'border-color 0.4s' }} />
                    </div>
                    <p style={{ fontSize:'0.46rem',color:'rgba(201,168,76,0.45)',letterSpacing:'0.3em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif',whiteSpace:'nowrap' }}>Co-Founder</p>
                  </div>
                  <div>
                    <p style={{ fontSize:'0.48rem',color:'rgba(201,168,76,0.48)',letterSpacing:'0.38em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif',marginBottom:'0.7rem',transition:'color 0.3s',...(hov&&{color:'rgba(201,168,76,0.75)'}) }}>Sports & Performance</p>
                    <h3 style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'2.5rem',fontWeight:300,color:hov?'#fff':'rgba(255,255,255,0.88)',marginBottom:'0.4rem',transition:'color 0.3s' }}>Romario Govender</h3>
                    <p style={{ fontSize:'0.53rem',color:'#C9A84C',letterSpacing:'0.18em',fontFamily:'Montserrat,sans-serif',marginBottom:'1.8rem' }}>Athletic Excellence</p>
                    <p style={{ fontSize:'0.67rem',color:hov?'rgba(255,255,255,0.48)':'rgba(255,255,255,0.27)',lineHeight:2.1,letterSpacing:'0.04em',transition:'color 0.4s' }}>
                      A true athlete at heart, Romario has excelled in nearly every sport imaginable. As a semi-professional golfer, he brings an elite athlete's perspective — ensuring every sportswear piece performs at the highest level.
                    </p>
                  </div>
                </div>
              )}
            </GlassPanel>
          </FloatingSlab>

          {/* Rhea — offset right */}
          <FloatingSlab driftY={10} driftX={5} delay={1.2} style={{ alignSelf:'flex-end',width:'94%' }}>
            <GlassPanel index={1} visible={foundVis} delay={0.25}>
              {(hov) => (
                <div style={{ padding:'4rem',display:'grid',gridTemplateColumns:'1fr auto',gap:'4rem',alignItems:'center' }}>
                  <div>
                    <p style={{ fontSize:'0.48rem',color:'rgba(201,168,76,0.48)',letterSpacing:'0.38em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif',marginBottom:'0.7rem',transition:'color 0.3s',...(hov&&{color:'rgba(201,168,76,0.75)'}) }}>Lifestyle & Luxury</p>
                    <h3 style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'2.5rem',fontWeight:300,color:hov?'#fff':'rgba(255,255,255,0.88)',marginBottom:'0.4rem',transition:'color 0.3s' }}>Rhea Jugernath</h3>
                    <p style={{ fontSize:'0.53rem',color:'#C9A84C',letterSpacing:'0.18em',fontFamily:'Montserrat,sans-serif',marginBottom:'1.8rem' }}>Style & Sophistication</p>
                    <p style={{ fontSize:'0.67rem',color:hov?'rgba(255,255,255,0.48)':'rgba(255,255,255,0.27)',lineHeight:2.1,letterSpacing:'0.04em',transition:'color 0.4s' }}>
                      With a passion for fashion and an eye for luxury, Rhea brings the lifestyle element that elevates R&R beyond performance wear — ensuring every collection embodies sophistication, comfort, and timeless style.
                    </p>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ width:'90px',height:'90px',borderRadius:'50%',border:`1px solid rgba(201,168,76,${hov?0.55:0.18})`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.2rem',transition:'border-color 0.4s',position:'relative' }}>
                      <span style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'2.2rem',color:'#C9A84C',fontWeight:300 }}>02</span>
                      <div style={{ position:'absolute',inset:'-8px',borderRadius:'50%',border:`1px solid rgba(201,168,76,${hov?0.18:0.05})`,transition:'border-color 0.4s' }} />
                    </div>
                    <p style={{ fontSize:'0.46rem',color:'rgba(201,168,76,0.45)',letterSpacing:'0.3em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif',whiteSpace:'nowrap' }}>Co-Founder</p>
                  </div>
                </div>
              )}
            </GlassPanel>
          </FloatingSlab>

          {/* Quote */}
          <FloatingSlab driftY={9} driftX={2} delay={0.6}>
            <GlassPanel index={2} visible={foundVis} delay={0.4}>
              {(hov) => (
                <div style={{ padding:'3.5rem 4rem',textAlign:'center' }}>
                  <p style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(1.1rem,2.5vw,1.6rem)',fontWeight:300,fontStyle:'italic',color:hov?'rgba(255,255,255,0.85)':'rgba(255,255,255,0.5)',lineHeight:1.8,transition:'color 0.4s',maxWidth:'720px',margin:'0 auto' }}>
                    "Where athletic performance meets everyday elegance — where functionality embraces fashion, and every piece tells the story of{' '}
                    <span style={{ color:'#C9A84C',fontStyle:'normal' }}>two passions perfectly combined.</span>"
                  </p>
                </div>
              )}
            </GlassPanel>
          </FloatingSlab>
        </div>
      </section>

      {/* ── WHAT SETS US APART ── */}
      <section ref={whatRef} style={{ padding:'8rem 3rem',position:'relative',zIndex:2,maxWidth:'1100px',margin:'0 auto' }}>
        <FloatingSlab driftY={6} delay={0.2}>
          <div style={{ textAlign:'center',marginBottom:'5rem',opacity:whatVis?1:0,transform:whatVis?'none':'translateY(30px)',transition:'opacity 0.9s,transform 0.9s' }}>
            <h2 style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(2rem,5vw,3.8rem)',fontWeight:300,color:'rgba(255,255,255,0.88)' }}>What Sets Us Apart</h2>
            <div style={{ width:'45px',height:'1px',background:'#C9A84C',margin:'1.5rem auto 0' }} />
          </div>
        </FloatingSlab>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'1.5rem' }}>
          {[
            { icon:'🧵', title:'Premium Fabrics',     desc:'Only the finest technical materials, selected for performance and durability.', num:'01' },
            { icon:'🎨', title:'Contemporary Design', desc:'Original collections blending athletic functionality with street-style aesthetics.', num:'02' },
            { icon:'✨', title:'Limited Edition',     desc:'Every garment produced in limited quantities. Once gone, never reproduced.', num:'03' },
          ].map((item,i) => (
            <FloatingSlab key={item.title} driftY={8+i*3} driftX={i%2===0?4:-4} delay={i*0.5}>
              <GlassPanel index={i} visible={whatVis} delay={i*0.14}>
                {(hov) => (
                  <div style={{ padding:'3rem 2.5rem' }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'2rem' }}>
                      <span style={{ fontSize:'2.2rem',transform:hov?'translateY(-6px) scale(1.15)':'none',transition:'transform 0.45s cubic-bezier(0.16,1,0.3,1)',display:'block',filter:hov?'drop-shadow(0 8px 16px rgba(201,168,76,0.4))':'none' }}>{item.icon}</span>
                      <span style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'3rem',color:hov?'rgba(201,168,76,0.18)':'rgba(201,168,76,0.06)',fontWeight:300,transition:'color 0.4s',lineHeight:1 }}>{item.num}</span>
                    </div>
                    <h3 style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'1.5rem',fontWeight:300,color:hov?'#fff':'rgba(255,255,255,0.78)',marginBottom:'0.8rem',transition:'color 0.3s' }}>{item.title}</h3>
                    <p style={{ fontSize:'0.63rem',color:hov?'rgba(255,255,255,0.44)':'rgba(255,255,255,0.2)',lineHeight:2,letterSpacing:'0.05em',transition:'color 0.4s' }}>{item.desc}</p>
                  </div>
                )}
              </GlassPanel>
            </FloatingSlab>
          ))}
        </div>
      </section>

      {/* ── COLLECTIONS ── */}
      <section ref={collRef} style={{ padding:'8rem 3rem',position:'relative',zIndex:2,maxWidth:'1200px',margin:'0 auto' }}>
        <FloatingSlab driftY={7} delay={0.1}>
          <div style={{ marginBottom:'5rem',opacity:collVis?1:0,transform:collVis?'none':'translateY(30px)',transition:'opacity 0.9s,transform 0.9s' }}>
            <p style={{ fontSize:'0.49rem',color:'rgba(201,168,76,0.5)',letterSpacing:'0.5em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif',marginBottom:'0.8rem' }}>Collections</p>
            <h2 style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(2rem,5vw,3.8rem)',fontWeight:300,color:'rgba(255,255,255,0.88)' }}>
              Designed for Every Aspect<br /><span style={{ color:'#C9A84C',fontStyle:'italic' }}>of Your Active Life</span>
            </h2>
          </div>
        </FloatingSlab>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:'2px',background:'rgba(201,168,76,0.04)' }}>
          {[
            { tag:'Sportswear',title:'Active Performance',desc:'Technical wear engineered for peak performance.',icon:'⚡' },
            { tag:'Training',  title:'Essentials',        desc:'Versatile pieces for every workout.',         icon:'🔥' },
            { tag:'Lifestyle', title:'Urban',             desc:'Streetwear with athletic DNA.',               icon:'🌆' },
            { tag:'Luxury',    title:'Premium',           desc:'Exclusive pieces from the finest materials.', icon:'✦' },
          ].map((col,i) => (
            <FloatingSlab key={col.title} driftY={6+i*2} driftX={i%2===0?3:-3} delay={i*0.28}>
              <GlassPanel index={i} visible={collVis} delay={i*0.12}>
                {(hov) => (
                  <div style={{ padding:'3rem 2rem' }}>
                    <p style={{ fontSize:'0.43rem',color:hov?'rgba(201,168,76,0.75)':'rgba(201,168,76,0.38)',letterSpacing:'0.38em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif',marginBottom:'1.5rem',transition:'color 0.3s' }}>{col.tag}</p>
                    <span style={{ fontSize:'2rem',display:'block',marginBottom:'1rem',transform:hov?'translateY(-4px)':'none',transition:'transform 0.4s' }}>{col.icon}</span>
                    <h3 style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'1.7rem',fontWeight:300,color:hov?'#fff':'rgba(255,255,255,0.72)',marginBottom:'0.8rem',transition:'color 0.3s' }}>{col.title}</h3>
                    <p style={{ fontSize:'0.6rem',color:hov?'rgba(255,255,255,0.38)':'rgba(255,255,255,0.18)',lineHeight:2,transition:'color 0.4s' }}>{col.desc}</p>
                    <div style={{ marginTop:'1.8rem',display:'flex',alignItems:'center',gap:'0.5rem',opacity:hov?1:0,transform:hov?'translateX(0)':'translateX(-10px)',transition:'all 0.4s' }}>
                      <div style={{ width:'18px',height:'1px',background:'#C9A84C' }} />
                      <span style={{ fontSize:'0.43rem',color:'#C9A84C',letterSpacing:'0.3em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif' }}>Explore</span>
                    </div>
                  </div>
                )}
              </GlassPanel>
            </FloatingSlab>
          ))}
        </div>
      </section>

      {/* ── VALUES ── */}
      <section ref={valRef} style={{ padding:'8rem 3rem 12rem',position:'relative',zIndex:2,maxWidth:'1100px',margin:'0 auto' }}>
        <FloatingSlab driftY={8} delay={0}>
          <div style={{ textAlign:'center',marginBottom:'6rem',opacity:valVis?1:0,transform:valVis?'none':'translateY(30px)',transition:'opacity 0.9s,transform 0.9s' }}>
            <h2 style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(2rem,5vw,3.8rem)',fontWeight:300,color:'rgba(255,255,255,0.88)' }}>Our Values</h2>
            <p style={{ fontSize:'0.58rem',color:'rgba(255,255,255,0.18)',letterSpacing:'0.15em',marginTop:'1rem',fontFamily:'Montserrat,sans-serif',fontWeight:200 }}>What drives every decision we make</p>
          </div>
        </FloatingSlab>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'1.5rem' }}>
          {[
            { title:'Quality',        desc:'Only the finest materials, constructed to outlast trends and time.',  sym:'Ⅰ' },
            { title:'Design',         desc:'Style meets function — every piece is entirely intentional.',          sym:'Ⅱ' },
            { title:'Customer Focus', desc:'You are at the heart of everything we create and do.',                sym:'Ⅲ' },
            { title:'Innovation',     desc:'Always improving, always evolving, never standing still.',            sym:'Ⅳ' },
          ].map((v,i) => (
            <FloatingSlab key={v.title} driftY={8+i*2} driftX={i%2===0?-5:5} driftRot={i%2===0?0.14:-0.14} delay={i*0.4}>
              <GlassPanel index={i} visible={valVis} delay={i*0.14}>
                {(hov) => (
                  <div style={{ padding:'3.5rem 3rem',position:'relative' }}>
                    <div style={{ position:'absolute',bottom:'0.5rem',right:'1.5rem',fontFamily:'Cormorant Garamond,serif',fontSize:'5rem',fontWeight:300,color:hov?'rgba(201,168,76,0.1)':'rgba(201,168,76,0.04)',lineHeight:1,userSelect:'none',pointerEvents:'none',transition:'color 0.4s' }}>{v.sym}</div>
                    <div style={{ width:hov?'50px':'20px',height:'1px',background:'#C9A84C',marginBottom:'2rem',transition:'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
                    <h3 style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'1.8rem',fontWeight:300,color:hov?'#fff':'#C9A84C',marginBottom:'1rem',transition:'color 0.3s' }}>{v.title}</h3>
                    <p style={{ fontSize:'0.64rem',color:hov?'rgba(255,255,255,0.44)':'rgba(255,255,255,0.2)',lineHeight:2.1,letterSpacing:'0.04em',transition:'color 0.4s' }}>{v.desc}</p>
                  </div>
                )}
              </GlassPanel>
            </FloatingSlab>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:'10rem 2rem',position:'relative',zIndex:2,textAlign:'center' }}>
        <FloatingSlab driftY={12} driftX={5} delay={0} style={{ position:'absolute',top:'10%',left:'5%' }}>
          <OrbitRing size="160px" tilt={55} speed={0.1} color="rgba(201,168,76,0.1)" />
        </FloatingSlab>
        <FloatingSlab driftY={10} driftX={-6} delay={2} style={{ position:'absolute',bottom:'10%',right:'5%' }}>
          <OrbitRing size="200px" tilt={40} speed={-0.07} color="rgba(201,168,76,0.08)" />
        </FloatingSlab>
        <FloatingSlab driftY={10} driftX={2} delay={0.5}>
          <div style={{ maxWidth:'750px',margin:'0 auto' }}>
            <p style={{ fontSize:'0.49rem',color:'rgba(201,168,76,0.5)',letterSpacing:'0.5em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif',marginBottom:'2.5rem' }}>Ready to Explore?</p>
            <p style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(1.8rem,4.5vw,3.2rem)',fontWeight:300,fontStyle:'italic',color:'rgba(255,255,255,0.8)',lineHeight:1.7,marginBottom:'3.5rem' }}>
              "Premium clothing that combines{' '}<span style={{ color:'#C9A84C',fontStyle:'normal' }}>elegance with comfort</span>, designed for those who live without compromise."
            </p>
            <div style={{ display:'flex',gap:'1.4rem',justifyContent:'center',flexWrap:'wrap' }}>
              <Link href="/shop" className="rr-btn-primary">Shop the Collection</Link>
              <Link href="/contact" className="rr-btn-ghost">Get in Touch</Link>
            </div>
          </div>
        </FloatingSlab>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap');
        * { cursor: none !important; }
        html { scroll-behavior: smooth; }
        @keyframes aboutPulse {
          0%,100% { opacity:0.8; transform:scaleY(1); }
          50%      { opacity:0.12; transform:scaleY(0.2); }
        }
        .rr-btn-primary {
          display:inline-block; padding:1.1rem 3rem;
          background:#C9A84C; color:#06040a;
          font-family:'Montserrat',sans-serif; font-size:0.56rem; font-weight:500;
          letter-spacing:0.4em; text-transform:uppercase; text-decoration:none;
          position:relative; overflow:hidden;
          transition:transform 0.35s cubic-bezier(0.16,1,0.3,1),box-shadow 0.35s;
          box-shadow:0 8px 40px rgba(201,168,76,0.25);
        }
        .rr-btn-primary::before { content:''; position:absolute; inset:0; background:#EDD070; transform:translateX(-101%); transition:transform 0.55s cubic-bezier(0.16,1,0.3,1); }
        .rr-btn-primary:hover::before { transform:translateX(0); }
        .rr-btn-primary:hover { transform:translateY(-5px); box-shadow:0 25px 60px rgba(201,168,76,0.4); }
        .rr-btn-ghost {
          display:inline-block; padding:1.1rem 3rem;
          border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.45);
          font-family:'Montserrat',sans-serif; font-size:0.56rem; font-weight:300;
          letter-spacing:0.4em; text-transform:uppercase; text-decoration:none;
          position:relative; overflow:hidden;
          transition:border-color 0.4s,color 0.4s,transform 0.35s cubic-bezier(0.16,1,0.3,1);
          backdrop-filter:blur(12px);
        }
        .rr-btn-ghost:hover { border-color:rgba(201,168,76,0.5); color:#C9A84C; transform:translateY(-5px); }
        @media (max-width:640px) {
          div[style*="grid-template-columns: repeat(2, 1fr)"] { grid-template-columns:1fr !important; }
          div[style*="grid-template-columns: auto 1fr"],
          div[style*="grid-template-columns: 1fr auto"] { grid-template-columns:1fr !important; }
        }
      `}</style>
    </div>
  );
}