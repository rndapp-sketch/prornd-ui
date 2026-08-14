import React, { useState, useEffect } from "react";

interface ProjectTitleProps {
    projectId?: string;
    fallbackTitle?: string;
}

export const ProjectTitle: React.FC<ProjectTitleProps> = ({ projectId, fallbackTitle }) => {
    const [title, setTitle] = useState<string>(fallbackTitle || "-");
    const [loading, setLoading] = useState<boolean>(!fallbackTitle && !!projectId);

    useEffect(() => {
        if (!projectId) {
            // No projectId provided, just use the fallback if it's a real string
            if (fallbackTitle && fallbackTitle !== "-") {
                setTitle(fallbackTitle);
            }
            return;
        }

        const fetchTitle = async () => {
            setLoading(true);
            try {
                const safeId = projectId || "";
                console.log("Fetching title for projectId:", safeId);

                // Try fetching from Project Registration
                const res = await fetch(`/api/v2/document/Project Registration/${encodeURIComponent(safeId)}`, {
                    credentials: "include"
                });

                console.log("Fetch response status:", res.status);
                if (res.ok) {
                    const json = await res.json();
                    console.log("Fetch response JSON:", json);
                    if (json.data?.project_title) {
                        setTitle(json.data.project_title);
                        return; // Found it, stop here
                    }
                }

                // If not found above, fallbackTitle might be all we have
                if (fallbackTitle && fallbackTitle !== "-") {
                    setTitle(fallbackTitle);
                }
            } catch (err) {
                console.error("Failed to fetch project title:", err);
                if (fallbackTitle && fallbackTitle !== "-") {
                    setTitle(fallbackTitle);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTitle();
    }, [projectId, fallbackTitle]);

    if (!projectId && !fallbackTitle) return null;

    if (loading) {
        return <span className="opacity-50 text-sm italic">Fetching title...</span>;
    }

    return <span>{title}</span>;
};
