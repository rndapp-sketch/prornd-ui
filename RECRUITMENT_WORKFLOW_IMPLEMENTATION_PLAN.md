# Recruitment Workflow Implementation Plan
## P11 Form → Sanction Sheet → PO Generation Workflow

**Date Created:** March 14, 2026
**Target Users:** Permanent Employee, staff RnD
**Workflow Type:** Multi-stage approval workflow with document generation

---

## Table of Contents
1. [Workflow Overview](#workflow-overview)
2. [Current State Analysis](#current-state-analysis)
3. [Architecture & Patterns](#architecture--patterns)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Detailed Implementation Steps](#detailed-implementation-steps)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Checklist](#deployment-checklist)

---

## Workflow Overview

### Business Process Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RECRUITMENT WORKFLOW STAGES                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Stage 1: Recruitment Adhoc Contractual (Initial Application)       │
│  ├─ Draft → Pending Approvals → Approved                            │
│  └─ Generates → P11 Form                                             │
│                                                                       │
│  Stage 2: P11 Form (Detailed Recruitment Form)                       │
│  ├─ Draft → PI/Mentor/Head → Staff → HoS → Ado/Dean → Approved      │
│  │                                                                    │
│  ├─ Approved → Generate RDP-11 → Verify Hardcopy                     │
│  └─ Generates → Sanction Sheet                                       │
│                                                                       │
│  Stage 3: Sanction Sheet (Financial Approval)                        │
│  ├─ Generated → Print Taken → Verify Sanction Sheet → Approved      │
│  └─ Generates → Purchase Order (PO)                                  │
│                                                                       │
│  Stage 4: PO Generated (Final - Submitted State)                     │
│  └─ docstatus = 1 (Submitted)                                        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Workflow States (from Backend)

| No. | State | Doc Status | Allowed Roles |
|-----|-------|-----------|---------------|
| 1 | Draft | 0 | All_ProRnd_User |
| 2 | Pending PI Approval | 0 | Permanent Employee |
| 3 | Pending Mentor Approval | 0 | Mentor |
| 4 | Pending Staff Approval | 0 | staff, RnD |
| 5 | Pending Head Approval | 0 | head_approver_1 |
| 6 | Pending HoS Approval | 0 | Hos, RnD (Head of Section, RnD) |
| 7 | Pending Associate Dean | 0 | Ado_RnD |
| 8 | Pending Dean Approval | 0 | Dean, RnD |
| 9 | Approved | 0 | Administrator |
| 10 | RDP-11 Generated | 0 | Administrator |
| 11 | RDP-11 Verified | 0 | Administrator |
| 12 | Sanction Sheet Generated | 0 | Administrator |
| 13 | Sanction Sheet Printed | 0 | Administrator |
| 14 | Sanction Approved | 0 | Administrator |
| 15 | PO Generated | 1 | Administrator |
| 16 | Rejected | 2 | Administrator |

### Transition Rules (from Backend)

| From State | Action | To State | Allowed Role |
|------------|--------|----------|--------------|
| Draft | Submit | Pending PI Approval | project staff |
| Draft | Submit | Pending Mentor Approval | Independent Researcher |
| Draft | Submit | Pending Head Approval | Inspired Faculty |
| Draft | Submit | Pending Staff Approval | Permanent Employee |
| Pending PI Approval | Forward | Pending Staff Approval | Permanent Employee |
| Pending Mentor Approval | Forward | Pending Staff Approval | Mentor |
| Pending Head Approval | Forward | Pending Staff Approval | head_approver_1 |
| Pending Staff Approval | Forward | Pending HoS Approval | staff, RnD |
| Pending HoS Approval | Forward | Pending Associate Dean | Hos, RnD (Head of Section, RnD) |
| Pending HoS Approval | Forward | Pending Dean Approval | Hos, RnD (Head of Section, RnD) |
| Pending Associate Dean | Approve | Approved | Ado_RnD |
| Pending Dean Approval | Approve | Approved | Dean, RnD |
| Approved | Generate RDP-11 | RDP-11 Generated | Permanent Employee |
| RDP-11 Generated | Verify Hardcopy | RDP-11 Verified | staff, RnD |
| RDP-11 Verified | Generate Sanction Sheet | Sanction Sheet Generated | staff, RnD |
| Sanction Sheet Generated | Mark Print Taken | Sanction Sheet Printed | Permanent Employee |
| Sanction Sheet Printed | Verify Sanction Sheet | Sanction Approved | staff, RnD |
| Sanction Approved | Generate PO | PO Generated | staff, RnD |

---

## Current State Analysis

### ✅ Already Implemented

1. **API Endpoints** (in `src/services/apiService.ts`)
   - ✅ P11 Form API endpoints (lines 82-87)
   - ✅ Sanction Sheet API endpoints (lines 90-95)
   - ✅ Recruitment Adhoc Contractual API (lines 98-104)

2. **Form Components**
   - ✅ P11Form.tsx - Fully implemented with workflow actions
   - ✅ SanctionSheetForm.tsx - Fully implemented with workflow actions
   - ✅ RecruitmentAdhocContractualForm.tsx - Fully implemented

3. **Routes** (in `src/main.tsx`)
   - ✅ `/p11-form/:id?` - P11 form route (line 510-516)
   - ✅ `/sanction-sheet/:id?` - Sanction sheet route (line 518-524)
   - ✅ `/recruitment-adhoc-contractual/:id?` - Recruitment route (line 526-532)

4. **Core Infrastructure**
   - ✅ DynamicFormRenderer component
   - ✅ Workflow action handling pattern
   - ✅ File upload handling
   - ✅ API data preparation utilities

### ⚠️ Partially Implemented

1. **Sidebar Menu Integration**
   - ⚠️ Need to add recruitment workflow menu items in RndSidebar.tsx
   - ⚠️ Need role-based visibility for Permanent Employee & staff RnD

2. **List Views**
   - ⚠️ Need list page for P11 Forms
   - ⚠️ Need list page for Sanction Sheets
   - ⚠️ Need list page for Recruitment applications

3. **Detail Views**
   - ⚠️ Need detail view for P11 Form in PendingTaskDetails.tsx
   - ⚠️ Need detail view for Sanction Sheet in PendingTaskDetails.tsx
   - ⚠️ Workflow actions component for P11 Form
   - ⚠️ Workflow actions component for Sanction Sheet

4. **Dashboard Integration**
   - ⚠️ Need to show recruitment workflows in RnD Staff Dashboard
   - ⚠️ Need to show recruitment workflows in relevant role dashboards

### ❌ Not Implemented

1. **Navigation Flow**
   - ❌ No way to create new P11 Form from UI
   - ❌ No way to create new Sanction Sheet from UI
   - ❌ Missing "Generate RDP-11" button in P11 Form detail view
   - ❌ Missing "Generate Sanction Sheet" button in P11 detail view
   - ❌ Missing "Generate PO" button in Sanction Sheet detail view

2. **Document Generation Actions**
   - ❌ P11 Form generation from Recruitment Adhoc Contractual
   - ❌ Sanction Sheet generation from P11 Form
   - ❌ PO generation from Sanction Sheet

3. **Pending Task Integration**
   - ❌ P11 Form not appearing in Pending Tasks
   - ❌ Sanction Sheet not appearing in Pending Tasks

---

## Architecture & Patterns

### Established ProRnD Patterns

Based on analysis of existing implementations (TravelForm, TemporaryAdvance, DirectPurchase), the following patterns are consistently used:

#### 1. Form Component Pattern

```typescript
// Standard form component structure
const FormComponent: React.FC = () => {
    // URL params
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const editDocName = id || searchParams.get('edit');

    // State management
    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(null);
    const [workflowActions, setWorkflowActions] = useState<string[]>([]);

    // API hooks
    const { call: fetchFormData } = useFrappePostCall(API.getFields);
    const { call: saveForm } = useFrappePostCall(API.save);
    const { call: fetchWorkflowActions } = useFrappePostCall(API.getWorkflowActions);
    const { call: performAction } = useFrappePostCall(API.performAction);

    // Event handlers
    const handleChange = useCallback((fieldname: string, value: any) => { ... });
    const handleSave = async () => { ... };
    const handleWorkflowAction = async (action: string) => { ... };

    // Render
    return (
        <DynamicFormRenderer
            fields={fields}
            formData={formData}
            linkOptions={linkOptions}
            onChange={handleChange}
            ...
        />
    );
};
```

#### 2. Workflow Action Pattern

```typescript
// Workflow actions rendering
{editDocName && workflowActions.length > 0 && (
    workflowActions.map((action, idx) => {
        const isRejectAction = action.toLowerCase().includes('reject');
        const isApproveAction = action.toLowerCase().includes('approve');
        const isGenerateAction = action.toLowerCase().includes('generate');

        let buttonClass = "bg-[#D97757] text-white"; // Default
        if (isRejectAction) buttonClass = "bg-red-600 text-white";
        if (isApproveAction) buttonClass = "bg-emerald-600 text-white";

        return (
            <FrappeButton
                key={idx}
                onClick={() => handleWorkflowAction(action)}
                disabled={isSubmitting}
                className={buttonClass}
            >
                {action}
            </FrappeButton>
        );
    })
)}
```

#### 3. Pending Task Detail Pattern

```typescript
// In PendingTaskDetails.tsx
const P11FormWorkflowActions = ({ docname, onActionComplete }: Props) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        p11FormAPI.getWorkflowActions,
        { docname }
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        p11FormAPI.performAction
    );

    // Handle action with comment modal
    const handleConfirmAction = async (comment: string) => {
        await performAction({ docname, action: selectedAction, comment });
        onActionComplete();
    };

    return (
        <>
            <div className="flex gap-2">
                {data?.message?.map(action => (
                    <FrappeButton onClick={() => handleActionClick(action)}>
                        {action}
                    </FrappeButton>
                ))}
            </div>
            <CommentModal ... />
        </>
    );
};
```

#### 4. List View Pattern

```typescript
// Standard list page with filters and navigation
const ListComponent: React.FC = () => {
    const { data, isLoading } = useFrappeGetDocList('DocType', {
        fields: ['name', 'workflow_state', 'project', 'creation'],
        filters: [['workflow_state', '!=', 'Rejected']],
        orderBy: { field: 'creation', order: 'desc' }
    });

    const navigate = useNavigate();

    return (
        <div className="space-y-4">
            {data?.map(doc => (
                <Card onClick={() => navigate(`/path/${doc.name}`)}>
                    <CardHeader>
                        <CardTitle>{doc.name}</CardTitle>
                        <Badge>{doc.workflow_state}</Badge>
                    </CardHeader>
                </Card>
            ))}
        </div>
    );
};
```

---

## Implementation Roadmap

### Phase 1: Core Workflow Integration (Week 1)
**Goal:** Enable basic workflow functionality for Permanent Employee

- ✅ API endpoints already configured
- ✅ Form components already implemented
- ✅ Routes already configured
- 🔨 **TODO:** Add sidebar menu items
- 🔨 **TODO:** Integrate with Pending Tasks
- 🔨 **TODO:** Add workflow actions to PendingTaskDetails

### Phase 2: List & Navigation (Week 2)
**Goal:** Enable discovery and management of recruitment documents

- 🔨 **TODO:** Create P11 Form list page
- 🔨 **TODO:** Create Sanction Sheet list page
- 🔨 **TODO:** Create Recruitment Adhoc Contractual list page
- 🔨 **TODO:** Add navigation from project details
- 🔨 **TODO:** Add navigation between stages

### Phase 3: Document Generation Actions (Week 3)
**Goal:** Enable automatic document generation at each stage

- 🔨 **TODO:** Implement P11 generation from Recruitment
- 🔨 **TODO:** Implement Sanction Sheet generation from P11
- 🔨 **TODO:** Implement PO generation from Sanction Sheet
- 🔨 **TODO:** Add generation buttons to detail views
- 🔨 **TODO:** Handle automatic state transitions

### Phase 4: Dashboard & Analytics (Week 4)
**Goal:** Provide visibility and tracking

- 🔨 **TODO:** Add recruitment metrics to RnD Staff Dashboard
- 🔨 **TODO:** Add recruitment widgets to role dashboards
- 🔨 **TODO:** Add recruitment timeline visualization
- 🔨 **TODO:** Add status tracking

### Phase 5: Testing & Refinement (Week 5)
**Goal:** Ensure quality and user experience

- 🔨 **TODO:** End-to-end workflow testing
- 🔨 **TODO:** Role-based access testing
- 🔨 **TODO:** Document generation testing
- 🔨 **TODO:** UI/UX refinement

---

## Detailed Implementation Steps

### Step 1: Sidebar Menu Integration

**File:** `src/components/RndSidebar.tsx`

**Changes Required:**

```typescript
// Add to menuItems array (after Applications section, around line 100)
{
  label: "Recruitment",
  icon: UsersIcon, // or appropriate icon
  subMenu: [
    { label: "Recruitment Applications", path: "/recruitment-adhoc-contractual" },
    { label: "P11 Forms", path: "/p11-forms" },
    { label: "Sanction Sheets", path: "/sanction-sheets" },
  ],
},
```

**Role Visibility:**
- Show to: `Permanent Employee`, `staff, RnD`, `Hos, RnD (Head of Section, RnD)`
- Implementation: Use existing role-checking pattern from the sidebar

---

### Step 2: Pending Task Integration

**File:** `src/pages/PendingTaskDetails.tsx`

**Changes Required:**

#### 2A: Add Workflow Action Components

```typescript
// Around line 180, after TravelWorkflowActions
const P11FormWorkflowActions = ({ docname, onActionComplete }: { docname: string; onActionComplete: () => void }) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        p11FormAPI.getWorkflowActions,
        { docname }
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        p11FormAPI.performAction
    );

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            setModalOpen(false);
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    return (
        <>
            <div className="flex gap-2">
                {data.message.map((action) => {
                    const isRejectAction = action.toLowerCase().includes('reject');
                    const isApproveAction = action.toLowerCase().includes('approve');
                    const isGenerateAction = action.toLowerCase().includes('generate');

                    let buttonClass = "bg-[#D97757] hover:bg-[#c66a4e] text-white";
                    if (isRejectAction) buttonClass = "bg-red-600 hover:bg-red-700 text-white";
                    if (isApproveAction || action.toLowerCase().includes('verify')) {
                        buttonClass = "bg-emerald-600 hover:bg-emerald-700 text-white";
                    }
                    if (isGenerateAction) buttonClass = "bg-blue-600 hover:bg-blue-700 text-white";

                    return (
                        <FrappeButton
                            key={action}
                            onClick={() => handleActionClick(action)}
                            disabled={actionLoading}
                            className={buttonClass}
                        >
                            {action}
                        </FrappeButton>
                    );
                })}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />
        </>
    );
};

const SanctionSheetWorkflowActions = ({ docname, onActionComplete }: { docname: string; onActionComplete: () => void }) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        sanctionSheetAPI.getWorkflowActions,
        { docname }
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        sanctionSheetAPI.performAction
    );

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            setModalOpen(false);
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    return (
        <>
            <div className="flex gap-2">
                {data.message.map((action) => {
                    const isRejectAction = action.toLowerCase().includes('reject');
                    const isPrintAction = action.toLowerCase().includes('print');
                    const isVerifyAction = action.toLowerCase().includes('verify');
                    const isGenerateAction = action.toLowerCase().includes('generate');

                    let buttonClass = "bg-[#D97757] hover:bg-[#c66a4e] text-white";
                    if (isRejectAction) buttonClass = "bg-red-600 hover:bg-red-700 text-white";
                    if (isPrintAction || isVerifyAction) {
                        buttonClass = "bg-emerald-600 hover:bg-emerald-700 text-white";
                    }
                    if (isGenerateAction) buttonClass = "bg-blue-600 hover:bg-blue-700 text-white";

                    return (
                        <FrappeButton
                            key={action}
                            onClick={() => handleActionClick(action)}
                            disabled={actionLoading}
                            className={buttonClass}
                        >
                            {action}
                        </FrappeButton>
                    );
                })}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />
        </>
    );
};

const RecruitmentAdhocContractualWorkflowActions = ({ docname, onActionComplete }: { docname: string; onActionComplete: () => void }) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        recruitmentAdhocContractualAPI.getWorkflowActions,
        { docname }
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        recruitmentAdhocContractualAPI.performAction
    );

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            setModalOpen(false);
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    return (
        <>
            <div className="flex gap-2">
                {data.message.map((action) => (
                    <FrappeButton
                        key={action}
                        onClick={() => handleActionClick(action)}
                        disabled={actionLoading}
                        className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
                    >
                        {action}
                    </FrappeButton>
                ))}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />
        </>
    );
};
```

#### 2B: Add Doctype Rendering Cases

```typescript
// In the main render switch statement (around line 600+)
// Add cases for the new doctypes:

case 'P_11 Form':
    return (
        <>
            {/* Document Details */}
            <GenericDocumentDetails
                doc={doc}
                doctype={doctype}
                hiddenFields={HIDDEN_FIELDS}
            />

            {/* Workflow Actions */}
            <P11FormWorkflowActions
                docname={name}
                onActionComplete={() => {
                    mutate();
                    navigate('/pending-task');
                }}
            />

            {/* Activity Stream */}
            <ActivityStream doctype={doctype} docname={name} />
        </>
    );

case 'Sanction Sheet':
    return (
        <>
            <GenericDocumentDetails
                doc={doc}
                doctype={doctype}
                hiddenFields={HIDDEN_FIELDS}
            />

            <SanctionSheetWorkflowActions
                docname={name}
                onActionComplete={() => {
                    mutate();
                    navigate('/pending-task');
                }}
            />

            <ActivityStream doctype={doctype} docname={name} />
        </>
    );

case 'Recruitment Adhoc Contractual':
    return (
        <>
            <GenericDocumentDetails
                doc={doc}
                doctype={doctype}
                hiddenFields={HIDDEN_FIELDS}
            />

            <RecruitmentAdhocContractualWorkflowActions
                docname={name}
                onActionComplete={() => {
                    mutate();
                    navigate('/pending-task');
                }}
            />

            <ActivityStream doctype={doctype} docname={name} />
        </>
    );
```

---

### Step 3: Create List Pages

#### 3A: P11 Forms List Page

**File:** `src/pages/P11FormList.tsx` (new file)

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { FileTextIcon, PlusIcon, FilterIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

const P11FormList: React.FC = () => {
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const { data: p11Forms, isLoading, error } = useFrappeGetDocList('P_11 Form', {
        fields: ['name', 'workflow_state', 'project_no', 'app_id', 'creation', 'modified'],
        filters: statusFilter !== 'all' ? [['workflow_state', '=', statusFilter]] : undefined,
        orderBy: { field: 'modified', order: 'desc' },
        limit: 100
    });

    const getStatusColor = (status: string) => {
        if (status.includes('Approved') || status.includes('Verified')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        if (status.includes('Rejected')) return 'bg-red-100 text-red-800 border-red-200';
        if (status.includes('Pending')) return 'bg-amber-100 text-amber-800 border-amber-200';
        if (status.includes('Generated')) return 'bg-blue-100 text-blue-800 border-blue-200';
        return 'bg-zinc-100 text-zinc-800 border-zinc-200';
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <PageHeader title="P11 Forms" />
                <div className="grid gap-4 mt-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <PageHeader title="P11 Forms" />
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-800">Error loading P11 forms: {error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <PageHeader title="P11 Forms" />

            {/* Filters and Actions */}
            <div className="flex justify-between items-center mt-6 mb-4">
                <div className="flex gap-2">
                    <Button
                        variant={statusFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('all')}
                        size="sm"
                    >
                        All
                    </Button>
                    <Button
                        variant={statusFilter === 'Draft' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('Draft')}
                        size="sm"
                    >
                        Draft
                    </Button>
                    <Button
                        variant={statusFilter.includes('Pending') ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('Pending Staff Approval')}
                        size="sm"
                    >
                        Pending
                    </Button>
                    <Button
                        variant={statusFilter === 'Approved' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('Approved')}
                        size="sm"
                    >
                        Approved
                    </Button>
                </div>

                <Button
                    onClick={() => navigate('/p11-form')}
                    className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
                >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    New P11 Form
                </Button>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {p11Forms && p11Forms.length > 0 ? (
                    p11Forms.map((form: any) => (
                        <Card
                            key={form.name}
                            className="cursor-pointer hover:shadow-md transition-shadow border-zinc-200 dark:border-zinc-800"
                            onClick={() => navigate(`/p11-form/${form.name}`)}
                        >
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <FileTextIcon className="h-5 w-5 text-zinc-500" />
                                            <CardTitle className="text-lg">{form.name}</CardTitle>
                                        </div>
                                        <CardDescription className="flex gap-4 text-sm">
                                            {form.project_no && (
                                                <span className="font-medium">Project: {form.project_no}</span>
                                            )}
                                            {form.app_id && (
                                                <span>App ID: {form.app_id}</span>
                                            )}
                                        </CardDescription>
                                        <p className="text-xs text-zinc-500 mt-2">
                                            Last modified: {new Date(form.modified).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Badge className={cn('border', getStatusColor(form.workflow_state))}>
                                        {form.workflow_state}
                                    </Badge>
                                </div>
                            </CardHeader>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <FileTextIcon className="h-12 w-12 text-zinc-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                            No P11 Forms found
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Create a new P11 form to get started
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default P11FormList;
```

#### 3B: Sanction Sheet List Page

**File:** `src/pages/SanctionSheetList.tsx` (new file)

```typescript
// Similar structure to P11FormList, replacing:
// - 'P_11 Form' -> 'Sanction Sheet'
// - '/p11-form' -> '/sanction-sheet'
// - Adjust field names as needed (project_no, etc.)
```

#### 3C: Recruitment Adhoc Contractual List Page

**File:** `src/pages/RecruitmentList.tsx` (new file)

```typescript
// Similar structure to P11FormList, replacing:
// - 'P_11 Form' -> 'Recruitment Adhoc Contractual'
// - '/p11-form' -> '/recruitment-adhoc-contractual'
```

---

### Step 4: Add Routes for List Pages

**File:** `src/main.tsx`

```typescript
// Add after existing recruitment routes (around line 540)
{
  path: "p11-forms",
  element: (
    <AuthRouteWrapper allowedRole={["Permanent Employee", "staff, RnD", "Hos, RnD (Head of Section, RnD)"]}>
      <P11FormList />
    </AuthRouteWrapper>
  ),
},
{
  path: "sanction-sheets",
  element: (
    <AuthRouteWrapper allowedRole={["Permanent Employee", "staff, RnD", "Hos, RnD (Head of Section, RnD)"]}>
      <SanctionSheetList />
    </AuthRouteWrapper>
  ),
},
{
  path: "recruitment-applications",
  element: (
    <AuthRouteWrapper allowedRole="All_ProRnd_User">
      <RecruitmentList />
    </AuthRouteWrapper>
  ),
},
```

**Import statements to add:**

```typescript
import P11FormList from './pages/P11FormList.tsx';
import SanctionSheetList from './pages/SanctionSheetList.tsx';
import RecruitmentList from './pages/RecruitmentList.tsx';
```

---

### Step 5: Document Generation Integration

#### 5A: Update P11Form.tsx to Show Generation Button

**File:** `src/pages/application/P11Form.tsx`

```typescript
// Around line 347, in the workflow actions section, add special handling:

{editDocName && workflowActions.length > 0 ? (
    workflowActions.map((action, idx) => {
        const isRejectAction = action.toLowerCase().includes('reject');
        const isPutBackAction = action.toLowerCase().includes('put back');
        const isGenerateAction = action.toLowerCase().includes('generate');

        let buttonClass = "bg-[#D97757] text-white hover:bg-[#c66a4e]";

        if (isRejectAction) {
            buttonClass = "bg-red-600 text-white hover:bg-red-700";
        } else if (isPutBackAction) {
            buttonClass = "bg-amber-600 text-white hover:bg-amber-700";
        } else if (action.toLowerCase().includes('approve') || action.toLowerCase().includes('verify')) {
            buttonClass = "bg-emerald-600 text-white hover:bg-emerald-700";
        } else if (isGenerateAction) {
            // Special styling for generation actions
            buttonClass = "bg-blue-600 text-white hover:bg-blue-700";
        }

        return (
            <FrappeButton
                key={idx}
                onClick={() => handleWorkflowAction(action)}
                disabled={isSubmitting}
                className={buttonClass}
            >
                {isGenerateAction && <FileTextIcon className="h-4 w-4 mr-2" />}
                {action}
            </FrappeButton>
        );
    })
) : (
    // ... existing code
)}
```

#### 5B: Update SanctionSheetForm.tsx Similarly

**File:** `src/pages/application/SanctionSheetForm.tsx`

```typescript
// Similar changes to add special styling for "Generate PO" action
// Around line 334-370
```

#### 5C: Handle Post-Generation Navigation

```typescript
// In handleWorkflowAction for both forms, after successful action:

const handleWorkflowAction = async (action: string) => {
    if (isSubmitting || !savedDocName) return;

    let comment = "";
    if (action.toLowerCase().includes('reject') || action.toLowerCase().includes('put back')) {
        const userComment = prompt(`Please provide a reason for '${action}':`);
        if (userComment === null) return;
        comment = userComment;
    }

    setIsSubmitting(true);
    try {
        const data = await prepareFormDataForApi(formData);
        const saveRes = await saveForm({ doc_data: JSON.stringify(data) });

        if (saveRes?.message?.status !== 'success') {
            throw new Error("Failed to save draft before processing action.");
        }

        const res = await performAction({
            docname: savedDocName,
            action: action,
            comment: comment
        });

        if (res?.message?.status === 'success') {
            alert(`Action '${action}' completed successfully!`);

            // Special handling for generation actions
            if (action.toLowerCase().includes('generate')) {
                const generatedDocName = res.message.generated_doc;
                if (generatedDocName) {
                    // Navigate to the newly generated document
                    if (action.toLowerCase().includes('rdp-11') || action.toLowerCase().includes('sanction')) {
                        const targetPath = action.toLowerCase().includes('sanction')
                            ? `/sanction-sheet/${generatedDocName}`
                            : `/p11-form/${savedDocName}`;
                        navigate(targetPath);
                        return;
                    }
                }
            }

            navigate(-1);
        } else {
            throw new Error(res?.message?.message || `Failed to perform action '${action}'.`);
        }
    } catch (err: any) {
        console.error(err);
        alert(`Action failed: ${err.message || "Unknown error"}`);
    } finally {
        setIsSubmitting(false);
    }
};
```

---

### Step 6: Dashboard Integration

#### 6A: Add Recruitment Widget to RnD Staff Dashboard

**File:** `src/pages/dashboards/RndStaffDashboard.tsx`

```typescript
// Add a recruitment summary widget

const RecruitmentSummaryWidget = () => {
    const { data: p11Count } = useFrappeGetCall(
        'frappe.client.get_count',
        { doctype: 'P_11 Form', filters: [['workflow_state', '!=', 'Rejected']] }
    );

    const { data: sanctionCount } = useFrappeGetCall(
        'frappe.client.get_count',
        { doctype: 'Sanction Sheet', filters: [['workflow_state', '!=', 'Rejected']] }
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recruitment Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-2xl font-bold">{p11Count?.message || 0}</p>
                        <p className="text-sm text-zinc-500">P11 Forms</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{sanctionCount?.message || 0}</p>
                        <p className="text-sm text-zinc-500">Sanction Sheets</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
```

---

## Testing Strategy

### Unit Testing Checklist

- [ ] P11 Form component renders correctly
- [ ] Sanction Sheet component renders correctly
- [ ] Workflow actions are fetched and displayed
- [ ] Form data is saved correctly
- [ ] File uploads work properly
- [ ] Validation errors are shown

### Integration Testing Checklist

- [ ] Complete workflow from Draft → PO Generated
- [ ] Document generation at each stage
- [ ] Workflow transitions are correct
- [ ] Role-based access control works
- [ ] Pending tasks show correct documents
- [ ] Activity stream records all actions

### User Acceptance Testing Scenarios

1. **Permanent Employee Creates P11**
   - Navigate to recruitment menu
   - Create new P11 form
   - Fill in required fields
   - Save as draft
   - Submit for approval

2. **Staff RnD Approves and Generates**
   - View pending P11 in pending tasks
   - Review details
   - Approve P11
   - Generate RDP-11
   - Verify hardcopy
   - Generate Sanction Sheet

3. **Complete PO Generation**
   - Navigate to Sanction Sheet
   - Mark print taken
   - Verify sanction sheet
   - Generate PO
   - Verify final state (docstatus = 1)

4. **Rejection Flow**
   - Reject at any stage
   - Verify comment is required
   - Verify state changes to Rejected
   - Verify document appears in rejected list

---

## Deployment Checklist

### Pre-Deployment

- [ ] All code reviewed and approved
- [ ] All tests passing
- [ ] No console errors or warnings
- [ ] Accessibility requirements met
- [ ] Performance benchmarks met
- [ ] Documentation updated

### Backend Verification

- [ ] Verify all API endpoints exist in backend
- [ ] Verify workflow states match backend
- [ ] Verify transition rules match backend
- [ ] Verify permissions are configured
- [ ] Test document generation methods

### Deployment Steps

1. [ ] Merge feature branch to develop
2. [ ] Run build: `yarn build`
3. [ ] Test build locally: `yarn preview`
4. [ ] Deploy to staging environment
5. [ ] Run smoke tests on staging
6. [ ] Deploy to production
7. [ ] Monitor for errors
8. [ ] Verify workflow functionality

### Post-Deployment

- [ ] User training conducted
- [ ] Documentation provided
- [ ] Support team briefed
- [ ] Monitor usage metrics
- [ ] Collect user feedback

---

## Key Considerations

### Security
- ✅ Role-based access already implemented via AuthRouteWrapper
- ✅ API endpoints secured at backend level
- ⚠️ Ensure sensitive fields are not exposed in list views

### Performance
- ✅ SWR caching prevents unnecessary refetches
- ✅ Lazy loading of form fields
- ⚠️ Monitor list page performance with large datasets

### User Experience
- ✅ Clear workflow state indicators
- ✅ Intuitive navigation between stages
- ✅ Helpful error messages
- ⚠️ Need confirmation dialogs for irreversible actions

### Data Integrity
- ✅ Form validation before save
- ✅ Backend validation on submission
- ✅ Audit trail via Activity Stream
- ⚠️ Handle concurrent edits gracefully

---

## Summary

### What's Already Done ✅
- API endpoints configured
- Form components fully implemented
- Routes configured
- DynamicFormRenderer supporting all field types
- Workflow action handling in forms

### What Needs to Be Done 🔨

**High Priority (Week 1-2)**
1. Add recruitment menu to sidebar
2. Integrate with Pending Tasks
3. Create list pages for all three doctypes
4. Add workflow action components to PendingTaskDetails

**Medium Priority (Week 3)**
5. Test document generation flows
6. Add navigation between stages
7. Enhance UI feedback for generation actions

**Low Priority (Week 4-5)**
8. Dashboard widgets
9. Analytics and reporting
10. UI/UX refinements

### Success Criteria
- ✅ Permanent Employee can create and submit P11 forms
- ✅ Staff RnD can approve and generate documents at each stage
- ✅ Full workflow from Draft to PO Generated works end-to-end
- ✅ All role-based permissions enforced
- ✅ Documents appear in pending tasks correctly
- ✅ Activity stream records all actions

---

**End of Implementation Plan**
