import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { TelemetryMetrics } from '../types/physics';
import { Activity, Cpu, Gauge, Zap } from 'lucide-react';

Chart.register(...registerables);

interface TelemetryLabProps {
  metrics: TelemetryMetrics;
  visible: boolean;
  onToggle: () => void;
}

export const TelemetryLab: React.FC<TelemetryLabProps> = ({ metrics, visible, onToggle }) => {
  const chartEnergyRef = useRef<HTMLCanvasElement | null>(null);
  const chartCflRef = useRef<HTMLCanvasElement | null>(null);
  const chartEnergyInstance = useRef<Chart | null>(null);
  const chartCflInstance = useRef<Chart | null>(null);

  const maxSamples = 50;

  useEffect(() => {
    if (!chartEnergyRef.current || !chartCflRef.current) return;

    // Destroy any existing charts
    if (chartEnergyInstance.current) chartEnergyInstance.current.destroy();
    if (chartCflInstance.current) chartCflInstance.current.destroy();

    const emptyLabels = Array.from({ length: maxSamples }, () => '');

    // Energy & Enstrophy Chart
    chartEnergyInstance.current = new Chart(chartEnergyRef.current, {
      type: 'line',
      data: {
        labels: emptyLabels,
        datasets: [
          {
            label: 'Kinetic Energy (J)',
            data: Array(maxSamples).fill(0.4),
            borderColor: '#22d3ee',
            backgroundColor: 'rgba(34, 211, 238, 0.1)',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.35,
            fill: true,
          },
          {
            label: 'Enstrophy (s⁻²)',
            data: Array(maxSamples).fill(1.8),
            borderColor: '#f43f5e',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.35,
            borderDash: [3, 3],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#94a3b8', font: { family: 'monospace', size: 9 }, boxWidth: 10 },
          },
        },
        scales: {
          x: { display: false },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { family: 'monospace', size: 9 }, maxTicksLimit: 4 },
          },
        },
      },
    });

    // CFL Stability Chart
    chartCflInstance.current = new Chart(chartCflRef.current, {
      type: 'line',
      data: {
        labels: emptyLabels,
        datasets: [
          {
            label: 'CFL Number',
            data: Array(maxSamples).fill(0.35),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.25,
            fill: true,
          },
          {
            label: 'Stability Limit (1.0)',
            data: Array(maxSamples).fill(1.0),
            borderColor: '#f59e0b',
            borderWidth: 1,
            pointRadius: 0,
            borderDash: [4, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#94a3b8', font: { family: 'monospace', size: 9 }, boxWidth: 10 },
          },
        },
        scales: {
          x: { display: false },
          y: {
            min: 0,
            max: 1.5,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { family: 'monospace', size: 9 }, maxTicksLimit: 4 },
          },
        },
      },
    });

    return () => {
      chartEnergyInstance.current?.destroy();
      chartCflInstance.current?.destroy();
    };
  }, []);

  // Update real-time charts on metric updates
  useEffect(() => {
    if (chartEnergyInstance.current) {
      const eData = chartEnergyInstance.current.data.datasets[0].data;
      const wData = chartEnergyInstance.current.data.datasets[1].data;
      eData.shift();
      eData.push(metrics.energy);
      wData.shift();
      wData.push(metrics.enstrophy);
      chartEnergyInstance.current.update('none');
    }

    if (chartCflInstance.current) {
      const cflData = chartCflInstance.current.data.datasets[0].data;
      cflData.shift();
      cflData.push(metrics.cfl);
      chartCflInstance.current.update('none');
    }
  }, [metrics.energy, metrics.enstrophy, metrics.cfl]);

  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-16 right-4 z-20 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-cyan-400 font-mono text-xs flex items-center gap-2 hover:bg-slate-800 shadow-lg transition"
        title="Open Telemetry Lab"
      >
        <Activity className="w-3.5 h-3.5" />
        <span>Telemetry Lab</span>
      </button>
    );
  }

  return (
    <aside
      className="fixed top-16 right-4 bottom-4 w-92 z-20 flex flex-col gap-3 p-4 bg-slate-950/85 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-y-auto custom-scrollbar transition-transform duration-300"
      style={{ maxHeight: 'calc(100vh - 80px)' }}
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <h2 className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
            Scientific Telemetry Lab
          </h2>
        </div>
        <button
          onClick={onToggle}
          className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
        >
          Hide
        </button>
      </div>

      {/* Invariants Cards */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" /> Kinetic Energy E_k
          </span>
          <span className="text-sm font-bold text-cyan-300 mt-1">
            {metrics.energy.toFixed(4)} J
          </span>
          <span className="text-[9px] text-slate-500 mt-0.5">½ ∫ |u|² dΩ</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Gauge className="w-3 h-3 text-rose-400" /> Enstrophy ℰ
          </span>
          <span className="text-sm font-bold text-rose-400 mt-1">
            {metrics.enstrophy.toFixed(4)} s⁻²
          </span>
          <span className="text-[9px] text-slate-500 mt-0.5">½ ∫ |∇ × u|² dΩ</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400">Reynolds No. Re</span>
          <span className="text-sm font-bold text-amber-400 mt-1">
            {Math.round(metrics.reynolds).toLocaleString()}
          </span>
          <span className="text-[9px] text-slate-500 mt-0.5">U L / ν (Inertia/Visc)</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400">CFL Stability Factor</span>
          <span
            className={`text-sm font-bold mt-1 ${
              metrics.cfl > 1.0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {metrics.cfl.toFixed(3)}
          </span>
          <span className="text-[9px] text-slate-500 mt-0.5">C = u_max Δt / Δx &lt; 1</span>
        </div>
      </div>

      {/* Quantum Invariant Card */}
      {metrics.isQuantum && (
        <div className="p-2.5 rounded-xl bg-violet-950/30 border border-violet-800/40 text-xs font-mono">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-violet-300 font-semibold uppercase tracking-wider">
              Unitary Norm ⟨Ψ|Ψ⟩
            </span>
            <span className="text-xs font-bold text-violet-200">
              {metrics.quantumNorm.toFixed(5)}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-violet-400 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, metrics.quantumNorm * 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[9px] text-violet-400/80 mt-1">
            <span>Conservation Target: 1.00000</span>
            <span>Symplectic Drift: ±0.001%</span>
          </div>
        </div>
      )}

      {/* Chart 1: Energy & Enstrophy Stream */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[11px] font-mono">
          <span className="text-slate-300 font-medium">Kinetic Energy &amp; Enstrophy Stream</span>
          <span className="text-[10px] text-slate-500">50-Sample Buffer</span>
        </div>
        <div className="h-28 w-full">
          <canvas ref={chartEnergyRef}></canvas>
        </div>
      </div>

      {/* Chart 2: CFL Number */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[11px] font-mono">
          <span className="text-slate-300 font-medium">CFL Condition Trace</span>
          <span className="text-[10px] text-emerald-400 font-mono">Courant Stability</span>
        </div>
        <div className="h-28 w-full">
          <canvas ref={chartCflRef}></canvas>
        </div>
      </div>

      {/* GPGPU Hardware Pipeline Diagnostics */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-[11px] space-y-1.5 text-slate-400">
        <div className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-cyan-400" /> GPGPU Memory &amp; Pipeline
        </div>
        <div className="flex justify-between">
          <span>FBO Target Dimensions:</span>
          <span className="text-slate-200">256 × 256 (65,536 cells)</span>
        </div>
        <div className="flex justify-between">
          <span>Texture Precision:</span>
          <span className="text-slate-200">IEEE 754 16/32-bit Float</span>
        </div>
        <div className="flex justify-between">
          <span>VRAM Buffer Footprint:</span>
          <span className="text-slate-200">~{metrics.vramMB} MB</span>
        </div>
        <div className="flex justify-between">
          <span>Draw Calls / Frame:</span>
          <span className="text-cyan-300 font-semibold">{metrics.drawCalls} passes/frame</span>
        </div>
      </div>
    </aside>
  );
};
