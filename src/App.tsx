/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { QuantumFluidEngine } from './physics/engine';
import { Navbar } from './components/Navbar';
import { ControlDock } from './components/ControlDock';
import { TelemetryLab } from './components/TelemetryLab';
import { VectorFieldOverlay } from './components/VectorFieldOverlay';
import { InspectorProbe } from './components/InspectorProbe';
import { TheoryModal } from './components/TheoryModal';
import { BottomBanner } from './components/BottomBanner';
import {
  SimulationConfig,
  TelemetryMetrics,
  ProbeData,
  ToolType,
  PresetType,
  PhysicsMode,
} from './types/physics';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<QuantumFluidEngine | null>(null);

  // UI State
  const [activeTool, setActiveTool] = useState<ToolType>('force');
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [telemetryVisible, setTelemetryVisible] = useState<boolean>(true);
  const [theoryModalOpen, setTheoryModalOpen] = useState<boolean>(false);

  // Inspector Probe State
  const [probeVisible, setProbeVisible] = useState<boolean>(false);
  const [probePos, setProbePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [probeData, setProbeData] = useState<ProbeData | null>(null);

  // Simulation Configuration
  const [config, setConfig] = useState<SimulationConfig>({
    gridSize: 256,
    particleResolution: 256,
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
  });

  // Telemetry Metrics
  const [metrics, setMetrics] = useState<TelemetryMetrics>({
    energy: 0.45,
    enstrophy: 1.95,
    reynolds: 12500,
    cfl: 0.32,
    quantumNorm: 1.0,
    isQuantum: false,
    fps: 60,
    drawCalls: 38,
    vramMB: 18.5,
  });

  // Interaction References
  const isPointerDownRef = useRef<boolean>(false);
  const pointerPosRef = useRef<THREE.Vector2>(new THREE.Vector2(0.5, 0.5));
  const activeToolRef = useRef<ToolType>('force');
  activeToolRef.current = activeTool;

  // Initialize Engine
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new QuantumFluidEngine(canvasMountRef.current, config);
    engineRef.current = engine;

    // Load initial benchmark
    engine.loadPreset('karman');

    let animId: number;
    const tick = () => {
      if (engineRef.current) {
        const telemetry = engineRef.current.step();
        setMetrics(telemetry);
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    const handleResize = () => {
      engine.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Update engine when config changes
  const updateConfig = useCallback(<K extends keyof SimulationConfig>(
    key: K,
    value: SimulationConfig[K]
  ) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      if (engineRef.current) {
        engineRef.current.config[key] = value;
        if (key === 'showParticles') {
          engineRef.current.particlePoints.visible = value as boolean;
        }
      }
      return next;
    });
  }, []);

  // Mode change handler
  const handleSelectMode = useCallback((mode: PhysicsMode) => {
    setConfig((prev) => {
      const nextRenderMode = mode === 'fluid' ? 0 : 4;
      const next = {
        ...prev,
        activeMode: mode,
        renderMode: nextRenderMode,
      };
      if (engineRef.current) {
        engineRef.current.config.activeMode = mode;
        engineRef.current.config.renderMode = nextRenderMode;
        if (mode === 'quantum') {
          engineRef.current.loadPreset('doubleslit');
        } else {
          engineRef.current.loadPreset('karman');
        }
      }
      return next;
    });
  }, []);

  // Preset load handler
  const handleLoadPreset = useCallback((preset: PresetType) => {
    if (engineRef.current) {
      engineRef.current.loadPreset(preset);
      setConfig({ ...engineRef.current.config });
    }
  }, []);

  // Clear Grid handler
  const handleClearGrid = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.clearAllFields();
    }
  }, []);

  // Pause / Play toggle
  const handleTogglePause = useCallback(() => {
    updateConfig('isPaused', !config.isPaused);
  }, [config.isPaused, updateConfig]);

  // Pointer event handlers
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // If clicked on HUD panels, ignore
    const target = e.target as HTMLElement;
    if (
      target.closest('aside') ||
      target.closest('header') ||
      target.closest('.fixed.inset-0.z-50')
    ) {
      return;
    }

    isPointerDownRef.current = true;
    const x = e.clientX / window.innerWidth;
    const y = 1.0 - e.clientY / window.innerHeight;
    pointerPosRef.current.set(x, y);

    if (engineRef.current) {
      if (e.button === 2 || activeToolRef.current === 'barrier') {
        engineRef.current.applyBarrierStamp(pointerPosRef.current, 1.0);
      } else if (activeToolRef.current === 'eraser') {
        engineRef.current.applyBarrierStamp(pointerPosRef.current, 0.0);
      } else {
        engineRef.current.applyPointerForce(pointerPosRef.current, new THREE.Vector2(0, 0));
      }
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const x = e.clientX / window.innerWidth;
    const y = 1.0 - e.clientY / window.innerHeight;
    const current = new THREE.Vector2(x, y);
    const delta = current.clone().sub(pointerPosRef.current);
    pointerPosRef.current.copy(current);

    if (isPointerDownRef.current && engineRef.current) {
      if (e.buttons === 2 || activeToolRef.current === 'barrier') {
        engineRef.current.applyBarrierStamp(current, 1.0);
      } else if (activeToolRef.current === 'eraser') {
        engineRef.current.applyBarrierStamp(current, 0.0);
      } else {
        engineRef.current.applyPointerForce(current, delta);
      }
      setProbeVisible(false);
    } else if (engineRef.current) {
      // Hover Probe
      const data = engineRef.current.sampleVelocity(x, y);
      setProbeData(data);
      setProbePos({ x: e.clientX, y: e.clientY });
      setProbeVisible(true);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    isPointerDownRef.current = false;
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePause();
      } else if (e.code === 'KeyH') {
        setControlsVisible((prev) => !prev);
        setTelemetryVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePause]);

  // Velocity sampling for vector field overlay
  const sampleVelocityForVector = useCallback((u: number, v: number) => {
    if (engineRef.current) {
      return engineRef.current.sampleVelocity(u, v);
    }
    return { vx: 0, vy: 0 };
  }, []);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        isPointerDownRef.current = false;
        setProbeVisible(false);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 3D WebGL Canvas Mount */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0 cursor-crosshair" />

      {/* Live Vector Field Canvas Overlay */}
      <VectorFieldOverlay
        visible={config.showVectors}
        sampleVelocityFn={sampleVelocityForVector}
      />

      {/* Cell Sensor Tooltip Inspector */}
      <InspectorProbe
        visible={probeVisible && !config.isPaused}
        x={probePos.x}
        y={probePos.y}
        data={probeData}
      />

      {/* Top Navbar */}
      <Navbar
        activeMode={config.activeMode}
        onSelectMode={handleSelectMode}
        fps={metrics.fps}
        telemetryVisible={telemetryVisible}
        onToggleTelemetry={() => setTelemetryVisible((prev) => !prev)}
        controlsVisible={controlsVisible}
        onToggleControls={() => setControlsVisible((prev) => !prev)}
        onOpenTheory={() => setTheoryModalOpen(true)}
      />

      {/* Left Numerical Control & Presets Dock */}
      <ControlDock
        config={config}
        activeTool={activeTool}
        onChangeTool={setActiveTool}
        onUpdateConfig={updateConfig}
        onLoadPreset={handleLoadPreset}
        onClearGrid={handleClearGrid}
        onTogglePause={handleTogglePause}
        visible={controlsVisible}
        onToggleVisible={() => setControlsVisible((prev) => !prev)}
      />

      {/* Right Floating Telemetry Lab HUD */}
      <TelemetryLab
        metrics={metrics}
        visible={telemetryVisible}
        onToggle={() => setTelemetryVisible((prev) => !prev)}
      />

      {/* Bottom Key & Mouse Interaction Hint Banner */}
      <BottomBanner />

      {/* Graduate Mathematical Physics Reference Modal */}
      <TheoryModal
        isOpen={theoryModalOpen}
        onClose={() => setTheoryModalOpen(false)}
      />
    </div>
  );
}
