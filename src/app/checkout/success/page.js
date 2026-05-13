'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import gsap from 'gsap';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

function ClickSpark({ children, sparkColor = '#C9A84C', sparkSize = 8, sparkRadius = 14, sparkCount = 8, duration = 400 }) {
  const [sparks, setSparks] = useState([]);
  const handleClick = useCallback((e) => {
    const id = Date.now() + Math.random();
    const newSparks = Array.from({ length: sparkCount }, (_, i) => ({
      id: id + i, x: e.clientX, y: e.clientY, angle: (360 / sparkCount) * i,
    }));
    setSparks(prev => [...prev, ...newSparks]);
    setTimeout(() => setSparks(prev => prev.filter(s => !newSparks.find(ns => ns.id === s.id))), duration);
  }, [sparkCount, duration]);
  return (
    <div onClick={handleClick} style={{ position: 'relative' }}>
      {children}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999 }}>
        {sparks.map(spark => (
          <div key={spark.id} style={{
            position: 'absolute', left: spark.x, top: spark.y,
            width: sparkSize, height: sparkSize, borderRadius: '50%',
            background: sparkColor, transform: 'translate(-50%, -50%)',
            animation: `sparkFly ${duration}ms ease-out forwards`,
            '--angle': `${spark.angle}deg`, '--radius': `${sparkRadius}px`,
          }} />
        ))}
      </div>
    </div>
  );
}

