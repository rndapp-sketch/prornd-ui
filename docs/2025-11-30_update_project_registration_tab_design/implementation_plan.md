# Update Project Registration Tab Design

## Goal Description
Update the tab bar design on the Project Registration page to match the styling of the Project Details Overview page. This ensures a consistent user experience across the application. Additionally, update the Budget tab icon to use the Indian Rupee symbol.

## Proposed Changes

### [MODIFY] [ProjectRegistration.tsx](file:///Users/okrammeitei/Projects/prornd-ui/src/pages/ProjectRegistration.tsx)
-   **Tab Bar Structure**: Replace the existing button-based tab bar with a `nav` element containing buttons with icons.
-   **Styling**: Apply the same classes as used in `ProjectDetailsOverview.tsx` (rounded corners, shadows, border colors).
-   **Icons**: Import and use `FileText`, `Users`, `IndianRupee`, and `Shield` icons from `lucide-react`.
-   **Container**: Wrap the tab bar and the form content in a card-like container (`bg-white`, `border-2`, `border-black`, `shadow`) to match the design system.

## Verification Plan

### Manual Verification
1.  **Visual Inspection**: Verify that the tab bar on the Project Registration page looks identical to the one on the Project Details Overview page.
2.  **Icon Check**: Confirm that the Budget tab displays the Indian Rupee icon.
3.  **Functionality**: Ensure that clicking tabs correctly switches between form sections.
