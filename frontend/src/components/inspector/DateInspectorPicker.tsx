import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { formatDateIndian } from '@/lib/formatters';

interface DateInspectorPickerProps {
  currentDate: string; // YYYY-MM-DD
  onDateChange: (newDate: string) => void;
}

export const DateInspectorPicker: React.FC<DateInspectorPickerProps> = ({
  currentDate,
  onDateChange,
}) => {
  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const quickDates = [
    { label: 'Target Demo Date', value: '2026-10-25' },
    { label: 'Day Before', value: '2026-10-24' },
    { label: 'Day After', value: '2026-10-26' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0e1626] border border-[#1a253a] shadow-lg">
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrevDay}
          className="w-8 h-8 rounded-lg bg-[#141d31] hover:bg-[#1a263f] border border-[#21304a] text-slate-300 flex items-center justify-center transition-colors"
          title="Previous Business Day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="relative flex items-center bg-[#141d31] border border-[#21304a] px-3.5 py-1.5 rounded-xl">
          <CalendarIcon className="w-4 h-4 text-brand-400 mr-2 shrink-0" />
          <span className="font-semibold text-slate-100 text-sm font-mono tracking-wide mr-3">
            {formatDateIndian(currentDate)}
          </span>
          <input
            type="date"
            value={currentDate}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800">
            Select
          </span>
        </div>

        <button
          onClick={handleNextDay}
          className="w-8 h-8 rounded-lg bg-[#141d31] hover:bg-[#1a263f] border border-[#21304a] text-slate-300 flex items-center justify-center transition-colors"
          title="Next Business Day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Jump Shortcuts */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">Quick Jump:</span>
        {quickDates.map((q) => (
          <button
            key={q.value}
            onClick={() => onDateChange(q.value)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              currentDate === q.value
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                : 'bg-[#141d31] hover:bg-[#1a263f] text-slate-300 border border-[#21304a]'
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
};
