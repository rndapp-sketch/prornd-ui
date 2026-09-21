import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CropIcon, XIcon } from "lucide-react";

interface ImageCropModalProps {
    /** The freshly chosen image to crop. The modal is shown while this is set. */
    file: File | null;
    /** Width / height of the crop frame, e.g. 105 / 124 for the ID-card photo box. */
    aspect: number;
    /** Width in px of the exported image (height follows from `aspect`). */
    outputWidth: number;
    title: string;
    hint?: string;
    /**
     * Let the user zoom out until the whole image fits inside the frame (the rest is
     * filled white). Needed for signatures, whose shape rarely matches the frame.
     */
    allowPadding?: boolean;
    /**
     * Show whiten-background / darken-ink controls (a levels adjustment applied to the
     * preview and to the exported image). For scanned or photographed signatures.
     */
    enhance?: boolean;
    onCancel: () => void;
    onConfirm: (cropped: File) => void;
}

const STAGE_HEIGHT = 300;
const FRAME_PADDING = 20;
const MAX_ZOOM = 4;
// Longest side of the working copy used for live levels preview / export (px)
const WORK_MAX_SIDE = 1600;

/** 0-100 slider values -> per-channel levels: values >= white become 255, <= black become 0. */
function buildLevelsLut(whiten: number, darken: number): Uint8ClampedArray {
    const white = 255 - (whiten / 100) * 130;
    const black = (darken / 100) * 110;
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) lut[v] = ((v - black) / (white - black)) * 255;
    return lut;
}

/**
 * Dependency-free image cropper: the frame is fixed in the centre of the stage,
 * the user drags the image under it and zooms with the slider / mouse wheel.
 * The crop is rendered to a canvas at `outputWidth` and returned as a File.
 */
