# Direct Purchase → P11 Form → Sanction Sheet Integration Plan
## Workflow Actions within DirectPurchaseDetails.tsx

**Target File:** `src/pages/application/DirectPurchaseDetails.tsx`
**Purpose:** Enable complete workflow management from P11 Form → Sanction Sheet → PO within the Direct Purchase detail view
**Users:** Permanent Employee, staff RnD, Hos RnD, Dean RnD, Ado RnD

---

## Current State Analysis

### ✅ Already Implemented in DirectPurchaseDetails.tsx

1. **Tab Navigation System** (lines 524-529, 691-707)
   - ✅ 4 tabs: Details, P-11 Form, Sanction Sheet, Purchase Order
   - ✅ Clean tab switching UI with icons

2. **Linked Document Display** (lines 456-515)
   - ✅ `LinkedDocTab` component fetches and displays P11 Form
   - ✅ `LinkedDocTab` component fetches and displays Sanction Sheet
   - ✅ Automatic document fetching via filter (app_id, direct_purchase)

3. **Document Generation Buttons** (lines 643-683)
   - ✅ Generate P11 button (when workflow_state === 'Approved')
   - ✅ Generate PO button (when workflow_state === 'SancSheetApproved')
   - ✅ API calls already wired up

4. **DocumentViewer Component** (lines 136-360)
   - ✅ Smart field-type detection
   - ✅ Amount formatting, file attachments, child tables
   - ✅ Department and Budget Head integration

### ❌ Missing: Workflow Action Buttons for P11 & Sanction Sheet

**Problem:** While the tabs display P11 Form and Sanction Sheet data beautifully, there are **NO workflow action buttons** to:
- Forward/Approve the P11 Form
- Verify RDP-11 hardcopy
- Generate Sanction Sheet from P11
- Mark print taken on Sanction Sheet
- Verify Sanction Sheet
- Generate PO from Sanction Sheet

**Current Behavior:**
- Users can VIEW P11 and Sanction Sheet in tabs
- Users must navigate away to separate form pages to take actions
- This breaks the workflow continuity

---

## Implementation Plan

### Goal
Add workflow action buttons **directly within each tab** so users can complete the entire recruitment workflow without leaving DirectPurchaseDetails.

### Architecture Pattern

Follow the existing `DirectPurchaseActionButtons` component pattern (lines 398-453):

```typescript
const DirectPurchaseActionButtons = ({ docname, onActionComplete }) => {
    // 1. Fetch workflow actions from backend
    // 2. Render action buttons dynamically
    // 3. Handle action execution with confirmation
    // 4. Reload data on success
}
```

We'll create similar components for:
1. **P11FormActionButtons** - for P11 Form tab
2. **SanctionSheetActionButtons** - for Sanction Sheet tab

---

## Step-by-Step Implementation

### Step 1: Import Required APIs

**File:** `src/pages/application/DirectPurchaseDetails.tsx`
**Location:** Line 10 (after existing imports)

```typescript
import { directPurchaseAPI, p11FormAPI, sanctionSheetAPI } from '@/services/apiService';
```

**Current import:**
```typescript
import { directPurchaseAPI } from '@/services/apiService';
```

**Replace with:**
```typescript
import { directPurchaseAPI, p11FormAPI, sanctionSheetAPI } from '@/services/apiService';
```

---

### Step 2: Create P11FormActionButtons Component

**File:** `src/pages/application/DirectPurchaseDetails.tsx`
**Location:** After `DirectPurchaseActionButtons` (line 453)

