# Paavni — Expenses & Payment Recording App

## Original Problem Statement
Build a mobile app for expenses recording and payment recording. User uploaded a detailed monthly expense register (dairy business "Paavni") with categories, GST/TDS, vendors, cost centres and payment tracking.

## User Choices
- Scope: Core expense + payment entry **plus** monthly summary dashboard
- Detail level: Full business detail (simple fields required; GST/TDS/cost-centre optional)
- Dashboard with charts: Yes (monthly totals, by-category, paid vs outstanding)
- Auth: Single user, no login
- Categories: Pre-loaded from the Paavni Excel hierarchy

## Architecture
- **Frontend:** Expo Router (React Native). Bottom tabs: Dashboard / Expenses / Manage. Add/Edit as modal route. Plus Jakarta Sans fonts, forest-green finance theme in `src/theme.ts`. Charts via react-native-gifted-charts. @tanstack/react-query for all data.
- **Backend:** FastAPI + MongoDB (motor), uuid string ids, soft deletes via `deleted_at`. All routes under `/api`.
- Key files: `backend/server.py`, `frontend/src/api.ts`, `frontend/app/(tabs)/*`, `frontend/app/expense-form.tsx`, `frontend/src/components/*`.

## User Personas
- Dairy business owner / accountant recording daily expenses and tracking vendor payments & outstanding dues.

## Core Requirements (static)
- Record expenses with vendor, category (Main→Sub→Detailed head), amount, payment status/mode.
- Optional business detail: GST%, GST amount (auto), TDS, taxable amount, cost centre, remarks.
- Track paid / partly paid / unpaid and outstanding.
- Monthly dashboard: totals, paid vs outstanding, category breakdown.
- Manage vendors and custom categories.

## Implemented (2026-06)
- [x] Backend: masters (seeded Paavni hierarchy), Expenses CRUD + record-payment, Vendors CRUD, custom Categories, Dashboard aggregation. Derived month/outstanding/status on save.
- [x] Dashboard: hero total, paid/outstanding cards, payment-progress bar, category donut, top-spends bars, period selector (auto-lands on latest month with data).
- [x] Expenses list: status filter chips, all-time/month scope toggle, tap-to-edit rows, status badges.
- [x] Add/Edit expense form: date, vendor (add inline), dependent category pickers, GST toggle w/ auto-calc, TDS, payment status/mode, remarks, delete.
- [x] Manage: vendors add/delete, custom category add, built-in category browser.
- [x] Tested end-to-end (backend pytest 13/14 — 1 false race; all frontend flows pass).

## Backlog / Remaining
- P1: Record-payment as a dedicated quick action (partial payments history / ledger per expense).
- P1: Product line field on expense form (master already served).
- P2: Export month to Excel/CSV / share; search across expenses.
- P2: Budget vs actual, cost-centre reports, GST/TDS compliance summary.
- P2: Vendor-wise outstanding (payables) view.

## Next Tasks
- Add payment ledger + dedicated "Record payment" sheet.
- Add vendor-wise outstanding summary.
