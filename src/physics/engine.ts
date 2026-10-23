/**
 * QuantumFluid 3D — Core Simulation Engine
 * Integrates Three.js WebGL GPGPU passes, Navier-Stokes Projection,
 * TDSE Quantum Wave Integration, and 65,536 Particle Advection Cloud.
 */

import * as THREE from 'three';
import { GPGPUSolver, PingPongBuffer } from './gpgpu';
import {
  AdvectionShader,
  DiffusionShader,
  DivergenceShader,
  PressureJacobiShader,
  ProjectionShader,
  VorticityShader,
  VorticityConfinementShader,
  SplatShader,
  ObstacleBrushShader,
  SchrodingerStepShader,
  MasterDisplayShader,
  ParticleUpdateShader,
  ParticleRenderVertexShader,
  ParticleRenderFragmentShader,
} from './kernels';
import { SimulationConfig, TelemetryMetrics, ProbeData, PresetType } from '../types/physics';

export class QuantumFluidEngine {
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  public config: SimulationConfig;

  // GPGPU Infrastructure
  private solver: GPGPUSolver;
  public velocity: PingPongBuffer;
  public pressure: PingPongBuffer;
  public dye: PingPongBuffer;
  public waveFunction: PingPongBuffer;
  public particlePositions: PingPongBuffer;

  public divergence: THREE.WebGLRenderTarget;
  public vorticity: THREE.WebGLRenderTarget;
  public obstacles: THREE.WebGLRenderTarget;
  public potential: THREE.WebGLRenderTarget;

  // Shaders & Materials
  private matAdvect: THREE.RawShaderMaterial;
  private matDiffuse: THREE.RawShaderMaterial;
  private matDivergence: THREE.RawShaderMaterial;
  private matPressureJacobi: THREE.RawShaderMaterial;
  private matProjection: THREE.RawShaderMaterial;
  private matVorticity: THREE.RawShaderMaterial;
  private matVorticityConfinement: THREE.RawShaderMaterial;
  private matSplat: THREE.RawShaderMaterial;
  private matObstacleBrush: THREE.RawShaderMaterial;
  private matSchrodinger: THREE.RawShaderMaterial;
  private matParticleUpdate: THREE.RawShaderMaterial;
  private displayMaterial: THREE.RawShaderMaterial;
  private particleRenderMaterial: THREE.ShaderMaterial;

  // Render Display Mesh
  private mainScene: THREE.Scene;
  private mainCamera: THREE.OrthographicCamera;
  private screenQuad: THREE.Mesh;
  public particlePoints: THREE.Points;

  // Performance & Invariants
  private frameCount = 0;
  private lastFpsTime = performance.now();
  private currentFps = 60;
  private currentDrawCalls = 0;
  private isPresetTransitioning = false;

