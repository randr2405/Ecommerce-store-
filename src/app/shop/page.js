'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import * as THREE from 'three';

// ─── Inlined LiquidEther (no external file needed) ───────────────────────────
function LiquidEther({
  mouseForce = 20,
  cursorSize = 100,
  isViscous = false,
  viscous = 30,
  iterationsViscous = 32,
  iterationsPoisson = 32,
  dt = 0.014,
  BFECC = true,
  resolution = 0.5,
  isBounce = false,
  colors = ['#5227FF', '#FF9FFC', '#B497CF'],
  style = {},
  className = '',
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
  takeoverDuration = 0.25,
  autoResumeDelay = 1000,
  autoRampDuration = 0.6,
}) {
  const mountRef = useRef(null);
  const webglRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const rafRef = useRef(null);
  const intersectionObserverRef = useRef(null);
  const isVisibleRef = useRef(true);
  const resizeRafRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    function makePaletteTexture(stops) {
      const arr = stops.length === 1 ? [stops[0], stops[0]] : stops;
      const w = arr.length;
      const data = new Uint8Array(w * 4);
      for (let i = 0; i < w; i++) {
        const c = new THREE.Color(arr[i]);
        data[i*4+0] = Math.round(c.r*255);
        data[i*4+1] = Math.round(c.g*255);
        data[i*4+2] = Math.round(c.b*255);
        data[i*4+3] = 255;
      }
      const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      return tex;
    }

    const paletteTex = makePaletteTexture(colors);
    const bgVec4 = new THREE.Vector4(0, 0, 0, 0);

    class CommonClass {
      constructor() { this.width=0; this.height=0; this.pixelRatio=1; this.time=0; this.delta=0; this.container=null; this.renderer=null; this.clock=null; }
      init(container) {
        this.container = container;
        this.pixelRatio = Math.min(window.devicePixelRatio||1, 2);
        this.resize();
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.autoClear = false;
        this.renderer.setClearColor(new THREE.Color(0x000000), 0);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.display = 'block';
        this.clock = new THREE.Clock();
        this.clock.start();
      }
      resize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.width = Math.max(1, Math.floor(rect.width));
        this.height = Math.max(1, Math.floor(rect.height));
        if (this.renderer) this.renderer.setSize(this.width, this.height, false);
      }
      update() { this.delta = this.clock.getDelta(); this.time += this.delta; }
    }
    const Common = new CommonClass();

    class MouseClass {
      constructor() {
        this.mouseMoved=false; this.coords=new THREE.Vector2(); this.coords_old=new THREE.Vector2(); this.diff=new THREE.Vector2();
        this.timer=null; this.container=null; this.listenerTarget=null; this.docTarget=null;
        this.isHoverInside=false; this.hasUserControl=false; this.isAutoActive=false; this.autoIntensity=2.0;
        this.takeoverActive=false; this.takeoverStartTime=0; this.takeoverDuration=0.25;
        this.takeoverFrom=new THREE.Vector2(); this.takeoverTo=new THREE.Vector2(); this.onInteract=null;
        this._onMouseMove=this.onDocumentMouseMove.bind(this);
        this._onTouchStart=this.onDocumentTouchStart.bind(this);
        this._onTouchMove=this.onDocumentTouchMove.bind(this);
        this._onTouchEnd=this.onTouchEnd.bind(this);
        this._onDocumentLeave=this.onDocumentLeave.bind(this);
      }
      init(container) {
        this.container = container;
        this.docTarget = container.ownerDocument||null;
        const dv = (this.docTarget&&this.docTarget.defaultView)||(typeof window!=='undefined'?window:null);
        if (!dv) return;
        this.listenerTarget = dv;
        dv.addEventListener('mousemove', this._onMouseMove);
        dv.addEventListener('touchstart', this._onTouchStart, { passive: true });
        dv.addEventListener('touchmove', this._onTouchMove, { passive: true });
        dv.addEventListener('touchend', this._onTouchEnd);
        if (this.docTarget) this.docTarget.addEventListener('mouseleave', this._onDocumentLeave);
      }
      dispose() {
        if (this.listenerTarget) {
          this.listenerTarget.removeEventListener('mousemove', this._onMouseMove);
          this.listenerTarget.removeEventListener('touchstart', this._onTouchStart);
          this.listenerTarget.removeEventListener('touchmove', this._onTouchMove);
          this.listenerTarget.removeEventListener('touchend', this._onTouchEnd);
        }
        if (this.docTarget) this.docTarget.removeEventListener('mouseleave', this._onDocumentLeave);
        this.listenerTarget=null; this.docTarget=null; this.container=null;
      }
      isPointInside(cx, cy) {
        if (!this.container) return false;
        const r = this.container.getBoundingClientRect();
        return cx>=r.left&&cx<=r.right&&cy>=r.top&&cy<=r.bottom;
      }
      updateHoverState(cx, cy) { this.isHoverInside=this.isPointInside(cx,cy); return this.isHoverInside; }
      setCoords(x, y) {
        if (!this.container) return;
        if (this.timer) window.clearTimeout(this.timer);
        const r = this.container.getBoundingClientRect();
        if (!r.width||!r.height) return;
        this.coords.set((x-r.left)/r.width*2-1, -((y-r.top)/r.height*2-1));
        this.mouseMoved = true;
        this.timer = window.setTimeout(() => { this.mouseMoved=false; }, 100);
      }
      setNormalized(nx, ny) { this.coords.set(nx,ny); this.mouseMoved=true; }
      onDocumentMouseMove(e) {
        if (!this.updateHoverState(e.clientX,e.clientY)) return;
        if (this.onInteract) this.onInteract();
        if (this.isAutoActive&&!this.hasUserControl&&!this.takeoverActive) {
          const r=this.container.getBoundingClientRect();
          if (!r.width||!r.height) return;
          this.takeoverFrom.copy(this.coords);
          this.takeoverTo.set((e.clientX-r.left)/r.width*2-1, -((e.clientY-r.top)/r.height*2-1));
          this.takeoverStartTime=performance.now(); this.takeoverActive=true; this.hasUserControl=true; this.isAutoActive=false; return;
        }
        this.setCoords(e.clientX,e.clientY); this.hasUserControl=true;
      }
      onDocumentTouchStart(e) {
        if (e.touches.length!==1) return;
        const t=e.touches[0];
        if (!this.updateHoverState(t.clientX,t.clientY)) return;
        if (this.onInteract) this.onInteract();
        this.setCoords(t.clientX,t.clientY); this.hasUserControl=true;
      }
      onDocumentTouchMove(e) {
        if (e.touches.length!==1) return;
        const t=e.touches[0];
        if (!this.updateHoverState(t.clientX,t.clientY)) return;
        if (this.onInteract) this.onInteract();
        this.setCoords(t.clientX,t.clientY);
      }
      onTouchEnd() { this.isHoverInside=false; }
      onDocumentLeave() { this.isHoverInside=false; }
      update() {
        if (this.takeoverActive) {
          const t=(performance.now()-this.takeoverStartTime)/(this.takeoverDuration*1000);
          if (t>=1) { this.takeoverActive=false; this.coords.copy(this.takeoverTo); this.coords_old.copy(this.coords); this.diff.set(0,0); }
          else { const k=t*t*(3-2*t); this.coords.copy(this.takeoverFrom).lerp(this.takeoverTo,k); }
        }
        this.diff.subVectors(this.coords,this.coords_old);
        this.coords_old.copy(this.coords);
        if (this.coords_old.x===0&&this.coords_old.y===0) this.diff.set(0,0);
        if (this.isAutoActive&&!this.takeoverActive) this.diff.multiplyScalar(this.autoIntensity);
      }
    }
    const Mouse = new MouseClass();

    class AutoDriver {
      constructor(mouse, manager, opts) {
        this.mouse=mouse; this.manager=manager; this.enabled=opts.enabled; this.speed=opts.speed;
        this.resumeDelay=opts.resumeDelay||3000; this.rampDurationMs=(opts.rampDuration||0)*1000;
        this.active=false; this.current=new THREE.Vector2(0,0); this.target=new THREE.Vector2();
        this.lastTime=performance.now(); this.activationTime=0; this.margin=0.2;
        this._tmpDir=new THREE.Vector2(); this.pickNewTarget();
      }
      pickNewTarget() { const r=Math.random; this.target.set((r()*2-1)*(1-this.margin),(r()*2-1)*(1-this.margin)); }
      forceStop() { this.active=false; this.mouse.isAutoActive=false; }
      update() {
        if (!this.enabled) return;
        const now=performance.now(), idle=now-this.manager.lastUserInteraction;
        if (idle<this.resumeDelay) { if (this.active) this.forceStop(); return; }
        if (this.mouse.isHoverInside) { if (this.active) this.forceStop(); return; }
        if (!this.active) { this.active=true; this.current.copy(this.mouse.coords); this.lastTime=now; this.activationTime=now; }
        this.mouse.isAutoActive=true;
        let dtSec=(now-this.lastTime)/1000; this.lastTime=now;
        if (dtSec>0.2) dtSec=0.016;
        const dir=this._tmpDir.subVectors(this.target,this.current), dist=dir.length();
        if (dist<0.01) { this.pickNewTarget(); return; }
        dir.normalize();
        let ramp=1;
        if (this.rampDurationMs>0) { const t=Math.min(1,(now-this.activationTime)/this.rampDurationMs); ramp=t*t*(3-2*t); }
        this.current.addScaledVector(dir,Math.min(this.speed*dtSec*ramp,dist));
        this.mouse.setNormalized(this.current.x,this.current.y);
      }
    }

    const face_vert=`attribute vec3 position;uniform vec2 px;uniform vec2 boundarySpace;varying vec2 uv;precision highp float;void main(){vec3 pos=position;vec2 scale=1.0-boundarySpace*2.0;pos.xy=pos.xy*scale;uv=vec2(0.5)+(pos.xy)*0.5;gl_Position=vec4(pos,1.0);}`;
    const line_vert=`attribute vec3 position;uniform vec2 px;precision highp float;varying vec2 uv;void main(){vec3 pos=position;uv=0.5+pos.xy*0.5;vec2 n=sign(pos.xy);pos.xy=abs(pos.xy)-px*1.0;pos.xy*=n;gl_Position=vec4(pos,1.0);}`;
    const mouse_vert=`precision highp float;attribute vec3 position;attribute vec2 uv;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 pos=position.xy*scale*2.0*px+center;vUv=uv;gl_Position=vec4(pos,0.0,1.0);}`;
    const advection_frag=`precision highp float;uniform sampler2D velocity;uniform float dt;uniform bool isBFECC;uniform vec2 fboSize;uniform vec2 px;varying vec2 uv;void main(){vec2 ratio=max(fboSize.x,fboSize.y)/fboSize;if(isBFECC==false){vec2 vel=texture2D(velocity,uv).xy;vec2 uv2=uv-vel*dt*ratio;vec2 newVel=texture2D(velocity,uv2).xy;gl_FragColor=vec4(newVel,0.0,0.0);}else{vec2 spot_new=uv;vec2 vel_old=texture2D(velocity,uv).xy;vec2 spot_old=spot_new-vel_old*dt*ratio;vec2 vel_new1=texture2D(velocity,spot_old).xy;vec2 spot_new2=spot_old+vel_new1*dt*ratio;vec2 error=spot_new2-spot_new;vec2 spot_new3=spot_new-error/2.0;vec2 vel_2=texture2D(velocity,spot_new3).xy;vec2 spot_old2=spot_new3-vel_2*dt*ratio;vec2 newVel2=texture2D(velocity,spot_old2).xy;gl_FragColor=vec4(newVel2,0.0,0.0);}}`;
    const color_frag=`precision highp float;uniform sampler2D velocity;uniform sampler2D palette;uniform vec4 bgColor;varying vec2 uv;void main(){vec2 vel=texture2D(velocity,uv).xy;float lenv=clamp(length(vel),0.0,1.0);vec3 c=texture2D(palette,vec2(lenv,0.5)).rgb;vec3 outRGB=mix(bgColor.rgb,c,lenv);float outA=mix(bgColor.a,1.0,lenv);gl_FragColor=vec4(outRGB,outA);}`;
    const divergence_frag=`precision highp float;uniform sampler2D velocity;uniform float dt;uniform vec2 px;varying vec2 uv;void main(){float x0=texture2D(velocity,uv-vec2(px.x,0.0)).x;float x1=texture2D(velocity,uv+vec2(px.x,0.0)).x;float y0=texture2D(velocity,uv-vec2(0.0,px.y)).y;float y1=texture2D(velocity,uv+vec2(0.0,px.y)).y;float divergence=(x1-x0+y1-y0)/2.0;gl_FragColor=vec4(divergence/dt);}`;
    const externalForce_frag=`precision highp float;uniform vec2 force;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 circle=(vUv-0.5)*2.0;float d=1.0-min(length(circle),1.0);d*=d;gl_FragColor=vec4(force*d,0.0,1.0);}`;
    const poisson_frag=`precision highp float;uniform sampler2D pressure;uniform sampler2D divergence;uniform vec2 px;varying vec2 uv;void main(){float p0=texture2D(pressure,uv+vec2(px.x*2.0,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*2.0,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*2.0)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*2.0)).r;float div=texture2D(divergence,uv).r;float newP=(p0+p1+p2+p3)/4.0-div;gl_FragColor=vec4(newP);}`;
    const pressure_frag=`precision highp float;uniform sampler2D pressure;uniform sampler2D velocity;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){float p0=texture2D(pressure,uv+vec2(px.x,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y)).r;vec2 v=texture2D(velocity,uv).xy;vec2 gradP=vec2(p0-p1,p2-p3)*0.5;v=v-gradP*dt;gl_FragColor=vec4(v,0.0,1.0);}`;
    const viscous_frag=`precision highp float;uniform sampler2D velocity;uniform sampler2D velocity_new;uniform float v;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){vec2 old=texture2D(velocity,uv).xy;vec2 new0=texture2D(velocity_new,uv+vec2(px.x*2.0,0.0)).xy;vec2 new1=texture2D(velocity_new,uv-vec2(px.x*2.0,0.0)).xy;vec2 new2=texture2D(velocity_new,uv+vec2(0.0,px.y*2.0)).xy;vec2 new3=texture2D(velocity_new,uv-vec2(0.0,px.y*2.0)).xy;vec2 newv=4.0*old+v*dt*(new0+new1+new2+new3);newv/=4.0*(1.0+v*dt);gl_FragColor=vec4(newv,0.0,0.0);}`;

    class ShaderPass {
      constructor(props) { this.props=props||{}; this.uniforms=this.props.material?.uniforms; this.scene=null; this.camera=null; this.material=null; this.geometry=null; this.plane=null; }
      init() {
        this.scene=new THREE.Scene(); this.camera=new THREE.Camera();
        if (this.uniforms) {
          this.material=new THREE.RawShaderMaterial(this.props.material);
          this.geometry=new THREE.PlaneGeometry(2.0,2.0);
          this.plane=new THREE.Mesh(this.geometry,this.material);
          this.scene.add(this.plane);
        }
      }
      update() { Common.renderer.setRenderTarget(this.props.output||null); Common.renderer.render(this.scene,this.camera); Common.renderer.setRenderTarget(null); }
    }

    class Advection extends ShaderPass {
      constructor(p) {
        super({ material:{ vertexShader:face_vert, fragmentShader:advection_frag, uniforms:{ boundarySpace:{value:p.cellScale}, px:{value:p.cellScale}, fboSize:{value:p.fboSize}, velocity:{value:p.src.texture}, dt:{value:p.dt}, isBFECC:{value:true} } }, output:p.dst });
        this.uniforms=this.props.material.uniforms; this.init(); this._createBoundary();
      }
      _createBoundary() {
        const g=new THREE.BufferGeometry();
        g.setAttribute('position',new THREE.BufferAttribute(new Float32Array([-1,-1,0,-1,1,0,-1,1,0,1,1,0,1,1,0,1,-1,0,1,-1,0,-1,-1,0]),3));
        this.line=new THREE.LineSegments(g,new THREE.RawShaderMaterial({ vertexShader:line_vert, fragmentShader:advection_frag, uniforms:this.uniforms }));
        this.scene.add(this.line);
      }
      update({dt,isBounce,BFECC}) { this.uniforms.dt.value=dt; this.line.visible=isBounce; this.uniforms.isBFECC.value=BFECC; super.update(); }
    }

    class ExternalForce extends ShaderPass {
      constructor(p) {
        super({ output:p.dst }); this.init();
        const g=new THREE.PlaneGeometry(1,1);
        const m=new THREE.RawShaderMaterial({ vertexShader:mouse_vert, fragmentShader:externalForce_frag, blending:THREE.AdditiveBlending, depthWrite:false, uniforms:{ px:{value:p.cellScale}, force:{value:new THREE.Vector2()}, center:{value:new THREE.Vector2()}, scale:{value:new THREE.Vector2(p.cursor_size,p.cursor_size)} } });
        this.mouse=new THREE.Mesh(g,m); this.scene.add(this.mouse);
      }
      update(props) {
        const u=this.mouse.material.uniforms;
        const csx=props.cursor_size*props.cellScale.x, csy=props.cursor_size*props.cellScale.y;
        u.force.value.set((Mouse.diff.x/2)*props.mouse_force,(Mouse.diff.y/2)*props.mouse_force);
        u.center.value.set(Math.min(Math.max(Mouse.coords.x,-1+csx+props.cellScale.x*2),1-csx-props.cellScale.x*2),Math.min(Math.max(Mouse.coords.y,-1+csy+props.cellScale.y*2),1-csy-props.cellScale.y*2));
        u.scale.value.set(props.cursor_size,props.cursor_size);
        super.update();
      }
    }

    class Viscous extends ShaderPass {
      constructor(p) {
        super({ material:{ vertexShader:face_vert, fragmentShader:viscous_frag, uniforms:{ boundarySpace:{value:p.boundarySpace}, velocity:{value:p.src.texture}, velocity_new:{value:p.dst_.texture}, v:{value:p.viscous}, px:{value:p.cellScale}, dt:{value:p.dt} } }, output:p.dst, output0:p.dst_, output1:p.dst });
        this.init();
      }
      update({viscous,iterations,dt}) {
        this.uniforms.v.value=viscous;
        let fi,fo;
        for (let i=0;i<iterations;i++) { fi=i%2===0?this.props.output0:this.props.output1; fo=i%2===0?this.props.output1:this.props.output0; this.uniforms.velocity_new.value=fi.texture; this.props.output=fo; this.uniforms.dt.value=dt; super.update(); }
        return fo;
      }
    }

    class Divergence extends ShaderPass {
      constructor(p) { super({ material:{ vertexShader:face_vert, fragmentShader:divergence_frag, uniforms:{ boundarySpace:{value:p.boundarySpace}, velocity:{value:p.src.texture}, px:{value:p.cellScale}, dt:{value:p.dt} } }, output:p.dst }); this.init(); }
      update({vel}) { this.uniforms.velocity.value=vel.texture; super.update(); }
    }

    class Poisson extends ShaderPass {
      constructor(p) { super({ material:{ vertexShader:face_vert, fragmentShader:poisson_frag, uniforms:{ boundarySpace:{value:p.boundarySpace}, pressure:{value:p.dst_.texture}, divergence:{value:p.src.texture}, px:{value:p.cellScale} } }, output:p.dst, output0:p.dst_, output1:p.dst }); this.init(); }
      update({iterations}) {
        let pi,po;
        for (let i=0;i<iterations;i++) { pi=i%2===0?this.props.output0:this.props.output1; po=i%2===0?this.props.output1:this.props.output0; this.uniforms.pressure.value=pi.texture; this.props.output=po; super.update(); }
        return po;
      }
    }

    class Pressure extends ShaderPass {
      constructor(p) { super({ material:{ vertexShader:face_vert, fragmentShader:pressure_frag, uniforms:{ boundarySpace:{value:p.boundarySpace}, pressure:{value:p.src_p.texture}, velocity:{value:p.src_v.texture}, px:{value:p.cellScale}, dt:{value:p.dt} } }, output:p.dst }); this.init(); }
      update({vel,pressure}) { this.uniforms.velocity.value=vel.texture; this.uniforms.pressure.value=pressure.texture; super.update(); }
    }

    class Simulation {
      constructor(opts) {
        this.options={ iterations_poisson:32, iterations_viscous:32, mouse_force:20, resolution:0.5, cursor_size:100, viscous:30, isBounce:false, dt:0.014, isViscous:false, BFECC:true, ...opts };
        this.fbos={ vel_0:null,vel_1:null,vel_viscous0:null,vel_viscous1:null,div:null,pressure_0:null,pressure_1:null };
        this.fboSize=new THREE.Vector2(); this.cellScale=new THREE.Vector2(); this.boundarySpace=new THREE.Vector2();
        this.init();
      }
      init() { this.calcSize(); this.createAllFBO(); this.createShaderPass(); }
      getFloatType() { return /(iPad|iPhone|iPod)/i.test(navigator.userAgent)?THREE.HalfFloatType:THREE.FloatType; }
      createAllFBO() {
        const opts={ type:this.getFloatType(), depthBuffer:false, stencilBuffer:false, minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, wrapS:THREE.ClampToEdgeWrapping, wrapT:THREE.ClampToEdgeWrapping };
        for (let k in this.fbos) this.fbos[k]=new THREE.WebGLRenderTarget(this.fboSize.x,this.fboSize.y,opts);
      }
      createShaderPass() {
        this.advection=new Advection({ cellScale:this.cellScale, fboSize:this.fboSize, dt:this.options.dt, src:this.fbos.vel_0, dst:this.fbos.vel_1 });
        this.externalForce=new ExternalForce({ cellScale:this.cellScale, cursor_size:this.options.cursor_size, dst:this.fbos.vel_1 });
        this.viscous=new Viscous({ cellScale:this.cellScale, boundarySpace:this.boundarySpace, viscous:this.options.viscous, src:this.fbos.vel_1, dst:this.fbos.vel_viscous1, dst_:this.fbos.vel_viscous0, dt:this.options.dt });
        this.divergence=new Divergence({ cellScale:this.cellScale, boundarySpace:this.boundarySpace, src:this.fbos.vel_viscous0, dst:this.fbos.div, dt:this.options.dt });
        this.poisson=new Poisson({ cellScale:this.cellScale, boundarySpace:this.boundarySpace, src:this.fbos.div, dst:this.fbos.pressure_1, dst_:this.fbos.pressure_0 });
        this.pressure=new Pressure({ cellScale:this.cellScale, boundarySpace:this.boundarySpace, src_p:this.fbos.pressure_0, src_v:this.fbos.vel_viscous0, dst:this.fbos.vel_0, dt:this.options.dt });
      }
      calcSize() {
        const w=Math.max(1,Math.round(this.options.resolution*Common.width)), h=Math.max(1,Math.round(this.options.resolution*Common.height));
        this.cellScale.set(1/w,1/h); this.fboSize.set(w,h);
      }
      resize() { this.calcSize(); for (let k in this.fbos) this.fbos[k].setSize(this.fboSize.x,this.fboSize.y); }
      update() {
        this.boundarySpace[this.options.isBounce?'set':'copy'](this.options.isBounce?new THREE.Vector2():this.cellScale);
        if (!this.options.isBounce) this.boundarySpace.copy(this.cellScale);
        else this.boundarySpace.set(0,0);
        this.advection.update({ dt:this.options.dt, isBounce:this.options.isBounce, BFECC:this.options.BFECC });
        this.externalForce.update({ cursor_size:this.options.cursor_size, mouse_force:this.options.mouse_force, cellScale:this.cellScale });
        let vel=this.fbos.vel_1;
        if (this.options.isViscous) vel=this.viscous.update({ viscous:this.options.viscous, iterations:this.options.iterations_viscous, dt:this.options.dt });
        this.divergence.update({ vel });
        const pressure=this.poisson.update({ iterations:this.options.iterations_poisson });
        this.pressure.update({ vel, pressure });
      }
    }

    class Output {
      constructor() { this.init(); }
      init() {
        this.simulation=new Simulation();
        this.scene=new THREE.Scene(); this.camera=new THREE.Camera();
        this.output=new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.RawShaderMaterial({ vertexShader:face_vert, fragmentShader:color_frag, transparent:true, depthWrite:false, uniforms:{ velocity:{value:this.simulation.fbos.vel_0.texture}, boundarySpace:{value:new THREE.Vector2()}, palette:{value:paletteTex}, bgColor:{value:bgVec4} } }));
        this.scene.add(this.output);
      }
      resize() { this.simulation.resize(); }
      render() { Common.renderer.setRenderTarget(null); Common.renderer.render(this.scene,this.camera); }
      update() { this.simulation.update(); this.render(); }
    }

    class WebGLManager {
      constructor(props) {
        this.props=props;
        Common.init(props.$wrapper);
        Mouse.init(props.$wrapper);
        Mouse.autoIntensity=props.autoIntensity;
        Mouse.takeoverDuration=props.takeoverDuration;
        this.lastUserInteraction=performance.now();
        Mouse.onInteract=()=>{ this.lastUserInteraction=performance.now(); if(this.autoDriver) this.autoDriver.forceStop(); };
        this.autoDriver=new AutoDriver(Mouse,this,{ enabled:props.autoDemo, speed:props.autoSpeed, resumeDelay:props.autoResumeDelay, rampDuration:props.autoRampDuration });
        this.init();
        this._loop=this.loop.bind(this);
        this._resize=this.resize.bind(this);
        window.addEventListener('resize',this._resize);
        this._onVisibility=()=>{ if(document.hidden){this.pause();}else if(isVisibleRef.current){this.start();} };
        document.addEventListener('visibilitychange',this._onVisibility);
        this.running=false;
      }
      init() { this.props.$wrapper.prepend(Common.renderer.domElement); this.output=new Output(); }
      resize() { Common.resize(); this.output.resize(); }
      render() { if(this.autoDriver) this.autoDriver.update(); Mouse.update(); Common.update(); this.output.update(); }
      loop() { if(!this.running) return; this.render(); rafRef.current=requestAnimationFrame(this._loop); }
      start() { if(this.running) return; this.running=true; this._loop(); }
      pause() { this.running=false; if(rafRef.current){cancelAnimationFrame(rafRef.current);rafRef.current=null;} }
      dispose() {
        try {
          window.removeEventListener('resize',this._resize);
          document.removeEventListener('visibilitychange',this._onVisibility);
          Mouse.dispose();
          if(Common.renderer){ const c=Common.renderer.domElement; if(c&&c.parentNode) c.parentNode.removeChild(c); Common.renderer.dispose(); Common.renderer.forceContextLoss(); }
        } catch(e) { void 0; }
      }
    }

    const container = mountRef.current;
    container.style.position = container.style.position || 'relative';
    container.style.overflow = container.style.overflow || 'hidden';

    const webgl = new WebGLManager({ $wrapper:container, autoDemo, autoSpeed, autoIntensity, takeoverDuration, autoResumeDelay, autoRampDuration });
    webglRef.current = webgl;

    const sim = webgl.output?.simulation;
    if (sim) {
      Object.assign(sim.options, { mouse_force:mouseForce, cursor_size:cursorSize, isViscous, viscous, iterations_viscous:iterationsViscous, iterations_poisson:iterationsPoisson, dt, BFECC, resolution, isBounce });
    }

    webgl.start();

    const io = new IntersectionObserver(entries => {
      const isVis = entries[0].isIntersecting && entries[0].intersectionRatio > 0;
      isVisibleRef.current = isVis;
      if (!webglRef.current) return;
      if (isVis && !document.hidden) webglRef.current.start(); else webglRef.current.pause();
    }, { threshold:[0,0.01,0.1] });
    io.observe(container);
    intersectionObserverRef.current = io;

    const ro = new ResizeObserver(() => {
      if (!webglRef.current) return;
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = requestAnimationFrame(() => { if (webglRef.current) webglRef.current.resize(); });
    });
    ro.observe(container);
    resizeObserverRef.current = ro;

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { resizeObserverRef.current?.disconnect(); } catch(e) { void 0; }
      try { intersectionObserverRef.current?.disconnect(); } catch(e) { void 0; }
      if (webglRef.current) { webglRef.current.dispose(); webglRef.current=null; }
    };
  }, [BFECC,cursorSize,dt,isBounce,isViscous,iterationsPoisson,iterationsViscous,mouseForce,resolution,viscous,colors,autoDemo,autoSpeed,autoIntensity,takeoverDuration,autoResumeDelay,autoRampDuration]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', ...style }}
    />
  );
}
// ─── End LiquidEther ─────────────────────────────────────────────────────────

