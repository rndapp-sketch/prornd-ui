import React from 'react';
import { Spinner } from './spinner';
import { cn } from '@/lib/utils';

interface GlobalLoaderProps {
    isLoading: boolean;
    className?: string;
}

export const GlobalLoader: React.FC<GlobalLoaderProps> = ({ isLoading, className }) => {
    if (!isLoading) return null;

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
