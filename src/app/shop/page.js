'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Renderer, Triangle, Program, Mesh } from 'ogl';
import gsap from 'gsap';

function Prism({
  height = 3.5,
  baseWidth = 5.5,
  animationType = 'rotate',
  glow = 1,
  offset = { x: 0, y: 0 },
  noise = 0.5,
  transparent = true,
  scale = 3.6,
  hueShift = 0,
  colorFrequency = 1,
  hoverStrength = 2,
  inertia = 0.05,
  bloom = 1,
  suspendWhenOffscreen = false,
  timeScale = 0.5,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const H = Math.max(0.001, height);
    const BW = Math.max(0.001, baseWidth);
    const BASE_HALF = BW * 0.5;
    const GLOW = Math.max(0.0, glow);
    const NOISE = Math.max(0.0, noise);
    const offX = offset?.x ?? 0;
    const offY = offset?.y ?? 0;
    const SAT = transparent ? 1.5 : 1;
    const SCALE = Math.max(0.001, scale);
    const HUE = hueShift || 0;
    const CFREQ = Math.max(0.0, colorFrequency || 1);
    const BLOOM = Math.max(0.0, bloom || 1);
    const RSX = 1, RSY = 1, RSZ = 1;
    const TS = Math.max(0, timeScale || 1);
    const HOVSTR = Math.max(0, hoverStrength || 1);
    const INERT = Math.max(0, Math.min(1, inertia || 0.12));

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const renderer = new Renderer({ dpr, alpha: transparent, antialias: false });
    const gl = renderer.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

    Object.assign(gl.canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
    });
    container.appendChild(gl.canvas);

    const vertex = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragment = `
      precision highp float;
      uniform vec2  iResolution;
      uniform float iTime;
      uniform float uHeight;
      uniform float uBaseHalf;
      uniform mat3  uRot;
      uniform int   uUseBaseWobble;
      uniform float uGlow;
      uniform vec2  uOffsetPx;
      uniform float uNoise;
      uniform float uSaturation;
      uniform float uScale;
      uniform float uHueShift;
      uniform float uColorFreq;
      uniform float uBloom;
      uniform float uCenterShift;
      uniform float uInvBaseHalf;
      uniform float uInvHeight;
      uniform float uMinAxis;
      uniform float uPxScale;
      uniform float uTimeScale;

      vec4 tanh4(vec4 x){
        vec4 e2x = exp(2.0*x);
        return (e2x - 1.0) / (e2x + 1.0);
      }

      float rand(vec2 co){
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      float sdOctaAnisoInv(vec3 p){
        vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
        float m = q.x + q.y + q.z - 1.0;
        return m * uMinAxis * 0.5773502691896258;
      }

      float sdPyramidUpInv(vec3 p){
        float oct = sdOctaAnisoInv(p);
        float halfSpace = -p.y;
        return max(oct, halfSpace);
      }

      mat3 hueRotation(float a){
        float c = cos(a), s = sin(a);
        mat3 W = mat3(0.299,0.587,0.114,0.299,0.587,0.114,0.299,0.587,0.114);
        mat3 U = mat3(0.701,-0.587,-0.114,-0.299,0.413,-0.114,-0.300,-0.588,0.886);
        mat3 V = mat3(0.168,-0.331,0.500,0.328,0.035,-0.500,-0.497,0.296,0.201);
        return W + U * c + V * s;
      }

      void main(){
        vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy - uOffsetPx) * uPxScale;
        float z = 5.0;
        float d = 0.0;
        vec3 p;
        vec4 o = vec4(0.0);
        float centerShift = uCenterShift;
        float cf = uColorFreq;
        mat2 wob = mat2(1.0);
        if (uUseBaseWobble == 1) {
          float t = iTime * uTimeScale;
          float c0 = cos(t + 0.0);
          float c1 = cos(t + 33.0);
          float c2 = cos(t + 11.0);
          wob = mat2(c0, c1, c2, c0);
        }
        const int STEPS = 100;
        for (int i = 0; i < STEPS; i++) {
          p = vec3(f, z);
          p.xz = p.xz * wob;
          p = uRot * p;
          vec3 q = p;
          q.y += centerShift;
          d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
          z -= d;
          o += (sin((p.y + z) * cf + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
        }
        o = tanh4(o * o * (uGlow * uBloom) / 1e5);
        vec3 col = o.rgb;
        float n = rand(gl_FragCoord.xy + vec2(iTime));
        col += (n - 0.5) * uNoise;
        col = clamp(col, 0.0, 1.0);
        float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);
        if(abs(uHueShift) > 0.0001){
          col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
        }
        gl_FragColor = vec4(col, o.a);
      }
    `;

    const geometry = new Triangle(gl);
    const iResBuf = new Float32Array(2);
    const offsetPxBuf = new Float32Array(2);

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iResolution: { value: iResBuf },
        iTime: { value: 0 },
        uHeight: { value: H },
        uBaseHalf: { value: BASE_HALF },
        uUseBaseWobble: { value: 1 },
        uRot: { value: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]) },
        uGlow: { value: GLOW },
        uOffsetPx: { value: offsetPxBuf },
        uNoise: { value: NOISE },
        uSaturation: { value: SAT },
        uScale: { value: SCALE },
        uHueShift: { value: HUE },
        uColorFreq: { value: CFREQ },
        uBloom: { value: BLOOM },
        uCenterShift: { value: H * 0.25 },
        uInvBaseHalf: { value: 1 / BASE_HALF },
        uInvHeight: { value: 1 / H },
        uMinAxis: { value: Math.min(BASE_HALF, H) },
        uPxScale: { value: 1 / ((gl.drawingBufferHeight || 1) * 0.1 * SCALE) },
        uTimeScale: { value: TS },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h);
      iResBuf[0] = gl.drawingBufferWidth;
      iResBuf[1] = gl.drawingBufferHeight;
      offsetPxBuf[0] = offX * dpr;
      offsetPxBuf[1] = offY * dpr;
      program.uniforms.uPxScale.value = 1 / ((gl.drawingBufferHeight || 1) * 0.1 * SCALE);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const rotBuf = new Float32Array(9);
    const setMat3FromEuler = (yawY, pitchX, rollZ, out) => {
      const cy = Math.cos(yawY), sy = Math.sin(yawY);
      const cx = Math.cos(pitchX), sx = Math.sin(pitchX);
      const cz = Math.cos(rollZ), sz = Math.sin(rollZ);
      out[0] = cy * cz + sy * sx * sz;
      out[1] = cx * sz;
      out[2] = -sy * cz + cy * sx * sz;
      out[3] = -cy * sz + sy * sx * cz;
      out[4] = cx * cz;
      out[5] = sy * sz + cy * sx * cz;
      out[6] = sy * cx;
      out[7] = -sx;
      out[8] = cy * cx;
      return out;
    };

    const NOISE_IS_ZERO = NOISE < 1e-6;
    let raf = 0;
    const t0 = performance.now();
    const startRAF = () => { if (raf) return; raf = requestAnimationFrame(render); };
    const stopRAF = () => { if (!raf) return; cancelAnimationFrame(raf); raf = 0; };

    const rnd = () => Math.random();
    const wX = (0.3 + rnd() * 0.6) * RSX;
    const wY = (0.2 + rnd() * 0.7) * RSY;
    const wZ = (0.1 + rnd() * 0.5) * RSZ;
    const phX = rnd() * Math.PI * 2;
    const phZ = rnd() * Math.PI * 2;

    let yaw = 0, pitch = 0, roll = 0;
    let targetYaw = 0, targetPitch = 0;
    const lerp = (a, b, t) => a + (b - a) * t;

    const pointer = { x: 0, y: 0, inside: true };
    const onMove = (e) => {
      const ww = Math.max(1, window.innerWidth);
      const wh = Math.max(1, window.innerHeight);
      pointer.x = Math.max(-1, Math.min(1, (e.clientX - ww * 0.5) / (ww * 0.5)));
      pointer.y = Math.max(-1, Math.min(1, (e.clientY - wh * 0.5) / (wh * 0.5)));
      pointer.inside = true;
    };
    const onLeave = () => { pointer.inside = false; };

    let onPointerMove = null;
    if (animationType === 'hover') {
      onPointerMove = (e) => { onMove(e); startRAF(); };
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('mouseleave', onLeave);
      window.addEventListener('blur', onLeave);
      program.uniforms.uUseBaseWobble.value = 0;
    } else if (animationType === '3drotate') {
      program.uniforms.uUseBaseWobble.value = 0;
    } else {
      program.uniforms.uUseBaseWobble.value = 1;
    }

    const render = (t) => {
      const time = (t - t0) * 0.001;
      program.uniforms.iTime.value = time;
      let continueRAF = true;

      if (animationType === 'hover') {
        targetYaw = (pointer.inside ? -pointer.x : 0) * 0.6 * HOVSTR;
        targetPitch = (pointer.inside ? pointer.y : 0) * 0.6 * HOVSTR;
        yaw = lerp(yaw, targetYaw, INERT);
        pitch = lerp(pitch, targetPitch, INERT);
        roll = lerp(roll, 0, 0.1);
        program.uniforms.uRot.value = setMat3FromEuler(yaw, pitch, roll, rotBuf);
        if (NOISE_IS_ZERO && Math.abs(yaw - targetYaw) < 1e-4 && Math.abs(pitch - targetPitch) < 1e-4 && Math.abs(roll) < 1e-4) continueRAF = false;
      } else if (animationType === '3drotate') {
        const tScaled = time * TS;
        yaw = tScaled * wY;
        pitch = Math.sin(tScaled * wX + phX) * 0.6;
        roll = Math.sin(tScaled * wZ + phZ) * 0.5;
        program.uniforms.uRot.value = setMat3FromEuler(yaw, pitch, roll, rotBuf);
        if (TS < 1e-6) continueRAF = false;
      } else {
        rotBuf[0] = 1; rotBuf[1] = 0; rotBuf[2] = 0;
        rotBuf[3] = 0; rotBuf[4] = 1; rotBuf[5] = 0;
        rotBuf[6] = 0; rotBuf[7] = 0; rotBuf[8] = 1;
        program.uniforms.uRot.value = rotBuf;
        if (TS < 1e-6) continueRAF = false;
      }

      renderer.render({ scene: mesh });
      raf = continueRAF ? requestAnimationFrame(render) : 0;
    };

    if (suspendWhenOffscreen) {
      const io = new IntersectionObserver((entries) => {
        entries.some((e) => e.isIntersecting) ? startRAF() : stopRAF();
      });
      io.observe(container);
      startRAF();
      container.__prismIO = io;
    } else {
      startRAF();
    }

    return () => {
      stopRAF();
      ro.disconnect();
      if (animationType === 'hover') {
        if (onPointerMove) window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('mouseleave', onLeave);
        window.removeEventListener('blur', onLeave);
      }
      if (suspendWhenOffscreen && container.__prismIO) {
        container.__prismIO.disconnect();
        delete container.__prismIO;
      }
      if (gl.canvas.parentElement === container) container.removeChild(gl.canvas);
    };
  }, [height, baseWidth, animationType, glow, noise, offset?.x, offset?.y, scale, transparent, hueShift, colorFrequency, timeScale, hoverStrength, inertia, bloom, suspendWhenOffscreen]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}