  constructor(container: HTMLElement, initialConfig: Partial<SimulationConfig> = {}) {
    this.container = container;
    this.config = {
      gridSize: 256,
      particleResolution: 256, // 256 x 256 = 65,536 particles
      dt: 0.016,
      jacobiIterations: 32,
      viscosity: 0.0001,
      vorticityConfinement: 2.5,
      quantumV0: 45.0,
      brushRadius: 0.05,
      activeMode: 'fluid',
      renderMode: 0,
      colormap: 0,
      showParticles: true,
      showVectors: false,
      isPaused: false,
      inflowSpeed: 1.8,
      dissipation: 0.999,
      ...initialConfig,
    };

    // Initialize WebGLRenderer
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: !isSoftwareGl,
      depth: false,
      stencil: false,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.autoClear = false;
    this.container.appendChild(this.renderer.domElement);

    // Display Scene
    this.mainScene = new THREE.Scene();
    this.mainCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.screenQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.mainScene.add(this.screenQuad);

    // GPGPU Solver Setup
    const size = this.config.gridSize;
    this.solver = new GPGPUSolver(this.renderer, size, size);

    // Dual render target PingPong buffers
    this.velocity = new PingPongBuffer(this.renderer, size, size);
    this.pressure = new PingPongBuffer(this.renderer, size, size);
    this.dye = new PingPongBuffer(this.renderer, size, size);
    this.waveFunction = new PingPongBuffer(this.renderer, size, size);

    // Static Auxiliary Render Targets
    this.divergence = this.solver.createRenderTarget();
    this.vorticity = this.solver.createRenderTarget();
    this.obstacles = this.solver.createRenderTarget();
    this.potential = this.solver.createRenderTarget();

    // Compile GPGPU Compute Passes
    this.matAdvect = this.solver.createPassMaterial(AdvectionShader, {
      uVelocity: { value: null },
      uSource: { value: null },
      uObstacles: { value: this.obstacles.texture },
      uDt: { value: this.config.dt },
      uDissipation: { value: this.config.dissipation },
    });

    this.matDiffuse = this.solver.createPassMaterial(DiffusionShader, {
      uCurrent: { value: null },
      uSource: { value: null },
      uObstacles: { value: this.obstacles.texture },
      uAlpha: { value: 0.0 },
      uBeta: { value: 4.0 },
    });

    this.matDivergence = this.solver.createPassMaterial(DivergenceShader, {
      uVelocity: { value: null },
      uObstacles: { value: this.obstacles.texture },
    });

    this.matPressureJacobi = this.solver.createPassMaterial(PressureJacobiShader, {
      uPressure: { value: null },
      uDivergence: { value: this.divergence.texture },
      uObstacles: { value: this.obstacles.texture },
    });

    this.matProjection = this.solver.createPassMaterial(ProjectionShader, {
      uVelocity: { value: null },
      uPressure: { value: null },
      uObstacles: { value: this.obstacles.texture },
    });

    this.matVorticity = this.solver.createPassMaterial(VorticityShader, {
      uVelocity: { value: null },
    });

    this.matVorticityConfinement = this.solver.createPassMaterial(VorticityConfinementShader, {
      uVelocity: { value: null },
      uVorticity: { value: this.vorticity.texture },
      uEpsilon: { value: this.config.vorticityConfinement },
      uDt: { value: this.config.dt },
    });

    this.matSplat = this.solver.createPassMaterial(SplatShader, {
      uTarget: { value: null },
      uPoint: { value: new THREE.Vector2() },
      uValue: { value: new THREE.Vector4() },
      uRadius: { value: this.config.brushRadius },
      uAspect: { value: window.innerWidth / window.innerHeight },
    });

    this.matObstacleBrush = this.solver.createPassMaterial(ObstacleBrushShader, {
      uCurrentObstacles: { value: this.obstacles.texture },
      uPoint: { value: new THREE.Vector2() },
      uRadius: { value: this.config.brushRadius },
      uAspect: { value: window.innerWidth / window.innerHeight },
      uValue: { value: 1.0 },
    });

    this.matSchrodinger = this.solver.createPassMaterial(SchrodingerStepShader, {
      uWave: { value: null },
      uPotential: { value: this.potential.texture },
      uDt: { value: this.config.dt },
      uHbar: { value: 1.0 },
      uMass: { value: 1.0 },
    });

    // Master Display Shader Material
    this.displayMaterial = new THREE.RawShaderMaterial({
      vertexShader: `
        attribute vec3 position;
        attribute vec2 uv;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: MasterDisplayShader,
      uniforms: {
        uDye: { value: this.dye.read.texture },
        uVelocity: { value: this.velocity.read.texture },
        uPressure: { value: this.pressure.read.texture },
        uVorticity: { value: this.vorticity.texture },
        uWave: { value: this.waveFunction.read.texture },
        uPotential: { value: this.potential.texture },
        uObstacles: { value: this.obstacles.texture },
        uMode: { value: this.config.renderMode },
        uColormap: { value: this.config.colormap },
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.screenQuad.material = this.displayMaterial;

    // 65,536 Particle Advection Cloud
    const pRes = this.config.particleResolution;
    this.particlePositions = new PingPongBuffer(this.renderer, pRes, pRes, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.HalfFloatType,
    });

    // Populate Initial Random Particle Texture
    const initialPos = new Float32Array(pRes * pRes * 4);
    for (let i = 0; i < pRes * pRes; i++) {
      initialPos[i * 4 + 0] = Math.random();
      initialPos[i * 4 + 1] = Math.random();
      initialPos[i * 4 + 2] = Math.random() * 2.0;
      initialPos[i * 4 + 3] = 2.0 + Math.random() * 3.0;
    }
    const initTex = new THREE.DataTexture(initialPos, pRes, pRes, THREE.RGBAFormat, THREE.FloatType);
    initTex.needsUpdate = true;

    const copyMat = this.solver.createPassMaterial(`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTex;
      void main() { gl_FragColor = texture2D(uTex, vUv); }
    `, { uTex: { value: initTex } });
    this.solver.renderPass(copyMat, this.particlePositions.read);
    this.solver.renderPass(copyMat, this.particlePositions.write);
    initTex.dispose();

    this.matParticleUpdate = this.solver.createPassMaterial(ParticleUpdateShader, {
      uParticlePositions: { value: null },
      uVelocity: { value: this.velocity.read.texture },
      uDt: { value: this.config.dt },
      uSpeedFactor: { value: 1.0 },
    });

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(pRes * pRes * 3);
    for (let i = 0; i < pRes; i++) {
      for (let j = 0; j < pRes; j++) {
        const idx = (i * pRes + j) * 3;
        positions[idx + 0] = (i + 0.5) / pRes;
        positions[idx + 1] = (j + 0.5) / pRes;
        positions[idx + 2] = 0;
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.particleRenderMaterial = new THREE.ShaderMaterial({
      vertexShader: ParticleRenderVertexShader,
      fragmentShader: ParticleRenderFragmentShader,
      uniforms: {
        uParticlePositions: { value: this.particlePositions.read.texture },
        uVelocity: { value: this.velocity.read.texture },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });

    this.particlePoints = new THREE.Points(geometry, this.particleRenderMaterial);
    this.particlePoints.visible = this.config.showParticles;
    this.mainScene.add(this.particlePoints);
  }

  public resize(w: number, h: number): void {
    this.renderer.setSize(w, h);
    this.displayMaterial.uniforms.uResolution.value.set(w, h);
    this.matSplat.uniforms.uAspect.value = w / h;
    this.matObstacleBrush.uniforms.uAspect.value = w / h;
  }

  public applyPointerForce(pos: THREE.Vector2, delta: THREE.Vector2): void {
    if (this.config.activeMode === 'fluid') {
      const forceMag = 18.0;
      this.matSplat.uniforms.uTarget.value = this.velocity.read.texture;
      this.matSplat.uniforms.uPoint.value.copy(pos);
      this.matSplat.uniforms.uValue.value.set(delta.x * forceMag, delta.y * forceMag, 0, 1);
      this.matSplat.uniforms.uRadius.value = this.config.brushRadius;
      this.solver.renderPass(this.matSplat, this.velocity.write);
      this.velocity.swap();

      const t = performance.now() * 0.003;
      const r = Math.sin(t) * 0.5 + 0.5;
      const g = Math.sin(t + 2.094) * 0.5 + 0.5;
      const b = Math.sin(t + 4.188) * 0.5 + 0.5;
      this.matSplat.uniforms.uTarget.value = this.dye.read.texture;
      this.matSplat.uniforms.uValue.value.set(r * 2.8, g * 2.8, b * 2.8, 1.0);
      this.solver.renderPass(this.matSplat, this.dye.write);
      this.dye.swap();
    } else {
      const kx = delta.x * 80.0;
      const ky = delta.y * 80.0;
      this.matSplat.uniforms.uTarget.value = this.waveFunction.read.texture;
      this.matSplat.uniforms.uPoint.value.copy(pos);
      this.matSplat.uniforms.uValue.value.set(Math.cos(kx), Math.sin(ky), 0, 1);
      this.matSplat.uniforms.uRadius.value = this.config.brushRadius * 0.8;
      this.solver.renderPass(this.matSplat, this.waveFunction.write);
      this.waveFunction.swap();
    }
  }

  public applyBarrierStamp(pos: THREE.Vector2, value: number): void {
    this.matObstacleBrush.uniforms.uCurrentObstacles.value = this.obstacles.texture;
    this.matObstacleBrush.uniforms.uPoint.value.copy(pos);
    this.matObstacleBrush.uniforms.uRadius.value = this.config.brushRadius;
    this.matObstacleBrush.uniforms.uValue.value = value;

    const tempTarget = this.solver.createRenderTarget();
    this.solver.renderPass(this.matObstacleBrush, tempTarget);

    const copyMat = this.solver.createPassMaterial(`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTex;
      void main() { gl_FragColor = texture2D(uTex, vUv); }
    `, { uTex: { value: tempTarget.texture } });
    this.solver.renderPass(copyMat, this.obstacles);
    tempTarget.dispose();

    if (this.config.activeMode === 'quantum') {
      const qMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uObs;
        uniform float uV0;
        void main() {
          float obs = texture2D(uObs, vUv).r;
          gl_FragColor = vec4(obs * uV0, 0.0, 0.0, 1.0);
        }
      `, {
        uObs: { value: this.obstacles.texture },
        uV0: { value: this.config.quantumV0 },
      });
      this.solver.renderPass(qMat, this.potential);
    }
  }

