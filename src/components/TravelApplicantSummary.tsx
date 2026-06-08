import React from 'react';
import { DepartmentName } from '@/components/DepartmentName';
import { cn } from '@/lib/utils';

interface TravelApplicantSummaryProps {
    webmail?: string;
    fullName?: string;
    department?: string;
    designation?: string;
    projectNo?: string;
    className?: string;
}

const InfoRow = ({ label, value, isDept }: { label: string; value: string; isDept?: boolean }) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 min-h-[1.5rem]">
            {isDept && value ? <DepartmentName name={value} /> : (value || <span className="text-zinc-400">-</span>)}
        </p>
    </div>
);

const TravelApplicantSummary: React.FC<TravelApplicantSummaryProps> = ({
    webmail = '',
    fullName = '',
    department = '',
    designation = '',
    projectNo = '',
    className,
}) => {
    if (!webmail && !fullName && !department && !designation && !projectNo) {
        return null;
    }

    return (
        <div className={cn(
            'grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700',
            className,
        )}>
            <InfoRow label="Webmail" value={webmail} />
            <InfoRow label="Full Name" value={fullName} />
            <InfoRow label="Department" value={department} isDept />
            <InfoRow label="Designation" value={designation} />
            <InfoRow label="Project No." value={projectNo} />
        </div>
    );
};

export default TravelApplicantSummary;
