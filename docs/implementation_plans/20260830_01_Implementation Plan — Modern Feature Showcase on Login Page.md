# Implementation Plan — Modern Feature Showcase on Login Page

Showcase all 9 newly updated Pragati ERP features on the Login page hero panel ([`Login.tsx`](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260829_02_prornd-ui-pragati_v0.01/src/pages/Login.tsx)) with a modern aesthetic, smooth animated transitions, auto-rotation timer, interactive navigation controls, and an optional full grid overview modal.

## User Review Required

> [!IMPORTANT]
> **Design & Placement Strategy**:
> The left hero section of [`Login.tsx`](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260829_02_prornd-ui-pragati_v0.01/src/pages/Login.tsx) will be enhanced from static text into an interactive, modern **ERP Features Showcase Carousel & Grid** with glassmorphism, gradient accents, timed auto-rotation (5s), pause-on-hover, category tabs, and slide transition effects.
>
> On mobile & smaller screens (where the left hero is hidden), a subtle animated banner pill with a "View New ERP Features" trigger will open the full feature overview modal so mobile users do not miss out.

## Proposed Summarized Features Structure

All 9 feature review texts provided are structured into summarized, visually distinct feature cards with dedicated icons, category tags, key highlight badges, and descriptions:

1. **Live Project Ledger**
   - _Category_: `Finance & Ledger`
   - _Summary_: Real-time payment & commitment tracking against account heads with running balances.
   - _Highlights_: `⚡ Real-Time Ledger`, `🚫 Zero Excel`, `🔒 PO Over-Commit Lock`
   - _Details_: Every payment & commitment against account heads updated live. Committed amounts appear instantly to prevent over-committing heads with active POs.

2. **Funding: Sanction to Receipt**
   - _Category_: `Grants & Receipts`
   - _Summary_: Log sanctions, track incoming instalments, auto-distribute credit.
   - _Highlights_: `📄 10 Deposit Slip Types`, `💰 Inflow Categorization`, `🔄 Auto Credit Distribution`
   - _Details_: Log sanctions and incoming funds (research, consultancy, testing, non-routine) with credit automatically distributed across projects.

3. **Complete Module Activity History**
   - _Category_: `Audit & History`
   - _Summary_: Granular history tracking for every module directly within project context.
   - _Highlights_: `📜 Per-Module Audit Trail`, `📂 In-Project Logs`, `🔍 Full Application History`
   - _Details_: All project actions stay recorded directly inside the project, preserving full module history.

4. **Self Delegation Control**
   - _Category_: `Governance & Delegation`
   - _Summary_: Temporary approval delegation to colleagues with dual attribution.
   - _Highlights_: `⏱️ Fixed Time Window`, `👥 Dual Attribution`, `🔒 Auto-Lapse Access`
   - _Details_: Delegate approval queue authority for a set duration. Access automatically expires on the end date while maintaining clear dual attribution.

5. **End-to-End Purchasing**
   - _Category_: `Procurement & Orders`
   - _Summary_: Budget-bound purchasing workflow (Indent → Quotation → PO → Delivery) with next-step guidance.
   - _Highlights_: `🛒 Indent to Delivery`, `📋 NIQ / PO / AMC / Rate Contract`, `💡 Guided Next Steps`
   - _Details_: Approvals and funds stay aligned against sanctioned budget heads. System automatically unlocks the next step to prevent confusion.

6. **Intuitive Form & Movement Workflows**
   - _Category_: `Workflow Engine`
   - _Summary_: Visual representation of form flow movements and application progress.
   - _Highlights_: `🗺️ Visual Workflows`, `🎯 Intuitive Movement`, `📊 Real-Time Status`
   - _Details_: Depicts form movements and application workflows intuitively so users know the exact state and next action.

7. **Recruitment & Onboarding**
   - _Category_: `Project HR & Onboarding`
   - _Summary_: Position → Application → Shortlist → Selection Report → Appointment → Joining & Medical.
   - _Highlights_: `👥 Automated HR Pipeline`, `📄 One-Click Documents`, `🩺 Medical & Joining Reports`
   - _Details_: Entire recruitment pipeline managed seamlessly, generating official orders directly from captured data.

8. **Travel, Advances & Settlement**
   - _Category_: `Travel & Claims`
   - _Summary_: Itemized claims for journeys, local conveyance, and incidentals reconciled against advances.
   - _Highlights_: `✈️ Advance & Settlement`, `🚘 Itemized Conveyance`, `⚖️ Auto Reconciliation`
   - _Details_: Request advances, log journeys and incidentals on one claim, and automatically reconcile against advanced funds.

9. **Role-Tailored Dashboards & Reports**
   - _Category_: `Analytics & Reporting`
   - _Summary_: 11 role-specific dashboards (Director, PI, R&D Staff) with effortless report generation.
   - _Highlights_: `📊 11 Role Dashboards`, `👑 Director & PI Views`, `📈 One-Click Reports`
   - _Details_: Custom views tailored to roles — institute-wide metrics for Directors, project status for PIs, queues for R&D staff, and fast report export.

---

## Proposed Changes

### [`Login.tsx`](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260829_02_prornd-ui-pragati_v0.01/src/pages/Login.tsx)

#### [MODIFY] [`src/pages/Login.tsx`](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260829_02_prornd-ui-pragati_v0.01/src/pages/Login.tsx)

- Create `FEATURE_HIGHLIGHTS` array containing all 9 feature objects with titles, short summaries, full descriptions, categories, icons, and highlight badges.
- Add active slide state (`activeFeatureIndex`), pause state (`isPaused`), direction state (`slideDirection`), and modal open state (`showAllFeaturesModal`).
- Implement an automated 5-second slide timer with progress bar indicator and hover-pause behavior.
- Render glassmorphic spotlight card in the left hero section:
  - Header badge: `✨ PRAGATI ERP 2.0 UPDATES`
  - Category selector chips for direct one-click navigation.
  - Animated slide container showing active feature details, highlight badges, and step indicator (`01 / 09`).
  - Next/Previous arrow controls and progress timer bar.
  - "Explore All 9 Capabilities" trigger button opening an interactive modal grid.
- Add mobile/tablet trigger button in the main form card header so mobile users can also access the 9 feature highlights.

---

## Verification Plan

### Automated Tests

- Run `npm run build` to verify TypeScript compilation and bundling without errors.

### Manual Verification

- Verify auto-rotation every 5 seconds with active progress bar.
- Test hover-pause and manual tab/arrow navigation.
- Verify modal overlay displaying all 9 features cleanly with responsive layout.
