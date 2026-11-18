import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** "YYYY-MM-DD" -> "DD/MM/YYYY" ('' if not a valid ISO date). */
const isoToDmy = (iso?: string | null): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

/** "DD/MM/YYYY" -> "YYYY-MM-DD" ('' if incomplete or not a real calendar date). */
const dmyToIso = (dmy: string): string => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy);
  if (!m) return "";
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
};

interface DateInputDMYProps {
  /** ISO date, YYYY-MM-DD (what Frappe stores). */
  value?: string | null;
  /** Called with an ISO date, or '' when cleared. */
  onChange: (iso: string) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
}

/**
 * Date field that always displays dd/mm/yyyy regardless of browser/OS locale
 * (a native <input type="date"> follows the OS locale and can't be overridden).
 * Type the date, or use the calendar button.
 */
export function DateInputDMY({ value, onChange, className, disabled, required, id, name }: DateInputDMYProps) {
  const [text, setText] = useState(isoToDmy(value));
  const pickerRef = useRef<HTMLInputElement>(null);

  // Keep the text in sync when the value changes from outside (calendar, load, reset).
  useEffect(() => {
    setText((prev) => (dmyToIso(prev) === (value || "") ? prev : isoToDmy(value)));
  }, [value]);

  const handleType = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let out = digits;
    if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setText(out);
    if (out === "") onChange("");
    else {
      const iso = dmyToIso(out);
      if (iso) onChange(iso);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        maxLength={10}
        autoComplete="off"
        className={cn(className, "pr-10")}
        value={text}
        disabled={disabled}
        required={required}
        onChange={(e) => handleType(e.target.value)}
        onBlur={() => setText(isoToDmy(value))}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-label="Open calendar"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 disabled:opacity-40"
        onClick={() => pickerRef.current?.showPicker?.()}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
        </svg>
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute right-2 bottom-0 h-0 w-0 opacity-0 pointer-events-none"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