function useCursor() {
  const [pos, setPos]         = useState({ x: 0, y: 0 });
  const [trail, setTrail]     = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const trailRef = useRef({ x: 0, y: 0 });
  const posRef   = useRef({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    let raf;
    const loop = () => {
      trailRef.current.x += (posRef.current.x - trailRef.current.x) * 0.35;
      trailRef.current.y += (posRef.current.y - trailRef.current.y) * 0.35;
      setTrail({ x: trailRef.current.x, y: trailRef.current.y });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };
    const addHovers = () => {
      document.querySelectorAll('a, button, [data-hover]').forEach(el => {
        el.addEventListener('mouseenter', () => setHovered(true));
        el.addEventListener('mouseleave', () => setHovered(false));
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', () => setVisible(false));
    addHovers();
    const obs = new MutationObserver(addHovers);
    obs.observe(document.body, { subtree: true, childList: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      obs.disconnect();
    };
  }, [isMobile]);

  return { pos, trail, visible, hovered, isMobile };
}

function FilterPill({ label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '0.6rem 1.4rem',
        border: '1px solid',
        borderColor: active ? '#C9A84C' : hov ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)',
        background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
        color: active ? '#C9A84C' : hov ? 'rgba(201,168,76,0.8)' : '#555',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '0.52rem',
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
        position: 'relative',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      {active && (
        <span style={{
          position: 'absolute', left: '0.6rem', top: '50%',
          transform: 'translateY(-50%)',
          width: '4px', height: '4px', borderRadius: '50%',
          background: '#C9A84C',
        }} />
      )}
      {label}
    </button>
  );
}

function BorderGlowCard({ children }) {
  const cardRef = useRef(null);

  const handlePointerMove = useCallback((e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    let kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
    let ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
    const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    card.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`);
    card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!e.touches.length) return;
    const touch = e.touches[0];
    handlePointerMove({ clientX: touch.clientX, clientY: touch.clientY });
  }, [handlePointerMove]);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onTouchMove={handleTouchMove}
      style={{
        position: 'relative', borderRadius: '0px',
        '--glow-color': 'hsl(40deg 70% 65% / 100%)',
        '--glow-color-60': 'hsl(40deg 70% 65% / 60%)',
        '--glow-color-50': 'hsl(40deg 70% 65% / 50%)',
        '--glow-color-40': 'hsl(40deg 70% 65% / 40%)',
        '--glow-color-30': 'hsl(40deg 70% 65% / 30%)',
        '--glow-color-20': 'hsl(40deg 70% 65% / 20%)',
        '--glow-color-10': 'hsl(40deg 70% 65% / 10%)',
        '--edge-proximity': '0', '--cursor-angle': '0deg',
        '--cone-spread': '25', '--glow-padding': '40px', '--border-radius': '0px',
      }}
    >
      <style>{`
        .bglow-wrap { position: relative; isolation: isolate; }
        .bglow-wrap::before {
          content: ''; position: absolute;
          inset: calc(-1 * var(--glow-padding));
          border-radius: calc(var(--border-radius) + var(--glow-padding));
          background: conic-gradient(from calc(var(--cursor-angle) - calc(var(--cone-spread) * 1deg)),transparent 0deg,var(--glow-color) calc(var(--cone-spread) * 1deg),var(--glow-color-60) calc(var(--cone-spread) * 2deg),var(--glow-color-50) calc(var(--cone-spread) * 3deg),var(--glow-color-40) calc(var(--cone-spread) * 4deg),var(--glow-color-30) calc(var(--cone-spread) * 5deg),var(--glow-color-20) calc(var(--cone-spread) * 6deg),var(--glow-color-10) calc(var(--cone-spread) * 7deg),transparent calc(var(--cone-spread) * 8deg) 360deg);
          opacity: calc(var(--edge-proximity) / 100);
          -webkit-mask: linear-gradient(black,black) content-box, linear-gradient(black,black);
          -webkit-mask-composite: xor; mask-composite: exclude;
          padding: 1px; pointer-events: none; z-index: 2; transition: opacity 0.3s ease;
        }
        .bglow-wrap::after {
          content: ''; position: absolute;
          inset: calc(-1 * var(--glow-padding));
          border-radius: calc(var(--border-radius) + var(--glow-padding));
          background: conic-gradient(from calc(var(--cursor-angle) - calc(var(--cone-spread) * 1deg)),transparent 0deg,var(--glow-color-10) calc(var(--cone-spread) * 1deg),transparent calc(var(--cone-spread) * 3deg) 360deg);
          opacity: calc(var(--edge-proximity) / 100);
          pointer-events: none; z-index: 1; filter: blur(8px); transition: opacity 0.3s ease;
        }
      `}</style>
      <div className="bglow-wrap" style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

function ProductCard({ product, index }) {
  const [hovered, setHovered]   = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [visible, setVisible]   = useState(false);
  const cardRef    = useRef(null);
  const obsRef     = useRef(null);
  const resetTimer = useRef(null);

  useEffect(() => {
    obsRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (cardRef.current) obsRef.current.observe(cardRef.current);
    return () => obsRef.current?.disconnect();
  }, []);

  useEffect(() => { return () => { if (resetTimer.current) clearTimeout(resetTimer.current); }; }, []);

  const handleMouseMove = useCallback((e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x:(e.clientX-rect.left)/rect.width-0.5, y:(e.clientY-rect.top)/rect.height-0.5 });
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setHovered(true);
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMousePos({ x:(touch.clientX-rect.left)/rect.width-0.5, y:(touch.clientY-rect.top)/rect.height-0.5 });
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMousePos({ x:(touch.clientX-rect.left)/rect.width-0.5, y:(touch.clientY-rect.top)/rect.height-0.5 });
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    resetTimer.current = setTimeout(() => { setHovered(false); setMousePos({ x:0, y:0 }); }, 320);
  }, []);

  const availableSizes = product.sizes
    ? Object.entries(product.sizes).filter(([, qty]) => qty > 0).map(([s]) => s)
    : [];
  const isOutOfStock = product.stock === 0;
  const stagger = (index % 4) * 0.08;
  const tiltX = hovered ? mousePos.y * -12 : 0;
  const tiltY = hovered ? mousePos.x *  15 : 0;

  return (
    <Link href={`/shop/${encodeURIComponent(product.name)}`} style={{ textDecoration: 'none', display: 'block' }}>
      <BorderGlowCard>
        <div
          ref={cardRef}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => { setHovered(false); setMousePos({ x:0, y:0 }); }}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ perspective: '1000px' }}
        >
          <div style={{
            position: 'relative', border: '1px solid',
            borderColor: hovered ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.1)',
            background: hovered ? 'linear-gradient(160deg,rgba(201,168,76,0.07) 0%,rgba(6,5,3,0.98) 60%)' : 'rgba(7,6,4,0.95)',
            overflow: 'hidden', transformStyle: 'preserve-3d',
            transform: visible ? `rotateX(${tiltX}deg) rotateY(${tiltY}deg)${hovered?' translateZ(8px)':''}` : 'translateY(60px) rotateX(8deg)',
            opacity: visible ? 1 : 0,
            transition: visible
              ? hovered
                ? 'border-color 0.25s,background 0.25s,box-shadow 0.25s,transform 0.12s ease'
                : `border-color 0.45s,background 0.45s,box-shadow 0.45s,transform 0.6s cubic-bezier(0.16,1,0.3,1) ${stagger}s,opacity 0.6s ease ${stagger}s`
              : `opacity 0.6s ease ${stagger}s,transform 0.8s cubic-bezier(0.16,1,0.3,1) ${stagger}s`,
            boxShadow: hovered ? '0 40px 80px rgba(0,0,0,0.8),0 0 50px rgba(201,168,76,0.1),inset 0 1px 0 rgba(201,168,76,0.12)' : '0 8px 30px rgba(0,0,0,0.6)',
            willChange: 'transform,opacity', cursor: 'pointer',
          }}>
            {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h], ci) => (
              <div key={ci} style={{
                position:'absolute',[v]:0,[h]:0,zIndex:3,
                width:hovered?'28px':'10px', height:hovered?'28px':'10px',
                borderTop:v==='top'?'1px solid #C9A84C':'none',
                borderBottom:v==='bottom'?'1px solid #C9A84C':'none',
                borderLeft:h==='left'?'1px solid #C9A84C':'none',
                borderRight:h==='right'?'1px solid #C9A84C':'none',
                transition:'all 0.5s cubic-bezier(0.16,1,0.3,1)',
                opacity:hovered?1:0.4,
              }} />
            ))}
            <div style={{ position:'absolute',bottom:0,left:0,zIndex:3,height:'1px',width:hovered?'100%':'0%',background:'linear-gradient(90deg,transparent,#C9A84C 30%,#C9A84C 70%,transparent)',transition:'width 0.65s cubic-bezier(0.16,1,0.3,1)' }} />
            <div style={{ width:'100%',height:'320px',background:'rgba(12,10,6,1)',overflow:'hidden',position:'relative' }}>
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} style={{ width:'100%',height:'100%',objectFit:'cover',transform:hovered?'scale(1.08)':'scale(1)',filter:hovered?'brightness(1.05) contrast(1.05)':isOutOfStock?'brightness(0.4) grayscale(0.5)':'brightness(0.85)',transition:'transform 0.7s cubic-bezier(0.16,1,0.3,1),filter 0.5s ease' }} />
              ) : (
                <div style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1rem' }}>
                  <span style={{ fontSize:'3rem',filter:'grayscale(1)',opacity:0.3 }}>👕</span>
                  <p style={{ fontSize:'0.5rem',color:'#333',letterSpacing:'0.3em',textTransform:'uppercase' }}>No Image</p>
                </div>
              )}
              <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 40%,rgba(7,6,4,0.85) 100%)',pointerEvents:'none',opacity:hovered?0.7:1,transition:'opacity 0.5s' }} />
              {isOutOfStock && (
                <div style={{ position:'absolute',inset:0,background:'rgba(4,3,2,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2 }}>
                  <div style={{ border:'1px solid rgba(201,168,76,0.3)',padding:'0.5rem 1.4rem' }}>
                    <p style={{ fontSize:'0.52rem',color:'rgba(201,168,76,0.6)',letterSpacing:'0.4em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif' }}>Sold Out</p>
                  </div>
                </div>
              )}
              {product.category && (
                <div style={{ position:'absolute',top:'1rem',left:'1rem',zIndex:2,background:'rgba(4,3,2,0.8)',backdropFilter:'blur(8px)',border:'1px solid rgba(201,168,76,0.2)',padding:'0.3rem 0.8rem' }}>
                  <p style={{ fontSize:'0.45rem',color:'#C9A84C',letterSpacing:'0.35em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif' }}>{product.category}</p>
                </div>
              )}
              {product.isNew && (
                <div style={{ position:'absolute',top:'1rem',right:'1rem',zIndex:2,background:'#C9A84C',padding:'0.3rem 0.8rem' }}>
                  <p style={{ fontSize:'0.45rem',color:'#080604',letterSpacing:'0.35em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif',fontWeight:500 }}>New</p>
                </div>
              )}
            </div>
            <div style={{ padding:'1.6rem 1.6rem 2rem' }}>
              <h3 style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'1.4rem',fontWeight:300,color:hovered?'#FFFFFF':'#E8E0D0',marginBottom:'0.6rem',letterSpacing:'0.02em',textShadow:hovered?'0 0 30px rgba(255,255,255,0.15)':'none',transition:'color 0.3s,text-shadow 0.3s',lineHeight:1.3 }}>{product.name}</h3>
              {product.description && (
                <p style={{ fontSize:'0.6rem',color:hovered?'#666':'#4A4030',lineHeight:1.9,letterSpacing:'0.06em',marginBottom:'1.2rem',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',transition:'color 0.3s' }}>{product.description}</p>
              )}
              {availableSizes.length > 0 && (
                <div style={{ display:'flex',gap:'0.35rem',flexWrap:'wrap',marginBottom:'1.5rem' }}>
                  {availableSizes.map(size => (
                    <span key={size} style={{ fontSize:'0.48rem',color:hovered?'rgba(201,168,76,0.7)':'#444',border:'1px solid',borderColor:hovered?'rgba(201,168,76,0.3)':'rgba(255,255,255,0.08)',padding:'0.2rem 0.5rem',letterSpacing:'0.12em',fontFamily:'Montserrat,sans-serif',transition:'all 0.35s' }}>{size}</span>
                  ))}
                </div>
              )}
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-end',borderTop:'1px solid rgba(201,168,76,0.08)',paddingTop:'1.2rem' }}>
                <div>
                  <p style={{ fontSize:'0.44rem',color:'#3A3020',letterSpacing:'0.25em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif',marginBottom:'0.25rem' }}>Price</p>
                  <p style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'1.7rem',fontWeight:300,color:hovered?'#C9A84C':'rgba(201,168,76,0.8)',textShadow:hovered?'0 0 30px rgba(201,168,76,0.35)':'none',transition:'color 0.3s,text-shadow 0.3s',lineHeight:1 }}>R {Number(product.price).toFixed(2)}</p>
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',opacity:hovered?1:0,transform:hovered?'translateX(0)':'translateX(-12px)',transition:'all 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
                  <div style={{ width:'20px',height:'1px',background:'#C9A84C' }} />
                  <span style={{ fontSize:'0.48rem',color:'#C9A84C',letterSpacing:'0.35em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif' }}>View</span>
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
    <div style={{ textAlign:'center',padding:'8rem 0',position:'relative' }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ position:'absolute',top:'50%',left:'50%',width:`${i*70}px`,height:`${i*70}px`,borderRadius:'50%',border:'1px solid rgba(201,168,76,0.15)',transform:'translate(-50%,-50%)',animation:`rrPulse ${1.5+i*0.4}s ease-in-out infinite alternate`,animationDelay:`${i*0.3}s` }} />
      ))}
      <div style={{ position:'relative',zIndex:1 }}>
        <div style={{ width:'1px',height:'50px',background:'linear-gradient(180deg,#C9A84C,transparent)',margin:'0 auto 2rem',animation:'rrScrollPulse 1.8s ease-in-out infinite' }} />
        <p style={{ fontSize:'0.52rem',color:'#C9A84C',letterSpacing:'0.5em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif' }}>Loading Collection</p>
      </div>
    </div>
  );
}

function EmptyState({ filtered }) {
  return (
    <div style={{ textAlign:'center',padding:'8rem 0' }}>
      <p style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'2.5rem',fontWeight:300,color:'rgba(201,168,76,0.2)',marginBottom:'1.5rem' }}>{filtered?'No results':'Coming Soon'}</p>
      <div style={{ width:'50px',height:'1px',background:'rgba(201,168,76,0.3)',margin:'0 auto 1.5rem' }} />
      <p style={{ fontSize:'0.6rem',color:'#444',letterSpacing:'0.2em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif' }}>{filtered?'Try a different filter':'New pieces arriving soon'}</p>
    </div>
  );
}

export default function ShopPage() {
  const [products,       setProducts]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy,         setSortBy]         = useState('default');
  const [heroVisible,    setHeroVisible]    = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const cursor = useCursor();

  useEffect(() => { const t = setTimeout(() => setHeroVisible(true), 80); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'products'));
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(items);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
  const filtered = products
    .filter(p => p.stock !== 0)
    .filter(p => activeCategory === 'All' || p.category === activeCategory)
    .sort((a, b) => {
      if (sortBy === 'price-asc')  return Number(a.price) - Number(b.price);
      if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
      if (sortBy === 'name')       return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div style={{ paddingTop:'70px',background:'#040302',minHeight:'100vh',overflowX:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap');
        @keyframes rrPulse { from{opacity:0.1;transform:translate(-50%,-50%) scale(0.95);}to{opacity:0.5;transform:translate(-50%,-50%) scale(1.05);} }
        @keyframes rrScrollPulse { 0%,100%{opacity:0.8;transform:scaleY(1);}50%{opacity:0.1;transform:scaleY(0.2);} }
        @keyframes menuSlideIn { from{opacity:0;transform:translateX(100%);}to{opacity:1;transform:translateX(0);} }
        .hamburger{display:none;flex-direction:column;justify-content:center;gap:5px;background:none;border:none;cursor:pointer;padding:4px;z-index:200;}
        .hamburger span{display:block;width:24px;height:2px;background:#C9A84C;transition:all 0.3s ease;transform-origin:center;}
        .hamburger.open span:nth-child(1){transform:translateY(7px) rotate(45deg);}
        .hamburger.open span:nth-child(2){opacity:0;}
        .hamburger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg);}
        .mobile-nav{display:none;position:fixed;inset:0;background:rgba(4,3,2,0.97);z-index:150;flex-direction:column;align-items:center;justify-content:center;gap:2.5rem;}
        .mobile-nav.open{display:flex;animation:menuSlideIn 0.35s cubic-bezier(0.16,1,0.3,1);}
        .mobile-nav a{font-size:1.5rem;letter-spacing:0.25em;text-transform:uppercase;color:#F5F0E8;text-decoration:none;font-family:Montserrat,sans-serif;font-weight:200;transition:color 0.2s;}
        .mobile-nav a:hover{color:#C9A84C;} .mobile-nav a.active-nav{color:#C9A84C;}
        .filter-bar-inner{max-width:1380px;margin:0 auto;padding:1.2rem 4rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;}
        .product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:2px;background:rgba(201,168,76,0.04);}
        .shop-section{padding:5rem 4rem 8rem;max-width:1380px;margin:0 auto;}
        @media(max-width:768px){
          .hamburger{display:flex!important;} .desktop-nav{display:none!important;}
          .filter-bar-inner{padding:1rem 1.5rem;flex-direction:column;align-items:flex-start;}
          .filter-pills{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:4px;width:100%;}
          .filter-pills::-webkit-scrollbar{display:none;}
          .filter-pills-inner{display:flex;gap:0.5rem;width:max-content;}
          .sort-count-row{width:100%;display:flex;justify-content:space-between;align-items:center;}
          .product-grid{grid-template-columns:repeat(2,1fr)!important;gap:1px;}
          .shop-section{padding:3rem 1rem 5rem;}
          .hero-section{padding:5rem 1.5rem 4rem!important;}
          .hero-h1{font-size:clamp(2.5rem,12vw,5rem)!important;}
        }
        @media(max-width:480px){.product-grid{grid-template-columns:1fr!important;}}
        @media(min-width:769px){*{cursor:none!important;}select{cursor:none!important;}}
        select option{background:#080604;color:#888;}
      `}</style>

      <div className={`mobile-nav ${menuOpen?'open':''}`}>
        <a href="/" onClick={() => setMenuOpen(false)}>Home</a>
        <a href="/shop" className="active-nav" onClick={() => setMenuOpen(false)}>Shop</a>
        <a href="/about" onClick={() => setMenuOpen(false)}>About</a>
        <a href="/contact" onClick={() => setMenuOpen(false)}>Contact</a>
      </div>

      {/* Navbar */}
      <div style={{ position:'fixed',top:0,left:0,right:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 2rem',height:'70px',background:'rgba(4,3,2,0.92)',backdropFilter:'blur(8px)',borderBottom:'1px solid rgba(201,168,76,0.12)' }}>
        <a href="/" style={{ textDecoration:'none',color:'#C9A84C',fontFamily:'Montserrat,sans-serif',fontWeight:700,fontSize:'1.1rem',letterSpacing:'0.1em' }}>
          R&R <span style={{ color:'#F5F0E8',fontWeight:300 }}>AGENCIES</span>
        </a>
        <nav className="desktop-nav" style={{ display:'flex',gap:'2.5rem' }}>
          {['Shop','About','Contact'].map(item => (
            <a key={item} href={`/${item.toLowerCase()}`} style={{ fontSize:'0.7rem',letterSpacing:'0.2em',textTransform:'uppercase',color:item==='Shop'?'#C9A84C':'#ccc',textDecoration:'none',fontFamily:'Montserrat,sans-serif',transition:'color 0.2s' }}
              onMouseEnter={e=>e.target.style.color='#C9A84C'}
              onMouseLeave={e=>e.target.style.color=item==='Shop'?'#C9A84C':'#ccc'}
            >{item}</a>
          ))}
        </nav>
        <button className={`hamburger ${menuOpen?'open':''}`} onClick={() => setMenuOpen(v=>!v)} aria-label="Toggle menu" style={{ display:'none' }}>
          <span /><span /><span />
        </button>
      </div>

      {/* Custom cursor */}
      {!cursor.isMobile && (<>
        <div style={{ position:'fixed',left:cursor.pos.x,top:cursor.pos.y,width:cursor.hovered?'5px':'8px',height:cursor.hovered?'5px':'8px',background:'#C9A84C',borderRadius:'50%',pointerEvents:'none',zIndex:9999,transform:'translate(-50%,-50%)',opacity:cursor.visible?1:0,transition:'opacity 0.3s,width 0.2s,height 0.2s',mixBlendMode:'difference' }} />
        <div style={{ position:'fixed',left:cursor.trail.x,top:cursor.trail.y,width:cursor.hovered?'50px':'36px',height:cursor.hovered?'50px':'36px',border:'1px solid rgba(201,168,76,0.55)',borderRadius:'50%',pointerEvents:'none',zIndex:9998,transform:'translate(-50%,-50%)',opacity:cursor.visible?0.75:0,transition:'opacity 0.3s,width 0.4s cubic-bezier(0.16,1,0.3,1),height 0.4s cubic-bezier(0.16,1,0.3,1)' }} />
      </>)}

      {/* Hero with inlined LiquidEther */}
      <section className="hero-section" style={{ padding:'7rem 2rem 6rem',textAlign:'center',position:'relative',overflow:'hidden',borderBottom:'1px solid rgba(201,168,76,0.1)',background:'#040302',minHeight:'420px' }}>

        {/* Layer 0 — Liquid gold fluid */}
        <LiquidEther
          colors={['#C9A84C','#E8C86A','#A07830','#5C3D10','#1A0E00']}
          mouseForce={28}
          cursorSize={110}
          resolution={0.5}
          dt={0.014}
          BFECC={true}
          isBounce={false}
          isViscous={false}
          autoDemo={true}
          autoSpeed={0.28}
          autoIntensity={2.0}
          autoResumeDelay={1200}
          autoRampDuration={0.8}
          takeoverDuration={0.3}
          style={{ position:'absolute',inset:0,width:'100%',height:'100%',zIndex:0 }}
        />

        {/* Layer 1 — Perspective grid */}
        <div style={{ position:'absolute',inset:0,zIndex:1,backgroundImage:'linear-gradient(rgba(201,168,76,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.07) 1px,transparent 1px)',backgroundSize:'80px 80px',transform:'perspective(700px) rotateX(60deg) translateZ(-60px) scale(2)',transformOrigin:'50% 100%',opacity:0.5,pointerEvents:'none',mixBlendMode:'overlay' }} />

        {/* Layer 2 — Radial vignette */}
        <div style={{ position:'absolute',inset:0,zIndex:2,background:'radial-gradient(ellipse 85% 75% at 50% 50%,transparent 20%,rgba(4,3,2,0.5) 65%,rgba(4,3,2,0.92) 100%)',pointerEvents:'none' }} />

        {/* Layer 3 — Bottom fade */}
        <div style={{ position:'absolute',bottom:0,left:0,right:0,height:'80px',zIndex:3,background:'linear-gradient(to bottom,transparent,#040302)',pointerEvents:'none' }} />

        {/* Layer 4 — Text */}
        <div style={{ position:'relative',zIndex:4 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'1rem',marginBottom:'2.5rem',opacity:heroVisible?1:0,transform:heroVisible?'none':'translateY(20px)',transition:'opacity 0.9s ease 0.15s,transform 0.9s ease 0.15s' }}>
            <div style={{ width:'35px',height:'1px',background:'linear-gradient(90deg,transparent,#C9A84C)' }} />
            <p style={{ fontSize:'0.55rem',color:'#C9A84C',letterSpacing:'0.55em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif',fontWeight:300 }}>Browse</p>
            <div style={{ width:'35px',height:'1px',background:'linear-gradient(90deg,#C9A84C,transparent)' }} />
          </div>
          <div style={{ overflow:'hidden',marginBottom:'0.3rem' }}>
            <h1 className="hero-h1" style={{ fontFamily:'Cormorant Garamond,serif',fontSize:'clamp(3.5rem,10vw,8.5rem)',fontWeight:300,color:'#FFFFFF',letterSpacing:'-0.01em',lineHeight:1,textShadow:'0 0 80px rgba(255,255,255,0.1),0 4px 40px rgba(0,0,0,0.95),0 0 120px rgba(201,168,76,0.2)',opacity:heroVisible?1:0,transform:heroVisible?'none':'translateY(80%)',transition:'opacity 1.1s cubic-bezier(0.16,1,0.3,1) 0.3s,transform 1.1s cubic-bezier(0.16,1,0.3,1) 0.3s' }}>
              Our{' '}<em style={{ color:'#C9A84C',fontStyle:'normal',textShadow:'0 0 60px rgba(201,168,76,0.7),0 0 120px rgba(201,168,76,0.4),0 4px 40px rgba(0,0,0,0.9)' }}>Collection</em>
            </h1>
          </div>
          <div style={{ width:heroVisible?'100px':'0px',height:'1px',background:'linear-gradient(90deg,transparent,#C9A84C,transparent)',margin:'2.5rem auto',transition:'width 1.4s cubic-bezier(0.16,1,0.3,1) 0.7s' }} />
          <p style={{ fontSize:'0.68rem',color:'rgba(255,255,255,0.3)',maxWidth:'480px',margin:'0 auto',lineHeight:2,letterSpacing:'0.12em',fontFamily:'Montserrat,sans-serif',fontWeight:200,opacity:heroVisible?1:0,transition:'opacity 1s ease 0.9s',textShadow:'0 2px 16px rgba(0,0,0,0.9)' }}>
            Discover our range of premium clothing, designed with quality and style in mind.
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <div style={{ borderBottom:'1px solid rgba(201,168,76,0.08)',background:'rgba(5,4,3,0.98)',backdropFilter:'blur(16px)',position:'sticky',top:'70px',zIndex:10 }}>
        <div className="filter-bar-inner">
          <div className="filter-pills">
            <div className="filter-pills-inner">
              {categories.map(cat => (
                <FilterPill key={cat} label={cat} active={activeCategory===cat} onClick={() => setActiveCategory(cat)} />
              ))}
            </div>
          </div>
          <div className="sort-count-row" style={{ display:'flex',alignItems:'center',gap:'2rem' }}>
            {!loading && (
              <p style={{ fontSize:'0.5rem',color:'#3A3020',letterSpacing:'0.3em',textTransform:'uppercase',fontFamily:'Montserrat,sans-serif' }}>
                <span style={{ color:'#C9A84C' }}>{filtered.length}</span> items
              </p>
            )}
            <div style={{ position:'relative' }}>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ appearance:'none',background:'transparent',border:'1px solid rgba(201,168,76,0.15)',color:'#666',fontFamily:'Montserrat,sans-serif',fontSize:'0.5rem',letterSpacing:'0.3em',textTransform:'uppercase',padding:'0.5rem 2rem 0.5rem 0.9rem',cursor:'pointer',outline:'none' }}>
                <option value="default">Sort: Default</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="name">Name: A → Z</option>
              </select>
              <div style={{ position:'absolute',right:'0.7rem',top:'50%',transform:'translateY(-50%)',width:0,height:0,borderLeft:'3px solid transparent',borderRight:'3px solid transparent',borderTop:'4px solid rgba(201,168,76,0.4)',pointerEvents:'none' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Product grid */}
      <section className="shop-section">
        {loading ? <LoadingState /> : filtered.length===0 ? <EmptyState filtered={activeCategory!=='All'} /> : (
          <div className="product-grid">
            {filtered.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
          </div>
        )}
      </section>
    </div>
  );
}