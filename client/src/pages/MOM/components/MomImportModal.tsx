import { useState, useRef } from 'react';
import { Upload, FileText, AlertTriangle, Check, X as XIcon, ChevronDown, ChevronRight, Eye, Loader2 } from 'lucide-react';
import type { ExtractedPoint, ImportPreviewResult, MomListItem } from '../hooks/useMom';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (file: File, options?: {
    week_number?: number; year?: number; title?: string; meeting_date?: string;
    mode?: 'create' | 'merge' | 'replace'; preview_only?: boolean;
  }) => Promise<any>;
  onConfirmImport: (params: {
    file_path: string; week_number: number; year: number; title: string;
    meeting_date?: string; mode: 'create' | 'merge' | 'replace';
    points?: ExtractedPoint[]; skip_indices?: number[];
  }) => Promise<any>;
}

type Step = 'upload' | 'preview' | 'duplicate' | 'result';

const STATUS_COLORS: Record<string, string> = {
  Open: '#DC2626', 'In Progress': '#EA580C', Closed: '#16A34A', Resolved: '#16A34A',
  Pending: '#9333EA', Blocked: '#991B1B', 'Carried Forward': '#6B7280',
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#DC2626', High: '#EA580C', Medium: '#CA8A04', Low: '#16A34A',
};

