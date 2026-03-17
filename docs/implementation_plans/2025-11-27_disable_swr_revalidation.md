# Disable Global Revalidation on Focus

## Goal Description
Prevent the application from reloading data or showing loading states when the user switches back to the browser tab/window. This is caused by SWR's default `revalidateOnFocus` behavior.

## Proposed Changes
### Core
#### [MODIFY] [App.tsx](file:///Users/okrammeitei/Projects/prornd-ui/src/App.tsx)
- Import `SWRConfig` from `swr`.
- Wrap the application content (inside `FrappeProvider`) with `<SWRConfig value={{ revalidateOnFocus: false }}>`.

## Verification Plan
### Manual Verification
- Open the app.
- Switch to another tab or window.
- Switch back to the app.
- Verify that the loading spinner does NOT appear and data does not reload unnecessarily.
