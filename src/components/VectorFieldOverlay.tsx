import React, { useEffect, useRef } from 'react';

interface VectorFieldOverlayProps {
  visible: boolean;
  sampleVelocityFn: (u: number, v: number) => { vx: number; vy: number };
}

export const VectorFieldOverlay: React.FC<VectorFieldOverlayProps> = ({
  visible,
  sampleVelocityFn,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      if (!visible) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        animId = requestAnimationFrame(render);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const gridResolution = 26;
      const stepX = w / gridResolution;
      const stepY = h / gridResolution;

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
      ctx.fillStyle = 'rgba(34, 211, 238, 0.75)';
      ctx.lineWidth = 1.2;

      for (let i = 0; i < gridResolution; i++) {
        for (let j = 0; j < gridResolution; j++) {
          const u = (i + 0.5) / gridResolution;
          const v = 1.0 - (j + 0.5) / gridResolution;

          const vel = sampleVelocityFn(u, v);
          const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);
          if (speed < 0.005) continue;

          const posX = (i + 0.5) * stepX;
          const posY = (j + 0.5) * stepY;

          const arrowLen = Math.min(speed * 45.0, stepX * 0.85);
          const angle = Math.atan2(-vel.vy, vel.vx);

          ctx.save();
          ctx.translate(posX, posY);
          ctx.rotate(angle);

          // Draw stem line
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(arrowLen, 0);
          ctx.stroke();

          // Draw arrow tip
          const headSize = Math.max(3.5, arrowLen * 0.32);
          ctx.beginPath();
          ctx.moveTo(arrowLen, 0);
          ctx.lineTo(arrowLen - headSize, -headSize * 0.4);
          ctx.lineTo(arrowLen - headSize, headSize * 0.4);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [visible, sampleVelocityFn]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
};
