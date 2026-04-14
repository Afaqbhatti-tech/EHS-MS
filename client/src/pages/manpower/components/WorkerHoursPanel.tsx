import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import { HoursEntryForm } from './HoursEntryForm';
import { format } from 'date-fns';
import type { WorkerHoursRecord, HoursSummary } from '../hooks/useManpower';

interface Props {
  workerId: string;
  fetchWorkerHours: (workerId: string, period?: string) => Promise<{ hours: { data: WorkerHoursRecord[] }; summary: HoursSummary }>;
  recordHours: (workerId: string, data: Record<string, unknown>) => Promise<unknown>;
  deleteHoursRecord: (workerId: string, recordId: string) => Promise<unknown>;
}

const PERIODS = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: '', label: 'All Time' },
];

const ATTENDANCE_COLORS: Record<string, string> = {
  Present: 'text-green-800 bg-green-100',
  Absent: 'text-red-800 bg-red-100',
  'Half Day': 'text-amber-800 bg-amber-100',
  Leave: 'text-blue-800 bg-blue-100',
  Holiday: 'text-purple-800 bg-purple-100',
  Off: 'text-gray-800 bg-gray-100',
};

export function WorkerHoursPanel({ workerId, fetchWorkerHours, recordHours, deleteHoursRecord }: Props) {
  const [hours, setHours] = useState<WorkerHoursRecord[]>([]);
  const [summary, setSummary] = useState<HoursSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('month');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHours = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWorkerHours(workerId, period || undefined);
      setHours(data.hours?.data || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Failed to load hours:', err);
    } finally {
      setLoading(false);
    }
  }, [workerId, period, fetchWorkerHours]);

  useEffect(() => {
    loadHours();
  }, [loadHours]);

  const handleRecordHours = async (data: Record<string, unknown>) => {
    await recordHours(workerId, data);
    setShowEntryForm(false);
    loadHours();
  };

  const handleDelete = async (recordId: string) => {
    setDeletingId(recordId);
    try {
      await deleteHoursRecord(workerId, recordId);
      loadHours();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '\u2014';
    try { return format(new Date(dateStr), 'dd MMM'); } catch { return dateStr; }
  };

  const summaryStats = [
    { label: 'Total Hours', value: summary ? `${(summary.total_regular ?? 0)}` : '0', bg: 'from-[#1F8034] to-[#166028]', icon: '⏱' },
    { label: 'Overtime', value: summary ? `${(summary.total_overtime ?? 0)}` : '0', bg: 'from-[#7C3AED] to-[#6D28D9]', icon: '⚡' },
    { label: 'Days Present', value: summary ? `${(summary.days_present ?? 0)}` : '0', bg: 'from-[#0284C7] to-[#0369A1]', icon: '✓' },
    { label: 'Days Recorded', value: summary ? `${(summary.days_recorded ?? 0)}` : '0', bg: 'from-[#0D9488] to-[#0F766E]', icon: '📋' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {summaryStats.map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.bg} rounded-[var(--radius-md)] p-3 text-center shadow-sm`}>
            <p className="text-[18px] font-bold text-white leading-none tracking-tight">{s.value}</p>
            <p className="text-[9px] font-semibold text-white/70 mt-1.5 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Period Selector + Add Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-2.5 py-1.5 text-[11px] font-medium rounded-full border transition-colors ${
                period === p.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-surface text-text-secondary border-border hover:bg-surface-sunken'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowEntryForm(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors"
        >
          <Plus size={13} />
          Record Hours
        </button>
      </div>

      {/* Hours Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-full rounded-[var(--radius-md)]" />
          ))}
        </div>
      ) : hours.length === 0 ? (
        <div className="text-center py-8">
          <Clock size={32} className="text-text-tertiary mx-auto mb-3" />
          <p className="text-[13px] text-text-tertiary">No hours recorded yet</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-sunken border-b border-border">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Date</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Day</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Shift</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Hrs</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">OT</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Status</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Area</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-text-tertiary w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {hours.map(h => (
                  <tr key={h.id} className="border-b border-border last:border-b-0 hover:bg-canvas transition-colors">
                    <td className="px-3 py-2 text-[12px] text-text-primary whitespace-nowrap">{formatDate(h.work_date)}</td>
                    <td className="px-3 py-2 text-[12px] text-text-secondary">{h.day_name || '\u2014'}</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-sunken text-text-secondary">{h.shift}</span>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-text-primary text-right font-medium">{h.hours_worked}</td>
                    <td className="px-3 py-2 text-[12px] text-text-secondary text-right">{h.overtime_hours || 0}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ATTENDANCE_COLORS[h.attendance_status] || 'text-gray-600 bg-gray-100'}`}>
                        {h.attendance_status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-text-tertiary max-w-[80px] truncate">{h.site_area || '\u2014'}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleDelete(h.id)}
                        disabled={deletingId === h.id}
                        className="p-1 rounded text-text-tertiary hover:text-danger-600 hover:bg-danger-50 transition-colors disabled:opacity-30"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hours Entry Modal */}
      {showEntryForm && (
        <HoursEntryForm
          onSubmit={handleRecordHours}
          onClose={() => setShowEntryForm(false)}
        />
      )}
    </div>
  );
}