```typescript
// --- P11 FORM WORKFLOW ACTION BUTTONS ---
const P11FormActionButtons = ({
    docname,
    onActionComplete,
}: {
    docname: string;
    onActionComplete: () => void;
}) => {
    const [actions, setActions] = useState<string[]>([]);
    const [isPerforming, setIsPerforming] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [selectedAction, setSelectedAction] = useState('');
    const [comment, setComment] = useState('');

    const { call: fetchActions } = useFrappePostCall<{ message: string[] }>(
        p11FormAPI.getWorkflowActions
    );
    const { call: performAction } = useFrappePostCall(p11FormAPI.performAction);

    useEffect(() => {
        if (docname) {
            fetchActions({ docname })
                .then(res => {
                    if (res?.message) {
                        setActions(Array.isArray(res.message) ? res.message : []);
                    }
                })
                .catch(err => console.error("Error fetching P11 workflow actions:", err));
        }
    }, [docname]);

    const handleActionClick = (action: string) => {
        // Actions that need comment/confirmation
        const needsComment = action.toLowerCase().includes('reject') ||
                            action.toLowerCase().includes('put back');

        if (needsComment) {
            setSelectedAction(action);
            setShowCommentModal(true);
        } else {
            handleActionConfirm(action, '');
        }
    };

    const handleActionConfirm = async (action: string, actionComment: string) => {
        setIsPerforming(true);
        setShowCommentModal(false);

        try {
            const result: any = await performAction({
                docname,
                action,
                comment: actionComment
            });

            if (result?.message?.status === 'success') {
                alert(result.message.message || `Action "${action}" completed successfully.`);
                onActionComplete();
            } else if (result?.message?.status === 'error') {
                alert(`Error: ${result.message.message}`);
            } else {
                alert(`Action "${action}" completed.`);
                onActionComplete();
            }
        } catch (err: any) {
            alert(`Action failed: ${err.message || 'Unknown error'}`);
        } finally {
            setIsPerforming(false);
            setComment('');
        }
    };

    const getActionButtonVariant = (action: string): 'primary' | 'outline' | 'action' | 'ghost' => {
        const actionLower = action.toLowerCase();
        if (actionLower.includes('reject')) return 'outline'; // Will add red styling
        if (actionLower.includes('approve') || actionLower.includes('verify')) return 'action';
        if (actionLower.includes('generate')) return 'primary';
        return 'action';
    };

    const getActionButtonClass = (action: string): string => {
        const actionLower = action.toLowerCase();
        if (actionLower.includes('reject')) {
            return 'bg-red-600 hover:bg-red-700 text-white border-red-700';
        }
        if (actionLower.includes('approve') || actionLower.includes('verify')) {
            return 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700';
        }
        if (actionLower.includes('generate')) {
            return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700';
        }
        return '';
    };

    if (!actions.length) return null;

    return (
        <>
            <div className="mt-6 pt-6 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-3">
                    Workflow Actions
                </p>
                <div className="flex flex-wrap gap-2">
                    {actions.map(action => (
                        <ClaudeButton
                            key={action}
                            variant={getActionButtonVariant(action)}
                            className={getActionButtonClass(action)}
                            onClick={() => handleActionClick(action)}
                            disabled={isPerforming}
                        >
                            {isPerforming ? 'Processing…' : action}
                        </ClaudeButton>
                    ))}
                </div>
            </div>

            {/* Comment Modal */}
            {showCommentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-6 rounded-xl shadow-lg w-full max-w-md">
                        <h3 className="text-lg font-semibold text-[#3F3F46] dark:text-[#E4E4E7] mb-4">
                            Confirm: {selectedAction}
                        </h3>
                        <Textarea
                            rows={4}
                            placeholder="Add a comment (optional)..."
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            className="w-full text-sm resize-none border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <ClaudeButton
                                variant="outline"
                                onClick={() => {
                                    setShowCommentModal(false);
                                    setComment('');
                                }}
                            >
                                Cancel
                            </ClaudeButton>
                            <ClaudeButton
                                variant="action"
                                onClick={() => handleActionConfirm(selectedAction, comment)}
                            >
                                Confirm
                            </ClaudeButton>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
```

---

### Step 3: Create SanctionSheetActionButtons Component

**File:** `src/pages/application/DirectPurchaseDetails.tsx`
**Location:** After `P11FormActionButtons`

