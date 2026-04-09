import React, { useState } from 'react';
import { ExternalLinkIcon } from 'lucide-react';

interface FileDownloadLinkProps {
    fileUrl: string;
    fileName?: string;
    className?: string;
    children?: React.ReactNode;
}

export const FileDownloadLink: React.FC<FileDownloadLinkProps> = ({
    fileUrl,
    fileName,
    className,
    children
}) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (isDownloading) return;

        setIsDownloading(true);
        try {
            // Create the absolute URL for the fetch request
            let urlToFetch = fileUrl;
            if (!urlToFetch.startsWith('http')) {
                let baseUrl = import.meta.env.VITE_FRAPPE_URL;
                if (!baseUrl) {
                    baseUrl = window.location.origin;
                } else if (baseUrl.startsWith('/')) {
                    baseUrl = `${window.location.origin}${baseUrl}`;
                }
                urlToFetch = `${baseUrl.replace(/\/$/, '')}/${urlToFetch.replace(/^\//, '')}`;
            }

            // Fetch the file with credentials included so Frappe recognizes the session/token
            const response = await fetch(urlToFetch, {
                method: 'GET',
                headers: {
                    'Accept': '*/*'
                },
                credentials: 'include' // Important for private files
            });

            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            // Extract filename from URL or Content-Disposition if not provided
            let finalFileName = fileName;
            if (!finalFileName) {
                const contentDisposition = response.headers.get('Content-Disposition');
                if (contentDisposition && contentDisposition.includes('filename=')) {
                    finalFileName = contentDisposition.split('filename=')[1].replace(/["']/g, '');
                } else {
                    finalFileName = fileUrl.split('/').pop() || 'downloaded_file';
                }
            }

            // Create a temporary hidden anchor to trigger download
            const tempLink = document.createElement('a');
            tempLink.href = downloadUrl;
            tempLink.download = finalFileName;
            tempLink.style.display = 'none';
            document.body.appendChild(tempLink);
            tempLink.click();

            // Cleanup
            document.body.removeChild(tempLink);
            window.URL.revokeObjectURL(downloadUrl);

        } catch (error: any) {
            console.error("Error downloading file:", error);
            alert("Failed to download file. You may not have permission to access it.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`text-sm font-medium text-[#D97757] hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${className || ''}`}
        >
            {isDownloading ? (
                <span className="flex items-center gap-1">
                    <div className="animate-spin h-3 w-3 border-2 border-[#D97757] border-t-transparent rounded-full" />
                    Downloading...
                </span>
            ) : (
                children || (
                    <><ExternalLinkIcon className="h-3 w-3" /> View/Download File</>
                )
            )}
        </button>
    );
};
