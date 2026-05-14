'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import * as THREE from 'three';
import { Effect, EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import { useAuth } from '@/lib/context/AuthContext';

const createTouchTexture = () => {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context not available');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.Texture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const trail = [];
  let last = null;
  const maxAge = 64;
  let radius = 0.1 * size;
  const speed = 1 / maxAge;
  const clear = () => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };
  const drawPoint = p => {
    const pos = { x: p.x * size, y: (1 - p.y) * size };
    let intensity = 1;
    const easeOutSine = t => Math.sin((t * Math.PI) / 2);
    const easeOutQuad = t => -t * (t - 2);
    if (p.age < maxAge * 0.3) intensity = easeOutSine(p.age / (maxAge * 0.3));
    else intensity = easeOutQuad(1 - (p.age - maxAge * 0.3) / (maxAge * 0.7)) || 0;
    intensity *= p.force;
    const color = `${((p.vx + 1) / 2) * 255}, ${((p.vy + 1) / 2) * 255}, ${intensity * 255}`;
    const offset = size * 5;
    ctx.shadowOffsetX = offset;
    ctx.shadowOffsetY = offset;
    ctx.shadowBlur = radius;
    ctx.shadowColor = `rgba(${color},${0.22 * intensity})`;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,0,0,1)';
    ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  const addTouch = norm => {
    let force = 0;
    let vx = 0;
    let vy = 0;
    if (last) {
      const dx = norm.x - last.x;
      const dy = norm.y - last.y;
      if (dx === 0 && dy === 0) return;
      const dd = dx * dx + dy * dy;
      const d = Math.sqrt(dd);
      vx = dx / (d || 1);
      vy = dy / (d || 1);
      force = Math.min(dd * 10000, 1);
    }
    last = { x: norm.x, y: norm.y };
    trail.push({ x: norm.x, y: norm.y, age: 0, force, vx, vy });
  };
  const update = () => {
    clear();
    for (let i = trail.length - 1; i >= 0; i--) {
      const point = trail[i];
      const f = point.force * speed * (1 - point.age / maxAge);
      point.x += point.vx * f;
      point.y += point.vy * f;
      point.age++;
      if (point.age > maxAge) trail.splice(i, 1);
    }
    for (let i = 0; i < trail.length; i++) drawPoint(trail[i]);
    texture.needsUpdate = true;
  };
  return {
    canvas, texture, addTouch, update,
    set radiusScale(v) { radius = 0.1 * size * v; },
    get radiusScale() { return radius / (0.1 * size); },
    size
  };
};

const createLiquidEffect = (texture, opts) => {
  const fragment = `
    uniform sampler2D uTexture;
    uniform float uStrength;
    uniform float uTime;
    uniform float uFreq;
    void mainUv(inout vec2 uv) {
      vec4 tex = texture2D(uTexture, uv);
      float vx = tex.r * 2.0 - 1.0;
      float vy = tex.g * 2.0 - 1.0;
      float intensity = tex.b;
      float wave = 0.5 + 0.5 * sin(uTime * uFreq + intensity * 6.2831853);
      float amt = uStrength * intensity * wave;
      uv += vec2(vx, vy) * amt;
    }
  `;
  return new Effect('LiquidEffect', fragment, {
    uniforms: new Map([
      ['uTexture', new THREE.Uniform(texture)],
      ['uStrength', new THREE.Uniform(opts?.strength ?? 0.025)],
      ['uTime', new THREE.Uniform(0)],
      ['uFreq', new THREE.Uniform(opts?.freq ?? 4.5)]
    ])
  });
};

const SHAPE_MAP = { square: 0, circle: 1, triangle: 2, diamond: 3 };
const VERTEX_SRC = `void main() { gl_Position = vec4(position, 1.0); }`;
const FRAGMENT_SRC = `
precision highp float;
uniform vec3  uColor;
uniform vec2  uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform int   uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;
uniform int   uShapeType;
const int MAX_CLICKS = 10;
uniform vec2  uClickPos  [MAX_CLICKS];
uniform float uClickTimes[MAX_CLICKS];
out vec4 fragColor;
float Bayer2(vec2 a) { a = floor(a); return fract(a.x / 2. + a.y * a.y * .75); }
#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))
#define FBM_OCTAVES     5
#define FBM_LACUNARITY  1.25
#define FBM_GAIN        1.0
float hash11(float n){ return fract(sin(n)*43758.5453); }
float vnoise(vec3 p){
  vec3 ip = floor(p); vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n100 = hash11(dot(ip + vec3(1.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n010 = hash11(dot(ip + vec3(0.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n110 = hash11(dot(ip + vec3(1.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n001 = hash11(dot(ip + vec3(0.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n101 = hash11(dot(ip + vec3(1.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n011 = hash11(dot(ip + vec3(0.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  float n111 = hash11(dot(ip + vec3(1.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);
  float x00 = mix(n000, n100, w.x); float x10 = mix(n010, n110, w.x);
  float x01 = mix(n001, n101, w.x); float x11 = mix(n011, n111, w.x);
  float y0  = mix(x00, x10, w.y);  float y1  = mix(x01, x11, w.y);
  return mix(y0, y1, w.z) * 2.0 - 1.0;
}
float fbm2(vec2 uv, float t){
  vec3 p = vec3(uv * uScale, t);
  float amp = 1.0; float freq = 1.0; float sum = 1.0;
  for (int i = 0; i < FBM_OCTAVES; ++i){ sum += amp * vnoise(p * freq); freq *= FBM_LACUNARITY; amp *= FBM_GAIN; }
  return sum * 0.5 + 0.5;
}
float maskCircle(vec2 p, float cov){
  float r = sqrt(cov) * .25;
  float d = length(p - 0.5) - r;
  float aa = 0.5 * fwidth(d);
  return cov * (1.0 - smoothstep(-aa, aa, d * 2.0));
}
float maskTriangle(vec2 p, vec2 id, float cov){
  bool flip = mod(id.x + id.y, 2.0) > 0.5;
  if (flip) p.x = 1.0 - p.x;
  float r = sqrt(cov);
  float d  = p.y - r*(1.0 - p.x);
  float aa = fwidth(d);
  return cov * clamp(0.5 - d/aa, 0.0, 1.0);
}
float maskDiamond(vec2 p, float cov){
  float r = sqrt(cov) * 0.564;
  return step(abs(p.x - 0.49) + abs(p.y - 0.49), r);
}
void main(){
  float pixelSize = uPixelSize;
  vec2 fragCoord = gl_FragCoord.xy - uResolution * .5;
  float aspectRatio = uResolution.x / uResolution.y;
  vec2 pixelId = floor(fragCoord / pixelSize);
  vec2 pixelUV = fract(fragCoord / pixelSize);
  float cellPixelSize = 8.0 * pixelSize;
  vec2 cellId = floor(fragCoord / cellPixelSize);
  vec2 cellCoord = cellId * cellPixelSize;
  vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);
  float base = fbm2(uv, uTime * 0.05);
  base = base * 0.5 - 0.65;
  float feed = base + (uDensity - 0.5) * 0.3;
  float speed     = uRippleSpeed;
  float thickness = uRippleThickness;
  const float dampT = 1.0;
  const float dampR = 10.0;
  if (uEnableRipples == 1) {
    for (int i = 0; i < MAX_CLICKS; ++i){
      vec2 pos = uClickPos[i];
      if (pos.x < 0.0) continue;
      float cellPixelSize2 = 8.0 * pixelSize;
      vec2 cuv = (((pos - uResolution * .5 - cellPixelSize2 * .5) / (uResolution))) * vec2(aspectRatio, 1.0);
      float t = max(uTime - uClickTimes[i], 0.0);
      float r = distance(uv, cuv);
      float waveR = speed * t;
      float ring  = exp(-pow((r - waveR) / thickness, 2.0));
      float atten = exp(-dampT * t) * exp(-dampR * r);
      feed = max(feed, ring * atten * uRippleIntensity);
    }
  }
  float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
  float bw = step(0.5, feed + bayer);
  float h = fract(sin(dot(floor(fragCoord / uPixelSize), vec2(127.1, 311.7))) * 43758.5453);
  float jitterScale = 1.0 + (h - 0.5) * uPixelJitter;
  float coverage = bw * jitterScale;
  float M;
  if      (uShapeType == SHAPE_CIRCLE)   M = maskCircle (pixelUV, coverage);
  else if (uShapeType == SHAPE_TRIANGLE) M = maskTriangle(pixelUV, pixelId, coverage);
  else if (uShapeType == SHAPE_DIAMOND)  M = maskDiamond(pixelUV, coverage);
  else                                   M = coverage;
  if (uEdgeFade > 0.0) {
    vec2 norm = gl_FragCoord.xy / uResolution;
    float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
    float fade = smoothstep(0.0, uEdgeFade, edge);
    M *= fade;
  }
  vec3 color = uColor;
  vec3 srgbColor = mix(color * 12.92, 1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, color));
  fragColor = vec4(srgbColor, M);
}
`;

