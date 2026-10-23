/**
 * QuantumFluid 3D — Ping-Pong Framebuffer Architecture & GPGPU Pass Harness
 * Coordinates WebGL float render textures, orthographic compute passes, and shader swappings.
 */

import * as THREE from 'three';
import { FullscreenVertexShader } from './kernels';

export class PingPongBuffer {
  private readTarget: THREE.WebGLRenderTarget;
  private writeTarget: THREE.WebGLRenderTarget;
  public readonly width: number;
  public readonly height: number;

  constructor(
    _renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    options: THREE.RenderTargetOptions = {}
  ) {
    this.width = width;
    this.height = height;

    const defaultParams: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      ...options,
    };

    this.readTarget = new THREE.WebGLRenderTarget(width, height, defaultParams);
    this.writeTarget = new THREE.WebGLRenderTarget(width, height, defaultParams);
  }

  get read(): THREE.WebGLRenderTarget {
    return this.readTarget;
  }

  get write(): THREE.WebGLRenderTarget {
    return this.writeTarget;
  }

  swap(): void {
    const tmp = this.readTarget;
    this.readTarget = this.writeTarget;
    this.writeTarget = tmp;
  }

  dispose(): void {
    this.readTarget.dispose();
    this.writeTarget.dispose();
  }
}

export class GPGPUSolver {
  public renderer: THREE.WebGLRenderer;
  public readonly width: number;
  public readonly height: number;
  public readonly texelSize: THREE.Vector2;
  private camera: THREE.OrthographicCamera;
  private scene: THREE.Scene;
  private quadGeometry: THREE.PlaneGeometry;
  private mesh: THREE.Mesh;

  constructor(renderer: THREE.WebGLRenderer, width = 256, height = 256) {
    this.renderer = renderer;
    this.width = width;
    this.height = height;
    this.texelSize = new THREE.Vector2(1.0 / width, 1.0 / height);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(this.quadGeometry);
    this.scene.add(this.mesh);
  }

  renderPass(material: THREE.Material, target: THREE.WebGLRenderTarget | null = null): void {
    this.mesh.material = material;
    const oldTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(oldTarget);
  }

  createPassMaterial(
    fragmentShaderSource: string,
    uniforms: Record<string, { value: unknown }> = {}
  ): THREE.RawShaderMaterial {
    return new THREE.RawShaderMaterial({
      vertexShader: FullscreenVertexShader,
      fragmentShader: fragmentShaderSource,
      uniforms: {
        uTexelSize: { value: this.texelSize },
        ...uniforms,
      },
      depthTest: false,
      depthWrite: false,
    });
  }

  createRenderTarget(options: THREE.RenderTargetOptions = {}): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(this.width, this.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      ...options,
    });
  }

  dispose(): void {
    this.quadGeometry.dispose();
  }
}
