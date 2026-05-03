'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Renderer, Triangle, Program, Mesh } from 'ogl';

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

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return (hasTouchScreen && isSmallScreen) || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
  }, []);

  const constants = useMemo(() => ({ borderWidth: 3, cornerSize: 12 }), []);

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

function GooeyNav({ items, initialActiveIndex = 0 }) {
  const [active, setActive] = useState(initialActiveIndex);
  const [particles, setParticles] = useState([]);
  const colors = ['#C9A84C', '#8B6914', '#EDD070', '#A07828'];
  const handleClick = (index) => {
    if (index === active) return;
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i, color: colors[i % colors.length],
      x: Math.random() * 60 - 30, y: Math.random() * 40 - 20, size: 4 + Math.random() * 6,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 600);
    setActive(index);
  };
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '70px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 3rem', background: 'rgba(4,3,2,0.92)',
      backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.12)', zIndex: 1000,
    }}>
      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 300, color: '#C9A84C', letterSpacing: '0.08em' }}>R&amp;R</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
        {items.map((item, i) => (
          <Link key={item.label} href={item.href} onClick={() => handleClick(i)} style={{
            position: 'relative', padding: '0.6rem 1.2rem', fontSize: '0.52rem',
            fontFamily: 'Montserrat, sans-serif', fontWeight: active === i ? 500 : 300,
            letterSpacing: '0.3em', textTransform: 'uppercase',
            color: active === i ? '#080604' : 'rgba(201,168,76,0.6)', textDecoration: 'none',
            transition: 'color 0.3s', zIndex: 1,
          }}>
            {active === i && <span style={{ position: 'absolute', inset: 0, background: '#C9A84C', borderRadius: '2px', zIndex: -1, animation: 'navPillIn 0.35s cubic-bezier(0.16,1,0.3,1)' }} />}
            {item.label}
            {active === i && particles.map(p => (
              <span key={p.id} style={{
                position: 'absolute', left: '50%', top: '50%',
                width: p.size, height: p.size, borderRadius: '50%', background: p.color,
                transform: `translate(${p.x}px, ${p.y}px)`,
                animation: 'particlePop 0.6s ease-out forwards', pointerEvents: 'none', zIndex: 10,
              }} />
            ))}
          </Link>
        ))}
      </div>
      <Link href="/shop" style={{
        fontSize: '0.48rem', fontFamily: 'Montserrat, sans-serif', fontWeight: 400,
        letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C9A84C', textDecoration: 'none',
        border: '1px solid rgba(201,168,76,0.4)', padding: '0.5rem 1.1rem', transition: 'all 0.3s',
      }}>Shop</Link>
    </nav>
  );
}


