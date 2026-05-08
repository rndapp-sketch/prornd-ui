
---

# ProRnD UI Design System

This document is the single source of truth for the application's visual language. It reflects the design tokens, component patterns, and utility classes currently implemented in the codebase (extracted from `DirectorDashboard.tsx` as the canonical reference and propagated app-wide). Apply these rules for every new component, page, or update.

---

## 1. Color Palette

The palette is built on a **zinc neutral** foundation — warm off-white backgrounds, zinc-scale borders and text — with focused accent colors for interactivity and status.

### Core Tokens

| Role | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| **Page Background** | `#FAFAF9` (zinc-50 warm) | `#18181B` (zinc-950) | Every page wrapper |
| **Card Background** | `#FFFFFF` | `#27272A` (zinc-800) | All card/panel surfaces |
| **Card Border** | `#E4E4E7` (zinc-200) | `#3F3F46` (zinc-700) | All card and section borders |
| **Text — Primary** | `#3F3F46` (zinc-700) | `#E4E4E7` (zinc-200) | Headings, values, labels |
| **Text — Secondary** | `#71717A` (zinc-500) | `#A1A1AA` (zinc-400) | Subtitles, captions, stat labels |
| **Text — Muted** | `#A1A1AA` (zinc-400) | `#71717A` (zinc-500) | Placeholder, hints, timestamps |
| **Dividers** | `#F4F4F5` (zinc-100) | `#27272A` (zinc-800) | `divide-*` and `border-b` separators |
| **Accent — Blue (Dashboards)** | `#2563EB` (blue-600) | `#3B82F6` (blue-500) | KPI icons, back button, top accent bar |
| **Accent — Indigo (Forms)** | `#4A6CF7` | `#818CF8` | Focus rings, form input borders, section accents |
| **Accent — Orange (CTA)** | `#D97757` (terracotta) | `#D97757` | CTA buttons, Download Report button |
| **Table Header Band** | `#EEF2FF` (indigo-50) | `#1E3A8A/18` | Standard table and child table headers |
| **Header Accent Bar** | `linear-gradient(to right, #4A6CF7, #2563EB, #D97757)` | Same | Project/detail/list header cards |

### Status Colors

All status badges are `rounded-full`, no border, using `bg-*-50 text-*-700` (light) and `bg-*-950/30 text-*-400` (dark).

| Status | Light | Dark |
|---|---|---|
| **Success / Approved / Ongoing** | `bg-emerald-50 text-emerald-700` | `dark:bg-emerald-950/30 dark:text-emerald-400` |
| **Pending / Review / Warning** | `bg-amber-50 text-amber-700` | `dark:bg-amber-950/30 dark:text-amber-400` |
| **Draft** | `bg-zinc-100 text-zinc-600` | `dark:bg-zinc-800 dark:text-zinc-400` |
| **Rejected / Cancelled** | `bg-red-50 text-red-700` | `dark:bg-red-950/30 dark:text-red-400` |
| **Forwarded / Endorsed** | `bg-violet-50 text-violet-700` | `dark:bg-violet-950/30 dark:text-violet-400` |
| **Submitted / In Review** | `bg-blue-50 text-blue-700` | `dark:bg-blue-950/30 dark:text-blue-400` |

### CSS Variables (`:root` / `.dark`)

```css
:root {
  --ds-page-bg:        #FAFAF9;
  --ds-card-bg:        #FFFFFF;
  --ds-border:         #E4E4E7;
  --ds-text-primary:   #3F3F46;
  --ds-text-secondary: #71717A;
  --ds-accent-blue:    #2563EB;
  --ds-accent-indigo:  #4A6CF7;
  --ds-accent-orange:  #D97757;
}
.dark {
  --ds-page-bg:        #18181B;
  --ds-card-bg:        #27272A;
  --ds-border:         #3F3F46;
  --ds-text-primary:   #E4E4E7;
  --ds-text-secondary: #A1A1AA;
}
```

---

## 2. Typography

**Font:** `Outfit` (Google Fonts) — geometric sans-serif loaded via `@import` in `index.css`.

Use `font-sans` for operational pages, project detail pages, form surfaces, tables, and tab bars. Avoid serif headings on app screens so page titles stay in ratio with `RndSidebar`, form labels, and table text.

