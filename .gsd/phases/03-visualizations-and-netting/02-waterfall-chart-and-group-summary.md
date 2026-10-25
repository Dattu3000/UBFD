---
phase: 3
plan: 2
wave: 2
gap_closure: false
---

# Plan 3.2: Chart.js Canvas Waterfall Sequence & Group Cash Rollup Trajectory

## Objective
Implement high-performance Chart.js intraday waterfall visualizer (`CashWaterfallChart.tsx`) rendering in <200ms. Displays the step-by-step balance trajectory starting from Opening Balance, stepping through each credit inflow and debit outflow, and landing on the Closing Balance, with special visual styling for inter-company contra items.

## Context
Load these files for context:
- `ubfd_engineering_project_report.md` (Section 2.2, Section 4.1)
- `frontend/src/components/inspector/MetricsBar.tsx`
- `frontend/src/types/finance.ts`

## Tasks

<task type="auto" effort="medium">
  <name>Build CashWaterfallChart Component with Chart.js Canvas</name>
  <files>
    frontend/src/components/inspector/CashWaterfallChart.tsx
  </files>
  <action>
    1. Implement `CashWaterfallChart.tsx` using `react-chartjs-2` and `chart.js` (Bar controller, CategoryScale, LinearScale, Tooltip, Legend).
    2. Format floating bar segments:
       - Opening balance bar (Neutral slate/indigo base)
       - Credits: Inflows step upwards (Vibrant Emerald)
       - Debits: Outflows step downwards (Crisp Rose)
       - Contra transfers: Highlighted with purple hatched/gradient styling
       - Closing balance bar (Solid Brand Indigo)
    3. Custom tooltip rendering formatted Indian Rupee amounts (`formatINR`) and narration preview.
    4. Fast rendering budget: under 200ms with responsive canvas resizing.
  </action>
  <verify>
    npm --prefix frontend run build
  </verify>
  <done>
    `CashWaterfallChart` compiles cleanly without TypeScript errors.
  </done>
</task>

<task type="auto" effort="medium">
  <name>Integrate Waterfall Chart into Daily Cash Inspector</name>
  <files>
    frontend/src/pages/DailyInspectorPage.tsx
  </files>
  <action>
    Integrate `CashWaterfallChart` into `DailyInspectorPage.tsx` directly below `MetricsBar`, giving promoters instant visual clarity on how their opening cash transitioned to closing cash.
  </action>
  <verify>
    npm --prefix frontend run build
  </verify>
  <done>
    Daily Cash Inspector displays interactive waterfall charts with live data.
  </done>
</task>
