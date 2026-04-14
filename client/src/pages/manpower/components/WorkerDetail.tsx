import { useState, useEffect } from 'react';
import { X as XIcon, Pencil, Calendar, Building2, User, Phone, MapPin, Shield, Clock, Hash, Globe, AlertTriangle, Copy, ArrowRight, CheckCircle2 } from 'lucide-react';
import { WorkerTrainingPanel } from '../../training/components/WorkerTrainingPanel';
import { InductionBadge, WorkerStatusBadge } from './InductionBadge';
import { WorkerHoursPanel } from './WorkerHoursPanel';
import { format } from 'date-fns';
import type { Worker, WorkerHoursRecord, HoursSummary } from '../hooks/useManpower';

interface Props {
  worker: Worker;
  onClose: () => void;
  onEdit: () => void;
  fetchWorkerDetail: (id: string) => Promise<Worker>;
  fetchWorkerHours: (workerId: string, period?: string) => Promise<{ hours: { data: WorkerHoursRecord[] }; summary: HoursSummary }>;
  recordHours: (workerId: string, data: Record<string, unknown>) => Promise<unknown>;
  deleteHoursRecord: (workerId: string, recordId: string) => Promise<unknown>;
  migrateIqama?: (workerId: string, action: 'copy_to_iqama' | 'move_to_iqama') => Promise<{ message: string; worker: Worker }>;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '\u2014';
  try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '\u2014';
  try { return format(new Date(dateStr), 'dd MMM yyyy, HH:mm'); } catch { return dateStr; }
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: React.ComponentType<{ size: number; className?: string }> }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && <Icon size={15} className="text-text-tertiary mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">{label}</p>
        <p className="text-[13px] text-text-primary mt-0.5">{value || '\u2014'}</p>
      </div>
    </div>
  );
}

