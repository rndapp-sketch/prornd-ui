# DP PO Frontend Integration Guide

**Date:** 2026-06-19  
**Backend doctype:** `dp_po` (+ child `dp_po_item`)  
**Frontend project:** `/home/prornd/Projects/mythos_omni_v0.4/prornd-ui`

---

## Overview

Currently the PO tab in `DirectPurchaseDetails.tsx` renders `<POEditor>` with live
sanction sheet data but **nothing is ever persisted**. After this integration:

1. When the PO tab loads, the backend is queried for an existing `dp_po` linked
   to the current Direct Purchase.
2. If no `dp_po` exists yet, one is auto-created from the Sanction Sheet
   (`generate_dp_po_from_sanction_sheet`).
3. The saved `dp_po` fields pre-fill the editable inputs in `POEditor`.
4. Clicking **Save** persists edits back to `dp_po` via `save_dp_po_data`.
5. The `dp_po` docname is stored in component state so updates go to the same doc.

---

## Files to change

| File | Change |
|------|--------|
| `src/services/apiService.ts` | Add `dpPoAPI` export |
| `src/pages/application/DirectPurchaseDetails.tsx` | Fetch/create `dp_po`, pass data + save handler to `POEditor` |

`POEditor.tsx` itself needs **no change** — it already supports an `onSave` prop
and reads all fields from `ssData` (we pass the merged dp_po data through `ssData`).

---

## Step 1 — `src/services/apiService.ts`

Add after the `directPurchaseAPI` block (around line 90):

```typescript
// Direct Purchase PO (dp_po) API endpoints — Stage 4
export const dpPoAPI = {
    getByDirectPurchase: `${API_BASE}.dp_po.dp_po.get_dp_po_by_direct_purchase`,
    generateFromSS:      `${API_BASE}.dp_po.dp_po.generate_dp_po_from_sanction_sheet`,
    save:                `${API_BASE}.dp_po.dp_po.save_dp_po_data`,
};
```

---

## Step 2 — `src/pages/application/DirectPurchaseDetails.tsx`

### 2a. Import `dpPoAPI`

Find the existing import line (around line 47):
```typescript
import { directPurchaseAPI } from '@/services/apiService';
```
Add `dpPoAPI` to the same import (or as a separate import):
```typescript
import { directPurchaseAPI, dpPoAPI } from '@/services/apiService';
```

### 2b. Add state for the dp_po docname

After the existing `poSanctionData` state (around line 2507):
```typescript
const [poSanctionData, setPoSanctionData] = useState<Record<string, any> | null>(null);
const [isLoadingPOData, setIsLoadingPOData]   = useState(false);
```

Add:
```typescript
const [dpPoDocname, setDpPoDocname] = useState<string | null>(null);
```

### 2c. Replace the `fetchSSData` effect

**Current** (around lines 2658–2709) — fetches only the Sanction Sheet:

```typescript
useEffect(() => {
    if (!id) return;
    if (poSanctionData) return; // already fetched

    const fetchSSData = async () => {
        setIsLoadingPOData(true);
        try {
            // ... fetches sanction_sheet and sets poSanctionData
        } finally {
            setIsLoadingPOData(false);
        }
    };
    fetchSSData();
}, [activeTab, id, data?.workflow_state, poSanctionData]);
```

**Replace with** — fetches SS then also looks up/creates `dp_po`:

