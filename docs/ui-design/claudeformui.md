# Claude Style Redesign Prompt

You are an expert frontend developer and UI/UX designer. Your objective is to refactor the existing React TSX code to exactly replicate the aesthetic and design language of **Claude.ai** (Anthropic).

## Core Design Philosophy
The design must be **professional, minimal, simple, and clean**. It should feel **warm, organic, and paper-like**, avoiding sterile "tech" blues or cluttered layouts. Focus on sophisticated typography, high readability, and a clutter-free interface that exudes professionalism.

## Design Specifications (Tailwind CSS)

### 1. Color Palette
- **Backgrounds**: Use warm off-whites.
    - Application BG: `bg-[#FAFAF9]` (Stonewashed white)
    - Card/Panel BG: `bg-[#FFFFFF]` or `bg-[#FDFDFD]`
- **Text**:
    - Primary: `text-[#3F3F46]` (Zinc-700/800) - Soft dark charcoal, never pure black.
    - Secondary: `text-[#71717A]` (Zinc-500) - Muted grey for metadata.
    - Accents: `text-[#9A7D5A]` (Desaturated clay/brown) for specific highlights.
- **Borders**: Very subtle interactions. `border-[#E4E4E7]` (Zinc-200).

### 2. Dark Mode Palette (Tailwind `dark:` classes)
- **Design Rule**: Use a deep, rich charcoal/black theme, not pure `#000000`. matches Claude's dark mode.
- **Backgrounds**:
    - Application BG: `dark:bg-[#18181B]` (Zinc-900).
    - Card/Panel BG: `dark:bg-[#27272A]` (Zinc-800).
- **Text**:
    - Primary: `dark:text-[#E4E4E7]` (Zinc-200).
    - Secondary: `dark:text-[#A1A1AA]` (Zinc-400).
    - Accents: `dark:text-[#D4D4D8]` (Zinc-300).
- **Borders**:
    - `dark:border-[#3F3F46]` (Zinc-700).

### 3. Typography
- **Headings**: Use a high-quality **Serif** font for a literary feel.
    - Classes: `font-serif text-zinc-800 font-medium tracking-tight`.
- **Body**: Clean, modern **Sans-Serif**.
    - Classes: `font-sans text-zinc-600 leading-relaxed`.
- **Code**: Clean monospace with soft backgrounds.
    - Block: `bg-[#F4F4F5] text-red-700 font-mono text-sm rounded-md p-0.5`.

### 4. Component Styles

#### Tables
- **Style**: Minimalist, open, and airy.
- **Structure**:
    - Remove vertical borders.
    - Use subtle horizontal dividers: `border-b border-zinc-200`.
    - Headers: `font-sans text-xs uppercase tracking-wider text-zinc-500 font-semibold`.
    - Rows: `hover:bg-zinc-50 transition-colors`.
    - Padding: Generous `py-3 px-4`.

#### Form Fields / Inputs (New)
- **Aesthetic**: Tactile, subtle, and focused on typography over borders.
- **Input Container**:
    - Base: `bg-white border border-zinc-200 rounded-lg shadow-sm`.
    - Dark Mode: `dark:bg-[#27272A] dark:border-zinc-700`.
    - Interaction: `transition-all duration-200 ease-in-out`.
- **Focus State**:
    - Ring: `focus:ring-2 focus:ring-zinc-100 dark:focus:ring-zinc-700`.
    - Border: `focus:border-zinc-400 dark:focus:border-zinc-500`.
    - Outline: `outline-none`.
- **Typography**:
    - Text: `text-zinc-700 dark:text-zinc-200`.
    - Placeholder: `placeholder:text-zinc-400 dark:placeholder:text-zinc-500`.
- **Chat/Textarea Variant**:
    - If implementing a main chat input, use softer rounding: `rounded-2xl`.
    - Elevation: `shadow-sm hover:shadow-md`.

