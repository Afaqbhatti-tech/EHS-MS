import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Clock, MapPin, CalendarRange } from 'lucide-react';
import { useDrills } from '../useDrills';
import type { PlannerData, MockDrill } from '../useDrills';

// ─── Helpers ─────────────────────────────────────

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

// ─── Status chip colors ──────────────────────────

const STATUS_CHIP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Planned:       { bg: '#F3F4F6', border: '#D1D5DB', text: '#374151' },
  Scheduled:     { bg: '#DBEAFE', border: '#93C5FD', text: '#1E40AF' },
  'In Progress': { bg: '#FFF7ED', border: '#FDBA74', text: '#9A3412' },
  Conducted:     { bg: '#EDE9FE', border: '#C4B5FD', text: '#5B21B6' },
  'Under Review':{ bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' },
  Closed:        { bg: '#D1FAE5', border: '#6EE7B7', text: '#065F46' },
  Cancelled:     { bg: '#F3F4F6', border: '#D1D5DB', text: '#6B7280' },
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  Planned:       'bg-neutral-100 text-neutral-700',
  Scheduled:     'bg-blue-100 text-blue-600',
  'In Progress': 'bg-amber-100 text-amber-700',
  Conducted:     'bg-[#EDE9FE] text-[#5B21B6]',
  'Under Review':'bg-amber-50 text-amber-700',
  Closed:        'bg-green-100 text-green-700',
  Cancelled:     'bg-neutral-100 text-neutral-500',
};

function getChipColor(status: string) {
  return STATUS_CHIP_COLORS[status] ?? STATUS_CHIP_COLORS.Planned;
}

// ─── Format date ─────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

// ─── Component ───────────────────────────────────

