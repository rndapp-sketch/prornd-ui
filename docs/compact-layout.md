# Compact spacing guide

Use this on any page that still has the old roomy layout. It lists the replacements applied to the pages converted so far (Projects View, Pending Task, Task Registry, Payments, Salary Module, and others).

## 1. Page wrapper

| Find | Replace with |
|---|---|
| `px-6 md:px-8 pt-7 pb-10` | `px-0 pt-0 pb-4` |
| `px-4 md:px-6 xl:px-8 pt-6 pb-12` | `px-0 pt-0 pb-4` |
| `p-4 md:p-8` or `p-4 md:p-6` | `p-0` |
| `mx-auto max-w-[1780px] px-4 py-6 md:px-8 md:py-8` | `w-full px-0 py-0` |

`src/App.tsx` already wraps every page in `px-5 py-3 lg:px-7 lg:py-4` with a `max-w-[1600px]` cap. A page must not add its own outer padding on top of that, or it gets double spacing.

## 2. Vertical gaps between sections

- `mb-5`, `mb-6` and `mb-4` become `mb-3`.
- `space-y-5` and `space-y-6` become `space-y-3`.
- `pt-4` under a divider becomes `pt-3`.

## 3. Header card

- Padding `px-5 py-4` becomes `px-4 py-2.5`.
- Title `text-[22px]` becomes `text-[18px]`, and remove the `mt-1` above it.
- Corners `rounded-2xl` or `rounded-xl` become `rounded-lg`.

## 4. Filter bars, tabs and banners

- Filter bar `p-3` becomes `px-3 py-2`.
- Info banner `px-4 py-3` becomes `px-3 py-2`.
- Small stat cards `p-4` become `px-3 py-2.5`.

## 5. Tables

- Card wrapper `overflow-hidden p-3` becomes `overflow-hidden p-0`, so the table fills the card.
- Remove the extra inner border wrapper (`rounded-lg border ...`) around the table.
- Header cells `px-4 py-3` become `px-3 py-2`.
- Body cells `p-3` or `p-4` become `px-3 py-2`.
- Pagination bar `p-4` becomes `px-4 py-2`.
- Row striping and hover: `even:bg-[#FAFAFA] hover:bg-[#EEF2FF]`.
- Header style: `bg-[#EEF2FF]`, navy text `#1E3A8A`, border `#C7D2FE`.
- Body cell separators: `border-r border-[#F4F4F5]`.

## 6. Do not change

- Modals, drawers and full-screen overlays (`fixed inset-0 ...`). They need their own padding.
- Loading, error and empty states (`p-12`, `py-24`, and similar). Those are meant to be roomy.
- Anything inside `src/components/ui/`. Fix spacing at the page level instead.

## 7. After editing

1. Run `npx tsc --noEmit -p tsconfig.app.json` and check for new errors.
2. Open the page at a narrow and a wide window width.
3. Check that no text is clipped and no buttons overlap.