| Element | Size | Weight | Color | Example |
|---|---|---|---|---|
| **Page / Dashboard Title** | `text-[22px]` | `font-extrabold tracking-normal` | `text-[#3F3F46]` | "Overview", "Projects" |
| **Detail Header Title** | `text-[18px]` | `font-extrabold tracking-normal` | `text-[#3F3F46]` | Project title on detail pages |
| **Card / Panel Title** | `text-[15px]` | `font-bold` | `text-[#3F3F46]` | Section headers inside cards |
| **KPI Value** | `text-[32px]` | `font-extrabold tracking-tight leading-none` | accent color | "₹12.4Cr", "47" |
| **KPI / Stat Label** | `text-[12px]` | `font-extrabold uppercase tracking-widest` | `text-[#71717A]` | "TOTAL PROJECTS", "PENDING" |
| **Field Label (Forms)** | `text-[11px]` | `font-bold uppercase tracking-widest` | `text-[#3F3F46]` | "First Name", "Department" |
| **Body Text** | `text-[13px]`–`text-sm` | `font-medium` | `text-[#3F3F46]` | Table rows, task titles |
| **Caption / Timestamp** | `text-[10px]`–`text-[11px]` | `font-medium` | `text-[#A1A1AA]` | "3h ago", "owner · modified" |
| **Section Divider Label** | `text-[12px]` | `font-bold uppercase tracking-[0.1em]` | `text-[#71717A]` | "PROJECT ANALYTICS" |

---

## 3. Layout & Cards

### Page Wrapper
```tsx
<div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] font-sans">
  <div className="px-6 md:px-8 pt-7 pb-10 max-w-[1600px] mx-auto">
    {/* content */}
  </div>
</div>
```

### Standard Card
White surface with zinc border and `rounded-2xl`. Hover lifts slightly.
```tsx
<div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
  {/* content */}
</div>
```

### Card with Panel Header
A titled section card — used for task lists, analytics panels, and form wrappers.
```tsx
<div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
  {/* Panel Header */}
  <div className="flex items-center justify-between px-[22px] py-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
    <div className="flex items-center gap-2 text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
      {/* Optional small icon badge */}
      <div className="w-7 h-7 rounded-md flex items-center justify-center bg-blue-50 dark:bg-blue-950/20 text-[#2563EB]">
        <SomeIcon className="w-3.5 h-3.5" />
      </div>
      Panel Title
    </div>
    {/* Optional action link */}
    <button className="text-[11px] text-[#2563EB] font-bold uppercase tracking-wide">View All</button>
  </div>
  {/* Body */}
  <div className="p-[18px]">
    {/* content */}
  </div>
</div>
```

### CSS Class Shorthand
Use `.panel-header` and `.panel-header-title` from `index.css` for the above pattern.

### Dark Info Card
For dark-background statistics widgets.
```tsx
<div className="bg-[#18181B] text-white rounded-2xl p-5">
  {/* content */}
</div>
```

---

## 4. KPI / Stat Cards

Extracted from `DirectorDashboard`'s `KpiCard`. Also available as `<AnalyticsCard>` in `DashboardCards.tsx`.

### Structure
```tsx
<div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-6 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all flex flex-col min-h-[160px] cursor-pointer">
  {/* Decorative background circle */}
  <div
    className="absolute bottom-0 right-0 w-[90px] h-[90px] rounded-full translate-x-5 translate-y-5 pointer-events-none"
    style={{ backgroundColor: accentColor, opacity: 0.07 }}
  />

  {/* Icon */}
  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
    style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 10%, transparent)`, color: accentColor }}>
    <SomeIcon className="w-[18px] h-[18px]" />
  </div>

  {/* Label */}
  <div className="text-[12px] font-extrabold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mb-0.5">
    STAT LABEL
  </div>

  {/* Value */}
  <div className="text-[32px] font-extrabold tracking-tight leading-none mb-2" style={{ color: accentColor }}>
    47
  </div>

  {/* Subtext or badges */}
  <div className="mt-auto pt-3">
    <div className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] font-semibold">
      Supporting detail here
    </div>
  </div>
</div>
```

### React Component (`DashboardCards.tsx`)
```tsx
import { AnalyticsCard, ActionCard, CurrentTime, SectionDivider } from "@/components/DashboardCards";

