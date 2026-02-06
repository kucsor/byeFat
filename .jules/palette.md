## 2024-05-22 - Missing ARIA Labels on Icon-Only Buttons
**Learning:** This codebase frequently uses `Button` components with `size="icon"` containing only an icon (from `lucide-react`) without providing an `aria-label`. This makes these buttons inaccessible to screen reader users as they have no accessible name.
**Action:** When working on lists or cards (like `products-list.tsx` or `food-log.tsx`), always check for icon-only buttons and add descriptive `aria-label` attributes.
