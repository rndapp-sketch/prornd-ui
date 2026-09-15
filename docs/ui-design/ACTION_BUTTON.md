# Action Button Dropdown — Implementation Guide

## Overview

Every detail page in ProRnD has an **Actions** dropdown button in the `PageHeader`. It fetches available workflow transitions for the current user and document state from the Frappe backend, then executes them through a confirmation modal with an optional comment.

---

## Architecture

```
PageHeader (actions slot)
└── <XxxActionButtons docname={id} onActionComplete={handleRefresh} onPrint={…} />
      ├── useFrappeGetCall → xxxAPI.getWorkflowActions   (fetches available actions)
      ├── useFrappePostCall → xxxAPI.performAction        (executes selected action)
      ├── Dropdown (portal, renders in document.body)
      │     ├── Print / PDF              → grey  (top, shown when onPrint passed)
      │     ├── ── divider ──
      │     ├── Forward/Approve actions  → orange
      │     ├── Neutral actions          → grey
      │     └── Reject actions           → red
      └── CommentModal (confirmation + optional comment)
```

---

## Files Involved

| File | Role |
|---|---|
| `src/components/XxxActionButtons.tsx` | Self-contained dropdown component per doctype |
| `src/services/apiService.ts` | `getWorkflowActions` and `performAction` endpoint strings |
| `src/pages/application/XxxDetails.tsx` | Renders the component inside `<PageHeader>` |

---

## How It Works

### 1. Fetch Available Actions

```tsx
const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
  xxxAPI.getWorkflowActions,
  { docname },
);
```

The backend returns a list of action strings the current user can perform (e.g. `["Forward to HoS", "Reject"]`). The component **returns `null`** if the list is empty — so the button disappears when no actions are available.

### 2. Dropdown Toggle with Portal

The dropdown renders via `createPortal(…, document.body)` to escape any `overflow: hidden` parent containers. Position is calculated from the toggle button's `getBoundingClientRect()` at open time.

```tsx
const handleToggleDropdown = () => {
  if (!dropdownOpen && toggleBtnRef.current) {
    const rect = toggleBtnRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right,
    });
  }
  setDropdownOpen((o) => !o);
};
```

Click-outside is handled by a `mousedown` listener on `document`.

### 3. Action Categorisation

Actions are colour-coded automatically based on their name:

```tsx
const categorise = (action: string) => {
  const a = action.toLowerCase();
  if (a.includes("forward") || a.includes("approve")) return "forward"; // orange
  if (a.includes("reject"))                            return "reject";  // red
  return "neutral";                                                       // grey
};
```

Groups render in order: forward → neutral → reject, separated by dividers.

### 4. Confirmation Modal

Clicking an action opens `CommentModal`, which:
- Shows the action name
- Has an optional comment textarea
- On confirm: calls `performAction({ docname, action, comment })` then triggers `onActionComplete()`

### 5. Print / PDF (optional)

Pass an `onPrint` callback to add a **Print / PDF** item at the top of the dropdown (above workflow actions, separated by a divider). The item is only rendered when the prop is provided. This removes the need for a separate Print button in the PageHeader.

```tsx
<XxxActionButtons
  docname={id}
  onActionComplete={handleRefresh}
  onPrint={() => setIsPrintModalOpen(true)}
/>
```

The component opens your page's `P11PrintModal` via the callback — the modal itself stays in the page, the dropdown just triggers it.

### 6. Commit Gate (optional)

Some doctypes (Honorarium, Consultancy, Temporary Advance) require a financial commitment to be staged before forwarding. Pass `commitRequired={true}` to disable forward actions and show an amber warning inside the dropdown.

```tsx
<XxxActionButtons
  docname={id}
  onActionComplete={handleRefresh}
  onPrint={() => setIsPrintModalOpen(true)}
  commitRequired={
    isRnDStaff &&
    formData.workflow_state === "Pending Staff Approval" &&
    isCommittedForGate === false
  }
/>
```

---

## API Service Endpoints

Each doctype has two entries in `src/services/apiService.ts`:

```ts
export const myDoctypeAPI = {
  // ...
  getWorkflowActions: `${API_BASE}.my_doctype.my_doctype.get_my_doctype_workflow_actions`,
  performAction:      `${API_BASE}.my_doctype.my_doctype.perform_my_doctype_action`,
};
```

