# Help Module (User Manual) — Implementation Details

**Branch:** `mythos_omni_v0.4`  
**Date:** 2026-06-01  
**Author:** okramjimmy

---

## Overview

The Help Module is a sidebar-triggered modal that provides users with on-demand access to learning resources — video tutorials, PDF guides, and interactive walkthroughs — directly within the ProRnD application.

---

## New File

### `src/components/HelpModule.tsx`

A self-contained React modal component with the following views:

| View | Description |
|---|---|
| `menu` | Landing screen with 3 category cards (Video, PDF, Interactive) |
| `video_list` | List of Scribehow video walkthroughs |
| `pdf_list` | List of Scribehow scrollable PDF guides |
| `interactive_list` | List of Scribehow click-through interactive guides |
| `scribe` | Embedded iframe for the selected guide with animated loading progress bar |

**Supported guides (initial set):**
- How to Generate an Endorsement
- How to Register a New Research Project

**UX details:**
- Backdrop click closes the modal
- Back arrow navigates to the correct list based on the iframe URL query param (`as=video`, `as=scrollable`, or default interactive)
- Body scroll is locked while the modal is open
- Loading state shows an animated spinner + progress bar while the iframe initialises
- Progress bar duration adapts based on content complexity (e.g., video guides get a longer estimated load time)
- Footer always shows support email: `proman@iitg.ac.in`
- Fully dark-mode compatible

---

## Modified File

### `src/components/RndSidebar.tsx`

**Changes:**
- Imported `HelpModule` and `HelpCircle` (Lucide icon)
- Added `isHelpOpen` state (`useState<boolean>`)
- Added **"User Manual"** `SidebarMenuButton` in the footer section (above Messages), with:
  - Active highlight when modal is open
  - Collapsed sidebar shows icon only; expanded shows icon + label
  - `tooltip="User Manual"` for collapsed state
- Rendered `<HelpModule isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />` outside the `<Sidebar>` element so it overlays the full viewport

---

## User Flow

```
User clicks "User Manual" in sidebar footer
  → HelpModule modal opens
  → User selects a category (Video / PDF / Interactive)
  → User selects a specific guide from the list
  → Iframe loads with animated progress bar
  → User reads/watches the guide
  → User clicks ✕ or backdrop to close
```

---

## Role Access

Available to **all authenticated users** (`All_ProRnd_User`) regardless of role — the button appears in the shared sidebar footer section.
