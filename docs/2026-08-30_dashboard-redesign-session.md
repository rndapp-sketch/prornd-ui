# Dashboard Changes — 2026-08-30

Scope: `src/pages/dashboards/DirectorDashboard.tsx`, `src/pages/dashboards/HeadOverview.tsx`, `src/components/HelpModule.tsx`

## KPI Cards — compact redesign
- Restored compact 3-column breakdown grid design on both Director Dashboard and Head Overview (`f068971`, `602d21f`)
- Shrunk KPI card padding, icon size, value font size on both dashboards (`f780fc2`, `cab77be`)
- Moved icon to sit beside label/value instead of stacked above it (`dd2fc6b`)
- Removed description subtext from Ongoing Projects and Intl. Collaborators cards (`1b21da7`)
- Added percentages to Ongoing/Submitted breakdown badges; built a dedicated ₹-amount grid for Fund Allocation; renamed "Active" → "Received Fund" (`5f4eaf5`)
- Fixed cramped percentage badges, gave Fund Allocation its own money-based grid (`6e5436b`)
- Converted Ongoing Projects card to the same 3-column grid design as the other cards (`62b59fc`)
- Shortened Fund Allocation label, fixed Ongoing card's badge-row alignment (`b2c0fb5`)
- Shortened Ongoing card's top badges ("Received"/"Pending") to fit on one line (`e418267`)
- Made every Research/Consultancy/Others column clickable → opens KPI modal filtered to that type (`bff2c91`)

## Header & page-spacing
- Moved report buttons to the Project Type row, then reverted back to the top header row per feedback; widened search bar (`007acdd`, `31df333`)
- Removed Director Dashboard's own top padding; reduced shared `<main>` padding app-wide to close the header gap (`1a6af04`, `6935d93`)
- Tightened spacing above/around the Project Type filter section (`c708d45`, `34f94cd`)

## Loading-state correctness
- Fixed false "0" in Ongoing Projects mini-grid → shows a loading placeholder ("…", then "Loading…") (`09396d9`, `4abad37`)
- Fixed false "0" in Submitted/Ongoing Research/Consultancy/Others breakdown → shows "Loading…" (`d0f369b`)

## Project Analytics section — layout & positioning
- Moved Financial Trends chart next to Year-Wise Project Status (`2af118d`)
- Moved the whole Project Analytics section directly below the KPI cards (`03f3187`)
- Swapped Funding Sources Pie ↔ Financial Trends card positions back (`00185b5`)
- Moved Application-wise Activity / Usage Distribution grid to sit directly above the Financial section (`f650f57`)

## Year-Wise chart card — Submitted/Ongoing panel (many iterations)
- Tightened spacing in the stat boxes and across the whole stat/breakdown section (`9df4123`, `412677c`)
- Merged Submitted/Ongoing and the Research/Consultancy/Others grid into single unified cards (`0c148e0`, `97dcee3`)
- Unified panel backgrounds, moved value onto the label row, added bracketed R/C/O breakdown (`2e64398`, `d91dc54`, `e4da9ce`)
- Rebuilt as compact horizontal icon+value cards; removed the redundant Type breakdown grid entirely (`41f0781`, `bb20a6f`, `e2121a6`)
- Re-added a proper R/C/O count column, spelled out full names instead of abbreviations (`df10acd`, `a2e6891`)
- Iterated on color scheme: type-colored → amber/emerald status colors → back to blue/violet (matching the bar chart above) → swapped label/number emphasis → final: numbers and labels both colored to match their panel (`698c819`, `5061643`, `bce918d`, `c0cca79`, `a51d9db`, `8ea12dd`)

## Chart sizing — shrunk across multiple cards
- Funding Sources pie: 240px → 200px, tighter legend (`3774cf9`)
- Usage Distribution pie: 240px → 200px (`c9ae356`)
- Department-wise Distribution pie: 240px → 200px, tighter legend, wrapper `min-h` 340px → 300px (`d13a2fa`)
- Financial Trends card: compact stat boxes (value+label same row), bar chart 220px → 170px, tighter summary list (`89daaf9`)

## Application-wise Activity card
- Shrunk header padding/icon/text size, dropped the "1-100 / 101-200 / …" volume-tier color-key legend entirely (`0a933a1`)

## Forms Processed Over Time
- Hidden behind `{false && (...)}` — chart was unclear, and the real ask ("who processed what, how long it took") needs a new backend endpoint not available in this session (`d3e4328`)

## All Projects Table
- Page size 10 → 5 rows, tighter header padding (`746c897`)

## User Manual (HelpModule.tsx)
- Enlarged the walkthrough modal: `max-w-5xl`→`max-w-7xl`, `max-h-90vh`→`95vh`, iframe min-height 500px→650px (`19c3b91`)
- Attempted to mask Scribe's own "Comment on this Scribe" button (rendered inside their cross-origin iframe) with a CSS overlay strip; reverted after it didn't align correctly (`8c374b0`, `9547fc5`)

## Known gap flagged, not yet ported
Head Overview's Financial Trends card and All Projects/Department Projects table still use the **old** sizing (page size 10, larger stat boxes, 220px bar chart) — the Director Dashboard versions above were not yet mirrored there. Audited but intentionally left for a follow-up pass.
