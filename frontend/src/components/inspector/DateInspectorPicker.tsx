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
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#072b27] border border-[#134e48] shadow-lg">
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrevDay}
          className="w-8 h-8 rounded-lg bg-[#031d1a] hover:bg-[#0c3a35] border border-[#134e48] text-[#F0EDE4] flex items-center justify-center transition-colors"
          title="Previous Business Day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="relative flex items-center bg-[#031d1a] border border-[#134e48] px-3.5 py-1.5 rounded-xl">
          <CalendarIcon className="w-4 h-4 text-[#F0EDE4] mr-2 shrink-0" />
          <span className="font-semibold text-[#F0EDE4] text-sm font-mono tracking-wide mr-3">
            {formatDateIndian(currentDate)}
          </span>
          <input
            type="date"
            value={currentDate}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          />
          <span className="text-[10px] text-[#a2b8b5] uppercase font-mono px-1.5 py-0.5 rounded bg-[#072b27] border border-[#134e48]">
            Select
          </span>
        </div>

        <button
          onClick={handleNextDay}
          className="w-8 h-8 rounded-lg bg-[#031d1a] hover:bg-[#0c3a35] border border-[#134e48] text-[#F0EDE4] flex items-center justify-center transition-colors"
          title="Next Business Day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Jump Shortcuts */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#a2b8b5] font-medium hidden sm:inline">Quick Jump:</span>
        {quickDates.map((q) => (
          <button
            key={q.value}
            onClick={() => onDateChange(q.value)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              currentDate === q.value
                ? 'bg-[#F0EDE4] text-[#004741] font-bold shadow-md'
                : 'bg-[#031d1a] hover:bg-[#0c3a35] text-[#F0EDE4] border border-[#134e48]'
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
};
