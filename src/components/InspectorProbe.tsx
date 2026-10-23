import React from 'react';
import { ProbeData } from '../types/physics';

interface InspectorProbeProps {
  visible: boolean;
  x: number;
  y: number;
  data: ProbeData | null;
}

export const InspectorProbe: React.FC<InspectorProbeProps> = ({
  visible,
  x,
  y,
  data,
}) => {
  if (!visible || !data) return null;

  return (
    <div
      className="fixed z-40 p-2.5 bg-slate-950/90 border border-cyan-500/50 rounded-xl shadow-2xl font-mono text-[11px] pointer-events-none backdrop-blur-md transition-all duration-75 select-none"
      style={{
        left: `${Math.min(window.innerWidth - 180, x + 16)}px`,
        top: `${Math.min(window.innerHeight - 140, y + 16)}px`,
      }}
    >
      <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1 border-b border-cyan-500/30 pb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
        Cell Sensor Probe
      </div>
      <div className="text-slate-300 flex justify-between gap-3">
        <span className="text-slate-400">Pos:</span>
        <span className="font-semibold text-cyan-200">
          ({data.u.toFixed(2)}, {data.v.toFixed(2)})
        </span>
      </div>
      <div className="text-slate-300 flex justify-between gap-3">
        <span className="text-slate-400">Velocity:</span>
        <span className="font-semibold text-cyan-200">
          ({data.vx.toFixed(2)}, {data.vy.toFixed(2)}) m/s
        </span>
      </div>
      <div className="text-slate-300 flex justify-between gap-3">
        <span className="text-slate-400">Vorticity:</span>
        <span className="font-semibold text-rose-300">{data.vort.toFixed(2)} s⁻¹</span>
      </div>
      <div className="text-slate-300 flex justify-between gap-3">
        <span className="text-slate-400">Pressure:</span>
        <span className="font-semibold text-emerald-300">{data.pres.toFixed(2)} Pa</span>
      </div>
    </div>
  );
};
