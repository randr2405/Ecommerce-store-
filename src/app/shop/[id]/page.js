'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import toast from 'react-hot-toast';
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

  const isMobile = typeof window !== 'undefined'
    ? (() => {
        const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        return (hasTouchScreen && isSmallScreen) || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
      })()
    : false;

  const constants = useRef({ borderWidth: 3, cornerSize: 12 }).current;

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

export default function ProductPage({ params }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productName = decodeURIComponent(params.id);
        const q = query(collection(db, 'products'), where('name', '==', productName));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          setProduct({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [params.id]);

  const availableSizes = product?.sizes
    ? Object.entries(product.sizes).filter(([, qty]) => qty > 0).map(([size]) => size)
    : [];

  const addToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingIndex = cart.findIndex(item => item.id === product.id && item.size === selectedSize);
    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        size: selectedSize,
        quantity,
        sku: product.sku,
      });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    toast.success(`${product.name} added to cart`);
  };

  if (loading) return (
    <div style={{ paddingTop: '70px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040302' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '1px', background: '#C9A84C', margin: '0 auto 1.5rem', animation: 'loadPulse 1.5s ease-in-out infinite' }} />
        <p style={{ fontSize: '0.65rem', color: '#555', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>Loading</p>
      </div>
      <style>{`@keyframes loadPulse { 0%,100%{width:40px;opacity:0.4} 50%{width:80px;opacity:1} }`}</style>
    </div>
  );

  if (!product) return (
    <div style={{ paddingTop: '70px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040302' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '1px', background: '#C9A84C', margin: '0 auto 2rem' }} />
        <h2 style={{ color: '#F5F0E8', marginBottom: '0.5rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: '2rem' }}>Product not found</h2>
        <p style={{ fontSize: '0.65rem', color: '#555', letterSpacing: '0.2em', marginBottom: '2rem', fontFamily: 'Montserrat, sans-serif' }}>This item may no longer be available</p>
        <Link href="/shop" style={{ display: 'inline-block', padding: '0.9rem 2.2rem', border: '1px solid rgba(201,168,76,0.7)', color: '#C9A84C', fontFamily: 'Montserrat, sans-serif', fontSize: '0.57rem', fontWeight: 300, letterSpacing: '0.35em', textTransform: 'uppercase', textDecoration: 'none' }}>
          Back to Shop
        </Link>
      </div>
    </div>
  );

  return (
    <ClickSpark sparkColor="#C9A84C" sparkSize={7} sparkRadius={14} sparkCount={8} duration={400}>
      <div style={{ paddingTop: '70px', background: '#040302', minHeight: '100vh' }}>

        {!isMobile && (
          <TargetCursor
            targetSelector="a, button"
            spinDuration={2.4}
            hideDefaultCursor={true}
            hoverDuration={0.18}
            parallaxOn={true}
          />
        )}

        <section style={{ padding: isMobile ? '2rem 1rem 4rem' : '4rem 2rem 6rem', maxWidth: '1100px', margin: '0 auto' }}>

          <div style={{ marginBottom: isMobile ? '1.5rem' : '3rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link
              href="/shop"
              style={{ fontSize: '0.65rem', color: '#666', textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', transition: 'color 0.3s' }}
              onMouseEnter={e => e.target.style.color = '#C9A84C'}
              onMouseLeave={e => e.target.style.color = '#666'}
            >
              Shop
            </Link>
            <span style={{ color: '#333', fontSize: '0.65rem' }}>→</span>
            <span style={{ fontSize: '0.65rem', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>
              {product.name}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '2rem' : '5rem',
            alignItems: 'start',
          }}>

            <div style={{
              background: '#0A0A0A',
              border: '1px solid rgba(201,168,76,0.12)',
              overflow: 'hidden',
              aspectRatio: '3/4',
              position: 'relative',
            }}>
              {!imgLoaded && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '30px', height: '1px', background: '#C9A84C', animation: 'loadPulse 1.5s ease-in-out infinite' }} />
                </div>
              )}
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  onLoad={() => setImgLoaded(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.6s ease' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: '0.6rem', color: '#333', letterSpacing: '0.25em', fontFamily: 'Montserrat, sans-serif' }}>NO IMAGE</p>
                </div>
              )}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4) 50%, transparent)', pointerEvents: 'none' }} />
            </div>

            <div style={{ paddingTop: isMobile ? '0' : '1rem' }}>
              {product.sku && (
                <p style={{ fontSize: '0.58rem', color: '#444', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem', fontFamily: 'Montserrat, sans-serif' }}>
                  SKU: {product.sku}
                </p>
              )}

              <h1 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: isMobile ? 'clamp(1.8rem, 8vw, 2.5rem)' : 'clamp(1.8rem, 4vw, 2.8rem)',
                color: '#F5F0E8',
                marginBottom: '0.5rem',
                lineHeight: 1.15,
                fontWeight: 300,
              }}>
                {product.name}
              </h1>

              <div style={{ width: '40px', height: '1px', background: '#C9A84C', margin: '1.5rem 0' }} />

              <p style={{
                fontSize: isMobile ? '1.6rem' : '1.8rem',
                color: '#C9A84C',
                fontFamily: 'Cormorant Garamond, serif',
                marginBottom: '1.5rem',
              }}>
                R {Number(product.price).toFixed(2)}
              </p>

              {product.description && (
                <p style={{
                  fontSize: '0.82rem',
                  color: '#777',
                  lineHeight: 1.9,
                  marginBottom: '2rem',
                  letterSpacing: '0.03em',
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 300,
                }}>
                  {product.description}
                </p>
              )}

              {availableSizes.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
                    Select Size {selectedSize && <span style={{ color: '#666' }}>— {selectedSize}</span>}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {availableSizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        style={{
                          minWidth: isMobile ? '44px' : '48px',
                          height: isMobile ? '44px' : '48px',
                          padding: '0 0.75rem',
                          fontSize: '0.72rem',
                          letterSpacing: '0.1em',
                          fontFamily: 'Montserrat, sans-serif',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: selectedSize === size ? '#C9A84C' : 'transparent',
                          color: selectedSize === size ? '#0A0A0A' : '#777',
                          border: '1px solid',
                          borderColor: selectedSize === size ? '#C9A84C' : 'rgba(201,168,76,0.18)',
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '2rem' }}>
                <p style={{ fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
                  Quantity
                </p>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    style={{
                      width: isMobile ? '44px' : '42px',
                      height: isMobile ? '44px' : '42px',
                      background: 'transparent',
                      border: '1px solid rgba(201,168,76,0.18)',
                      color: '#777',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      transition: 'border-color 0.2s, color 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.color = '#C9A84C'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)'; e.currentTarget.style.color = '#777'; }}
                  >−</button>
                  <div style={{
                    width: isMobile ? '56px' : '60px',
                    height: isMobile ? '44px' : '42px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid rgba(201,168,76,0.18)', borderLeft: 'none', borderRight: 'none',
                    fontSize: '0.85rem', color: '#F5F0E8', fontFamily: 'Montserrat, sans-serif',
                  }}>
                    {quantity}
                  </div>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    style={{
                      width: isMobile ? '44px' : '42px',
                      height: isMobile ? '44px' : '42px',
                      background: 'transparent',
                      border: '1px solid rgba(201,168,76,0.18)',
                      color: '#777',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      transition: 'border-color 0.2s, color 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.color = '#C9A84C'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)'; e.currentTarget.style.color = '#777'; }}
                  >+</button>
                </div>
              </div>

              <button
                onClick={addToCart}
                style={{
                  width: '100%',
                  padding: isMobile ? '1rem' : '1.1rem 2rem',
                  background: '#C9A84C',
                  color: '#080604',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  letterSpacing: '0.38em',
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s',
                  boxShadow: '0 8px 40px rgba(201,168,76,0.25)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 50px rgba(201,168,76,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(201,168,76,0.25)'; }}
              >
                Add to Cart
              </button>

              <p style={{ fontSize: '0.65rem', color: '#444', marginTop: '1rem', letterSpacing: '0.08em', fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}>
                {product.stock > 0 ? `${product.stock} items in stock` : 'Out of stock'}
              </p>

              <div style={{ borderTop: '1px solid rgba(201,168,76,0.08)', marginTop: '2rem', paddingTop: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <Link
                  href="/returns"
                  style={{ fontSize: '0.65rem', color: '#555', textDecoration: 'none', letterSpacing: '0.1em', fontFamily: 'Montserrat, sans-serif', fontWeight: 300, transition: 'color 0.3s' }}
                  onMouseEnter={e => e.target.style.color = '#C9A84C'}
                  onMouseLeave={e => e.target.style.color = '#555'}
                >
                  30-Day Returns Policy →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@200;300;400;500;600&display=swap');

          @media (min-width: 769px) { * { cursor: none !important; } }

          .tc-wrapper { position: fixed; top: 0; left: 0; width: 0; height: 0; pointer-events: none; z-index: 99999; will-change: transform; }
          .tc-dot { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: #C9A84C; top: 50%; left: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 8px rgba(201,168,76,0.8), 0 0 16px rgba(201,168,76,0.4); }
          .tc-corner { position: absolute; width: 12px; height: 12px; border-color: #C9A84C; border-style: solid; border-width: 0; will-change: transform; filter: drop-shadow(0 0 4px rgba(201,168,76,0.6)); }
          .tc-tl { border-top-width: 2px; border-left-width: 2px; transform: translate(-18px, -18px); }
          .tc-tr { border-top-width: 2px; border-right-width: 2px; transform: translate(6px, -18px); }
          .tc-br { border-bottom-width: 2px; border-right-width: 2px; transform: translate(6px, 6px); }
          .tc-bl { border-bottom-width: 2px; border-left-width: 2px; transform: translate(-18px, 6px); }

          @keyframes loadPulse { 0%,100%{width:30px;opacity:0.4} 50%{width:70px;opacity:1} }

          @keyframes sparkFly {
            0% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
            100% { transform: translate(calc(-50% + cos(var(--angle)) * var(--radius) * 3), calc(-50% + sin(var(--angle)) * var(--radius) * 3)) scale(0); opacity: 0; }
          }

          @media (max-width: 768px) {
            * { box-sizing: border-box; }
          }
        `}</style>
      </div>
    </ClickSpark>
  );
}