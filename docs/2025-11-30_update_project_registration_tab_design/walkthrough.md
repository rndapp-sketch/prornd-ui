# Walkthrough - Create Endorsement Certificate Component

I have created a new component `EndorsementCertificate.tsx` that renders an endorsement certificate in an A4 layout. This component is designed to be printable and matches the specific format required by the institute.

## Changes

### [NEW] [EndorsementCertificate.tsx](file:///Users/okrammeitei/Projects/prornd-ui/src/components/EndorsementCertificate.tsx)
-   **A4 Layout**: The component uses fixed dimensions (210mm width) to simulate an A4 page, ensuring correct print formatting.
-   **Header**: Includes the IITG logo, institute name, address, and contact details as per the provided design.
-   **Body**: Contains the standard endorsement text with placeholders for dynamic data (PI Name, Project Title, etc.).
-   **Signatures**: Includes a section for the Head of Institute's signature.
-   **Icons**: Replaced `DollarSignIcon` with `IndianRupeeIcon` for better localization.
-   **Endorsement Certificate**: Added a "Generate Endorsement" button to open the printable certificate view.
-   **Editable Certificate**: The certificate fields (names, titles, etc.) are now editable directly on the view page before printing.
-   **Editable Certificate**: The certificate body is now fully editable with a rich text toolbar (Bold, Italic, Underline, Strikethrough, Alignment, Lists, Undo/Redo) and supports Tab indentation and proper list styling.
-   **Layout**: Adjusted the certificate header layout to place the "Office of R&D" logo inline with the contact details.
-   **Signature**: Added the digital signature of the Head of Institute to the certificate footer, configured to always appear on a new page during printing.

### [NEW] [EndorsementCertificateView.tsx](file:///Users/okrammeitei/Projects/prornd-ui/src/pages/EndorsementCertificateView.tsx)
-   **Certificate View**: A dedicated page that fetches proposal data and renders the `EndorsementCertificate` component for printing.

### [MODIFY] [main.tsx](file:///Users/okrammeitei/Projects/prornd-ui/src/main.tsx)
-   **Route**: Added `/endorsement-certificate/:name` route to access the certificate view.

## Verification Results

### Manual Verification
1.  **Visual Inspection**: The component renders with the correct layout, fonts, and spacing matching the provided HTML example.
2.  **Printability**: The layout is optimized for A4 printing.

# Walkthrough - Update Project Registration Tab Design

I have updated the tab bar design on the Project Registration page to match the styling of the Project Details Overview page.

## Changes

### [MODIFY] [ProjectRegistration.tsx](file:///Users/okrammeitei/Projects/prornd-ui/src/pages/ProjectRegistration.tsx)
-   **Tab Bar**: Replaced the old simple button tab bar with a new `nav` based design using icons (`FileText`, `Users`, `DollarSign`, `Shield`) and specific styling (rounded corners, shadow, border).
-   **Container**: Wrapped the tab bar and the form content in a card-like container structure to match the design of other pages.
-   **Icons**: Added necessary icon imports from `lucide-react`.

## Verification Results

### Manual Verification
1.  **Visual Consistency**: The tab bar now looks identical to the one in the Project Details Overview page.
2.  **Functionality**: Tab switching works as expected, showing/hiding the correct form sections.
