import React from 'react';
import { PhysicsMode } from '../types/physics';
import { Waves, Atom, BookOpen, Activity, Sliders } from 'lucide-react';

interface NavbarProps {
  activeMode: PhysicsMode;
  onSelectMode: (mode: PhysicsMode) => void;
  fps: number;
  telemetryVisible: boolean;
  onToggleTelemetry: () => void;
  controlsVisible: boolean;
  onToggleControls: () => void;
  onOpenTheory: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeMode,
  onSelectMode,
  fps,
  telemetryVisible,
  onToggleTelemetry,
  controlsVisible,
  onToggleControls,
  onOpenTheory,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3 bg-slate-950/75 backdrop-blur-md border-b border-cyan-500/20 select-none">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.35)]">
          <span className="text-cyan-400 font-mono font-black text-xl">Ψ</span>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-wider font-mono text-cyan-300 uppercase flex items-center gap-2">
            QuantumFluid <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-200">GPGPU Superlab</span>
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Eulerian Navier-Stokes &amp; Time-Dependent Schrödinger Field Simulator
          </p>
        </div>
      </div>

      {/* Physics Solver Mode Selector */}
      <div className="flex items-center gap-2 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
        <button
          onClick={() => onSelectMode('fluid')}
          className={`px-4 py-1.5 text-xs font-mono font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
            activeMode === 'fluid'
              ? 'bg-gradient-to-r from-cyan-950 to-cyan-900 text-cyan-300 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-cyan-300'
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          Navier-Stokes (Fluid)
        </button>
        <button
          onClick={() => onSelectMode('quantum')}
          className={`px-4 py-1.5 text-xs font-mono font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
            activeMode === 'quantum'
              ? 'bg-gradient-to-r from-violet-950 to-violet-900 text-violet-300 border border-violet-500/60 shadow-[0_0_12px_rgba(139,92,246,0.25)]'
              : 'text-slate-400 hover:text-violet-300'
          }`}
        >
          <Atom className="w-3.5 h-3.5" />
          Schrödinger (Quantum)
        </button>
      </div>

      {/* Diagnostics Pills & Action Buttons */}
      <div className="flex items-center gap-3 font-mono text-xs">
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-800">
          <span className="text-slate-400">FPS:</span>
          <span className="font-bold text-emerald-400">{fps}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-800">
          <span className="text-slate-400">Grid:</span>
          <span className="text-cyan-300 font-semibold">256 × 256</span>
        </div>
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-800">
          <span className="text-slate-400">Particles:</span>
          <span className="text-violet-300 font-semibold">65,536</span>
        </div>

        {/* Math & Theory Modal button */}
        <button
          onClick={onOpenTheory}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 transition"
          title="Open Mathematical Physics Formulation"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        {/* Toggle Controls Panel */}
        <button
          onClick={onToggleControls}
          className={`p-1.5 rounded-lg border transition ${
            controlsVisible
              ? 'bg-cyan-950 border-cyan-500/50 text-cyan-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Controls Panel"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Toggle Telemetry */}
        <button
          onClick={onToggleTelemetry}
          className={`p-1.5 rounded-lg border transition ${
            telemetryVisible
              ? 'bg-cyan-950 border-cyan-500/50 text-cyan-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Telemetry HUD"
        >
          <Activity className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
