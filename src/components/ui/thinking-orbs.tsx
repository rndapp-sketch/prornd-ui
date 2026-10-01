import { cn } from "@/lib/utils";

// Three orbs pulsing/bouncing in sequence — used in place of plain
// "Tracking…" text while the lookup is in flight.
export const ThinkingOrbs = ({
    size = "w-2 h-2",
    color = "bg-white",
    className,
}: {
    size?: string;
    color?: string;
    className?: string;
}) => (
    <span className={cn("inline-flex items-center gap-1", className)}>
        {[0, 1, 2].map((i) => (
            <span
                key={i}
                className={cn("rounded-full animate-bounce", size, color)}
                style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
            />
        ))}
    </span>
);
