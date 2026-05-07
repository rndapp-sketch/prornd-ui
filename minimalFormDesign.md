# Minimal Form Design System

This document defines the design language for all forms, tables, and interactive elements in the ProRnD UI. Apply these rules whenever creating or editing any form page, field component, table, or button.

---

## Core Accent Color

The primary accent is `#D97757` (warm orange). Use it for:
- Input focus rings and borders
- Checked state of checkboxes and radio buttons
- Primary action buttons (solid fill)
- Secondary action buttons (tint fill)
- Add Row / dashed interactive buttons
- Section header left accent bar (at reduced opacity)
- Table grand total highlight

---

## Input Fields

```tsx
const inputClasses =
  "w-full h-10 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 " +
  "rounded-md text-[13px] text-zinc-900 dark:text-zinc-100 " +
  "placeholder:text-zinc-400 dark:placeholder:text-zinc-500 " +
  "focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] " +
  "disabled:opacity-60 disabled:bg-zinc-50 dark:disabled:bg-zinc-800/40 disabled:text-zinc-500 " +
  "read-only:bg-zinc-50 dark:read-only:bg-zinc-800/40 " +
  "transition-colors duration-150";
```

**Rules:**
- Height: always `h-10` for standard fields, `h-9` for table cell inputs
- Font size: `text-[13px]` for inputs, `text-[12px]` for table cell inputs
- Disabled / read-only: softer background (`bg-zinc-50`) and muted text (`text-zinc-500`)
- Textarea: add `h-auto py-3` and `rows={4}` or `rows={6}`

---

## Field Labels

```tsx
<label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-100">
  {label}
  {mandatory && <span className="text-red-500 ml-1 normal-case font-bold">*</span>}
</label>
```

**Rules:**
- Always `text-[11px] font-semibold uppercase tracking-wider`
- Color: `text-zinc-500 dark:text-zinc-100`
- Mandatory asterisk: `text-red-500 normal-case font-bold` (avoid all-caps `*`)
- Wrapper spacing: `space-y-1.5` between label and input

---

## Field Description

```tsx
<p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 leading-relaxed">
  {description}
</p>
```

---

## Section Headers

```tsx
<div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
  <div className="w-0.5 h-4 rounded-full bg-[#D97757]/60 shrink-0" />
  <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-100">
    {title}
  </h2>
</div>
```

**Rules:**
- Left accent bar: `w-0.5 h-4 rounded-full bg-[#D97757]/60`
- Title: `text-[11px] font-bold uppercase tracking-widest`
- Section wrapper: `space-y-5` between header and content

---

## Form Grid Layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
  {fields}
