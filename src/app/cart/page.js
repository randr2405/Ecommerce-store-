'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Clock,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three';

const vertexShader = `
precision highp float;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3  iResolution;
uniform float animationSpeed;

uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;

uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;

uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;

uniform vec3 lineGradient[8];
uniform int lineGradientCount;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 getLineColor(float t) {
  if (lineGradientCount <= 0) return vec3(1.0);
  if (lineGradientCount == 1) return lineGradient[0];
  float clampedT = clamp(t, 0.0, 0.9999);
  float scaled = clampedT * float(lineGradientCount - 1);
  int idx = int(floor(scaled));
  float f = fract(scaled);
  int idx2 = min(idx + 1, lineGradientCount - 1);
  return mix(lineGradient[idx], lineGradient[idx2], f) * 0.5;
}

float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;
  float amp = sin(offset + time * 0.2) * 0.3;
  float y = sin(uv.x + offset + time * 0.1) * amp;

  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius);
    float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
    y += bendOffset;
  }

  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;

  if (parallax) baseUv += parallaxOffset;

  vec3 col = vec3(0.0);

  vec2 mouseUv = vec2(0.0);
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
  }

  if (enableBottom) {
    for (int i = 0; i < bottomLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(bottomLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t);
      float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
        1.5 + 0.2 * fi, baseUv, mouseUv, interactive
      ) * 0.2;
    }
  }

  if (enableMiddle) {
    for (int i = 0; i < middleLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(middleLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t);
      float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
        2.0 + 0.15 * fi, baseUv, mouseUv, interactive
      );
    }
  }

  if (enableTop) {
    for (int i = 0; i < topLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(topLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t);
      float angle = topWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      ruv.x *= -1.0;
      col += lineCol * wave(
        ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
        1.0 + 0.2 * fi, baseUv, mouseUv, interactive
      ) * 0.1;
    }
  }

  fragColor = vec4(col, 1.0);
}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}
`;

const MAX_GRADIENT_STOPS = 8;

function hexToVec3(hex) {
  let value = hex.trim().replace('#', '');
  let r = 255, g = 255, b = 255;
  if (value.length === 3) {
    r = parseInt(value[0] + value[0], 16);
    g = parseInt(value[1] + value[1], 16);
    b = parseInt(value[2] + value[2], 16);
  } else if (value.length === 6) {
    r = parseInt(value.slice(0, 2), 16);
    g = parseInt(value.slice(2, 4), 16);
    b = parseInt(value.slice(4, 6), 16);
  }
  return new Vector3(r / 255, g / 255, b / 255);
}

