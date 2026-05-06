'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import gsap from 'gsap';
import {
  Vector3, MeshPhysicalMaterial, InstancedMesh, Clock, AmbientLight,
  SphereGeometry, ShaderChunk, Scene, Color, Object3D, SRGBColorSpace,
  MathUtils, PMREMGenerator, Vector2, WebGLRenderer, PerspectiveCamera,
  PointLight, ACESFilmicToneMapping, Plane, Raycaster
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

class ThreeApp {
  #config;
  canvas;
  camera;
  cameraMinAspect;
  cameraMaxAspect;
  cameraFov;
  maxPixelRatio;
  minPixelRatio;
  scene;
  renderer;
  #composer;
  size = { width: 0, height: 0, wWidth: 0, wHeight: 0, ratio: 0, pixelRatio: 0 };
  render = this.#defaultRender;
  onBeforeRender = () => {};
  onAfterRender = () => {};
  onAfterResize = () => {};
  #visible = false;
  #running = false;
  isDisposed = false;
  #resizeTimeout;
  #resizeObserver;
  #intersectionObserver;
  #clock = new Clock();
  #time = { elapsed: 0, delta: 0 };
  #rafId;

  constructor(config) {
    this.#config = { ...config };
    this.#initCamera();
    this.#initScene();
    this.#initRenderer();
    this.resize();
    this.#initObservers();
  }

  #initCamera() {
    this.camera = new PerspectiveCamera();
    this.cameraFov = this.camera.fov;
  }

  #initScene() {
    this.scene = new Scene();
  }

  #initRenderer() {
    if (this.#config.canvas) {
      this.canvas = this.#config.canvas;
    } else if (this.#config.id) {
      this.canvas = document.getElementById(this.#config.id);
    }
    this.canvas.style.display = 'block';
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      powerPreference: 'high-performance',
      ...(this.#config.rendererOptions ?? {})
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
  }

  #initObservers() {
    if (!(this.#config.size instanceof Object)) {
      window.addEventListener('resize', this.#onResize.bind(this));
      if (this.#config.size === 'parent' && this.canvas.parentNode) {
        this.#resizeObserver = new ResizeObserver(this.#onResize.bind(this));
        this.#resizeObserver.observe(this.canvas.parentNode);
      }
    }
    this.#intersectionObserver = new IntersectionObserver(this.#onIntersect.bind(this), {
      root: null, rootMargin: '0px', threshold: 0
    });
    this.#intersectionObserver.observe(this.canvas);
    document.addEventListener('visibilitychange', this.#onVisibility.bind(this));
  }

  #removeObservers() {
    window.removeEventListener('resize', this.#onResize.bind(this));
    this.#resizeObserver?.disconnect();
    this.#intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.#onVisibility.bind(this));
  }

  #onIntersect(entries) {
    this.#visible = entries[0].isIntersecting;
    this.#visible ? this.#startLoop() : this.#stopLoop();
  }

  #onVisibility() {
    if (this.#visible) {
      document.hidden ? this.#stopLoop() : this.#startLoop();
    }
  }

  #onResize() {
    if (this.#resizeTimeout) clearTimeout(this.#resizeTimeout);
    this.#resizeTimeout = setTimeout(this.resize.bind(this), 100);
  }

  resize() {
    let w, h;
    if (this.#config.size instanceof Object) {
      w = this.#config.size.width;
      h = this.#config.size.height;
    } else if (this.#config.size === 'parent' && this.canvas.parentNode) {
      w = this.canvas.parentNode.offsetWidth;
      h = this.canvas.parentNode.offsetHeight;
    } else {
      w = window.innerWidth;
      h = window.innerHeight;
    }
    this.size.width = w;
    this.size.height = h;
    this.size.ratio = w / h;
    this.#updateCamera();
    this.#updateRenderer();
    this.onAfterResize(this.size);
  }

  #updateCamera() {
    this.camera.aspect = this.size.width / this.size.height;
    if (this.camera.isPerspectiveCamera && this.cameraFov) {
      if (this.cameraMinAspect && this.camera.aspect < this.cameraMinAspect) {
        this.#adjustFov(this.cameraMinAspect);
      } else if (this.cameraMaxAspect && this.camera.aspect > this.cameraMaxAspect) {
        this.#adjustFov(this.cameraMaxAspect);
      } else {
        this.camera.fov = this.cameraFov;
      }
    }
    this.camera.updateProjectionMatrix();
    this.updateWorldSize();
  }

  #adjustFov(aspect) {
    const t = Math.tan(MathUtils.degToRad(this.cameraFov / 2)) / (this.camera.aspect / aspect);
    this.camera.fov = 2 * MathUtils.radToDeg(Math.atan(t));
  }

  updateWorldSize() {
    if (this.camera.isPerspectiveCamera) {
      const fov = (this.camera.fov * Math.PI) / 180;
      this.size.wHeight = 2 * Math.tan(fov / 2) * this.camera.position.length();
      this.size.wWidth = this.size.wHeight * this.camera.aspect;
    }
  }

  #updateRenderer() {
    this.renderer.setSize(this.size.width, this.size.height);
    this.#composer?.setSize(this.size.width, this.size.height);
    let dpr = window.devicePixelRatio;
    if (this.maxPixelRatio && dpr > this.maxPixelRatio) dpr = this.maxPixelRatio;
    else if (this.minPixelRatio && dpr < this.minPixelRatio) dpr = this.minPixelRatio;
    this.renderer.setPixelRatio(dpr);
    this.size.pixelRatio = dpr;
  }

  #startLoop() {
    if (this.#running) return;
    const animate = () => {
      this.#rafId = requestAnimationFrame(animate);
      this.#time.delta = this.#clock.getDelta();
      this.#time.elapsed += this.#time.delta;
      this.onBeforeRender(this.#time);
      this.render();
      this.onAfterRender(this.#time);
    };
    this.#running = true;
    this.#clock.start();
    animate();
  }

  #stopLoop() {
    if (this.#running) {
      cancelAnimationFrame(this.#rafId);
      this.#running = false;
      this.#clock.stop();
    }
  }

  #defaultRender() {
    this.renderer.render(this.scene, this.camera);
  }

  clear() {
    this.scene.traverse(obj => {
      if (obj.isMesh && obj.material) {
        Object.keys(obj.material).forEach(k => {
          const v = obj.material[k];
          if (v && typeof v.dispose === 'function') v.dispose();
        });
        obj.material.dispose();
        obj.geometry.dispose();
      }
    });
    this.scene.clear();
  }

  dispose() {
    this.#removeObservers();
    this.#stopLoop();
    this.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.isDisposed = true;
  }
}

