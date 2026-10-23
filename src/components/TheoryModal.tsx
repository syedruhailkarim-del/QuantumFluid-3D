import React from 'react';
import { X, BookOpen, Layers, Atom, Waves } from 'lucide-react';

interface TheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TheoryModal: React.FC<TheoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-slate-950 border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-400 font-mono font-bold">
              Ψ
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-cyan-300">
                QuantumFluid 3D — Mathematical Physics &amp; GPGPU Architecture
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Graduate Theoretical Physics &amp; Numerical Computing Foundations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm font-sans leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h3 className="text-base font-bold font-mono text-cyan-400 flex items-center gap-2">
              <Waves className="w-4 h-4 text-cyan-400" />
              1. Incompressible Navier-Stokes Equations &amp; Chorin's Projection Method
            </h3>
            <p className="text-slate-300 text-xs">
              The motion of an incompressible, isothermal Newtonian fluid is governed by the momentum and mass conservation partial differential equations:
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-cyan-200">
              ∂u/∂t + (u · ∇)u = -(1/ρ) ∇p + ν ∇²u + f
              <br />
              ∇ · u = 0
            </div>
            <p className="text-slate-300 text-xs">
              Where <code className="text-cyan-300 font-mono">u = (u, v)</code> is the velocity field, <code className="text-cyan-300 font-mono">p</code> is thermodynamic pressure, <code className="text-cyan-300 font-mono">ν</code> is kinematic shear viscosity, and <code className="text-cyan-300 font-mono">f</code> represents external body forces (vorticity confinement, user impulses, jets).
            </p>

            <div className="space-y-2 text-xs">
              <h4 className="font-semibold text-slate-200 font-mono">Chorin's Projection Theorem (Helmholtz-Hodge Decomposition):</h4>
              <p className="text-slate-400">
                Any vector field can be uniquely resolved into a divergence-free solenoidal component and an irrotational gradient field: <span className="font-mono text-cyan-300">w = u + ∇φ</span>, where <span className="font-mono text-cyan-300">∇ · u = 0</span>.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                <li><strong className="text-cyan-200">Nonlinear Advection:</strong> Semi-Lagrangian backtracing <span className="font-mono text-slate-200">u* = u^n(x - u^n(x) Δt)</span> eliminates the CFL stability restriction on the convective step.</li>
                <li><strong className="text-cyan-200">Viscous Diffusion:</strong> Jacobi relaxation solves <span className="font-mono text-slate-200">(I - ν Δt ∇²) u** = u*</span>.</li>
                <li><strong className="text-cyan-200">Poisson Pressure Equation:</strong> Iteratively solves <span className="font-mono text-slate-200">∇² p = (ρ/Δt) ∇ · u**</span> with Neumann boundary conditions <span className="font-mono text-slate-200">∂p/∂n = 0</span> at solid obstacles.</li>
                <li><strong className="text-cyan-200">Projection Step:</strong> <span className="font-mono text-slate-200">u^{"{n+1}"} = u** - (Δt/ρ) ∇p</span> guarantees mathematical divergence-free conservation.</li>
                <li><strong className="text-cyan-200">Vorticity Confinement:</strong> Steinhoff's force <span className="font-mono text-slate-200">f_vc = ε Δx (η × ω)</span> recovers swirling turbulent details lost to numerical grid diffusion.</li>
              </ul>
            </div>
          </section>

          <div className="border-t border-slate-800"></div>

          {/* Section 2 */}
          <section className="space-y-3">
            <h3 className="text-base font-bold font-mono text-violet-400 flex items-center gap-2">
              <Atom className="w-4 h-4 text-violet-400" />
              2. Time-Dependent Schrödinger Wave Equation (TDSE)
            </h3>
            <p className="text-slate-300 text-xs">
              Quantum mechanical wave function evolution in two spatial dimensions is governed by:
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-violet-200">
              i ℏ (∂Ψ/∂t) = Ĥ Ψ = (-ℏ²/2m ∇² + V(x, y)) Ψ
            </div>
            <p className="text-slate-300 text-xs">
              Decomposing Ψ into Real and Imaginary components <span className="font-mono text-violet-300">Ψ = Ψ_R + i Ψ_I</span>:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-cyan-200">
                ∂Ψ_R/∂t = (1/ℏ) [ - (ℏ²/2m) ∇²Ψ_I + V Ψ_I ]
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-violet-200">
                ∂Ψ_I/∂t = -(1/ℏ) [ - (ℏ²/2m) ∇²Ψ_R + V Ψ_R ]
              </div>
            </div>
            <p className="text-slate-400 text-xs">
              <strong className="text-violet-300">Symplectic Störmer-Verlet Integration:</strong> By interlacing updates to the real and imaginary components on the GPU, the solver satisfies exact symplectic symplecticity, conserving total probability norm <span className="font-mono text-violet-200">⟨Ψ|Ψ⟩ = ∫ |Ψ|² dΩ ≡ 1.0</span> over indefinite simulation time.
            </p>
          </section>

          <div className="border-t border-slate-800"></div>

          {/* Section 3 */}
          <section className="space-y-3">
            <h3 className="text-base font-bold font-mono text-emerald-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              3. GPGPU Ping-Pong Framebuffer Pipeline
            </h3>
            <p className="text-slate-300 text-xs">
              All computational physics passes execute on the GPU using floating-point render targets. Double-buffered (ping-pong) WebGLRenderTargets ensure memory read/write safety:
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-300 space-y-1">
              <div>1. [Advection] Velocity_A → Velocity_B (Swap)</div>
              <div>2. [Advection] Dye_A → Dye_B (Swap)</div>
              <div>3. [Vorticity &amp; Confinement] Velocity_B → Vorticity → Velocity_A (Swap)</div>
              <div>4. [Diffusion] 6 Jacobi Passes on Velocity (Swap per pass)</div>
              <div>5. [Divergence] Velocity → Divergence</div>
              <div>6. [Poisson Pressure] 32 Jacobi Passes on Pressure (Swap per pass)</div>
              <div>7. [Projection] Velocity - ∇Pressure → Velocity_Final (Swap)</div>
              <div>8. [Particle Cloud] 65,536 Particle Positions Advected on GPU</div>
              <div>9. [Master Display] Multi-spectral Colormapped Screen Quad</div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-200 font-mono text-xs transition"
          >
            Close Scientific Reference
          </button>
        </div>
      </div>
    </div>
  );
};
