import React, { useState, useEffect } from 'react';
import { Spinner } from './spinner';
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
    delay = 1000 // Only show loader if loading takes longer than 500ms
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

    return (
        <div className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm transition-opacity duration-300",
            className
        )}>
            <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)] flex flex-col items-center gap-4">
                <Spinner size={40} />
                <p className="font-bold text-black font-mono">Loading...</p>
            </div>
        </div>
    );
};
