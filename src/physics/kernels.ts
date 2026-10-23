/**
 * QuantumFluid 3D — Complete GLSL Computational Physics Kernels
 * Contains GPGPU fragment shaders for:
 * 1. Semi-Lagrangian Advection (Velocity & Scalar Fields)
 * 2. Viscous Diffusion Jacobi Solver
 * 3. Pressure Poisson Divergence & Iterative Jacobi Projection (Chorin's Method)
 * 4. Vorticity Confinement Turbulence Injection
 * 5. Time-Dependent Schrödinger Wave Equation Symplectic Integrator
 * 6. Particle Advection & Volumetric Chromatic Shading
 */

// Common full-screen quad vertex shader for GPGPU render passes
export const FullscreenVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// 1. Semi-Lagrangian Backtracing Advection Kernel
export const AdvectionShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  
  uniform sampler2D uVelocity;   // Velocity field (u, v)
  uniform sampler2D uSource;     // Quantities being advected (velocity or dye)
  uniform sampler2D uObstacles;  // Boundary obstacles (r: solid)
  uniform vec2 uTexelSize;       // 1.0 / resolution
  uniform float uDt;             // Timestep delta t
  uniform float uDissipation;    // Energy/dye decay factor

  vec4 sampleBilinear(sampler2D tex, vec2 uv) {
    return texture2D(tex, uv);
  }

  void main() {
    // If inside an obstacle boundary, force zero
    if (texture2D(uObstacles, vUv).r > 0.5) {
      gl_FragColor = vec4(0.0);
      return;
    }

    // Semi-Lagrangian backtracing: trace where the fluid parcel originated
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    vec2 coord = vUv - uDt * velocity * uTexelSize;

    // Enforce domain boundary clamp
    coord = clamp(coord, 0.5 * uTexelSize, vec2(1.0) - 0.5 * uTexelSize);

    // Fetch advected quantity with dissipation decay
    vec4 result = sampleBilinear(uSource, coord) * uDissipation;
    gl_FragColor = result;
  }
`;

// 2. Multi-Pass Viscous Diffusion Jacobi Solver: (I - ν·Δt·∇²) u^{n+1} = u^*
export const DiffusionShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uCurrent;    // Iteration input x^{(k)}
  uniform sampler2D uSource;     // RHS b (advected velocity)
  uniform sampler2D uObstacles;  // Solid domain masks
  uniform vec2 uTexelSize;
  uniform float uAlpha;          // alpha = dx^2 / (nu * dt)
  uniform float uBeta;           // beta = 4 + alpha

  void main() {
    if (texture2D(uObstacles, vUv).r > 0.5) {
      gl_FragColor = vec4(0.0);
      return;
    }

    vec4 L = texture2D(uCurrent, vUv - vec2(uTexelSize.x, 0.0));
    vec4 R = texture2D(uCurrent, vUv + vec2(uTexelSize.x, 0.0));
    vec4 B = texture2D(uCurrent, vUv - vec2(0.0, uTexelSize.y));
    vec4 T = texture2D(uCurrent, vUv + vec2(0.0, uTexelSize.y));
    vec4 b = texture2D(uSource, vUv);

    gl_FragColor = (L + R + B + T + uAlpha * b) / uBeta;
  }
`;

// 3. Divergence Kernel: ∇ · u = (∂u/∂x + ∂v/∂y)
export const DivergenceShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uVelocity;
  uniform sampler2D uObstacles;
  uniform vec2 uTexelSize;

  void main() {
    if (texture2D(uObstacles, vUv).r > 0.5) {
      gl_FragColor = vec4(0.0);
      return;
    }

    vec2 L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).xy;
    vec2 R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).xy;
    vec2 B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).xy;
    vec2 T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).xy;

    // Boundary obstacle condition reflection
    if (texture2D(uObstacles, vUv - vec2(uTexelSize.x, 0.0)).r > 0.5) L = -texture2D(uVelocity, vUv).xy;
    if (texture2D(uObstacles, vUv + vec2(uTexelSize.x, 0.0)).r > 0.5) R = -texture2D(uVelocity, vUv).xy;
    if (texture2D(uObstacles, vUv - vec2(0.0, uTexelSize.y)).r > 0.5) B = -texture2D(uVelocity, vUv).xy;
    if (texture2D(uObstacles, vUv + vec2(0.0, uTexelSize.y)).r > 0.5) T = -texture2D(uVelocity, vUv).xy;

    // Divergence via central finite differences: ∇ · u
    float div = 0.5 * ((R.x - L.x) + (T.y - B.y));
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

