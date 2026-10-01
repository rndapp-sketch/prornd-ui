import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { CrispOrb } from '@/components/ui/crisp-orb';

const DEFAULT_DELAY = 650;
const DEFAULT_MIN_DURATION = 4000;

interface LoaderRequest {
    delay: number;
    minDuration: number;
    className?: string;
}

/**
 * Loading requests from every <GlobalLoader /> on the page. The overlay itself is drawn
 * once by <GlobalLoaderHost /> (mounted in App), which outlives pages — so the minimum
 * display time still holds when a page swaps its loader for its content
 * (`if (loading) return <GlobalLoader isLoading />`), which unmounts the caller.
 */
const requests = new Map<symbol, LoaderRequest>();
const listeners = new Set<() => void>();
let snapshot: LoaderRequest | null = null;

const recompute = () => {
    const all = [...requests.values()];
    snapshot = all.length
        ? {
              delay: Math.min(...all.map((r) => r.delay)),
              minDuration: Math.max(...all.map((r) => r.minDuration)),
              className: all.find((r) => r.className)?.className,
          }
        : null;
    listeners.forEach((l) => l());
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
const getSnapshot = () => snapshot;

interface GlobalLoaderProps {
    isLoading: boolean;
    className?: string;
    /** Delay in ms before showing the loader. Default 650ms to prevent flash on quick loads */
    delay?: number;
    /** Once shown, the loader stays up at least this many ms, even if loading finishes sooner. Default 4000ms. */
    minDuration?: number;
}

/** Registers a loading request; renders nothing itself (see GlobalLoaderHost). */
export const GlobalLoader: React.FC<GlobalLoaderProps> = ({
    isLoading,
    className,
    delay = DEFAULT_DELAY,
    minDuration = DEFAULT_MIN_DURATION,
}) => {
    useEffect(() => {
        if (!isLoading) return;
        const id = Symbol('global-loader');
        requests.set(id, { delay, minDuration, className });
        recompute();
        return () => {
            requests.delete(id);
            recompute();
        };
    }, [isLoading, delay, minDuration, className]);

    return null;
};

/** Draws the overlay for all GlobalLoader requests. Mount once, near the app root. */
export const GlobalLoaderHost: React.FC = () => {
    const request = useSyncExternalStore(subscribe, getSnapshot);
    const isLoading = request !== null;
    const delay = request?.delay ?? DEFAULT_DELAY;
    // Remembered so the hold still applies after the last request has gone away.
    const minDurationRef = useRef(DEFAULT_MIN_DURATION);
    const classNameRef = useRef<string | undefined>(undefined);
    if (request) {
        minDurationRef.current = request.minDuration;
        classNameRef.current = request.className;
    }

    const [showLoader, setShowLoader] = useState(false);
    const shownAtRef = useRef<number | null>(null);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;

        if (isLoading) {
            // Only show loader after delay - prevents flash on quick loads
            timer = setTimeout(() => {
                shownAtRef.current = Date.now();
                setShowLoader(true);
            }, delay);
        } else if (shownAtRef.current !== null) {
            // Loading finished: keep the loader up until it has been visible for minDuration
            const remaining = minDurationRef.current - (Date.now() - shownAtRef.current);
            timer = setTimeout(() => {
                shownAtRef.current = null;
                setShowLoader(false);
            }, Math.max(remaining, 0));
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isLoading, delay]);

    if (!showLoader) return null;

    return createPortal(
        <div
            role="status"
            aria-label="Loading"
            className={cn(
                // Frosted glass: heavy blur + a light veil, so the page behind stays visible but soft.
                "fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-xl backdrop-saturate-150 transition-opacity duration-500",
                "bg-gradient-to-br from-white/50 via-white/30 to-white/45 dark:from-[#18181B]/60 dark:via-[#18181B]/40 dark:to-[#18181B]/55",
                classNameRef.current
            )}
        >
            <CrispOrb size={160} color="#4A6CF7" dotSize={1.35} dots={1.5} />
        </div>,
        document.body
    );
};
