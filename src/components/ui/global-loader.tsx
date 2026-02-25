import React, { useState, useEffect } from 'react';
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
            "fixed inset-0 z-[100] flex items-center justify-center bg-[#FAFAF9]/80 dark:bg-[#18181B]/80 backdrop-blur-sm transition-opacity duration-500",
            className
        )}>
            <div className="flex flex-col items-center gap-4 animate-pulse">
                {/* Replaced Spinner with a custom subtle one or just text if Spinner is too heavy. 
                     Assuming Spinner is adaptable or we can use a simple SVG here for maximum control. 
                     Let's use a very clean SVG spinner to ensure it matches the vibe. */}
                <svg className="animate-spin h-8 w-8 text-zinc-400 dark:text-zinc-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div className="flex flex-col items-center gap-1">
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm tracking-wide">
                        Loading...
                    </p>
                </div>
            </div>
        </div>
    );
};