function AntigravityInner({ count = 300, magnetRadius = 6, ringRadius = 7, waveSpeed = 0.4, waveAmplitude = 1, particleSize = 1.5, lerpSpeed = 0.05, color = '#C9A84C', autoAnimate = false, particleVariance = 1, rotationSpeed = 0, depthFactor = 1, pulseSpeed = 3, particleShape = 'capsule', fieldStrength = 10 }) {
  const meshRef = useRef(null);
  const { viewport } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastMouseMoveTime = useRef(0);
  const virtualMouse = useRef({ x: 0, y: 0 });
  const particles = useMemo(() => {
    const temp = [];
    const width = viewport.width || 100;
    const height = viewport.height || 100;
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const xFactor = -50 + Math.random() * 100;
      const yFactor = -50 + Math.random() * 100;
      const zFactor = -50 + Math.random() * 100;
      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;
      const z = (Math.random() - 0.5) * 20;
      const randomRadiusOffset = (Math.random() - 0.5) * 2;
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: x, my: y, mz: z, cx: x, cy: y, cz: z, vx: 0, vy: 0, vz: 0, randomRadiusOffset });
    }
    return temp;
  }, [count, viewport.width, viewport.height]);
  useFrame(state => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { viewport: v, pointer: m } = state;
    const mouseDist = Math.sqrt(Math.pow(m.x - lastMousePos.current.x, 2) + Math.pow(m.y - lastMousePos.current.y, 2));
    if (mouseDist > 0.001) { lastMouseMoveTime.current = Date.now(); lastMousePos.current = { x: m.x, y: m.y }; }
    let destX = (m.x * v.width) / 2;
    let destY = (m.y * v.height) / 2;
    if (autoAnimate && Date.now() - lastMouseMoveTime.current > 2000) {
      const time = state.clock.getElapsedTime();
      destX = Math.sin(time * 0.5) * (v.width / 4);
      destY = Math.cos(time * 0.5 * 2) * (v.height / 4);
    }
    virtualMouse.current.x += (destX - virtualMouse.current.x) * 0.05;
    virtualMouse.current.y += (destY - virtualMouse.current.y) * 0.05;
    const targetX = virtualMouse.current.x;
    const targetY = virtualMouse.current.y;
    const globalRotation = state.clock.getElapsedTime() * rotationSpeed;
    particles.forEach((particle, i) => {
      let { t, speed, mx, my, mz, cz, randomRadiusOffset } = particle;
      t = particle.t += speed / 2;
      const projectionFactor = 1 - cz / 50;
      const projectedTargetX = targetX * projectionFactor;
      const projectedTargetY = targetY * projectionFactor;
      const dx = mx - projectedTargetX;
      const dy = my - projectedTargetY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let targetPos = { x: mx, y: my, z: mz * depthFactor };
      if (dist < magnetRadius) {
        const angle = Math.atan2(dy, dx) + globalRotation;
        const wave = Math.sin(t * waveSpeed + angle) * (0.5 * waveAmplitude);
        const deviation = randomRadiusOffset * (5 / (fieldStrength + 0.1));
        const currentRingRadius = ringRadius + wave + deviation;
        targetPos.x = projectedTargetX + currentRingRadius * Math.cos(angle);
        targetPos.y = projectedTargetY + currentRingRadius * Math.sin(angle);
        targetPos.z = mz * depthFactor + Math.sin(t) * (1 * waveAmplitude * depthFactor);
      }
      particle.cx += (targetPos.x - particle.cx) * lerpSpeed;
      particle.cy += (targetPos.y - particle.cy) * lerpSpeed;
      particle.cz += (targetPos.z - particle.cz) * lerpSpeed;
      dummy.position.set(particle.cx, particle.cy, particle.cz);
      dummy.lookAt(projectedTargetX, projectedTargetY, particle.cz);
      dummy.rotateX(Math.PI / 2);
      const currentDistToMouse = Math.sqrt(Math.pow(particle.cx - projectedTargetX, 2) + Math.pow(particle.cy - projectedTargetY, 2));
      const distFromRing = Math.abs(currentDistToMouse - ringRadius);
      let scaleFactor = Math.max(0, Math.min(1, 1 - distFromRing / 10));
      const finalScale = scaleFactor * (0.8 + Math.sin(t * pulseSpeed) * 0.2 * particleVariance) * particleSize;
      dummy.scale.set(finalScale, finalScale, finalScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {particleShape === 'capsule' && <capsuleGeometry args={[0.1, 0.4, 4, 8]} />}
      {particleShape === 'sphere' && <sphereGeometry args={[0.2, 16, 16]} />}
      {particleShape === 'box' && <boxGeometry args={[0.3, 0.3, 0.3]} />}
      {particleShape === 'tetrahedron' && <tetrahedronGeometry args={[0.3]} />}
      <meshBasicMaterial color={color} />
    </instancedMesh>
  );
}

function AntigravityCanvas(props) {
  return (
    <Canvas camera={{ position: [0, 0, 50], fov: 35 }}>
      <AntigravityInner {...props} />
    </Canvas>
  );
}

function LiquidChrome({ baseColor = [0.1, 0.1, 0.1], speed = 0.2, amplitude = 0.3, frequencyX = 3, frequencyY = 3, interactive = true }) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const renderer = new Renderer({ antialias: true });
    const gl = renderer.gl;
    gl.clearColor(1, 1, 1, 1);
    const vertexShader = `
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    const fragmentShader = `
      precision highp float;
      uniform float uTime;
      uniform vec3 uResolution;
      uniform vec3 uBaseColor;
      uniform float uAmplitude;
      uniform float uFrequencyX;
      uniform float uFrequencyY;
      uniform vec2 uMouse;
      varying vec2 vUv;
      vec4 renderImage(vec2 uvCoord) {
          vec2 fragCoord = uvCoord * uResolution.xy;
          vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);
          for (float i = 1.0; i < 10.0; i++){
              uv.x += uAmplitude / i * cos(i * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159);
              uv.y += uAmplitude / i * cos(i * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159);
          }
          vec2 diff = (uvCoord - uMouse);
          float dist = length(diff);
          float falloff = exp(-dist * 20.0);
          float ripple = sin(10.0 * dist - uTime * 2.0) * 0.03;
          uv += (diff / (dist + 0.0001)) * ripple * falloff;
          vec3 color = uBaseColor / abs(sin(uTime - uv.y - uv.x));
          return vec4(color, 1.0);
      }
      void main() {
          vec4 col = vec4(0.0);
          int samples = 0;
          for (int i = -1; i <= 1; i++){
              for (int j = -1; j <= 1; j++){
                  vec2 offset = vec2(float(i), float(j)) * (1.0 / min(uResolution.x, uResolution.y));
                  col += renderImage(vUv + offset);
                  samples++;
              }
          }
          gl_FragColor = col / float(samples);
      }
    `;
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader, fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Float32Array([gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height]) },
        uBaseColor: { value: new Float32Array(baseColor) },
        uAmplitude: { value: amplitude },
        uFrequencyX: { value: frequencyX },
        uFrequencyY: { value: frequencyY },
        uMouse: { value: new Float32Array([0, 0]) },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    function resize() {
      renderer.setSize(container.offsetWidth, container.offsetHeight);
      const r = program.uniforms.uResolution.value;
      r[0] = gl.canvas.width; r[1] = gl.canvas.height; r[2] = gl.canvas.width / gl.canvas.height;
    }
    window.addEventListener('resize', resize);
    resize();
    function handleMouseMove(event) {
      const rect = container.getBoundingClientRect();
      program.uniforms.uMouse.value[0] = (event.clientX - rect.left) / rect.width;
      program.uniforms.uMouse.value[1] = 1 - (event.clientY - rect.top) / rect.height;
    }
    if (interactive) container.addEventListener('mousemove', handleMouseMove);
    let animationId;
    function update(t) {
      animationId = requestAnimationFrame(update);
      program.uniforms.uTime.value = t * 0.001 * speed;
      renderer.render({ scene: mesh });
    }
    animationId = requestAnimationFrame(update);
    container.appendChild(gl.canvas);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      if (interactive) container.removeEventListener('mousemove', handleMouseMove);
      if (gl.canvas.parentElement) gl.canvas.parentElement.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [baseColor, speed, amplitude, frequencyX, frequencyY, interactive]);
  return <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />;
}

function Marquee() {
  const items = ['Premium Quality', '✦', 'South African Brand', '✦', 'Sport & Lifestyle', '✦', 'All Ages', '✦', 'Free Delivery', '✦', '118 Pieces', '✦'];
  return (
    <div style={{ borderTop: '1px solid rgba(201,168,76,0.18)', borderBottom: '1px solid rgba(201,168,76,0.18)', padding: '1.3rem 0', overflow: 'hidden', background: 'rgba(4,3,2,0.97)', backdropFilter: 'blur(10px)', position: 'relative', zIndex: 2 }}>
      <div style={{ display: 'flex', gap: '3rem', animation: 'rrMarquee 28s linear infinite', width: 'max-content' }}>
        {[...items, ...items].map((t, i) => (
          <span key={i} style={{ fontSize: '0.53rem', color: t === '✦' ? '#C9A84C' : '#4A4030', letterSpacing: '0.42em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: 'Montserrat, sans-serif' }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ─── CategoryCard: fully themed to dark gold, no BorderGlow ──────────────────
function CategoryCard({ cat, index, sectionProgress }) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);
  const glowRef = useRef(null);

  const delay = index * 0.13;
  const cardProgress = Math.max(0, Math.min(1, (sectionProgress - 0.1 - delay) / 0.45));
  const enterY = (1 - cardProgress) * 80;
  const enterOp = Math.min(1, cardProgress * 1.2);

  const handleMouseMove = useCallback((e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x: x - 0.5, y: y - 0.5 });
    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(400px circle at ${x * 100}% ${y * 100}%, rgba(201,168,76,0.12) 0%, transparent 65%)`;
    }
  }, []);

  const tiltX = hovered ? mousePos.y * -18 : 0;
  const tiltY = hovered ? mousePos.x * 22 : 0;

  return (
    <Link href={`/shop?category=${cat.label.toLowerCase()}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        ref={cardRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setMousePos({ x: 0, y: 0 }); if (glowRef.current) glowRef.current.style.background = 'none'; }}
        onMouseMove={handleMouseMove}
        style={{
          perspective: '900px',
          transformStyle: 'preserve-3d',
          transform: `translateY(${enterY}px) rotateY(${tiltY}deg) rotateX(${tiltX}deg) ${hovered ? 'translateZ(16px)' : ''}`,
          opacity: enterOp,
          transition: hovered
            ? 'transform 0.07s ease, box-shadow 0.4s'
            : 'transform 0.9s cubic-bezier(0.16,1,0.3,1), opacity 0.9s, box-shadow 0.4s',
          willChange: 'transform',
          position: 'relative',
          overflow: 'hidden',
          background: hovered
            ? 'linear-gradient(135deg, rgba(12,9,4,0.98) 0%, rgba(20,14,5,0.98) 100%)'
            : 'linear-gradient(135deg, rgba(8,6,3,0.97) 0%, rgba(12,9,4,0.97) 100%)',
          boxShadow: hovered
            ? '0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(201,168,76,0.08), inset 0 1px 0 rgba(201,168,76,0.15)'
            : '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(201,168,76,0.05)',
          border: `1px solid ${hovered ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.08)'}`,
          padding: '3.5rem 2.4rem',
          cursor: 'pointer',
        }}
      >
        {/* Mouse-follow glow */}
        <div ref={glowRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', transition: 'background 0.1s', zIndex: 0 }} />

        {/* Subtle scan lines */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(201,168,76,0.006) 2px, rgba(201,168,76,0.006) 3px)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Animated bottom line */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '1px', width: hovered ? '100%' : '0%', background: 'linear-gradient(90deg, transparent, #C9A84C 30%, #EDD070 50%, #C9A84C 70%, transparent)', transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)', zIndex: 1 }} />

        {/* Corner accents */}
        {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h], ci) => (
          <div key={ci} style={{
            position: 'absolute', [v]: 0, [h]: 0,
            width: hovered ? '32px' : '12px',
            height: hovered ? '32px' : '12px',
            borderTop: v === 'top' ? `1px solid ${hovered ? '#C9A84C' : 'rgba(201,168,76,0.3)'}` : 'none',
            borderBottom: v === 'bottom' ? `1px solid ${hovered ? '#C9A84C' : 'rgba(201,168,76,0.3)'}` : 'none',
            borderLeft: h === 'left' ? `1px solid ${hovered ? '#C9A84C' : 'rgba(201,168,76,0.3)'}` : 'none',
            borderRight: h === 'right' ? `1px solid ${hovered ? '#C9A84C' : 'rgba(201,168,76,0.3)'}` : 'none',
            transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
            zIndex: 1,
          }} />
        ))}

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.6rem', color: hovered ? '#C9A84C' : 'rgba(201,168,76,0.22)', letterSpacing: '0.3em', marginBottom: '1.8rem', transition: 'color 0.4s' }}>
            {String(index + 1).padStart(2, '0')}
          </p>

          <span style={{
            fontSize: '3rem', display: 'block', marginBottom: '1.8rem',
            transform: hovered ? 'scale(1.15) rotate(-8deg)' : 'scale(1)',
            transition: 'transform 0.55s cubic-bezier(0.16,1,0.3,1)',
            filter: hovered ? 'drop-shadow(0 0 16px rgba(201,168,76,0.5))' : 'none',
          }}>{cat.icon}</span>

          <h3 style={{
            fontFamily: 'Cormorant Garamond, serif', fontSize: '1.95rem', fontWeight: 300,
            color: hovered ? '#FFFFFF' : '#C8BC9E',
            marginBottom: '0.7rem', transition: 'color 0.3s',
            textShadow: hovered ? '0 0 40px rgba(255,255,255,0.18)' : 'none',
          }}>{cat.label}</h3>

          <p style={{ fontSize: '0.6rem', color: hovered ? 'rgba(201,168,76,0.5)' : 'rgba(100,90,70,0.8)', letterSpacing: '0.1em', lineHeight: 2, transition: 'color 0.3s' }}>
            {cat.desc}
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '2rem',
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateX(0)' : 'translateX(-14px)',
            transition: 'all 0.45s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{ width: '22px', height: '1px', background: '#C9A84C' }} />
            <span style={{ fontSize: '0.5rem', color: '#C9A84C', letterSpacing: '0.35em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>Explore</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ValueCard({ value, index, sectionProgress }) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);
  const glowRef = useRef(null);
  const romans = ['I', 'II', 'III', 'IV'];
  const icons = ['◈', '◆', '◉', '◇'];

  const delay = index * 0.13;
  const cardP = Math.max(0, Math.min(1, (sectionProgress - 0.08 - delay) / 0.5));
  const entryY = (1 - cardP) * 80;

  const handleMouseMove = useCallback((e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x: x - 0.5, y: y - 0.5 });
    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(350px circle at ${x * 100}% ${y * 100}%, rgba(201,168,76,0.11) 0%, transparent 65%)`;
    }
  }, []);

  const tiltX = hovered ? mousePos.y * -14 : 0;
  const tiltY = hovered ? mousePos.x * 18 : 0;

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMousePos({ x: 0, y: 0 }); if (glowRef.current) glowRef.current.style.background = 'none'; }}
      onMouseMove={handleMouseMove}
      style={{
        perspective: '900px',
        transformStyle: 'preserve-3d',
        transform: `translateY(${entryY}px) rotateY(${tiltY}deg) rotateX(${tiltX}deg) ${hovered ? 'translateZ(14px)' : ''}`,
        opacity: cardP,
        transition: hovered
          ? 'transform 0.07s ease, box-shadow 0.4s'
          : 'transform 0.9s cubic-bezier(0.16,1,0.3,1), opacity 0.9s, box-shadow 0.4s',
        willChange: 'transform',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
        background: hovered
          ? 'linear-gradient(135deg, rgba(14,10,4,0.96) 0%, rgba(22,16,5,0.96) 100%)'
          : 'linear-gradient(135deg, rgba(6,5,2,0.85) 0%, rgba(10,8,3,0.85) 100%)',
        backdropFilter: 'blur(16px)',
        boxShadow: hovered
          ? '0 40px 80px rgba(0,0,0,0.8), 0 0 60px rgba(201,168,76,0.07), inset 0 1px 0 rgba(201,168,76,0.12)'
          : '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,168,76,0.04)',
        border: `1px solid ${hovered ? 'rgba(201,168,76,0.28)' : 'rgba(201,168,76,0.07)'}`,
        padding: '3.8rem 2.2rem',
        cursor: 'default',
      }}
    >
      {/* Mouse-follow glow */}
      <div ref={glowRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* Scan lines */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(201,168,76,0.005) 2px, rgba(201,168,76,0.005) 3px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Animated bottom sweep */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, height: '1px', width: hovered ? '100%' : '0%', background: 'linear-gradient(90deg, transparent, #C9A84C 30%, #EDD070 50%, #C9A84C 70%, transparent)', transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)', zIndex: 1 }} />

      {/* Corner accents */}
      {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h], ci) => (
        <div key={ci} style={{
          position: 'absolute', [v]: 0, [h]: 0,
          width: hovered ? '28px' : '10px',
          height: hovered ? '28px' : '10px',
          borderTop: v === 'top' ? `1px solid ${hovered ? '#C9A84C' : 'rgba(201,168,76,0.25)'}` : 'none',
          borderBottom: v === 'bottom' ? `1px solid ${hovered ? '#C9A84C' : 'rgba(201,168,76,0.25)'}` : 'none',
          borderLeft: h === 'left' ? `1px solid ${hovered ? '#C9A84C' : 'rgba(201,168,76,0.25)'}` : 'none',
          borderRight: h === 'right' ? `1px solid ${hovered ? '#C9A84C' : 'rgba(201,168,76,0.25)'}` : 'none',
          transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
          zIndex: 1,
        }} />
      ))}

      {/* Ghost roman numeral */}
      <div style={{ position: 'absolute', top: '-1rem', right: '1rem', fontFamily: 'Cormorant Garamond, serif', fontSize: '5.5rem', fontWeight: 300, color: hovered ? 'rgba(201,168,76,0.09)' : 'rgba(201,168,76,0.03)', transition: 'color 0.5s', userSelect: 'none', pointerEvents: 'none', zIndex: 0 }}>{romans[index]}</div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Icon */}
        <div style={{
          fontSize: '1.6rem', color: hovered ? '#C9A84C' : 'rgba(201,168,76,0.3)',
          marginBottom: '1.6rem',
          transform: hovered ? 'scale(1.2) rotate(15deg)' : 'scale(1) rotate(0deg)',
          transition: 'all 0.55s cubic-bezier(0.16,1,0.3,1)',
          filter: hovered ? 'drop-shadow(0 0 12px rgba(201,168,76,0.6))' : 'none',
          display: 'block',
        }}>{icons[index]}</div>

        {/* Expanding line */}
        <div style={{ width: hovered ? '55px' : '18px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '0 auto 1.8rem', transition: 'width 0.55s cubic-bezier(0.16,1,0.3,1)' }} />

        <h3 style={{
          fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', fontWeight: 300,
          color: hovered ? '#FFFFFF' : '#C8BC9E',
          marginBottom: '1rem', transition: 'color 0.3s',
          textShadow: hovered ? '0 0 40px rgba(255,255,255,0.15)' : 'none',
          letterSpacing: '0.02em',
        }}>{value.title}</h3>

        <p style={{ fontSize: '0.62rem', color: hovered ? 'rgba(201,168,76,0.45)' : 'rgba(100,90,70,0.75)', lineHeight: 2.1, letterSpacing: '0.06em', transition: 'color 0.3s' }}>{value.desc}</p>

        {/* Explore nudge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginTop: '1.8rem',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.45s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <div style={{ width: '16px', height: '1px', background: '#C9A84C' }} />
          <span style={{ fontSize: '0.46rem', color: '#C9A84C', letterSpacing: '0.38em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>Our Commitment</span>
          <div style={{ width: '16px', height: '1px', background: '#C9A84C' }} />
        </div>
      </div>
    </div>
  );
}

function LineWaves({ speed = 0.3, innerLineCount = 32, warpIntensity = 1, color1 = '#C9A84C', color2 = '#8B6914', brightness = 0.2, enableMouseInteraction = true, mouseInfluence = 2 }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext('2d');
    let w = 0; let h = 0;
    let mouse = { x: 0, y: 0 };
    let raf; let t = 0;
    const setSize = () => {
      w = canvas.width = wrapper.offsetWidth || window.innerWidth;
      h = canvas.height = wrapper.offsetHeight || window.innerHeight;
      mouse = { x: w / 2, y: h / 2 };
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(wrapper);
    const onMove = (e) => {
      if (!enableMouseInteraction) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', onMove);
    const r1v = parseInt(color1.slice(1,3),16); const g1v = parseInt(color1.slice(3,5),16); const b1v = parseInt(color1.slice(5,7),16);
    const r2v = parseInt(color2.slice(1,3),16); const g2v = parseInt(color2.slice(3,5),16); const b2v = parseInt(color2.slice(5,7),16);
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!w || !h) return;
      t += speed * 0.016;
      ctx.clearRect(0, 0, w, h);
      for (let li = 0; li < innerLineCount; li++) {
        const progress = li / innerLineCount;
        const y = progress * h;
        const mouseDistY = Math.abs(mouse.y - y) / h;
        const mousePull = enableMouseInteraction ? (1 - Math.min(1, mouseDistY * 3)) * mouseInfluence : 0;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const warp = Math.sin(x * 0.01 + t + li * 0.18) * 18 * warpIntensity
            + Math.sin(x * 0.005 - t * 0.7 + li * 0.1) * 10 * warpIntensity
            + mousePull * Math.sin(x * 0.02 + t) * 20;
          const py = y + warp;
          if (x === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
        }
        const alpha = brightness * (0.4 + Math.sin(t + li * 0.3) * 0.3 + mousePull * 0.5);
        const colorMix = (Math.sin(t * 0.5 + li * 0.1) + 1) / 2;
        const r = Math.round(r1v + (r2v - r1v) * colorMix);
        const g = Math.round(g1v + (g2v - g1v) * colorMix);
        const b = Math.round(b1v + (b2v - b1v) * colorMix);
        ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(1, alpha)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };
    animate();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('mousemove', onMove); };
  }, [speed, innerLineCount, warpIntensity, color1, color2, brightness, enableMouseInteraction, mouseInfluence]);
  return (
    <div ref={wrapperRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}

export default function HomePage() {
  const [heroVisible, setHeroVisible] = useState(false);
  const [heroRef, heroScroll] = useElementScroll();
  const [collectionsRef, collectionsScroll] = useElementScroll();
  const [brandRef, brandScroll] = useElementScroll();
  const [valuesRef, valuesScroll] = useElementScroll();

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const categories = [
    { label: 'Menswear', desc: 'Sport & lifestyle essentials for the modern man', icon: '👔' },
    { label: 'Womenswear', desc: 'Elegant everyday wear, effortlessly refined', icon: '👗' },
    { label: 'Kiddies', desc: 'Stylish pieces crafted for little ones', icon: '🧒' },
    { label: 'Baby Wear', desc: 'Soft, premium comfort from day one', icon: '👶' },
  ];

  const values = [
    { title: 'Quality', desc: 'Only the finest materials, constructed to outlast trends and time.' },
    { title: 'Design', desc: 'Style meets function — every piece is entirely intentional.' },
    { title: 'Customer Focus', desc: 'You are at the heart of everything we create and do.' },
    { title: 'Innovation', desc: 'Always improving, always evolving, never standing still.' },
  ];

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const heroOpacity = Math.max(0, 1 - heroScroll * 1.5);
  const heroTranslateY = heroScroll * 60;
  const brandTilt = (brandScroll - 0.5) * 14;
  const brandScale = 0.88 + brandScroll * 0.24;

  return (
    <ClickSpark sparkColor="#C9A84C" sparkSize={7} sparkRadius={14} sparkCount={8} duration={400}>
      <div style={{ paddingTop: '70px', background: '#040302', overflowX: 'hidden' }}>

        <TargetCursor
          targetSelector="a, button"
          spinDuration={2.4}
          hideDefaultCursor={true}
          hoverDuration={0.18}
          parallaxOn={true}
        />

        <GooeyNav items={navItems} initialActiveIndex={0} />

        <section ref={heroRef} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 2rem', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <AntigravityCanvas
              count={300}
              magnetRadius={6}
              ringRadius={7}
              waveSpeed={0.4}
              waveAmplitude={1}
              particleSize={1.5}
              lerpSpeed={0.05}
              color="#C9A84C"
              autoAnimate
              particleVariance={1}
              rotationSpeed={0}
              depthFactor={1}
              pulseSpeed={3}
              particleShape="capsule"
              fieldStrength={10}
            />
          </div>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)', backgroundSize: '88px 88px', transform: `perspective(800px) rotateX(${55 + heroScroll * 14}deg) translateZ(-80px) scale(2.2)`, transformOrigin: '50% 100%', opacity: 0.5, zIndex: 2, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '800px', height: '800px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.015) 40%, transparent 65%)', pointerEvents: 'none', zIndex: 2, animation: 'rrBloom 4s ease-in-out infinite alternate' }} />
          <div style={{ maxWidth: '960px', position: 'relative', zIndex: 3, transform: `translateY(${heroTranslateY}px)`, opacity: heroOpacity, willChange: 'transform, opacity' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.2rem', marginBottom: '3rem', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(20px)', transition: 'opacity 1s ease 0.2s, transform 1s ease 0.2s' }}>
              <div style={{ width: '38px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C)' }} />
              <p style={{ fontSize: '0.57rem', color: '#C9A84C', letterSpacing: '0.55em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}>Premium Sport &amp; Lifestyle</p>
              <div style={{ width: '38px', height: '1px', background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
            </div>
            <div style={{ marginBottom: '2rem' }}>
              {[
                { text: 'R&R', gold: true, delay: 0.35 },
                { text: 'Sport &', gold: false, delay: 0.52 },
                { text: 'Lifestyle', gold: false, delay: 0.69 },
              ].map((word, i) => (
                <div key={i} style={{ overflow: 'hidden', lineHeight: 1.02 }}>
                  <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(100%)', transition: `opacity 1.2s cubic-bezier(0.16,1,0.3,1) ${word.delay}s, transform 1.2s cubic-bezier(0.16,1,0.3,1) ${word.delay}s` }}>
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(4rem, 12vw, 10rem)', fontWeight: 300, color: word.gold ? '#C9A84C' : '#FFFFFF', display: 'block', letterSpacing: word.gold ? '-0.02em' : '-0.01em', textShadow: word.gold ? '0 0 80px rgba(201,168,76,0.5), 0 0 160px rgba(201,168,76,0.2)' : '0 0 60px rgba(255,255,255,0.1), 0 4px 30px rgba(0,0,0,0.9)', lineHeight: 1.02 }} dangerouslySetInnerHTML={{ __html: word.text }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ width: heroVisible ? '130px' : '0px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '2.8rem auto', transition: 'width 1.6s cubic-bezier(0.16,1,0.3,1) 0.9s' }} />
            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.42em', textTransform: 'uppercase', marginBottom: '4rem', fontFamily: 'Montserrat, sans-serif', fontWeight: 200, opacity: heroVisible ? 1 : 0, transition: 'opacity 1s ease 1.2s' }}>Own the Look · Own the Moment</p>
            <div style={{ display: 'flex', gap: '1.4rem', justifyContent: 'center', flexWrap: 'wrap', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(20px)', transition: 'opacity 1s ease 1.5s, transform 1s ease 1.5s' }}>
              <Link href="/shop" className="rr-btn-primary">Shop the Collection</Link>
              <Link href="/about" className="rr-btn-outline">Our Story</Link>
            </div>
            <div style={{ marginTop: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', opacity: heroVisible ? 0.55 : 0, transition: 'opacity 1s ease 2.2s' }}>
              <p style={{ fontSize: '0.44rem', color: '#C9A84C', letterSpacing: '0.5em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>Scroll</p>
              <div style={{ width: '1px', height: '60px', background: 'linear-gradient(180deg, #C9A84C, transparent)', animation: 'rrScrollPulse 2s ease-in-out infinite' }} />
            </div>
          </div>
        </section>

        <div style={{ position: 'relative', zIndex: 2 }}><Marquee /></div>

        <section ref={collectionsRef} style={{ padding: '11rem 4rem 10rem', maxWidth: '1380px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ textAlign: 'center', marginBottom: '7rem', transform: `translateY(${Math.max(0, (0.5 - collectionsScroll) * 60)}px)`, opacity: Math.min(1, collectionsScroll * 3.5) }}>
            <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.2rem', fontFamily: 'Montserrat, sans-serif' }}>Browse</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 300, color: '#FFFFFF', textShadow: '0 0 60px rgba(255,255,255,0.07)' }}>Our Collections</h2>
            <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '1.8rem auto 0' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2px', background: 'rgba(201,168,76,0.06)' }}>
            {categories.map((cat, i) => <CategoryCard key={cat.label} cat={cat} index={i} sectionProgress={collectionsScroll} />)}
          </div>
        </section>

        <section ref={brandRef} style={{ backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '11rem 2rem', textAlign: 'center', position: 'relative', zIndex: 2, overflow: 'hidden', perspective: '1200px', minHeight: '600px' }}>
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <LiquidChrome baseColor={[0.1, 0.1, 0.1]} speed={1} amplitude={0.6} interactive={true} />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,3,2,0.55)', zIndex: 1, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(10rem, 28vw, 24rem)', color: 'transparent', WebkitTextStroke: '1px rgba(201,168,76,0.045)', userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap', fontWeight: 300, transform: `translate(-50%,-50%) rotateX(${brandTilt}deg) scale(${brandScale})`, willChange: 'transform', zIndex: 2 }}>R&amp;R</div>
          <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 3, transform: `rotateX(${brandTilt * 0.4}deg) scale(${0.94 + brandScroll * 0.09})`, opacity: Math.min(1, brandScroll * 3), willChange: 'transform, opacity' }}>
            <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '2rem', fontFamily: 'Montserrat, sans-serif' }}>Our Mission</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2rem, 5vw, 3.7rem)', fontWeight: 300, fontStyle: 'italic', color: '#FFFFFF', lineHeight: 1.65, textShadow: '0 0 80px rgba(255,255,255,0.05)' }}>
              "Premium clothing that combines{' '}
              <span style={{ color: '#C9A84C', fontStyle: 'normal', textShadow: '0 0 40px rgba(201,168,76,0.4)' }}>elegance with comfort</span>,
              designed for the modern individual who lives without compromise."
            </h2>
            <div style={{ width: '70px', height: '1px', background: '#C9A84C', margin: '3.5rem auto 3rem' }} />
            <Link href="/about" className="rr-btn-outline">Read Our Story</Link>
          </div>
        </section>

        {/* ── Values: plain dark header (matches collections style) ── */}
        <section ref={valuesRef} style={{ padding: '11rem 4rem 10rem', maxWidth: '1300px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ textAlign: 'center', marginBottom: '7rem', transform: `translateY(${Math.max(0, (0.5 - valuesScroll) * 60)}px)`, opacity: Math.min(1, valuesScroll * 3.5) }}>
            <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.2rem', fontFamily: 'Montserrat, sans-serif' }}>What We Stand For</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 300, color: '#FFFFFF', textShadow: '0 0 60px rgba(255,255,255,0.07)' }}>Our Values</h2>
            <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '1.8rem auto 0' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2px', background: 'rgba(201,168,76,0.05)' }}>
            {values.map((v, i) => <ValueCard key={v.title} value={v} index={i} sectionProgress={valuesScroll} />)}
          </div>
        </section>

        <section style={{ padding: '14rem 2rem', textAlign: 'center', borderTop: '1px solid rgba(201,168,76,0.1)', position: 'relative', zIndex: 2, overflow: 'hidden' }}>
          {/* Wave canvas background */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <LineWaves speed={0.3} innerLineCount={40} warpIntensity={1.1} color1="#C9A84C" color2="#8B6914" brightness={0.18} enableMouseInteraction mouseInfluence={1.8} />
          </div>
          {/* Dark overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,3,2,0.78)', zIndex: 1, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '2rem', fontFamily: 'Montserrat, sans-serif' }}>118 premium pieces — available now</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(3rem, 9vw, 7.5rem)', fontWeight: 300, lineHeight: 1.05, marginBottom: '4rem' }}>
              <span style={{ color: '#FFFFFF', textShadow: '0 0 80px rgba(255,255,255,0.08)', display: 'block' }}>Ready to</span>
              <span style={{ color: '#C9A84C', textShadow: '0 0 80px rgba(201,168,76,0.5), 0 0 160px rgba(201,168,76,0.2)', fontStyle: 'italic', display: 'block' }}>elevate</span>
              <span style={{ color: '#FFFFFF', textShadow: '0 0 80px rgba(255,255,255,0.08)', display: 'block' }}>your wardrobe?</span>
            </h2>
            <Link href="/shop" className="rr-btn-primary">Shop Now</Link>
          </div>
        </section>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap');

          * { cursor: none !important; }
          html { scroll-behavior: smooth; }

          .tc-wrapper {
            position: fixed;
            top: 0; left: 0;
            width: 0; height: 0;
            pointer-events: none;
            z-index: 99999;
            will-change: transform;
          }

          .tc-dot {
            position: absolute;
            width: 5px; height: 5px;
            border-radius: 50%;
            background: #C9A84C;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 8px rgba(201,168,76,0.8), 0 0 16px rgba(201,168,76,0.4);
          }

          .tc-corner {
            position: absolute;
            width: 12px; height: 12px;
            border-color: #C9A84C;
            border-style: solid;
            border-width: 0;
            will-change: transform;
            filter: drop-shadow(0 0 4px rgba(201,168,76,0.6));
          }

          .tc-tl {
            border-top-width: 2px;
            border-left-width: 2px;
            transform: translate(-18px, -18px);
          }
          .tc-tr {
            border-top-width: 2px;
            border-right-width: 2px;
            transform: translate(6px, -18px);
          }
          .tc-br {
            border-bottom-width: 2px;
            border-right-width: 2px;
            transform: translate(6px, 6px);
          }
          .tc-bl {
            border-bottom-width: 2px;
            border-left-width: 2px;
            transform: translate(-18px, 6px);
          }

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
            to   { opacity: 0.55; transform: translate(-50%,-50%) scale(1.04); }
          }
          @keyframes rrBloom {
            from { opacity: 0.6; transform: translate(-50%,-50%) scale(0.95); }
            to   { opacity: 1.0; transform: translate(-50%,-50%) scale(1.05); }
          }
          @keyframes navPillIn {
            from { transform: scaleX(0.6); opacity: 0; }
            to   { transform: scaleX(1); opacity: 1; }
          }
          @keyframes particlePop {
            0%   { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--px, 20px), var(--py, -20px)) scale(0); opacity: 0; }
          }
          @keyframes sparkFly {
            0%   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
            100% {
              transform: translate(
                calc(-50% + cos(var(--angle)) * var(--radius) * 3),
                calc(-50% + sin(var(--angle)) * var(--radius) * 3)
              ) scale(0);
              opacity: 0;
            }
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
            box-shadow: 0 8px 40px rgba(201,168,76,0.2);
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
            box-shadow: 0 25px 60px rgba(201,168,76,0.35);
          }

          .rr-btn-outline {
            display: inline-block;
            padding: 1.15rem 3.2rem;
            border: 1px solid rgba(201,168,76,0.55);
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
            background: rgba(201,168,76,0.08);
            transform: scaleX(0); transform-origin: left;
            transition: transform 0.55s cubic-bezier(0.16,1,0.3,1);
          }
          .rr-btn-outline:hover::before { transform: scaleX(1); }
          .rr-btn-outline:hover {
            border-color: #C9A84C;
            transform: translateY(-5px);
            box-shadow: 0 20px 50px rgba(201,168,76,0.15);
          }
        `}</style>
      </div>
    </ClickSpark>
  );
}