const pointerMap = new Map();
const pointerPos = new Vector2();
let pointerListening = false;

function createPointer(opts) {
  const state = {
    position: new Vector2(),
    nPosition: new Vector2(),
    hover: false,
    touching: false,
    onEnter() {},
    onMove() {},
    onClick() {},
    onLeave() {},
    ...opts
  };

  if (!pointerMap.has(opts.domElement)) {
    pointerMap.set(opts.domElement, state);
    if (!pointerListening) {
      document.body.addEventListener('pointermove', onPointerMove);
      document.body.addEventListener('pointerleave', onPointerLeave);
      document.body.addEventListener('click', onPointerClick);
      document.body.addEventListener('touchstart', onTouchStart, { passive: false });
      document.body.addEventListener('touchmove', onTouchMove, { passive: false });
      document.body.addEventListener('touchend', onTouchEnd, { passive: false });
      document.body.addEventListener('touchcancel', onTouchEnd, { passive: false });
      pointerListening = true;
    }
  }

  state.dispose = () => {
    pointerMap.delete(opts.domElement);
    if (pointerMap.size === 0) {
      document.body.removeEventListener('pointermove', onPointerMove);
      document.body.removeEventListener('pointerleave', onPointerLeave);
      document.body.removeEventListener('click', onPointerClick);
      document.body.removeEventListener('touchstart', onTouchStart);
      document.body.removeEventListener('touchmove', onTouchMove);
      document.body.removeEventListener('touchend', onTouchEnd);
      document.body.removeEventListener('touchcancel', onTouchEnd);
      pointerListening = false;
    }
  };

  return state;
}

function onPointerMove(e) {
  pointerPos.set(e.clientX, e.clientY);
  for (const [elem, state] of pointerMap) {
    const rect = elem.getBoundingClientRect();
    if (isInRect(rect)) {
      updatePosition(state, rect);
      if (!state.hover) { state.hover = true; state.onEnter(state); }
      state.onMove(state);
    } else if (state.hover && !state.touching) {
      state.hover = false;
      state.onLeave(state);
    }
  }
}

function onPointerLeave() {
  for (const state of pointerMap.values()) {
    if (state.hover) { state.hover = false; state.onLeave(state); }
  }
}

function onPointerClick(e) {
  pointerPos.set(e.clientX, e.clientY);
  for (const [elem, state] of pointerMap) {
    const rect = elem.getBoundingClientRect();
    updatePosition(state, rect);
    if (isInRect(rect)) state.onClick(state);
  }
}

function onTouchStart(e) {
  if (!e.touches.length) return;
  pointerPos.set(e.touches[0].clientX, e.touches[0].clientY);
  for (const [elem, state] of pointerMap) {
    const rect = elem.getBoundingClientRect();
    if (isInRect(rect)) {
      state.touching = true;
      updatePosition(state, rect);
      if (!state.hover) { state.hover = true; state.onEnter(state); }
      state.onMove(state);
    }
  }
}

function onTouchMove(e) {
  if (!e.touches.length) return;
  pointerPos.set(e.touches[0].clientX, e.touches[0].clientY);
  for (const [elem, state] of pointerMap) {
    const rect = elem.getBoundingClientRect();
    updatePosition(state, rect);
    if (isInRect(rect)) {
      if (!state.hover) { state.hover = true; state.touching = true; state.onEnter(state); }
      state.onMove(state);
    } else if (state.hover && state.touching) {
      state.onMove(state);
    }
  }
}

function onTouchEnd() {
  for (const state of pointerMap.values()) {
    if (state.touching) {
      state.touching = false;
      if (state.hover) { state.hover = false; state.onLeave(state); }
    }
  }
}

function updatePosition(state, rect) {
  state.position.x = pointerPos.x - rect.left;
  state.position.y = pointerPos.y - rect.top;
  state.nPosition.x = (state.position.x / rect.width) * 2 - 1;
  state.nPosition.y = -(state.position.y / rect.height) * 2 + 1;
}

function isInRect(rect) {
  return pointerPos.x >= rect.left && pointerPos.x <= rect.left + rect.width &&
    pointerPos.y >= rect.top && pointerPos.y <= rect.top + rect.height;
}

const { randFloat, randFloatSpread } = MathUtils;
const _vA = new Vector3(), _vB = new Vector3(), _vC = new Vector3();
const _vD = new Vector3(), _vE = new Vector3(), _vF = new Vector3();
const _vG = new Vector3(), _vH = new Vector3();

class BallPhysics {
  constructor(config) {
    this.config = config;
    this.positionData = new Float32Array(3 * config.count).fill(0);
    this.velocityData = new Float32Array(3 * config.count).fill(0);
    this.sizeData = new Float32Array(config.count).fill(1);
    this.driftData = new Float32Array(3 * config.count).fill(0);
    this.center = new Vector3();
    this.interactionActive = false;
    this.textZone = { x: 0, y: 0, halfW: 0, halfH: 0, enabled: true };
    this.#init();
    this.setSizes();
  }

