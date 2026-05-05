'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { Renderer, Triangle, Program, Mesh, Vec3 } from 'ogl';

function useElementScroll() {
  const ref = useRef(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    let ticking = false;
    const update = () => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const vh = window.innerHeight;
      setP(Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height))));
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return [ref, p];
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

function hexToVec3(color) {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    return new Vec3(r, g, b);
  }
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return new Vec3(parseInt(rgbMatch[1]) / 255, parseInt(rgbMatch[2]) / 255, parseInt(rgbMatch[3]) / 255);
  }
  return new Vec3(0, 0, 0);
}

function Orb({ hue = 0, hoverIntensity = 0.2, rotateOnHover = true, forceHoverState = false, backgroundColor = '#040302' }) {
  const ctnDom = useRef(null);

  useEffect(() => {
    const container = ctnDom.current;
    if (!container) return;

    const vert = `
      precision highp float;
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const frag = `
      precision highp float;
      uniform float iTime;
      uniform vec3 iResolution;
      uniform float hue;
      uniform float hover;
      uniform float rot;
      uniform float hoverIntensity;
      uniform vec3 backgroundColor;
      varying vec2 vUv;

      vec3 rgb2yiq(vec3 c) {
        float y = dot(c, vec3(0.299, 0.587, 0.114));
        float i = dot(c, vec3(0.596, -0.274, -0.322));
        float q = dot(c, vec3(0.211, -0.523, 0.312));
        return vec3(y, i, q);
      }
      vec3 yiq2rgb(vec3 c) {
        float r = c.x + 0.956 * c.y + 0.621 * c.z;
        float g = c.x - 0.272 * c.y - 0.647 * c.z;
        float b = c.x - 1.106 * c.y + 1.703 * c.z;
        return vec3(r, g, b);
      }
      vec3 adjustHue(vec3 color, float hueDeg) {
        float hueRad = hueDeg * 3.14159265 / 180.0;
        vec3 yiq = rgb2yiq(color);
        float cosA = cos(hueRad);
        float sinA = sin(hueRad);
        float i = yiq.y * cosA - yiq.z * sinA;
        float q = yiq.y * sinA + yiq.z * cosA;
        yiq.y = i;
        yiq.z = q;
        return yiq2rgb(yiq);
      }
      vec3 hash33(vec3 p3) {
        p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
        p3 += dot(p3, p3.yxz + 19.19);
        return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
      }
      float snoise3(vec3 p) {
        const float K1 = 0.333333333;
        const float K2 = 0.166666667;
        vec3 i = floor(p + (p.x + p.y + p.z) * K1);
        vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
        vec3 e = step(vec3(0.0), d0 - d0.yzx);
        vec3 i1 = e * (1.0 - e.zxy);
        vec3 i2 = 1.0 - e.zxy * (1.0 - e);
        vec3 d1 = d0 - (i1 - K2);
        vec3 d2 = d0 - (i2 - K1);
        vec3 d3 = d0 - 0.5;
        vec4 h = max(0.6 - vec4(dot(d0,d0), dot(d1,d1), dot(d2,d2), dot(d3,d3)), 0.0);
        vec4 n = h*h*h*h * vec4(dot(d0,hash33(i)), dot(d1,hash33(i+i1)), dot(d2,hash33(i+i2)), dot(d3,hash33(i+1.0)));
        return dot(vec4(31.316), n);
      }
      vec4 extractAlpha(vec3 colorIn) {
        float a = max(max(colorIn.r, colorIn.g), colorIn.b);
        return vec4(colorIn.rgb / (a + 1e-5), a);
      }

      const vec3 baseColor1 = vec3(0.788, 0.659, 0.298);
      const vec3 baseColor2 = vec3(0.929, 0.816, 0.439);
      const vec3 baseColor3 = vec3(0.200, 0.157, 0.031);
      const float innerRadius = 0.6;
      const float noiseScale = 0.65;

      float hash1(float n) { return fract(sin(n) * 43758.5453); }
      float hash1b(float n) { return fract(cos(n * 1.618) * 27183.7); }

      float spikeProfile(float ang, float t) {
        float s1 = abs(fract(sin(ang * 19.673 + t * 0.9) * 43758.5) * 2.0 - 1.0);
        float s2 = abs(fract(sin(ang * 31.891 - t * 1.3) * 87613.2) * 2.0 - 1.0);
        float s3 = abs(fract(cos(ang * 47.213 + t * 0.6) * 15731.4) * 2.0 - 1.0);
        float combined = s1 * s2 + s3 * 0.4;
        return pow(clamp(combined, 0.0, 1.0), 2.8);
      }

      float light1(float intensity, float attenuation, float dist) {
        return intensity / (1.0 + dist * attenuation);
      }
      float light2(float intensity, float attenuation, float dist) {
        return intensity / (1.0 + dist * dist * attenuation);
      }

      vec4 draw(vec2 uv) {
        float scanY = floor(uv.y * 9.0 + iTime * 0.25);
        float glitchLine = step(0.94, hash1(scanY + iTime * 3.7)) * hover;
        float glitchDir = sign(hash1b(scanY) - 0.5);
        uv.x += glitchLine * glitchDir * 0.055 * hover;

        vec3 color1 = adjustHue(baseColor1, hue);
        vec3 color2 = adjustHue(baseColor2, hue);
        vec3 color3 = adjustHue(baseColor3, hue);

        float ang = atan(uv.y, uv.x);
        float len = length(uv);
        float invLen = len > 0.0 ? 1.0 / len : 0.0;

        float spikes = spikeProfile(ang, iTime) * hover * 0.42;

        float bgLuminance = dot(backgroundColor, vec3(0.299, 0.587, 0.114));
        float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
        float r0base = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
        float r0 = r0base + spikes;

        float d0 = distance(uv, (r0 * invLen) * uv);
        float v0 = light1(1.0, 10.0, d0);
        v0 *= smoothstep(r0 * 1.05, r0, len);
        float innerFade = smoothstep(r0 * 0.8, r0 * 0.95, len);
        v0 *= mix(innerFade, 1.0, bgLuminance * 0.7);

        float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;
        float a = iTime * -1.0;
        vec2 pos = vec2(cos(a), sin(a)) * r0;
        float d = distance(uv, pos);
        float v1 = light2(1.5, 5.0, d);
        v1 *= light1(1.0, 50.0, d0);

        float spikeGlow = spikes * smoothstep(r0 * 0.85, r0, len) * 2.5;
        v1 += spikeGlow;

        float v2 = smoothstep(1.0 + spikes * 0.5, mix(innerRadius, 1.0, n0 * 0.5), len);
        float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);

        vec3 colBase = mix(color1, color2, cl);
        float fadeAmount = mix(1.0, 0.1, bgLuminance);
        vec3 darkCol = mix(color3, colBase, v0);
        darkCol = (darkCol + v1) * v2 * v3;
        darkCol = clamp(darkCol, 0.0, 1.0);
        vec3 lightCol = (colBase + v1) * mix(1.0, v2 * v3, fadeAmount);
        lightCol = mix(backgroundColor, lightCol, v0);
        lightCol = clamp(lightCol, 0.0, 1.0);
        vec3 finalCol = mix(darkCol, lightCol, bgLuminance);

        vec3 spikeColor = color1 * 1.6;
        finalCol = mix(finalCol, spikeColor, spikes * v0 * hover * 0.6);

        return extractAlpha(finalCol);
      }

      vec4 mainImage(vec2 fragCoord) {
        vec2 center = iResolution.xy * 0.5;
        float size = min(iResolution.x, iResolution.y);
        vec2 uv = (fragCoord - center) / size * 2.0;
        float angle = rot;
        float s = sin(angle);
        float c = cos(angle);
        uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
        uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
        uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);
        return draw(uv);
      }
      void main() {
        vec2 fragCoord = vUv * iResolution.xy;
        vec4 col = mainImage(fragCoord);
        gl_FragColor = vec4(col.rgb * col.a, col.a);
      }
    `;

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vert,
      fragment: frag,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Vec3(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height) },
        hue: { value: hue },
        hover: { value: 0 },
        rot: { value: 0 },
        hoverIntensity: { value: hoverIntensity },
        backgroundColor: { value: hexToVec3(backgroundColor) },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      if (!container) return;
      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width * dpr, height * dpr);
      gl.canvas.style.width = width + 'px';
      gl.canvas.style.height = height + 'px';
      program.uniforms.iResolution.value.set(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    let targetHover = 0;
    let lastTime = 0;
    let currentRot = 0;
    const rotationSpeed = 0.3;

    const getUVHover = (clientX, clientY) => {
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const width = rect.width;
      const height = rect.height;
      const size = Math.min(width, height);
      const uvX = ((x - width / 2) / size) * 2.0;
      const uvY = ((y - height / 2) / size) * 2.0;
      return Math.sqrt(uvX * uvX + uvY * uvY) < 0.8 ? 1 : 0;
    };

    const handleMouseMove = (e) => {
      targetHover = getUVHover(e.clientX, e.clientY);
    };
    const handleMouseLeave = () => { targetHover = 0; };

    const handleTouchStart = (e) => {
      const t = e.touches[0];
      targetHover = getUVHover(t.clientX, t.clientY);
    };
    const handleTouchMove = (e) => {
      const t = e.touches[0];
      targetHover = getUVHover(t.clientX, t.clientY);
    };
    const handleTouchEnd = () => {
      setTimeout(() => { targetHover = 0; }, 800);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    let rafId;
    const update = (t) => {
      rafId = requestAnimationFrame(update);
      const dt = (t - lastTime) * 0.001;
      lastTime = t;
      program.uniforms.iTime.value = t * 0.001;
      program.uniforms.hue.value = hue;
      program.uniforms.hoverIntensity.value = hoverIntensity;
      program.uniforms.backgroundColor.value = hexToVec3(backgroundColor);
      const effectiveHover = forceHoverState ? 1 : targetHover;
      program.uniforms.hover.value += (effectiveHover - program.uniforms.hover.value) * 0.1;
      if (rotateOnHover && effectiveHover > 0.5) currentRot += dt * rotationSpeed;
      program.uniforms.rot.value = currentRot;
      renderer.render({ scene: mesh });
    };
    rafId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      if (gl.canvas.parentElement) gl.canvas.parentElement.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [hue, hoverIntensity, rotateOnHover, forceHoverState, backgroundColor]);

  return (
    <div
      ref={ctnDom}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
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

function MobileNav({ items }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', gap: '5px', padding: '4px',
        }}
        aria-label="Toggle menu"
      >
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            display: 'block', width: '22px', height: '1px', background: '#C9A84C',
            transition: 'all 0.3s',
            transform: open
              ? i === 0 ? 'rotate(45deg) translate(4px, 4px)'
                : i === 2 ? 'rotate(-45deg) translate(4px, -4px)'
                : 'scaleX(0)'
              : 'none',
            opacity: open && i === 1 ? 0 : 1,
          }} />
        ))}
      </button>
      {open && (
        <div style={{
          position: 'fixed', top: '60px', left: 0, right: 0,
          background: 'rgba(4,3,2,0.98)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(201,168,76,0.12)',
          padding: '1.5rem 0', zIndex: 999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0',
        }}>
          {items.map((item) => (
            <Link key={item.label} href={item.href} onClick={() => setOpen(false)} style={{
              width: '100%', textAlign: 'center', padding: '1rem 2rem',
              fontSize: '0.65rem', fontFamily: 'Montserrat, sans-serif',
              fontWeight: 300, letterSpacing: '0.3em', textTransform: 'uppercase',
              color: 'rgba(201,168,76,0.8)', textDecoration: 'none',
              borderBottom: '1px solid rgba(201,168,76,0.06)',
            }}>{item.label}</Link>
          ))}
          <Link href="/shop" onClick={() => setOpen(false)} style={{
            marginTop: '1rem',
            fontSize: '0.6rem', fontFamily: 'Montserrat, sans-serif', fontWeight: 400,
            letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C9A84C', textDecoration: 'none',
            border: '1px solid rgba(201,168,76,0.4)', padding: '0.6rem 1.5rem',
          }}>Shop</Link>
        </div>
      )}
    </>
  );
}

function GooeyNav({ items, initialActiveIndex = 0 }) {
  const [active, setActive] = useState(initialActiveIndex);
  const [particles, setParticles] = useState([]);
  const isMobile = useIsMobile();
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
      position: 'fixed', top: 0, left: 0, right: 0, height: '60px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.5rem', background: 'rgba(4,3,2,0.92)',
      backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.12)', zIndex: 1000,
    }}>
      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 300, color: '#C9A84C', letterSpacing: '0.08em' }}>R&amp;R</div>
      {isMobile ? (
        <MobileNav items={items} />
      ) : (
        <>
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
        </>
      )}
    </nav>
  );
}

function LiquidChrome({ baseColor = [0.1, 0.1, 0.1], speed = 0.2, amplitude = 0.3, frequencyX = 3, frequencyY = 3, interactive = true }) {
  const containerRef = useRef(null);
  const isMobile = useIsMobile();
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
    if (interactive && !isMobile) container.addEventListener('mousemove', handleMouseMove);
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
      if (interactive && !isMobile) container.removeEventListener('mousemove', handleMouseMove);
      if (gl.canvas.parentElement) gl.canvas.parentElement.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [baseColor, speed, amplitude, frequencyX, frequencyY, interactive, isMobile]);
  return <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />;
}

function Marquee() {
  const items = ['Premium Quality', '✦', 'South African Brand', '✦', 'Sport & Lifestyle', '✦', '118 Pieces', '✦', 'New Arrivals', '✦', 'Luxury Essentials', '✦'];
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

function CategoryCard({ cat, index, sectionProgress }) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);
  const glowRef = useRef(null);
  const isMobile = useIsMobile();

  const delay = index * 0.13;
  const cardProgress = Math.max(0, Math.min(1, (sectionProgress - 0.1 - delay) / 0.45));
  const enterY = (1 - cardProgress) * 80;
  const enterOp = Math.min(1, cardProgress * 1.2);

  const handleMouseMove = useCallback((e) => {
    if (isMobile) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x: x - 0.5, y: y - 0.5 });
    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(400px circle at ${x * 100}% ${y * 100}%, rgba(201,168,76,0.12) 0%, transparent 65%)`;
    }
  }, [isMobile]);

  const tiltX = (!isMobile && hovered) ? mousePos.y * -18 : 0;
  const tiltY = (!isMobile && hovered) ? mousePos.x * 22 : 0;

  return (
    <Link href={`/shop?category=${cat.label.toLowerCase()}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        ref={cardRef}
        onMouseEnter={() => !isMobile && setHovered(true)}
        onMouseLeave={() => { if (isMobile) return; setHovered(false); setMousePos({ x: 0, y: 0 }); if (glowRef.current) glowRef.current.style.background = 'none'; }}
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
          padding: isMobile ? '2rem 1.5rem' : '3.5rem 2.4rem',
          cursor: 'pointer',
          minHeight: isMobile ? 'auto' : undefined,
        }}
      >
        <div ref={glowRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', transition: 'background 0.1s', zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(201,168,76,0.006) 2px, rgba(201,168,76,0.006) 3px)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '1px', width: hovered ? '100%' : '0%', background: 'linear-gradient(90deg, transparent, #C9A84C 30%, #EDD070 50%, #C9A84C 70%, transparent)', transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)', zIndex: 1 }} />
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
        <div style={{ position: 'relative', zIndex: 2 }}>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.6rem', color: hovered ? '#C9A84C' : 'rgba(201,168,76,0.22)', letterSpacing: '0.3em', marginBottom: isMobile ? '1rem' : '1.8rem', transition: 'color 0.4s' }}>
            {String(index + 1).padStart(2, '0')}
          </p>
          <span style={{
            fontSize: isMobile ? '2rem' : '3rem', display: 'block', marginBottom: isMobile ? '1rem' : '1.8rem',
            transform: hovered ? 'scale(1.15) rotate(-8deg)' : 'scale(1)',
            transition: 'transform 0.55s cubic-bezier(0.16,1,0.3,1)',
            filter: hovered ? 'drop-shadow(0 0 16px rgba(201,168,76,0.5))' : 'none',
          }}>{cat.icon}</span>
          <h3 style={{
            fontFamily: 'Cormorant Garamond, serif', fontSize: isMobile ? '1.4rem' : '1.95rem', fontWeight: 300,
            color: hovered ? '#FFFFFF' : '#C8BC9E',
            marginBottom: '0.7rem', transition: 'color 0.3s',
            textShadow: hovered ? '0 0 40px rgba(255,255,255,0.18)' : 'none',
          }}>{cat.label}</h3>
          <p style={{ fontSize: '0.6rem', color: hovered ? 'rgba(201,168,76,0.5)' : 'rgba(100,90,70,0.8)', letterSpacing: '0.1em', lineHeight: 2, transition: 'color 0.3s' }}>
            {cat.desc}
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: isMobile ? '1.2rem' : '2rem',
            opacity: isMobile ? 1 : hovered ? 1 : 0,
            transform: isMobile ? 'none' : hovered ? 'translateX(0)' : 'translateX(-14px)',
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
  const isMobile = useIsMobile();
  const romans = ['I', 'II', 'III', 'IV'];
  const icons = ['◈', '◆', '◉', '◇'];

  const delay = index * 0.13;
  const cardP = Math.max(0, Math.min(1, (sectionProgress - 0.08 - delay) / 0.5));
  const entryY = (1 - cardP) * 80;

  const handleMouseMove = useCallback((e) => {
    if (isMobile) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x: x - 0.5, y: y - 0.5 });
    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(350px circle at ${x * 100}% ${y * 100}%, rgba(201,168,76,0.11) 0%, transparent 65%)`;
    }
  }, [isMobile]);

  const tiltX = (!isMobile && hovered) ? mousePos.y * -14 : 0;
  const tiltY = (!isMobile && hovered) ? mousePos.x * 18 : 0;

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => { if (isMobile) return; setHovered(false); setMousePos({ x: 0, y: 0 }); if (glowRef.current) glowRef.current.style.background = 'none'; }}
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
        padding: isMobile ? '2.5rem 1.5rem' : '3.8rem 2.2rem',
        cursor: 'default',
      }}
    >
      <div ref={glowRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(201,168,76,0.005) 2px, rgba(201,168,76,0.005) 3px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, height: '1px', width: hovered ? '100%' : '0%', background: 'linear-gradient(90deg, transparent, #C9A84C 30%, #EDD070 50%, #C9A84C 70%, transparent)', transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)', zIndex: 1 }} />
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
      <div style={{ position: 'absolute', top: '-1rem', right: '1rem', fontFamily: 'Cormorant Garamond, serif', fontSize: isMobile ? '4rem' : '5.5rem', fontWeight: 300, color: hovered ? 'rgba(201,168,76,0.09)' : 'rgba(201,168,76,0.03)', transition: 'color 0.5s', userSelect: 'none', pointerEvents: 'none', zIndex: 0 }}>{romans[index]}</div>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{
          fontSize: '1.6rem', color: hovered ? '#C9A84C' : 'rgba(201,168,76,0.3)',
          marginBottom: '1.6rem',
          transform: hovered ? 'scale(1.2) rotate(15deg)' : 'scale(1) rotate(0deg)',
          transition: 'all 0.55s cubic-bezier(0.16,1,0.3,1)',
          filter: hovered ? 'drop-shadow(0 0 12px rgba(201,168,76,0.6))' : 'none',
          display: 'block',
        }}>{icons[index]}</div>
        <div style={{ width: hovered ? '55px' : '18px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '0 auto 1.8rem', transition: 'width 0.55s cubic-bezier(0.16,1,0.3,1)' }} />
        <h3 style={{
          fontFamily: 'Cormorant Garamond, serif', fontSize: isMobile ? '1.4rem' : '1.6rem', fontWeight: 300,
          color: hovered ? '#FFFFFF' : '#C8BC9E',
          marginBottom: '1rem', transition: 'color 0.3s',
          textShadow: hovered ? '0 0 40px rgba(255,255,255,0.15)' : 'none',
          letterSpacing: '0.02em',
        }}>{value.title}</h3>
        <p style={{ fontSize: '0.62rem', color: hovered ? 'rgba(201,168,76,0.45)' : 'rgba(100,90,70,0.75)', lineHeight: 2.1, letterSpacing: '0.06em', transition: 'color 0.3s' }}>{value.desc}</p>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginTop: '1.8rem',
          opacity: isMobile ? 1 : hovered ? 1 : 0,
          transform: isMobile ? 'none' : hovered ? 'translateY(0)' : 'translateY(8px)',
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
  const isMobile = useIsMobile();
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
      if (!enableMouseInteraction || isMobile) return;
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
        const mousePull = (enableMouseInteraction && !isMobile) ? (1 - Math.min(1, mouseDistY * 3)) * mouseInfluence : 0;
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
  }, [speed, innerLineCount, warpIntensity, color1, color2, brightness, enableMouseInteraction, mouseInfluence, isMobile]);
  return (
    <div ref={wrapperRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}

export default function HomePage() {
  const [heroVisible, setHeroVisible] = useState(false);
  const [orbHovered, setOrbHovered] = useState(false);
  const [mobileOrbActive, setMobileOrbActive] = useState(false);
  const heroSectionRef = useRef(null);
  const mobileOrbTimerRef = useRef(null);
  const [heroRef, heroScroll] = useElementScroll();
  const [collectionsRef, collectionsScroll] = useElementScroll();
  const [brandRef, brandScroll] = useElementScroll();
  const [valuesRef, valuesScroll] = useElementScroll();
  const isMobile = useIsMobile();

  const handleHeroMouseMove = useCallback((e) => {
    if (isMobile || !heroSectionRef.current) return;
    const rect = heroSectionRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const orbRadius = 475;
    const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2);
    setOrbHovered(dist < orbRadius * 0.82);
  }, [isMobile]);

  const handleHeroMouseLeave = useCallback(() => setOrbHovered(false), []);

  const handleHeroTouchStart = useCallback((e) => {
    if (!isMobile) return;
    if (mobileOrbTimerRef.current) clearTimeout(mobileOrbTimerRef.current);
    setMobileOrbActive(true);
    mobileOrbTimerRef.current = setTimeout(() => {
      setMobileOrbActive(false);
    }, 1200);
  }, [isMobile]);

  useEffect(() => {
    return () => {
      if (mobileOrbTimerRef.current) clearTimeout(mobileOrbTimerRef.current);
    };
  }, []);

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

  const mobileOrbSize = 'min(100vw, 420px)';

  return (
    <ClickSpark sparkColor="#C9A84C" sparkSize={7} sparkRadius={14} sparkCount={8} duration={400}>
      <div style={{ paddingTop: '60px', background: '#040302', overflowX: 'hidden' }}>

        {!isMobile && (
          <TargetCursor
            targetSelector="a, button"
            spinDuration={2.4}
            hideDefaultCursor={true}
            hoverDuration={0.18}
            parallaxOn={true}
          />
        )}

        <GooeyNav items={navItems} initialActiveIndex={0} />

        <section
          ref={(el) => { heroRef.current = el; heroSectionRef.current = el; }}
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={handleHeroMouseLeave}
          onTouchStart={handleHeroTouchStart}
          style={{
            minHeight: isMobile ? '100svh' : '85vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: isMobile ? '0' : '3rem 2rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)', backgroundSize: '88px 88px', transform: `perspective(800px) rotateX(${55 + heroScroll * 14}deg) translateZ(-80px) scale(2.2)`, transformOrigin: '50% 100%', opacity: 0.5, zIndex: 1, pointerEvents: 'none' }} />

          {isMobile ? (
            <>
              <div style={{
                position: 'absolute',
                top: '38%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: mobileOrbSize,
                height: mobileOrbSize,
                zIndex: 2,
                pointerEvents: 'none',
              }}>
                <Orb
                  hue={0}
                  hoverIntensity={0.3}
                  rotateOnHover={false}
                  forceHoverState={mobileOrbActive}
                  backgroundColor="#040302"
                />
              </div>

              <div style={{
                maxWidth: '100%',
                width: '100%',
                position: 'relative',
                zIndex: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100svh',
                padding: '5rem 2rem 3rem',
              }}>
                <div style={{ marginBottom: '0.8rem', width: '100%' }}>
                  {[
                    { text: 'R&R', gold: true, delay: 0.35 },
                    { text: 'Sport &', gold: false, delay: 0.52 },
                    { text: 'Lifestyle', gold: false, delay: 0.69 },
                  ].map((word, i) => (
                    <div key={i} style={{ overflow: 'hidden', lineHeight: 1.05 }}>
                      <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(100%)', transition: `opacity 1.2s cubic-bezier(0.16,1,0.3,1) ${word.delay}s, transform 1.2s cubic-bezier(0.16,1,0.3,1) ${word.delay}s` }}>
                        <span style={{
                          fontFamily: 'Cormorant Garamond, serif',
                          fontSize: 'clamp(3rem, 16vw, 5rem)',
                          fontWeight: word.gold ? 300 : 400,
                          color: word.gold ? '#C9A84C' : '#FFFFFF',
                          display: 'block',
                          letterSpacing: word.gold ? '-0.02em' : '-0.01em',
                          textShadow: word.gold
                            ? '0 0 80px rgba(201,168,76,0.7), 0 0 160px rgba(201,168,76,0.4)'
                            : '0 0 12px rgba(0,0,0,1), 0 0 24px rgba(0,0,0,1), 0 0 40px rgba(0,0,0,1)',
                          lineHeight: 1.05,
                        }} dangerouslySetInnerHTML={{ __html: word.text }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ width: heroVisible ? '70px' : '0px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '1rem auto', transition: 'width 1.6s cubic-bezier(0.16,1,0.3,1) 0.9s' }} />

                <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.8)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0', fontFamily: 'Montserrat, sans-serif', fontWeight: 200, opacity: heroVisible ? 1 : 0, transition: 'opacity 1s ease 1.2s' }}>Own the Look · Own the Moment</p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2.5rem', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(20px)', transition: 'opacity 1s ease 1.5s, transform 1s ease 1.5s' }}>
                  <Link href="/shop" className="rr-btn-primary">Shop the Collection</Link>
                  <Link href="/about" className="rr-btn-outline">Our Story</Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '950px',
                height: '950px',
                zIndex: 2,
                pointerEvents: 'none',
              }}>
                <Orb
                  hue={0}
                  hoverIntensity={0.3}
                  rotateOnHover={true}
                  forceHoverState={orbHovered}
                  backgroundColor="#040302"
                />
              </div>

              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '680px', height: '680px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.04) 0%, rgba(201,168,76,0.01) 40%, transparent 65%)', pointerEvents: 'none', zIndex: 3, animation: 'rrBloom 4s ease-in-out infinite alternate' }} />

              <div style={{
                maxWidth: '820px',
                width: '100%',
                position: 'relative',
                zIndex: 4,
                transform: `translateY(${heroTranslateY}px)`,
                opacity: heroOpacity,
                willChange: 'transform, opacity',
                backfaceVisibility: 'hidden',
                padding: '2.5rem 4rem',
              }}>
                <div style={{ marginBottom: '1.2rem' }}>
                  {[
                    { text: 'R&R', gold: true, delay: 0.35 },
                    { text: 'Sport &', gold: false, delay: 0.52 },
                    { text: 'Lifestyle', gold: false, delay: 0.69 },
                  ].map((word, i) => (
                    <div key={i} style={{ overflow: 'hidden', lineHeight: 1.02 }}>
                      <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(100%)', transition: `opacity 1.2s cubic-bezier(0.16,1,0.3,1) ${word.delay}s, transform 1.2s cubic-bezier(0.16,1,0.3,1) ${word.delay}s` }}>
                        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(2.4rem, 6.5vw, 5.5rem)', fontWeight: word.gold ? 300 : 400, color: word.gold ? '#C9A84C' : '#FFFFFF', display: 'block', letterSpacing: word.gold ? '-0.02em' : '-0.01em', textShadow: word.gold ? '0 0 80px rgba(201,168,76,0.7), 0 0 160px rgba(201,168,76,0.4)' : '0 0 8px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,1), 0 0 28px rgba(0,0,0,1), 0 0 50px rgba(0,0,0,0.9)', lineHeight: 1.02 }} dangerouslySetInnerHTML={{ __html: word.text }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ width: heroVisible ? '110px' : '0px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '2.2rem auto', transition: 'width 1.6s cubic-bezier(0.16,1,0.3,1) 0.9s' }} />
                <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.42em', textTransform: 'uppercase', marginBottom: '3rem', fontFamily: 'Montserrat, sans-serif', fontWeight: 200, opacity: heroVisible ? 1 : 0, transition: 'opacity 1s ease 1.2s' }}>Own the Look · Own the Moment</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(20px)', transition: 'opacity 1s ease 1.5s, transform 1s ease 1.5s' }}>
                  <Link href="/shop" className="rr-btn-primary">Shop the Collection</Link>
                  <Link href="/about" className="rr-btn-outline">Our Story</Link>
                </div>
                <div style={{ marginTop: '3.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', opacity: heroVisible ? 0.55 : 0, transition: 'opacity 1s ease 2.2s' }}>
                  <p style={{ fontSize: '0.44rem', color: '#C9A84C', letterSpacing: '0.5em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>Scroll</p>
                  <div style={{ width: '1px', height: '50px', background: 'linear-gradient(180deg, #C9A84C, transparent)', animation: 'rrScrollPulse 2s ease-in-out infinite' }} />
                </div>
              </div>
            </>
          )}
        </section>

        <div style={{ position: 'relative', zIndex: 2 }}><Marquee /></div>

        <section ref={collectionsRef} style={{ padding: isMobile ? '5rem 1rem 4rem' : '11rem 4rem 10rem', maxWidth: '1380px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? '3rem' : '7rem', transform: `translateZ(0) translateY(${Math.max(0, (0.5 - collectionsScroll) * 60)}px)`, opacity: Math.min(1, collectionsScroll * 3.5) }}>
            <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.2rem', fontFamily: 'Montserrat, sans-serif' }}>Browse</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: isMobile ? 'clamp(2rem, 10vw, 3.5rem)' : 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 300, color: '#FFFFFF', textShadow: '0 0 60px rgba(255,255,255,0.07)' }}>Our Collections</h2>
            <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '1.8rem auto 0' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2px', background: 'rgba(201,168,76,0.06)' }}>
            {categories.map((cat, i) => <CategoryCard key={cat.label} cat={cat} index={i} sectionProgress={collectionsScroll} />)}
          </div>
        </section>

        <section ref={brandRef} style={{ backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: isMobile ? '6rem 1.5rem' : '11rem 2rem', textAlign: 'center', position: 'relative', zIndex: 2, overflow: 'hidden', perspective: '1200px', minHeight: isMobile ? '400px' : '600px' }}>
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <LiquidChrome baseColor={[0.1, 0.1, 0.1]} speed={1} amplitude={0.6} interactive={!isMobile} />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,3,2,0.78)', zIndex: 1, pointerEvents: 'none' }} />
          {!isMobile && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(10rem, 28vw, 24rem)', color: 'transparent', WebkitTextStroke: '1px rgba(201,168,76,0.045)', userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap', fontWeight: 300, transform: `translate3d(-50%,-50%,0) rotateX(${brandTilt}deg) scale(${brandScale})`, willChange: 'transform', zIndex: 2 }}>R&amp;R</div>
          )}
          <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 3, transform: isMobile ? 'none' : `rotateX(${brandTilt * 0.4}deg) scale(${0.94 + brandScroll * 0.09})`, opacity: isMobile ? 1 : Math.min(1, brandScroll * 3), willChange: 'transform, opacity', backfaceVisibility: 'hidden' }}>
            <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '2rem', fontFamily: 'Montserrat, sans-serif', textShadow: '0 0 20px rgba(201,168,76,0.5)' }}>Our Mission</p>
            <div style={{ position: 'relative', padding: isMobile ? '1.5rem' : '3rem 3.5rem', background: 'rgba(4,3,2,0.65)', border: '1px solid rgba(201,168,76,0.12)', backdropFilter: 'blur(12px)', marginBottom: isMobile ? '2rem' : '3.5rem' }}>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: isMobile ? 'clamp(1.3rem, 4.5vw, 2rem)' : 'clamp(1.8rem, 4vw, 3.2rem)', fontWeight: 300, fontStyle: 'italic', color: '#F5F0E8', lineHeight: 1.7, textShadow: '0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.8)', margin: 0 }}>
                "Premium clothing that combines{' '}
                <span style={{ color: '#EDD070', fontStyle: 'normal', textShadow: '0 0 30px rgba(201,168,76,0.7), 0 2px 20px rgba(0,0,0,0.9)' }}>elegance with comfort</span>,
                designed for the modern individual who lives without compromise."
              </h2>
            </div>
            <Link href="/about" className="rr-btn-outline">Read Our Story</Link>
          </div>
        </section>

        <section ref={valuesRef} style={{ padding: isMobile ? '5rem 1rem 4rem' : '11rem 4rem 10rem', maxWidth: '1300px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? '3rem' : '7rem', transform: `translateZ(0) translateY(${Math.max(0, (0.5 - valuesScroll) * 60)}px)`, opacity: Math.min(1, valuesScroll * 3.5) }}>
            <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: '0.6em', textTransform: 'uppercase', marginBottom: '1.2rem', fontFamily: 'Montserrat, sans-serif' }}>What We Stand For</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: isMobile ? 'clamp(2rem, 10vw, 3.5rem)' : 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 300, color: '#FFFFFF', textShadow: '0 0 60px rgba(255,255,255,0.07)' }}>Our Values</h2>
            <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '1.8rem auto 0' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2px', background: 'rgba(201,168,76,0.05)' }}>
            {values.map((v, i) => <ValueCard key={v.title} value={v} index={i} sectionProgress={valuesScroll} />)}
          </div>
        </section>

        <section style={{ padding: isMobile ? '7rem 1.5rem' : '14rem 2rem', textAlign: 'center', borderTop: '1px solid rgba(201,168,76,0.1)', position: 'relative', zIndex: 2, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <LineWaves
              speed={0.3}
              innerLineCount={isMobile ? 30 : 50}
              warpIntensity={1.6}
              color1="#C9A84C"
              color2="#8B6914"
              brightness={0.8}
              enableMouseInteraction={!isMobile}
              mouseInfluence={2.5}
            />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,3,2,0.2)', zIndex: 1, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p style={{ fontSize: '0.55rem', color: '#C9A84C', letterSpacing: isMobile ? '0.2em' : '0.6em', textTransform: 'uppercase', marginBottom: '2rem', fontFamily: 'Montserrat, sans-serif' }}>118 premium pieces — available now</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: isMobile ? 'clamp(2.5rem, 14vw, 5rem)' : 'clamp(3rem, 9vw, 7.5rem)', fontWeight: 300, lineHeight: 1.05, marginBottom: '3rem' }}>
              <span style={{ color: '#FFFFFF', textShadow: '0 0 80px rgba(255,255,255,0.08)', display: 'block' }}>Ready to</span>
              <span style={{ color: '#C9A84C', textShadow: '0 0 80px rgba(201,168,76,0.5), 0 0 160px rgba(201,168,76,0.2)', fontStyle: 'italic', display: 'block' }}>elevate</span>
              <span style={{ color: '#FFFFFF', textShadow: '0 0 80px rgba(255,255,255,0.08)', display: 'block' }}>your wardrobe?</span>
            </h2>
            <Link href="/shop" className="rr-btn-primary">Shop Now</Link>
          </div>
        </section>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap');

          @media (min-width: 769px) {
            * { cursor: none !important; }
          }

          html { scroll-behavior: smooth; }
          *, *::before, *::after { box-sizing: border-box; }

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

          .tc-tl { border-top-width: 2px; border-left-width: 2px; transform: translate(-18px, -18px); }
          .tc-tr { border-top-width: 2px; border-right-width: 2px; transform: translate(6px, -18px); }
          .tc-br { border-bottom-width: 2px; border-right-width: 2px; transform: translate(6px, 6px); }
          .tc-bl { border-bottom-width: 2px; border-left-width: 2px; transform: translate(-18px, 6px); }

          @keyframes rrMarquee {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
          @keyframes rrScrollPulse {
            0%,100% { opacity: 0.8; transform: scaleY(1); }
            50%     { opacity: 0.1; transform: scaleY(0.2); }
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
            padding: 1rem 2.4rem;
            background: #C9A84C;
            color: #080604;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.57rem; font-weight: 600;
            letter-spacing: 0.4em; text-transform: uppercase;
            text-decoration: none;
            position: relative; overflow: hidden;
            transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s;
            box-shadow: 0 8px 40px rgba(201,168,76,0.3);
            white-space: nowrap;
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
            padding: 1rem 2.4rem;
            border: 1px solid rgba(201,168,76,0.7);
            color: #C9A84C;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.57rem; font-weight: 300;
            letter-spacing: 0.4em; text-transform: uppercase;
            text-decoration: none;
            position: relative; overflow: hidden;
            transition: border-color 0.4s, transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s;
            white-space: nowrap;
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

          @media (max-width: 768px) {
            .rr-btn-primary, .rr-btn-outline {
              padding: 0.9rem 1.8rem;
              font-size: 0.54rem;
              letter-spacing: 0.2em;
            }
          }

          @media (max-width: 480px) {
            .rr-btn-primary, .rr-btn-outline {
              padding: 0.8rem 1.4rem;
              font-size: 0.5rem;
              letter-spacing: 0.18em;
            }
          }
        `}</style>
      </div>
    </ClickSpark>
  );
}