// Shared warning shown under a manually-typed input once it hits the
// character limit derived from the underlying Frappe column type.
// See data_type_character_limit.md / src/utils/fieldLimits.ts.
export const CharLimitAlert = ({
  value,
  maxLength,
  className = "",
}: {
  value: any;
  maxLength?: number;
  className?: string;
}) => {
  if (maxLength === undefined) return null;
  if (String(value ?? "").length < maxLength) return null;
  return (
    <p
      className={`flex items-center gap-1 text-[11px] font-semibold text-red-500 dark:text-red-400 ${className}`}
    >
      <svg className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      Character limit reached ({maxLength} max)
    </p>
  );
};

export default CharLimitAlert;