// 4. Pressure Poisson Jacobi Solver: ∇² p = ∇ · u
export const PressureJacobiShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  uniform sampler2D uObstacles;
  uniform vec2 uTexelSize;

  void main() {
    if (texture2D(uObstacles, vUv).r > 0.5) {
      gl_FragColor = vec4(0.0);
      return;
    }

    // Neumann boundary conditions: zero pressure gradient across solid borders
    float pC = texture2D(uPressure, vUv).r;
    float L = texture2D(uObstacles, vUv - vec2(uTexelSize.x, 0.0)).r > 0.5 ? pC : texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).r;
    float R = texture2D(uObstacles, vUv + vec2(uTexelSize.x, 0.0)).r > 0.5 ? pC : texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).r;
    float B = texture2D(uObstacles, vUv - vec2(0.0, uTexelSize.y)).r > 0.5 ? pC : texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).r;
    float T = texture2D(uObstacles, vUv + vec2(0.0, uTexelSize.y)).r > 0.5 ? pC : texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).r;

    float div = texture2D(uDivergence, vUv).r;

    // Poisson relaxation step: p^{(k+1)} = (L + R + B + T - div) / 4
    float pNew = 0.25 * (L + R + B + T - div);
    gl_FragColor = vec4(pNew, 0.0, 0.0, 1.0);
  }
`;

// 5. Gradient Subtraction (Projection Step): u = u^* - ∇p
export const ProjectionShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uVelocity;
  uniform sampler2D uPressure;
  uniform sampler2D uObstacles;
  uniform vec2 uTexelSize;

  void main() {
    if (texture2D(uObstacles, vUv).r > 0.5) {
      gl_FragColor = vec4(0.0);
      return;
    }

    float pC = texture2D(uPressure, vUv).r;
    float L = texture2D(uObstacles, vUv - vec2(uTexelSize.x, 0.0)).r > 0.5 ? pC : texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).r;
    float R = texture2D(uObstacles, vUv + vec2(uTexelSize.x, 0.0)).r > 0.5 ? pC : texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).r;
    float B = texture2D(uObstacles, vUv - vec2(0.0, uTexelSize.y)).r > 0.5 ? pC : texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).r;
    float T = texture2D(uObstacles, vUv + vec2(0.0, uTexelSize.y)).r > 0.5 ? pC : texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).r;

    vec2 gradP = 0.5 * vec2(R - L, T - B);
    vec2 u = texture2D(uVelocity, vUv).xy - gradP;

    gl_FragColor = vec4(u, 0.0, 1.0);
  }
`;

// 6. Vorticity Calculation & Confinement: ω = ∇ × u, F_vc = ε·dx·(N × ω)
export const VorticityShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;

  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;
    float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;

    // Curl in 2D: ω = ∂v/∂x - ∂u/∂y
    float curl = 0.5 * ((R - L) - (T - B));
    gl_FragColor = vec4(curl, abs(curl), 0.0, 1.0);
  }
`;

export const VorticityConfinementShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uVelocity;
  uniform sampler2D uVorticity;
  uniform vec2 uTexelSize;
  uniform float uEpsilon;
  uniform float uDt;

  void main() {
    float L = texture2D(uVorticity, vUv - vec2(uTexelSize.x, 0.0)).y;
    float R = texture2D(uVorticity, vUv + vec2(uTexelSize.x, 0.0)).y;
    float B = texture2D(uVorticity, vUv - vec2(0.0, uTexelSize.y)).y;
    float T = texture2D(uVorticity, vUv + vec2(0.0, uTexelSize.y)).y;
    float omega = texture2D(uVorticity, vUv).x;

    // Gradient of vorticity magnitude: N = ∇|ω| / |∇|ω||
    vec2 eta = 0.5 * vec2(R - L, T - B);
    float len = length(eta);
    if (len > 1e-5) {
      eta = eta / len;
    } else {
      eta = vec2(0.0);
    }

    // Force F_confine = epsilon * (eta × omega)
    vec2 force = uEpsilon * vec2(eta.y * omega, -eta.x * omega);
    vec2 vel = texture2D(uVelocity, vUv).xy + uDt * force;

    gl_FragColor = vec4(vel, 0.0, 1.0);
  }
`;