</div>
```

**Rules:**
- Gap: always `gap-x-6 gap-y-5` (not `gap-8`)
- Full-width fields (tables, HTML): `col-span-full`

---

## Checkbox Fields

```tsx
<label className={cn(
  "flex items-center gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors duration-150",
  isChecked
    ? "bg-[#D97757]/5 border-[#D97757]/40 dark:bg-[#D97757]/10 dark:border-[#D97757]/40"
    : "bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700 hover:border-[#D97757]/30",
  isReadOnly && "cursor-not-allowed opacity-60",
)}>
  <div className={cn(
    "w-4 h-4 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-all duration-150",
    isChecked ? "bg-[#D97757] border-[#D97757]" : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900",
  )}>
    {isChecked && (
      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
    <input type="checkbox" className="sr-only" checked={isChecked} onChange={...} disabled={isReadOnly} />
  </div>
  <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 select-none">
    {label}
  </span>
</label>
```

**Rules:**
- Card-style border that highlights orange when checked
- Custom `4px-rounded` box with inline SVG checkmark
- No native checkbox visible (`sr-only`)

---

## Radio Fields

```tsx
<label className={cn(
  "flex items-center gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors duration-150",
  isSelected
    ? "border-[#D97757]/50 bg-[#D97757]/5 dark:border-[#D97757]/40 dark:bg-[#D97757]/10"
    : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 hover:border-[#D97757]/30",
)}>
  <input type="radio" className="sr-only" ... />
  <div className={cn(
    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150",
    isSelected ? "border-[#D97757]" : "border-zinc-300 dark:border-zinc-600",
  )}>
    <div className={cn("w-2 h-2 rounded-full transition-all duration-150", isSelected ? "bg-[#D97757] scale-100" : "bg-transparent scale-0")} />
  </div>
  <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">{option}</span>
</label>
```

---

## Buttons

### Primary (Submit / Confirm)
```tsx
<button className="h-9 px-6 border border-[#D97757] rounded-md text-[12px] font-semibold uppercase tracking-wide bg-[#D97757] text-white hover:bg-[#c5694d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150">
  Submit
</button>
```

### Secondary (Save Draft / Soft Action)
```tsx
<button className="h-9 px-5 border border-[#D97757]/30 rounded-md text-[12px] font-semibold uppercase tracking-wide bg-[#D97757]/10 text-[#D97757] hover:bg-[#D97757]/20 hover:border-[#D97757]/50 disabled:opacity-50 transition-colors duration-150">
  Save as Draft
</button>
```

### Cancel / Neutral
```tsx
<button className="h-9 px-5 border border-zinc-200 dark:border-zinc-700 rounded-md text-[12px] font-semibold uppercase tracking-wide bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150">
  Cancel
</button>
```

### Table Row: Edit
```tsx
<button className="h-8 px-3 rounded-md text-[11px] font-semibold uppercase tracking-wide bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/30 hover:bg-[#D97757]/20 hover:border-[#D97757]/50 transition-colors">
  Edit
</button>
```

### Table Row: Done / Save
```tsx
<button className="h-8 px-3 rounded-md text-[11px] font-semibold uppercase tracking-wide bg-[#D97757] text-white border-[#D97757] hover:bg-[#c5694d] transition-colors">
  Done
</button>
```

### Table Row: Remove / Delete
```tsx
<button className="h-8 px-3 rounded-md text-[11px] font-semibold uppercase tracking-wide text-red-500 border border-zinc-200 dark:border-zinc-700 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20 transition-colors">
  Remove
</button>
```

### Add Row (full-width dashed)
```tsx
<button className="w-full py-2.5 rounded-md border border-dashed border-[#D97757]/40 text-[11px] font-bold uppercase tracking-wider text-[#D97757] hover:border-[#D97757]/70 hover:bg-[#D97757]/5 dark:hover:bg-[#D97757]/10 transition-colors duration-150">
  + Add Row
</button>
```

---

## Tables

### Table Container
```tsx
<div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
```

### Table Header Cell
```tsx
<th className="px-3 py-2.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-100 text-left uppercase tracking-widest whitespace-nowrap">
```

### Table Body Row
```tsx
<tr className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition-colors border-b border-zinc-100 dark:border-zinc-800">
```

### Table Footer (Grand Total)
```tsx
<tfoot className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-700">
  <tr>
    <td className="px-3 py-2.5 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total</td>
    {/* numeric totals */}
    <td className="px-3 py-2.5 bg-[#D97757]/10 dark:bg-[#D97757]/15 text-[13px] font-extrabold text-[#D97757]">
      {grandTotal.toFixed(2)}
    </td>
  </tr>
</tfoot>
```

### Table Empty State
```tsx
<tr>
  <td colSpan={n} className="px-4 py-8 text-center">
    <p className="text-[12px] font-medium text-zinc-400 dark:text-zinc-500">No items added yet</p>
    <p className="text-[11px] text-zinc-300 dark:text-zinc-600 mt-1">Click "+ Add Row" below to get started</p>
  </td>
</tr>
```

### Table Cell Input (compact)
```tsx
const tableInputClasses =
  "w-full h-9 px-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md " +
  "text-[12px] text-zinc-900 dark:text-zinc-100 " +
  "focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] " +
  "transition-colors duration-150";
```

---

## Child Table Cards (collapsible rows)

### Collapsed (preview card)
```tsx
<div className="px-4 py-3.5 flex items-center justify-between gap-4 bg-white dark:bg-zinc-900 border-l-2 border-l-zinc-300 dark:border-l-zinc-600">
  {/* row number avatar + field preview + Edit / Remove buttons */}
</div>
```

### Expanded (edit card)
```tsx
<div className="bg-white dark:bg-zinc-900">
  {/* header strip */}
  <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Item #N</span>
    {/* Done + Remove buttons */}
  </div>
  {/* field grid */}
  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
    {/* fields with standard label + input */}
  </div>
</div>
```

---

## Warning / Alert Banners

### Info / Required
```tsx
<div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
  <p className="text-[12px] text-amber-700 dark:text-amber-400">
    <span className="font-semibold">Field is required</span> before saving.
  </p>
</div>
```

### Error / Mismatch
```tsx
<div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
  <p className="text-[12px] text-red-600 dark:text-red-400">
    <span className="font-semibold">Mismatch:</span> description here.
  </p>
</div>
```

---

## Page Header

```tsx
<header className="mb-5 p-4 md:p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
  <div className="flex items-center gap-3">
    <button onClick={() => navigate(-1)} className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
      <ArrowLeftIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
    </button>
    <div>
      <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h1>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-100 mt-0.5 uppercase tracking-wide font-medium">{subtitle}</p>
    </div>
  </div>
</header>
```

---

## Form Action Bar

```tsx
<div className="flex items-center justify-between py-3.5 px-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
  {/* left: hint text when primary action is disabled */}
  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Save as draft first to enable Submit</p>
  {/* right: buttons */}
  <div className="flex gap-2.5">
    {/* Cancel, Save Draft, Submit */}
  </div>
</div>
```

---

## Summary of Text Sizes

| Element               | Size          |
|-----------------------|---------------|
| Page title            | `text-base`   |
| Section header        | `text-[11px]` |
| Field label           | `text-[11px]` |
| Table column header   | `text-[10px]` |
| Input / select value  | `text-[13px]` |
| Table cell value      | `text-[12px]` |
| Button text           | `text-[12px]` (full buttons) / `text-[11px]` (table row buttons) |
| Description / hint    | `text-[11px]` |
| Warning banner        | `text-[12px]` |
| Empty state primary   | `text-[12px]` |
| Empty state secondary | `text-[11px]` |
