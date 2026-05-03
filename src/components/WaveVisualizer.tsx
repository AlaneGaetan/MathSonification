import React, { useEffect, useRef } from 'react';
import * as math from 'mathjs';

interface WaveVisualizerProps {
  expr: string;
  mode: 'sweep' | 'waveform';
  xMin: number;
  xMax: number;
  startedAt: number | null;
  duration: number;
  isValid: boolean;
}

export function WaveVisualizer({ expr, mode, xMin, xMax, startedAt, duration, isValid }: WaveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let compiledNode: any = null;
    try {
      if (isValid && expr) compiledNode = math.compile(expr);
    } catch(e) {
      compiledNode = null;
    }

    const render = () => {
      const width = canvas.width = canvas.clientWidth * window.devicePixelRatio;
      const height = canvas.height = canvas.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;

      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let i=0; i<=10; i++) {
         const x = (cssWidth / 10) * i;
         ctx.moveTo(x, 0);
         ctx.lineTo(x, cssHeight);
      }
      for(let i=0; i<=8; i++) {
         const y = (cssHeight / 8) * i;
         ctx.moveTo(0, y);
         ctx.lineTo(cssWidth, y);
      }
      ctx.stroke();
      
      // Center line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(0, cssHeight / 2);
      ctx.lineTo(cssWidth, cssHeight / 2);
      ctx.stroke();

      if (!compiledNode) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(expr ? "Invalid Expression" : "Enter a Math Expression", cssWidth / 2, cssHeight / 2 - 10);
        return;
      }

      const points = Math.min(cssWidth, 2000);
      const data: number[] = [];
      let actualXMin = xMin;
      let actualXMax = xMax;

      if (mode === 'waveform') {
         actualXMin = 0;
         actualXMax = 0.02; // Show 20ms of audio buffer
      }

      for (let i = 0; i <= points; i++) {
        const cx = actualXMin + (i / points) * (actualXMax - actualXMin);
        try {
            const val = compiledNode.evaluate({ x: cx, t: cx });
            data.push(typeof val === 'number' && isFinite(val) ? val : 0);
        } catch {
            data.push(0);
        }
      }

      let minY = Math.min(...data);
      let maxY = Math.max(...data);
      if (mode === 'waveform') {
         minY = -1;
         maxY = 1;
      } else {
         // Pad range slightly
         const padding = (maxY - minY) * 0.1 || 1;
         minY -= padding;
         maxY += padding;
      }

      const range = maxY === minY ? 1 : maxY - minY;
      
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const cy = cssHeight - ((data[i] - minY) / range) * cssHeight;
        const px = (i / data.length) * cssWidth;
        if (i === 0) ctx.moveTo(px, cy);
        else ctx.lineTo(px, cy);
      }

      const accentColor = mode === 'sweep' ? '#F27D26' : '#00FF00';

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      
      // Compute play progress
      let progress = 0;
      if (startedAt !== null) {
          const now = Date.now();
          const elapsed = (now - startedAt) / 1000;
          if (elapsed < duration) {
              progress = elapsed / duration;
              animationRef.current = requestAnimationFrame(render);
          } else {
              progress = 0; // finished
          }
      }

      // Draw Playhead
      if (startedAt !== null && progress > 0) {
         const headX = progress * cssWidth;
         ctx.beginPath();
         ctx.moveTo(headX, 0);
         ctx.lineTo(headX, cssHeight);
         ctx.strokeStyle = '#FFFFFF';
         ctx.lineWidth = 1;
         ctx.stroke();
         
         if (mode === 'sweep') {
             const val = data[Math.floor(progress * (data.length - 1))];
             const cy = cssHeight - ((val - minY) / range) * cssHeight;
             ctx.beginPath();
             ctx.arc(headX, cy, 4, 0, Math.PI * 2);
             ctx.fillStyle = '#FFFFFF';
             ctx.fill();
         }
      }
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [expr, mode, xMin, xMax, startedAt, duration, isValid]);

  return <canvas ref={canvasRef} className="w-full h-full bg-[#151619] rounded-xl outline outline-1 outline-white/10" />;
}