export default function DrillPlanner() {
  const {
    planner,
    isPlannerLoading,
    plannerMonth,
    plannerYear,
    setPlannerMonth,
    setPlannerYear,
    setSelectedId,
  } = useDrills();

  const now = new Date();
  const [year, setYear] = useState(plannerYear);
  const [month, setMonth] = useState(plannerMonth);

  // Sync local state to hook
  useEffect(() => {
    setPlannerMonth(month);
    setPlannerYear(year);
  }, [month, year, setPlannerMonth, setPlannerYear]);

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

  // Build calendar cells
  const cells: (number | null)[] = useMemo(() => {
    const c: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) c.push(null);
    for (let d = 1; d <= daysInMonth; d++) c.push(d);
    while (c.length % 7 !== 0) c.push(null);
    return c;
  }, [firstDay, daysInMonth]);

  // Group drills by date from this_month
  const drillsByDate = useMemo(() => {
    const map: Record<string, MockDrill[]> = {};
    if (!planner?.this_month) return map;
    for (const drill of planner.this_month) {
      const dateKey = drill.planned_date;
      if (!dateKey) continue;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(drill);
    }
    return map;
  }, [planner]);

  const getDrillsForDay = (day: number): MockDrill[] => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return drillsByDate[dateStr] ?? [];
  };

  const handleDrillClick = (drillId: string) => {
    setSelectedId(drillId);
  };

  // ─── Loading state ─────────────────────────────

  if (isPlannerLoading && !planner) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-surface-sunken animate-pulse rounded-[var(--radius-md)]" />
        <div className="h-[500px] bg-surface-sunken animate-pulse rounded-[var(--radius-md)]" />
      </div>
    );
  }

  const overdueDrills = planner?.overdue ?? [];
  const upcomingDrills = planner?.upcoming ?? [];

  return (
    <div className="space-y-4">
      {/* ── Month Navigation ─────────────────── */}
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

      {/* ── Calendar Grid ────────────────────── */}
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
              return (
                <div
                  key={`empty-${i}`}
                  className="min-h-[80px] sm:min-h-[100px] border-b border-r border-border/50 bg-surface-sunken/30"
                />
              );
            }

            const dayDrills = getDrillsForDay(day);
            const isToday = isCurrentMonth && day === today;

            return (
              <div
                key={`day-${day}`}
                className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-border/50 p-1.5 transition-colors hover:bg-primary-50/20 ${
                  isToday ? 'bg-primary-50 border-primary-300' : ''
                }`}
              >
                {/* Day number */}
                <div className={`text-[12px] font-medium mb-1 ${
                  isToday
                    ? 'text-white bg-primary-600 w-6 h-6 rounded-full flex items-center justify-center'
                    : 'text-text-secondary pl-1'
                }`}>
                  {day}
                </div>

                {/* Drill chips */}
                <div className="space-y-0.5">
                  {dayDrills.slice(0, 3).map(drill => {
                    const colors = getChipColor(drill.status);
                    const typeWord = drill.drill_type ? drill.drill_type.split(' ')[0] : '';
                    const codeDisplay = drill.drill_code.length > 10
                      ? drill.drill_code.slice(0, 10) + '..'
                      : drill.drill_code;

                    return (
                      <div
                        key={drill.id}
                        className="cursor-pointer rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                        style={{
                          backgroundColor: colors.bg,
                          borderLeft: `3px solid ${colors.border}`,
                          color: colors.text,
                        }}
                        onClick={() => handleDrillClick(drill.id)}
                        title={`[${drill.drill_code}] ${drill.title} - ${drill.drill_type} (${drill.status})`}
                      >
                        {codeDisplay} {typeWord && `\u00B7 ${typeWord}`}
                      </div>
                    );
                  })}
                  {dayDrills.length > 3 && (
                    <div className="text-[9px] text-text-tertiary pl-1 font-medium">
                      +{dayDrills.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Status Legend ─────────────────────── */}
      <div className="bg-surface border border-border rounded-[var(--radius-md)] p-3 shadow-sm">
        <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Drill Status</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(STATUS_CHIP_COLORS).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
              />
              <span className="text-[11px] text-text-secondary">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Side Panels: Overdue + Upcoming ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overdue Drills */}
        {overdueDrills.length > 0 && (
          <div className="bg-surface border border-danger-200 rounded-[var(--radius-lg)] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-danger-50 border-b border-danger-200">
              <AlertTriangle size={16} className="text-danger-600" />
              <h3 className="text-[13px] font-bold text-danger-700">
                Overdue Drills ({overdueDrills.length})
              </h3>
            </div>
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {overdueDrills.map(drill => (
                <div
                  key={drill.id}
                  className="p-3 hover:bg-danger-50/30 cursor-pointer transition-colors"
                  onClick={() => handleDrillClick(drill.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-[2px] rounded-full text-[10px] font-medium leading-tight ${STATUS_BADGE_CLASSES[drill.status] ?? 'bg-neutral-100 text-neutral-600'}`}>
                        {drill.status}
                      </span>
                      <p className="text-[11px] font-semibold text-primary-600 mt-1">{drill.drill_code}</p>
                    </div>
                    <span className="text-[10px] font-bold text-danger-600 bg-danger-100 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                      OVERDUE
                    </span>
                  </div>
                  <p className="text-[12px] font-medium text-text-primary truncate">{drill.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <CalendarRange size={12} />
                      {drill.drill_type}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(drill.planned_date)}
                    </span>
                    {drill.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {drill.location}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Drills (Next 30 Days) */}
        <div className={`bg-surface border border-border rounded-[var(--radius-lg)] shadow-sm overflow-hidden ${overdueDrills.length === 0 ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center gap-2 px-4 py-3 bg-surface-sunken border-b border-border">
            <Clock size={16} className="text-text-tertiary" />
            <h3 className="text-[13px] font-bold text-text-primary">
              Upcoming (Next 30 Days)
            </h3>
            {upcomingDrills.length > 0 && (
              <span className="ml-auto text-[11px] font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                {upcomingDrills.length}
              </span>
            )}
          </div>
          {upcomingDrills.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[13px] text-text-secondary">No upcoming drills</p>
              <p className="text-[11px] text-text-tertiary mt-1">Schedule new drills from the register tab</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {upcomingDrills.map(drill => (
                <div
                  key={drill.id}
                  className="p-3 hover:bg-primary-50/20 cursor-pointer transition-colors"
                  onClick={() => handleDrillClick(drill.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-[2px] rounded-full text-[10px] font-medium leading-tight ${STATUS_BADGE_CLASSES[drill.status] ?? 'bg-neutral-100 text-neutral-600'}`}>
                        {drill.status}
                      </span>
                      <p className="text-[11px] font-semibold text-primary-600 mt-1">{drill.drill_code}</p>
                    </div>
                    {drill.erp && (
                      <span className="text-[10px] font-medium text-text-tertiary bg-surface-sunken px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        {drill.erp.erp_code}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] font-medium text-text-primary truncate">{drill.title}</p>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <CalendarRange size={12} />
                      {drill.drill_type}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(drill.planned_date)}
                      {drill.planned_time && ` ${formatTime(drill.planned_time)}`}
                    </span>
                    {drill.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {drill.location}
                      </span>
                    )}
                  </div>
                  {drill.conducted_by_name && (
                    <p className="text-[10px] text-text-tertiary mt-1">
                      Conducted by: <span className="font-medium text-text-secondary">{drill.conducted_by_name}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
