// Character limits derived from Frappe's underlying database column types.
// See data_type_character_limit.md for the full field-type reference.
export const FIELD_CHAR_LIMITS: Record<string, number> = {
  Data: 140,
  Link: 140,
  "Dynamic Link": 140,
  Select: 140,
  Attach: 140,
  "Attach Image": 140,
  Image: 140,
  Barcode: 140,
  Password: 65535,
  "Small Text": 65535,
  Text: 65535,
  // LONGTEXT — see data_type_character_limit.md
  "Text Editor": 4294967295,
};

// INT column is a 32-bit signed integer (-2,147,483,648 to 2,147,483,647);
// app-level regex already restricts input to positive digits only.
export const INT_MAX_LENGTH = 10;

// Currency column is DECIMAL(21,9) — 21 digits total plus a decimal point.
export const CURRENCY_MAX_LENGTH = 22;

// Percent is a 0–100 value (validated in the input handler); "100.00" plus
// a little headroom while typing.
export const PERCENT_MAX_LENGTH = 6;

export const getFieldMaxLength = (fieldtype: string): number | undefined =>
  FIELD_CHAR_LIMITS[fieldtype];

// Resolves the maxLength actually enforced on the input for a given field
// type, including the special-cased numeric types whose limit isn't derived
// from FIELD_CHAR_LIMITS.
export const getEffectiveMaxLength = (fieldtype: string): number | undefined => {
  if (fieldtype === "Int") return INT_MAX_LENGTH;
  if (fieldtype === "Currency") return CURRENCY_MAX_LENGTH;
  if (fieldtype === "Percent") return PERCENT_MAX_LENGTH;
  return FIELD_CHAR_LIMITS[fieldtype];
};

// Practically-reachable limits worth warning the user about — the LONGTEXT
// (~4 billion char) ceiling is never actually hit, so it's excluded.
export const getWarnableMaxLength = (fieldtype: string): number | undefined => {
  const max = getEffectiveMaxLength(fieldtype);
  return max !== undefined && max <= 65535 ? max : undefined;
};