function PrismHero({ children }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: '#040302' }}>
      <div style={{ position: 'absolute', left: '-8%', top: 0, bottom: 0, width: '46%', zIndex: 1, pointerEvents: 'none' }}>
        <Prism animationType="rotate" glow={1.3} noise={0.28} transparent={true} scale={3.8} hueShift={0.18} colorFrequency={1.15} bloom={1.15} timeScale={0.38} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 30%, #040302 100%)', pointerEvents: 'none', zIndex: 2 }} />
      </div>
      <div style={{ position: 'absolute', right: '-8%', top: 0, bottom: 0, width: '46%', zIndex: 1, pointerEvents: 'none' }}>
        <Prism animationType="rotate" glow={1.3} noise={0.28} transparent={true} scale={3.8} hueShift={0.95} colorFrequency={1.15} bloom={1.15} timeScale={0.44} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, transparent 30%, #040302 100%)', pointerEvents: 'none', zIndex: 2 }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, backgroundImage: 'linear-gradient(rgba(201,168,76,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.07) 1px,transparent 1px)', backgroundSize: '80px 80px', transform: 'perspective(700px) rotateX(60deg) translateZ(-60px) scale(2)', transformOrigin: '50% 100%', opacity: 0.5, pointerEvents: 'none', mixBlendMode: 'overlay' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: 'radial-gradient(ellipse 55% 75% at 50% 50%, rgba(4,3,2,0.65) 0%, transparent 80%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '110px', zIndex: 4, background: 'linear-gradient(to bottom, transparent, #040302)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 5 }}>{children}</div>
    </div>
  );
}

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

