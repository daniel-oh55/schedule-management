import { addDays, endOfMonth, format, getDay, isSameDay, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MiniCalendarProps {
  monthIso: string;
  selectedIso: string;
  highlightedWeekday?: number | null;
  onMonthChange: (iso: string) => void;
  onSelectDate: (dateText: string) => void;
}

export function MiniCalendar({
  monthIso,
  selectedIso,
  highlightedWeekday,
  onMonthChange,
  onSelectDate,
}: MiniCalendarProps) {
  const month = new Date(monthIso);
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const firstOffset = getDay(start);
  const cells = Array.from({ length: firstOffset }, () => null as Date | null);

  for (let date = start; date <= end; date = addDays(date, 1)) {
    cells.push(date);
  }

  return (
    <div className="w-60 border border-slate-300 bg-white">
      <div className="flex h-9 items-center justify-between border-b border-slate-300 bg-slate-100 px-2">
        <button
          type="button"
          className="action-button h-7 w-7 justify-center px-0"
          onClick={() => onMonthChange(addDays(start, -1).toISOString())}
          title="Previous month"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="text-sm font-semibold">{format(month, "yyyy-MM")}</div>
        <button
          type="button"
          className="action-button h-7 w-7 justify-center px-0"
          onClick={() => onMonthChange(addDays(end, 1).toISOString())}
          title="Next month"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-200 text-center text-[11px] font-semibold text-slate-500">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div key={`${day}-${index}`} className="py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center text-[12px]">
        {cells.map((cell, index) => {
          const selected = cell ? isSameDay(cell, new Date(selectedIso)) : false;
          const highlighted = cell && highlightedWeekday !== null && highlightedWeekday !== undefined
            ? getDay(cell) === highlightedWeekday
            : false;

          return (
            <button
              key={cell?.toISOString() ?? `empty-${index}`}
              type="button"
              className={`h-8 border-b border-r border-slate-100 ${
                selected
                  ? "bg-port font-bold text-white"
                  : highlighted
                    ? "bg-amber-100 font-semibold text-amber-950 hover:bg-amber-200"
                    : "bg-white text-slate-700 hover:bg-blue-50"
              }`}
              disabled={!cell}
              onClick={() => cell && onSelectDate(format(cell, "yyyy-MM-dd"))}
            >
              {cell ? format(cell, "d") : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