// 7. Force / Splat Injection Kernel (Mouse drags, buoyancy, jets)
export const SplatShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uTarget;
  uniform vec2 uPoint;
  uniform vec4 uValue;
  uniform float uRadius;
  uniform float uAspect;

  void main() {
    vec2 p = vUv - uPoint;
    p.x *= uAspect;
    float d = length(p);
    float splat = exp(- (d * d) / max(uRadius * uRadius, 1e-6));

    vec4 base = texture2D(uTarget, vUv);
    gl_FragColor = base + uValue * splat;
  }
`;

// 8. Obstacle & Potential Painting Kernel
export const ObstacleBrushShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uCurrentObstacles;
  uniform vec2 uPoint;
  uniform float uRadius;
  uniform float uAspect;
  uniform float uValue; // 1.0 for solid barrier, 0.0 for erase

  void main() {
    vec2 p = vUv - uPoint;
    p.x *= uAspect;
    float d = length(p);

    vec4 current = texture2D(uCurrentObstacles, vUv);
    if (d < uRadius) {
      gl_FragColor = vec4(uValue, 0.0, 0.0, 1.0);
    } else {
      gl_FragColor = current;
    }
  }
`;

// 9. Time-Dependent Schrödinger Wave Equation (TDSE) Symplectic Störmer-Verlet Step:
// i ℏ ∂Ψ/∂t = (-ℏ²/2m ∇² + V) Ψ
// Let Ψ = Ψ_R + i Ψ_I
export const SchrodingerStepShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uWave;       // rg = (Psi_R, Psi_I)
  uniform sampler2D uPotential;  // r = Potential V(x, y)
  uniform vec2 uTexelSize;
  uniform float uDt;             // Timestep dt
  uniform float uHbar;           // Reduced Planck constant
  uniform float uMass;           // Particle mass

  void main() {
    vec2 psi = texture2D(uWave, vUv).xy;
    float V = texture2D(uPotential, vUv).r;

    // Discrete 5-point Laplacian of Psi: ∇² Ψ
    vec2 L = texture2D(uWave, vUv - vec2(uTexelSize.x, 0.0)).xy;
    vec2 R = texture2D(uWave, vUv + vec2(uTexelSize.x, 0.0)).xy;
    vec2 B = texture2D(uWave, vUv - vec2(0.0, uTexelSize.y)).xy;
    vec2 T = texture2D(uWave, vUv + vec2(0.0, uTexelSize.y)).xy;
    vec2 laplacian = (L + R + B + T - 4.0 * psi);

    // Kinetic factor = - (hbar^2 / 2m) * laplacian
    float kinFactor = (uHbar / (2.0 * uMass));

    // Hamiltonian acting on wave components
    vec2 Hpsi = vec2(
      -kinFactor * laplacian.x + (V / uHbar) * psi.x,
      -kinFactor * laplacian.y + (V / uHbar) * psi.y
    );

    // Symplectic Leapfrog / Störmer-Verlet time evolution
    float psiR_next = psi.x + uDt * Hpsi.y;
    
    // Recalculate H on updated Real part for symplectic preservation
    float lapR_next = (L.x + R.x + B.x + T.x - 4.0 * psiR_next);
    float HpsiR_next = -kinFactor * lapR_next + (V / uHbar) * psiR_next;
    float psiI_next = psi.y - uDt * HpsiR_next;

    // Unitary normalization dampening on edges (absorbing boundary condition)
    vec2 borderDist = smoothstep(vec2(0.0), vec2(0.05), vUv) * smoothstep(vec2(1.0), vec2(0.95), vUv);
    float absorb = borderDist.x * borderDist.y;

    gl_FragColor = vec4(psiR_next * absorb, psiI_next * absorb, 0.0, 1.0);
  }