```typescript
// --- SANCTION SHEET WORKFLOW ACTION BUTTONS ---
const SanctionSheetActionButtons = ({
    docname,
    onActionComplete,
}: {
    docname: string;
    onActionComplete: () => void;
}) => {
    const [actions, setActions] = useState<string[]>([]);
    const [isPerforming, setIsPerforming] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [selectedAction, setSelectedAction] = useState('');
    const [comment, setComment] = useState('');

    const { call: fetchActions } = useFrappePostCall<{ message: string[] }>(
        sanctionSheetAPI.getWorkflowActions
    );
    const { call: performAction } = useFrappePostCall(sanctionSheetAPI.performAction);

    useEffect(() => {
        if (docname) {
            fetchActions({ docname })
                .then(res => {
                    if (res?.message) {
                        setActions(Array.isArray(res.message) ? res.message : []);
                    }
                })
                .catch(err => console.error("Error fetching Sanction Sheet workflow actions:", err));
        }
    }, [docname]);

    const handleActionClick = (action: string) => {
        const needsComment = action.toLowerCase().includes('reject') ||
                            action.toLowerCase().includes('put back');

        if (needsComment) {
            setSelectedAction(action);
            setShowCommentModal(true);
        } else {
            handleActionConfirm(action, '');
        }
    };

    const handleActionConfirm = async (action: string, actionComment: string) => {
        setIsPerforming(true);
        setShowCommentModal(false);

        try {
            const result: any = await performAction({
                docname,
                action,
                comment: actionComment
            });

            if (result?.message?.status === 'success') {
                alert(result.message.message || `Action "${action}" completed successfully.`);
                onActionComplete();
            } else if (result?.message?.status === 'error') {
                alert(`Error: ${result.message.message}`);
            } else {
                alert(`Action "${action}" completed.`);
                onActionComplete();
            }
        } catch (err: any) {
            alert(`Action failed: ${err.message || 'Unknown error'}`);
        } finally {
            setIsPerforming(false);
            setComment('');
        }
    };

    const getActionButtonClass = (action: string): string => {
        const actionLower = action.toLowerCase();
        if (actionLower.includes('reject')) {
            return 'bg-red-600 hover:bg-red-700 text-white border-red-700';
        }
        if (actionLower.includes('verify') || actionLower.includes('print')) {
            return 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700';
        }
        if (actionLower.includes('generate')) {
            return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700';
        }
        return '';
    };

    if (!actions.length) return null;

    return (
        <>
            <div className="mt-6 pt-6 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-3">
                    Workflow Actions
                </p>
                <div className="flex flex-wrap gap-2">
                    {actions.map(action => (
                        <ClaudeButton
                            key={action}
                            variant="action"
                            className={getActionButtonClass(action)}
                            onClick={() => handleActionClick(action)}
                            disabled={isPerforming}
                        >
                            {isPerforming ? 'Processing…' : action}
                        </ClaudeButton>
                    ))}
                </div>
            </div>

            {/* Comment Modal */}
            {showCommentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-6 rounded-xl shadow-lg w-full max-w-md">
                        <h3 className="text-lg font-semibold text-[#3F3F46] dark:text-[#E4E4E7] mb-4">
                            Confirm: {selectedAction}
                        </h3>
                        <Textarea
                            rows={4}
                            placeholder="Add a comment (optional)..."
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            className="w-full text-sm resize-none border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <ClaudeButton
                                variant="outline"
                                onClick={() => {
                                    setShowCommentModal(false);
                                    setComment('');
                                }}
                            >
                                Cancel
                            </ClaudeButton>
                            <ClaudeButton
                                variant="action"
                                onClick={() => handleActionConfirm(selectedAction, comment)}
                            >
                                Confirm
                            </ClaudeButton>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
```

---

### Step 4: Update LinkedDocTab to Include Workflow Actions

**File:** `src/pages/application/DirectPurchaseDetails.tsx`
**Location:** Modify `LinkedDocTab` component (lines 456-515)

**Current code:**
```typescript
const LinkedDocTab = ({
    doctype,
    filterField,
    filterValue,
    emptyTitle,
    emptyDescription,
}: {
    doctype: string;
    filterField: string;
    filterValue: string;
    emptyTitle: string;
    emptyDescription: string;
}) => {
    // ... existing code ...

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 mb-5">
                <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[#71717A] dark:text-[#A1A1AA] border border-[#E4E4E7] dark:border-[#3F3F46]">
                    {docName}
                </span>
            </div>
            <DocumentViewer data={docData} />
        </div>
    );
};
```

