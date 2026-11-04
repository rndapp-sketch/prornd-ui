import React from 'react';
import { getFileUrl } from "@/utils/fileUtils";
import { cn } from '@/lib/utils';
import { PaperclipIcon } from 'lucide-react';
import { DepartmentName } from '@/components/DepartmentName';

export const UC_TYPES = ['Revised UC', 'Intermediate UC', 'Final UC', 'Audited UC'];

// --- UI COMPONENTS ---
export const GroupCard = ({
    icon: Icon, label, badge, children, className,
}: {
    icon: React.ElementType;
    label: string;
    badge: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={cn(
        "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden",
        className,
    )}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#D97757]/10 text-[#D97757] font-bold text-xs">
                {badge}
            </span>
            <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                {label}
            </h3>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

export const labelCls = "block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1";
export const inputCls = "w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]";

// File input that also shows (and keeps) an already-uploaded file
export const FileField = ({
    label, value, onChange,
}: {
    label: string;
    value: any;
    onChange: (file: File | null) => void;
}) => (
    <div className="space-y-1">
        <label className={labelCls}>{label}</label>
        {typeof value === 'string' && value && (
            <a
                href={getFileUrl(value)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mb-2 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md text-sm font-medium"
            >
                <PaperclipIcon className="w-3.5 h-3.5" />
                {decodeURIComponent(value.split('/').pop() || 'File')}
            </a>
        )}
        <input
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            className="w-full text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900"
            onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
        <p className="text-[11px] text-zinc-400">PDF, PNG or JPEG — these are included when R&amp;D prints the request.</p>
    </div>
);

const fmtDate = (v: any) =>
    v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

const InfoRow = ({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) => (
    <div className={cn("space-y-1", className)}>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 min-h-[1.5rem]">
            {value || <span className="text-zinc-400">—</span>}
        </div>
    </div>
);

/** Read-only project block of a UC Request (filled from the project by the backend). */
export const UCProjectDetails = ({ data }: { data: Record<string, any> }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <InfoRow label="Project Title" value={data.project_title} className="col-span-2 md:col-span-4" />
        <InfoRow label="Project No." value={data.project_no} />
        <InfoRow label="Principal Investigator" value={data.principal_investigator_name} />
        <InfoRow label="PI Webmail" value={data.pi_webmail} />
        <InfoRow
            label="Department / Centre"
            value={data.implementation_department ? <DepartmentName name={data.implementation_department} /> : null}
        />
        <InfoRow label="Funding Agency" value={data.funding_agency_name} />
        <InfoRow label="Research Scheme" value={data.funding_agency_scheme} />
        <InfoRow label="Sanctioned Letter No." value={data.sanctioned_letter_no} />
        <InfoRow label="Sanctioned Letter Date" value={fmtDate(data.sanctioned_letter_date)} />
        <InfoRow label="Project Start Date" value={fmtDate(data.prj_start_date)} />
        <InfoRow label="Project End Date" value={fmtDate(data.prj_end_date)} />
    </div>
);