<AnalyticsCard
  title="Pending"
  value="47"
  subtitle="Awaiting your approval"
  icon={<AlertCircle className="h-4 w-4" />}
  accentColor="#D97706"
/>
```

### Left-Accent Stat Row (`.stat-card`)
Used when KPI cards are in a row inside a white panel (not standalone cards).
```tsx
<div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm stat-card stat-card-amber">
  <AnalyticsCard ... accentColor="#D97706" />
</div>
```
Available variants: `stat-card-blue`, `stat-card-green`, `stat-card-amber`, `stat-card-red`, `stat-card-purple`, `stat-card-teal`, `stat-card-indigo`.

---

## 5. Section Divider

Used between major sections on a dashboard to group related content visually. Matches `DirectorDashboard`'s `SectionDivider`.

```tsx
// React component from DashboardCards.tsx
<SectionDivider title="Project Analytics" />

// Or inline:
<div className="flex items-center gap-2.5 mb-3 mt-1">
  <span className="text-[12px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.1em] whitespace-nowrap">
    Section Title
  </span>
  <div className="flex-1 h-[1px] bg-[#E4E4E7] dark:bg-[#3F3F46]" />
</div>
```

CSS classes: `.section-divider`, `.section-divider-label`, `.section-divider-line` from `index.css`.

---

## 6. Status Badges

All status indicators are pill-shaped (`rounded-full`) with a dot indicator. No border. Matches `DirectorDashboard`'s `StatusBadge`.

```tsx
{/* Generic pattern */}
<span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 whitespace-nowrap">
  <span className="w-[5px] h-[5px] rounded-full bg-emerald-500 shrink-0" />
  Ongoing
</span>
```

Use `getStatusStyle(status)` helper (present in each dashboard/page) which returns the appropriate bg+text classes. Combine with a dot `<span>` separately or use the `.status-success` / `.status-progress` / `.status-warning` / `.status-danger` / `.status-neutral` CSS classes from `index.css`.

---

## 7. Page Header Component

Use `<PageHeader>` from `@/components/common/PageHeader`.

```tsx
<PageHeader
  title="Travel Application"
  projectNumber="PROJ-2024-001"
  projectName="Machine Learning Research"
  status="Pending Approval"
  showBack={true}
>
  {/* Optional actions in the right slot */}
  <button className="btn-primary-accent">Submit</button>
</PageHeader>
```

**Rendered structure:**
- `rounded-2xl` white card with `#E4E4E7`/`#3F3F46` border
- 3px gradient top accent bar: `from-[#2563EB] via-[#4A6CF7] to-transparent`
- Back button: zinc border, `#2563EB` arrow icon
- Status badge: `rounded-full` pill with dot indicator
- Project number: monospace `#2563EB` chip with light border

---

## 8. Form Fields

### Input Field
```tsx
const inputClasses =
  "flex h-10 w-full rounded-[0.4375rem] border-[1.5px] border-[#E4E4E7] dark:border-[#3F3F46] " +
  "bg-white dark:bg-[#27272A] px-3 py-2 text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] " +
  "placeholder:text-[#A1A1AA] dark:placeholder:text-[#71717A] " +
  "focus-visible:ring-[3px] focus-visible:ring-[#4A6CF7]/12 focus-visible:border-[#4A6CF7] " +
  "disabled:cursor-not-allowed disabled:bg-[#FAFAF9] dark:disabled:bg-[#27272A]/50 " +
  "disabled:text-[#71717A] dark:disabled:text-[#A1A1AA] transition-colors duration-150";
```

### Field Label
```tsx
<label className="block text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] dark:text-[#E4E4E7]">
  Field Name
  {mandatory && <span className="text-red-500 ml-1 normal-case font-bold">*</span>}
</label>
```

### Read-Only Field Display
```tsx
<div className="flex h-10 w-full rounded-md border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]/60 px-3 py-2 text-[13px] text-[#3F3F46] dark:text-[#E4E4E7]">
  {value || "—"}
</div>
```

### Field Description
```tsx
<p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-1 leading-relaxed">
  Helper text or description
</p>
```

### CSS Shorthand
Use `.design-input`, `.design-label`, `.frappe-label`, `.frappe-input` from `index.css` for the same spec.

---

## 9. Form Section Cards

Bordered sections that group related fields. Used in `DynamicFormRenderer` and `FormRender`.

