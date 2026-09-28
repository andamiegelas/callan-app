import React, { useEffect, useRef } from 'react';

export default function AudioWaveform({ dspPipeline, isActive, isNsActive }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let animationFrameId;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isActive) {
        // Flatline idle state
        ctx.beginPath();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Live waveform data from AudioDSPPipeline
      const data = dspPipeline ? dspPipeline.getWaveformData() : new Uint8Array(0);
      const barCount = 16;
      const barWidth = (canvas.width / barCount) - 3;
      
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      if (isNsActive) {
        gradient.addColorStop(0, '#06b6d4'); // Cyan for Noise Suppression Active
        gradient.addColorStop(1, '#38bdf8');
      } else {
        gradient.addColorStop(0, '#f59e0b'); // Amber for Raw Audio
        gradient.addColorStop(1, '#fbbf24');
      }

      for (let i = 0; i < barCount; i++) {
        const value = data[i * 2] || Math.floor(Math.random() * 20 + 5);
        const percent = value / 255;
        const barHeight = Math.max(6, percent * canvas.height * 0.85);
        const x = i * (barWidth + 3);
        const y = (canvas.height - barHeight) / 2;

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [dspPipeline, isActive, isNsActive]);

  return (
    <div className="w-full flex flex-col items-center justify-center my-2">
      <canvas 
        ref={canvasRef} 
        width={220} 
        height={48} 
        className="w-full max-w-[220px] h-[48px]"
      />
    </div>
  );
}
