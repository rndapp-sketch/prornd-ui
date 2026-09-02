# ERP Feature Showcase Refactoring Plan

Refactor the ERP Feature Showcase and modal logic out of [`Login.tsx`](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260830_01_prornd-ui-pragati_v0.01/src/pages/Login.tsx) into a dedicated, modular React component [`ERPFeatureShowcase.tsx`](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260830_01_prornd-ui-pragati_v0.01/src/components/ERPFeatureShowcase.tsx).

## User Review Required

> [!NOTE]
> Moving the ERP Feature Showcase into a standalone component keeps [`Login.tsx`](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260830_01_prornd-ui-pragati_v0.01/src/pages/Login.tsx) focused purely on authentication (email, password validation, and API authentication), reducing its length from ~932 lines to ~200 lines while preserving 100% of the UI design, auto-rotation timer, category tabs, and modal functionality.

## Proposed Changes

### Components Layer

#### [NEW] [`ERPFeatureShowcase.tsx`](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260830_01_prornd-ui-pragati_v0.01/src/components/ERPFeatureShowcase.tsx)

- Encapsulate the `ERPFeature` type definition and `ERP_FEATURES` list (9 capabilities across Finance, Procurement, HR, Workflows, Grants, etc.).
- Encapsulate carousel rotation state (`activeFeatureIndex`, `isPaused`, `progress`), auto-slide timer effect, and slide controls (`handleNextFeature`, `handlePrevFeature`).
- Render the Desktop Left Column hero showcase (campus image background, glassmorphic spotlight card, category filters, progress bar, navigation controls, and institute branding).
- Render the All-Features Grid Modal overlay when `isModalOpen` is true, providing close and card-selection callbacks.

#### [MODIFY] [`Login.tsx`](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260830_01_prornd-ui-pragati_v0.01/src/pages/Login.tsx)

- Import `ERPFeatureShowcase` from `../components/ERPFeatureShowcase`.
- Manage `[showERPModal, setShowERPModal] = useState(false)`.
- Replace inline left-column hero section & inline modal grid with `<ERPFeatureShowcase isModalOpen={showERPModal} onOpenModal={() => setShowERPModal(true)} onCloseModal={() => setShowERPModal(false)} />`.
- Connect mobile banner and login form footer link to `setShowERPModal(true)`.

## Verification Plan

### Automated Verification

- Run `npm run build` or Vite build check to ensure clean TypeScript compilation without errors.

### Manual Verification

- Test desktop layout: Verify auto-playing carousel timer, hover pause state, category filter tab switching, and Next/Prev controls.
- Test modal dialog: Verify opening modal from Desktop "View All 9 Key Capabilities" button, Mobile banner, and Footer link. Verify closing modal and selecting features from modal grid.