function TargetCursor({ targetSelector = 'a, button', spinDuration = 2, hideDefaultCursor = true, hoverDuration = 0.2, parallaxOn = true }) {
  const cursorRef = useRef(null);
  const cornersRef = useRef(null);
  const spinTl = useRef(null);
  const dotRef = useRef(null);
  const isActiveRef = useRef(false);
  const targetCornerPositionsRef = useRef(null);
  const tickerFnRef = useRef(null);
  const activeStrengthRef = useRef(0);

  const isMobile = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return (hasTouchScreen && isSmallScreen) || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
  }, []);

  const constants = React.useMemo(() => ({ borderWidth: 3, cornerSize: 12 }), []);

  const moveCursor = useCallback((x, y) => {
    if (!cursorRef.current) return;
    gsap.to(cursorRef.current, { x, y, duration: 0.1, ease: 'power3.out' });
  }, []);

  useEffect(() => {
    if (isMobile || !cursorRef.current) return;
    const originalCursor = document.body.style.cursor;
    if (hideDefaultCursor) document.body.style.cursor = 'none';
    const cursor = cursorRef.current;
    cornersRef.current = cursor.querySelectorAll('.tc-corner');
    let activeTarget = null;
    let currentLeaveHandler = null;
    let resumeTimeout = null;
    const cleanupTarget = target => {
      if (currentLeaveHandler) target.removeEventListener('mouseleave', currentLeaveHandler);
      currentLeaveHandler = null;
    };
    gsap.set(cursor, { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const createSpinTimeline = () => {
      if (spinTl.current) spinTl.current.kill();
      spinTl.current = gsap.timeline({ repeat: -1 }).to(cursor, { rotation: '+=360', duration: spinDuration, ease: 'none' });
    };
    createSpinTimeline();
    const tickerFn = () => {
      if (!targetCornerPositionsRef.current || !cursorRef.current || !cornersRef.current) return;
      const strength = activeStrengthRef.current;
      if (strength === 0) return;
      const cursorX = gsap.getProperty(cursorRef.current, 'x');
      const cursorY = gsap.getProperty(cursorRef.current, 'y');
      Array.from(cornersRef.current).forEach((corner, i) => {
        const currentX = gsap.getProperty(corner, 'x');
        const currentY = gsap.getProperty(corner, 'y');
        const targetX = targetCornerPositionsRef.current[i].x - cursorX;
        const targetY = targetCornerPositionsRef.current[i].y - cursorY;
        const finalX = currentX + (targetX - currentX) * strength;
        const finalY = currentY + (targetY - currentY) * strength;
        const duration = strength >= 0.99 ? (parallaxOn ? 0.2 : 0) : 0.05;
        gsap.to(corner, { x: finalX, y: finalY, duration, ease: duration === 0 ? 'none' : 'power1.out', overwrite: 'auto' });
      });
    };
    tickerFnRef.current = tickerFn;
    const moveHandler = e => moveCursor(e.clientX, e.clientY);
    window.addEventListener('mousemove', moveHandler);
    const scrollHandler = () => {
      if (!activeTarget || !cursorRef.current) return;
      const mouseX = gsap.getProperty(cursorRef.current, 'x');
      const mouseY = gsap.getProperty(cursorRef.current, 'y');
      const el = document.elementFromPoint(mouseX, mouseY);
      const stillOver = el && (el === activeTarget || el.closest(targetSelector) === activeTarget);
      if (!stillOver && currentLeaveHandler) currentLeaveHandler();
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });
    const mouseDownHandler = () => {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 0.7, duration: 0.3 });
      gsap.to(cursorRef.current, { scale: 0.9, duration: 0.2 });
    };
    const mouseUpHandler = () => {
      if (!dotRef.current) return;
      gsap.to(dotRef.current, { scale: 1, duration: 0.3 });
      gsap.to(cursorRef.current, { scale: 1, duration: 0.2 });
    };
    window.addEventListener('mousedown', mouseDownHandler);
    window.addEventListener('mouseup', mouseUpHandler);
    const enterHandler = e => {
      let current = e.target;
      let target = null;
      while (current && current !== document.body) {
        if (current.matches && current.matches(targetSelector)) { target = current; break; }
        current = current.parentElement;
      }
      if (!target || !cursorRef.current || !cornersRef.current) return;
      if (activeTarget === target) return;
      if (activeTarget) cleanupTarget(activeTarget);
      if (resumeTimeout) { clearTimeout(resumeTimeout); resumeTimeout = null; }
      activeTarget = target;
      const corners = Array.from(cornersRef.current);
      corners.forEach(corner => gsap.killTweensOf(corner));
      gsap.killTweensOf(cursorRef.current, 'rotation');
      spinTl.current?.pause();
      gsap.set(cursorRef.current, { rotation: 0 });
      const rect = target.getBoundingClientRect();
      const { borderWidth, cornerSize } = constants;
      const cursorX = gsap.getProperty(cursorRef.current, 'x');
      const cursorY = gsap.getProperty(cursorRef.current, 'y');
      targetCornerPositionsRef.current = [
        { x: rect.left - borderWidth, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.bottom + borderWidth - cornerSize },
        { x: rect.left - borderWidth, y: rect.bottom + borderWidth - cornerSize },
      ];
      isActiveRef.current = true;
      gsap.ticker.add(tickerFnRef.current);
      gsap.to(activeStrengthRef, { current: 1, duration: hoverDuration, ease: 'power2.out' });
      corners.forEach((corner, i) => {
        gsap.to(corner, { x: targetCornerPositionsRef.current[i].x - cursorX, y: targetCornerPositionsRef.current[i].y - cursorY, duration: 0.2, ease: 'power2.out' });
      });
      const leaveHandler = () => {
        gsap.ticker.remove(tickerFnRef.current);
        isActiveRef.current = false;
        targetCornerPositionsRef.current = null;
        gsap.set(activeStrengthRef, { current: 0, overwrite: true });
        activeTarget = null;
        if (cornersRef.current) {
          const cs = Array.from(cornersRef.current);
          gsap.killTweensOf(cs);
          const { cornerSize } = constants;
          const positions = [
            { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
            { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
            { x: cornerSize * 0.5, y: cornerSize * 0.5 },
            { x: -cornerSize * 1.5, y: cornerSize * 0.5 },
          ];
          const tl = gsap.timeline();
          cs.forEach((corner, idx) => tl.to(corner, { x: positions[idx].x, y: positions[idx].y, duration: 0.3, ease: 'power3.out' }, 0));
        }
        resumeTimeout = setTimeout(() => {
          if (!activeTarget && cursorRef.current && spinTl.current) {
            const norm = gsap.getProperty(cursorRef.current, 'rotation') % 360;
            spinTl.current.kill();
            spinTl.current = gsap.timeline({ repeat: -1 }).to(cursorRef.current, { rotation: '+=360', duration: spinDuration, ease: 'none' });
            gsap.to(cursorRef.current, { rotation: norm + 360, duration: spinDuration * (1 - norm / 360), ease: 'none', onComplete: () => spinTl.current?.restart() });
          }
          resumeTimeout = null;
        }, 50);
        cleanupTarget(target);
      };
      currentLeaveHandler = leaveHandler;
      target.addEventListener('mouseleave', leaveHandler);
    };
    window.addEventListener('mouseover', enterHandler, { passive: true });
    return () => {
      if (tickerFnRef.current) gsap.ticker.remove(tickerFnRef.current);
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseover', enterHandler);
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('mousedown', mouseDownHandler);
      window.removeEventListener('mouseup', mouseUpHandler);
      if (activeTarget) cleanupTarget(activeTarget);
      spinTl.current?.kill();
      document.body.style.cursor = originalCursor;
      isActiveRef.current = false;
      targetCornerPositionsRef.current = null;
      activeStrengthRef.current = 0;
    };
  }, [targetSelector, spinDuration, moveCursor, constants, hideDefaultCursor, isMobile, hoverDuration, parallaxOn]);

  if (isMobile) return null;

  return (
    <div ref={cursorRef} className="tc-wrapper">
      <div ref={dotRef} className="tc-dot" />
      <div className="tc-corner tc-tl" />
      <div className="tc-corner tc-tr" />
      <div className="tc-corner tc-br" />
      <div className="tc-corner tc-bl" />
    </div>
  );
}

