import React, { useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, X, ChevronRight, ChevronDown, Users, FileText, Stamp, ShoppingCart, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionProps {
    title: string;
    icon: React.ReactNode;
    accent: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

const Section = ({ title, icon, accent, children, defaultOpen = false }: SectionProps) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={cn("rounded-xl border overflow-hidden", accent === "orange" && "border-orange-200 dark:border-orange-800/40", accent === "blue" && "border-blue-200 dark:border-blue-800/40", accent === "emerald" && "border-emerald-200 dark:border-emerald-800/40", accent === "violet" && "border-violet-200 dark:border-violet-800/40", accent === "amber" && "border-amber-200 dark:border-amber-800/40")}>
            <button
                onClick={() => setOpen(o => !o)}
                className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    accent === "orange" && "bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30",
                    accent === "blue" && "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30",
                    accent === "emerald" && "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
                    accent === "violet" && "bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30",
                    accent === "amber" && "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30",
                )}
            >
                <span className={cn("flex-shrink-0", accent === "orange" && "text-orange-600 dark:text-orange-400", accent === "blue" && "text-blue-600 dark:text-blue-400", accent === "emerald" && "text-emerald-600 dark:text-emerald-400", accent === "violet" && "text-violet-600 dark:text-violet-400", accent === "amber" && "text-amber-600 dark:text-amber-400")}>
                    {icon}
                </span>
                <span className="flex-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{title}</span>
                {open ? <ChevronDown className="h-4 w-4 text-zinc-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-zinc-400 flex-shrink-0" />}
            </button>
            {open && (
                <div className="px-4 py-3 bg-white dark:bg-zinc-900 space-y-2">
                    {children}
                </div>
            )}
        </div>
    );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const Step = ({ num, text }: { num: number; text: string }) => (
    <div className="flex items-start gap-2.5">
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#D97757] text-white text-[10px] font-extrabold flex items-center justify-center mt-0.5">{num}</span>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-snug">{text}</p>
    </div>
);

const Tip = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
        <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">{children}</p>
    </div>
);

const Rule = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">{children}</p>
    </div>
);

const Good = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start gap-2">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">{children}</p>
    </div>
);

const RoleChip = ({ label, color }: { label: string; color: string }) => (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide", color)}>{label}</span>
);

// ─── Main Guide Panel ─────────────────────────────────────────────────────────