The backend methods must accept `{ docname }` for GET and `{ docname, action, comment }` for POST.

---

## Adding Action Buttons to a New Page

### Step 1 — Add API entries

In `src/services/apiService.ts`:

```ts
export const newDoctypeAPI = {
  getFields:          `${API_BASE}.new_doctype.new_doctype.get_new_doctype_fields`,
  save:               `${API_BASE}.new_doctype.new_doctype.save_new_doctype`,
  submit:             `${API_BASE}.new_doctype.new_doctype.submit_new_doctype`,
  getWorkflowActions: `${API_BASE}.new_doctype.new_doctype.get_new_doctype_workflow_actions`,
  performAction:      `${API_BASE}.new_doctype.new_doctype.perform_new_doctype_action`,
};
```

### Step 2 — Create the ActionButtons component

Copy `src/components/DisbursalOfHonorariumActionButtons.tsx` and replace:
- The import: `disbursalOfHonorariumAPI` → `newDoctypeAPI`
- The props interface name
- The component name

```tsx
// src/components/NewDoctypeActionButtons.tsx
import { newDoctypeAPI } from "@/services/apiService";
import { ChevronDown, CheckCircle, XCircle, ChevronRight, Printer } from "lucide-react";

interface Props {
  docname: string;
  onActionComplete: () => void;
  commitRequired?: boolean;
  onPrint?: () => void;   // optional — include if the page has a print modal
}

const NewDoctypeActionButtons = ({
  docname,
  onActionComplete,
  commitRequired = false,
  onPrint,
}: Props) => {
  const { data } = useFrappeGetCall<{ message: string[] }>(
    newDoctypeAPI.getWorkflowActions, { docname }
  );
  const { call: performAction, loading: actionLoading } = useFrappePostCall(
    newDoctypeAPI.performAction
  );
  // ... rest is identical to DisbursalOfHonorariumActionButtons
};
```

### Step 3 — Place inside PageHeader

In the detail page, inside the `<PageHeader>` actions slot:

```tsx
import NewDoctypeActionButtons from "@/components/NewDoctypeActionButtons";

<PageHeader title={...} status={...}>
  <div className="flex items-center gap-2">

    {/* Print button */}
    {id && <button onClick={() => setIsPrintModalOpen(true)}>Print / PDF</button>}

    {/* Edit + Submit — Draft only */}
    {(formData.workflow_state === "Draft" || !formData.workflow_state) && id && (
      <>
        <button onClick={() => navigate(`/new-doctype-form/${id}`)}>Edit</button>
        <button onClick={handleSubmit}>Submit</button>
      </>
    )}

    {/* Actions dropdown — always shown when id exists */}
    {id && (
      <NewDoctypeActionButtons
        docname={id}
        onActionComplete={handleRefresh}
        onPrint={() => setIsPrintModalOpen(true)}   // optional
        commitRequired={false}                       // set condition if needed
      />
    )}

  </div>
</PageHeader>
```

---

## Existing Implementations

| Component | Doctype | Commit Gate |
|---|---|---|
| `DisbursalOfHonorariumActionButtons` | Disbursal of Honorarium | Yes |
| `DisbursalOfConsultancyActionButtons` | Disbursal of Consultancy | Yes |
| `TemporaryAdvanceActionButtons` | Temporary Advance | Yes |
| `TravelActionButtons` | Travel | No |
| `TADASettlementActionButtons` | TA DA Settlement | No |
| `LoanRequestActionButtons` | Loan Request | No |
| `LeaveModuleActionButtons` | Leave | No |

---

## Checklist for a New Doctype

- [ ] Backend: `get_<doctype>_workflow_actions(docname)` method exists
- [ ] Backend: `perform_<doctype>_action(docname, action, comment)` method exists
- [ ] `src/services/apiService.ts`: `getWorkflowActions` and `performAction` entries added
- [ ] `src/components/<Doctype>ActionButtons.tsx`: component created
- [ ] `src/pages/application/<Doctype>Details.tsx`: component imported and placed in `<PageHeader>`
- [ ] Component always rendered when `id` exists (returns `null` internally when no actions available)
- [ ] `onPrint={() => setIsPrintModalOpen(true)}` passed if the page has a print modal
- [ ] Separate Print button removed from PageHeader (now lives inside the dropdown)
- [ ] `commitRequired` wired up if the doctype uses the commitment staging flow