function TargetCursor({ targetSelector = 'a, button', spinDuration = 2, hideDefaultCursor = true, hoverDuration = 0.2, parallaxOn = true }) {
  const cursorRef = useRef(null);
  const cornersRef = useRef(null);
  const spinTl = useRef(null);
  const dotRef = useRef(null);
  const isActiveRef = useRef(false);
  const targetCornerPositionsRef = useRef(null);
  const tickerFnRef = useRef(null);
  const activeStrengthRef = useRef(0);
  const isMobile = useIsMobile();
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

function FilterPill({ label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ padding: '0.6rem 1.4rem', border: '1px solid', borderColor: active ? '#C9A84C' : hov ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)', background: active ? 'rgba(201,168,76,0.1)' : 'transparent', color: active ? '#C9A84C' : hov ? 'rgba(201,168,76,0.8)' : '#555', fontFamily: 'Montserrat,sans-serif', fontSize: '0.52rem', letterSpacing: '0.35em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)', position: 'relative', overflow: 'hidden', whiteSpace: 'nowrap' }}>
      {active && <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: '#C9A84C' }} />}
      {label}
    </button>
  );
}

function BorderGlowCard({ children }) {
  const cardRef = useRef(null);
  const handlePointerMove = useCallback((e) => {
    const c = cardRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
    const kx = dx !== 0 ? (r.width / 2) / Math.abs(dx) : Infinity, ky = dy !== 0 ? (r.height / 2) / Math.abs(dy) : Infinity;
    const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; if (angle < 0) angle += 360;
    c.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`);
    c.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  }, []);
  const handleTouchMove = useCallback((e) => { if (!e.touches.length) return; handlePointerMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }); }, [handlePointerMove]);
  return (
    <div ref={cardRef} onPointerMove={handlePointerMove} onTouchMove={handleTouchMove} style={{ position: 'relative', borderRadius: '0px', '--glow-color': 'hsl(40deg 70% 65% / 100%)', '--glow-color-60': 'hsl(40deg 70% 65% / 60%)', '--glow-color-50': 'hsl(40deg 70% 65% / 50%)', '--glow-color-40': 'hsl(40deg 70% 65% / 40%)', '--glow-color-30': 'hsl(40deg 70% 65% / 30%)', '--glow-color-20': 'hsl(40deg 70% 65% / 20%)', '--glow-color-10': 'hsl(40deg 70% 65% / 10%)', '--edge-proximity': '0', '--cursor-angle': '0deg', '--cone-spread': '25', '--glow-padding': '40px', '--border-radius': '0px' }}>
      <style>{`.bglow-wrap{position:relative;isolation:isolate;}.bglow-wrap::before{content:'';position:absolute;inset:calc(-1 * var(--glow-padding));border-radius:calc(var(--border-radius) + var(--glow-padding));background:conic-gradient(from calc(var(--cursor-angle) - calc(var(--cone-spread) * 1deg)),transparent 0deg,var(--glow-color) calc(var(--cone-spread) * 1deg),var(--glow-color-60) calc(var(--cone-spread) * 2deg),var(--glow-color-50) calc(var(--cone-spread) * 3deg),var(--glow-color-40) calc(var(--cone-spread) * 4deg),var(--glow-color-30) calc(var(--cone-spread) * 5deg),var(--glow-color-20) calc(var(--cone-spread) * 6deg),var(--glow-color-10) calc(var(--cone-spread) * 7deg),transparent calc(var(--cone-spread) * 8deg) 360deg);opacity:calc(var(--edge-proximity) / 100);-webkit-mask:linear-gradient(black,black) content-box,linear-gradient(black,black);-webkit-mask-composite:xor;mask-composite:exclude;padding:1px;pointer-events:none;z-index:2;transition:opacity 0.3s ease;}.bglow-wrap::after{content:'';position:absolute;inset:calc(-1 * var(--glow-padding));border-radius:calc(var(--border-radius) + var(--glow-padding));background:conic-gradient(from calc(var(--cursor-angle) - calc(var(--cone-spread) * 1deg)),transparent 0deg,var(--glow-color-10) calc(var(--cone-spread) * 1deg),transparent calc(var(--cone-spread) * 3deg) 360deg);opacity:calc(var(--edge-proximity) / 100);pointer-events:none;z-index:1;filter:blur(8px);transition:opacity 0.3s ease;}`}</style>
      <div className="bglow-wrap" style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

function ProductCard({ product, index, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const cardRef = useRef(null), obsRef = useRef(null), resetTimer = useRef(null);

  useEffect(() => {
    obsRef.current = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (cardRef.current) obsRef.current.observe(cardRef.current);
    return () => obsRef.current?.disconnect();
  }, []);
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  const handleMouseMove = useCallback((e) => { const r = cardRef.current?.getBoundingClientRect(); if (!r) return; setMousePos({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 }); }, []);
  const handleTouchStart = useCallback((e) => { if (resetTimer.current) clearTimeout(resetTimer.current); setHovered(true); if (e.touches.length > 0) { const t = e.touches[0], r = cardRef.current?.getBoundingClientRect(); if (!r) return; setMousePos({ x: (t.clientX - r.left) / r.width - 0.5, y: (t.clientY - r.top) / r.height - 0.5 }); } }, []);
  const handleTouchMove = useCallback((e) => { if (e.touches.length > 0) { const t = e.touches[0], r = cardRef.current?.getBoundingClientRect(); if (!r) return; setMousePos({ x: (t.clientX - r.left) / r.width - 0.5, y: (t.clientY - r.top) / r.height - 0.5 }); } }, []);
  const handleTouchEnd = useCallback(() => { resetTimer.current = setTimeout(() => { setHovered(false); setMousePos({ x: 0, y: 0 }); }, 320); }, []);

  const availableSizes = product.sizes ? Object.entries(product.sizes).filter(([, q]) => q > 0).map(([s]) => s) : [];
  const isOutOfStock = product.stock === 0;
  const stagger = (index % 4) * 0.08;
  const tiltX = hovered ? mousePos.y * -12 : 0;
  const tiltY = hovered ? mousePos.x * 15 : 0;
  const imageHeight = isMobile ? '180px' : '320px';

  return (
    <Link href={`/shop/${encodeURIComponent(product.name)}`} style={{ textDecoration: 'none', display: 'block' }}>
      <BorderGlowCard>
        <div ref={cardRef} onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setMousePos({ x: 0, y: 0 }); }} onMouseMove={handleMouseMove} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ perspective: '1000px' }}>
          <div style={{ position: 'relative', border: '1px solid', borderColor: hovered ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.1)', background: hovered ? 'linear-gradient(160deg,rgba(201,168,76,0.07) 0%,rgba(6,5,3,0.98) 60%)' : 'rgba(7,6,4,0.95)', overflow: 'hidden', transformStyle: 'preserve-3d', transform: visible ? `rotateX(${tiltX}deg) rotateY(${tiltY}deg)${hovered ? ' translateZ(8px)' : ''}` : 'translateY(60px) rotateX(8deg)', opacity: visible ? 1 : 0, transition: visible ? (hovered ? 'border-color 0.25s,background 0.25s,box-shadow 0.25s,transform 0.12s ease' : `border-color 0.45s,background 0.45s,box-shadow 0.45s,transform 0.6s cubic-bezier(0.16,1,0.3,1) ${stagger}s,opacity 0.6s ease ${stagger}s`) : `opacity 0.6s ease ${stagger}s,transform 0.8s cubic-bezier(0.16,1,0.3,1) ${stagger}s`, boxShadow: hovered ? '0 40px 80px rgba(0,0,0,0.8),0 0 50px rgba(201,168,76,0.1),inset 0 1px 0 rgba(201,168,76,0.12)' : '0 8px 30px rgba(0,0,0,0.6)', willChange: 'transform,opacity', cursor: 'pointer' }}>
            {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h], ci) => (
              <div key={ci} style={{ position: 'absolute', [v]: 0, [h]: 0, zIndex: 3, width: hovered ? '28px' : '10px', height: hovered ? '28px' : '10px', borderTop: v === 'top' ? '1px solid #C9A84C' : 'none', borderBottom: v === 'bottom' ? '1px solid #C9A84C' : 'none', borderLeft: h === 'left' ? '1px solid #C9A84C' : 'none', borderRight: h === 'right' ? '1px solid #C9A84C' : 'none', transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)', opacity: hovered ? 1 : 0.4 }} />
            ))}
            <div style={{ position: 'absolute', bottom: 0, left: 0, zIndex: 3, height: '1px', width: hovered ? '100%' : '0%', background: 'linear-gradient(90deg,transparent,#C9A84C 30%,#C9A84C 70%,transparent)', transition: 'width 0.65s cubic-bezier(0.16,1,0.3,1)' }} />
            <div style={{ width: '100%', height: imageHeight, background: 'rgba(12,10,6,1)', overflow: 'hidden', position: 'relative' }}>
              {(product.imageUrls?.[0] || product.imageUrl) ? (
  <img src={product.imageUrls?.[0] || product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hovered ? 'scale(1.08)' : 'scale(1)', filter: hovered ? 'brightness(1.05) contrast(1.05)' : isOutOfStock ? 'brightness(0.4) grayscale(0.5)' : 'brightness(0.85)', transition: 'transform 0.7s cubic-bezier(0.16,1,0.3,1),filter 0.5s ease' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: isMobile ? '1.5rem' : '3rem', filter: 'grayscale(1)', opacity: 0.3 }}>👕</span>
                  <p style={{ fontSize: '0.5rem', color: '#333', letterSpacing: '0.3em', textTransform: 'uppercase' }}>No Image</p>
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 40%,rgba(7,6,4,0.85) 100%)', pointerEvents: 'none', opacity: hovered ? 0.7 : 1, transition: 'opacity 0.5s' }} />
              {isOutOfStock && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,3,2,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                  <div style={{ border: '1px solid rgba(201,168,76,0.3)', padding: isMobile ? '0.3rem 0.6rem' : '0.5rem 1.4rem' }}>
                    <p style={{ fontSize: isMobile ? '0.4rem' : '0.52rem', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif' }}>Sold Out</p>
                  </div>
                </div>
              )}
              {product.category && (
                <div style={{ position: 'absolute', top: isMobile ? '0.5rem' : '1rem', left: isMobile ? '0.5rem' : '1rem', zIndex: 2, background: 'rgba(4,3,2,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(201,168,76,0.2)', padding: isMobile ? '0.18rem 0.4rem' : '0.3rem 0.8rem' }}>
                  <p style={{ fontSize: isMobile ? '0.37rem' : '0.45rem', color: '#C9A84C', letterSpacing: isMobile ? '0.2em' : '0.35em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif' }}>{product.category}</p>
                </div>
              )}
              {product.isNew && (
                <div style={{ position: 'absolute', top: isMobile ? '0.5rem' : '1rem', right: isMobile ? '0.5rem' : '1rem', zIndex: 2, background: '#C9A84C', padding: isMobile ? '0.18rem 0.4rem' : '0.3rem 0.8rem' }}>
                  <p style={{ fontSize: isMobile ? '0.37rem' : '0.45rem', color: '#080604', letterSpacing: isMobile ? '0.2em' : '0.35em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif', fontWeight: 500 }}>New</p>
                </div>
              )}
            </div>
            <div style={{ padding: isMobile ? '0.8rem 0.8rem 1rem' : '1.6rem 1.6rem 2rem' }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: isMobile ? '0.95rem' : '1.4rem', fontWeight: 300, color: hovered ? '#FFFFFF' : '#E8E0D0', marginBottom: isMobile ? '0.3rem' : '0.6rem', letterSpacing: '0.02em', textShadow: hovered ? '0 0 30px rgba(255,255,255,0.15)' : 'none', transition: 'color 0.3s,text-shadow 0.3s', lineHeight: 1.3 }}>{product.name}</h3>
              {!isMobile && product.description && (
                <p style={{ fontSize: '0.6rem', color: hovered ? '#666' : '#4A4030', lineHeight: 1.9, letterSpacing: '0.06em', marginBottom: '1.2rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', transition: 'color 0.3s' }}>{product.description}</p>
              )}
              {!isMobile && availableSizes.length > 0 && (
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  {availableSizes.map((s) => <span key={s} style={{ fontSize: '0.48rem', color: hovered ? 'rgba(201,168,76,0.7)' : '#444', border: '1px solid', borderColor: hovered ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)', padding: '0.2rem 0.5rem', letterSpacing: '0.12em', fontFamily: 'Montserrat,sans-serif', transition: 'all 0.35s' }}>{s}</span>)}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(201,168,76,0.08)', paddingTop: isMobile ? '0.6rem' : '1.2rem' }}>
                <div>
                  <p style={{ fontSize: isMobile ? '0.36rem' : '0.44rem', color: '#3A3020', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif', marginBottom: isMobile ? '0.15rem' : '0.25rem' }}>Price</p>
                  <p style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: isMobile ? '1.05rem' : '1.7rem', fontWeight: 300, color: hovered ? '#C9A84C' : 'rgba(201,168,76,0.8)', textShadow: hovered ? '0 0 30px rgba(201,168,76,0.35)' : 'none', transition: 'color 0.3s,text-shadow 0.3s', lineHeight: 1 }}>R {Number(product.price).toFixed(2)}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', opacity: hovered ? 1 : 0, transform: hovered ? 'translateX(0)' : 'translateX(-12px)', transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
                  <div style={{ width: isMobile ? '10px' : '20px', height: '1px', background: '#C9A84C' }} />
                  <span style={{ fontSize: isMobile ? '0.38rem' : '0.48rem', color: '#C9A84C', letterSpacing: '0.28em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif' }}>View</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BorderGlowCard>
    </Link>
  );
}

function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '8rem 0', position: 'relative' }}>
      {[1, 2, 3].map((i) => <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: `${i * 70}px`, height: `${i * 70}px`, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.15)', transform: 'translate(-50%,-50%)', animation: `rrPulse ${1.5 + i * 0.4}s ease-in-out infinite alternate`, animationDelay: `${i * 0.3}s` }} />)}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ width: '1px', height: '50px', background: 'linear-gradient(180deg,#C9A84C,transparent)', margin: '0 auto 2rem', animation: 'rrScrollPulse 1.8s ease-in-out infinite' }} />
        <p style={{ fontSize: '0.52rem', color: '#C9A84C', letterSpacing: '0.5em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif' }}>Loading Collection</p>
      </div>
    </div>
  );
}

function EmptyState({ filtered }) {
  return (
    <div style={{ textAlign: 'center', padding: '8rem 0' }}>
      <p style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '2.5rem', fontWeight: 300, color: 'rgba(201,168,76,0.2)', marginBottom: '1.5rem' }}>{filtered ? 'No results' : 'Coming Soon'}</p>
      <div style={{ width: '50px', height: '1px', background: 'rgba(201,168,76,0.3)', margin: '0 auto 1.5rem' }} />
      <p style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif' }}>{filtered ? 'Try a different filter' : 'New pieces arriving soon'}</p>
    </div>
  );
}

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('default');
  const [heroVisible, setHeroVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => { const t = setTimeout(() => setHeroVisible(true), 80); return () => clearTimeout(t); }, []);

  useEffect(() => {
    (async () => {
      try { const s = await getDocs(collection(db, 'products')); setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() }))); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  const filtered = products
    .filter((p) => p.stock !== 0)
    .filter((p) => activeCategory === 'All' || p.category === activeCategory)
    .sort((a, b) => {
      if (sortBy === 'price-asc') return Number(a.price) - Number(b.price);
      if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <ClickSpark sparkColor="#C9A84C" sparkSize={7} sparkRadius={14} sparkCount={8} duration={400}>
      <div style={{ background: '#040302', minHeight: '100vh', overflowX: 'hidden' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap');
          @keyframes rrPulse{from{opacity:0.1;transform:translate(-50%,-50%) scale(0.95);}to{opacity:0.5;transform:translate(-50%,-50%) scale(1.05);}}
          @keyframes rrScrollPulse{0%,100%{opacity:0.8;transform:scaleY(1);}50%{opacity:0.1;transform:scaleY(0.2);}}
          @keyframes sparkFly{0%{transform:translate(-50%,-50%) scale(1);opacity:1;}100%{transform:translate(calc(-50% + cos(var(--angle)) * var(--radius) * 3),calc(-50% + sin(var(--angle)) * var(--radius) * 3)) scale(0);opacity:0;}}
          .tc-wrapper{position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;z-index:99999;will-change:transform;}
          .tc-dot{position:absolute;width:5px;height:5px;border-radius:50%;background:#C9A84C;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 0 8px rgba(201,168,76,0.8),0 0 16px rgba(201,168,76,0.4);}
          .tc-corner{position:absolute;width:12px;height:12px;border-color:#C9A84C;border-style:solid;border-width:0;will-change:transform;filter:drop-shadow(0 0 4px rgba(201,168,76,0.6));}
          .tc-tl{border-top-width:2px;border-left-width:2px;transform:translate(-18px,-18px);}
          .tc-tr{border-top-width:2px;border-right-width:2px;transform:translate(6px,-18px);}
          .tc-br{border-bottom-width:2px;border-right-width:2px;transform:translate(6px,6px);}
          .tc-bl{border-bottom-width:2px;border-left-width:2px;transform:translate(-18px,6px);}
          .filter-bar-inner{max-width:1380px;margin:0 auto;padding:1.2rem 4rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;}
          .product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:2px;background:rgba(201,168,76,0.04);}
          .shop-section{padding:5rem 4rem 8rem;max-width:1380px;margin:0 auto;}
          @media(max-width:768px){
            .filter-bar-inner{padding:1rem 1rem;flex-direction:column;align-items:flex-start;}
            .filter-pills{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:4px;width:100%;}
            .filter-pills::-webkit-scrollbar{display:none;}
            .filter-pills-inner{display:flex;gap:0.5rem;width:max-content;}
            .sort-count-row{width:100%;display:flex;justify-content:space-between;align-items:center;}
            .product-grid{grid-template-columns:repeat(2,1fr)!important;gap:1px;}
            .shop-section{padding:2rem 0.75rem 4rem;}
            .hero-section{padding:4rem 1.5rem 3rem!important;}
            .hero-h1{font-size:clamp(2.2rem,11vw,4rem)!important;}
          }
          @media(max-width:380px){.product-grid{grid-template-columns:1fr!important;}}
          @media(min-width:769px){*{cursor:none!important;}select{cursor:none!important;}}
          select option{background:#080604;color:#888;}
        `}</style>

        {!isMobile && (
          <TargetCursor
            targetSelector="a, button"
            spinDuration={2.4}
            hideDefaultCursor={true}
            hoverDuration={0.18}
            parallaxOn={true}
          />
        )}

        <PrismHero>
          <section className="hero-section" style={{ padding: '7rem 2rem 6rem', textAlign: 'center', minHeight: '420px', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(20px)', transition: 'opacity 0.9s ease 0.15s,transform 0.9s ease 0.15s' }}>
              <div style={{ width: '35px', height: '1px', background: 'linear-gradient(90deg,transparent,#C9A84C)' }} />
              <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.55em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif', fontWeight: 300 }}>Browse</p>
              <div style={{ width: '35px', height: '1px', background: 'linear-gradient(90deg,#C9A84C,transparent)' }} />
            </div>
            <div style={{ overflow: 'hidden', marginBottom: '0.3rem' }}>
              <h1 className="hero-h1" style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 'clamp(3.5rem,10vw,8.5rem)', fontWeight: 300, color: '#FFFFFF', letterSpacing: '-0.01em', lineHeight: 1, textShadow: '0 0 80px rgba(255,255,255,0.15),0 4px 40px rgba(0,0,0,0.5),0 0 120px rgba(201,168,76,0.3)', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(80%)', transition: 'opacity 1.1s cubic-bezier(0.16,1,0.3,1) 0.3s,transform 1.1s cubic-bezier(0.16,1,0.3,1) 0.3s' }}>
                Our{' '}<em style={{ color: '#C9A84C', fontStyle: 'normal', textShadow: '0 0 60px rgba(201,168,76,1),0 0 120px rgba(201,168,76,0.7),0 4px 40px rgba(0,0,0,0.4)' }}>Collection</em>
              </h1>
            </div>
            <div style={{ width: heroVisible ? '100px' : '0px', height: '1px', background: 'linear-gradient(90deg,transparent,#C9A84C,transparent)', margin: '2.5rem auto', transition: 'width 1.4s cubic-bezier(0.16,1,0.3,1) 0.7s' }} />
            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', maxWidth: '480px', margin: '0 auto', lineHeight: 2, letterSpacing: '0.12em', fontFamily: 'Montserrat,sans-serif', fontWeight: 200, opacity: heroVisible ? 1 : 0, transition: 'opacity 1s ease 0.9s', textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
              Discover our range of premium clothing, designed with quality and style in mind.
            </p>
          </section>
        </PrismHero>

        <div style={{ borderBottom: '1px solid rgba(201,168,76,0.08)', background: 'rgba(5,4,3,0.98)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 10 }}>
          <div className="filter-bar-inner">
            <div className="filter-pills">
              <div className="filter-pills-inner">
                {categories.map((cat) => <FilterPill key={cat} label={cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)} />)}
              </div>
            </div>
            <div className="sort-count-row" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              {!loading && <p style={{ fontSize: '0.5rem', color: '#3A3020', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif' }}><span style={{ color: '#C9A84C' }}>{filtered.length}</span> items</p>}
              <div style={{ position: 'relative' }}>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ appearance: 'none', background: 'transparent', border: '1px solid rgba(201,168,76,0.15)', color: '#666', fontFamily: 'Montserrat,sans-serif', fontSize: '0.5rem', letterSpacing: '0.3em', textTransform: 'uppercase', padding: '0.5rem 2rem 0.5rem 0.9rem', cursor: 'pointer', outline: 'none' }}>
                  <option value="default">Sort: Default</option>
                  <option value="price-asc">Price: Low → High</option>
                  <option value="price-desc">Price: High → Low</option>
                  <option value="name">Name: A → Z</option>
                </select>
                <div style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderLeft: '3px solid transparent', borderRight: '3px solid transparent', borderTop: '4px solid rgba(201,168,76,0.4)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
        </div>

        <section className="shop-section">
          {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState filtered={activeCategory !== 'All'} /> : (
            <div className="product-grid">
              {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} isMobile={isMobile} />)}
            </div>
          )}
        </section>
      </div>
    </ClickSpark>
  );
}