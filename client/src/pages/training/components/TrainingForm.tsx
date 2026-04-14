import { useState, useEffect, useRef } from 'react';
import { X as XIcon, Search, AlertTriangle, Upload, File as FileIcon } from 'lucide-react';
import type { TrainingRecord, TrainingTopic } from '../hooks/useTraining';

interface Props {
  record: TrainingRecord | null;
  topics: TrainingTopic[];
  onSubmit: (data: Record<string, unknown> | FormData) => Promise<unknown>;
  onClose: () => void;
  searchWorkers: (q: string) => Promise<{ id: string; worker_id: string; name: string; profession: string | null; company: string | null }[]>;
  checkDuplicate: (workerId: string, topicKey: string, trainingDate: string) => Promise<{ is_exact_duplicate: boolean; existing_record_id: string | null; has_valid_record: boolean }>;
}

const RESULT_STATUSES = ['Completed', 'Passed', 'Failed', 'Attended', 'Absent', 'N/A'];

export function TrainingForm({ record, topics, onSubmit, onClose, searchWorkers, checkDuplicate }: Props) {
  const isEditing = !!record;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    worker_id: record?.worker_id || '',
    training_topic_key: record?.training_topic_key || '',
    training_topic_custom: '',
    training_date: record?.training_date || new Date().toISOString().split('T')[0],
    expiry_date: record?.expiry_date || '',
    next_training_date: record?.next_training_date || '',
    training_duration: record?.training_duration || '',
    trainer_name: record?.trainer_name || '',
    training_provider: record?.training_provider || '',
    training_location: record?.training_location || '',
    certificate_number: record?.certificate_number || '',
    result_status: record?.result_status || 'Completed',
    notes: record?.notes || '',
    verified_by: record?.verified_by || '',
  });

  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [workerSearch, setWorkerSearch] = useState(record?.worker?.name || '');
  const [workerResults, setWorkerResults] = useState<{ id: string; worker_id: string; name: string; profession: string | null; company: string | null }[]>([]);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [selectedWorkerLabel, setSelectedWorkerLabel] = useState(
    record?.worker ? `${record.worker.name} (${record.worker.worker_id})` : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{ is_exact_duplicate: boolean; existing_record_id: string | null; has_valid_record: boolean } | null>(null);

  useEffect(() => {
    if (!workerSearch || workerSearch.length < 2 || isEditing) return;
    const timer = setTimeout(async () => {
      try {
        const results = await searchWorkers(workerSearch);
        setWorkerResults(results);
        setShowWorkerDropdown(true);
      } catch { setWorkerResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [workerSearch, searchWorkers, isEditing]);

  // Auto-calculate expiry when topic or training date changes
  useEffect(() => {
    if (isEditing) return;
    const topic = topics.find(t => t.key === formData.training_topic_key);
    if (topic?.validity_days && formData.training_date) {
      const date = new Date(formData.training_date);
      date.setDate(date.getDate() + topic.validity_days);
      setFormData(prev => ({ ...prev, expiry_date: date.toISOString().split('T')[0] }));
    } else if (topic && !topic.validity_days) {
      setFormData(prev => ({ ...prev, expiry_date: '' }));
    }
  }, [formData.training_topic_key, formData.training_date, topics, isEditing]);

  // Check for duplicates when worker + topic + date are all set
  useEffect(() => {
    if (isEditing || !formData.worker_id || !formData.training_topic_key || !formData.training_date) {
      setDuplicateWarning(null);
      return;
    }
    if (formData.training_topic_key === '__other__') return;
    const timer = setTimeout(async () => {
      try {
        const result = await checkDuplicate(formData.worker_id, formData.training_topic_key, formData.training_date);
        setDuplicateWarning(result.is_exact_duplicate || result.has_valid_record ? result : null);
      } catch { /* ignore */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.worker_id, formData.training_topic_key, formData.training_date, isEditing, checkDuplicate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const submitData = { ...formData };
      if (submitData.training_topic_key === '__other__') {
        submitData.training_topic_key = submitData.training_topic_custom?.trim() || '';
      }
      delete (submitData as any).training_topic_custom;

      if (certificateFile) {
        const fd = new FormData();
        Object.entries(submitData).forEach(([k, v]) => {
          if (v !== '' && v !== null && v !== undefined) fd.append(k, String(v));
        });
        fd.append('certificate_file', certificateFile);
        await onSubmit(fd);
      } else {
        await onSubmit(submitData);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const selectWorker = (w: { id: string; worker_id: string; name: string; profession: string | null }) => {
    setFormData(prev => ({ ...prev, worker_id: w.id }));
    setSelectedWorkerLabel(`${w.name} (${w.worker_id})`);
    setWorkerSearch(w.name);
    setShowWorkerDropdown(false);
  };

  const inputClasses = 'w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all';
  const labelClasses = 'block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5';

  const topicsByCategory: Record<string, TrainingTopic[]> = {};
  topics.forEach(t => {
    if (!topicsByCategory[t.category]) topicsByCategory[t.category] = [];
    topicsByCategory[t.category].push(t);
  });

  const selectedTopic = topics.find(t => t.key === formData.training_topic_key);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        <div className="shrink-0 bg-surface z-10 border-b border-border px-6 py-4" style={{ borderTop: '4px solid var(--color-primary-500)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-text-primary">{isEditing ? 'Edit Training Record' : 'Add Training Record'}</h2>
              <p className="text-[12px] text-text-tertiary mt-0.5">{isEditing ? `Editing ${record.record_id}` : 'Create a new training record'}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
              <XIcon size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-5">
          {error && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">{error}</div>
          )}

          {/* Duplicate Warning */}
          {duplicateWarning && (
            <div className="p-3 bg-warning-50 border border-warning-200 rounded-[var(--radius-md)] flex items-start gap-2">
              <AlertTriangle size={16} className="text-warning-600 mt-0.5 shrink-0" />
              <div className="text-[13px] text-warning-800">
                {duplicateWarning.is_exact_duplicate && (
                  <p className="font-semibold">Exact duplicate detected! A record with the same worker, topic, and date already exists ({duplicateWarning.existing_record_id}).</p>
                )}
                {!duplicateWarning.is_exact_duplicate && duplicateWarning.has_valid_record && (
                  <p>This worker already has a <span className="font-semibold">valid</span> record for this training topic. You can still create a new record for historical tracking.</p>
                )}
              </div>
            </div>
          )}

          {/* Worker Selection */}
          {!isEditing && (
            <div className="relative">
              <label className={labelClasses}>Worker *</label>
              {selectedWorkerLabel && formData.worker_id ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 px-3 py-2 text-[13px] bg-primary-50 border border-primary-200 rounded-[var(--radius-sm)] text-primary-800 font-medium">{selectedWorkerLabel}</span>
                  <button type="button" onClick={() => { setFormData(prev => ({ ...prev, worker_id: '' })); setSelectedWorkerLabel(''); setWorkerSearch(''); setDuplicateWarning(null); }} className="p-1.5 text-text-tertiary hover:text-danger-600"><XIcon size={14} /></button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      value={workerSearch}
                      onChange={e => setWorkerSearch(e.target.value)}
                      placeholder="Search by name or worker ID..."
                      className={`${inputClasses} pl-8`}
                      autoComplete="off"
                    />
                  </div>
                  {showWorkerDropdown && workerResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-surface border border-border rounded-[var(--radius-md)] shadow-lg max-h-[200px] overflow-y-auto">
                      {workerResults.map(w => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => selectWorker(w)}
                          className="w-full text-left px-3 py-2 hover:bg-surface-sunken transition-colors border-b border-border last:border-0"
                        >
                          <p className="text-[13px] font-semibold text-text-primary">{w.name}</p>
                          <p className="text-[11px] text-text-tertiary">{w.worker_id} {w.profession ? `\u00B7 ${w.profession}` : ''} {w.company ? `\u00B7 ${w.company}` : ''}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {isEditing && record?.worker && (
            <div>
              <label className={labelClasses}>Worker</label>
              <span className="px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary block">{record.worker.name} ({record.worker.worker_id})</span>
            </div>
          )}

          {/* Training Topic */}
          <div>
            <label className={labelClasses}>Training Topic *</label>
            <select
              value={formData.training_topic_key}
              onChange={e => { setFormData(prev => ({ ...prev, training_topic_key: e.target.value, training_topic_custom: '' })); }}
              className={inputClasses}
              required
            >
              <option value="">Select a topic...</option>
              {Object.entries(topicsByCategory).map(([cat, items]) => (
                <optgroup key={cat} label={cat}>
                  {items.map(t => (
                    <option key={t.key} value={t.key}>
                      {t.label} {t.is_mandatory ? '(Mandatory)' : ''} {t.validity_days ? `\u2014 ${t.validity_days}d validity` : '\u2014 No expiry'}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="__other__">Other (type manually)</option>
            </select>
            {formData.training_topic_key === '__other__' && (
              <input type="text" value={formData.training_topic_custom} onChange={e => setFormData(prev => ({ ...prev, training_topic_custom: e.target.value }))} placeholder="Enter training topic..." className={`${inputClasses} mt-1.5`} autoFocus />
            )}
            {selectedTopic && selectedTopic.description && (
              <p className="text-[11px] text-text-tertiary mt-1">{selectedTopic.description}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClasses}>Training Date *</label>
              <input type="date" value={formData.training_date} onChange={e => setFormData(prev => ({ ...prev, training_date: e.target.value }))} className={inputClasses} required />
            </div>
            <div>
              <label className={labelClasses}>Expiry Date</label>
              <input type="date" value={formData.expiry_date} onChange={e => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))} className={inputClasses} />
              {selectedTopic && !selectedTopic.validity_days && (
                <p className="text-[10px] text-text-tertiary mt-0.5">No expiry (one-time)</p>
              )}
            </div>
            <div>
              <label className={labelClasses}>Next Training Date</label>
              <input type="date" value={formData.next_training_date} onChange={e => setFormData(prev => ({ ...prev, next_training_date: e.target.value }))} className={inputClasses} />
            </div>
          </div>

          {/* Duration & Result */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Training Duration</label>
              <input type="text" value={formData.training_duration} onChange={e => setFormData(prev => ({ ...prev, training_duration: e.target.value }))} className={inputClasses} placeholder="e.g. 2 hours, 1 day" />
            </div>
            <div>
              <label className={labelClasses}>Result / Status</label>
              <select value={formData.result_status} onChange={e => setFormData(prev => ({ ...prev, result_status: e.target.value }))} className={inputClasses}>
                {RESULT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Trainer & Provider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Trainer Name</label>
              <input type="text" value={formData.trainer_name} onChange={e => setFormData(prev => ({ ...prev, trainer_name: e.target.value }))} className={inputClasses} placeholder="Trainer name" />
            </div>
            <div>
              <label className={labelClasses}>Training Provider</label>
              <input type="text" value={formData.training_provider} onChange={e => setFormData(prev => ({ ...prev, training_provider: e.target.value }))} className={inputClasses} placeholder="Provider / company" />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className={labelClasses}>Location / Venue</label>
            <input type="text" value={formData.training_location} onChange={e => setFormData(prev => ({ ...prev, training_location: e.target.value }))} className={inputClasses} placeholder="On-site, external, online" />
          </div>

          {/* Certificate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Certificate Number</label>
              <input type="text" value={formData.certificate_number} onChange={e => setFormData(prev => ({ ...prev, certificate_number: e.target.value }))} className={inputClasses} placeholder="Certificate reference" />
            </div>
            <div>
              <label className={labelClasses}>Verified By</label>
              <input type="text" value={formData.verified_by} onChange={e => setFormData(prev => ({ ...prev, verified_by: e.target.value }))} className={inputClasses} placeholder="Verifier name" />
            </div>
          </div>

          {/* Certificate Upload */}
          <div>
            <label className={labelClasses}>Certificate / Attachment</label>
            {record?.certificate_file_name && !certificateFile && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-surface-sunken border border-border rounded-[var(--radius-sm)]">
                <FileIcon size={14} className="text-primary-500" />
                <span className="text-[13px] text-text-primary flex-1 truncate">{record.certificate_file_name}</span>
              </div>
            )}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-3 bg-surface-sunken border border-dashed border-border rounded-[var(--radius-sm)] cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
            >
              <Upload size={16} className="text-text-tertiary" />
              <span className="text-[13px] text-text-tertiary">
                {certificateFile ? certificateFile.name : 'Click to upload certificate (PDF, JPG, PNG, DOC - max 10MB)'}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 10 * 1024 * 1024) {
                    setError('File size must be under 10MB');
                    return;
                  }
                  setCertificateFile(file);
                }
              }}
            />
            {certificateFile && (
              <button type="button" onClick={() => { setCertificateFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-[11px] text-danger-600 hover:underline mt-1">Remove selected file</button>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={labelClasses}>Notes / Remarks</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className={`${inputClasses} min-h-[80px] resize-y`}
              placeholder="Additional notes or remarks..."
            />
          </div>

          {/* Actions */}
          <div className="shrink-0 flex justify-end gap-2 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={submitting || (!isEditing && !formData.worker_id) || (duplicateWarning?.is_exact_duplicate ?? false)}
              className="px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {submitting ? 'Saving...' : isEditing ? 'Update Record' : 'Create Record'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