#### Buttons
- **Primary**:
    - `bg-[#D97757]` (Terracotta) or `bg-[#18181B]` (Zinc-900).
    - `text-white rounded-lg shadow-sm hover:opacity-90 transition-all px-4 py-2 font-medium`.
- **Secondary**:
    - `bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg`.

#### Sidebar / Navigation
- **Container**: `bg-[#F7F7F6] border-r border-zinc-200`.
- **Links**:
    - Default: `text-zinc-600 hover:bg-[#EBEBEA] rounded-md px-3 py-2 transition-colors`.
    - Active: `bg-[#E4E4E7] text-zinc-900 font-medium`.

#### Code Blocks / Pre
- **Container**: `bg-[#F8F8F8] border border-zinc-200 rounded-lg overflow-hidden`.
- **Header**: Optional "Copy" button context bar.
- **Content**: `p-4 overflow-x-auto text-sm font-mono text-zinc-800`.

## Implementation Instructions
1. **Refactor** into reusable React components (e.g., `Button.tsx`, `Card.tsx`, `Table.tsx`, `Input.tsx`) following Atomic Design principles.
2. **Use `className`** for all Tailwind classes.
3. **Implement** a `useTheme` hook or context for managing Dark Mode state.
4. **Refactor** the layout to support flexbox/grid for a clean design.
5. **Enforce generous whitespace** (margin/padding) to create a breathable, minimal interface.
6. **Maintain a clean, clutter-free layout** by removing unnecessary visual noise.
7. **Implement Dark Mode**:
    - Use Tailwind `dark:` prefix for all color-related classes.
    - Add a toggle button (Sun/Moon icon) fixed in the top-right or bottom-right.
    - Ensure logical `dark:` variants for all components (e.g., `bg-white dark:bg-zinc-800`).
8. **Preserve** all functional logic, state management, and props:
    - Keep existing event handlers (e.g., `onClick`).
    - Keep data fetching logic and imports.
    - Ensure strict typing with TypeScript interfaces.
    - Preserve IDs and data attributes where necessary.

---

# Claude Style Redesign Prompt (Enhanced with Shadcn Form Logic)

You are an expert frontend developer and UI/UX designer. Your objective is to refactor the existing React TSX code to exactly replicate the aesthetic and design language of **Claude.ai** (Anthropic), utilizing Shadcn UI structural patterns for components.

## Core Design Philosophy

The design must be **professional, minimal, simple, and clean**. It should feel warm, organic, and paper-like, avoiding sterile "tech" blues. Focus on sophisticated typography, high readability, and a clutter-free interface.

## Design Specifications (Tailwind CSS)

### 1. Color Palette

- **Backgrounds**:
    - Application BG: `bg-[#FAFAF9]` (Stonewashed white)
    - Card/Panel/Form BG: `bg-[#FFFFFF]` or `bg-[#FDFDFD]`
- **Text**:
    - Primary: `text-[#3F3F46]` (Zinc-700/800)
    - Secondary: `text-[#71717A]` (Zinc-500)
    - Accents: `text-[#9A7D5A]` (Desaturated clay)
- **Borders**: `border-[#E4E4E7]` (Zinc-200).

### 2. Dark Mode Palette (`dark:` classes)

- **Backgrounds**:
    - Application BG: `dark:bg-[#18181B]` (Zinc-900).
    - Card/Panel BG: `dark:bg-[#27272A]` (Zinc-800).
- **Text**:
    - Primary: `dark:text-[#E4E4E7]`.
    - Secondary: `dark:text-[#A1A1AA]`.
- **Borders**: `dark:border-[#3F3F46]`.

### 3. Typography

- **Headings**: `font-serif text-zinc-800 dark:text-zinc-100 font-medium tracking-tight`.
- **Body**: `font-sans text-zinc-600 dark:text-zinc-400 leading-relaxed`.
- **Labels**: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-700 dark:text-zinc-300`.

## Component Styles (Shadcn Architecture + Claude CSS)

### Form Architecture Options

Refactor all inputs to follow the atomic "Form" structure based exactly on Shadcn's DOM. 
The standard Shadcn form component structure looks like this:
```html
<form class="space-y-8">
  <div class="space-y-2"> <!-- FormItem -->
    <label class="...">Username</label> <!-- FormLabel -->
    <input class="..."> <!-- FormControl -->
    <p class="...">This is your public display name.</p> <!-- FormDescription -->
    <p class="...">Error message here</p> <!-- FormMessage -->
  </div>