```tsx
{/* Via CSS utility class */}
<div className="form-section-card">
  <div className="form-section-header">
    <div className="form-section-header-accent" />   {/* 3px indigo left bar */}
    <div>
      <h2 className="form-section-title">SECTION TITLE</h2>
      <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">Optional description</p>
    </div>
  </div>
  <div className="form-section-body">
    {/* fields */}
  </div>
</div>
```

**Styles (from `index.css`):**
- `.form-section-card`: white bg, `#E4E4E7` border, `rounded-2xl` (1rem)
- `.form-section-header`: `#FAFAF9` bg, `border-bottom #E4E4E7`
- `.form-section-header-accent`: 3px `#4A6CF7` left accent pill
- `.form-section-title`: `11px font-extrabold uppercase #1E3A8A` (light) / `#93C5FD` (dark)

---

## 10. Data Tables

### Standard Light-Header Table
```tsx
<div className="overflow-x-auto p-3">
  <table className="border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg overflow-hidden">
    <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
      <tr>
        <th className="px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25 last:border-r-0">
          Column
        </th>
      </tr>
    </thead>
    <tbody>
      <tr className="hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]/40 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-b-0">
        <td className="px-4 py-3 text-xs text-[#3F3F46] dark:text-[#D4D4D8] border-r border-[#F4F4F5] dark:border-[#3F3F46]/80 last:border-r-0 align-top">
          Value
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

**Header:** light indigo band, not dark black.
**Rows:** clear row and column borders; hover `#F4F4F5` light / `#3F3F46/40` dark.
**Padding:** table wrappers get `p-3`; cells get `px-4 py-3`.

### Inline Row Cards (ChildTableComponent pattern)
```tsx
<div className="border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl overflow-hidden shadow-sm">
  {/* Expanded header — light indigo */}
  <div className="flex items-center justify-between px-5 py-3 border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30 bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
    <span className="text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-widest">
      Item #1
    </span>
    {/* Header actions */}
  </div>
  {/* Collapsed row — white with blue left accent */}
  <div className="px-4 py-3.5 flex items-center justify-between gap-4 bg-white dark:bg-[#27272A] border-l-[3px] border-l-[#2563EB]">
    {/* Row summary */}
  </div>
</div>
```

Expanded child-table headers must never use a near-black background. Use the light indigo band above.

---

## 11. Buttons

### Primary — Indigo (Save / Submit)
```tsx
<button className="bg-[#4A6CF7] hover:bg-[#3558E8] text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow-md hover:shadow-[#4A6CF7]/25 transition-all">
  Save Profile
</button>
```
CSS class: `.btn-primary-accent`

### CTA — Terracotta (Download / Export)
```tsx
<button className="flex items-center gap-2 px-4 py-2 bg-[#D97757] hover:opacity-90 text-white text-[12px] font-semibold rounded-lg shadow-sm transition-all">
  <FileDown className="size-3.5" />
  Download Report
</button>
```
CSS class: `.btn-cta`

### Neutral / Cancel
```tsx
<button className="border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] text-[#3F3F46] dark:text-[#D4D4D8] hover:bg-[#FAFAF9] dark:hover:bg-[#3F3F46] font-semibold text-sm px-4 py-2 rounded-lg transition-all">
  Cancel
</button>
```
CSS class: `.btn-neutral`

---

## 12. Current Implemented Page Patterns

These patterns reflect the redesigns applied to `ProjectDetails.tsx`, `ProjectDetailsOverview.tsx`, `ProjectsView.tsx`, `ProjectRegistration.tsx`, `RndSidebar.tsx`, and shared child tables.

### Compact Detail Header
Used on project detail and project overview pages. Keep this header compact and do not duplicate project fact tiles inside it when the facts also appear in the `Overview` tab.

```tsx
<header className="mb-4 overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
  <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
  <div className="px-5 py-4">
    <div className="flex items-start justify-between flex-col xl:flex-row gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <button className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] hover:text-[#D97757] hover:border-[#D97757]/30 hover:bg-[#D97757]/10 transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">Project Overview</span>
            <ProjectStatusBadge status={status} />
          </div>
          <h1 className="font-sans text-[18px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
            Project title
          </h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
            ID: <span className="font-mono text-[#3F3F46] dark:text-[#E4E4E7]">PROJECT-ID</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">{/* compact actions/stats */}</div>
    </div>
  </div>
</header>
```