  #init() {
    const { config: c, positionData: p, driftData: d } = this;
    for (let i = 0; i < c.count; i++) {
      const b = 3 * i;
      p[b]     = randFloatSpread(2 * c.maxX);
      p[b + 1] = randFloatSpread(2 * c.maxY);
      p[b + 2] = randFloatSpread(2 * c.maxZ);
      const driftScale = c.mobileDriftScale ?? 1;
      d[b]     = randFloatSpread(0.012) * driftScale;
      d[b + 1] = randFloatSpread(0.012) * driftScale;
      d[b + 2] = randFloatSpread(0.006) * driftScale;
    }
  }

  setSizes() {
    const { config: c, sizeData: s } = this;
    for (let i = 0; i < c.count; i++) s[i] = randFloat(c.minSize, c.maxSize);
  }

  update(e) {
    const { config: c, positionData: pos, sizeData: sz, velocityData: vel, driftData: drift, textZone: tz } = this;
    const dt = Math.min(e.delta, 0.05);

    for (let i = 0; i < c.count; i++) {
      const b = 3 * i;
      _vA.fromArray(pos, b);
      _vD.fromArray(vel, b);

      _vD.x += drift[b]     * dt * 60;
      _vD.y += drift[b + 1] * dt * 60;
      _vD.z += drift[b + 2] * dt * 60;

      _vD.multiplyScalar(0.985);
      _vD.clampLength(0, c.maxVelocity);

      _vA.add(_vD);

      if (_vA.x > c.maxX + sz[i]) _vA.x = -c.maxX - sz[i];
      else if (_vA.x < -c.maxX - sz[i]) _vA.x = c.maxX + sz[i];
      if (_vA.y > c.maxY + sz[i]) _vA.y = -c.maxY - sz[i];
      else if (_vA.y < -c.maxY - sz[i]) _vA.y = c.maxY + sz[i];
      if (_vA.z > c.maxZ + sz[i]) _vA.z = -c.maxZ - sz[i];
      else if (_vA.z < -c.maxZ - sz[i]) _vA.z = c.maxZ + sz[i];

      if (tz.enabled && tz.halfW > 0) {
        const dx = _vA.x - tz.x;
        const dy = _vA.y - tz.y;
        const ex = tz.halfW + sz[i];
        const ey = tz.halfH + sz[i];
        if (Math.abs(dx) < ex && Math.abs(dy) < ey) {
          const overlapX = ex - Math.abs(dx);
          const overlapY = ey - Math.abs(dy);
          if (overlapX < overlapY) {
            const push = overlapX * (dx >= 0 ? 1 : -1);
            _vA.x += push;
            _vD.x += push * 0.08;
          } else {
            const push = overlapY * (dy >= 0 ? 1 : -1);
            _vA.y += push;
            _vD.y += push * 0.08;
          }
        }
      }

      _vA.toArray(pos, b);
      _vD.toArray(vel, b);
    }

    if (this.interactionActive) {
      for (let i = 0; i < c.count; i++) {
        const b = 3 * i;
        _vA.fromArray(pos, b);
        _vD.fromArray(vel, b);
        _vC.copy(_vA).sub(this.center);
        const dist = _vC.length();
        const repulseRadius = sz[i] + c.repulseRadius;
        if (dist < repulseRadius && dist > 0.001) {
          const force = (repulseRadius - dist) / repulseRadius;
          _vF.copy(_vC).normalize().multiplyScalar(force * c.repulseStrength);
          _vD.add(_vF);
        }
        _vD.toArray(vel, b);
      }
    }

    for (let i = 0; i < c.count; i++) {
      const b = 3 * i;
      _vA.fromArray(pos, b);
      _vD.fromArray(vel, b);
      const ri = sz[i];
      for (let j = i + 1; j < c.count; j++) {
        const bj = 3 * j;
        _vB.fromArray(pos, bj);
        _vE.fromArray(vel, bj);
        const rj = sz[j];
        _vC.copy(_vB).sub(_vA);
        const dist = _vC.length();
        const sum = ri + rj;
        if (dist < sum && dist > 0.001) {
          const overlap = sum - dist;
          _vF.copy(_vC).normalize().multiplyScalar(0.5 * overlap);
          _vG.copy(_vF).multiplyScalar(Math.max(_vD.length(), 0.5));
          _vH.copy(_vF).multiplyScalar(Math.max(_vE.length(), 0.5));
          _vA.sub(_vF); _vD.sub(_vG);
          _vB.add(_vF); _vE.add(_vH);
          _vB.toArray(pos, bj);
          _vE.toArray(vel, bj);
        }
      }
      _vA.toArray(pos, b);
      _vD.toArray(vel, b);
    }
  }
}