**Replace with:**
```typescript
const LinkedDocTab = ({
    doctype,
    filterField,
    filterValue,
    emptyTitle,
    emptyDescription,
    onDataReload, // NEW PROP
}: {
    doctype: string;
    filterField: string;
    filterValue: string;
    emptyTitle: string;
    emptyDescription: string;
    onDataReload?: () => void; // NEW PROP
}) => {
    const { data: listData, isLoading: listLoading, mutate: reloadList } = useFrappeGetCall<{ message: { name: string }[] }>(
        'frappe.client.get_list',
        {
            doctype,
            filters: JSON.stringify([[filterField, '=', filterValue]]),
            fields: JSON.stringify(['name']),
            limit: 1,
        }
    );

    const docName = listData?.message?.[0]?.name || '';

    const { data: docData, isLoading: docLoading, mutate: reloadDoc } = useFrappeGetDoc<Record<string, any>>(
        doctype,
        docName
    );

    // NEW: Reload handler
    const handleReload = () => {
        reloadList();
        reloadDoc();
        if (onDataReload) onDataReload();
    };

    if (listLoading || docLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#D97757] border-t-transparent" />
            </div>
        );
    }

    if (!docName || !docData) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <FileTextIcon className="h-10 w-10 text-[#E4E4E7] dark:text-[#3F3F46]" />
                <p className="font-serif text-base font-medium text-[#3F3F46] dark:text-[#E4E4E7]">{emptyTitle}</p>
                <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] max-w-xs">{emptyDescription}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 mb-5">
                <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[#71717A] dark:text-[#A1A1AA] border border-[#E4E4E7] dark:border-[#3F3F46]">
                    {docName}
                </span>
                {docData.workflow_state && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        {docData.workflow_state}
                    </span>
                )}
            </div>

            <DocumentViewer data={docData} />

            {/* NEW: Render workflow actions based on doctype */}
            {doctype === 'P_11 Form' && (
                <P11FormActionButtons
                    docname={docName}
                    onActionComplete={handleReload}
                />
            )}

            {doctype === 'sanction_sheet' && (
                <SanctionSheetActionButtons
                    docname={docName}
                    onActionComplete={handleReload}
                />
            )}
        </div>
    );
};
```

---

### Step 5: Update Tab Content to Pass onDataReload

**File:** `src/pages/application/DirectPurchaseDetails.tsx`
**Location:** Lines 718-736 (tab content rendering)

**Current code:**
```typescript
{activeTab === 'p11' && id && (
    <LinkedDocTab
        doctype="P_11 Form"
        filterField="app_id"
        filterValue={id}
        emptyTitle="No P-11 Form Generated Yet"
        emptyDescription="The P-11 Form is generated after the Direct Purchase is approved."
    />
)}

{activeTab === 'sanction' && id && (
    <LinkedDocTab
        doctype="sanction_sheet"
        filterField="direct_purchase"
        filterValue={id}
        emptyTitle="No Sanction Sheet Generated Yet"
        emptyDescription="The Sanction Sheet is created by RnD Staff after the P-11 Form is verified and approved."
    />
)}
```

**Replace with:**
```typescript
{activeTab === 'p11' && id && (
    <LinkedDocTab
        doctype="P_11 Form"
        filterField="app_id"
        filterValue={id}
        emptyTitle="No P-11 Form Generated Yet"
        emptyDescription="The P-11 Form is generated after the Direct Purchase is approved."
        onDataReload={loadData} // NEW: Pass reload handler
    />
)}

{activeTab === 'sanction' && id && (
    <LinkedDocTab
        doctype="sanction_sheet"
        filterField="direct_purchase"
        filterValue={id}
        emptyTitle="No Sanction Sheet Generated Yet"
        emptyDescription="The Sanction Sheet is created by RnD Staff after the P-11 Form is verified and approved."
        onDataReload={loadData} // NEW: Pass reload handler
    />
)}
```

---

## Complete Workflow Flow

### Workflow State Transitions

```
Direct Purchase: Draft
    ↓ (Submit)
Direct Purchase: Pending PI Approval
    ↓ (Forward by Permanent Employee)
Direct Purchase: Pending Staff Approval
    ↓ (Forward by staff, RnD)
Direct Purchase: Pending HoS Approval
    ↓ (Forward by Hos, RnD)
Direct Purchase: Pending Associate Dean / Dean Approval
    ↓ (Approve by Ado_RnD or Dean, RnD)
Direct Purchase: Approved
    ↓ (Generate P-11 button appears in header) ✨
    ↓ (Permanent Employee clicks "Generate P-11 Form")

P-11 Form: CREATED & RDP-11 Generated
    ↓ (Navigate to P-11 Form tab)
    ↓ (Workflow actions appear: "Verify Hardcopy") ✨
    ↓ (staff, RnD clicks "Verify Hardcopy")
P-11 Form: RDP-11 Verified
    ↓ (Workflow action: "Generate Sanction Sheet") ✨
    ↓ (staff, RnD clicks "Generate Sanction Sheet")

Sanction Sheet: CREATED & Generated
    ↓ (Navigate to Sanction Sheet tab)
    ↓ (Workflow action: "Mark Print Taken") ✨
    ↓ (Permanent Employee clicks "Mark Print Taken")
Sanction Sheet: Sanction Sheet Printed
    ↓ (Workflow action: "Verify Sanction Sheet") ✨
    ↓ (staff, RnD clicks "Verify Sanction Sheet")
Sanction Sheet: Sanction Approved
    ↓ (Workflow action: "Generate PO") ✨
    ↓ (staff, RnD clicks "Generate PO")

Purchase Order: CREATED & PO Generated (docstatus = 1)
    ✅ WORKFLOW COMPLETE
```

