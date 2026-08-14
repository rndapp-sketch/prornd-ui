import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface GlobalLoaderProps {
    isLoading: boolean;
    className?: string;
    /** Delay in ms before showing the loader. Default 500ms to prevent flash on quick loads */
    delay?: number;
}

export const GlobalLoader: React.FC<GlobalLoaderProps> = ({
    isLoading,
    className,
    delay = 650
}) => {
    const [showLoader, setShowLoader] = useState(false);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        if (isLoading) {
            // Only show loader after delay - prevents flash on quick loads
            timer = setTimeout(() => {
                setShowLoader(true);
            }, delay);
        } else {
            // Hide immediately when loading is done
            setShowLoader(false);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isLoading, delay]);

    // Don't render anything if we shouldn't show the loader
    if (!showLoader || !isLoading) return null;

    return createPortal(
        <div className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center bg-[#FAFAF9]/88 dark:bg-[#18181B]/88 backdrop-blur-md transition-opacity duration-500",
            className
        )}>
            <div className="prornd-loader-shell">
                <div className="prornd-loader-mark" aria-hidden="true">
                    <div className="prornd-loader-orbit prornd-loader-orbit-blue" />
                    <div className="prornd-loader-orbit prornd-loader-orbit-orange" />
                    <div className="prornd-loader-node prornd-loader-node-blue" />
                    <div className="prornd-loader-node prornd-loader-node-orange" />
                    <div className="prornd-loader-core">
                        <span className="prornd-loader-core-line" />
                        <span className="prornd-loader-core-line" />
                        <span className="prornd-loader-core-line" />
                    </div>
                    <div className="prornd-loader-spark prornd-loader-spark-a" />
                    <div className="prornd-loader-spark prornd-loader-spark-b" />
                    <div className="prornd-loader-spark prornd-loader-spark-c" />
                </div>

                <div className="flex flex-col items-center gap-1 font-sans">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#D97757]">
                        ProRnD
                    </p>
                    <p className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                        Preparing your workspace
                    </p>
                    <div className="mt-2 flex items-center gap-1.5" aria-label="Loading">
                        <span className="prornd-loader-dot" />
                        <span className="prornd-loader-dot" />
                        <span className="prornd-loader-dot" />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