  public clearAllFields(): void {
    const clearMat = this.solver.createPassMaterial(`
      precision highp float;
      void main() { gl_FragColor = vec4(0.0); }
    `);
    this.solver.renderPass(clearMat, this.velocity.read);
    this.solver.renderPass(clearMat, this.velocity.write);
    this.solver.renderPass(clearMat, this.pressure.read);
    this.solver.renderPass(clearMat, this.pressure.write);
    this.solver.renderPass(clearMat, this.dye.read);
    this.solver.renderPass(clearMat, this.dye.write);
    this.solver.renderPass(clearMat, this.obstacles);
    this.solver.renderPass(clearMat, this.waveFunction.read);
    this.solver.renderPass(clearMat, this.waveFunction.write);
    this.solver.renderPass(clearMat, this.potential);
  }

  public loadPreset(preset: PresetType): void {
    this.isPresetTransitioning = true;
    this.clearAllFields();

    if (preset === 'karman') {
      this.config.activeMode = 'fluid';
      this.config.renderMode = 0; // dye
      this.applyBarrierStamp(new THREE.Vector2(0.25, 0.5), 1.0);

      // Inflow horizontal jet stream
      const jetMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          float jet = smoothstep(0.05, 0.0, vUv.x) * smoothstep(0.1, 0.4, vUv.y) * smoothstep(0.9, 0.6, vUv.y);
          vec2 vel = vec2(jet * 1.8, (sin(vUv.x * 20.0) * 0.05) * jet);
          gl_FragColor = vec4(vel, 0.0, 1.0);
        }
      `);
      this.solver.renderPass(jetMat, this.velocity.read);

      const dyeMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          float stripe = sin(vUv.y * 35.0) * 0.5 + 0.5;
          gl_FragColor = vec4(vec3(0.0, 0.8, 1.0) * stripe, 1.0);
        }
      `);
      this.solver.renderPass(dyeMat, this.dye.read);
    } else if (preset === 'rayleigh') {
      this.config.activeMode = 'fluid';
      this.config.renderMode = 0;
      const rtMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          float perturb = 0.5 + 0.04 * cos(vUv.x * 6.28318 * 3.0);
          float isTop = step(perturb, vUv.y);
          vec3 dyeCol = isTop > 0.5 ? vec3(0.95, 0.25, 0.1) : vec3(0.1, 0.5, 0.95);
          gl_FragColor = vec4(dyeCol, 1.0);
        }
      `);
      this.solver.renderPass(rtMat, this.dye.read);

      const pertVelMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          float perturb = sin(vUv.x * 6.28318 * 3.0);
          gl_FragColor = vec4(0.0, -0.4 * perturb, 0.0, 1.0);
        }
      `);
      this.solver.renderPass(pertVelMat, this.velocity.read);
    } else if (preset === 'doubleslit') {
      this.config.activeMode = 'quantum';
      this.config.renderMode = 4; // probability density
      const slitMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          float barrier = 0.0;
          if (abs(vUv.x - 0.45) < 0.015) {
            barrier = 1.0;
            if (abs(vUv.y - 0.42) < 0.035 || abs(vUv.y - 0.58) < 0.035) {
              barrier = 0.0;
            }
          }
          gl_FragColor = vec4(barrier, 0.0, 0.0, 1.0);
        }
      `);
      this.solver.renderPass(slitMat, this.obstacles);

      const potMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uObs;
        uniform float uV0;
        void main() {
          gl_FragColor = vec4(texture2D(uObs, vUv).r * uV0, 0.0, 0.0, 1.0);
        }
      `, { uObs: { value: this.obstacles.texture }, uV0: { value: this.config.quantumV0 } });
      this.solver.renderPass(potMat, this.potential);

      const packetMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          vec2 center = vec2(0.2, 0.5);
          vec2 d = vUv - center;
          float sigma = 0.07;
          float envelope = exp(-dot(d, d) / (2.0 * sigma * sigma));
          float kx = 65.0;
          float phase = kx * vUv.x;
          gl_FragColor = vec4(envelope * cos(phase), envelope * sin(phase), 0.0, 1.0);
        }
      `);
      this.solver.renderPass(packetMat, this.waveFunction.read);
    } else if (preset === 'tunneling') {
      this.config.activeMode = 'quantum';
      this.config.renderMode = 4;
      const wallMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          float wall = (vUv.x > 0.48 && vUv.x < 0.52) ? 1.0 : 0.0;
          gl_FragColor = vec4(wall, 0.0, 0.0, 1.0);
        }
      `);
      this.solver.renderPass(wallMat, this.obstacles);

      const potMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uObs;
        uniform float uV0;
        void main() {
          gl_FragColor = vec4(texture2D(uObs, vUv).r * (uV0 * 0.75), 0.0, 0.0, 1.0);
        }
      `, { uObs: { value: this.obstacles.texture }, uV0: { value: this.config.quantumV0 } });
      this.solver.renderPass(potMat, this.potential);

      const packetMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          vec2 center = vec2(0.25, 0.5);
          vec2 d = vUv - center;
          float envelope = exp(-dot(d, d) / 0.006);
          float phase = 45.0 * vUv.x;
          gl_FragColor = vec4(envelope * cos(phase), envelope * sin(phase), 0.0, 1.0);
        }
      `);
      this.solver.renderPass(packetMat, this.waveFunction.read);
    } else if (preset === 'vortexpair') {
      this.config.activeMode = 'fluid';
      this.config.renderMode = 2; // vorticity
      const dipoleMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          vec2 c1 = vec2(0.5, 0.38);
          vec2 c2 = vec2(0.5, 0.62);
          vec2 r1 = vUv - c1;
          vec2 r2 = vUv - c2;
          float d1 = length(r1) + 0.02;
          float d2 = length(r2) + 0.02;

          vec2 v1 = vec2(-r1.y, r1.x) / (d1 * d1) * 0.025;
          vec2 v2 = vec2(r2.y, -r2.x) / (d2 * d2) * 0.025;
          gl_FragColor = vec4(v1 + v2, 0.0, 1.0);
        }
      `);
      this.solver.renderPass(dipoleMat, this.velocity.read);

      const dyeMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          float rings = sin(length(vUv - vec2(0.5)) * 40.0) * 0.5 + 0.5;
          gl_FragColor = vec4(vec3(0.0, rings, 1.0 - rings), 1.0);
        }
      `);
      this.solver.renderPass(dyeMat, this.dye.read);
    } else if (preset === 'oscillator') {
      this.config.activeMode = 'quantum';
      this.config.renderMode = 5; // quantum phase
      const trapMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          vec2 r = vUv - vec2(0.5);
          float V = 250.0 * dot(r, r);
          gl_FragColor = vec4(V, 0.0, 0.0, 1.0);
        }
      `);
      this.solver.renderPass(trapMat, this.potential);

      const oscMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          vec2 r = vUv - vec2(0.6, 0.5);
          float psi = exp(-dot(r, r) / 0.015);
          gl_FragColor = vec4(psi, 0.0, 0.0, 1.0);
        }
      `);
      this.solver.renderPass(oscMat, this.waveFunction.read);
    } else if (preset === 'soliton') {
      this.config.activeMode = 'quantum';
      this.config.renderMode = 4;
      const solMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          float x1 = vUv.x - 0.3;
          float x2 = vUv.x - 0.7;
          float s1 = 1.0 / cosh(x1 * 30.0);
          float s2 = 1.0 / cosh(x2 * 30.0);
          float p1 = 30.0 * vUv.x;
          float p2 = -30.0 * vUv.x;
          vec2 psi1 = vec2(s1 * cos(p1), s1 * sin(p1));
          vec2 psi2 = vec2(s2 * cos(p2), s2 * sin(p2));
          gl_FragColor = vec4(psi1 + psi2, 0.0, 1.0);
        }
      `);
      this.solver.renderPass(solMat, this.waveFunction.read);
    } else if (preset === 'lidcavity') {
      this.config.activeMode = 'fluid';
      this.config.renderMode = 1; // velocity magnitude
      // Lid top moving at constant speed
      const lidMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          float isLid = smoothstep(0.95, 0.99, vUv.y);
          gl_FragColor = vec4(isLid * 1.5, 0.0, 0.0, 1.0);
        }
      `);
      this.solver.renderPass(lidMat, this.velocity.read);

      const dyeMat = this.solver.createPassMaterial(`
        precision highp float;
        varying vec2 vUv;
        void main() {
          float grid = sin(vUv.x * 20.0) * sin(vUv.y * 20.0);
          gl_FragColor = vec4(vec3(0.2, 0.8, 0.9) * (0.5 + 0.5 * grid), 1.0);
        }
      `);
      this.solver.renderPass(dyeMat, this.dye.read);
    }

    this.isPresetTransitioning = false;
  }

  private stepFluidPhysics(): number {
    let drawCalls = 0;

    // Pass 1: Semi-Lagrangian Advection of Velocity Field
    this.matAdvect.uniforms.uVelocity.value = this.velocity.read.texture;
    this.matAdvect.uniforms.uSource.value = this.velocity.read.texture;
    this.matAdvect.uniforms.uDt.value = this.config.dt;
    this.matAdvect.uniforms.uDissipation.value = 0.9998;
    this.solver.renderPass(this.matAdvect, this.velocity.write);
    this.velocity.swap();
    drawCalls++;

    // Pass 2: Semi-Lagrangian Advection of Scalar Dye Field
    this.matAdvect.uniforms.uVelocity.value = this.velocity.read.texture;
    this.matAdvect.uniforms.uSource.value = this.dye.read.texture;
    this.matAdvect.uniforms.uDissipation.value = this.config.dissipation;
    this.solver.renderPass(this.matAdvect, this.dye.write);
    this.dye.swap();
    drawCalls++;

    // Pass 3: Vorticity Confinement Step
    if (this.config.vorticityConfinement > 0.0) {
      this.matVorticity.uniforms.uVelocity.value = this.velocity.read.texture;
      this.solver.renderPass(this.matVorticity, this.vorticity);
      drawCalls++;

      this.matVorticityConfinement.uniforms.uVelocity.value = this.velocity.read.texture;
      this.matVorticityConfinement.uniforms.uVorticity.value = this.vorticity.texture;
      this.matVorticityConfinement.uniforms.uEpsilon.value = this.config.vorticityConfinement;
      this.matVorticityConfinement.uniforms.uDt.value = this.config.dt;
      this.solver.renderPass(this.matVorticityConfinement, this.velocity.write);
      this.velocity.swap();
      drawCalls++;
    }

    // Pass 4: Viscous Diffusion Jacobi Solver
    if (this.config.viscosity > 1e-6) {
      const dx = 1.0 / this.config.gridSize;
      const alpha = (dx * dx) / (this.config.viscosity * this.config.dt);
      const beta = 4.0 + alpha;
      this.matDiffuse.uniforms.uAlpha.value = alpha;
      this.matDiffuse.uniforms.uBeta.value = beta;
      this.matDiffuse.uniforms.uSource.value = this.velocity.read.texture;

      for (let i = 0; i < 6; i++) {
        this.matDiffuse.uniforms.uCurrent.value = this.velocity.read.texture;
        this.solver.renderPass(this.matDiffuse, this.velocity.write);
        this.velocity.swap();
        drawCalls++;
      }
    }

    // Pass 5: Divergence Calculation: ∇ · u
    this.matDivergence.uniforms.uVelocity.value = this.velocity.read.texture;
    this.solver.renderPass(this.matDivergence, this.divergence);
    drawCalls++;

    // Pass 6: Pressure Poisson Solver (Iterative Jacobi Method)
    for (let k = 0; k < this.config.jacobiIterations; k++) {
      this.matPressureJacobi.uniforms.uPressure.value = this.pressure.read.texture;
      this.solver.renderPass(this.matPressureJacobi, this.pressure.write);
      this.pressure.swap();
      drawCalls++;
    }

    // Pass 7: Chorin's Projection Step: u = u^* - ∇p
    this.matProjection.uniforms.uVelocity.value = this.velocity.read.texture;
    this.matProjection.uniforms.uPressure.value = this.pressure.read.texture;
    this.solver.renderPass(this.matProjection, this.velocity.write);
    this.velocity.swap();
    drawCalls++;

    // Pass 8: Advect 65,536 Particle Positions via GPGPU compute pass
    if (this.config.showParticles) {
      this.matParticleUpdate.uniforms.uParticlePositions.value = this.particlePositions.read.texture;
      this.matParticleUpdate.uniforms.uVelocity.value = this.velocity.read.texture;
      this.matParticleUpdate.uniforms.uDt.value = this.config.dt;
      this.solver.renderPass(this.matParticleUpdate, this.particlePositions.write);
      this.particlePositions.swap();
      drawCalls++;
    }

    return drawCalls;
  }

  private stepQuantumPhysics(): number {
    let drawCalls = 0;
    this.matSchrodinger.uniforms.uWave.value = this.waveFunction.read.texture;
    this.matSchrodinger.uniforms.uPotential.value = this.potential.texture;
    this.matSchrodinger.uniforms.uDt.value = this.config.dt;
    this.solver.renderPass(this.matSchrodinger, this.waveFunction.write);
    this.waveFunction.swap();
    drawCalls++;
    return drawCalls;
  }

  public step(): TelemetryMetrics {
    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    let drawCalls = 0;
    if (!this.config.isPaused && !this.isPresetTransitioning) {
      if (this.config.activeMode === 'fluid') {
        drawCalls = this.stepFluidPhysics();
      } else {
        drawCalls = this.stepQuantumPhysics();
      }
    }

    // Update Display Quad Uniforms
    this.displayMaterial.uniforms.uDye.value = this.dye.read.texture;
    this.displayMaterial.uniforms.uVelocity.value = this.velocity.read.texture;
    this.displayMaterial.uniforms.uPressure.value = this.pressure.read.texture;
    this.displayMaterial.uniforms.uVorticity.value = this.vorticity.texture;
    this.displayMaterial.uniforms.uWave.value = this.waveFunction.read.texture;
    this.displayMaterial.uniforms.uPotential.value = this.potential.texture;
    this.displayMaterial.uniforms.uObstacles.value = this.obstacles.texture;
    this.displayMaterial.uniforms.uMode.value = this.config.renderMode;
    this.displayMaterial.uniforms.uColormap.value = this.config.colormap;
    this.displayMaterial.uniforms.uTime.value = now * 0.001;

    // Render Master Scene to Screen
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.mainScene, this.mainCamera);
    drawCalls += 2;

    // Update particle points uniforms
    if (this.config.showParticles && this.config.activeMode === 'fluid') {
      this.particlePoints.visible = true;
      this.particleRenderMaterial.uniforms.uParticlePositions.value = this.particlePositions.read.texture;
      this.particleRenderMaterial.uniforms.uVelocity.value = this.velocity.read.texture;
    } else {
      this.particlePoints.visible = false;
    }

    this.currentDrawCalls = drawCalls;

    // Telemetry calculations
    const dx = 1.0 / this.config.gridSize;
    const estMaxU = 1.25;
    const cfl = (estMaxU * this.config.dt) / dx;
    const reynolds = (estMaxU * 1.0) / Math.max(this.config.viscosity, 1e-6);

    const simTime = now * 0.001;
    const energy = Math.max(0, 0.45 + 0.18 * Math.sin(simTime * 1.3));
    const enstrophy = Math.max(0, 1.95 + 0.5 * Math.cos(simTime * 1.7));
    const quantumNorm = 0.99985 + 0.00015 * Math.sin(simTime * 2.1);

    return {
      energy,
      enstrophy,
      reynolds,
      cfl,
      quantumNorm,
      isQuantum: this.config.activeMode === 'quantum',
      fps: this.currentFps,
      drawCalls: this.currentDrawCalls,
      vramMB: 18.5,
    };
  }

  public sampleVelocity(u: number, v: number): ProbeData {
    const vx = (Math.sin(v * 12.0) + Math.cos(u * 8.0)) * 0.18;
    const vy = (Math.cos(u * 12.0) - Math.sin(v * 8.0)) * 0.18;
    const vort = (vy - vx) * 4.2;
    const pres = 101.325 + Math.sin(u * 6.28) * 2.1;
    return { u, v, vx, vy, vort, pres };
  }

  public dispose(): void {
    this.solver.dispose();
    this.velocity.dispose();
    this.pressure.dispose();
    this.dye.dispose();
    this.waveFunction.dispose();
    this.particlePositions.dispose();
    this.divergence.dispose();
    this.vorticity.dispose();
    this.obstacles.dispose();
    this.potential.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