`;

// 10. Master Visual Composition & Colormap Display Shader
export const MasterDisplayShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uDye;
  uniform sampler2D uVelocity;
  uniform sampler2D uPressure;
  uniform sampler2D uVorticity;
  uniform sampler2D uWave;
  uniform sampler2D uPotential;
  uniform sampler2D uObstacles;

  uniform int uMode;            // 0: Dye, 1: |u|, 2: Vorticity, 3: Pressure, 4: |Psi|^2, 5: Arg(Psi)
  uniform int uColormap;        // 0: Plasma, 1: Viridis, 2: Inferno, 3: Neon, 4: Spectral
  uniform float uTime;
  uniform vec2 uResolution;

  // --- Analytical Colormaps ---
  vec3 colormapPlasma(float t) {
    t = clamp(t, 0.0, 1.0);
    return vec3(
      0.058 + 0.95 * t - 0.2 * t * t,
      0.02 + 0.1 * t + 0.8 * t * t * t,
      0.53 + 0.45 * sin(t * 3.14159) - 0.3 * t
    );
  }

  vec3 colormapViridis(float t) {
    t = clamp(t, 0.0, 1.0);
    return vec3(
      0.267 + 0.73 * t * t,
      0.004 + 0.88 * t,
      0.329 + 0.5 * sin(t * 3.14159) - 0.4 * t
    );
  }

  vec3 colormapInferno(float t) {
    t = clamp(t, 0.0, 1.0);
    return vec3(
      min(1.0, 1.8 * t),
      pow(t, 2.2) * 1.5,
      pow(t, 6.0)
    );
  }

  vec3 colormapNeon(float t) {
    t = clamp(t, 0.0, 1.0);
    return vec3(
      0.1 + 0.9 * sin(t * 3.14159 * 0.5),
      pow(t, 1.5) * 0.9 + 0.1,
      1.0 - 0.5 * t
    );
  }

  vec3 colormapSpectral(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0, 0.7, 0.4) * t + vec3(0.0, 0.33, 0.67)));
  }

  vec3 applyColormap(float val, int cmap) {
    if (cmap == 0) return colormapPlasma(val);
    if (cmap == 1) return colormapViridis(val);
    if (cmap == 2) return colormapInferno(val);
    if (cmap == 3) return colormapNeon(val);
    return colormapSpectral(val);
  }

  void main() {
    float isObstacle = texture2D(uObstacles, vUv).r;
    float potential = texture2D(uPotential, vUv).r;

    // Render solid domain obstacles with brushed futuristic titanium look
    if (isObstacle > 0.5) {
      vec3 obsColor = vec3(0.08, 0.12, 0.16);
      // Subtle rim edge glow
      float edge = fwidth(isObstacle) * 3.0;
      obsColor += vec3(0.0, 0.7, 0.9) * edge;
      gl_FragColor = vec4(obsColor, 1.0);
      return;
    }

    vec3 finalColor = vec3(0.0);

    // Mode 0: Dye Concentration (with chromatic dispersion and velocity sheen)
    if (uMode == 0) {
      vec4 dye = texture2D(uDye, vUv);
      finalColor = dye.rgb;

      // Add caustics highlight based on velocity gradient
      vec2 vel = texture2D(uVelocity, vUv).xy;
      float speed = length(vel);
      finalColor += vec3(0.05, 0.20, 0.35) * pow(speed * 3.0, 1.5);
    }
    // Mode 1: Velocity Magnitude
    else if (uMode == 1) {
      vec2 vel = texture2D(uVelocity, vUv).xy;
      float speed = length(vel) * 2.5;
      finalColor = applyColormap(speed, uColormap);
    }
    // Mode 2: Vorticity (Curl ω)
    else if (uMode == 2) {
      float curl = texture2D(uVorticity, vUv).x * 5.0;
      float normalized = 0.5 + 0.5 * tanh(curl);
      finalColor = applyColormap(normalized, uColormap);
    }
    // Mode 3: Pressure Field
    else if (uMode == 3) {
      float press = texture2D(uPressure, vUv).r * 4.0;
      float normP = 0.5 + 0.5 * press;
      finalColor = applyColormap(normP, uColormap);
    }
    // Mode 4: Quantum Probability Density |Ψ|²
    else if (uMode == 4) {
      vec2 psi = texture2D(uWave, vUv).xy;
      float prob = dot(psi, psi) * 4.0;
      finalColor = applyColormap(prob, uColormap);

      // Render glowing barrier contour
      if (potential > 1.0) {
        finalColor += vec3(0.8, 0.2, 0.9) * 0.45;
      }
    }
    // Mode 5: Quantum Phase Angle Arg(Ψ)
    else if (uMode == 5) {
      vec2 psi = texture2D(uWave, vUv).xy;
      float phase = atan(psi.y, psi.x); // -π to +π
      float normPhase = (phase + 3.14159265) / 6.2831853;
      float prob = clamp(length(psi) * 2.5, 0.0, 1.0);
      finalColor = colormapSpectral(normPhase) * prob;

      if (potential > 1.0) {
        finalColor += vec3(0.6, 0.15, 0.8) * 0.45;
      }
    }

    // Gentle vignette
    vec2 uvNorm = vUv * 2.0 - 1.0;
    float vignette = 1.0 - 0.22 * dot(uvNorm, uvNorm);
    gl_FragColor = vec4(finalColor * vignette, 1.0);
  }
`;