class SubsurfaceMaterial extends MeshPhysicalMaterial {
  constructor(params) {
    super(params);
    this.uniforms = {
      thicknessDistortion: { value: 0.1 },
      thicknessAmbient: { value: 0 },
      thicknessAttenuation: { value: 0.1 },
      thicknessPower: { value: 2 },
      thicknessScale: { value: 10 }
    };
    this.defines.USE_UV = '';
    this.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader = `
        uniform float thicknessPower;
        uniform float thicknessScale;
        uniform float thicknessDistortion;
        uniform float thicknessAmbient;
        uniform float thicknessAttenuation;
      ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `void RE_Direct_Scattering(const in IncidentLight directLight, const in vec2 uv, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, inout ReflectedLight reflectedLight) {
          vec3 scatteringHalf = normalize(directLight.direction + (geometryNormal * thicknessDistortion));
          float scatteringDot = pow(saturate(dot(geometryViewDir, -scatteringHalf)), thicknessPower) * thicknessScale;
          #ifdef USE_COLOR
            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * vColor;
          #else
            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * diffuse;
          #endif
          reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;
        }
        void main() {`
      );
      const replaced = ShaderChunk.lights_fragment_begin.replaceAll(
        'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
        `RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
          RE_Direct_Scattering(directLight, vUv, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);`
      );
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', replaced);
      if (this.onBeforeCompile2) this.onBeforeCompile2(shader);
    };
  }
}

const _dummy = new Object3D();

function createBallpit(canvas, userConfig = {}) {
  const isMobile = window.innerWidth <= 768;

  const config = {
    count: isMobile ? 40 : 80,
    colors: [0xC9A84C, 0x8B6914, 0xEDD070, 0xA07828, 0xF5E6B8, 0x6B4E0A, 0x3D2A05],
    ambientColor: 0xfff8e7,
    ambientIntensity: 1.2,
    lightIntensity: 180,
    materialParams: { metalness: 0.5, roughness: 0.3, clearcoat: 0, clearcoatRoughness: 0 },
    minSize: isMobile ? 0.10 : 0.12,
    maxSize: isMobile ? 0.36 : 0.48,
    gravity: 0,
    friction: 0.998,
    wallBounce: 0.92,
    maxVelocity: isMobile ? 0.032 : 0.08,
    repulseRadius: 2.2,
    repulseStrength: 0.28,
    maxX: 5,
    maxY: 5,
    maxZ: 2,
    mobileDriftScale: isMobile ? 0.28 : 1,
    controlSphere0: false,
    followCursor: false,
    ...userConfig
  };

  const app = new ThreeApp({
    canvas,
    size: 'parent',
    rendererOptions: { antialias: false, alpha: true }
  });

  app.maxPixelRatio = 1.5;
  app.renderer.toneMapping = ACESFilmicToneMapping;
  app.camera.position.set(0, 0, 20);
  app.camera.lookAt(0, 0, 0);
  app.cameraMaxAspect = 1.5;
  app.resize();

  const envTexture = new PMREMGenerator(app.renderer, 0.04).fromScene(new RoomEnvironment()).texture;
  const geo = new SphereGeometry();
  const mat = new SubsurfaceMaterial({ envMap: envTexture, ...config.materialParams });
  mat.envMapRotation.x = -Math.PI / 2;

  const spheres = new InstancedMesh(geo, mat, config.count);
  const physics = new BallPhysics(config);

  const ambientLight = new AmbientLight(config.ambientColor, config.ambientIntensity);
  spheres.add(ambientLight);
  const pointLight = new PointLight(config.colors[0], config.lightIntensity);
  spheres.add(pointLight);

  const colorObjs = config.colors.map(c => new Color(c));
  const getColorAt = (ratio) => {
    const scaled = Math.max(0, Math.min(1, ratio)) * (colorObjs.length - 1);
    const idx = Math.floor(scaled);
    const alpha = scaled - idx;
    if (idx >= colorObjs.length - 1) return colorObjs[idx].clone();
    const out = new Color();
    out.r = colorObjs[idx].r + alpha * (colorObjs[idx + 1].r - colorObjs[idx].r);
    out.g = colorObjs[idx].g + alpha * (colorObjs[idx + 1].g - colorObjs[idx].g);
    out.b = colorObjs[idx].b + alpha * (colorObjs[idx + 1].b - colorObjs[idx].b);
    return out;
  };
  for (let i = 0; i < config.count; i++) {
    spheres.setColorAt(i, getColorAt(i / config.count));
  }
  spheres.instanceColor.needsUpdate = true;

  app.scene.add(spheres);

  const raycaster = new Raycaster();
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  const hitPoint = new Vector3();

  canvas.style.userSelect = 'none';

  let pointer = null;

  if (!isMobile) {
    canvas.style.touchAction = 'none';
    pointer = createPointer({
      domElement: canvas,
      onMove() {
        raycaster.setFromCamera(pointer.nPosition, app.camera);
        app.camera.getWorldDirection(plane.normal);
        raycaster.ray.intersectPlane(plane, hitPoint);
        physics.center.copy(hitPoint);
        physics.interactionActive = true;
      },
      onLeave() {
        physics.interactionActive = false;
      }
    });
  } else {
    canvas.style.touchAction = 'pan-y';
    canvas.style.pointerEvents = 'none';
  }

  function updateTextZone(wWidth, wHeight) {
    const isMob = window.innerWidth <= 768;
    physics.textZone.x = 0;
    physics.textZone.y = 0;
    physics.textZone.halfW = isMob ? wWidth * 0.30 : wWidth * 0.22;
    physics.textZone.halfH = isMob ? wHeight * 0.20 : wHeight * 0.25;
  }

  app.onBeforeRender = (e) => {
    physics.update(e);
    for (let i = 0; i < config.count; i++) {
      _dummy.position.fromArray(physics.positionData, 3 * i);
      _dummy.scale.setScalar(physics.sizeData[i]);
      _dummy.updateMatrix();
      spheres.setMatrixAt(i, _dummy.matrix);
      if (i === 0) pointLight.position.copy(_dummy.position);
    }
    spheres.instanceMatrix.needsUpdate = true;
  };

  app.onAfterResize = (e) => {
    config.maxX = e.wWidth / 2;
    config.maxY = e.wHeight / 2;
    updateTextZone(e.wWidth, e.wHeight);
  };

  updateTextZone(app.size.wWidth, app.size.wHeight);

  return {
    three: app,
    dispose() { pointer?.dispose(); app.dispose(); }
  };
}

function BallpitHero({ children }) {
  const canvasRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    instanceRef.current = createBallpit(canvas);
    return () => { instanceRef.current?.dispose(); };
  }, []);

  return (
    <section style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
      />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(3,2,10,0.82) 0%, rgba(3,2,10,0.55) 50%, rgba(3,2,10,0.18) 100%)',
      }} />
      <div style={{ position: 'relative', zIndex: 2, pointerEvents: 'none' }}>
        {children}
      </div>
    </section>
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
        const cx = gsap.getProperty(corner, 'x');
        const cy = gsap.getProperty(corner, 'y');
        const tx = targetCornerPositionsRef.current[i].x - cursorX;
        const ty = targetCornerPositionsRef.current[i].y - cursorY;
        const fx = cx + (tx - cx) * strength;
        const fy = cy + (ty - cy) * strength;
        const dur = strength >= 0.99 ? (parallaxOn ? 0.2 : 0) : 0.05;
        gsap.to(corner, { x: fx, y: fy, duration: dur, ease: dur === 0 ? 'none' : 'power1.out', overwrite: 'auto' });
      });
    };
    tickerFnRef.current = tickerFn;

    const moveHandler = e => moveCursor(e.clientX, e.clientY);
    window.addEventListener('mousemove', moveHandler);

    const scrollHandler = () => {
      if (!activeTarget || !cursorRef.current) return;
      const mx = gsap.getProperty(cursorRef.current, 'x');
      const my = gsap.getProperty(cursorRef.current, 'y');
      const el = document.elementFromPoint(mx, my);
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
      corners.forEach(c => gsap.killTweensOf(c));
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
      gsap.ticker.add(tickerFnRef.current);
      gsap.to(activeStrengthRef, { current: 1, duration: hoverDuration, ease: 'power2.out' });
      corners.forEach((corner, i) => {
        gsap.to(corner, { x: targetCornerPositionsRef.current[i].x - cursorX, y: targetCornerPositionsRef.current[i].y - cursorY, duration: 0.2, ease: 'power2.out' });
      });

      const leaveHandler = () => {
        gsap.ticker.remove(tickerFnRef.current);
        targetCornerPositionsRef.current = null;
        gsap.set(activeStrengthRef, { current: 0, overwrite: true });
        activeTarget = null;
        if (cornersRef.current) {
          const cs = Array.from(cornersRef.current);
          gsap.killTweensOf(cs);
          const { cornerSize: cs2 } = constants;
          const positions = [
            { x: -cs2 * 1.5, y: -cs2 * 1.5 },
            { x: cs2 * 0.5, y: -cs2 * 1.5 },
            { x: cs2 * 0.5, y: cs2 * 0.5 },
            { x: -cs2 * 1.5, y: cs2 * 0.5 },
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

function FloatingSlab({ children, driftX = 0, driftY = 0, driftRot = 0, delay = 0, style = {} }) {
  const [pos, setPos] = useState({ y: 0, x: 0, rot: 0 });
  const tRef = useRef(delay * 80);
  useEffect(() => {
    let raf;
    const loop = () => {
      tRef.current += 0.008;
      const t = tRef.current;
      setPos({ y: Math.sin(t * 0.7 + delay) * driftY, x: Math.cos(t * 0.5 + delay) * driftX, rot: Math.sin(t * 0.4 + delay) * driftRot });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div style={{ transform: `translate(${pos.x}px,${pos.y}px) rotate(${pos.rot}deg)`, willChange: 'transform', ...style }}>{children}</div>;
}

function GlassPanel({ children, index = 0, visible = true, delay = 0, style = {} }) {
  const [hov, setHov] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setMouse({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
  }, []);
  const d = delay + index * 0.1;
  return (
    <div ref={ref} onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setMouse({ x: 0, y: 0 }); }} onMouseMove={onMove} style={{ perspective: '800px', ...style }}>
      <div style={{
        background: hov ? 'rgba(201,168,76,0.055)' : 'rgba(255,255,255,0.022)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid', borderColor: hov ? 'rgba(201,168,76,0.55)' : 'rgba(255,255,255,0.07)',
        position: 'relative', overflow: 'hidden',
        transform: `rotateX(${hov ? mouse.y * -16 : 0}deg) rotateY(${hov ? mouse.x * 20 : 0}deg) translateZ(${hov ? 16 : 0}px) translateY(${visible ? 0 : 50}px)`,
        opacity: visible ? 1 : 0,
        transition: hov
          ? 'background 0.3s, border-color 0.3s, box-shadow 0.3s, transform 0.08s'
          : `background 0.5s, border-color 0.5s, box-shadow 0.5s, opacity 0.85s ease ${d}s, transform 0.85s cubic-bezier(0.16,1,0.3,1) ${d}s`,
        boxShadow: hov ? '0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(201,168,76,0.18), inset 0 1px 0 rgba(201,168,76,0.12)' : '0 8px 40px rgba(0,0,0,0.35)',
        cursor: 'default',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg,transparent,rgba(201,168,76,${hov ? 0.55 : 0.12}),transparent)`, transition: 'all 0.4s' }} />
        <div style={{ position: 'absolute', top: 0, left: hov ? '100%' : '-100%', width: '60%', height: '100%', background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.04),transparent)', transition: 'left 0.8s ease', pointerEvents: 'none' }} />
        {children(hov)}
      </div>
    </div>
  );
}

