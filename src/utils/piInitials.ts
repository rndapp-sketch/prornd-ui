/**
 * PI initials: exactly 4 characters, A-Z (only the last may be a digit, used to
 * resolve a duplicate).
 *
 * Candidates, in order (repeats are skipped):
 *   0. first 2 of first name + first 2 of last name (HIGU); one name only -> first 4 letters
 *   1. first letter of first name + first 3 of last name (HGUP)
 *   2. first letter of first + first of middle + first 2 of last (HIMA ... only when a middle name is given)
 *   3. first 3 of the base value + a digit 1-9 (HIG1 ... HIG9)
 * The middle name is never used for the base value, only to resolve duplicates.
 * Returns null when exhausted so the user can type one.
 */
export function piInitials(first: string, last = "", attempt = 0, middle = ""): string | null {
  const clean = (s: string) =>
    s.replace(/^\s*(dr|prof|mrs|mr|ms)\b\.?/i, "").toUpperCase().replace(/[^A-Z]/g, "");
  const f = clean(first);
  // Only the last word of the last-name field counts, so "Kumar Maurya" -> MAURYA.
  const l = clean(last.trim().split(/\s+/).pop() || "");
  const m = clean(middle);
  const pad = (s: string) => s.slice(0, 4).padEnd(4, "X");
  const base = f.length >= 2 && l.length >= 2 ? f.slice(0, 2) + l.slice(0, 2) : pad(f + l);

  const list: string[] = [base];
  const add = (v: string | null) => { if (v && !list.includes(v)) list.push(v); };
  add(f && l.length >= 3 ? f[0] + l.slice(0, 3) : null);
  add(f && m && l.length >= 2 ? f[0] + m[0] + l.slice(0, 2) : null);
  for (let n = 1; n <= 9; n++) add(base.slice(0, 3) + n);
  return list[attempt] ?? null;
}

export const PI_INITIALS_RE = /^[A-Z]{3}[A-Z0-9]$/;
