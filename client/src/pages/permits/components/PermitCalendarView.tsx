import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PERMIT_TYPES, getPermitType } from '../config/permitTypes';
import type { CalendarPermit } from '../hooks/usePermits';

interface Props {
  calendarData: CalendarPermit[];
  onMonthChange: (month: number, year: number) => void;
  onPermitClick: (permit: CalendarPermit) => void;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function PermitCalendarView({ calendarData, onMonthChange, onPermitClick }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    onMonthChange(month, year);
  }, [month, year, onMonthChange]);

  const goToPrev = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const goToNext = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const goToToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = now.getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Get permits for a specific day
  const getPermitsForDay = (day: number): CalendarPermit[] => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarData.filter(p => {
      if (p.permit_date === dateStr) return true;
      if (p.permit_date_end && p.permit_date <= dateStr && p.permit_date_end >= dateStr) return true;
      return false;
    });
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between bg-surface border border-border rounded-[var(--radius-md)] p-3 shadow-sm">
        <button
          onClick={goToPrev}
          className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-[16px] font-bold text-text-primary">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          {!isCurrentMonth && (
            <button
              onClick={goToToday}
              className="px-2.5 py-1 text-[11px] font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-full hover:bg-primary-100 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={goToNext}
          className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-surface-sunken border-b border-border">
          {DAY_NAMES.map(d => (
            <div key={d} className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={i} className="min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] border-b border-r border-border bg-surface-sunken/30" />;
            }

            const dayPermits = getPermitsForDay(day);
            const isToday = isCurrentMonth && day === today;

            return (
              <div
                key={i}
                className={`min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] border-b border-r border-border p-1.5 transition-colors hover:bg-primary-50/20 ${
                  isToday ? 'bg-primary-50/40' : ''
                }`}
              >
                <div className={`text-[12px] font-medium mb-1 ${
                  isToday
                    ? 'text-white bg-primary-600 w-6 h-6 rounded-full flex items-center justify-center'
                    : 'text-text-secondary pl-1'
                }`}>
                  {day}
                </div>

                <div className="space-y-0.5">
                  {dayPermits.slice(0, 3).map(p => (
                    <div
                      key={p.id}
                      className="cursor-pointer rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                      style={{
                        backgroundColor: p.lightColor,
                        borderLeft: `3px solid ${p.color}`,
                        color: p.textColor,
                      }}
                      onClick={() => onPermitClick(p)}
                      title={`[${p.abbr}] ${p.title} — ${p.area || ''}`}
                    >
                      [{p.abbr}] {p.title.length > 16 ? p.title.slice(0, 16) + '...' : p.title}
                    </div>
                  ))}
                  {dayPermits.length > 3 && (
                    <div className="text-[9px] text-text-tertiary pl-1">
                      +{dayPermits.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Type legend */}
      <div className="bg-surface border border-border rounded-[var(--radius-md)] p-3 shadow-sm">
        <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Permit Types</p>
        <div className="flex flex-wrap gap-3">
          {PERMIT_TYPES.map(t => (
            <div key={t.key} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.color }} />
              <span className="text-[11px] text-text-secondary">{t.abbr} - {t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
