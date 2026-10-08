# Paavni — Expenses & Payment Recording App

## Original Problem Statement
Build a mobile app for expenses recording and payment recording. User uploaded a detailed monthly expense register (dairy business "Paavni") with categories, GST/TDS, vendors, cost centres and payment tracking.

## User Choices
- Scope: Core expense + payment entry **plus** monthly summary dashboard
- Detail level: Full business detail (simple required; GST/TDS/cost-centre optional)
- Dashboard with charts: Yes
- Auth: Single user, no login
- Categories: Pre-loaded from the Paavni Excel hierarchy

## Architecture
- **Frontend:** Expo Router. Bottom tabs: Dashboard / Expenses / Dues / Manage. Add/Edit + Record-payment as modals. Plus Jakarta Sans, forest-green theme in `src/theme.ts`. Charts via react-native-gifted-charts. @tanstack/react-query for data. Excel export via expo-file-system(legacy)+expo-sharing (web uses window.open).
- **Backend:** FastAPI + MongoDB (motor), uuid ids, soft deletes (`deleted_at`). openpyxl for Excel export. All routes under `/api`.
- Key files: `backend/server.py`, `frontend/src/api.ts`, `frontend/app/(tabs)/*`, `frontend/app/expense-form.tsx`, `frontend/src/components/*`, `frontend/src/export.ts`.

## User Personas
- Dairy business owner / accountant recording daily expenses and tracking vendor payments & outstanding dues.

## Core Requirements (static)
- Record expenses (vendor, Main→Sub→Detailed head category, amount, status/mode) with optional GST%, GST amount (auto), TDS, taxable, cost centre, product line, remarks.
- Track paid / partly paid / unpaid + outstanding, with a per-bill payment ledger.
- Monthly dashboard: totals, paid vs outstanding, category breakdown.
- Vendor-wise outstanding (dues) view.
- One-tap monthly Excel export.
- Manage vendors and custom categories.

## Implemented
### 2026-06 (MVP)
- [x] Backend: masters (seeded Paavni hierarchy), Expenses CRUD + record-payment, Vendors CRUD, custom Categories, Dashboard aggregation.
- [x] Dashboard (hero total, paid/outstanding, progress, category donut, top-spends, period selector auto-landing on latest data month).
- [x] Expenses list (status chips, scope toggle, tap-to-edit).
- [x] Add/Edit form (date, vendor add-inline, dependent category pickers, GST toggle + auto-calc, TDS, status/mode, remarks, delete).
- [x] Manage (vendors, custom categories, built-in browser).
- [x] Tested end-to-end.

### 2026-06 (Iteration 2 — 4 features)
- [x] **Payment Ledger** — `payments[]` on each expense; record-payment appends entries; edit form shows ledger + Record-payment bottom-sheet (with "Pay full outstanding"). Backend tested 10/10.
- [x] **Vendor Dues** — 4th tab; `GET /api/vendors/dues` aggregation; total-outstanding hero + per-vendor cards with paid progress.
- [x] **Excel Export** — `GET /api/export?month=` returns styled .xlsx (header, rows, TOTAL); export icon on Expenses header; share on native / download on web.
- [x] **Product Line** — product_line picker on form (served from masters), persists; included in Excel export.

### 2026-06 (Iteration 3 — Smart Filters + Budgets)
- [x] **Smart Filters** — Expenses: debounced text search (vendor/category/head/product/remarks), filter bottom-sheet with category + date-range (from/to), active-filter bar. Backend `/api/expenses` gained `q`, `date_from`, `date_to`. Tested 13/13.
- [x] **Budget Tracking** — `budgets` collection + upsert/list/delete endpoints; Manage "Budgets" segment (month picker + per-category amounts); Dashboard "Budget vs actual" card (over-budget in red). Dashboard returns a `budget` block per month.

## Backlog / Remaining
- P2: UI to zero-out/remove an existing budget (delete endpoint exists, no button yet).
- P2: Budget amount validation (>=0) on backend.
- P2: Vendor dues → tap to view that vendor's bills; vendor statement export.
- P2: Cost-centre reports, GST/TDS compliance summary, by-product dashboard breakdown.

## Next Tasks
- By-product cost breakdown on dashboard (product_line now captured).
- Vendor statement / drill-down from Dues.
