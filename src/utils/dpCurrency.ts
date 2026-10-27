import type { FormField } from "@/components/forms/DynamicFormRenderer";

// The form's money currency: the quoted price currency for a foreign purchase, else INR.
// Link values read like "EUR — Euro"; the ISO code is the leading token.
export const getDpCurrency = (
    doc: Record<string, any>,
    options: { value: string; label: string }[] = [],
): { code: string; symbol: string } => {
    const answer = String(doc.is_foreign ?? '').trim().toLowerCase();
    // Only an explicit "No" forces INR; a currency picked while the flag is unreadable still counts.
    const foreign = answer ? ['1', 'yes', 'true'].includes(answer) : true;
    // The field is quoted_price_currency; tolerate a differently named currency field too
    const key = 'quoted_price_currency' in doc
        ? 'quoted_price_currency'
        : Object.keys(doc).find(k => /currency/i.test(k) && typeof doc[k] === 'string');
    const picked = foreign && key ? String(doc[key] || '').trim() : '';

    // The stored value may be a code ("USD"), "USD — US Dollar", or a currency name ("US Dollar").
    const texts = [picked, options.find(o => o.value === picked)?.label || ''].filter(Boolean);
    let code = '';
    for (const t of texts) {
        const m = t.match(/(?<![A-Za-z])[A-Z]{3}(?![A-Za-z])/);
        if (m) { code = m[0]; break; }
    }
    if (!code && texts.length) {
        try {
            const names = new Intl.DisplayNames('en', { type: 'currency' });
            const supported: string[] = (Intl as any).supportedValuesOf?.('currency') || [];
            const lower = texts.map(t => t.toLowerCase());
            code = supported.find(c => lower.some(t => t.includes((names.of(c) || '').toLowerCase()) && names.of(c))) || '';
        } catch { /* leave as INR */ }
    }
    if (!code) code = 'INR';

    let symbol = code;
    try {
        symbol = new Intl.NumberFormat('en', { style: 'currency', currency: code })
            .formatToParts(0).find(p => p.type === 'currency')?.value || code;
    } catch { /* unknown code: show the ISO code itself */ }
    return { code, symbol: code === 'INR' ? '₹' : symbol };
};

// Item-table money columns whose label carries no currency of its own: "(price / item)" -> "(price / item in USD)"
export const CURRENCY_COLUMNS = ['estimatedprice', 'estimated_amount_total_price_in_rs'];
export const columnLabel = (fieldname: string, label: string | null | undefined, code: string) => {
    const l = withCurrencyLabel(label, code);
    if (!l || !CURRENCY_COLUMNS.includes(fieldname) || /\bin\s+[A-Z]{3}\b/.test(l)) return l;
    return /\)\s*$/.test(l) ? l.replace(/\)\s*$/, ` in ${code})`) : `${l} (in ${code})`;
};

// Labels hard-code "Rs." / "INR" / "₹" — show the selected currency instead
export const withCurrencyLabel = (label: string | null | undefined, code: string) =>
    label ? label.replace(/\bRs\.?|\bINR\b|₹/g, code) : label;


const INR = "INR — Indian Rupee";

/**
 * Every form raised under a Direct Purchase uses one currency: the DP's
 * `quoted_price_currency` when `is_foreign` is Yes, otherwise INR. Currency fields are
 * found by metadata (`Link` → `Currency`) so the fieldname can differ per doctype.
 * Returns the fields with those locked read-only and writes the currency into `data`.
 */
export function applyDpCurrency(
    fields: FormField[],
    data: Record<string, any>,
    dp?: Record<string, any> | null,
): FormField[] {
    if (!dp) return fields;
    const currency = getDpCurrency(dp).code === 'INR' ? INR : dp.quoted_price_currency || INR;
    const { code } = getDpCurrency(dp);
    // Money fields carry the currency in their label; child-table columns too
    const relabel = (label: string | null | undefined, fieldtype: string) => {
        const l = withCurrencyLabel(label, code);
        if (!l || fieldtype !== "Currency" || l.includes(code)) return l;
        return `${l} (${code})`;
    };
    return fields.map((orig) => {
        const f: FormField = {
            ...orig,
            label: relabel(orig.label, orig.fieldtype) ?? orig.label,
            child_fields: orig.child_fields?.map((cf) => ({
                ...cf,
                label: relabel(cf.label, cf.fieldtype) ?? cf.label,
            })),
        };
        const isCurrencyPicker =
            (f.fieldtype === "Link" && f.options === "Currency") ||
            (["Link", "Select", "Data"].includes(f.fieldtype) && /currency/i.test(f.fieldname));
        if (!isCurrencyPicker) return f;
        data[f.fieldname] = currency;
        return { ...f, read_only: 1 };
    });
}