export default function AboutPage() {
  const [heroVis, setHeroVis] = useState(false);
  const [scroll, setScroll] = useState(0);
  const [foundVis, setFoundVis] = useState(false);
  const [collVis, setCollVis] = useState(false);
  const [valVis, setValVis] = useState(false);
  const [whatVis, setWhatVis] = useState(false);
  const isMobile = useIsMobile();

  const foundRef = useRef(null);
  const collRef = useRef(null);
  const valRef = useRef(null);
  const whatRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setHeroVis(true), 120);
    const observe = (ref, setter) => {
      const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setter(true); }, { threshold: 0.12 });
      if (ref.current) obs.observe(ref.current);
      return obs;
    };
    const o1 = observe(foundRef, setFoundVis);
    const o2 = observe(collRef, setCollVis);
    const o3 = observe(valRef, setValVis);
    const o4 = observe(whatRef, setWhatVis);
    const onScroll = () => setScroll(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      [o1, o2, o3, o4].forEach(o => o.disconnect());
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div style={{ paddingTop: '70px', background: '#03020a', minHeight: '100vh', overflowX: 'hidden' }}>

      {!isMobile && (
        <TargetCursor
          targetSelector="a, button"
          spinDuration={2.4}
          hideDefaultCursor={true}
          hoverDuration={0.18}
          parallaxOn={true}
        />
      )}

      <BallpitHero>
        <div style={{ transform: `translateY(${-scroll * 0.12}px)`, textAlign: 'center', padding: isMobile ? '1.5rem' : '2rem' }}>
          <FloatingSlab driftY={5} driftX={2} delay={0.3}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', marginBottom: isMobile ? '1.8rem' : '3rem', opacity: heroVis ? 1 : 0, transform: heroVis ? 'none' : 'translateY(20px)', transition: 'opacity 1s ease 0.2s,transform 1s ease 0.2s' }}>
              <div style={{ width: '28px', height: '1px', background: 'linear-gradient(90deg,transparent,#C9A84C)' }} />
              <p style={{ fontSize: '0.5rem', color: '#C9A84C', letterSpacing: '0.58em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif', fontWeight: 300 }}>Who We Are</p>
              <div style={{ width: '28px', height: '1px', background: 'linear-gradient(90deg,#C9A84C,transparent)' }} />
            </div>
          </FloatingSlab>

          <div style={{
            display: 'inline-block',
            padding: isMobile ? '1.2rem 2rem 1.6rem' : '1.5rem 3rem 2rem',
            borderRadius: '4px',
            background: 'rgba(3,2,10,0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}>
            <FloatingSlab driftY={10} driftX={4} delay={0}>
              <div style={{ overflow: 'hidden' }}>
                <h1 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: isMobile ? 'clamp(3.8rem,16vw,6rem)' : 'clamp(3.5rem,11vw,9.5rem)', fontWeight: 300, lineHeight: 0.9, color: 'rgba(255,255,255,0.93)', letterSpacing: '-0.02em', display: 'block', opacity: heroVis ? 1 : 0, transform: heroVis ? 'none' : 'translateY(80px)', transition: 'opacity 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s,transform 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s', textShadow: '0 0 80px rgba(255,255,255,0.07)' }}>About</h1>
              </div>
            </FloatingSlab>

            <FloatingSlab driftY={14} driftX={-6} delay={1.5}>
              <div style={{ overflow: 'hidden' }}>
                <h1 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: isMobile ? 'clamp(3.8rem,16vw,6rem)' : 'clamp(3.5rem,11vw,9.5rem)', fontWeight: 300, lineHeight: 0.9, color: '#C9A84C', letterSpacing: '-0.02em', fontStyle: 'italic', display: 'block', opacity: heroVis ? 1 : 0, transform: heroVis ? 'none' : 'translateY(80px)', transition: 'opacity 1.2s cubic-bezier(0.16,1,0.3,1) 0.52s,transform 1.2s cubic-bezier(0.16,1,0.3,1) 0.52s', textShadow: '0 0 100px rgba(201,168,76,0.65),0 0 200px rgba(201,168,76,0.2)' }}>Us</h1>
              </div>
            </FloatingSlab>
          </div>

          <div style={{ marginTop: isMobile ? '3rem' : '5rem', opacity: heroVis ? 0.45 : 0, transition: 'opacity 1s ease 2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
            <p style={{ fontSize: '0.43rem', color: '#C9A84C', letterSpacing: '0.5em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif' }}>Drift down</p>
            <div style={{ width: '1px', height: '60px', background: 'linear-gradient(180deg,#C9A84C,transparent)', animation: 'aboutPulse 2s ease-in-out infinite' }} />
          </div>
        </div>
      </BallpitHero>

      <section ref={foundRef} style={{ padding: isMobile ? '6rem 1.5rem' : '10rem 3rem', position: 'relative', zIndex: 2, maxWidth: '1100px', margin: '0 auto' }}>
        <FloatingSlab driftY={7} delay={0.2}>
          <div style={{ textAlign: 'center', marginBottom: '6rem', opacity: foundVis ? 1 : 0, transform: foundVis ? 'none' : 'translateY(30px)', transition: 'opacity 0.9s,transform 0.9s' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ width: '45px', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.45))' }} />
              <p style={{ fontSize: '0.49rem', color: 'rgba(201,168,76,0.55)', letterSpacing: '0.5em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif' }}>The Founders</p>
              <div style={{ width: '45px', height: '1px', background: 'linear-gradient(90deg,rgba(201,168,76,0.45),transparent)' }} />
            </div>
            <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 'clamp(2.2rem,5vw,4rem)', fontWeight: 300, color: 'rgba(255,255,255,0.88)' }}>Two Passions, One Vision</h2>
          </div>
        </FloatingSlab>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <FloatingSlab driftY={12} driftX={-4} delay={0}>
            <GlassPanel index={0} visible={foundVis} delay={0.1}>
              {(hov) => (
                <div style={{ padding: isMobile ? '2rem 1.5rem' : '4rem', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr', gap: isMobile ? '2rem' : '4rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '90px', height: '90px', borderRadius: '50%', border: `1px solid rgba(201,168,76,${hov ? 0.55 : 0.18})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.2rem', transition: 'border-color 0.4s', position: 'relative' }}>
                      <span style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '2.2rem', color: '#C9A84C', fontWeight: 300 }}>01</span>
                      <div style={{ position: 'absolute', inset: '-8px', borderRadius: '50%', border: `1px solid rgba(201,168,76,${hov ? 0.18 : 0.05})`, transition: 'border-color 0.4s' }} />
                    </div>
                    <p style={{ fontSize: '0.46rem', color: 'rgba(201,168,76,0.45)', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap' }}>Co-Founder</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.48rem', color: hov ? 'rgba(201,168,76,0.75)' : 'rgba(201,168,76,0.48)', letterSpacing: '0.38em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif', marginBottom: '0.7rem', transition: 'color 0.3s' }}>Sports & Performance</p>
                    <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '2.5rem', fontWeight: 300, color: hov ? '#fff' : 'rgba(255,255,255,0.88)', marginBottom: '0.4rem', transition: 'color 0.3s' }}>Romario Govender</h3>
                    <p style={{ fontSize: '0.53rem', color: '#C9A84C', letterSpacing: '0.18em', fontFamily: 'Montserrat,sans-serif', marginBottom: '1.8rem' }}>Athletic Excellence</p>
                    <p style={{ fontSize: '0.67rem', color: hov ? 'rgba(255,255,255,0.48)' : 'rgba(255,255,255,0.27)', lineHeight: 2.1, letterSpacing: '0.04em', transition: 'color 0.4s' }}>
                      A true athlete at heart, Romario has excelled in nearly every sport imaginable. As a semi-professional golfer, he brings an elite athlete's perspective — ensuring every sportswear piece performs at the highest level.
                    </p>
                  </div>
                </div>
              )}
            </GlassPanel>
          </FloatingSlab>

          <FloatingSlab driftY={10} driftX={5} delay={1.2} style={{ alignSelf: 'flex-end', width: '94%' }}>
            <GlassPanel index={1} visible={foundVis} delay={0.25}>
              {(hov) => (
                <div style={{ padding: isMobile ? '2rem 1.5rem' : '4rem', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: isMobile ? '2rem' : '4rem', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.48rem', color: hov ? 'rgba(201,168,76,0.75)' : 'rgba(201,168,76,0.48)', letterSpacing: '0.38em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif', marginBottom: '0.7rem', transition: 'color 0.3s' }}>Lifestyle & Luxury</p>
                    <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '2.5rem', fontWeight: 300, color: hov ? '#fff' : 'rgba(255,255,255,0.88)', marginBottom: '0.4rem', transition: 'color 0.3s' }}>Rhea Jugernath</h3>
                    <p style={{ fontSize: '0.53rem', color: '#C9A84C', letterSpacing: '0.18em', fontFamily: 'Montserrat,sans-serif', marginBottom: '1.8rem' }}>Style & Sophistication</p>
                    <p style={{ fontSize: '0.67rem', color: hov ? 'rgba(255,255,255,0.48)' : 'rgba(255,255,255,0.27)', lineHeight: 2.1, letterSpacing: '0.04em', transition: 'color 0.4s' }}>
                      With a passion for fashion and an eye for luxury, Rhea brings the lifestyle element that elevates R&R beyond performance wear — ensuring every collection embodies sophistication, comfort, and timeless style.
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '90px', height: '90px', borderRadius: '50%', border: `1px solid rgba(201,168,76,${hov ? 0.55 : 0.18})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.2rem', transition: 'border-color 0.4s', position: 'relative' }}>
                      <span style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '2.2rem', color: '#C9A84C', fontWeight: 300 }}>02</span>
                      <div style={{ position: 'absolute', inset: '-8px', borderRadius: '50%', border: `1px solid rgba(201,168,76,${hov ? 0.18 : 0.05})`, transition: 'border-color 0.4s' }} />
                    </div>
                    <p style={{ fontSize: '0.46rem', color: 'rgba(201,168,76,0.45)', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap' }}>Co-Founder</p>
                  </div>
                </div>
              )}
            </GlassPanel>
          </FloatingSlab>

          <FloatingSlab driftY={9} driftX={2} delay={0.6}>
            <GlassPanel index={2} visible={foundVis} delay={0.4}>
              {(hov) => (
                <div style={{ padding: isMobile ? '2.5rem 1.5rem' : '3.5rem 4rem', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 'clamp(1.1rem,2.5vw,1.6rem)', fontWeight: 300, fontStyle: 'italic', color: hov ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)', lineHeight: 1.8, transition: 'color 0.4s', maxWidth: '720px', margin: '0 auto' }}>
                    "Where athletic performance meets everyday elegance — where functionality embraces fashion, and every piece tells the story of{' '}
                    <span style={{ color: '#C9A84C', fontStyle: 'normal' }}>two passions perfectly combined.</span>"
                  </p>
                </div>
              )}
            </GlassPanel>
          </FloatingSlab>
        </div>
      </section>

      <section ref={whatRef} style={{ padding: isMobile ? '5rem 1.5rem' : '8rem 3rem', position: 'relative', zIndex: 2, maxWidth: '1100px', margin: '0 auto' }}>
        <FloatingSlab driftY={6} delay={0.2}>
          <div style={{ textAlign: 'center', marginBottom: '5rem', opacity: whatVis ? 1 : 0, transform: whatVis ? 'none' : 'translateY(30px)', transition: 'opacity 0.9s,transform 0.9s' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 'clamp(2rem,5vw,3.8rem)', fontWeight: 300, color: 'rgba(255,255,255,0.88)' }}>What Sets Us Apart</h2>
            <div style={{ width: '45px', height: '1px', background: '#C9A84C', margin: '1.5rem auto 0' }} />
          </div>
        </FloatingSlab>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit,minmax(280px,1fr))', gap: '1.5rem' }}>
          {[
            { icon: '🧵', title: 'Premium Fabrics', desc: 'Only the finest technical materials, selected for performance and durability.', num: '01' },
            { icon: '🎨', title: 'Contemporary Design', desc: 'Original collections blending athletic functionality with street-style aesthetics.', num: '02' },
            { icon: '✨', title: 'Limited Edition', desc: 'Every garment produced in limited quantities. Once gone, never reproduced.', num: '03' },
          ].map((item, i) => (
            <FloatingSlab key={item.title} driftY={8 + i * 3} driftX={i % 2 === 0 ? 4 : -4} delay={i * 0.5}>
              <GlassPanel index={i} visible={whatVis} delay={i * 0.14}>
                {(hov) => (
                  <div style={{ padding: '3rem 2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                      <span style={{ fontSize: '2.2rem', transform: hov ? 'translateY(-6px) scale(1.15)' : 'none', transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1)', display: 'block', filter: hov ? 'drop-shadow(0 8px 16px rgba(201,168,76,0.4))' : 'none' }}>{item.icon}</span>
                      <span style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '3rem', color: hov ? 'rgba(201,168,76,0.18)' : 'rgba(201,168,76,0.06)', fontWeight: 300, transition: 'color 0.4s', lineHeight: 1 }}>{item.num}</span>
                    </div>
                    <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.5rem', fontWeight: 300, color: hov ? '#fff' : 'rgba(255,255,255,0.78)', marginBottom: '0.8rem', transition: 'color 0.3s' }}>{item.title}</h3>
                    <p style={{ fontSize: '0.63rem', color: hov ? 'rgba(255,255,255,0.44)' : 'rgba(255,255,255,0.2)', lineHeight: 2, letterSpacing: '0.05em', transition: 'color 0.4s' }}>{item.desc}</p>
                  </div>
                )}
              </GlassPanel>
            </FloatingSlab>
          ))}
        </div>
      </section>

      <section ref={collRef} style={{ padding: isMobile ? '5rem 1.5rem' : '8rem 3rem', position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto' }}>
        <FloatingSlab driftY={7} delay={0.1}>
          <div style={{ marginBottom: '5rem', opacity: collVis ? 1 : 0, transform: collVis ? 'none' : 'translateY(30px)', transition: 'opacity 0.9s,transform 0.9s' }}>
            <p style={{ fontSize: '0.49rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.5em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif', marginBottom: '0.8rem' }}>Collections</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 'clamp(2rem,5vw,3.8rem)', fontWeight: 300, color: 'rgba(255,255,255,0.88)' }}>
              Designed for Every Aspect<br /><span style={{ color: '#C9A84C', fontStyle: 'italic' }}>of Your Active Life</span>
            </h2>
          </div>
        </FloatingSlab>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit,minmax(230px,1fr))', gap: '2px', background: 'rgba(201,168,76,0.04)' }}>
          {[
            { tag: 'Sportswear', title: 'Active Performance', desc: 'Technical wear engineered for peak performance.', icon: '⚡' },
            { tag: 'Training', title: 'Essentials', desc: 'Versatile pieces for every workout.', icon: '🔥' },
            { tag: 'Lifestyle', title: 'Urban', desc: 'Streetwear with athletic DNA.', icon: '🌆' },
            { tag: 'Luxury', title: 'Premium', desc: 'Exclusive pieces from the finest materials.', icon: '✦' },
          ].map((col, i) => (
            <FloatingSlab key={col.title} driftY={6 + i * 2} driftX={i % 2 === 0 ? 3 : -3} delay={i * 0.28}>
              <GlassPanel index={i} visible={collVis} delay={i * 0.12}>
                {(hov) => (
                  <div style={{ padding: isMobile ? '2rem 1.2rem' : '3rem 2rem' }}>
                    <p style={{ fontSize: '0.43rem', color: hov ? 'rgba(201,168,76,0.75)' : 'rgba(201,168,76,0.38)', letterSpacing: '0.38em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif', marginBottom: '1.5rem', transition: 'color 0.3s' }}>{col.tag}</p>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem', transform: hov ? 'translateY(-4px)' : 'none', transition: 'transform 0.4s' }}>{col.icon}</span>
                    <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: isMobile ? '1.3rem' : '1.7rem', fontWeight: 300, color: hov ? '#fff' : 'rgba(255,255,255,0.72)', marginBottom: '0.8rem', transition: 'color 0.3s' }}>{col.title}</h3>
                    <p style={{ fontSize: '0.6rem', color: hov ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.18)', lineHeight: 2, transition: 'color 0.4s' }}>{col.desc}</p>
                    <div style={{ marginTop: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: hov ? 1 : 0, transform: hov ? 'translateX(0)' : 'translateX(-10px)', transition: 'all 0.4s' }}>
                      <div style={{ width: '18px', height: '1px', background: '#C9A84C' }} />
                      <span style={{ fontSize: '0.43rem', color: '#C9A84C', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif' }}>Explore</span>
                    </div>
                  </div>
                )}
              </GlassPanel>
            </FloatingSlab>
          ))}
        </div>
      </section>

      <section ref={valRef} style={{ padding: isMobile ? '5rem 1.5rem 8rem' : '8rem 3rem 12rem', position: 'relative', zIndex: 2, maxWidth: '1100px', margin: '0 auto' }}>
        <FloatingSlab driftY={8} delay={0}>
          <div style={{ textAlign: 'center', marginBottom: '6rem', opacity: valVis ? 1 : 0, transform: valVis ? 'none' : 'translateY(30px)', transition: 'opacity 0.9s,transform 0.9s' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 'clamp(2rem,5vw,3.8rem)', fontWeight: 300, color: 'rgba(255,255,255,0.88)' }}>Our Values</h2>
            <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.15em', marginTop: '1rem', fontFamily: 'Montserrat,sans-serif', fontWeight: 200 }}>What drives every decision we make</p>
          </div>
        </FloatingSlab>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: '1.5rem' }}>
          {[
            { title: 'Quality', desc: 'Only the finest materials, constructed to outlast trends and time.', sym: 'Ⅰ' },
            { title: 'Design', desc: 'Style meets function — every piece is entirely intentional.', sym: 'Ⅱ' },
            { title: 'Customer Focus', desc: 'You are at the heart of everything we create and do.', sym: 'Ⅲ' },
            { title: 'Innovation', desc: 'Always improving, always evolving, never standing still.', sym: 'Ⅳ' },
          ].map((v, i) => (
            <FloatingSlab key={v.title} driftY={8 + i * 2} driftX={i % 2 === 0 ? -5 : 5} driftRot={i % 2 === 0 ? 0.14 : -0.14} delay={i * 0.4}>
              <GlassPanel index={i} visible={valVis} delay={i * 0.14}>
                {(hov) => (
                  <div style={{ padding: isMobile ? '2.5rem 2rem' : '3.5rem 3rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: '0.5rem', right: '1.5rem', fontFamily: 'Cormorant Garamond,serif', fontSize: '5rem', fontWeight: 300, color: hov ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.04)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', transition: 'color 0.4s' }}>{v.sym}</div>
                    <div style={{ width: hov ? '50px' : '20px', height: '1px', background: '#C9A84C', marginBottom: '2rem', transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
                    <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.8rem', fontWeight: 300, color: hov ? '#fff' : '#C9A84C', marginBottom: '1rem', transition: 'color 0.3s' }}>{v.title}</h3>
                    <p style={{ fontSize: '0.64rem', color: hov ? 'rgba(255,255,255,0.44)' : 'rgba(255,255,255,0.2)', lineHeight: 2.1, letterSpacing: '0.04em', transition: 'color 0.4s' }}>{v.desc}</p>
                  </div>
                )}
              </GlassPanel>
            </FloatingSlab>
          ))}
        </div>
      </section>

      <section style={{ padding: isMobile ? '6rem 1.5rem' : '10rem 2rem', position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <FloatingSlab driftY={10} driftX={2} delay={0.5}>
          <div style={{ maxWidth: '750px', margin: '0 auto' }}>
            <p style={{ fontSize: '0.49rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.5em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif', marginBottom: '2.5rem' }}>Ready to Explore?</p>
            <p style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 'clamp(1.8rem,4.5vw,3.2rem)', fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: '3.5rem' }}>
              "Premium clothing that combines{' '}<span style={{ color: '#C9A84C', fontStyle: 'normal' }}>elegance with comfort</span>, designed for those who live without compromise."
            </p>
            <div style={{ display: 'flex', gap: '1.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/shop" className="rr-btn-primary">Shop the Collection</Link>
              <Link href="/contact" className="rr-btn-ghost">Get in Touch</Link>
            </div>
          </div>
        </FloatingSlab>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap');

        @media (min-width: 769px) {
          * { cursor: none !important; }
        }

        html { scroll-behavior: smooth; }
        *, *::before, *::after { box-sizing: border-box; }

        .tc-wrapper {
          position: fixed; top: 0; left: 0;
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

        @keyframes aboutPulse {
          0%,100% { opacity:0.8; transform:scaleY(1); }
          50% { opacity:0.12; transform:scaleY(0.2); }
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
        .rr-btn-primary::before {
          content:''; position:absolute; inset:0;
          background:#EDD070; transform:translateX(-101%);
          transition:transform 0.55s cubic-bezier(0.16,1,0.3,1);
        }
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