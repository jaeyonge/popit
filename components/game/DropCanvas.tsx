"use client";

import { useEffect, useRef } from "react";

export interface ParticleItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  scale: number;
  alpha: number;
  image: HTMLImageElement;
}

interface DropCanvasProps {
  dropAssetUrl: string;
  itemsRef: React.MutableRefObject<ParticleItem[]>;
}

export default function DropCanvas({ dropAssetUrl, itemsRef }: DropCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05); // cap delta time
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = itemsRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Physics: gravity + velocity
        p.vy += 1200 * dt; // gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vRot * dt;

        // Fade out as it falls below viewport
        if (p.y > canvas.height - 50) {
          p.alpha -= 1.8 * dt;
        }

        if (p.alpha <= 0 || p.y > canvas.height + 150) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        const size = 64 * p.scale;
        try {
          ctx.drawImage(p.image, -size / 2, -size / 2, size, size);
        } catch (e) {
          // ignore drawing issue if image loading
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [itemsRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-20 h-full w-full"
    />
  );
}

