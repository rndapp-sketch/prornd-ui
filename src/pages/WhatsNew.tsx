import React from "react";
import { Sparkles, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { featureUpdates, type FeatureStatus } from "@/data/featureUpdates";

const STATUS_META: Record<
    FeatureStatus,
    { label: string; icon: React.ElementType; className: string }
> = {
    live: {
        label: "Live",
        icon: CheckCircle2,
        className:
            "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    },
    "in-progress": {
        label: "In Progress",
        icon: Clock,
        className:
            "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    },
    "frontend-only": {
        label: "Backend Pending",
        icon: AlertTriangle,
        className:
            "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    },
};

const formatDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

const WhatsNew: React.FC = () => {
    return (
        <div className="w-full px-4 py-8">
            <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-[#D97757]" />
                <h1 className="text-xl font-extrabold text-zinc-800 dark:text-zinc-100">
                    What's New
                </h1>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
                Recently added features and changes across the portal.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {featureUpdates.map((item) => {
                    const meta = STATUS_META[item.status];
                    const StatusIcon = meta.icon;
                    return (
                        <Card key={item.id} className="p-5 flex flex-col">
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                <div>
                                    <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                                        {formatDate(item.date)}
                                    </span>
                                    <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mt-0.5">
                                        {item.title}
                                    </h2>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn("gap-1 shrink-0", meta.className)}
                                >
                                    <StatusIcon className="h-3 w-3" />
                                    {meta.label}
                                </Badge>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {item.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-[10px]">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>

                            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-3">
                                {item.summary}
                            </p>

                            <ul className="space-y-1.5 mb-3">
                                {item.highlights.map((h, i) => (
                                    <li
                                        key={i}
                                        className="text-sm text-zinc-600 dark:text-zinc-400 flex gap-2"
                                    >
                                        <span className="text-[#D97757] mt-1">•</span>
                                        <span>{h}</span>
                                    </li>
                                ))}
                            </ul>

                            {item.note && (
                                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-3 py-2">
                                    <p className="text-xs text-amber-800 dark:text-amber-300">
                                        {item.note}
                                    </p>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default WhatsNew;
