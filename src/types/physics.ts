export type PhysicsMode = 'fluid' | 'quantum';

export type ToolType = 'force' | 'barrier' | 'eraser';

export type PresetType = 'karman' | 'rayleigh' | 'doubleslit' | 'tunneling' | 'vortexpair' | 'oscillator' | 'soliton' | 'lidcavity';

export type RenderMode = 
  | 'dye' 
  | 'velocity' 
  | 'vorticity' 
  | 'pressure' 
  | 'quantum-prob' 
  | 'quantum-phase';

export type ColormapType = 'plasma' | 'viridis' | 'inferno' | 'electric' | 'spectral';

export interface SimulationConfig {
  gridSize: number;
  particleResolution: number;
  dt: number;
  jacobiIterations: number;
  viscosity: number;
  vorticityConfinement: number;
  quantumV0: number;
  brushRadius: number;
  activeMode: PhysicsMode;
  renderMode: number;
  colormap: number;
  showParticles: boolean;
  showVectors: boolean;
  isPaused: boolean;
  inflowSpeed: number;
  dissipation: number;
}

export interface TelemetryMetrics {
  energy: number;
  enstrophy: number;
  reynolds: number;
  cfl: number;
  quantumNorm: number;
  isQuantum: boolean;
  fps: number;
  drawCalls: number;
  vramMB: number;
}

export interface ProbeData {
  u: number;
  v: number;
  vx: number;
  vy: number;
  vort: number;
  pres: number;
}