export function MomImportModal({ open, onClose, onImport, onConfirmImport }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview state
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [skipIndices, setSkipIndices] = useState<Set<number>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Metadata override
  const [weekNumber, setWeekNumber] = useState<number>(0);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [importMode, setImportMode] = useState<'create' | 'merge' | 'replace'>('create');

  // Result
  const [result, setResult] = useState<{ message: string; created: number; skipped?: number; total: number } | null>(null);

  // Duplicate state
  const [existingMom, setExistingMom] = useState<MomListItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setLoading(false);
    setError(null);
    setPreview(null);
    setSkipIndices(new Set());
    setExpandedRows(new Set());
    setResult(null);
    setExistingMom(null);
    setImportMode('create');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!open) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await onImport(file, { preview_only: true });
      if (res.status === 409) {
        // Duplicate week
        setExistingMom(res.existing_mom || null);
        setPreview(res);
        if (res.document_metadata) {
          setWeekNumber(res.document_metadata.week_number);
          setYear(res.document_metadata.year);
          setTitle(res.document_metadata.title || '');
          setMeetingDate(res.document_metadata.meeting_date || '');
        }
        setStep('duplicate');
      } else {
        setPreview(res);
        if (res.document_metadata) {
          setWeekNumber(res.document_metadata.week_number);
          setYear(res.document_metadata.year);
          setTitle(res.document_metadata.title || '');
          setMeetingDate(res.document_metadata.meeting_date || '');
        }
        setStep('preview');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze document');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const res = await onConfirmImport({
        file_path: preview.file_path,
        week_number: weekNumber,
        year: year,
        title: title,
        meeting_date: meetingDate || undefined,
        mode: importMode,
        points: preview.extracted_points,
        skip_indices: Array.from(skipIndices),
      });
      setResult({
        message: res.message,
        created: res.summary?.created ?? 0,
        skipped: res.summary?.skipped,
        total: res.summary?.total_points ?? 0,
      });
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const opts: any = { mode: importMode };
      if (weekNumber) opts.week_number = weekNumber;
      if (year) opts.year = year;
      if (title) opts.title = title;
      if (meetingDate) opts.meeting_date = meetingDate;

      const res = await onImport(file, opts);
      if (res.status === 409) {
        setExistingMom(res.existing_mom || null);
        setPreview(res);
        if (res.document_metadata) {
          setWeekNumber(res.document_metadata.week_number);
          setYear(res.document_metadata.year);
          setTitle(res.document_metadata.title || '');
          setMeetingDate(res.document_metadata.meeting_date || '');
        }
        setStep('duplicate');
      } else {
        setResult({
          message: res.message,
          created: res.summary?.created ?? 0,
          skipped: res.summary?.skipped,
          total: res.summary?.total_points ?? 0,
        });
        setStep('result');
      }
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleSkip = (idx: number) => {
    setSkipIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleExpand = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const colors: Record<string, string> = {
      pdf: '#DC2626', doc: '#2563EB', docx: '#2563EB', xls: '#16A34A',
      xlsx: '#16A34A', csv: '#16A34A', ppt: '#EA580C', pptx: '#EA580C', txt: '#6B7280',
    };
    return colors[ext || ''] || '#6B7280';
  };

  const extractedPoints = preview?.extracted_points || [];
  const activePoints = extractedPoints.filter((_, i) => !skipIndices.has(i));

  return (
    <div className="mom-drawer-overlay" onClick={handleClose}>
      <div className="mom-drawer" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="mom-drawer__header">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {step === 'upload' && 'Import Weekly MOM Document'}
              {step === 'preview' && 'Review Extracted Tasks'}
              {step === 'duplicate' && 'Week Already Exists'}
              {step === 'result' && 'Import Complete'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {step === 'upload' && 'Upload a document to extract weekly tasks and action points'}
              {step === 'preview' && `${activePoints.length} tasks will be imported`}
              {step === 'duplicate' && 'Choose how to handle the existing data'}
              {step === 'result' && result?.message}
            </p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-[var(--radius-md)] hover:bg-surface-sunken text-text-tertiary">
            <XIcon size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="mom-drawer__body" style={{ padding: '16px 20px' }}>
          {error && (
            <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-100)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} style={{ color: 'var(--color-danger-600)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--color-danger-700)' }}>{error}</span>
            </div>
          )}

          {/* STEP: UPLOAD */}
          {step === 'upload' && (
            <>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '40px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: file ? 'var(--color-success-50)' : 'var(--color-surface-sunken)',
                  transition: 'background 0.2s',
                }}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt" onChange={handleFileSelect} style={{ display: 'none' }} />
                {file ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <FileText size={32} style={{ color: getFileIcon(file.name) }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{file.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {(file.size / 1024).toFixed(1)} KB — Click or drop to change
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Upload size={32} style={{ color: 'var(--color-text-tertiary)' }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      Drop your weekly MOM document here
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      PDF, Word, Excel, CSV, PowerPoint, or Text — Max 20MB
                    </span>
                  </div>
                )}
              </div>

              {/* Optional overrides */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Optional: Override Detected Metadata
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Week Number</label>
                    <input type="number" min={1} max={53} value={weekNumber || ''} onChange={e => setWeekNumber(parseInt(e.target.value) || 0)}
                      placeholder="Auto-detect" className="mom-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Year</label>
                    <input type="number" min={2020} max={2030} value={year} onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                      className="mom-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Title</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                      placeholder="Auto-detect" className="mom-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Meeting Date</label>
                    <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
                      className="mom-input" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP: DUPLICATE */}
          {step === 'duplicate' && (
            <>
              <div style={{ padding: '14px 16px', background: 'var(--color-warning-50)', border: '1px solid var(--color-warning-200)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <AlertTriangle size={16} style={{ color: 'var(--color-warning-600)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-warning-700)' }}>
                    Week {weekNumber} of {year} already has a MOM record
                  </span>
                </div>
                {existingMom && (
                  <div style={{ fontSize: 12, color: 'var(--color-warning-700)' }}>
                    <strong>{existingMom.mom_code}</strong> — {existingMom.title} ({existingMom.total_points} points, Status: {existingMom.status})
                  </div>
                )}
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 10 }}>
                How would you like to proceed?
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { mode: 'merge' as const, label: 'Merge — Add new tasks', desc: 'Append extracted tasks to the existing MOM. Duplicates will be skipped.' },
                  { mode: 'replace' as const, label: 'Replace — Fresh import', desc: 'Delete all existing tasks and re-import from document. User edits will be lost.' },
                ].map(opt => (
                  <label key={opt.mode} style={{
                    padding: '12px 14px', border: importMode === opt.mode ? '2px solid var(--color-primary-500)' : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer', background: importMode === opt.mode ? 'var(--color-primary-50)' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="radio" name="importMode" checked={importMode === opt.mode} onChange={() => setImportMode(opt.mode)} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4, marginLeft: 24 }}>{opt.desc}</p>
                  </label>
                ))}
              </div>

              {extractedPoints.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                    {extractedPoints.length} tasks extracted from document
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && (
            <>
              {/* Meta bar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Week</label>
                  <input type="number" min={1} max={53} value={weekNumber} onChange={e => setWeekNumber(parseInt(e.target.value) || 0)} className="mom-input" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Year</label>
                  <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())} className="mom-input" style={{ width: '100%' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="mom-input" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Meeting Date</label>
                  <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="mom-input" style={{ width: '100%' }} />
                </div>
              </div>

              {/* Points summary bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '8px 12px', background: 'var(--color-surface-sunken)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  {activePoints.length} of {extractedPoints.length} tasks selected for import
                </span>
                <button onClick={() => setSkipIndices(skipIndices.size > 0 ? new Set() : new Set(extractedPoints.map((_, i) => i)))}
                  style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary-600)', cursor: 'pointer', background: 'none', border: 'none' }}>
                  {skipIndices.size > 0 ? 'Select All' : 'Deselect All'}
                </button>
              </div>

              {/* Points list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {extractedPoints.map((point, idx) => (
                  <div key={idx} style={{
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                    opacity: skipIndices.has(idx) ? 0.5 : 1, transition: 'opacity 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
                      <input type="checkbox" checked={!skipIndices.has(idx)} onChange={() => toggleSkip(idx)} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', minWidth: 20 }}>#{idx + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {point.title}
                      </span>
                      {point.status && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10,
                          background: (STATUS_COLORS[point.status] || '#6B7280') + '15',
                          color: STATUS_COLORS[point.status] || '#6B7280',
                          border: `1px solid ${(STATUS_COLORS[point.status] || '#6B7280')}30`,
                        }}>
                          {point.status}
                        </span>
                      )}
                      {point.priority && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10,
                          background: (PRIORITY_COLORS[point.priority] || '#CA8A04') + '15',
                          color: PRIORITY_COLORS[point.priority] || '#CA8A04',
                        }}>
                          {point.priority}
                        </span>
                      )}
                      <button onClick={() => toggleExpand(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 2 }}>
                        {expandedRows.has(idx) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </div>
                    {expandedRows.has(idx) && (
                      <div style={{ padding: '6px 12px 10px 44px', borderTop: '1px solid var(--color-border)', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {point.description && <div style={{ marginBottom: 4 }}><strong>Description:</strong> {point.description}</div>}
                        {point.assigned_to && <div style={{ marginBottom: 4 }}><strong>Assigned to:</strong> {point.assigned_to}</div>}
                        {point.due_date && <div style={{ marginBottom: 4 }}><strong>Due:</strong> {point.due_date}</div>}
                        {point.category && <div style={{ marginBottom: 4 }}><strong>Category:</strong> {point.category}</div>}
                        {point.section_name && <div style={{ marginBottom: 4 }}><strong>Section:</strong> {point.section_name}</div>}
                        {point.remarks && <div><strong>Remarks:</strong> {point.remarks}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {extractedPoints.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-text-tertiary)' }}>
                  <FileText size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p style={{ fontSize: 13 }}>No tasks could be extracted from the document.</p>
                  <p style={{ fontSize: 12 }}>Try uploading a document with clear task lists, tables, or bullet points.</p>
                </div>
              )}
            </>
          )}

          {/* STEP: RESULT */}
          {step === 'result' && result && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: 'var(--color-success-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <Check size={28} style={{ color: 'var(--color-success-600)' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Import Successful</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>{result.message}</p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-success-600)' }}>{result.created}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Tasks Created</div>
                </div>
                {result.skipped !== undefined && result.skipped > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-warning-600)' }}>{result.skipped}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Duplicates Skipped</div>
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>{result.total}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Total Points</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mom-drawer__footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
          {step === 'upload' && (
            <>
              <button onClick={handleClose} className="mom-btn mom-btn--secondary">Cancel</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handlePreview} disabled={!file || loading} className="mom-btn mom-btn--secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                  Preview
                </button>
                <button onClick={handleDirectImport} disabled={!file || loading} className="mom-btn mom-btn--primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Import
                </button>
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              <button onClick={() => setStep('upload')} className="mom-btn mom-btn--secondary">Back</button>
              <button onClick={handleConfirm} disabled={loading || activePoints.length === 0} className="mom-btn mom-btn--primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirm Import ({activePoints.length} tasks)
              </button>
            </>
          )}

          {step === 'duplicate' && (
            <>
              <button onClick={() => { setStep('upload'); setImportMode('create'); }} className="mom-btn mom-btn--secondary">Back</button>
              <button onClick={handleConfirm} disabled={loading} className="mom-btn mom-btn--primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {importMode === 'merge' ? 'Merge Tasks' : 'Replace & Import'}
              </button>
            </>
          )}

          {step === 'result' && (
            <>
              <div />
              <button onClick={handleClose} className="mom-btn mom-btn--primary">Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
