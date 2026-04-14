import { useState, useEffect } from 'react';
import { Award, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { TrainingStatusBadge, TopicBadge } from './TrainingStatusBadge';
import { format } from 'date-fns';
import { api } from '../../../services/api';

interface WorkerTrainingRecord {
  id: string;
  record_id: string;
  training_topic_key: string;
  topic_label: string;
  topic_color: string | null;
  topic_light_color: string | null;
  training_date: string;
  expiry_date: string | null;
  status: string;
  days_until_expiry: number | null;
  trainer_name: string | null;
  certificate_number: string | null;
  certificate_url: string | null;
  notes: string | null;
}

interface WorkerSummary {
  total: number;
  valid: number;
  expired: number;
  expiring_soon: number;
}

interface Props {
  workerId: string;
}

export function WorkerTrainingPanel({ workerId }: Props) {
  const [records, setRecords] = useState<WorkerTrainingRecord[]>([]);
  const [summary, setSummary] = useState<WorkerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get<{
      summary: WorkerSummary;
      records: WorkerTrainingRecord[];
    }>(`/training/worker/${workerId}/summary`)
      .then(data => {
        setSummary(data.summary);
        setRecords(data.records);
      })
      .catch(err => setError(err.message || 'Failed to load training data'))
      .finally(() => setLoading(false));
  }, [workerId]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '\u2014';
    try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={24} className="text-text-tertiary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-[13px] text-danger-600">{error}</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-14 h-14 rounded-full bg-surface-sunken border border-border flex items-center justify-center mx-auto mb-4">
          <Award size={24} className="text-text-tertiary" />
        </div>
        <h3 className="text-[14px] font-semibold text-text-primary mb-1">No Training Records</h3>
        <p className="text-[13px] text-text-tertiary max-w-[300px] mx-auto">
          This worker has no training records yet. Add records from the Training Matrix module.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Mini Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-surface-sunken rounded-[var(--radius-md)] p-2.5 text-center">
            <p className="text-[16px] font-bold text-text-primary leading-none">{summary.total}</p>
            <p className="text-[10px] font-medium text-text-tertiary mt-1 uppercase tracking-wider">Total</p>
          </div>
          <div className="bg-surface-sunken rounded-[var(--radius-md)] p-2.5 text-center">
            <p className="text-[16px] font-bold leading-none" style={{ color: 'var(--color-health-good-text)' }}>{summary.valid}</p>
            <p className="text-[10px] font-medium text-text-tertiary mt-1 uppercase tracking-wider">Valid</p>
          </div>
          <div className="bg-surface-sunken rounded-[var(--radius-md)] p-2.5 text-center">
            <p className="text-[16px] font-bold leading-none" style={{ color: 'var(--color-health-poor-text)' }}>{summary.expired}</p>
            <p className="text-[10px] font-medium text-text-tertiary mt-1 uppercase tracking-wider">Expired</p>
          </div>
          <div className="bg-surface-sunken rounded-[var(--radius-md)] p-2.5 text-center">
            <p className="text-[16px] font-bold leading-none" style={{ color: 'var(--color-health-fair-text)' }}>{summary.expiring_soon}</p>
            <p className="text-[10px] font-medium text-text-tertiary mt-1 uppercase tracking-wider">Expiring</p>
          </div>
        </div>
      )}

      {/* Records List */}
      <div className="space-y-2">
        {records.map(r => (
          <div
            key={r.id}
            className={`bg-surface border rounded-[var(--radius-md)] p-3 transition-colors hover:bg-canvas ${
              r.status === 'Expired' ? 'border-danger-200 bg-danger-50/20' :
              r.status === 'Expiring Soon' ? 'border-warning-200 bg-warning-50/20' :
              'border-border'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <TopicBadge
                    label={r.topic_label}
                    color={r.topic_color}
                    lightColor={r.topic_light_color}
                  />
                  <TrainingStatusBadge status={r.status} />
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-text-tertiary">
                  <span>Trained: {formatDate(r.training_date)}</span>
                  {r.expiry_date && <span>Expires: {formatDate(r.expiry_date)}</span>}
                  {r.days_until_expiry !== null && r.days_until_expiry >= 0 && (
                    <span className={r.days_until_expiry <= 30 ? 'text-warning-600 font-semibold' : ''}>
                      {r.days_until_expiry}d left
                    </span>
                  )}
                  {r.days_until_expiry !== null && r.days_until_expiry < 0 && (
                    <span className="text-danger-600 font-semibold">{Math.abs(r.days_until_expiry)}d overdue</span>
                  )}
                </div>
                {r.trainer_name && (
                  <p className="text-[11px] text-text-tertiary mt-0.5">Trainer: {r.trainer_name}</p>
                )}
              </div>
              <span className="text-[10px] font-mono text-text-tertiary shrink-0">{r.record_id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