function getAvatarColor(name: string): string {
  const colors = ['#1F8034', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2', '#4F46E5', '#B45309', '#0D9488', '#9333EA'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function WorkerDetail({ worker, onClose, onEdit, fetchWorkerDetail, fetchWorkerHours, recordHours, deleteHoursRecord, migrateIqama }: Props) {
  const [detailTab, setDetailTab] = useState<'profile' | 'hours' | 'training'>('profile');
  const [fullWorker, setFullWorker] = useState<Worker>(worker);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [migrateConfirm, setMigrateConfirm] = useState<'copy_to_iqama' | 'move_to_iqama' | null>(null);
  const [migrateLoading, setMigrateLoading] = useState(false);
  const [migrateSuccess, setMigrateSuccess] = useState<string | null>(null);
  const [migrateError, setMigrateError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingDetail(true);
    fetchWorkerDetail(worker.id)
      .then(data => setFullWorker(data))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [worker.id, fetchWorkerDetail]);

  const w = fullWorker;
  const avatarColor = getAvatarColor(w.name);
  const initials = w.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();

  const quickStats = [
    { label: 'Days on Site', value: w.days_on_site > 0 ? `${w.days_on_site}` : '0' },
    { label: 'Total Hours', value: w.hours_stats ? `${w.hours_stats.total_hours}` : '0' },
    { label: 'Days Present', value: w.hours_stats ? `${w.hours_stats.days_present}` : '0' },
    { label: 'Overtime Hrs', value: w.hours_stats ? `${w.hours_stats.total_overtime}` : '0' },
  ];

  const isLegacyReviewCandidate = w.id_number && w.id_number.trim() !== '' && (!w.iqama_number || w.iqama_number.trim() === '');

  const handleMigrateIqama = async (action: 'copy_to_iqama' | 'move_to_iqama') => {
    if (!migrateIqama) return;
    setMigrateLoading(true);
    setMigrateError(null);
    setMigrateSuccess(null);
    try {
      const result = await migrateIqama(w.id, action);
      setMigrateSuccess(result.message);
      setFullWorker(result.worker);
      setMigrateConfirm(null);
    } catch (err: any) {
      setMigrateError(err.message || 'Migration failed');
    } finally {
      setMigrateLoading(false);
    }
  };

  const detailTabs = [
    { key: 'profile' as const, label: 'Profile' },
    { key: 'hours' as const, label: 'Hours' },
    { key: 'training' as const, label: 'Training' },
  ];

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        {/* Header */}
        <div className="sticky top-0 bg-surface z-10 border-b border-border px-6 py-4" style={{ borderTop: '4px solid var(--color-primary-500)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-[16px] font-bold text-white shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[12px] font-mono text-text-tertiary">{w.worker_id}</span>
                <h2 className="text-[16px] font-bold text-text-primary leading-snug mt-0.5">{w.name}</h2>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <WorkerStatusBadge status={w.status} />
                  <InductionBadge status={w.induction_status} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onEdit} className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-warning-600 hover:bg-warning-50 transition-colors" title="Edit">
                <Pencil size={16} />
              </button>
              <button onClick={onClose} className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
                <XIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickStats.map(s => (
              <div key={s.label} className="bg-surface-sunken rounded-[var(--radius-md)] p-3 text-center">
                <p className="text-[18px] font-bold text-text-primary leading-none">{loadingDetail ? '-' : s.value}</p>
                <p className="text-[10px] font-medium text-text-tertiary mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Detail Tabs */}
          <div className="flex gap-0 border-b-2 border-border">
            {detailTabs.map(tab => (
              <button
                key={tab.key}
                className={`px-4 py-2 text-[12px] font-medium border-b-2 -mb-[2px] transition-colors ${
                  detailTab === tab.key
                    ? 'text-primary-600 border-primary-600 font-semibold'
                    : 'text-text-tertiary border-transparent hover:text-text-primary'
                }`}
                onClick={() => setDetailTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {detailTab === 'profile' && (
            <div className="space-y-5">
              {/* Profile Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 bg-surface-sunken rounded-[var(--radius-md)] p-4">
                <DetailRow label="Profession" value={w.profession} icon={Shield} />
                <DetailRow label="Department" value={w.department} icon={Building2} />
                <DetailRow label="Company" value={w.company} icon={Building2} />
                <DetailRow label="Nationality" value={w.nationality} icon={Globe} />
                <DetailRow label="Contact" value={w.contact_number} icon={Phone} />
                <DetailRow label="Emergency Contact" value={w.emergency_contact} icon={Phone} />
                <DetailRow label="ID / Passport No." value={w.id_number} icon={Hash} />
                <DetailRow label="Iqama Number" value={w.iqama_number} icon={Hash} />
                <DetailRow label="Employee Number" value={w.employee_number} icon={Hash} />
                <DetailRow label="Joining Date" value={formatDate(w.joining_date)} icon={Calendar} />
                <DetailRow label="Demobilization Date" value={formatDate(w.demobilization_date)} icon={Calendar} />
              </div>

              {/* Legacy ID Review Panel */}
              {isLegacyReviewCandidate && migrateIqama && (
                <div className="rounded-[var(--radius-md)] border border-warning-300 bg-warning-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={16} className="text-warning-600" />
                    <h3 className="text-[12px] font-semibold text-warning-800 uppercase tracking-wider">Legacy Identity Review</h3>
                  </div>
                  <p className="text-[12px] text-warning-700 mb-3">
                    This worker has an ID / Passport value (<span className="font-mono font-semibold">{w.id_number}</span>) but no Iqama Number.
                    This may be a legacy record where the Iqama was stored in the wrong field.
                  </p>
                  <p className="text-[11px] text-text-tertiary italic mb-3">
                    Review the value and decide the appropriate action. No automatic migration will occur.
                  </p>

                  {migrateSuccess && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-success-50 border border-success-200 rounded-[var(--radius-sm)]">
                      <CheckCircle2 size={14} className="text-success-600" />
                      <span className="text-[12px] text-success-700 font-medium">{migrateSuccess}</span>
                    </div>
                  )}
                  {migrateError && (
                    <div className="mb-3 p-2 bg-danger-50 border border-danger-200 rounded-[var(--radius-sm)]">
                      <span className="text-[12px] text-danger-700 font-medium">{migrateError}</span>
                    </div>
                  )}

                  {!migrateConfirm && !migrateSuccess && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setMigrateConfirm('copy_to_iqama')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors"
                      >
                        <Copy size={12} />
                        Copy to Iqama
                      </button>
                      <button
                        onClick={() => setMigrateConfirm('move_to_iqama')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-warning-700 bg-warning-100 border border-warning-300 rounded-[var(--radius-md)] hover:bg-warning-200 transition-colors"
                      >
                        <ArrowRight size={12} />
                        Move to Iqama
                      </button>
                      <button
                        onClick={() => setMigrateSuccess('Marked as reviewed — no changes made.')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
                      >
                        Leave As-Is
                      </button>
                    </div>
                  )}

                  {migrateConfirm && (
                    <div className="p-3 bg-surface border border-border rounded-[var(--radius-md)]">
                      <p className="text-[12px] text-text-primary font-medium mb-2">
                        {migrateConfirm === 'copy_to_iqama'
                          ? <>Copy "<span className="font-mono">{w.id_number}</span>" into Iqama Number? The ID / Passport field will be kept.</>
                          : <>Move "<span className="font-mono">{w.id_number}</span>" into Iqama Number? The ID / Passport field will be cleared.</>
                        }
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMigrateIqama(migrateConfirm)}
                          disabled={migrateLoading}
                          className="px-3 py-1.5 text-[11px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                          {migrateLoading ? 'Processing...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setMigrateConfirm(null)}
                          disabled={migrateLoading}
                          className="px-3 py-1.5 text-[11px] font-semibold text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Induction Panel */}
              <div className={`rounded-[var(--radius-md)] border p-4 bg-primary-600/10 border-primary-600`}>
                <h3 className="text-[12px] font-semibold text-text-primary uppercase tracking-wider mb-2">EHS Induction</h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <InductionBadge status={w.induction_status} />
                  {w.induction_status === 'Done' && (
                    <>
                      <span className="text-[12px] text-text-secondary">Date: {formatDate(w.induction_date)}</span>
                      {w.induction_by && <span className="text-[12px] text-text-secondary">By: {w.induction_by}</span>}
                    </>
                  )}
                  {w.induction_status !== 'Done' && (
                    <button
                      onClick={onEdit}
                      className="px-3 py-1.5 text-[11px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors"
                    >
                      Mark as Inducted
                    </button>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {w.remarks && (
                <div>
                  <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Remarks</h3>
                  <p className="text-[13px] text-text-primary leading-relaxed bg-surface-sunken rounded-[var(--radius-md)] p-4 whitespace-pre-wrap">
                    {w.remarks}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Hours Tab */}
          {detailTab === 'hours' && (
            <WorkerHoursPanel
              workerId={w.id}
              fetchWorkerHours={fetchWorkerHours}
              recordHours={recordHours}
              deleteHoursRecord={deleteHoursRecord}
            />
          )}

          {/* Training Tab */}
          {detailTab === 'training' && (
            <WorkerTrainingPanel workerId={w.id} />
          )}

          {/* Audit Trail */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
              <Clock size={12} />
              <span>Created {formatDateTime(w.created_at)}</span>
              {w.updated_at !== w.created_at && (
                <span className="ml-2">| Updated {formatDateTime(w.updated_at)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
