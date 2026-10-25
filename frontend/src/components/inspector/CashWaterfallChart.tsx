import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { DailyLedgerSummary, TransactionItem } from '@/types/finance';
import { formatINR } from '@/lib/formatters';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface CashWaterfallChartProps {
  summary: DailyLedgerSummary;
  transactions: TransactionItem[];
}

export const CashWaterfallChart: React.FC<CashWaterfallChartProps> = ({
  summary,
  transactions,
}) => {
  // Construct waterfall data steps
  const labels: string[] = ['Opening'];
  const dataPairs: [number, number][] = [[0, summary.opening_balance]];
  const backgroundColors: string[] = ['rgba(99, 102, 241, 0.7)']; // Opening: Indigo
  const borderColors: string[] = ['#6366f1'];
  const tooltipsMeta: { desc: string; type: string; diff: number }[] = [
    { desc: 'Start of Day Cleared Balance', type: 'OPENING', diff: summary.opening_balance },
  ];

  let running = summary.opening_balance;

  transactions.forEach((tx, idx) => {
    const isCredit = tx.credit_amount > 0;
    const isDebit = tx.debit_amount > 0;
    const amount = isCredit ? tx.credit_amount : tx.debit_amount;
    const prev = running;

    if (isCredit) {
      running = prev + amount;
      dataPairs.push([prev, running]);
      backgroundColors.push('rgba(16, 185, 129, 0.7)'); // Emerald
      borderColors.push('#10b981');
      tooltipsMeta.push({
        desc: `${tx.counterparty_name} (${tx.category})`,
        type: 'INFLOW',
        diff: amount,
      });
    } else if (isDebit) {
      running = prev - amount;
      dataPairs.push([running, prev]);
      if (tx.is_intercompany) {
        backgroundColors.push('rgba(139, 92, 246, 0.7)'); // Contra Purple
        borderColors.push('#8b5cf6');
        tooltipsMeta.push({
          desc: `Contra Transfer: ${tx.counterparty_name}`,
          type: 'CONTRA',
          diff: -amount,
        });
      } else {
        backgroundColors.push('rgba(244, 63, 94, 0.7)'); // Rose
        borderColors.push('#f43f5e');
        tooltipsMeta.push({
          desc: `${tx.counterparty_name} (${tx.category})`,
          type: 'OUTFLOW',
          diff: -amount,
        });
      }
    }

    labels.push(`Tx ${idx + 1}: ${tx.reference_number.substring(0, 8)}`);
  });

  // Final Closing Balance bar
  labels.push('Closing');
  dataPairs.push([0, summary.closing_balance]);
  backgroundColors.push('rgba(79, 70, 229, 0.85)'); // Closing Indigo
  borderColors.push('#4f46e5');
  tooltipsMeta.push({
    desc: 'End of Day Cleared Balance',
    type: 'CLOSING',
    diff: summary.closing_balance,
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Balance Trajectory',
        data: dataPairs,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300, // <200-300ms ultra-fast canvas render target
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context: TooltipItem<'bar'>) => {
            const meta = tooltipsMeta[context.dataIndex];
            const pair = dataPairs[context.dataIndex];
            if (!meta || !pair) return '';
            const range = `${formatINR(pair[0])} → ${formatINR(pair[1])}`;
            const diffText =
              meta.type === 'INFLOW'
                ? `+${formatINR(meta.diff)}`
                : meta.type === 'OUTFLOW' || meta.type === 'CONTRA'
                ? formatINR(meta.diff)
                : formatINR(pair[1]);
            return [
              `Impact: ${diffText}`,
              `Level: ${range}`,
              `Narration: ${meta.desc}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: '#1a2333',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: '#1a2333',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 11,
          },
          callback: (value: any) => formatINR(value, false),
        },
      },
    },
  };

  return (
    <div className="p-5 rounded-2xl bg-[#0e1626] border border-[#1a253a] shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            Intraday Balance Waterfall Trajectory
          </h3>
          <p className="text-xs text-slate-400">
            Step-by-step cash transitions from opening to closing position (&lt;200ms render)
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded bg-indigo-500" /> Base
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Inflows
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Outflows
          </span>
          <span className="flex items-center gap-1.5 text-contra-DEFAULT">
            <span className="w-2.5 h-2.5 rounded bg-contra-DEFAULT" /> Contra Pair
          </span>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        <Bar data={chartData} options={chartOptions as any} />
      </div>
    </div>
  );
};