### Visible Section Separator
When a header card is followed by tabs or a main detail area, add a visible blue separator line above that section.

```tsx
<div className="border-t-2 border-[#4A6CF7]/35 pt-4 dark:border-[#818CF8]/35">
  {/* tab/detail section */}
</div>
```

### Compact Colored Tabs
Used for registration tabs, detail tabs, project overview tabs, and project type filters.

```tsx
<nav className="flex items-center gap-1 p-2 overflow-x-auto">
  <button className="flex-shrink-0 flex h-8 items-center gap-1.5 px-2.5 font-bold text-[11px] uppercase tracking-wide rounded-lg border bg-[#EEF2FF] border-[#4A6CF7] text-[#1E3A8A]">
    <FileTextIcon className="h-3.5 w-3.5 text-[#4A6CF7]" />
    Overview
  </button>
</nav>
```

Recommended color mapping:

| Tab | Active | Inactive |
|---|---|---|
| Overview / Project Details | `bg-[#EEF2FF] border-[#4A6CF7] text-[#1E3A8A]` | `border-[#C7D2FE] bg-[#EEF2FF]/55 text-[#1E3A8A]` |
| Investigators / Sanction | `bg-[#ECFDF5] border-[#10B981] text-[#065F46]` | `border-[#A7F3D0] bg-[#ECFDF5]/60 text-[#047857]` |
| Budget / Ledger | `bg-[#FFF7ED] border-[#F97316] text-[#9A3412]` | `border-[#FED7AA] bg-[#FFF7ED]/65 text-[#C2410C]` |
| Clearance | `bg-[#FDF2F8] border-[#DB2777] text-[#9D174D]` | `border-[#FBCFE8] bg-[#FDF2F8]/65 text-[#BE185D]` |
| Endorsement / Applications | `bg-[#F5F3FF] border-[#8B5CF6] text-[#5B21B6]` | `border-[#DDD6FE] bg-[#F5F3FF]/65 text-[#6D28D9]` |
| Files | `bg-[#F0FDFA] border-[#14B8A6] text-[#115E59]` | `border-[#99F6E4] bg-[#F0FDFA]/65 text-[#0F766E]` |
| Activity | `bg-[#F4F4F5] border-[#71717A] text-[#3F3F46]` | `border-[#E4E4E7] bg-white text-[#52525B]` |

### Workflow Progress
Keep workflow progress compact. Show pending age only on the in-progress stage and in the summary line. Pending days are calculated from project `creation` to the current date.

```tsx
<div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl shadow-sm px-4 py-2 w-full overflow-hidden">
  <h3 className="text-[9px] font-extrabold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.12em] mb-2">
    Workflow Progress
  </h3>
  <span className="mt-0.5 flex-shrink-0 text-[8px] font-bold text-white bg-[#D97757] px-1.5 py-[1px] rounded-full leading-none">
    8 days
  </span>
  <div className="mt-1.5 pt-1.5 border-t border-[#F4F4F5] dark:border-[#3F3F46]">
    <p className="text-[9px] text-[#71717A] dark:text-[#A1A1AA]">
      Currently pending at: <span className="font-semibold text-[#D97757]">Pending Head Approval</span>
      <span className="font-semibold text-[#D97757]"> · 8 days pending</span>
    </p>
  </div>
</div>
```

### Project Listing Page
Used by `ProjectsView.tsx`.

```tsx
<div className="w-full mx-auto space-y-5">
  <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
    <div className="flex flex-col gap-1 px-5 py-4">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">Project Registry</span>
      <h1 className="font-sans text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7]">Projects</h1>
      <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">Manage and track all your research projects.</p>
    </div>
  </div>
  <div className="flex flex-col space-y-4 border-t-2 border-[#4A6CF7]/35 pt-4 dark:border-[#818CF8]/35">
    {/* My Projects tab, project type filters, toolbar, light-header table */}
  </div>
</div>
```

### Registration Page Tabs
Used by `ProjectRegistration.tsx`. Keep the tab bar compact and color-coded; avoid oversized tab padding that makes the form header feel heavier than the sidebar.

