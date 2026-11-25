import { Info, Lock } from "lucide-react";

/**
 * Shown on application forms raised by project staff. The project number and account
 * head are not theirs to choose: they stay disabled here, and the PI fills them in when
 * the application reaches them through the workflow.
 */
export function ProjectStaffPiNotice({ piEmail }: { piEmail?: string }) {
    const lockedFields = ["Project Number", "Account Head"];
    return (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <p className="text-[13px] leading-relaxed text-blue-900 dark:text-blue-200">
                    You are applying as project staff. Your PI
                    {piEmail ? <> (<span className="font-semibold">{piEmail}</span>)</> : " (enter their webmail ID below)"}
                    {" "}will select the project and account head when this application reaches them, and forward it further.
                </p>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {lockedFields.map((label) => (
                    <label key={label} className="block">
                        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
                        <div className="relative">
                            <input
                                disabled
                                value=""
                                placeholder="To be selected by PI"
                                className="h-9 w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100 px-3 pr-8 text-sm text-zinc-500 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/60"
                            />
                            <Lock className="pointer-events-none absolute right-2.5 top-2.5 size-4 text-zinc-400" />
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
}
