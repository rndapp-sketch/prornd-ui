import React, { useEffect, useRef } from "react";

const SPACING = 24;
const BASE_RADIUS = 1.5;
const MAX_RADIUS = 4;
const BASE_ALPHA = 0.15;
const MAX_ALPHA = 0.65;
const PROXIMITY = 140;
const COLOR = "154, 173, 195"; // #9AADC3

/**
 * Decorative dot grid. Dots near the cursor grow (1.5px -> 4px) and brighten
 * (0.15 -> 0.65) with distance measured by Math.hypot. The canvas never takes
 * pointer events; the cursor is tracked on the window, and frames are only
 * drawn while the cursor is nearby or the effect is easing out.
 */
export const DotMatrixCanvas: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let raf = 0;
    // Cursor in canvas space; `presence` eases 0..1 so dots relax smoothly when it leaves
    const mouse = { x: -9999, y: -9999, presence: 0, target: 0 };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (let x = SPACING / 2; x < width; x += SPACING) {
        for (let y = SPACING / 2; y < height; y += SPACING) {
          let t = 0;
          if (mouse.presence > 0.001) {
            const d = Math.hypot(x - mouse.x, y - mouse.y);
            if (d < PROXIMITY) {
              const k = 1 - d / PROXIMITY;
              t = k * k * (3 - 2 * k) * mouse.presence; // smoothstep falloff
            }
          }
          ctx.beginPath();
          ctx.arc(x, y, BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * t, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${COLOR}, ${BASE_ALPHA + (MAX_ALPHA - BASE_ALPHA) * t})`;
          ctx.fill();
        }
      }
    };

    const tick = () => {
      mouse.presence += (mouse.target - mouse.presence) * 0.14;
      draw();
      raf =
        Math.abs(mouse.target - mouse.presence) > 0.002 || mouse.target > 0
          ? requestAnimationFrame(tick)
          : 0;
      if (!raf) {
        mouse.presence = 0;
        draw();
      }
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      const near =
        mouse.x > -PROXIMITY && mouse.x < width + PROXIMITY && mouse.y > -PROXIMITY && mouse.y < height + PROXIMITY;
      mouse.target = near ? 1 : 0;
      wake();
    };
    const onLeave = () => {
      mouse.target = 0;
      wake();
    };

    resize();
    window.addEventListener("resize", resize);
    if (!reduceMotion) {
      window.addEventListener("mousemove", onMove, { passive: true });
      document.addEventListener("mouseleave", onLeave);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
};
