import React, { useEffect, useState } from "react";
import { FileTextIcon } from "lucide-react";
import { fetchDeclarationFields } from "@/utils/fetchDeclarationHtml";

interface DeclarationFieldsProps {
    doctype: string;
}

/**
 * Fetches HTML-type fields from a Frappe DocType's field definitions
 * and renders them. Declaration fields in Frappe are fieldtype "HTML"
 * with the content stored in `options`. Field names can vary across doctypes.
 */
export const DeclarationFields: React.FC<DeclarationFieldsProps> = ({ doctype }) => {
    // Via the whitelisted method: a direct DocField get_list 403s for every
    // role except System Manager, which left this section blank for most users.
    const [fields, setFields] = useState<Record<string, string>>({});

    useEffect(() => {
        let cancelled = false;
        fetchDeclarationFields(doctype).then((f) => {
            if (!cancelled) setFields(f);
        });
        return () => {
            cancelled = true;
        };
    }, [doctype]);

    const htmlFields = Object.entries(fields)
        .filter(([, html]) => html?.trim())
        .map(([fieldname, options]) => ({ fieldname, options }));

    if (htmlFields.length === 0) return null;

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                    <FileTextIcon className="w-4 h-4 text-[#D97757]" />
                    Declarations
                </h3>
            </div>
            <div className="p-6 space-y-4">
                {htmlFields.map((field: any, index: number) => (
                    <div
                        key={field.fieldname || index}
                        className="prose prose-sm max-w-none text-zinc-900 dark:text-zinc-100 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: field.options }}
                    />
                ))}
            </div>
        </div>
    );
};
