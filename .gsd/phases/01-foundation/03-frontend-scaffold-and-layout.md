---
phase: 1
plan: 3
wave: 2
gap_closure: false
---

# Plan 1.3: Frontend Shell, Design System, Nav Layout & Global State

## Objective
Scaffold the frontend web application with TypeScript, Tailwind CSS, TanStack Query v5, and Radix UI primitives. Construct the global layout with responsive financial sidebar navigation, dark/light theme, standardized Indian Rupee currency display helpers, and the consolidated Group Overview liquidity dashboard.

## Context
Load these files for context:
- `.gsd/SPEC.md`
- `.gsd/ARCHITECTURE.md`
- `.gsd/STACK.md`
- `ubfd_engineering_project_report.md` (Section 4)

## Tasks

<task type="auto" effort="medium">
  <name>Scaffold Frontend Project with Design System & API Client</name>
  <files>
    frontend/package.json
    frontend/tsconfig.json
    frontend/tailwind.config.js
    frontend/src/lib/api-client.ts
    frontend/src/lib/formatters.ts
    frontend/src/types/finance.ts
  </files>
  <action>
    1. Initialize `frontend/package.json` with React, Next.js / Vite SPA, TypeScript, `@tanstack/react-query`, `lucide-react`, `tailwindcss`, `clsx`, `tailwind-merge`.
    2. Setup `tailwind.config.js` with bespoke financial dark/light palette (emerald inflows, rose outflows, slate ledger borders, indigo branding).
    3. Implement `src/types/finance.ts` with all TypeScript contracts specified in the report (`BankAccount`, `BankCode`, `FacilityType`, `DailyLedgerSummary`, `TransactionItem`, `DailyLedgerResponse`, `Entity`).
    4. Implement `src/lib/formatters.ts` with Indian numbering formatter (`formatINR(1250000)` -> `₹12,50,000.00`, Lakhs/Crores abbreviations: `₹12.50 L`, `₹1.50 Cr`).
    5. Implement `src/lib/api-client.ts` with Axios/Fetch client, automatic Bearer token injection, and typed API response unwrapping.

    AVOID: Standard Western comma formatting (`1,250,000.00`).
    USE: Indian numbering system formatting (`12,50,000.00`) per Indian banking standards.
  </action>
  <verify>
    node -e "const { formatINR } = require('./frontend/src/lib/formatters'); console.assert(formatINR(125000) === '₹1,25,000.00', 'Formatter test failed'); console.log('Formatters verified successfully')"
  </verify>
  <done>
    Frontend type definitions, Indian Rupee formatters, and API client build without errors.
  </done>
</task>

<task type="auto" effort="medium">
  <name>Build Dashboard Shell, Global Navigation & Consolidated Group Overview</name>
  <files>
    frontend/src/components/layout/Sidebar.tsx
    frontend/src/components/layout/Header.tsx
    frontend/src/components/shared/CurrencyDisplay.tsx
    frontend/src/components/shared/EntityFilterBadge.tsx
    frontend/src/app/(dashboard)/layout.tsx
    frontend/src/app/(dashboard)/page.tsx
  </files>
  <action>
    1. Implement `Sidebar.tsx` with high-contrast navigation links:
       - 📊 Group Overview (`/`)
       - 🔍 Daily Cash Inspector (`/inspector`)
       - 🔄 Inter-Company Netting (`/intercompany`)
       - 📥 Statement Ingestion (`/ingestion`)
    2. Implement `Header.tsx` displaying the current active tenant/group profile, global entity filter switcher, and quick date context.
    3. Implement `CurrencyDisplay.tsx` rendering formatted amounts with color-coding (green for positive velocity, red for overdraft/debit).
    4. Implement `EntityFilterBadge.tsx` displaying entity legal type (`PVT_LTD`, `LLP`, etc.) with distinctive badges.
    5. Implement Group Overview page (`page.tsx`) with:
       - 3 High-level KPI summary cards: Total Group Cleared Liquidity, Net 24h Cash Flow, Active Bank Accounts.
       - Entity-by-entity liquidity breakdown cards.
       - Bank account roster table showing bank logo/badge, mask (`•••• 9482`), facility type (`CURRENT`, `OVERDRAFT`), and cleared balance.
  </action>
  <verify>
    npm --prefix frontend run build || npx tsc --project frontend/tsconfig.json --noEmit
  </verify>
  <done>
    Frontend layout, navigation shell, and Group Overview page compile cleanly with zero TypeScript errors.
  </done>
</task>
