# Prevent Form Reload on Tab Switch

## Goal Description
Prevent forms (like Project Registration) from reloading or losing state when the user switches browser tabs or windows. This was caused by the application treating background revalidation as a "loading" state, triggering a component unmount.

## Changes
### [MODIFY] [UserRole.tsx](file:///Users/okrammeitei/Projects/prornd-ui/src/components/UserRole.tsx)
- **Loading Logic**: Removed `isValidating` from the `isEffectiveLoading` calculation. This ensures that background data refreshes do not trigger a loading state that unmounts the UI.

### [MODIFY] [AuthRouteWrapper.tsx](file:///Users/okrammeitei/Projects/prornd-ui/src/components/AuthRouteWrapper.tsx)
- **Loader Logic**: Updated the condition for showing the `GlobalLoader`. It now only blocks rendering if `currentUser` is undefined (initial load) or if roles are strictly loading. It no longer blocks on background authentication checks.

## Verification
- Verified that switching tabs does not cause the form to reload or reset.
- Verified that the initial load still shows the loader correctly.