const MAX_CLICKS = 10;

const PixelBlast = ({
  variant = 'square', pixelSize = 3, color = '#B497CF', className, style,
  antialias = true, patternScale = 2, patternDensity = 1, liquid = false,
  liquidStrength = 0.1, liquidRadius = 1, pixelSizeJitter = 0, enableRipples = true,
  rippleIntensityScale = 1, rippleThickness = 0.1, rippleSpeed = 0.3,
  liquidWobbleSpeed = 4.5, autoPauseOffscreen = true, speed = 0.5,
  transparent = true, edgeFade = 0.5, noiseAmount = 0
}) => {
  const containerRef = useRef(null);
  const visibilityRef = useRef({ visible: true });
  const speedRef = useRef(speed);
  const threeRef = useRef(null);
  const prevConfigRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    speedRef.current = speed;
    const needsReinitKeys = ['antialias', 'liquid', 'noiseAmount'];
    const cfg = { antialias, liquid, noiseAmount };
    let mustReinit = false;
    if (!threeRef.current) mustReinit = true;
    else if (prevConfigRef.current) {
      for (const k of needsReinitKeys)
        if (prevConfigRef.current[k] !== cfg[k]) { mustReinit = true; break; }
    }
    if (mustReinit) {
      if (threeRef.current) {
        const t = threeRef.current;
        t.resizeObserver?.disconnect();
        cancelAnimationFrame(t.raf);
        t.quad?.geometry.dispose();
        t.material.dispose();
        t.composer?.dispose();
        t.renderer.dispose();
        t.renderer.forceContextLoss();
        if (t.renderer.domElement.parentElement === container) container.removeChild(t.renderer.domElement);
        threeRef.current = null;
      }
      const canvas = document.createElement('canvas');
      const renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha: true, powerPreference: 'high-performance' });
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);
      if (transparent) renderer.setClearAlpha(0);
      else renderer.setClearColor(0x000000, 1);
      const uniforms = {
        uResolution: { value: new THREE.Vector2(0, 0) },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uClickPos: { value: Array.from({ length: MAX_CLICKS }, () => new THREE.Vector2(-1, -1)) },
        uClickTimes: { value: new Float32Array(MAX_CLICKS) },
        uShapeType: { value: SHAPE_MAP[variant] ?? 0 },
        uPixelSize: { value: pixelSize * renderer.getPixelRatio() },
        uScale: { value: patternScale },
        uDensity: { value: patternDensity },
        uPixelJitter: { value: pixelSizeJitter },
        uEnableRipples: { value: enableRipples ? 1 : 0 },
        uRippleSpeed: { value: rippleSpeed },
        uRippleThickness: { value: rippleThickness },
        uRippleIntensity: { value: rippleIntensityScale },
        uEdgeFade: { value: edgeFade }
      };
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SRC, fragmentShader: FRAGMENT_SRC, uniforms,
        transparent: true, depthTest: false, depthWrite: false, glslVersion: THREE.GLSL3
      });
      const quadGeom = new THREE.PlaneGeometry(2, 2);
      const quad = new THREE.Mesh(quadGeom, material);
      scene.add(quad);
      const clock = new THREE.Clock();
      const setSize = () => {
        const w = container.clientWidth || 1;
        const h = container.clientHeight || 1;
        renderer.setSize(w, h, false);
        uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
        if (threeRef.current?.composer)
          threeRef.current.composer.setSize(renderer.domElement.width, renderer.domElement.height);
        uniforms.uPixelSize.value = pixelSize * renderer.getPixelRatio();
      };
      setSize();
      const ro = new ResizeObserver(setSize);
      ro.observe(container);
      const randomFloat = () => {
        if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
          const u32 = new Uint32Array(1);
          window.crypto.getRandomValues(u32);
          return u32[0] / 0xffffffff;
        }
        return Math.random();
      };
      const timeOffset = randomFloat() * 1000;
      let composer; let touch; let liquidEffect;
      if (liquid) {
        touch = createTouchTexture();
        touch.radiusScale = liquidRadius;
        composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        liquidEffect = createLiquidEffect(touch.texture, { strength: liquidStrength, freq: liquidWobbleSpeed });
        const effectPass = new EffectPass(camera, liquidEffect);
        effectPass.renderToScreen = true;
        composer.addPass(renderPass);
        composer.addPass(effectPass);
      }
      if (noiseAmount > 0) {
        if (!composer) {
          composer = new EffectComposer(renderer);
          composer.addPass(new RenderPass(scene, camera));
        }
        const noiseEffect = new Effect(
          'NoiseEffect',
          `uniform float uTime; uniform float uAmount; float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);} void mainUv(inout vec2 uv){} void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){ float n=hash(floor(uv*vec2(1920.0,1080.0))+floor(uTime*60.0)); float g=(n-0.5)*uAmount; outputColor=inputColor+vec4(vec3(g),0.0);} `,
          { uniforms: new Map([['uTime', new THREE.Uniform(0)], ['uAmount', new THREE.Uniform(noiseAmount)]]) }
        );
        const noisePass = new EffectPass(camera, noiseEffect);
        noisePass.renderToScreen = true;
        if (composer && composer.passes.length > 0) composer.passes.forEach(p => (p.renderToScreen = false));
        composer.addPass(noisePass);
      }
      if (composer) composer.setSize(renderer.domElement.width, renderer.domElement.height);
      const mapToPixels = e => {
        const rect = renderer.domElement.getBoundingClientRect();
        const scaleX = renderer.domElement.width / rect.width;
        const scaleY = renderer.domElement.height / rect.height;
        const fx = (e.clientX - rect.left) * scaleX;
        const fy = (rect.height - (e.clientY - rect.top)) * scaleY;
        return { fx, fy, w: renderer.domElement.width, h: renderer.domElement.height };
      };
      const onPointerDown = e => {
        const { fx, fy } = mapToPixels(e);
        const ix = threeRef.current?.clickIx ?? 0;
        uniforms.uClickPos.value[ix].set(fx, fy);
        uniforms.uClickTimes.value[ix] = uniforms.uTime.value;
        if (threeRef.current) threeRef.current.clickIx = (ix + 1) % MAX_CLICKS;
      };
      const onPointerMove = e => {
        if (!touch) return;
        const { fx, fy, w, h } = mapToPixels(e);
        touch.addTouch({ x: fx / w, y: fy / h });
      };
      renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
      renderer.domElement.addEventListener('pointermove', onPointerMove, { passive: true });
      let raf = 0;
      const animate = () => {
        if (autoPauseOffscreen && !visibilityRef.current.visible) { raf = requestAnimationFrame(animate); return; }
        uniforms.uTime.value = timeOffset + clock.getElapsedTime() * speedRef.current;
        if (liquidEffect) liquidEffect.uniforms.get('uTime').value = uniforms.uTime.value;
        if (composer) {
          if (touch) touch.update();
          composer.passes.forEach(p => {
            const effs = p.effects;
            if (effs) effs.forEach(eff => { const u = eff.uniforms?.get('uTime'); if (u) u.value = uniforms.uTime.value; });
          });
          composer.render();
        } else renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      raf = requestAnimationFrame(animate);
      threeRef.current = { renderer, scene, camera, material, clock, clickIx: 0, uniforms, resizeObserver: ro, raf, quad, timeOffset, composer, touch, liquidEffect };
    } else {
      const t = threeRef.current;
      t.uniforms.uShapeType.value = SHAPE_MAP[variant] ?? 0;
      t.uniforms.uPixelSize.value = pixelSize * t.renderer.getPixelRatio();
      t.uniforms.uColor.value.set(color);
      t.uniforms.uScale.value = patternScale;
      t.uniforms.uDensity.value = patternDensity;
      t.uniforms.uPixelJitter.value = pixelSizeJitter;
      t.uniforms.uEnableRipples.value = enableRipples ? 1 : 0;
      t.uniforms.uRippleIntensity.value = rippleIntensityScale;
      t.uniforms.uRippleThickness.value = rippleThickness;
      t.uniforms.uRippleSpeed.value = rippleSpeed;
      t.uniforms.uEdgeFade.value = edgeFade;
      if (transparent) t.renderer.setClearAlpha(0);
      else t.renderer.setClearColor(0x000000, 1);
      if (t.liquidEffect) {
        const uStrength = t.liquidEffect;
        if (uStrength) uStrength.value = liquidStrength;
        const uFreq = t.liquidEffect.uniforms.get('uFreq');
        if (uFreq) uFreq.value = liquidWobbleSpeed;
      }
      if (t.touch) t.touch.radiusScale = liquidRadius;
    }
    prevConfigRef.current = cfg;
    return () => {
      if (threeRef.current && mustReinit) return;
      if (!threeRef.current) return;
      const t = threeRef.current;
      t.resizeObserver?.disconnect();
      cancelAnimationFrame(t.raf);
      t.quad?.geometry.dispose();
      t.material.dispose();
      t.composer?.dispose();
      t.renderer.dispose();
      t.renderer.forceContextLoss();
      if (t.renderer.domElement.parentElement === container) container.removeChild(t.renderer.domElement);
      threeRef.current = null;
    };
  }, [antialias, liquid, noiseAmount, pixelSize, patternScale, patternDensity, enableRipples, rippleIntensityScale, rippleThickness, rippleSpeed, pixelSizeJitter, edgeFade, transparent, liquidStrength, liquidRadius, liquidWobbleSpeed, autoPauseOffscreen, variant, color, speed]);

  return (
    <div
      ref={containerRef}
      className={`pixel-blast-container ${className ?? ''}`}
      style={{ width: '100%', height: '100%', ...style }}
      aria-label="PixelBlast interactive background"
    />
  );
};

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