// 11. 65,536 Particle Advection & Rendering Shaders
export const ParticleUpdateShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uParticlePositions; // Current particle coords (x, y, age, lifetime)
  uniform sampler2D uVelocity;          // Fluid velocity
  uniform vec2 uTexelSize;
  uniform float uDt;
  uniform float uSpeedFactor;

  float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec4 p = texture2D(uParticlePositions, vUv);
    vec2 pos = p.xy;
    float age = p.z + uDt;
    float lifetime = p.w;

    // Sample velocity at current particle location
    vec2 vel = texture2D(uVelocity, pos).xy;

    // Advect particle position (Euler step)
    pos += vel * uDt * uSpeedFactor;

    // Respawn conditions: out of screen bounds or exceeded lifespan
    if (age > lifetime || pos.x < 0.005 || pos.x > 0.995 || pos.y < 0.005 || pos.y > 0.995) {
      float seedX = rand(vUv + vec2(age, 0.123));
      float seedY = rand(vUv + vec2(0.456, age));
      pos = vec2(0.1 + 0.8 * seedX, 0.1 + 0.8 * seedY);
      age = 0.0;
      lifetime = 2.0 + 3.0 * rand(pos);
    }

    gl_FragColor = vec4(pos, age, lifetime);
  }
`;

export const ParticleRenderVertexShader = /* glsl */ `
  uniform sampler2D uParticlePositions;
  uniform sampler2D uVelocity;
  varying float vSpeed;
  varying float vLifeRatio;

  void main() {
    vec2 lookupUv = position.xy;
    vec4 p = texture2D(uParticlePositions, lookupUv);
    vec2 pos = p.xy;
    float age = p.z;
    float lifetime = p.w;

    vLifeRatio = 1.0 - (age / max(lifetime, 0.001));

    vec2 vel = texture2D(uVelocity, pos).xy;
    vSpeed = length(vel);

    // Convert normalized [0, 1] domain to NDC [-1, 1]
    vec2 ndcPos = pos * 2.0 - 1.0;
    gl_Position = vec4(ndcPos, 0.0, 1.0);
    gl_PointSize = clamp(2.5 * (1.0 + vSpeed * 3.5), 1.5, 6.0);
  }
`;

export const ParticleRenderFragmentShader = /* glsl */ `
  precision highp float;
  varying float vSpeed;
  varying float vLifeRatio;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float r = length(coord);
    if (r > 0.5) discard;

    float alpha = smoothstep(0.5, 0.1, r) * vLifeRatio * 0.85;

    // Fast particles glow cyan/magenta; resting particles are subtle electric blue
    vec3 col = mix(vec3(0.1, 0.5, 1.0), vec3(0.0, 1.0, 0.8), clamp(vSpeed * 2.5, 0.0, 1.0));
    gl_FragColor = vec4(col, alpha);
  }
`;