```tsx
<div className="flex items-center gap-1.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] px-3 py-2 overflow-x-auto">
  <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-extrabold uppercase tracking-wide bg-[#EEF2FF] border-[#4A6CF7] text-[#1E3A8A]">
    <FileTextIcon className="h-3.5 w-3.5 text-[#4A6CF7]" />
    Project Details
  </button>
</div>
```

Recommended registration tab colors:

| Tab | Color |
|---|---|
| Project Details | Indigo / blue |
| PI & Collaborators | Emerald / green |
| Budget | Orange |
| Clearance | Rose / pink |

### Header And Sidebar Border Alignment
Used by `App.tsx`, `RndSidebar.tsx`, and global navbar styles. The header/sidebar joint should read as one clean boundary.

```css
.enterprise-navbar {
  z-index: 40;
  border-bottom-width: 1px;
}

.rnd-sidebar {
  z-index: 50;
}

.app-top-accent {
  height: 2px;
}
```

The sidebar must sit visually above the navbar edge, while the navbar keeps a single 1px bottom border. Do not add a second overlapping border at the sidebar/header intersection.

### Toolbar Pattern
Used for project search/sort controls.

```tsx
<div className="flex flex-col sm:flex-row gap-3 justify-between items-center rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-3 shadow-sm">
  <div className="relative w-full sm:w-72">
    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A]" />
    <Input className="h-9 pl-9 bg-[#FAFAF9] dark:bg-[#18181B] border-[#E4E4E7] dark:border-[#3F3F46] text-[13px]" />
  </div>
</div>
```

---

## 13. Dashboard Header Pattern

Matches `DirectorDashboard` header exactly.

```tsx
<div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
  <div className="flex items-center gap-3">
    {/* Icon badge */}
    <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center text-white shadow-sm border border-[#2563EB]/20">
      <BarChart3 size={20} />
    </div>
    <div>
      <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-[#3F3F46] dark:text-[#E4E4E7]">
        Dashboard Title
      </h1>
      <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-1">
        Supporting subtitle text.
      </p>
    </div>
  </div>
  <div className="flex items-center gap-2.5 flex-wrap">
    {/* Live badge */}
    <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Live Data
    </div>
    {/* Clock from DashboardCards */}
    <CurrentTime />
    {/* CTA */}
    <button className="btn-cta">
      <FileDown className="size-3.5" />
      Download Report
    </button>
  </div>
</div>
```

---

## 14. Task List Items

Used in pending-task panels across all dashboards.

```tsx
<div className="divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
  <button className="w-full px-5 py-3 hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]/50 transition-colors flex items-center gap-3 text-left group">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        {/* Status badge — rounded-full, no border */}
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          Pending
        </span>
        <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wide">
          DocType Name
        </span>
      </div>
      <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate">
        Task Title
      </p>
      <p className="text-[10px] text-[#A1A1AA] mt-0.5">
        owner@email.com · 2h ago
      </p>
    </div>
    <ChevronRight className="h-3.5 w-3.5 text-[#D4D4D8] group-hover:text-[#2563EB] flex-shrink-0 transition-colors" />
  </button>
</div>
```

---

## 15. Quick Reference — Tailwind Token Cheatsheet