function FloatingLinesHero({ children }) {
  const containerRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const targetMouseRef = useRef(new Vector2(-1000, -1000));
  const currentMouseRef = useRef(new Vector2(-1000, -1000));
  const targetInfluenceRef = useRef(0);
  const currentInfluenceRef = useRef(0);
  const targetParallaxRef = useRef(new Vector2(0, 0));
  const currentParallaxRef = useRef(new Vector2(0, 0));

  const linesGradient = ['#1A1200', '#5C3D00', '#C9A84C', '#F0D080', '#C9A84C', '#5C3D00', '#1A1200'];

  useEffect(() => {
    const container = containerRef.current;
    const canvasWrap = canvasWrapRef.current;
    if (!container || !canvasWrap) return;

    let active = true;
    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    camera.position.z = 1;

    const renderer = new WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    canvasWrap.appendChild(renderer.domElement);

    const gradientVec3s = Array.from({ length: MAX_GRADIENT_STOPS }, () => new Vector3(1, 1, 1));
    const stops = linesGradient.slice(0, MAX_GRADIENT_STOPS);
    stops.forEach((hex, i) => {
      const c = hexToVec3(hex);
      gradientVec3s[i].set(c.x, c.y, c.z);
    });

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new Vector3(1, 1, 1) },
      animationSpeed: { value: 0.6 },
      enableTop: { value: true },
      enableMiddle: { value: true },
      enableBottom: { value: true },
      topLineCount: { value: 8 },
      middleLineCount: { value: 10 },
      bottomLineCount: { value: 8 },
      topLineDistance: { value: 0.05 },
      middleLineDistance: { value: 0.04 },
      bottomLineDistance: { value: 0.05 },
      topWavePosition: { value: new Vector3(10.0, 0.5, -0.4) },
      middleWavePosition: { value: new Vector3(5.0, 0.0, 0.2) },
      bottomWavePosition: { value: new Vector3(2.0, -0.7, 0.4) },
      iMouse: { value: new Vector2(-1000, -1000) },
      interactive: { value: true },
      bendRadius: { value: 5.0 },
      bendStrength: { value: -0.5 },
      bendInfluence: { value: 0 },
      parallax: { value: true },
      parallaxStrength: { value: 0.15 },
      parallaxOffset: { value: new Vector2(0, 0) },
      lineGradient: { value: gradientVec3s },
      lineGradientCount: { value: stops.length },
    };

    const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    const geometry = new PlaneGeometry(2, 2);
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    const clock = new Clock();

    const setSize = () => {
      if (!active) return;
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      renderer.setSize(width, height, false);
      const cw = renderer.domElement.width;
      const ch = renderer.domElement.height;
      uniforms.iResolution.value.set(cw, ch, 1);
    };
    setSize();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (active) setSize(); }) : null;
    if (ro) ro.observe(container);

    const handlePointerMove = event => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dpr = renderer.getPixelRatio();
      targetMouseRef.current.set(x * dpr, (rect.height - y) * dpr);
      targetInfluenceRef.current = 1.0;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      targetParallaxRef.current.set(
        ((x - centerX) / rect.width) * 0.15,
        -((y - centerY) / rect.height) * 0.15
      );
    };

    const handlePointerLeave = () => { targetInfluenceRef.current = 0.0; };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    let raf = 0;
    const renderLoop = () => {
      if (!active) return;
      uniforms.iTime.value = clock.getElapsedTime();
      currentMouseRef.current.lerp(targetMouseRef.current, 0.05);
      uniforms.iMouse.value.copy(currentMouseRef.current);
      currentInfluenceRef.current += (targetInfluenceRef.current - currentInfluenceRef.current) * 0.05;
      uniforms.bendInfluence.value = currentInfluenceRef.current;
      currentParallaxRef.current.lerp(targetParallaxRef.current, 0.05);
      uniforms.parallaxOffset.value.copy(currentParallaxRef.current);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div ref={containerRef} style={{
      position: 'relative',
      overflow: 'hidden',
      padding: '6rem 2rem',
      textAlign: 'center',
      borderBottom: '1px solid rgba(201,168,76,0.15)',
      background: '#0A0A0A',
    }}>
      <div
        ref={canvasWrapRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
        }}
      />
      <div style={{
        position: 'relative',
        zIndex: 2,
        isolation: 'isolate',
        pointerEvents: 'auto',
      }}>
        {children}
      </div>
    </div>
  );
}

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(stored);
  }, []);

  const updateQuantity = (id, size, delta) => {
    const updated = cart.map(item => {
      if (item.id === id && item.size === size) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    });
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const removeItem = (id, size) => {
    const updated = cart.filter(item => !(item.id === id && item.size === size));
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!mounted) return null;

  return (
    <div style={{ paddingTop: '70px' }}>

      <FloatingLinesHero>
        <p className="section-label">Your Selection</p>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#F5F0E8', marginTop: '0.5rem' }}>Shopping Cart</h1>
        <div className="divider-gold" />
        <p style={{ fontSize: '0.85rem', color: '#999', maxWidth: '500px', margin: '0 auto', lineHeight: 1.9 }}>
          {cart.length === 0 ? 'Your cart is currently empty.' : `${cart.length} item${cart.length > 1 ? 's' : ''} in your cart`}
        </p>
      </FloatingLinesHero>

      <section style={{ padding: '4rem 2rem 6rem', maxWidth: '1100px', margin: '0 auto' }}>

        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🛒</div>
            <h2 style={{ fontSize: '1.8rem', color: '#F5F0E8', marginBottom: '1rem' }}>Your cart is empty</h2>
            <div style={{ width: '40px', height: '1px', background: '#C9A84C', margin: '0 auto 1.5rem' }} />
            <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '2.5rem' }}>
              Discover our latest collection and find something you love.
            </p>
            <Link href="/shop" className="btn-gold">Browse Collection</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '3rem', alignItems: 'start' }}>

            <div>
              {cart.map((item, i) => (
                <div key={`${item.id}-${item.size}`} style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr auto',
                  gap: '1.5rem',
                  alignItems: 'center',
                  padding: '2rem 0',
                  borderBottom: i < cart.length - 1 ? '1px solid rgba(201,168,76,0.1)' : 'none',
                }}>

                  <div style={{
                    width: '100px',
                    height: '120px',
                    background: '#0F0F0F',
                    border: '1px solid rgba(201,168,76,0.15)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.5rem' }}>👕</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.1rem', color: '#F5F0E8', marginBottom: '0.3rem' }}>{item.name}</h3>
                    <p style={{ fontSize: '0.65rem', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                      Size: {item.size}
                    </p>
                    <p style={{ fontSize: '1rem', color: '#C9A84C', fontFamily: 'Cormorant Garamond, serif', marginBottom: '1rem' }}>
                      R {Number(item.price).toFixed(2)}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <button
                        onClick={() => updateQuantity(item.id, item.size, -1)}
                        style={{
                          width: '36px', height: '36px', background: 'transparent',
                          border: '1px solid rgba(201,168,76,0.2)', color: '#888',
                          fontSize: '1rem', cursor: 'pointer',
                        }}
                      >−</button>
                      <div style={{
                        width: '50px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid rgba(201,168,76,0.2)', borderLeft: 'none', borderRight: 'none',
                        fontSize: '0.82rem', color: '#F5F0E8',
                      }}>
                        {item.quantity}
                      </div>
                      <button
                        onClick={() => updateQuantity(item.id, item.size, 1)}
                        style={{
                          width: '36px', height: '36px', background: 'transparent',
                          border: '1px solid rgba(201,168,76,0.2)', color: '#888',
                          fontSize: '1rem', cursor: 'pointer',
                        }}
                      >+</button>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.1rem', color: '#F5F0E8', fontFamily: 'Cormorant Garamond, serif', marginBottom: '0.75rem' }}>
                      R {(item.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeItem(item.id, item.size)}
                      style={{
                        background: 'transparent', border: 'none', color: '#555',
                        fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                        cursor: 'pointer', transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => e.target.style.color = '#C9A84C'}
                      onMouseLeave={e => e.target.style.color = '#555'}
                    >
                      Remove
                    </button>
                  </div>

                </div>
              ))}

              <div style={{ marginTop: '2rem' }}>
                <Link href="/shop" style={{
                  fontSize: '0.65rem', color: '#666', textDecoration: 'none',
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                }}
                  onMouseEnter={e => e.target.style.color = '#C9A84C'}
                  onMouseLeave={e => e.target.style.color = '#666'}
                >
                  ← Continue Shopping
                </Link>
              </div>
            </div>

            <div style={{
              border: '1px solid rgba(201,168,76,0.2)',
              padding: '2.5rem',
              background: '#0F0F0F',
              position: 'sticky',
              top: '90px',
            }}>
              <p className="section-label" style={{ marginBottom: '0.5rem' }}>Order Summary</p>
              <h2 style={{ fontSize: '1.5rem', color: '#F5F0E8', marginBottom: '2rem' }}>Your Total</h2>

              <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: '1.5rem' }}>
                {cart.map(item => (
                  <div key={`${item.id}-${item.size}-summary`} style={{
                    display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem',
                  }}>
                    <p style={{ fontSize: '0.75rem', color: '#888', maxWidth: '180px' }}>
                      {item.name} <span style={{ color: '#555' }}>× {item.quantity}</span>
                      <span style={{ display: 'block', fontSize: '0.6rem', color: '#555', letterSpacing: '0.1em' }}>Size: {item.size}</span>
                    </p>
                    <p style={{ fontSize: '0.78rem', color: '#ccc' }}>R {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div style={{
                borderTop: '1px solid rgba(201,168,76,0.15)',
                paddingTop: '1.5rem',
                marginTop: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
              }}>
                <p style={{ fontSize: '0.65rem', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Subtotal</p>
                <p style={{ fontSize: '1.5rem', color: '#C9A84C', fontFamily: 'Cormorant Garamond, serif' }}>
                  R {subtotal.toFixed(2)}
                </p>
              </div>

              <p style={{ fontSize: '0.7rem', color: '#555', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                Shipping and taxes calculated at checkout.
              </p>

              <Link href="/checkout" className="btn-gold" style={{ display: 'block', textAlign: 'center' }}>
                Proceed to Checkout
              </Link>

              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <Link href="/returns" style={{ fontSize: '0.65rem', color: '#555', textDecoration: 'none', letterSpacing: '0.1em' }}
                  onMouseEnter={e => e.target.style.color = '#C9A84C'}
                  onMouseLeave={e => e.target.style.color = '#555'}
                >
                  30-Day Returns Policy →
                </Link>
              </div>
            </div>

          </div>
        )}
      </section>
    </div>
  );
}