```typescript
useEffect(() => {
    if (!id) return;
    if (poSanctionData) return; // already fetched

    const fetchSSAndDpPo = async () => {
        setIsLoadingPOData(true);
        try {
            // ── 1. Fetch Sanction Sheet ────────────────────────────────────
            const filters = JSON.stringify([["app_id", "=", id]]);
            const listRes = await fetch(
                `/api/v2/document/sanction_sheet?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent('["name"]')}`,
                { credentials: "include", headers: { Accept: "application/json" } },
            )
                .then((r) => r.json())
                .catch(() => ({ data: [] }));

            const ssName = listRes?.data?.[0]?.name;
            if (!ssName) return; // no SS yet — show the "no sanction sheet" empty state

            const ssRes = await fetch("/api/method/frappe.client.get", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
                },
                body: JSON.stringify({ doctype: "sanction_sheet", name: ssName }),
            })
                .then((r) => r.json())
                .catch(() => null);

            const ssDoc = ssRes?.message;
            if (!ssDoc) return;

            // ── 2. Look up existing dp_po for this Direct Purchase ─────────
            const dpPoRes = await fetch(
                `/api/method/${dpPoAPI.getByDirectPurchase}`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
                    },
                    body: JSON.stringify({ dp_docname: id }),
                },
            )
                .then((r) => r.json())
                .catch(() => null);

            let dpPoData = dpPoRes?.message?.data ?? null;
            let dpPoName = dpPoRes?.message?.docname ?? null;

            // ── 3. Auto-create dp_po if it doesn't exist yet ──────────────
            if (!dpPoName) {
                const genRes = await fetch(
                    `/api/method/${dpPoAPI.generateFromSS}`,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                            "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
                        },
                        body: JSON.stringify({
                            dp_docname: id,
                            sanction_sheet_name: ssName,
                        }),
                    },
                )
                    .then((r) => r.json())
                    .catch(() => null);

                dpPoName = genRes?.message?.docname ?? null;

                // Fetch the newly created dp_po doc
                if (dpPoName) {
                    const freshRes = await fetch(
                        `/api/method/${dpPoAPI.getByDirectPurchase}`,
                        {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                "Content-Type": "application/json",
                                Accept: "application/json",
                                "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
                            },
                            body: JSON.stringify({ dp_docname: id }),
                        },
                    )
                        .then((r) => r.json())
                        .catch(() => null);
                    dpPoData = freshRes?.message?.data ?? null;
                }
            }

            // ── 4. Merge: SS doc is the base; dp_po fields override ────────
            //    Field name mapping between dp_po and SS:
            //      dp_po.vendor_name_address  → displayed as "vendor_address" in POEditor
            //      dp_po.quotation_ref_no     → displayed as "quotation_no" in POEditor
            //    All other dp_po fields share the same name as POEditor uses them.
            const merged = {
                ...ssDoc,
                ...(dpPoData
                    ? {
                          vendor_address:       dpPoData.vendor_name_address || ssDoc.ss_name_of_firms || "",
                          po_number:            dpPoData.po_number            || ssDoc.name || "",
                          po_date:              dpPoData.po_date               || "",
                          quotation_no:         dpPoData.quotation_ref_no      || "",
                          signee_name:          dpPoData.signee_name           || "",
                          signee_designation:   dpPoData.signee_designation    || "",
                          amount_in_words:      dpPoData.amount_in_words       || "",
                          terms_and_conditions: dpPoData.terms_and_conditions  || "",
                          // items from dp_po (mapped back to table_bttk shape for the items table)
                          _dp_po_items: dpPoData.items || [],
                      }
                    : {}),
                _dp_po_name: dpPoName,
            };

            setDpPoDocname(dpPoName);
            setPoSanctionData(merged);
        } catch (err) {
            console.error("Error fetching PO data:", err);
        } finally {
            setIsLoadingPOData(false);
        }
    };

    fetchSSAndDpPo();
}, [activeTab, id, data?.workflow_state, poSanctionData]);
```

### 2d. Add `onSave` handler before the return

Add this function near the other handlers (e.g. after the `handlePayment` function):

```typescript
const handleSaveDpPo = async (poData: Record<string, any>) => {
    const csrf = (window as any).csrf_token || "";
    // Map POEditor field names back to dp_po field names
    const payload: Record<string, any> = {
        name:                dpPoDocname || undefined,
        direct_purchase_ref: id,
        sanction_sheet_ref:  poSanctionData?.name || "",
        vendor_name_address: poData.vendor_address || "",
        po_number:           poData.po_number || "",
        po_date:             (() => {
            // Convert DD/MM/YYYY → YYYY-MM-DD for Frappe Date field
            const raw = poData.po_date || "";
            const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
            return m ? `${m[3]}-${m[2]}-${m[1]}` : raw;
        })(),
        quotation_ref_no:    poData.quotation_no || "",
        signee_name:         poData.signee_name || "",
        signee_designation:  poData.signee_designation || "",
        amount_in_words:     poData.amount_in_words || "",
        terms_and_conditions: poData.terms_and_conditions || "",
        // Map items from table_bttk (SS shape) to dp_po_item shape
        items: Array.isArray(poData.table_bttk)
            ? poData.table_bttk.map((row: any) => ({
                  item_name:  row.item_name  || "",
                  make:       row.item_make  || "",
                  model:      row.item_model || "",
                  qty:        row.item_quantity  || 0,
                  unit_price: row.item_unit_price || 0,
                  discount:   row.item_discount   || 0,
                  gst:        row.item_gst         || 0,
                  total:      row.dp_total_price   || 0,
              }))
            : [],
    };

    const res = await fetch(`/api/method/${dpPoAPI.save}`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Frappe-CSRF-Token": csrf,
        },
        body: JSON.stringify({ data: JSON.stringify(payload) }),
    }).then((r) => r.json());

    if (res?.message?.status !== "success") {
        throw new Error(res?.message?.message || "Save failed");
    }
    // Update the docname in state if it was newly created
    if (res.message.docname && !dpPoDocname) {
        setDpPoDocname(res.message.docname);
    }
};
```