function GuestLoginGate({ onGuest, onLogin }) {
  return (
    <div style={{
      paddingTop: '70px', minHeight: '100vh', background: '#0A0A0A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '70px 1.5rem 4rem',
    }}>
      <style>{`
        .gate-card { width: 100%; max-width: 480px; border: 1px solid rgba(201,168,76,0.2); background: #0F0F0F; padding: 3rem 2.5rem; text-align: center; animation: gateIn 0.35s cubic-bezier(0.16,1,0.3,1); }
        @keyframes gateIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .gate-divider { display: flex; align-items: center; gap: 1rem; margin: 2rem 0; }
        .gate-divider-line { flex: 1; height: 1px; background: rgba(201,168,76,0.12); }
        .gate-divider-text { font-family: 'Montserrat', sans-serif; font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: #444; }
        .gate-btn-primary { width: 100%; padding: 0.95rem; background: linear-gradient(135deg, #C9A84C, #E8C96D); border: none; cursor: pointer; font-family: 'Montserrat', sans-serif; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #0A0A0A; transition: opacity 0.2s, transform 0.2s; margin-bottom: 1rem; }
        .gate-btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .gate-btn-ghost { width: 100%; padding: 0.95rem; background: none; border: 1px solid rgba(201,168,76,0.25); cursor: pointer; font-family: 'Montserrat', sans-serif; font-size: 0.68rem; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; color: #888; transition: color 0.2s, border-color 0.2s, background 0.2s; }
        .gate-btn-ghost:hover { color: #C9A84C; border-color: rgba(201,168,76,0.5); background: rgba(201,168,76,0.05); }
        .gate-perks { display: flex; flex-direction: column; gap: 0.55rem; margin: 1.8rem 0 0; text-align: left; }
        .gate-perk { display: flex; align-items: center; gap: 0.7rem; font-family: 'Montserrat', sans-serif; font-size: 0.65rem; color: #666; letter-spacing: 0.04em; }
        .gate-perk-dot { width: 4px; height: 4px; border-radius: 50%; background: #C9A84C; flex-shrink: 0; }
      `}</style>
      <div className="gate-card">
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.75rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '0.6rem' }}>R&amp;R AGENCIES</div>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 600, color: '#F5F0E8', letterSpacing: '0.05em', marginBottom: '0.5rem', lineHeight: 1.15 }}>How would you like to proceed?</h2>
        <div style={{ width: '32px', height: '1px', background: '#C9A84C', margin: '1.2rem auto' }} />
        <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.72rem', color: '#666', letterSpacing: '0.04em', lineHeight: 1.8, marginBottom: '2rem' }}>Sign in for a faster checkout with saved addresses and order history, or continue as a guest.</p>
        <button className="gate-btn-primary" onClick={onLogin}>Sign In / Register</button>
        <div className="gate-divider">
          <div className="gate-divider-line" />
          <span className="gate-divider-text">or</span>
          <div className="gate-divider-line" />
        </div>
        <button className="gate-btn-ghost" onClick={onGuest}>Continue as Guest</button>
        <div className="gate-perks">
          <div className="gate-perk"><span className="gate-perk-dot" />Save addresses for future orders</div>
          <div className="gate-perk"><span className="gate-perk-dot" />Track your order history in one place</div>
          <div className="gate-perk"><span className="gate-perk-dot" />Faster checkout every time</div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [cart, setCart] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const isMobile = useIsMobile();

  const [shippingRates, setShippingRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const debounceRef = useRef(null);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', suburb: '', city: '', province: '', zip: '',
  });

  useEffect(() => {
    setMounted(true);
    const stored = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(stored);
  }, []);

  useEffect(() => {
    if (user) {
      const nameParts = (user.displayName || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      setForm(f => ({
        ...f, firstName, lastName,
        email: user.email || '',
        phone: profile?.phone || f.phone,
      }));
      if (profile?.addresses?.length > 0) {
        const addr = profile.addresses[0];
        setForm(f => ({
          ...f,
          address: addr.line1 || f.address,
          city: addr.city || f.city,
          province: addr.province || f.province,
          zip: addr.postal || f.zip,
        }));
      }
    }
  }, [user, profile]);

  useEffect(() => {
    const { city, province, zip } = form;
    if (!city || !province || !zip || zip.length < 4) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setShippingLoading(true);
      setShippingError('');
      setShippingRates([]);
      setSelectedRate(null);
      try {
        const res = await fetch('/api/shipping-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: form.city,
            province: form.province,
            zip: form.zip,
            address: form.address,
            suburb: form.suburb,
          }),
        });
        const data = await res.json();
        if (data.rates?.length) {
          setShippingRates(data.rates);
          setSelectedRate(data.rates[0]);
        } else {
          setShippingError('No shipping options found for this address.');
        }
      } catch {
        setShippingError('Could not fetch shipping rates.');
      } finally {
        setShippingLoading(false);
      }
    }, 900);
  }, [form.city, form.province, form.zip]);

 const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
