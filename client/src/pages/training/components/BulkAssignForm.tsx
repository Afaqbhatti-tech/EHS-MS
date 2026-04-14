import { useState, useEffect } from 'react';
import { X as XIcon, Search, Check, Users, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { TrainingTopic, WorkerSearchResult, BulkPreviewResult, BulkAssignResult } from '../hooks/useTraining';

interface Props {
  topics: TrainingTopic[];
  filterOptions: { professions: string[]; companies: string[] } | null;
  onSubmit: (data: {
    worker_ids: string[];
    training_topic_key: string;
    training_date: string;
    expiry_date?: string;
    next_training_date?: string;
    training_duration?: string;
    trainer_name?: string;
    training_provider?: string;
    training_location?: string;
    result_status?: string;
    notes?: string;
    skip_valid?: boolean;
  }) => Promise<BulkAssignResult>;
  onClose: () => void;
  searchWorkers: (q: string, profession?: string, company?: string) => Promise<WorkerSearchResult[]>;
  bulkPreview: (workerIds: string[], topicKey: string) => Promise<BulkPreviewResult>;
}

const RESULT_STATUSES = ['Completed', 'Passed', 'Failed', 'Attended', 'Absent', 'N/A'];

export function BulkAssignForm({ topics, filterOptions, onSubmit, onClose, searchWorkers, bulkPreview }: Props) {
  const [step, setStep] = useState<'select' | 'preview' | 'result'>('select');
  const [selectedWorkers, setSelectedWorkers] = useState<WorkerSearchResult[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [professionFilter, setProfessionFilter] = useState('');
  const [workerResults, setWorkerResults] = useState<WorkerSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [topicKey, setTopicKey] = useState('');
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [nextTrainingDate, setNextTrainingDate] = useState('');
  const [trainingDuration, setTrainingDuration] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [trainingProvider, setTrainingProvider] = useState('');
  const [trainingLocation, setTrainingLocation] = useState('');
  const [resultStatus, setResultStatus] = useState('Completed');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BulkPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [result, setResult] = useState<BulkAssignResult | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);

  useEffect(() => {
    if (!workerSearch || workerSearch.length < 2) { setWorkerResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchWorkers(workerSearch, professionFilter || undefined);
        setWorkerResults(results.filter(w => !selectedWorkers.find(s => s.id === w.id)));
      } catch { setWorkerResults([]); }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [workerSearch, professionFilter, searchWorkers, selectedWorkers]);

  // Auto-calculate expiry
  useEffect(() => {
    const topic = topics.find(t => t.key === topicKey);
    if (topic?.validity_days && trainingDate) {
      const date = new Date(trainingDate);
      date.setDate(date.getDate() + topic.validity_days);
      setExpiryDate(date.toISOString().split('T')[0]);
    } else if (topic && !topic.validity_days) {
      setExpiryDate('');
    }
  }, [topicKey, trainingDate, topics]);

  // Load all workers for a profession
  const loadByProfession = async () => {
    if (!professionFilter) return;
    setSearchLoading(true);
    try {
      const results = await searchWorkers('', professionFilter);
      const newWorkers = results.filter(w => !selectedWorkers.find(s => s.id === w.id));
      setSelectedWorkers(prev => [...prev, ...newWorkers]);
      setWorkerResults([]);
    } catch { /* ignore */ }
    setSearchLoading(false);
  };

  const toggleWorker = (w: WorkerSearchResult) => {
    setSelectedWorkers(prev => {
      const exists = prev.find(s => s.id === w.id);
      if (exists) return prev.filter(s => s.id !== w.id);
      return [...prev, w];
    });
  };

  const handlePreview = async () => {
    if (selectedWorkers.length === 0 || !topicKey) return;
    setPreviewLoading(true);
    setError(null);
    try {
      const p = await bulkPreview(selectedWorkers.map(w => w.id), topicKey);
      setPreview(p);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Preview failed');
    }
    setPreviewLoading(false);
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await onSubmit({
        worker_ids: selectedWorkers.map(w => w.id),
        training_topic_key: topicKey,
        training_date: trainingDate,
        expiry_date: expiryDate || undefined,
        next_training_date: nextTrainingDate || undefined,
        training_duration: trainingDuration || undefined,
        trainer_name: trainerName || undefined,
        training_provider: trainingProvider || undefined,
        training_location: trainingLocation || undefined,
        result_status: resultStatus || undefined,
        notes: notes || undefined,
        skip_valid: true,
      });
      setResult(res);
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Failed to assign');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses = 'w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all';
  const labelClasses = 'block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5';

  const topicsByCategory: Record<string, TrainingTopic[]> = {};
  topics.forEach(t => {
    if (!topicsByCategory[t.category]) topicsByCategory[t.category] = [];
    topicsByCategory[t.category].push(t);
  });

  const selectedTopicLabel = topics.find(t => t.key === topicKey)?.label || topicKey;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel" style={{ maxWidth: '600px' }}>
        <div className="shrink-0 bg-surface z-10 border-b border-border px-6 py-4" style={{ borderTop: '4px solid var(--color-primary-500)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-text-primary">Bulk Training Assignment</h2>
              <p className="text-[12px] text-text-tertiary mt-0.5">
                {step === 'select' && 'Select workers and training details'}
                {step === 'preview' && 'Review assignment summary before confirming'}
                {step === 'result' && 'Assignment results'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
              <XIcon size={18} />
            </button>
          </div>
        </div>

        {/* ── Result Step ── */}
        {step === 'result' && result && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-primary-600" />
              </div>
              <h3 className="text-[16px] font-bold text-text-primary mb-2">Assignment Complete</h3>
              <p className="text-[14px] text-text-secondary">{result.created_count} records created for {selectedTopicLabel}</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between px-4 py-2.5 bg-success-50 border border-success-200 rounded-[var(--radius-md)]">
                <span className="text-[13px] font-medium text-success-800">Created</span>
                <span className="text-[13px] font-bold text-success-800">{result.created_count}</span>
              </div>
              {result.skipped_count > 0 && (
                <div>
                  <button onClick={() => setShowSkipped(!showSkipped)} className="w-full flex justify-between items-center px-4 py-2.5 bg-warning-50 border border-warning-200 rounded-[var(--radius-md)]">
                    <span className="text-[13px] font-medium text-warning-800">Skipped (already valid)</span>
                    <span className="flex items-center gap-1 text-[13px] font-bold text-warning-800">
                      {result.skipped_count}
                      {showSkipped ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>
                  {showSkipped && result.skipped.length > 0 && (
                    <div className="mt-1 border border-border rounded-[var(--radius-sm)] max-h-[150px] overflow-y-auto">
                      {result.skipped.map((s, i) => (
                        <div key={i} className="px-3 py-1.5 text-[12px] text-text-secondary border-b border-border last:border-0">
                          {s.worker_name} ({s.worker_code})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {result.error_count > 0 && (
                <div className="flex justify-between px-4 py-2.5 bg-danger-50 border border-danger-200 rounded-[var(--radius-md)]">
                  <span className="text-[13px] font-medium text-danger-800">Errors</span>
                  <span className="text-[13px] font-bold text-danger-800">{result.error_count}</span>
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <button onClick={onClose} className="px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs">
                Close
              </button>
            </div>
          </div>
        )}

        {/* ── Preview Step ── */}
        {step === 'preview' && preview && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-5">
            <h3 className="text-[14px] font-bold text-text-primary">Assignment Summary</h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-surface-sunken rounded-[var(--radius-md)] text-center">
                <p className="text-[20px] font-bold text-text-primary">{preview.total_selected}</p>
                <p className="text-[11px] text-text-tertiary">Selected</p>
              </div>
              <div className="p-3 bg-success-50 rounded-[var(--radius-md)] text-center">
                <p className="text-[20px] font-bold text-success-700">{preview.eligible_count}</p>
                <p className="text-[11px] text-success-600">To Assign</p>
              </div>
              <div className="p-3 bg-warning-50 rounded-[var(--radius-md)] text-center">
                <p className="text-[20px] font-bold text-warning-700">{preview.already_valid_count}</p>
                <p className="text-[11px] text-warning-600">Skipping</p>
              </div>
            </div>

            <div className="p-3 bg-surface-sunken rounded-[var(--radius-md)]">
              <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1">Topic</p>
              <p className="text-[13px] font-semibold text-text-primary">{selectedTopicLabel}</p>
              <div className="flex gap-4 mt-2 text-[12px] text-text-secondary">
                <span>Date: {trainingDate}</span>
                {expiryDate && <span>Expiry: {expiryDate}</span>}
                {trainerName && <span>Trainer: {trainerName}</span>}
              </div>
            </div>

            {preview.already_valid_count > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-warning-500" />
                  <span className="text-[12px] font-semibold text-warning-700">Workers with valid records (will be skipped):</span>
                </div>
                <div className="border border-border rounded-[var(--radius-sm)] max-h-[120px] overflow-y-auto">
                  {preview.already_valid.map(w => (
                    <div key={w.id} className="px-3 py-1.5 text-[12px] text-text-secondary border-b border-border last:border-0">
                      {w.name} ({w.worker_id}) {w.profession && <span className="text-text-tertiary">- {w.profession}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.eligible_count > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-text-secondary mb-2">Workers to receive training:</p>
                <div className="border border-border rounded-[var(--radius-sm)] max-h-[150px] overflow-y-auto">
                  {preview.eligible.map(w => (
                    <div key={w.id} className="px-3 py-1.5 text-[12px] text-text-primary border-b border-border last:border-0">
                      {w.name} ({w.worker_id}) {w.profession && <span className="text-text-tertiary">- {w.profession}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">{error}</div>
            )}

            <div className="flex justify-between gap-2 pt-4 border-t border-border">
              <button type="button" onClick={() => setStep('select')} className="px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">Back</button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || preview.eligible_count === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                <Users size={15} />
                {submitting ? 'Assigning...' : `Confirm & Assign (${preview.eligible_count})`}
              </button>
            </div>
          </div>
        )}

        {/* ── Select Step ── */}
        {step === 'select' && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-5">
            {error && (
              <div className="p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">{error}</div>
            )}

            {/* Profession Filter + Select All */}
            <div>
              <label className={labelClasses}>Filter by Trade / Profession</label>
              <div className="flex gap-2">
                <select value={professionFilter} onChange={e => setProfessionFilter(e.target.value)} className={`${inputClasses} flex-1`}>
                  <option value="">All Professions</option>
                  {(filterOptions?.professions || []).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {professionFilter && (
                  <button type="button" onClick={loadByProfession} disabled={searchLoading} className="px-3 py-2 text-[12px] font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-[var(--radius-sm)] hover:bg-primary-100 transition-colors whitespace-nowrap">
                    {searchLoading ? 'Loading...' : `Select All ${professionFilter}s`}
                  </button>
                )}
              </div>
            </div>

            {/* Worker Search */}
            <div>
              <label className={labelClasses}>Search & Select Workers * ({selectedWorkers.length} selected)</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={workerSearch}
                  onChange={e => setWorkerSearch(e.target.value)}
                  placeholder="Search workers to add..."
                  className={`${inputClasses} pl-8`}
                  autoComplete="off"
                />
              </div>
              {workerResults.length > 0 && (
                <div className="mt-1 bg-surface border border-border rounded-[var(--radius-md)] shadow-lg max-h-[180px] overflow-y-auto">
                  {workerResults.map(w => (
                    <button key={w.id} type="button" onClick={() => toggleWorker(w)} className="w-full text-left px-3 py-2 hover:bg-surface-sunken transition-colors border-b border-border last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-semibold text-text-primary">{w.name}</p>
                          <p className="text-[11px] text-text-tertiary">{w.worker_id} {w.profession ? `\u00B7 ${w.profession}` : ''}</p>
                        </div>
                        <span className="text-[10px] text-text-tertiary">{w.valid_count}V / {w.expired_count}E</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Workers */}
            {selectedWorkers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">{selectedWorkers.length} Workers Selected</span>
                  <button type="button" onClick={() => setSelectedWorkers([])} className="text-[11px] text-danger-600 hover:underline">Clear All</button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                  {selectedWorkers.map(w => (
                    <span key={w.id} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-primary-50 text-primary-700 border border-primary-200 rounded-full">
                      {w.name}
                      <button type="button" onClick={() => toggleWorker(w)} className="hover:text-danger-600"><XIcon size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Topic */}
            <div>
              <label className={labelClasses}>Training Topic *</label>
              <select value={topicKey} onChange={e => setTopicKey(e.target.value)} className={inputClasses} required>
                <option value="">Select a topic...</option>
                {Object.entries(topicsByCategory).map(([cat, items]) => (
                  <optgroup key={cat} label={cat}>
                    {items.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClasses}>Training Date *</label>
                <input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} className={inputClasses} required />
              </div>
              <div>
                <label className={labelClasses}>Expiry Date</label>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>Next Training Date</label>
                <input type="date" value={nextTrainingDate} onChange={e => setNextTrainingDate(e.target.value)} className={inputClasses} />
              </div>
            </div>

            {/* Duration & Result */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Duration</label>
                <input type="text" value={trainingDuration} onChange={e => setTrainingDuration(e.target.value)} className={inputClasses} placeholder="e.g. 2 hours" />
              </div>
              <div>
                <label className={labelClasses}>Result</label>
                <select value={resultStatus} onChange={e => setResultStatus(e.target.value)} className={inputClasses}>
                  {RESULT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Trainer, Provider & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClasses}>Trainer</label>
                <input type="text" value={trainerName} onChange={e => setTrainerName(e.target.value)} className={inputClasses} placeholder="Trainer" />
              </div>
              <div>
                <label className={labelClasses}>Provider</label>
                <input type="text" value={trainingProvider} onChange={e => setTrainingProvider(e.target.value)} className={inputClasses} placeholder="Provider" />
              </div>
              <div>
                <label className={labelClasses}>Location</label>
                <input type="text" value={trainingLocation} onChange={e => setTrainingLocation(e.target.value)} className={inputClasses} placeholder="Location" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={labelClasses}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClasses} min-h-[60px] resize-y`} placeholder="Notes..." />
            </div>

            {/* Actions */}
            <div className="shrink-0 flex justify-end gap-2 pt-4 border-t border-border">
              <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">Cancel</button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewLoading || selectedWorkers.length === 0 || !topicKey}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                <Users size={15} />
                {previewLoading ? 'Loading Preview...' : `Preview Assignment (${selectedWorkers.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