### 2e. Pass `onSave` to `<POEditor>`

**Current** (around line 3194):
```tsx
<POEditor
    ssData={poSanctionData}
    dpId={id || ""}
    isStaffRnD={isStaffRnD}
    isPIReadOnly={isPermanentEmployee && !isStaffRnD}
    onUploadSignedPO={async (file: File) => { ... }}
/>
```

**Replace with:**
```tsx
<POEditor
    ssData={poSanctionData}
    dpId={id || ""}
    isStaffRnD={isStaffRnD}
    isPIReadOnly={isPermanentEmployee && !isStaffRnD}
    isSaved={!!dpPoDocname}
    onSave={isStaffRnD ? handleSaveDpPo : undefined}
    onUploadSignedPO={async (file: File) => {
        const formData = new FormData();
        formData.append("file", file, file.name);
        formData.append("docname", poSanctionData!.name);
        formData.append("app_id", id || "");
        formData.append("project_no", poSanctionData!.project_no || "");
        const res = await fetch(
            "/api/method/rndopsapp.rndopsapp.doctype.direct_purchase.direct_purchase.upload_po_document",
            {
                method: "POST",
                body: formData,
                credentials: "include",
                headers: { "X-Frappe-CSRF-Token": (window as any).csrf_token || "" },
            },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.message?.status === false)
            throw new Error(json?.message?.message || "Upload failed");
        setPoSanctionData(null); // triggers re-fetch with updated file_path
    }}
/>
```

---

## How it works end-to-end

```
User opens PO tab
        │
        ▼
fetchSSAndDpPo()
        │
        ├─ Fetch sanction_sheet by app_id
        │
        ├─ Call get_dp_po_by_direct_purchase(dp_docname=id)
        │       │
        │       ├─ Found → use existing dp_po data
        │       │
        │       └─ Not found → call generate_dp_po_from_sanction_sheet()
        │                       → creates new dp_po in Frappe
        │                       → re-fetches to get doc data
        │
        └─ Merge: ssDoc base + dp_po fields override → setPoSanctionData(merged)

POEditor initializes from merged ssData
        │
        └─ User edits vendor address, PO number, date, quotation, signee, T&C

User clicks Save
        │
        └─ handleSaveDpPo(poData)
                │
                └─ POST /api/method/.../save_dp_po_data
                        │
                        ├─ If dpPoDocname exists → UPDATE existing doc
                        └─ If null → CREATE new doc + store docname in state
```

---

## Field mapping reference

| POEditor internal key | dp_po fieldname | Notes |
|-----------------------|-----------------|-------|
| `vendor_address` | `vendor_name_address` | SS: `ss_name_of_firms` as fallback |
| `po_number` | `po_number` | SS: `name` as fallback |
| `po_date` | `po_date` | Convert DD/MM/YYYY ↔ YYYY-MM-DD |
| `quotation_no` | `quotation_ref_no` | |
| `signee_name` | `signee_name` | |
| `signee_designation` | `signee_designation` | |
| `amount_in_words` | `amount_in_words` | Computed by backend on save |
| `terms_and_conditions` | `terms_and_conditions` | HTML |
| `table_bttk[*]` | `items[*]` (dp_po_item) | item_name, make, model, qty, unit_price, discount, gst, total |

---

## Backend API endpoints (already implemented in `dp_po.py`)

```
GET  /api/method/rndopsapp.rndopsapp.doctype.dp_po.dp_po.get_dp_po_by_direct_purchase
     params: dp_docname
     returns: { status, docname, data }

POST /api/method/rndopsapp.rndopsapp.doctype.dp_po.dp_po.generate_dp_po_from_sanction_sheet
     params: dp_docname, sanction_sheet_name
     returns: { status, docname }

POST /api/method/rndopsapp.rndopsapp.doctype.dp_po.dp_po.save_dp_po_data
     params: data (JSON string)
     returns: { status, docname }
```

---

## Notes

- `generate_dp_po_from_sanction_sheet` is idempotent — if a `dp_po` already
  exists for the DP it returns the existing docname without creating a duplicate.
- The backend `save_dp_po_data` recalculates `grand_total` and `amount_in_words`
  automatically via `dp_po.validate()`.
- `po_date` is a Frappe `Date` field (stored as `YYYY-MM-DD`). The POEditor
  displays it as `DD/MM/YYYY`, so conversion is required both ways.
- Only `isStaffRnD` users see the Save button (`onSave` is passed as `undefined`
  for PI/read-only users).
- The `dpPoDocname` state is reset to `null` whenever `poSanctionData` is reset
  (e.g. after upload). If needed, also reset `dpPoDocname` alongside:
  ```typescript
  setPoSanctionData(null);
  setDpPoDocname(null); // add this line too
  ```