</form>
```

#### Input & Textarea
- **Base Style**: `flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#27272A] px-3 py-2 text-sm ring-offset-white dark:ring-offset-zinc-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 dark:focus-visible:ring-zinc-800 focus-visible:border-zinc-400 dark:focus-visible:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200`.
- **Chat Variant**: For large text areas, use `rounded-2xl shadow-sm hover:shadow-md`.

#### Form Layout Logic
- **FormItem (`<div />`)**: `space-y-2`.
- **FormLabel (`<label />`)**: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-700 dark:text-zinc-300`.
- **FormDescription (`<p />`)**: `text-[0.8rem] text-zinc-500 dark:text-zinc-400`.
- **FormMessage (`<p />`)**: `text-[0.8rem] font-medium text-red-500 dark:text-red-900`.

#### Buttons
- **Base Button**: `inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white dark:ring-offset-zinc-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 dark:focus-visible:ring-zinc-800 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2`.
- **Primary Variant**: `bg-[#18181B] dark:bg-[#E4E4E7] text-white dark:text-zinc-900 hover:opacity-90`.
- **Outline/Secondary Variant**: `border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300`.
- **Ghost Variant**: `hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50 text-zinc-700 dark:text-zinc-300`.

#### Cards (Shadcn Architecture)
- **Card (`<div />`)**: `rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#27272A] text-zinc-800 dark:text-zinc-100 shadow`.
- **CardHeader (`<div />`)**: `flex flex-col space-y-1.5 p-6`.
- **CardTitle (`<h3 />`)**: `font-serif text-xl font-medium tracking-tight text-zinc-800 dark:text-zinc-100`.
- **CardDescription (`<p />`)**: `text-sm text-zinc-500 dark:text-zinc-400`.
- **CardContent (`<div />`)**: `p-6 pt-0`.
- **CardFooter (`<div />`)**: `flex items-center p-6 pt-0`.

#### Tables
- **Table (`<table />`)**: `w-full caption-bottom text-sm`.
- **TableHeader (`<thead />`)**: `[&_tr]:border-b`.
- **TableRow (`<tr />`)**: `border-b border-zinc-200 dark:border-zinc-800 transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 data-[state=selected]:bg-zinc-50 dark:data-[state=selected]:bg-zinc-800`.
- **TableHead (`<th />`)**: `h-10 px-4 text-left align-middle font-sans text-xs uppercase tracking-wider text-zinc-500 font-semibold [&:has([role=checkbox])]:pr-0`.
- **TableCell (`<td />`)**: `p-4 align-middle [&:has([role=checkbox])]:pr-0`.

## Implementation Instructions

1. **Shadcn Structure Integration**: Ensure all components match the exact DOM nesting and structural class structures of Shadcn UI (`space-y-2`, `peer-disabled:opacity-70`, `ring-offset-background` equivalent concepts), but mapped purely to Claude's zinc/terracotta aesthetics.
2. **Focus Management**: Focus states must use the subtle `zinc-100` ring (`focus-visible:ring-2 focus-visible:ring-zinc-100 focus-visible:border-zinc-400`) rather than Shadcn's default high-contrast primary ring.
3. **Typography Balance**: Use Serif for Card/Page titles (`font-serif`) and Sans for labels/body (`font-sans`).
4. **Consistency**: Apply the `dark:` variants to all elements to ensure the Zinc-900/Zinc-800 theme is seamless.
5. **No Visual Noise**: Do not add extra borders or colored backgrounds to form fields that fail to follow the minimalistic Claude aesthetic. Maintain a paper-like feel.
