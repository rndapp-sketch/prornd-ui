# Hide Sidebar on Public Pages

## Goal Description
Remove the application sidebar and header (app shell) from public pages like the Landing Page (`/`) and Login Page (`/login`) to provide a full-screen experience.

## Changes
### [MODIFY] [App.tsx](file:///Users/okrammeitei/Projects/prornd-ui/src/App.tsx)
- **Route Detection**: Added `useLocation` to detect if the current path is a public page (`/` or `/login`).
- **Conditional Rendering**: Refactored the render logic to bypass the `SidebarProvider` and `SidebarInset` wrapper for public pages, rendering the `Outlet` directly.

## Verification
- Verified that `/` and `/login` do not show the sidebar or header.
- Verified that protected routes (e.g., `/dashboard`) still show the sidebar.