export function ImageCropModal({
    file,
    aspect,
    outputWidth,
    title,
    hint,
    allowPadding = false,
    enhance = false,
    onCancel,
    onConfirm,
}: ImageCropModalProps) {
    const stageRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

    const [src, setSrc] = useState<string | null>(null);
    const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [stageW, setStageW] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isSaving, setIsSaving] = useState(false);
    // Levels adjustment (0 = untouched)
    const [whiten, setWhiten] = useState(0);
    const [darken, setDarken] = useState(0);
    // Working copy of the image (scaled to WORK_MAX_SIDE) and its levels-adjusted version
    const workRef = useRef<{ src: HTMLCanvasElement; out: HTMLCanvasElement; k: number } | null>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    // Load the chosen file (object URL is revoked when the file changes/unmounts)
    useEffect(() => {
        setNatural(null);
        setLoadError(false);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setWhiten(0);
        setDarken(0);
        workRef.current = null;
        if (!file) {
            setSrc(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setSrc(url);
        const img = new Image();
        img.onload = () => {
            imgRef.current = img;
            const k = Math.min(1, WORK_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
            const mk = () => {
                const c = document.createElement("canvas");
                c.width = Math.max(1, Math.round(img.naturalWidth * k));
                c.height = Math.max(1, Math.round(img.naturalHeight * k));
                return c;
            };
            const srcCanvas = mk();
            const ctx = srcCanvas.getContext("2d", { willReadFrequently: true });
            ctx?.drawImage(img, 0, 0, srcCanvas.width, srcCanvas.height);
            workRef.current = { src: srcCanvas, out: mk(), k };
            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        };
        img.onerror = () => setLoadError(true);
        img.src = url;
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // Track the stage's rendered width (the modal is fluid on small screens)
    useEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setStageW(el.clientWidth));
        ro.observe(el);
        setStageW(el.clientWidth);
        return () => ro.disconnect();
    }, [file, natural]);

    // Apply the levels adjustment to the working copy and refresh the live preview
    useEffect(() => {
        const work = workRef.current;
        if (!enhance || !natural || !work) return;
        const sctx = work.src.getContext("2d", { willReadFrequently: true });
        const octx = work.out.getContext("2d");
        if (!sctx || !octx) return;
        const data = sctx.getImageData(0, 0, work.src.width, work.src.height);
        const px = data.data;
        const lut = buildLevelsLut(whiten, darken);
        for (let i = 0; i < px.length; i += 4) {
            px[i] = lut[px[i]];
            px[i + 1] = lut[px[i + 1]];
            px[i + 2] = lut[px[i + 2]];
        }
        octx.putImageData(data, 0, 0);
        const pc = previewCanvasRef.current;
        if (pc) {
            pc.width = work.out.width;
            pc.height = work.out.height;
            pc.getContext("2d")?.drawImage(work.out, 0, 0);
        }
    }, [enhance, natural, whiten, darken]);

    // Pick starting levels from the image: paper level -> white point, ink level -> black point
    const handleAutoEnhance = useCallback(() => {
        const work = workRef.current;
        const ctx = work?.src.getContext("2d", { willReadFrequently: true });
        if (!work || !ctx) return;
        const px = ctx.getImageData(0, 0, work.src.width, work.src.height).data;
        const hist = new Uint32Array(256);
        for (let i = 0; i < px.length; i += 4) {
            hist[Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2])]++;
        }
        const total = px.length / 4;
        const percentile = (q: number) => {
            let acc = 0;
            for (let v = 0; v < 256; v++) {
                acc += hist[v];
                if (acc >= total * q) return v;
            }
            return 255;
        };
        const paper = percentile(0.85); // background is the bulk of a signature scan
        const ink = percentile(0.02);
        const whitePoint = Math.max(255 - 130, paper - 10);
        const blackPoint = Math.min(110, ink + 25);
        setWhiten(Math.round(((255 - whitePoint) / 130) * 100));
        setDarken(Math.max(0, Math.round((blackPoint / 110) * 100)));
    }, []);

    // Largest frame of the requested aspect that fits the stage
    const frame = useMemo(() => {
        const maxW = Math.max(stageW - FRAME_PADDING * 2, 1);
        const maxH = STAGE_HEIGHT - FRAME_PADDING * 2;
        const w = Math.min(maxW, maxH * aspect);
        return { w, h: w / aspect };
    }, [stageW, aspect]);

    // Scale at which the image just covers the frame; `zoom` multiplies it
    const baseScale = natural ? Math.max(frame.w / natural.w, frame.h / natural.h) : 1;
    const scale = baseScale * zoom;
    // Smallest zoom: "cover" (1), or "contain" when padding is allowed. Floored to the
    // slider's 0.01 step so the whole image is always reachable (never cropped by rounding).
    const minZoom =
        allowPadding && natural
            ? Math.min(1, Math.floor((Math.min(frame.w / natural.w, frame.h / natural.h) / baseScale) * 100) / 100)
            : 1;

    const clamp = useCallback(
        (o: { x: number; y: number }, s: number) => {
            if (!natural) return o;
            const maxX = Math.max((natural.w * s - frame.w) / 2, 0);
            const maxY = Math.max((natural.h * s - frame.h) / 2, 0);
            return {
                x: Math.min(maxX, Math.max(-maxX, o.x)),
                y: Math.min(maxY, Math.max(-maxY, o.y)),
            };
        },
        [natural, frame.w, frame.h],
    );

    const applyZoom = useCallback(
        (next: number) => {
            const z = Math.min(MAX_ZOOM, Math.max(minZoom, next));
            setZoom(z);
            setOffset((o) => clamp(o, baseScale * z));
        },
        [clamp, baseScale, minZoom],
    );

    // Keep the image covering the frame if the stage is resized
    useEffect(() => {
        setOffset((o) => clamp(o, scale));
    }, [clamp, scale]);

    // Non-passive wheel listener so the page doesn't scroll while zooming
    useEffect(() => {
        const el = stageRef.current;
        if (!el || !natural) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            applyZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [natural, zoom, applyZoom]);

    // Escape cancels
    useEffect(() => {
        if (!file) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [file, onCancel]);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    };
    const handlePointerMove = (e: React.PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        setOffset(clamp({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }, scale));
    };
    const handlePointerUp = () => {
        dragRef.current = null;
    };

    const handleConfirm = async () => {
        const img = imgRef.current;
        if (!file || !img || !natural) return;
        setIsSaving(true);
        try {
            // Frame position in source-image coordinates
            const sw = frame.w / scale;
            const sh = frame.h / scale;
            const sx = natural.w / 2 - offset.x / scale - sw / 2;
            const sy = natural.h / 2 - offset.y / scale - sh / 2;

            const canvas = document.createElement("canvas");
            canvas.width = Math.round(outputWidth);
            canvas.height = Math.round(outputWidth / aspect);
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas is not supported in this browser");
            // Transparent PNGs would otherwise turn black when saved as JPEG
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingQuality = "high";
            const work = workRef.current;
            if (enhance && work) {
                // Levels-adjusted working copy; source coordinates scale by its resolution
                const k = work.k;
                ctx.drawImage(work.out, sx * k, sy * k, sw * k, sh * k, 0, 0, canvas.width, canvas.height);
            } else {
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
            }

            const isPng = file.type === "image/png";
            const type = isPng ? "image/png" : "image/jpeg";
            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, type, 0.92),
            );
            if (!blob) throw new Error("Could not export the cropped image");
            const base = file.name.replace(/\.[^.]+$/, "") || "image";
            onConfirm(new File([blob], `${base}-cropped.${isPng ? "png" : "jpg"}`, { type }));
        } catch {
            setLoadError(true);
        } finally {
            setIsSaving(false);
        }
    };

    if (!file) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onCancel}
        >
            <div
                className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#27272A] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-700">
                    <CropIcon className="h-4 w-4 text-[#4A6CF7]" />
                    <h2 className="flex-1 text-sm font-extrabold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        aria-label="Cancel"
                    >
                        <XIcon className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5">
                    {loadError ? (
                        <p className="text-sm text-red-600 dark:text-red-400">
                            This image could not be opened. Please choose a JPEG or PNG file.
                        </p>
                    ) : (
                        <>
                            <div
                                ref={stageRef}
                                className="relative w-full overflow-hidden rounded-lg bg-zinc-900 select-none touch-none cursor-grab active:cursor-grabbing"
                                style={{ height: STAGE_HEIGHT }}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerCancel={handlePointerUp}
                            >
                                {src && natural && (() => {
                                    const layout = {
                                        width: natural.w * scale,
                                        height: natural.h * scale,
                                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                                    };
                                    const cls = "absolute left-1/2 top-1/2 max-w-none pointer-events-none";
                                    return enhance ? (
                                        <canvas ref={previewCanvasRef} className={cls} style={layout} />
                                    ) : (
                                        <img src={src} alt="To crop" draggable={false} className={cls} style={layout} />
                                    );
                                })()}
                                {/* Fixed crop frame; the box-shadow dims everything outside it */}
                                <div
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-white pointer-events-none"
                                    style={{
                                        width: frame.w,
                                        height: frame.h,
                                        boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                                    }}
                                />
                            </div>

                            <div className="mt-4 flex items-center gap-3">
                                <span className="text-[11px] font-semibold text-zinc-500">Zoom</span>
                                <input
                                    type="range"
                                    min={minZoom}
                                    max={MAX_ZOOM}
                                    step={0.01}
                                    value={zoom}
                                    disabled={!natural}
                                    onChange={(e) => applyZoom(Number(e.target.value))}
                                    className="flex-1 accent-[#4A6CF7]"
                                />
                            </div>
                            {enhance && (
                                <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">
                                            Contrast
                                        </span>
                                        <div className="flex gap-1.5">
                                            <button
                                                type="button"
                                                onClick={handleAutoEnhance}
                                                disabled={!natural}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#4A6CF7]/10 text-[#4A6CF7] hover:bg-[#4A6CF7]/20 disabled:opacity-50"
                                            >
                                                Auto
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setWhiten(0);
                                                    setDarken(0);
                                                }}
                                                disabled={whiten === 0 && darken === 0}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-bold border border-zinc-200 dark:border-zinc-600 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-3">
                                        <span className="w-28 text-[11px] font-semibold text-zinc-500">Whiten background</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            step={1}
                                            value={whiten}
                                            onChange={(e) => setWhiten(Number(e.target.value))}
                                            className="flex-1 accent-[#4A6CF7]"
                                        />
                                        <span className="w-8 text-right text-[11px] tabular-nums text-zinc-400">{whiten}</span>
                                    </label>
                                    <label className="flex items-center gap-3">
                                        <span className="w-28 text-[11px] font-semibold text-zinc-500">Darken signature</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            step={1}
                                            value={darken}
                                            onChange={(e) => setDarken(Number(e.target.value))}
                                            className="flex-1 accent-[#4A6CF7]"
                                        />
                                        <span className="w-8 text-right text-[11px] tabular-nums text-zinc-400">{darken}</span>
                                    </label>
                                </div>
                            )}
                            <p className="mt-2 text-[11px] text-zinc-400">
                                {hint ??
                                    (allowPadding
                                        ? "Drag to position, zoom with the slider or mouse wheel. Zoom out to fit the whole image (white is added around it)."
                                        : "Drag the image to position it, use the slider or mouse wheel to zoom.")}
                            </p>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    >
                        Cancel
                    </button>
                    {!loadError && (
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={!natural || isSaving}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-[#4A6CF7] text-white hover:bg-[#3B5BDB] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? "Saving…" : "Crop & use"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