### User Experience

1. **Permanent Employee** creates Direct Purchase
2. Goes through approval workflow
3. **After Approved**, Permanent Employee sees "Generate P-11 Form" button in header
4. Clicks button → P-11 Form is created
5. Navigates to **P-11 Form tab** → sees complete P-11 data
6. **staff, RnD** can now see "Verify Hardcopy" button in the P-11 tab
7. Clicks "Verify Hardcopy" → sees "Generate Sanction Sheet" button
8. Clicks "Generate Sanction Sheet" → Sanction Sheet is created
9. Navigates to **Sanction Sheet tab** → sees Sanction Sheet data
10. Permanent Employee sees "Mark Print Taken" button
11. staff, RnD sees "Verify Sanction Sheet" and "Generate PO" buttons
12. Final click → PO is generated!

**All without leaving the Direct Purchase Details page!** ✨

---

## Testing Checklist

### Unit Tests
- [ ] P11FormActionButtons fetches actions correctly
- [ ] P11FormActionButtons renders buttons with correct styling
- [ ] P11FormActionButtons handles action execution
- [ ] SanctionSheetActionButtons works similarly
- [ ] Comment modal appears for reject actions
- [ ] onDataReload triggers revalidation

### Integration Tests
- [ ] Navigate to Direct Purchase Details
- [ ] Click "Generate P-11 Form" → P-11 Form created
- [ ] Switch to P-11 Form tab → data loads
- [ ] Workflow actions appear for staff, RnD
- [ ] Click "Verify Hardcopy" → state changes
- [ ] Click "Generate Sanction Sheet" → Sanction Sheet created
- [ ] Switch to Sanction Sheet tab → data loads
- [ ] Workflow actions appear correctly
- [ ] Click "Mark Print Taken" → state changes
- [ ] Click "Verify Sanction Sheet" → state changes
- [ ] Click "Generate PO" → PO created
- [ ] Activity stream updates after each action

### Role-Based Access Tests
- [ ] Permanent Employee can generate P-11
- [ ] staff, RnD can verify and generate
- [ ] Unauthorized users don't see action buttons
- [ ] Workflow state determines available actions

---

## Code Quality Notes

### Reusable Patterns
- ✅ Comment modal pattern (reused from DirectPurchaseActionButtons)
- ✅ Action button styling with semantic colors
- ✅ Error handling with user-friendly alerts
- ✅ Loading states during API calls
- ✅ Data reload on action completion

### UI/UX Enhancements
- ✅ Workflow actions separated by border-top
- ✅ Clear section heading: "Workflow Actions"
- ✅ Color-coded buttons:
  - 🔵 Blue = Generate actions
  - 🟢 Green = Approve/Verify actions
  - 🔴 Red = Reject actions
  - 🟠 Orange = Default actions
- ✅ Disabled state during processing
- ✅ Confirmation modals for sensitive actions

### Performance
- ✅ Actions fetched only when document exists
- ✅ Conditional rendering (no actions = no render)
- ✅ Minimal re-renders via useState
- ✅ SWR caching for document data

---

## Summary

### Files Modified
1. **src/pages/application/DirectPurchaseDetails.tsx** (1 file)
   - Import p11FormAPI and sanctionSheetAPI
   - Add P11FormActionButtons component (~120 lines)
   - Add SanctionSheetActionButtons component (~120 lines)
   - Modify LinkedDocTab to include workflow actions (~30 lines modified)
   - Update tab rendering to pass onDataReload (~4 lines modified)

### Total Changes
- **~270 lines of new code**
- **~34 lines modified**
- **0 new files**

### Estimated Implementation Time
- **1-2 hours** for a developer familiar with the codebase

### Benefits
✅ **Complete workflow in one page** - No navigation required
✅ **Better UX** - Users stay in context
✅ **Faster operations** - Fewer page loads
✅ **Clear visibility** - See all stages in tabs
✅ **Follows existing patterns** - Consistent with ProRnD architecture

---

**End of Implementation Plan**
