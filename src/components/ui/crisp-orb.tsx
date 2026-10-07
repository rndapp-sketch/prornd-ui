import React, { useEffect, useRef } from 'react';
import { MODE_FRAMES, STATE_TO_MODE, resolvePreset, scaleCounts, scaleRadii } from 'thinking-orbs';
import type { OrbState } from 'thinking-orbs';
import { paintFrame } from 'thinking-orbs/engine';

interface CrispOrbProps {
    /** Displayed size in CSS px. Any value works — the orb is redrawn at full resolution, not stretched. */
    size?: number;
    state?: OrbState;
    /** Ink tint as #rgb or #rrggbb. */
    color?: string;
    /** Dot-radius multiplier (1 = tuned look). */
    dotSize?: number;
    /** Dot-count multiplier (1 = tuned look). */
    dots?: number;
    className?: string;
}

// The package only ships 64/32/20px presets, and its <ThinkingOrb> canvas goes soft when CSS-stretched.
// Its geometry is resolution-independent though, so draw the 64px preset's frame onto a canvas whose
// backing store matches the real display size.
const PRESET_SIZE = 64;

const parseHex = (color?: string) => {
    const hex = color?.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!hex) return undefined;
    const full = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const isDark = () =>
    document.documentElement.classList.contains('dark') ||
    (!document.documentElement.classList.contains('light') && window.matchMedia('(prefers-color-scheme: dark)').matches);

export const CrispOrb: React.FC<CrispOrbProps> = ({
    size = 160,
    state = 'composing',
    color,
    dotSize = 1,
    dots = 1,
    className,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        canvas.width = Math.round(size * dpr);
        canvas.height = Math.round(size * dpr);

        const { mode, speed, opts: presetOpts } = resolvePreset(state, PRESET_SIZE);
        let opts = dots !== 1 ? scaleCounts(presetOpts, Math.max(0.1, dots)) : presetOpts;
        if (dotSize !== 1) opts = scaleRadii(opts, Math.max(0.1, dotSize));
        const frameFn = MODE_FRAMES[STATE_TO_MODE[state] ?? mode];
        const tint = parseHex(color);
        const scale = (size / PRESET_SIZE) * dpr;

        const draw = (tSec: number) => {
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
            ctx.clearRect(0, 0, PRESET_SIZE, PRESET_SIZE);
            paintFrame(ctx, frameFn(PRESET_SIZE, tSec, opts), isDark(), tint);
        };

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            draw(0.6);
            return;
        }

        let raf = 0;
        const loop = () => {
            draw((performance.now() / 1000) * speed);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [size, state, color, dotSize, dots]);

    return (
        <canvas
            ref={canvasRef}
            role="img"
            aria-label="Loading"
            className={className}
            style={{ width: size, height: size }}
        />
    );
};
