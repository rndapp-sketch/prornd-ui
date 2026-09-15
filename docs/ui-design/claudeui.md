
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

### 2. Typography
- **Headings**: Use a high-quality **Serif** font for a literary feel.
    - Classes: `font-serif text-zinc-800 font-medium tracking-tight`.
- **Body**: Clean, modern **Sans-Serif**.
    - Classes: `font-sans text-zinc-600 leading-relaxed`.
- **Code**: Clean monospace with soft backgrounds.
    - Block: `bg-[#F4F4F5] text-red-700 font-mono text-sm rounded-md p-0.5`.

### 3. Component Styles

#### Tables
- **Style**: Minimalist, open, and airy.
- **Structure**:
    - Remove vertical borders.
    - Use subtle horizontal dividers: `border-b border-zinc-200`.
    - Headers: `font-sans text-xs uppercase tracking-wider text-zinc-500 font-semibold`.
    - Rows: `hover:bg-zinc-50 transition-colors`.
    - Padding: Generous `py-3 px-4`.

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
1.  **Refactor** into reusable React components (e.g., `Button.tsx`, `Card.tsx`, `Table.tsx`) following Atomic Design principles.
2.  **Use `className`** for all Tailwind classes.
3.  **Implement** a `useTheme` hook or context for managing Dark Mode state.
4.  **Refactor** the layout to support flexbox/grid for a clean design.
5.  **Enforce generous whitespace** (margin/padding) to create a breathable, minimal interface.
6.  **Maintain a clean, clutter-free layout** by removing unnecessary visual noise.
7.  **Implement Dark Mode**:
    - Use Tailwind `dark:` prefix for all color-related classes.
    - Add a toggle button (Sun/Moon icon) fixed in the top-right or bottom-right.
    - Ensure logical `dark:` variants for all components (e.g., `bg-white dark:bg-zinc-800`).
8.  **Preserve** all functional logic, state management, and props:
    - Keep existing event handlers (e.g., `onClick`).
    - Keep data fetching logic and imports.
    - Ensure strict typing with TypeScript interfaces.
    - Preserve IDs and data attributes where necessary.

---

**Task**: Apply this design system to the following React TSX Project.