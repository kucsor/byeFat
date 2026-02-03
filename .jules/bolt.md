## 2024-05-22 - Hidden Data Fetching in Mounted Sheets
**Learning:** Modals/Sheets (like `AddFoodSheet`) that are mounted by parents (like `Dashboard`) but hidden via CSS/Portal often execute their data fetching hooks immediately on mount, not when opened. In this codebase, `AddFoodSheet` was downloading the entire `products` collection on app load.
**Action:** Always wrap expensive Firestore queries in these components with a `!isOpen` check to ensure they only fetch when visible.
