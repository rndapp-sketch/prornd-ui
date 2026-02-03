# Pending Task Fixes and Pagination

## Goal Description
Fix TypeScript errors related to unused interfaces and improve the pagination UI to handle a large number of pages gracefully.

## Changes
### [MODIFY] [PendingTask.tsx](file:///Users/okrammeitei/Projects/prornd-ui/src/pages/PendingTask.tsx)
- **Unused Variable Fix**: Updated `useFrappeGetCall` to use the `PendingTaskResponse` interface instead of an inline type, resolving the "declared but never used" error.
- **Pagination Logic**: Implemented `getPageNumbers` helper function to display a truncated list of page numbers with ellipses (e.g., `1 ... 4 5 6 ... 10`) when the total number of pages exceeds a threshold.

## Verification
- Verified that the TypeScript error is resolved.
- Verified that pagination renders correctly with ellipses for large page counts.