const freeDeliveryThreshold = 600;
const qualifiesForFree = subtotal >= freeDeliveryThreshold;
const shippingCost = qualifiesForFree ? 0 : (selectedRate?.price ?? 0);
const total = subtotal + shippingCost;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePayFast = async (e) => {
    e.preventDefault();
    const required = ['firstName', 'lastName', 'email', 'phone'];
    for (const field of required) {
      if (!form[field].trim()) {
        alert(`Please fill in your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`);
        return;
      }
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/payfast-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form,
          subtotal: total.toFixed(2),
          shippingService: selectedRate?.service || 'Standard',
          shippingCost: shippingCost.toFixed(2),
          cartLength: cart.length,
          userId: user?.uid || null,
        }),
      });
      const pfData = await res.json();
      const pfForm = document.createElement('form');
      pfForm.method = 'POST';
      pfForm.action = 'https://www.payfast.co.za/eng/process';
      Object.entries(pfData).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        pfForm.appendChild(input);
      });
      document.body.appendChild(pfForm);
      pfForm.submit();
    } catch (err) {
      console.error('PayFast error:', err);
      alert('Payment could not be initiated. Please try again.');
      setCheckoutLoading(false);
    }
  };

  const handleLoginChoice = () => setShowAuthModal(true);

  if (!mounted || authLoading) return null;

  if (cart.length === 0) {
    return (
      <div style={{ paddingTop: '70px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#F5F0E8', marginBottom: '1rem' }}>Your cart is empty</h2>
          <Link href="/shop" className="btn-gold">Browse Collection</Link>
        </div>
      </div>
    );
  }

  if (!user && !guestMode) {
    return (
      <ClickSpark sparkColor="#C9A84C" sparkSize={7} sparkRadius={14} sparkCount={8} duration={400}>
        <>
          {!isMobile && (
            <TargetCursor targetSelector="a, button, input, select" spinDuration={2.4} hideDefaultCursor={true} hoverDuration={0.18} parallaxOn={true} />
          )}
          <style>{`
            @media (min-width: 769px) { * { cursor: none !important; } }
            .tc-wrapper { position: fixed; top: 0; left: 0; width: 0; height: 0; pointer-events: none; z-index: 99999; will-change: transform; }
            .tc-dot { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: #C9A84C; top: 50%; left: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 8px rgba(201,168,76,0.8), 0 0 16px rgba(201,168,76,0.4); }
            .tc-corner { position: absolute; width: 12px; height: 12px; border-color: #C9A84C; border-style: solid; border-width: 0; will-change: transform; filter: drop-shadow(0 0 4px rgba(201,168,76,0.6)); }
            .tc-tl { border-top-width: 2px; border-left-width: 2px; transform: translate(-18px, -18px); }
            .tc-tr { border-top-width: 2px; border-right-width: 2px; transform: translate(6px, -18px); }
            .tc-br { border-bottom-width: 2px; border-right-width: 2px; transform: translate(6px, 6px); }
            .tc-bl { border-bottom-width: 2px; border-left-width: 2px; transform: translate(-18px, 6px); }
            @keyframes sparkFly {
              0% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
              100% { transform: translate(calc(-50% + cos(var(--angle)) * var(--radius) * 3), calc(-50% + sin(var(--angle)) * var(--radius) * 3)) scale(0); opacity: 0; }
            }
          `}</style>
          <GuestLoginGate onGuest={() => setGuestMode(true)} onLogin={handleLoginChoice} />
          {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />}
        </>
      </ClickSpark>
    );
  }

  return (
    <ClickSpark sparkColor="#C9A84C" sparkSize={7} sparkRadius={14} sparkCount={8} duration={400}>
      <>
        {!isMobile && (
          <TargetCursor targetSelector="a, button, input, textarea, select" spinDuration={2.4} hideDefaultCursor={true} hoverDuration={0.18} parallaxOn={true} />
        )}

        <style>{`
          @media (min-width: 769px) { * { cursor: none !important; } }
          .tc-wrapper { position: fixed; top: 0; left: 0; width: 0; height: 0; pointer-events: none; z-index: 99999; will-change: transform; }
          .tc-dot { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: #C9A84C; top: 50%; left: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 8px rgba(201,168,76,0.8), 0 0 16px rgba(201,168,76,0.4); }
          .tc-corner { position: absolute; width: 12px; height: 12px; border-color: #C9A84C; border-style: solid; border-width: 0; will-change: transform; filter: drop-shadow(0 0 4px rgba(201,168,76,0.6)); }
          .tc-tl { border-top-width: 2px; border-left-width: 2px; transform: translate(-18px, -18px); }
          .tc-tr { border-top-width: 2px; border-right-width: 2px; transform: translate(6px, -18px); }
          .tc-br { border-bottom-width: 2px; border-right-width: 2px; transform: translate(6px, 6px); }
          .tc-bl { border-bottom-width: 2px; border-left-width: 2px; transform: translate(-18px, 6px); }
          @keyframes sparkFly {
            0% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
            100% { transform: translate(calc(-50% + cos(var(--angle)) * var(--radius) * 3), calc(-50% + sin(var(--angle)) * var(--radius) * 3)) scale(0); opacity: 0; }
          }
          @media (max-width: 768px) {
            .checkout-grid { grid-template-columns: 1fr !important; }
            .name-grid { grid-template-columns: 1fr !important; }
            .address-grid { grid-template-columns: 1fr 1fr !important; }
            .order-summary-sticky { position: static !important; }
            .checkout-form-box { padding: 1.75rem 1.25rem !important; }
            .checkout-hero { padding: 4rem 1.5rem !important; }
            .checkout-section { padding: 3rem 1.25rem 5rem !important; }
          }
          .rr-select { width: 100%; background: #1A1A1A; border: 1px solid rgba(201,168,76,0.2); color: #F5F0E8; padding: 0.85rem 1rem; font-size: 0.82rem; font-family: 'Montserrat', sans-serif; outline: none; letter-spacing: 0.03em; box-sizing: border-box; appearance: none; -webkit-appearance: none; cursor: pointer; }
          .rr-select:focus { border-color: #C9A84C; }
          .rr-select option { background: #1A1A1A; color: #F5F0E8; }
          .rr-select-wrap { position: relative; }
          .rr-select-wrap::after { content: '▾'; position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); color: #C9A84C; pointer-events: none; font-size: 0.8rem; }
        `}</style>

        <div style={{ paddingTop: '70px' }}>
          <section className="checkout-hero" style={{
            position: 'relative', padding: '6rem 2rem', textAlign: 'center',
            borderBottom: '1px solid rgba(201,168,76,0.15)', background: '#0A0A0A', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              <PixelBlast
                variant="circle" pixelSize={4} color="#C9A84C" patternScale={1.8} patternDensity={0.72}
                pixelSizeJitter={0.4} enableRipples={true} rippleSpeed={0.25} rippleThickness={0.08}
                rippleIntensityScale={0.9} edgeFade={0.18} speed={0.18} transparent={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: 'radial-gradient(ellipse 65% 75% at 50% 50%, rgba(10,10,10,0.82) 0%, rgba(10,10,10,0.1) 100%)',
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <p className="section-label">Final Step</p>
              <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#F5F0E8', marginTop: '0.5rem' }}>Checkout</h1>
              <div className="divider-gold" />
              <p style={{ fontSize: '0.85rem', color: '#999', maxWidth: '500px', margin: '0 auto', lineHeight: 1.9 }}>
                Complete your details below and proceed to secure payment via PayFast.
              </p>
              {guestMode && !user && (
                <button onClick={() => setGuestMode(false)} style={{
                  marginTop: '1rem', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Montserrat, sans-serif', fontSize: '0.62rem', color: '#C9A84C',
                  letterSpacing: '0.1em', textDecoration: 'underline',
                }}>
                  Sign in instead
                </button>
              )}
            </div>
          </section>

          <section className="checkout-section" style={{ padding: '4rem 2rem 6rem', maxWidth: '1100px', margin: '0 auto' }}>
            <div className="checkout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '3rem', alignItems: 'start' }}>

              <div className="checkout-form-box" style={{ border: '1px solid rgba(201,168,76,0.2)', padding: '3rem', background: '#0F0F0F' }}>
                <p className="section-label" style={{ marginBottom: '0.5rem' }}>Your Details</p>
                <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', color: '#F5F0E8', marginBottom: '2rem' }}>Delivery Information</h2>

                {user && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1rem',
                    background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', marginBottom: '1.8rem',
                  }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #C9A84C, #E8C96D)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Montserrat, sans-serif', fontSize: '0.55rem',
                      fontWeight: 700, color: '#0A0A0A', flexShrink: 0,
                    }}>
                      {user.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : user.email[0].toUpperCase()}
                    </div>
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.65rem', color: '#888', letterSpacing: '0.04em' }}>
                      Signed in as <span style={{ color: '#C9A84C' }}>{user.displayName || user.email}</span>
                    </span>
                  </div>
                )}

                <div className="name-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'First Name', name: 'firstName', placeholder: 'Rhea' },
                    { label: 'Last Name', name: 'lastName', placeholder: 'Jugernath' },
                  ].map(f => (
                    <div key={f.name}>
                      <label style={labelStyle}>{f.label} *</label>
                      <input type="text" name={f.name} value={form[f.name]} onChange={handleChange} placeholder={f.placeholder} style={inputStyle}
                        onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'} />
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={labelStyle}>Email Address *</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="your@email.com" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'} />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={labelStyle}>Phone Number *</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="081 336 5266" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'} />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={labelStyle}>Street Address</label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="49 Ilchester Avenue"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'}
                    onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={labelStyle}>Suburb</label>
                  <input
                    type="text"
                    name="suburb"
                    value={form.suburb}
                    onChange={handleChange}
                    placeholder="Verulam"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'}
                    onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
                  />
                </div>

                <div className="address-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={labelStyle}>City</label>
                    <input
                      type="text"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Durban"
                      style={{
                        ...inputStyle,
                        borderColor: form.city ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.2)',
                        background: form.city ? 'rgba(201,168,76,0.04)' : '#1A1A1A',
                      }}
                      onFocus={e => e.target.style.borderColor = '#C9A84C'}
                      onBlur={e => e.target.style.borderColor = form.city ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.2)'}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Province</label>
                    <div className="rr-select-wrap">
                      <select
                        name="province"
                        value={form.province}
                        onChange={handleChange}
                        className="rr-select"
                        style={{
                          borderColor: form.province ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.2)',
                          background: form.province ? 'rgba(201,168,76,0.04)' : '#1A1A1A',
                        }}
                      >
                        <option value="">Select province</option>
                        <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                        <option value="Gauteng">Gauteng</option>
                        <option value="Western Cape">Western Cape</option>
                        <option value="Eastern Cape">Eastern Cape</option>
                        <option value="Free State">Free State</option>
                        <option value="Limpopo">Limpopo</option>
                        <option value="Mpumalanga">Mpumalanga</option>
                        <option value="Northern Cape">Northern Cape</option>
                        <option value="North West">North West</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Postal Code</label>
                    <input
                      type="text"
                      name="zip"
                      value={form.zip}
                      onChange={handleChange}
                      placeholder="4340"
                      style={{
                        ...inputStyle,
                        borderColor: form.zip ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.2)',
                        background: form.zip ? 'rgba(201,168,76,0.04)' : '#1A1A1A',
                      }}
                      onFocus={e => e.target.style.borderColor = '#C9A84C'}
                      onBlur={e => e.target.style.borderColor = form.zip ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.2)'}
                    />
                  </div>
                </div>

                {form.city && form.province && form.zip && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.9rem',
                    background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)',
                    marginBottom: '1.5rem',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.62rem', color: '#C9A84C', letterSpacing: '0.04em' }}>
                      {[form.suburb, form.city, form.province, form.zip].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}

                {!qualifiesForFree && subtotal > 0 && (
  <div style={{
    padding: '0.85rem 1rem', marginBottom: '1.2rem',
    background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)',
    display: 'flex', alignItems: 'center', gap: '0.6rem',
  }}>
    <div style={{ flex: 1 }}>
      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.68rem', color: '#C9A84C', letterSpacing: '0.08em', margin: 0, fontWeight: 700 }}>
        🚚 FREE DELIVERY OVER R600
      </p>
      <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.62rem', color: '#888', margin: '0.3rem 0 0', letterSpacing: '0.04em' }}>
        Add <span style={{ color: '#C9A84C', fontWeight: 600 }}>R {(freeDeliveryThreshold - subtotal).toFixed(2)}</span> more to qualify — save on shipping
      </p>
    </div>
    <div style={{ width: '100%', maxWidth: '80px' }}>
      <div style={{ height: '3px', background: 'rgba(201,168,76,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min((subtotal / freeDeliveryThreshold) * 100, 100)}%`, background: '#C9A84C', borderRadius: '2px', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  </div>
)}

{qualifiesForFree && (
  <div style={{
    padding: '0.85rem 1rem', marginBottom: '1.2rem',
    background: 'rgba(80,180,80,0.06)', border: '1px solid rgba(80,180,80,0.25)',
  }}>
    <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.68rem', color: '#7ec87e', letterSpacing: '0.08em', margin: 0, fontWeight: 700 }}>
      ✓ FREE DELIVERY UNLOCKED
    </p>
  </div>
)}

{shippingLoading && (
                  <div style={{ padding: '1rem 0', fontSize: '0.72rem', color: '#888', letterSpacing: '0.05em', fontFamily: 'Montserrat, sans-serif' }}>
                    ↻ Calculating shipping rates...
                  </div>
                )}

                {shippingError && (
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(220,80,80,0.08)', border: '1px solid rgba(220,80,80,0.2)', fontSize: '0.68rem', color: '#e07070', marginBottom: '1.2rem', fontFamily: 'Montserrat, sans-serif' }}>
                    {shippingError}
                  </div>
                )}

                {shippingRates.length > 0 && (
                  <div style={{ marginBottom: '2.5rem' }}>
                    <label style={labelStyle}>Delivery Option</label>
                    {shippingRates.map((rate) => (
                      <div
                        key={rate.code}
                        onClick={() => setSelectedRate(rate)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '0.9rem 1rem', marginBottom: '0.5rem', cursor: 'pointer',
                          border: `1px solid ${selectedRate?.code === rate.code ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`,
                          background: selectedRate?.code === rate.code ? 'rgba(201,168,76,0.06)' : '#1A1A1A',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: '14px', height: '14px', borderRadius: '50%',
                            border: `2px solid ${selectedRate?.code === rate.code ? '#C9A84C' : '#444'}`,
                            background: selectedRate?.code === rate.code ? '#C9A84C' : 'transparent',
                            flexShrink: 0, transition: 'all 0.2s',
                          }} />
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#F5F0E8', margin: 0, fontFamily: 'Montserrat, sans-serif' }}>{rate.service}</p>
                            {rate.eta && (
                              <p style={{ fontSize: '0.6rem', color: '#666', margin: '0.2rem 0 0', letterSpacing: '0.05em', fontFamily: 'Montserrat, sans-serif' }}>
                                Est. delivery: {rate.eta}
                              </p>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: '0.88rem', color: '#C9A84C', fontFamily: 'Cormorant Garamond, serif', margin: 0, fontWeight: 600 }}>
                          R {rate.price.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: '2rem' }}>
                  <p style={{ fontSize: '0.72rem', color: '#555', lineHeight: 1.8, marginBottom: '1.5rem' }}>
                    🔒 You will be redirected to <span style={{ color: '#C9A84C' }}>PayFast</span> to complete secure payment. R&amp;R Agencies never stores your card details.
</p>
<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', padding: '0.65rem 0.9rem', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)' }}>
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
  <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.62rem', color: '#666', letterSpacing: '0.04em', margin: 0, lineHeight: 1.6 }}>
    Delivered by <span style={{ color: '#C9A84C', fontWeight: 600 }}>The Courier Guy</span> — trusted by thousands of South African businesses for fast, reliable delivery nationwide.
  </p>
                  </p>
                  <button
                    onClick={handlePayFast}
                    disabled={checkoutLoading}
                    className="btn-gold"
                    style={{ width: '100%', cursor: checkoutLoading ? 'not-allowed' : 'pointer', border: 'none', opacity: checkoutLoading ? 0.7 : 1 }}
                  >
                    {checkoutLoading ? 'Redirecting to PayFast...' : `Pay R ${total.toFixed(2)} via PayFast`}
                  </button>
                </div>
              </div>

              <div className="order-summary-sticky" style={{
                border: '1px solid rgba(201,168,76,0.2)', padding: '2.5rem', background: '#0F0F0F',
                position: 'sticky', top: '90px',
              }}>
                <p className="section-label" style={{ marginBottom: '0.5rem' }}>Your Order</p>
                <h2 style={{ fontSize: '1.5rem', color: '#F5F0E8', marginBottom: '2rem' }}>Summary</h2>

                <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: '1.5rem' }}>
                  {cart.map(item => (
                    <div key={`${item.id}-${item.size}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.name} style={{ width: '40px', height: '48px', objectFit: 'cover', border: '1px solid rgba(201,168,76,0.15)' }} />
                        )}
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#ccc', maxWidth: '160px', lineHeight: 1.4 }}>{item.name}</p>
                          <p style={{ fontSize: '0.6rem', color: '#555', letterSpacing: '0.1em' }}>Size: {item.size} · Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#888' }}>R {(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.65rem', color: '#888', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.1em' }}>Subtotal</p>
                    <p style={{ fontSize: '0.78rem', color: '#888' }}>R {subtotal.toFixed(2)}</p>
                  </div>
                  {selectedRate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.65rem', color: '#888', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.05em' }}>Shipping · {selectedRate.service}</p>
                     <p style={{ fontSize: '0.78rem', color: qualifiesForFree ? '#7ec87e' : '#888' }}>{qualifiesForFree ? 'FREE' : `R ${selectedRate.price.toFixed(2)}`}</p>
                    </div>
                  )}
                  {!selectedRate && shippingRates.length === 0 && !shippingLoading && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.65rem', color: '#555', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.05em' }}>Shipping</p>
                      <p style={{ fontSize: '0.65rem', color: '#555', fontFamily: 'Montserrat, sans-serif' }}>Calculated at address</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
                    <p style={{ fontSize: '0.65rem', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Total</p>
                    <p style={{ fontSize: '1.5rem', color: '#C9A84C', fontFamily: 'Cormorant Garamond, serif' }}>
                      R {total.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <Link href="/cart" style={{ fontSize: '0.65rem', color: '#555', textDecoration: 'none', letterSpacing: '0.1em' }}
                    onMouseEnter={e => e.target.style.color = '#C9A84C'} onMouseLeave={e => e.target.style.color = '#555'}>
                    ← Edit Cart
                  </Link>
                </div>
              </div>

            </div>
          </section>
        </div>
      </>
    </ClickSpark>
  );
}

function AuthModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, resetPassword } = useAuth();
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(''); setSuccess('');
    setForm({ name: '', email: '', password: '', confirm: '' });
    setMode('login');
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!isOpen) return null;

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return setError('Please fill in all fields.');
    setLoading(true);
    try {
      await login(form.email, form.password);
      onClose();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirm) return setError('Please fill in all fields.');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      onClose();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally { setLoading(false); }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!form.email) return setError('Enter your email address.');
    setLoading(true);
    try {
      await resetPassword(form.email);
      setSuccess('Reset link sent — check your inbox.');
    } catch (err) {
      setError(friendlyError(err.code));
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        .rr-modal-overlay { position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; padding: 1rem; animation: rrFadeIn 0.2s ease; }
        @keyframes rrFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .rr-modal-box { width: 100%; max-width: 400px; background: #0D0D0D; border: 1px solid rgba(201,168,76,0.2); border-radius: 16px; overflow: hidden; box-shadow: 0 32px 80px rgba(0,0,0,0.7); animation: rrSlideUp 0.25s cubic-bezier(0.16,1,0.3,1); }
        @keyframes rrSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .rr-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.4rem 1.6rem 0; }
        .rr-modal-logo { font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; font-weight: 600; letter-spacing: 0.2em; color: #C9A84C; text-transform: uppercase; }
        .rr-modal-close { background: none; border: none; cursor: pointer; color: #555; padding: 0.3rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: color 0.2s, background 0.2s; }
        .rr-modal-close:hover { color: #C9A84C; background: rgba(201,168,76,0.1); }
        .rr-modal-tabs { display: flex; margin: 1.2rem 1.6rem 0; border-bottom: 1px solid rgba(201,168,76,0.1); }
        .rr-modal-tab { flex: 1; background: none; border: none; cursor: pointer; font-family: 'Montserrat', sans-serif; font-size: 0.65rem; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; color: #555; padding: 0.7rem 0.5rem; border-bottom: 1px solid transparent; transition: color 0.2s, border-color 0.2s; margin-bottom: -1px; }
        .rr-modal-tab:hover { color: #999; }
        .rr-modal-tab--active { color: #C9A84C; border-bottom-color: #C9A84C; }
        .rr-modal-body { padding: 1.6rem; }
        .rr-modal-title { font-family: 'Cormorant Garamond', serif; font-size: 0.75rem; font-weight: 400; letter-spacing: 0.25em; text-transform: uppercase; color: #555; margin-bottom: 1.4rem; }
        .rr-modal-field { margin-bottom: 1rem; }
        .rr-modal-label { display: block; font-family: 'Montserrat', sans-serif; font-size: 0.6rem; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; color: #666; margin-bottom: 0.4rem; }
        .rr-modal-input { width: 100%; padding: 0.7rem 0.9rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(201,168,76,0.15); border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 0.78rem; color: #ddd; outline: none; transition: border-color 0.2s, background 0.2s; box-sizing: border-box; }
        .rr-modal-input::placeholder { color: #444; }
        .rr-modal-input:focus { border-color: rgba(201,168,76,0.45); background: rgba(201,168,76,0.03); }
        .rr-modal-error { font-family: 'Montserrat', sans-serif; font-size: 0.65rem; color: #e07070; letter-spacing: 0.05em; margin-bottom: 1rem; padding: 0.6rem 0.8rem; background: rgba(220,80,80,0.08); border: 1px solid rgba(220,80,80,0.2); border-radius: 6px; }
        .rr-modal-success { font-family: 'Montserrat', sans-serif; font-size: 0.65rem; color: #7ec87e; letter-spacing: 0.05em; margin-bottom: 1rem; padding: 0.6rem 0.8rem; background: rgba(80,180,80,0.08); border: 1px solid rgba(80,180,80,0.2); border-radius: 6px; }
        .rr-modal-submit { width: 100%; padding: 0.85rem; background: linear-gradient(135deg, #C9A84C, #E8C96D); border: none; border-radius: 8px; cursor: pointer; font-family: 'Montserrat', sans-serif; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #0A0A0A; transition: opacity 0.2s, transform 0.2s; margin-top: 0.4rem; }
        .rr-modal-submit:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .rr-modal-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .rr-modal-link { background: none; border: none; cursor: pointer; font-family: 'Montserrat', sans-serif; font-size: 0.62rem; color: #C9A84C; letter-spacing: 0.08em; text-decoration: underline; padding: 0; transition: opacity 0.2s; }
        .rr-modal-link:hover { opacity: 0.7; }
        .rr-modal-footer { text-align: center; margin-top: 1.2rem; font-family: 'Montserrat', sans-serif; font-size: 0.62rem; color: #555; letter-spacing: 0.05em; }
      `}</style>
      <div ref={overlayRef} className="rr-modal-overlay" onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
        <div className="rr-modal-box">
          <div className="rr-modal-header">
            <div className="rr-modal-logo">R&amp;R</div>
            <button className="rr-modal-close" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          {mode !== 'forgot' && (
            <div className="rr-modal-tabs">
              <button className={`rr-modal-tab${mode === 'login' ? ' rr-modal-tab--active' : ''}`} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Sign In</button>
              <button className={`rr-modal-tab${mode === 'register' ? ' rr-modal-tab--active' : ''}`} onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>Register</button>
            </div>
          )}
          <div className="rr-modal-body">
            {mode === 'login' && (
              <>
                <p className="rr-modal-title">Welcome back</p>
                {error && <div className="rr-modal-error">{error}</div>}
                <div className="rr-modal-field">
                  <label className="rr-modal-label">Email</label>
                  <input className="rr-modal-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
                </div>
                <div className="rr-modal-field">
                  <label className="rr-modal-label">Password</label>
                  <input className="rr-modal-input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} autoComplete="current-password" />
                </div>
                <div style={{ textAlign: 'right', marginBottom: '1rem', marginTop: '-0.4rem' }}>
                  <button type="button" className="rr-modal-link" onClick={() => { setMode('forgot'); setError(''); }}>Forgot password?</button>
                </div>
                <button className="rr-modal-submit" disabled={loading} onClick={handleLogin}>{loading ? 'Signing in...' : 'Sign In'}</button>
              </>
            )}
            {mode === 'register' && (
              <>
                <p className="rr-modal-title">Create your account</p>
                {error && <div className="rr-modal-error">{error}</div>}
                <div className="rr-modal-field">
                  <label className="rr-modal-label">Full Name</label>
                  <input className="rr-modal-input" type="text" placeholder="Your name" value={form.name} onChange={set('name')} autoComplete="name" />
                </div>
                <div className="rr-modal-field">
                  <label className="rr-modal-label">Email</label>
                  <input className="rr-modal-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
                </div>
                <div className="rr-modal-field">
                  <label className="rr-modal-label">Password</label>
                  <input className="rr-modal-input" type="password" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} autoComplete="new-password" />
                </div>
                <div className="rr-modal-field">
                  <label className="rr-modal-label">Confirm Password</label>
                  <input className="rr-modal-input" type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
                </div>
                <button className="rr-modal-submit" disabled={loading} onClick={handleRegister}>{loading ? 'Creating account...' : 'Create Account'}</button>
              </>
            )}
            {mode === 'forgot' && (
              <>
                <p className="rr-modal-title">Reset your password</p>
                {error && <div className="rr-modal-error">{error}</div>}
                {success && <div className="rr-modal-success">{success}</div>}
                {!success && (
                  <>
                    <div className="rr-modal-field">
                      <label className="rr-modal-label">Email</label>
                      <input className="rr-modal-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
                    </div>
                    <button className="rr-modal-submit" disabled={loading} onClick={handleForgot}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
                  </>
                )}
                <div className="rr-modal-footer" style={{ marginTop: '1rem' }}>
                  <button type="button" className="rr-modal-link" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Back to sign in</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function friendlyError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 8 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

const labelStyle = {
  fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase',
  color: '#C9A84C', display: 'block', marginBottom: '0.5rem', fontFamily: 'Montserrat, sans-serif',
};

const inputStyle = {
  width: '100%', background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.2)',
  color: '#F5F0E8', padding: '0.85rem 1rem', fontSize: '0.82rem',
  fontFamily: 'Montserrat, sans-serif', outline: 'none', letterSpacing: '0.03em', boxSizing: 'border-box',
};