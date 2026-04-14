import { useState, useRef } from 'react';
import { X as XIcon, Calendar, MapPin, User, Award, Clock, FileText, Upload, Trash2, Users, History } from 'lucide-react';
import { TrainingStatusBadge } from './TrainingStatusBadge';
import type { TrainingRecord } from '../hooks/useTraining';

interface Props {
  record: TrainingRecord;
  onClose: () => void;
  onEdit?: (record: TrainingRecord) => void;
  onDelete?: (id: string) => void;
  onUploadCertificate?: (recordId: string, file: File) => Promise<unknown>;
  onRemoveCertificate?: (recordId: string) => Promise<unknown>;
}

export function TrainingDetail({ record, onClose, onEdit, onDelete, onUploadCertificate, onRemoveCertificate }: Props) {
  const [activeTab, setActiveTab] = useState<'details' | 'audit'>('details');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadCertificate) return;
    if (file.size > 10 * 1024 * 1024) return;
    setUploading(true);
    try {
      await onUploadCertificate(record.id, file);
    } catch { /* handled by parent */ }
    setUploading(false);
  };

  const statusColors: Record<string, string> = {
    Valid: 'bg-success-50 border-success-200 text-success-800',
    Expired: 'bg-danger-50 border-danger-200 text-danger-800',
    'Expiring Soon': 'bg-warning-50 border-warning-200 text-warning-800',
    Pending: 'bg-amber-50 border-amber-200 text-amber-800',
    'Not Required': 'bg-gray-50 border-gray-200 text-gray-600',
  };

  const daysText = record.days_until_expiry !== null
    ? record.days_until_expiry >= 0
      ? `${record.days_until_expiry} days remaining`
      : `${Math.abs(record.days_until_expiry)} days overdue`
    : 'No expiry';

  const labelClasses = 'text-[11px] font-semibold text-text-tertiary uppercase tracking-wider';
  const valueClasses = 'text-[13px] text-text-primary mt-0.5';

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel" style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div className="shrink-0 bg-surface z-10 border-b border-border px-6 py-4" style={{ borderTop: '4px solid var(--color-primary-500)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrainingStatusBadge status={record.status} />
              {record.result_status && record.result_status !== 'N/A' && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-surface-sunken border border-border rounded-full text-text-secondary">{record.result_status}</span>
              )}
              {record.is_bulk_assignment && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                  <Users size={10} /> Bulk
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
              <XIcon size={18} />
            </button>
          </div>
          <h2 className="text-[16px] font-bold text-text-primary">{record.topic_label}</h2>
          <p className="text-[12px] text-text-tertiary mt-0.5">{record.record_id}</p>

          {record.expiry_date && (
            <div className={`mt-3 px-3 py-2 rounded-[var(--radius-sm)] border text-[12px] font-medium ${statusColors[record.status] || ''}`}>
              {daysText}
            </div>
          )}
        </div>

        {/* Tab Nav */}
        <div className="flex border-b border-border">
          {[
            { key: 'details' as const, label: 'Details' },
            { key: 'audit' as const, label: 'Audit Trail' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2.5 text-[12px] font-semibold transition-colors ${activeTab === tab.key
                ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/30'
                : 'text-text-tertiary hover:text-text-primary hover:bg-surface-sunken'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Worker Info */}
              {record.worker && (
                <div className="p-4 bg-surface-sunken rounded-[var(--radius-md)] border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <User size={14} className="text-text-tertiary" />
                    <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Worker</span>
                  </div>
                  <p className="text-[14px] font-semibold text-text-primary">{record.worker.name}</p>
                  <p className="text-[12px] text-text-secondary">{record.worker.worker_id} {record.worker.profession ? `\u00B7 ${record.worker.profession}` : ''} {record.worker.company ? `\u00B7 ${record.worker.company}` : ''}</p>
                </div>
              )}

              {/* Training Details Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-text-tertiary" />
                    <p className={labelClasses}>Training Date</p>
                  </div>
                  <p className={valueClasses}>{record.training_date || '-'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-text-tertiary" />
                    <p className={labelClasses}>Expiry Date</p>
                  </div>
                  <p className={valueClasses}>{record.expiry_date || 'No expiry'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-text-tertiary" />
                    <p className={labelClasses}>Next Training Date</p>
                  </div>
                  <p className={valueClasses}>{record.next_training_date || '-'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-text-tertiary" />
                    <p className={labelClasses}>Duration</p>
                  </div>
                  <p className={valueClasses}>{record.training_duration || '-'}</p>
                </div>
                <div>
                  <p className={labelClasses}>Result</p>
                  <p className={valueClasses}>{record.result_status || '-'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-text-tertiary" />
                    <p className={labelClasses}>Trainer</p>
                  </div>
                  <p className={valueClasses}>{record.trainer_name || '-'}</p>
                </div>
                <div>
                  <p className={labelClasses}>Provider</p>
                  <p className={valueClasses}>{record.training_provider || '-'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-text-tertiary" />
                    <p className={labelClasses}>Location</p>
                  </div>
                  <p className={valueClasses}>{record.training_location || '-'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Award size={12} className="text-text-tertiary" />
                    <p className={labelClasses}>Certificate No.</p>
                  </div>
                  <p className={valueClasses}>{record.certificate_number || '-'}</p>
                </div>
                <div>
                  <p className={labelClasses}>Verified By</p>
                  <p className={valueClasses}>{record.verified_by || '-'}</p>
                </div>
              </div>

              {/* Certificate File */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText size={12} className="text-text-tertiary" />
                  <p className={labelClasses}>Certificate / Attachment</p>
                </div>
                {record.certificate_file_name ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-surface-sunken border border-border rounded-[var(--radius-sm)]">
                    <FileText size={14} className="text-primary-500" />
                    {record.certificate_url ? (
                      <a href={record.certificate_url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-primary-600 hover:underline flex-1 truncate">{record.certificate_file_name}</a>
                    ) : (
                      <span className="text-[13px] text-text-primary flex-1 truncate">{record.certificate_file_name}</span>
                    )}
                    {onRemoveCertificate && (
                      <button onClick={() => onRemoveCertificate(record.id)} className="p-1 text-text-tertiary hover:text-danger-600"><Trash2 size={14} /></button>
                    )}
                  </div>
                ) : (
                  <div>
                    {onUploadCertificate ? (
                      <>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="flex items-center gap-2 px-3 py-2.5 w-full bg-surface-sunken border border-dashed border-border rounded-[var(--radius-sm)] hover:border-primary-400 hover:bg-primary-50/30 transition-colors text-[13px] text-text-tertiary"
                        >
                          <Upload size={14} />
                          {uploading ? 'Uploading...' : 'Upload certificate'}
                        </button>
                        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleUpload} />
                      </>
                    ) : (
                      <p className="text-[13px] text-text-tertiary">No attachment</p>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              {record.notes && (
                <div>
                  <p className={labelClasses}>Notes</p>
                  <p className="text-[13px] text-text-secondary mt-1 whitespace-pre-wrap">{record.notes}</p>
                </div>
              )}

              {/* Bulk Assignment Info */}
              {record.is_bulk_assignment && record.bulk_assignment_id && (
                <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-[var(--radius-sm)]">
                  <p className="text-[11px] text-purple-600 font-semibold">Bulk Assignment</p>
                  <p className="text-[12px] text-purple-700 mt-0.5">{record.bulk_assignment_id}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-4 border-t border-border text-[11px] text-text-tertiary space-y-1">
                <p>Created: {record.created_at ? new Date(record.created_at).toLocaleString() : '-'}</p>
                <p>Updated: {record.updated_at ? new Date(record.updated_at).toLocaleString() : '-'}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {onEdit && (
                  <button onClick={() => onEdit(record)} className="flex-1 px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">Edit</button>
                )}
                {onDelete && (
                  <button onClick={() => { if (confirm('Delete this training record?')) onDelete(record.id); }} className="px-4 py-2 text-[13px] font-medium text-danger-600 bg-surface border border-danger-200 rounded-[var(--radius-md)] hover:bg-danger-50 transition-colors">Delete</button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-3">
              {record.audit_logs && record.audit_logs.length > 0 ? (
                record.audit_logs.map(log => (
                  <div key={log.id} className="flex gap-3 items-start">
                    <div className="mt-1 w-2 h-2 rounded-full bg-primary-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-text-primary">{log.description}</p>
                      <p className="text-[11px] text-text-tertiary mt-0.5">
                        {log.user_name} &middot; {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <History size={24} className="text-text-tertiary mx-auto mb-2" />
                  <p className="text-[13px] text-text-tertiary">No audit logs available</p>
                  <p className="text-[11px] text-text-tertiary mt-1">View the record detail to load audit trail</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
