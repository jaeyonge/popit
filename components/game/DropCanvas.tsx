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
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.04);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      const particles = itemsRef.current;
      // Cap max particles for 60fps mobile budget (PRD Section 48)
      if (particles.length > 25) {
        particles.splice(0, particles.length - 25);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.vy += 1200 * dt; // gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vRot * dt;

        if (p.y > height - 50) {
          p.alpha -= 2.5 * dt;
        }

        if (p.alpha <= 0 || p.y > height + 100) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        const size = 52 * p.scale;
        try {
          ctx.drawImage(p.image, -size / 2, -size / 2, size, size);
        } catch (e) {
          // ignore
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