export default function CheckoutSuccessPage() {
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    localStorage.removeItem('cart');
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <ClickSpark sparkColor="#C9A84C" sparkSize={7} sparkRadius={14} sparkCount={8} duration={400}>
      <div style={{ paddingTop: '70px', background: '#040302', minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>

        {!isMobile && (
          <TargetCursor
            targetSelector="a, button"
            spinDuration={2.4}
            hideDefaultCursor={true}
            hoverDuration={0.18}
            parallaxOn={true}
          />
        )}

        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)', backgroundSize: '88px 88px', opacity: 0.5, pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: isMobile ? '300px' : '600px', height: isMobile ? '300px' : '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.02) 40%, transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'successBloom 4s ease-in-out infinite alternate' }} />

        <div style={{
          textAlign: 'center',
          maxWidth: isMobile ? '90vw' : '580px',
          width: '100%',
          padding: isMobile ? '2rem 1.2rem' : '4rem 3rem',
          position: 'relative',
          zIndex: 2,
          background: 'linear-gradient(135deg, rgba(10,8,3,0.92) 0%, rgba(18,13,4,0.92) 100%)',
          border: '1px solid rgba(201,168,76,0.15)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(201,168,76,0.05), inset 0 1px 0 rgba(201,168,76,0.1)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 1s cubic-bezier(0.16,1,0.3,1) 0.1s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.1s',
        }}>

          {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h], ci) => (
            <div key={ci} style={{
              position: 'absolute', [v]: 0, [h]: 0,
              width: '28px', height: '28px',
              borderTop: v === 'top' ? '1px solid rgba(201,168,76,0.5)' : 'none',
              borderBottom: v === 'bottom' ? '1px solid rgba(201,168,76,0.5)' : 'none',
              borderLeft: h === 'left' ? '1px solid rgba(201,168,76,0.5)' : 'none',
              borderRight: h === 'right' ? '1px solid rgba(201,168,76,0.5)' : 'none',
            }} />
          ))}

          <div style={{
            width: isMobile ? '52px' : '64px',
            height: isMobile ? '52px' : '64px',
            borderRadius: '50%',
            border: '1px solid rgba(201,168,76,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.8rem',
            background: 'rgba(201,168,76,0.06)',
            boxShadow: '0 0 30px rgba(201,168,76,0.15)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'scale(1)' : 'scale(0.7)',
            transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s',
          }}>
            <svg width={isMobile ? '22' : '28'} height={isMobile ? '22' : '28'} viewBox="0 0 28 28" fill="none">
              <path d="M5 14.5L11 20.5L23 8" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <p style={{
            fontSize: '0.5rem', color: '#C9A84C', letterSpacing: '0.5em', textTransform: 'uppercase',
            marginBottom: '0.8rem', fontFamily: 'Montserrat, sans-serif',
            opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease 0.55s',
          }}>Payment Received</p>

          <h1 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: isMobile ? 'clamp(2rem, 10vw, 2.8rem)' : 'clamp(2.4rem, 5vw, 3.4rem)',
            fontWeight: 300, color: '#F5F0E8',
            marginBottom: '0', lineHeight: 1.1,
            opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease 0.65s',
          }}>Order Confirmed</h1>

          <div style={{
            width: visible ? '70px' : '0px', height: '1px',
            background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
            margin: '1.6rem auto',
            transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1) 0.85s',
          }} />

          <p style={{
            fontSize: isMobile ? '0.72rem' : '0.8rem',
            color: 'rgba(180,160,100,0.65)',
            lineHeight: 1.9,
            marginBottom: isMobile ? '2rem' : '2.8rem',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 300,
            letterSpacing: '0.03em',
            opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease 0.95s',
          }}>
            Thank you for your purchase. We've received your order and will be in touch shortly at the email address you provided.
          </p>

          <div style={{
            display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap',
            opacity: visible ? 1 : 0,
            transform: visible ? 'none' : 'translateY(12px)',
            transition: 'opacity 0.8s ease 1.1s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 1.1s',
          }}>
            <Link href="/shop" className="rr-btn-primary">Continue Shopping</Link>
            <Link href="/contact" className="rr-btn-outline">Contact Us</Link>
          </div>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Montserrat:wght@200;300;400;500&display=swap');

          @media (min-width: 769px) { * { cursor: none !important; } }

          .tc-wrapper { position: fixed; top: 0; left: 0; width: 0; height: 0; pointer-events: none; z-index: 99999; will-change: transform; }
          .tc-dot { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: #C9A84C; top: 50%; left: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 8px rgba(201,168,76,0.8), 0 0 16px rgba(201,168,76,0.4); }
          .tc-corner { position: absolute; width: 12px; height: 12px; border-color: #C9A84C; border-style: solid; border-width: 0; will-change: transform; filter: drop-shadow(0 0 4px rgba(201,168,76,0.6)); }
          .tc-tl { border-top-width: 2px; border-left-width: 2px; transform: translate(-18px, -18px); }
          .tc-tr { border-top-width: 2px; border-right-width: 2px; transform: translate(6px, -18px); }
          .tc-br { border-bottom-width: 2px; border-right-width: 2px; transform: translate(6px, 6px); }
          .tc-bl { border-bottom-width: 2px; border-left-width: 2px; transform: translate(-18px, 6px); }

          @keyframes successBloom { from { opacity: 0.5; transform: translate(-50%,-50%) scale(0.95); } to { opacity: 1; transform: translate(-50%,-50%) scale(1.05); } }

          @keyframes sparkFly {
            0% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
            100% { transform: translate(calc(-50% + cos(var(--angle)) * var(--radius) * 3), calc(-50% + sin(var(--angle)) * var(--radius) * 3)) scale(0); opacity: 0; }
          }

          .rr-btn-primary { display: inline-block; padding: 1rem 2.4rem; background: #C9A84C; color: #080604; font-family: 'Montserrat', sans-serif; font-size: 0.57rem; font-weight: 600; letter-spacing: 0.4em; text-transform: uppercase; text-decoration: none; position: relative; overflow: hidden; transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s; box-shadow: 0 8px 40px rgba(201,168,76,0.3); white-space: nowrap; }
          .rr-btn-primary::before { content: ''; position: absolute; inset: 0; background: #EDD070; transform: translateX(-101%); transition: transform 0.55s cubic-bezier(0.16,1,0.3,1); }
          .rr-btn-primary:hover::before { transform: translateX(0); }
          .rr-btn-primary:hover { transform: translateY(-5px); box-shadow: 0 25px 60px rgba(201,168,76,0.35); }

          .rr-btn-outline { display: inline-block; padding: 1rem 2.4rem; border: 1px solid rgba(201,168,76,0.7); color: #C9A84C; font-family: 'Montserrat', sans-serif; font-size: 0.57rem; font-weight: 300; letter-spacing: 0.4em; text-transform: uppercase; text-decoration: none; position: relative; overflow: hidden; transition: border-color 0.4s, transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s; white-space: nowrap; }
          .rr-btn-outline::before { content: ''; position: absolute; inset: 0; background: rgba(201,168,76,0.08); transform: scaleX(0); transform-origin: left; transition: transform 0.55s cubic-bezier(0.16,1,0.3,1); }
          .rr-btn-outline:hover::before { transform: scaleX(1); }
          .rr-btn-outline:hover { border-color: #C9A84C; transform: translateY(-5px); box-shadow: 0 20px 50px rgba(201,168,76,0.15); }

          @media (max-width: 768px) { .rr-btn-primary, .rr-btn-outline { padding: 0.9rem 1.8rem; font-size: 0.54rem; letter-spacing: 0.2em; } }
          @media (max-width: 480px) { .rr-btn-primary, .rr-btn-outline { padding: 0.8rem 1.4rem; font-size: 0.5rem; letter-spacing: 0.18em; } }
        `}</style>
      </div>
    </ClickSpark>
  );
}