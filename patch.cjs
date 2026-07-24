const fs = require('fs');
const file = 'src/pages/DirectPurchase.tsx';
let content = fs.readFileSync(file, 'utf8');

const helperCode = `
// --- PRINTABLE PREVIEW HELPER ---
const renderBool = (val: any) => (
    val ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-check w-3.5 h-3.5" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>Yes
        </span>
    ) : (
        <span className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">No</span>
    )
);

const PrintableView = ({ formData, childTableData }: { formData: any, childTableData: any }) => {
    return (
<div className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden border-t-[3px] border-t-[#2563EB] mb-6" id="dp-printable-details">
    <div className="p-4 sm:p-5 min-w-0">
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[#E4E4E7] bg-gradient-to-r px-4 py-3 dark:border-[#3F3F46] sm:flex-row sm:items-center sm:justify-between from-blue-50 via-white to-white dark:from-blue-950/20 dark:via-[#27272A] dark:to-[#27272A]">
            <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB] dark:bg-blue-950/30 dark:text-blue-300">
                    <span className="[&_svg]:h-4 [&_svg]:w-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid" aria-hidden="true"><rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect></svg>
                    </span>
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB] dark:text-blue-300">Application Details</p>
                    <h3 className="mt-0.5 text-[17px] font-extrabold leading-tight text-[#3F3F46] dark:text-[#E4E4E7]">Direct Purchase Request</h3>
                    <p className="mt-1 max-w-2xl text-[12px] font-medium leading-5 text-[#71717A] dark:text-[#A1A1AA]">Key financials, applicant information, declarations, attachments, and purchase tables for this request.</p>
                </div>
            </div>
        </div>
        <div className="space-y-6 min-w-0">
            <div className="grid gap-3 grid-cols-1 max-w-xs">
                <div className="stat-card stat-card-blue rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm dark:border-[#3F3F46] dark:bg-zinc-800/50 min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">Total Estimate</p>
                    <p className="text-[17px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight break-words">₹{formData.total_estimate?.toLocaleString("en-IN") || "0"}</p>
                </div>
            </div>
            <div>
                <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#2563EB] dark:bg-blue-950/30 dark:text-blue-300">
                        <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid" aria-hidden="true"><rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect></svg>
                        </span>
                    </span>
                    <span className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#71717A] dark:text-[#A1A1AA]">Information</span>
                    <span className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#3F3F46]"></span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"><span className="truncate">Register For</span></div>
                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">{formData.register_for || "—"}</p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"><span className="truncate">Project Number</span></div>
                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">{formData.project_no || formData.project_name || "—"}</p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"><span className="truncate">Applicant Name</span></div>
                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">{formData.applicant_name || "—"}</p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"><span className="truncate">Applicant Department</span></div>
                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">{formData.applicant_department || "—"}</p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"><span className="truncate">Applicant Designation</span></div>
                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">{formData.applicant_designation || "—"}</p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"><span className="truncate">Is Foreign</span></div>
                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">{renderBool(formData.is_foreign)}</p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"><span className="truncate">Account Head</span></div>
                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">{formData.account_head || "—"}</p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"><span className="truncate">Total Estimate</span></div>
                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed"><span className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">₹{formData.total_estimate?.toLocaleString("en-IN") || "0"}</span></p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"><span className="truncate">Is Sanctioned</span></div>
                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">{renderBool(formData.is_sanctioned)}</p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"><span className="truncate">Comments If Any</span></div>
                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">{formData.comments_if_any || "—"}</p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"><span className="truncate">Dec 1</span></div>
                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">{renderBool(formData.dec_1)}</p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"><span className="truncate">Dec 2</span></div>
                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">{renderBool(formData.dec_2)}</p>
                    </div>
                </div>
            </div>
            <div>
                <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
                        </span>
                    </span>
                    <span className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#71717A] dark:text-[#A1A1AA]">Table Gdxp</span>
                    <span className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#3F3F46]"></span>
                </div>
                <div className="overflow-hidden rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
                    <table className="w-full table-fixed text-[11px]">
                        <thead>
                            <tr className="border-b border-[#E4E4E7] bg-[#EEF2FF] dark:border-[#3F3F46] dark:bg-[#1E3A8A]/20">
                                <th className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] w-9">#</th>
                                <th className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] break-words">Itemname</th>
                                <th className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] break-words">Itemdesciption</th>
                                <th className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] break-words">Justification</th>
                                <th className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] break-words">Quantity</th>
                                <th className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] break-words">Estimatedprice</th>
                                <th className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] break-words">Total Price (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(childTableData?.table_gdxp || []).map((row: any, idx: number) => (
                                <tr key={idx} className="border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-2.5 py-2 align-top text-[10px] text-[#71717A] dark:text-[#A1A1AA] font-mono">{idx + 1}</td>
                                    <td className="px-2.5 py-2 align-top text-[#3F3F46] dark:text-[#E4E4E7] break-words whitespace-normal">{row.itemname || row.item_name || "—"}</td>
                                    <td className="px-2.5 py-2 align-top text-[#3F3F46] dark:text-[#E4E4E7] break-words whitespace-normal">{row.itemdesciption || row.item_description || "—"}</td>
                                    <td className="px-2.5 py-2 align-top text-[#3F3F46] dark:text-[#E4E4E7] break-words whitespace-normal">{row.justification || "—"}</td>
                                    <td className="px-2.5 py-2 align-top text-[#3F3F46] dark:text-[#E4E4E7] break-words whitespace-normal">{row.quantity || row.item_quantity || "0"}</td>
                                    <td className="px-2.5 py-2 align-top text-[#3F3F46] dark:text-[#E4E4E7] break-words whitespace-normal"><span className="font-medium">₹{row.estimatedprice?.toLocaleString("en-IN") || row.item_unit_price?.toLocaleString("en-IN") || "0"}</span></td>
                                    <td className="px-2.5 py-2 align-top text-[#3F3F46] dark:text-[#E4E4E7] break-words whitespace-normal"><span className="font-medium">₹{row.estimated_amount_total_price_in_rs?.toLocaleString("en-IN") || row.dp_total_price?.toLocaleString("en-IN") || "0"}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
    );
};
`;

content = content.replace(
    '// =============================================================================\n// MAIN COMPONENT\n// =============================================================================',
    helperCode + '\n// =============================================================================\n// MAIN COMPONENT\n// ============================================================================='
);

content = content.replace(
    '<PageHeader\n                    title="Direct Purchase Application"\n                    projectName={projectName}\n                />',
    '<PageHeader\n                    title="Direct Purchase Application"\n                    projectName={projectName}\n                />\n                <PrintableView formData={effectiveFormData} childTableData={childTableData} />'
);

fs.writeFileSync(file, content);