const DirectPurchaseGuidePanel = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className="flex flex-col h-full bg-[#FAFAF9] dark:bg-[#18181B]">

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-[#D97757] flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Direct Purchase Guide</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Step-by-step for purchases up to ₹2.5 Lakh</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

                {/* Top notices */}
                <div className="space-y-2">
                    <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3">
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                            <p className="text-xs font-bold text-red-700 dark:text-red-400">Purchase Committee Required Above ₹2,00,000</p>
                            <p className="text-xs text-red-600 dark:text-red-300 leading-snug">If the total exceeds ₹2,00,000, a Purchase Committee section will appear. You must add at least 3 permanent faculty members as committee members before you can submit.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-xl px-4 py-3">
                        <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                            <p className="text-xs font-bold text-orange-700 dark:text-orange-400">Director Approval Required Above ₹3,00,000</p>
                            <p className="text-xs text-orange-600 dark:text-orange-300 leading-snug">If you selected Consumable or Contingency as the budget head and the total exceeds ₹3,00,000, the Dean will escalate the approval to the Director before it can be finalized.</p>
                        </div>
                    </div>
                </div>

                {/* Who Is This For */}
                <Section title="Who can raise a Direct Purchase?" icon={<Users className="h-4 w-4" />} accent="blue" defaultOpen>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Your role decides your approval path:</p>
                    <div className="space-y-2.5">
                        <div className="flex items-start gap-2">
                            <RoleChip label="Project Staff" color="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" />
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">→ Goes to your PI first, then through the full chain.</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <RoleChip label="PI / Faculty" color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" />
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">→ Goes directly to R&D Staff for processing.</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <RoleChip label="NPDF / IR" color="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" />
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">→ Goes to your Mentor first, then R&D Staff.</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <RoleChip label="Inspired Faculty" color="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" />
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">→ Goes to your Head (HoD/HoC) first, then R&D Staff.</span>
                        </div>
                    </div>
                </Section>

                {/* Step 1 — Fill the Form */}
                <Section title="Step 1 — Fill the Purchase Form" icon={<FileText className="h-4 w-4" />} accent="orange" defaultOpen>
                    <div className="space-y-2">
                        <Step num={1} text="Select the project you are purchasing for." />
                        <Step num={2} text="Choose the budget head (Equipment, Consumable, Contingency, etc.)." />
                        <Step num={3} text="Add each item you want to purchase in the Items table — enter the name, description, quantity, and estimated rate. The row total and grand total are calculated automatically." />
                        <Step num={4} text='If you are purchasing on behalf of someone else, set "Register For" to "Other" and select their name.' />
                        <Step num={5} text="Upload the detailed specification document (PDF) if required." />
                        <Step num={6} text="Tick both declaration checkboxes at the bottom, then click Submit." />
                    </div>
                    <div className="mt-3 space-y-1.5">
                        <Rule>If the total exceeds ₹2,00,000, a Purchase Committee section will appear. You must add at least 3 permanent faculty members as committee members before you can submit.</Rule>
                        <Tip>The system will alert you if any mandatory field is missing before submission.</Tip>
                    </div>
                </Section>

                {/* Step 2 — Approval Journey */}
                <Section title="Step 2 — Approval Journey" icon={<ChevronRight className="h-4 w-4" />} accent="violet">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">After you submit, the form travels through a chain of approvers. Each person forwards it to the next stage.</p>
                    <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                            <span className="w-2 h-2 rounded-full bg-[#D97757] flex-shrink-0" />
                            PI (if raised by Project Staff)
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                            <span className="w-2 h-2 rounded-full bg-[#D97757] flex-shrink-0" />
                            R&D Staff
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                            <span className="w-2 h-2 rounded-full bg-[#D97757] flex-shrink-0" />
                            Head of Section, R&D (HoS)
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                            <span className="w-2 h-2 rounded-full bg-[#D97757] flex-shrink-0" />
                            Dean, R&D
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                            <span className="w-2 h-2 rounded-full bg-zinc-400 flex-shrink-0" />
                            Director (only in special cases — see below)
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Rule>If you selected Consumable or Contingency as the budget head AND the total exceeds ₹3,00,000, the Dean will escalate approval to the Director.</Rule>
                        <Good>For all other budget heads (Equipment, Travel, etc.), the Dean approves directly — no Director step needed.</Good>
                        <Tip>You can track exactly which stage your form is in by viewing the workflow timeline at the top of this page.</Tip>
                    </div>
                </Section>

                {/* Step 3 — P-11 Form */}
                <Section title="Step 3 — P-11 Form (After Approval)" icon={<Stamp className="h-4 w-4" />} accent="emerald">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Once the Direct Purchase is fully <span className="font-bold text-emerald-600 dark:text-emerald-400">Approved</span>, the next steps happen in the P-11 Form tab.</p>
                    <div className="space-y-2">
                        <Step num={1} text='The PI clicks "Generate P-11 Form" — this automatically creates the P-11 document from the approved item list.' />
                        <Step num={2} text='Go to the "P-11 Form" tab on this page to see the generated form.' />
                        <Step num={3} text="R&D Staff physically verifies the P-11 hardcopy and clicks Verify Hardcopy in the P-11 tab." />
                        <Step num={4} text='After hardcopy verification, R&D Staff clicks "Generate Sanction Sheet" to move to the next stage.' />
                    </div>
                    <div className="mt-3">
                        <Tip>All item details (names, quantities, rates) are automatically copied from your original purchase form into the P-11. No re-entry needed.</Tip>
                    </div>
                </Section>

                {/* Step 4 — Sanction Sheet */}
                <Section title="Step 4 — Sanction Sheet" icon={<FileText className="h-4 w-4" />} accent="amber">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">The Sanction Sheet is the official financial authorization document. You can view and act on it in the <span className="font-bold">Sanction Sheet</span> tab.</p>
                    <div className="space-y-2">
                        <Step num={1} text="R&D Staff reviews the Sanction Sheet and may add Other Charges (handling, freight, etc.) if applicable." />
                        <Step num={2} text='The PI (Permanent Employee) prints the Sanction Sheet and then clicks "Mark Print Taken" in the system to confirm.' />
                        <Step num={3} text='R&D Staff physically verifies the printed and signed sanction sheet, then clicks "Verify Sanction Sheet".' />
                    </div>
                    <div className="mt-3">
                        <Rule>The Sanction Sheet must be physically printed, signed, and verified before a Purchase Order can be generated.</Rule>
                    </div>
                </Section>

                {/* Step 5 — Purchase Order */}
                <Section title="Step 5 — Purchase Order (PO)" icon={<ShoppingCart className="h-4 w-4" />} accent="blue">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">The final step. Once the Sanction Sheet is verified, you can generate the official Purchase Order in the <span className="font-bold">Purchase Order</span> tab.</p>
                    <div className="space-y-2">
                        <Step num={1} text='R&D Staff clicks "Generate PO" — the system calculates the final authorized amount automatically.' />
                        <Step num={2} text="The PO is pre-filled with vendor details, item list, rates, packing, and freight charges." />
                        <Step num={3} text="R&D Staff fills in the vendor address, PO date, quotation reference, and signatory details, then saves." />
                        <Step num={4} text="The PO document is printed and sent to the vendor. The signed copy is then uploaded back to the system." />
                    </div>
                    <div className="mt-3 space-y-1.5">
                        <Good>Once the PO is generated, the Direct Purchase is marked as complete (submitted). No further edits are possible.</Good>
                        <Tip>The PO total is calculated as: Basic Value + Packing & Forwarding + Freight. Other charges added during the Sanction Sheet stage are excluded from the vendor PO.</Tip>
                    </div>
                </Section>

                {/* Quick Reference */}
                <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Quick Reference</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-700 p-2.5 text-center">
                            <p className="text-[10px] text-zinc-400 mb-0.5">Committee Needed</p>
                            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Above ₹2 Lakh</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-700 p-2.5 text-center">
                            <p className="text-[10px] text-zinc-400 mb-0.5">Director Approval</p>
                            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Consumable / Cont. &gt; ₹3L</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-700 p-2.5 text-center">
                            <p className="text-[10px] text-zinc-400 mb-0.5">Max Purchase Limit</p>
                            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">₹2.5 Lakh</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-700 p-2.5 text-center">
                            <p className="text-[10px] text-zinc-400 mb-0.5">Stages</p>
                            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Form → P11 → SS → PO</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

// ─── Floating Button ──────────────────────────────────────────────────────────

const DirectPurchaseHelpGuide = () => {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Floating trigger button */}
            <button
                onClick={() => setOpen(true)}
                className={cn(
                    "fixed bottom-20 right-5 z-40 h-10 px-4 rounded-full shadow-lg flex items-center gap-2 transition-all duration-200",
                    "bg-white dark:bg-zinc-800 border-2 border-[#D97757]/40 text-[#D97757]",
                    "hover:bg-[#D97757] hover:text-white hover:border-[#D97757] hover:scale-105",
                )}
            >
                <HelpCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-bold tracking-wide">Help Guide</span>
            </button>

            {/* Overlay + slide-in panel */}
            {open && createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
                        onClick={() => setOpen(false)}
                    />

                    {/* Panel */}
                    <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                        <DirectPurchaseGuidePanel onClose={() => setOpen(false)} />
                    </div>
                </>,
                document.body,
            )}
        </>
    );
};

export default DirectPurchaseHelpGuide;