| Purpose | Tailwind Classes |
|---|---|
| Page bg | `bg-[#FAFAF9] dark:bg-[#18181B]` |
| Card bg | `bg-white dark:bg-[#27272A]` |
| Card border | `border border-[#E4E4E7] dark:border-[#3F3F46]` |
| Card radius | `rounded-2xl` |
| Panel header bg | `bg-[#FAFAF9] dark:bg-[#27272A]` |
| Panel header border | `border-b border-[#E4E4E7] dark:border-[#3F3F46]` |
| Text primary | `text-[#3F3F46] dark:text-[#E4E4E7]` |
| Text secondary | `text-[#71717A] dark:text-[#A1A1AA]` |
| Text muted | `text-[#A1A1AA] dark:text-[#71717A]` |
| Row dividers | `divide-y divide-[#F4F4F5] dark:divide-[#27272A]` |
| Row hover | `hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]/50` |
| Table header bg | `bg-[#EEF2FF] dark:bg-[#1E3A8A]/18` |
| Table header text | `text-[#1E3A8A] dark:text-[#C7D2FE] text-[10px] font-extrabold uppercase tracking-wider` |
| Table cell border | `border-b border-[#E4E4E7] dark:border-[#3F3F46]` |
| Header accent bar | `h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]` |
| Visible section separator | `border-t-2 border-[#4A6CF7]/35 pt-4 dark:border-[#818CF8]/35` |
| Detail header title | `font-sans text-[18px] font-extrabold tracking-normal leading-tight` |
| Registration/detail tab | `h-8 px-2.5 text-[11px] font-bold uppercase tracking-wide rounded-lg border` |
| Input border | `border-[1.5px] border-[#E4E4E7] dark:border-[#3F3F46]` |
| Input bg | `bg-white dark:bg-[#27272A]` |
| Input text | `text-[#3F3F46] dark:text-[#E4E4E7]` |
| Input focus | `focus-visible:ring-[3px] focus-visible:ring-[#4A6CF7]/12 focus-visible:border-[#4A6CF7]` |
| Field label | `text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] dark:text-[#E4E4E7]` |
| KPI label | `text-[12px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]` |
| KPI value | `text-[32px] font-extrabold tracking-tight leading-none` |
| Status badge | `rounded-full text-[9px] font-bold uppercase tracking-wide px-2 py-0.5` |
| Accent blue | `text-[#2563EB]` / `bg-[#2563EB]` |
| Accent indigo | `text-[#4A6CF7]` / `bg-[#4A6CF7]` |
| Accent orange | `text-[#D97757]` / `bg-[#D97757]` |

---

## 16. CSS Utility Classes (`index.css`)

| Class | Purpose |
|---|---|
| `.design-card` | Standard white card (rounded-2xl, zinc border, hover lift) |
| `.kpi-card` | KPI stat card with decorative circle (full DirectorDashboard pattern) |
| `.kpi-card-label` | 12px extrabold muted uppercase label inside kpi-card |
| `.kpi-card-value` | 32px extrabold value inside kpi-card |
| `.kpi-card-icon` | 40px rounded-xl icon container |
| `.kpi-card-circle` | Absolute decorative bg circle (bottom-right) |
| `.section-divider` | Wrapper for label + horizontal line |
| `.section-divider-label` | 12px bold muted uppercase text |
| `.section-divider-line` | `flex-1 h-[1px]` zinc line |
| `.panel-header` | Card section header (bg + border-b) |
| `.panel-header-title` | 15px bold primary text with icon slot |
| `.panel-header-icon` | 28px rounded-md blue icon badge |
| `.form-section-card` | Bordered form section container |
| `.form-section-header` | Section header with accent bar |
| `.form-section-header-accent` | 3px indigo left accent pill |
| `.form-section-title` | 11px extrabold uppercase blue section title |
| `.form-section-body` | Inner padding area |
| `.design-label` / `.frappe-label` / `.field-label` | Dark bold uppercase field label |
| `.stat-label` | 12px extrabold muted stat label (dashboard use) |
| `.design-input` / `.frappe-input` | Styled form input |
| `.status-success` / `.status-progress` / `.status-warning` / `.status-danger` / `.status-neutral` | Pre-built status pill classes |
| `.stat-card` | Wrapper for left-accent bar variants |
| `.stat-card-blue` / `-green` / `-amber` / `-red` / `-purple` / `-teal` / `-indigo` | Color variants for left accent |
| `.btn-primary-accent` | Indigo primary button |
| `.btn-cta` | Terracotta CTA button |
| `.btn-neutral` | Neutral bordered button |
| `.frappe-btn` / `.frappe-btn-primary` / `.frappe-btn-ghost` | Frappe-namespaced button variants |
| `.frappe-table` | Legacy dark-header data table; prefer the light-header table pattern for new work |
| `.frappe-modal` / `.frappe-modal-header` / `.frappe-modal-body` | Modal overlay pattern |
| `.custom-scrollbar` | Thin zinc scrollbar for sidebars |

---

> **Canonical Reference:** `src/pages/dashboards/DirectorDashboard.tsx`
> **Global Styles:** `src/index.css`
> **Card Components:** `src/components/DashboardCards.tsx` (`AnalyticsCard`, `ActionCard`, `CurrentTime`, `SectionDivider`)
> **Form Components:** `src/components/forms/DynamicFormRenderer.tsx`, `src/components/FormRender.tsx`
> **Page Header:** `src/components/common/PageHeader.tsx`
