import React from 'react';
import {
  SimulationConfig,
  ToolType,
  PresetType,
  RenderMode,
  ColormapType,
} from '../types/physics';
import { MousePointer, Shield, Eraser, Play, Pause, Trash2 } from 'lucide-react';

interface ControlDockProps {
  config: SimulationConfig;
  activeTool: ToolType;
  onChangeTool: (tool: ToolType) => void;
  onUpdateConfig: <K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]) => void;
  onLoadPreset: (preset: PresetType) => void;
  onClearGrid: () => void;
  onTogglePause: () => void;
  visible: boolean;
  onToggleVisible: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  config,
  activeTool,
  onChangeTool,
  onUpdateConfig,
  onLoadPreset,
  onClearGrid,
  onTogglePause,
  visible,
  onToggleVisible,
}) => {
  if (!visible) {
    return (
      <button
        onClick={onToggleVisible}
        className="fixed top-16 left-4 z-20 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-cyan-400 font-mono text-xs flex items-center gap-2 hover:bg-slate-800 shadow-lg transition"
        title="Open Controls Panel"
      >
        <span>Parameters &amp; Presets</span>
      </button>
    );
  }

  const renderModeMap: Record<RenderMode, number> = {
    dye: 0,
    velocity: 1,
    vorticity: 2,
    pressure: 3,
    'quantum-prob': 4,
    'quantum-phase': 5,
  };

  const currentRenderModeKey =
    (Object.keys(renderModeMap).find(
      (k) => renderModeMap[k as RenderMode] === config.renderMode
    ) as RenderMode) || 'dye';

  const colormapMap: Record<ColormapType, number> = {
    plasma: 0,
    viridis: 1,
    inferno: 2,
    electric: 3,
    spectral: 4,
  };

  const currentColormapKey =
    (Object.keys(colormapMap).find(
      (k) => colormapMap[k as ColormapType] === config.colormap
    ) as ColormapType) || 'plasma';

  return (
    <aside
      className="fixed top-16 left-4 bottom-4 w-80 z-20 flex flex-col gap-3 p-4 bg-slate-950/85 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-y-auto custom-scrollbar transition-transform duration-300"
      style={{ maxHeight: 'calc(100vh - 80px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
        <label className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
          Benchmark Presets
        </label>
        <button
          onClick={onToggleVisible}
          className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
        >
          Hide
        </button>
      </div>

      {/* Preset Grid */}
      <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
        <button
          onClick={() => onLoadPreset('karman')}
          className="px-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left transition"
        >
          🌀 Kármán Vortex
        </button>
        <button
          onClick={() => onLoadPreset('rayleigh')}
          className="px-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left transition"
        >
          🔥 Rayleigh-Taylor
        </button>
        <button
          onClick={() => onLoadPreset('doubleslit')}
          className="px-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left transition"
        >
          ⚡ Double-Slit
        </button>
        <button
          onClick={() => onLoadPreset('tunneling')}
          className="px-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left transition"
        >
          🛡️ Quantum Tunnel
        </button>
        <button
          onClick={() => onLoadPreset('vortexpair')}
          className="px-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left transition"
        >
          🌪️ Superfluid Dipole
        </button>
        <button
          onClick={() => onLoadPreset('oscillator')}
          className="px-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left transition"
        >
          ⚛️ Harmonic Trap
        </button>
        <button
          onClick={() => onLoadPreset('soliton')}
          className="px-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left transition"
        >
          🌊 Soliton Wave
        </button>
        <button
          onClick={() => onLoadPreset('lidcavity')}
          className="px-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left transition"
        >
          📦 Lid Cavity
        </button>
      </div>

      <div className="border-t border-slate-800/80"></div>

      {/* Pointer Tool Selector */}
      <div className="space-y-2">
        <label className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
          Pointer Interaction
        </label>
        <div className="grid grid-cols-3 gap-1 text-xs font-mono">
          <button
            onClick={() => onChangeTool('force')}
            className={`p-2 rounded-lg text-center flex flex-col items-center gap-1 transition ${
              activeTool === 'force'
                ? 'bg-cyan-950/80 border border-cyan-500 text-cyan-200'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <MousePointer className="w-4 h-4" />
            <span className="text-[10px]">Force / Wave</span>
          </button>
          <button
            onClick={() => onChangeTool('barrier')}
            className={`p-2 rounded-lg text-center flex flex-col items-center gap-1 transition ${
              activeTool === 'barrier'
                ? 'bg-cyan-950/80 border border-cyan-500 text-cyan-200'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="text-[10px]">Barrier</span>
          </button>
          <button
            onClick={() => onChangeTool('eraser')}
            className={`p-2 rounded-lg text-center flex flex-col items-center gap-1 transition ${
              activeTool === 'eraser'
                ? 'bg-cyan-950/80 border border-cyan-500 text-cyan-200'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eraser className="w-4 h-4" />
            <span className="text-[10px]">Erase</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-1">
          <span>Brush Radius:</span>
          <span className="text-cyan-300">{config.brushRadius.toFixed(3)}</span>
        </div>
        <input
          type="range"
          min="0.01"
          max="0.15"
          step="0.005"
          value={config.brushRadius}
          onChange={(e) => onUpdateConfig('brushRadius', parseFloat(e.target.value))}
          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
      </div>

      <div className="border-t border-slate-800/80"></div>

      {/* Solver Numerical Parameters */}
      <div className="space-y-3 font-mono text-xs">
        <label className="text-[11px] tracking-widest text-cyan-400 uppercase font-semibold">
          GPGPU Solver Parameters
        </label>

        {/* Timestep dt */}
        <div className="space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Time Step (dt):</span>
            <span className="text-cyan-300">{config.dt.toFixed(3)} s</span>
          </div>
          <input
            type="range"
            min="0.002"
            max="0.05"
            step="0.001"
            value={config.dt}
            onChange={(e) => onUpdateConfig('dt', parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Fluid Solver Only: Jacobi Iterations */}
        {config.activeMode === 'fluid' && (
          <>
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Poisson Iterations:</span>
                <span className="text-cyan-300">{config.jacobiIterations} passes</span>
              </div>
              <input
                type="range"
                min="8"
                max="80"
                step="2"
                value={config.jacobiIterations}
                onChange={(e) => onUpdateConfig('jacobiIterations', parseInt(e.target.value, 10))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Kinematic Viscosity (ν):</span>
                <span className="text-cyan-300">{config.viscosity.toFixed(5)}</span>
              </div>
              <input
                type="range"
                min="0.0000"
                max="0.002"
                step="0.00005"
                value={config.viscosity}
                onChange={(e) => onUpdateConfig('viscosity', parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Vorticity Confinement (ε):</span>
                <span className="text-cyan-300">{config.vorticityConfinement.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="8.0"
                step="0.1"
                value={config.vorticityConfinement}
                onChange={(e) => onUpdateConfig('vorticityConfinement', parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </>
        )}

        {/* Quantum Solver Only: Potential Barrier */}
        {config.activeMode === 'quantum' && (
          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Potential Barrier (V₀):</span>
              <span className="text-violet-400">{config.quantumV0.toFixed(1)} eV</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="150.0"
              step="1.0"
              value={config.quantumV0}
              onChange={(e) => onUpdateConfig('quantumV0', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-400"
            />
          </div>
        )}
      </div>

      <div className="border-t border-slate-800/80"></div>

      {/* Visual Passes & Color Scheme */}
      <div className="space-y-2.5 font-mono text-xs">
        <label className="text-[11px] tracking-widest text-cyan-400 uppercase font-semibold">
          Visual Passes &amp; Color Scheme
        </label>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400">Render Field:</label>
            <select
              value={currentRenderModeKey}
              onChange={(e) => onUpdateConfig('renderMode', renderModeMap[e.target.value as RenderMode])}
              className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-md py-1 px-2 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-400"
            >
              <option value="dye">Dye / Concentration</option>
              <option value="velocity">Velocity Magnitude |u|</option>
              <option value="vorticity">Vorticity (Curl ω)</option>
              <option value="pressure">Pressure Field (p)</option>
              <option value="quantum-prob">Probability Density |Ψ|²</option>
              <option value="quantum-phase">Quantum Phase Arg(Ψ)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400">Colormap LUT:</label>
            <select
              value={currentColormapKey}
              onChange={(e) => onUpdateConfig('colormap', colormapMap[e.target.value as ColormapType])}
              className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-md py-1 px-2 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-400"
            >
              <option value="plasma">Plasma</option>
              <option value="viridis">Viridis</option>
              <option value="inferno">Inferno</option>
              <option value="electric">Electric Neon</option>
              <option value="spectral">Quantum Spectral</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={config.showParticles}
              onChange={(e) => onUpdateConfig('showParticles', e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>65,536 Particle Advection Cloud</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={config.showVectors}
              onChange={(e) => onUpdateConfig('showVectors', e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Live Vector Field Arrows</span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto pt-2 grid grid-cols-2 gap-2 font-mono text-xs">
        <button
          onClick={onClearGrid}
          className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 font-medium transition flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Grid
        </button>
        <button
          onClick={onTogglePause}
          className="w-full py-2 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/60 rounded-lg text-cyan-300 font-medium transition flex items-center justify-center gap-1.5"
        >
          {config.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          {config.isPaused ? 'Resume' : 'Pause (Space)'}
        </button>
      </div>
    </aside>
  );
};
