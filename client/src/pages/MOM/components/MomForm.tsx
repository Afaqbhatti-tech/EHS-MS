import { useState, useEffect, useRef } from 'react';
import { X as XIcon, Plus, Trash2, Upload } from 'lucide-react';
import type { MomListItem, MomDetail, Attendee, AnalysisResult } from '../hooks/useMom';

interface Props {
  mom: MomListItem | null;
  momDetail: MomDetail | null;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  uploadFiles: (files: File[]) => Promise<{ filename: string; originalName: string }[]>;
  previousMoms: MomListItem[];
  analysing: boolean;
  analysisResult: AnalysisResult | null;
  analysisError: string | null;
  analyseMomDocument: (file: File) => Promise<AnalysisResult | null>;
  clearAnalysis: () => void;
}

const MEETING_TYPES = [
  'Weekly HSE Meeting', 'Monthly HSE Meeting', 'Client / PMC HSE Meeting',
  'Incident Review Meeting', 'RAMS Review Meeting',
];

const OTHER = '__other__';

// Map AI suggestion keys to human labels
const FIELD_LABELS: Record<string, string> = {
  meeting_title:       'Meeting Title',
  meeting_date:        'Meeting Date',
  week_number:         'Week Number',
  year:                'Year',
  location:            'Location',
  chaired_by:          'Chaired By',
  minutes_prepared_by: 'Minutes Prepared By',
  meeting_type:        'Meeting Type',
  client_name:         'Client Name',
  site_project:        'Site / Project',
  discussion_summary:  'Discussion Summary',
};

// Map AI suggestion keys to form state keys
const SUGGESTION_TO_FORM: Record<string, string> = {
  meeting_title:       'title',
  meeting_date:        'meeting_date',
  week_number:         'week_number',
  year:                'year',
  location:            'meeting_location',
  chaired_by:          'chaired_by',
  minutes_prepared_by: 'minutes_prepared_by',
  meeting_type:        'meeting_type',
  client_name:         'client_name',
  site_project:        'site_project',
  discussion_summary:  'summary',
};

// Status/priority normalization for frontend display
const VALID_STATUSES = ['Open', 'In Progress', 'Closed', 'Pending', 'Blocked', 'Deferred'] as const;
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

interface ActionItem {
  id?: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string;
  due_date: string;
  category: string;
  remarks: string;
}

export function MomForm({
  mom, momDetail, onSubmit, onClose, uploadFiles, previousMoms,
  analysing, analysisResult, analysisError, analyseMomDocument, clearAnalysis,
}: Props) {
  const isEdit = !!mom;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentWeek = (() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
  })();

  const [form, setForm] = useState<Record<string, any>>({
    title: '',
    meeting_date: new Date().toISOString().slice(0, 10),
    week_number: currentWeek,
    year: new Date().getFullYear(),
    meeting_type: 'Weekly HSE Meeting',
    meeting_type_custom: '',
    meeting_time: '',
    meeting_location: '',
    chaired_by: '',
    minutes_prepared_by: '',
    site_project: '',
    client_name: '',
    summary: '',
    notes: '',
    previous_mom_id: '',
    document_path: null as string | null,
    document_name: null as string | null,
    ai_analysis_id: null as number | null,
  });
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [attachmentPaths, setAttachmentPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // AI-specific state
  const [selectedFileName, setSelectedFileName] = useState('');
  const [filledFields, setFilledFields] = useState<Record<string, unknown>>({});
  const [hasAiActions, setHasAiActions] = useState(false);

  useEffect(() => {
    if (momDetail) {
      setForm({
        title: momDetail.title || '',
        meeting_date: momDetail.meeting_date || '',
        week_number: momDetail.week_number || currentWeek,
        year: momDetail.year || new Date().getFullYear(),
        meeting_type: momDetail.meeting_type || 'Weekly HSE Meeting',
        meeting_type_custom: '',
        meeting_time: momDetail.meeting_time || '',
        meeting_location: momDetail.meeting_location || '',
        chaired_by: momDetail.chaired_by || '',
        minutes_prepared_by: momDetail.minutes_prepared_by || '',
        site_project: momDetail.site_project || '',
        client_name: momDetail.client_name || '',
        summary: momDetail.summary || '',
        notes: momDetail.notes || '',
        previous_mom_id: momDetail.previous_mom_id || '',
        document_path: (momDetail as any).document_path || null,
        document_name: (momDetail as any).document_name || null,
        ai_analysis_id: (momDetail as any).ai_analysis_id || null,
      });
      setAttendees(momDetail.attendees || []);
      setAttachmentPaths(momDetail.attachments || []);
      // Load existing points as action items for editing
      if (momDetail.points && momDetail.points.length > 0) {
        setActionItems(momDetail.points.map(p => ({
          id: p.id,
          title: p.title || '',
          description: p.description || '',
          status: p.status || 'Open',
          priority: p.priority || 'Medium',
          assigned_to: p.assigned_to || '',
          due_date: p.due_date || '',
          category: p.category || 'Action Required',
          remarks: p.remarks || '',
        })));
      }
      // Show existing document chip on edit
      if ((momDetail as any).document_name) {
        setSelectedFileName((momDetail as any).document_name);
      }
    } else if (mom) {
      setForm(f => ({
        ...f,
        title: mom.title || '',
        meeting_date: mom.meeting_date || '',
        week_number: mom.week_number || currentWeek,
        year: mom.year || new Date().getFullYear(),
        meeting_type: mom.meeting_type || 'Weekly HSE Meeting',
        meeting_location: mom.meeting_location || '',
        chaired_by: mom.chaired_by || '',
        client_name: mom.client_name || '',
        site_project: mom.site_project || '',
        previous_mom_id: mom.previous_mom_id || '',
      }));
    }
  }, [mom, momDetail]);

  const updateField = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  // When user manually edits an AI-filled field, remove the highlight
  const handleFieldChange = (formKey: string, suggestionKey: string, value: unknown) => {
    updateField(formKey, value);
    setFilledFields(prev => {
      const next = { ...prev };
      delete next[suggestionKey];
      return next;
    });
  };

  const addAttendee = () => setAttendees(a => [...a, { name: '', company: '', role: '' }]);
  const removeAttendee = (i: number) => setAttendees(a => a.filter((_, idx) => idx !== i));
  const updateAttendee = (i: number, key: string, val: string) => {
    setAttendees(a => a.map((att, idx) => idx === i ? { ...att, [key]: val } : att));
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const result = await uploadFiles(Array.from(files));
      setAttachmentPaths(prev => [...prev, ...result.map(f => f.filename)]);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── AI Document Analysis Handlers ──────────────────

  const handleAiFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setFilledFields({});
    setActionItems([]);
    setHasAiActions(false);
    const result = await analyseMomDocument(file);
    if (result?.suggestions) {
      applyAnalysisSuggestions(result.suggestions as Record<string, any>);
    }
    e.target.value = '';
  };

  const handleAiDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setFilledFields({});
    setActionItems([]);
    setHasAiActions(false);
    const result = await analyseMomDocument(file);
    if (result?.suggestions) {
      applyAnalysisSuggestions(result.suggestions as Record<string, any>);
    }
  };

  const applyAnalysisSuggestions = (suggestions: Record<string, any>) => {
    const applied: Record<string, unknown> = {};
    const formUpdates: Record<string, unknown> = {};

    Object.entries(SUGGESTION_TO_FORM).forEach(([suggKey, formKey]) => {
      const suggestedValue = suggestions[suggKey];
      const currentValue = form[formKey];

      // For defaulted fields, overwrite with AI suggestion since defaults are generic
      const isDefaultField = formKey === 'week_number' || formKey === 'year'
        || formKey === 'meeting_date' || formKey === 'meeting_type';
      const isEmpty = !currentValue || currentValue === '' || currentValue === 0;
      if (suggestedValue && (isEmpty || isDefaultField)) {
        formUpdates[formKey] = suggestedValue;
        applied[suggKey] = suggestedValue;
      }
    });

    // Store document path + analysis ID
    if (suggestions.document_path) {
      formUpdates.document_path = suggestions.document_path;
      formUpdates.document_name = suggestions.document_name;
      formUpdates.ai_analysis_id = analysisResult?.analysis_id ?? null;
    }

    setForm(prev => ({ ...prev, ...formUpdates }));
    setFilledFields(applied);

    // Auto-apply attendees
    const detectedAttendees = suggestions.attendees_hint;
    if (Array.isArray(detectedAttendees) && detectedAttendees.length > 0) {
      const existingNames = new Set(attendees.map(a => a.name?.toLowerCase()));
      const newAttendees = detectedAttendees.filter(
        (a: any) => a.name && !existingNames.has(a.name.toLowerCase())
      );
      if (newAttendees.length > 0) {
        setAttendees(prev => [...prev, ...newAttendees]);
      }
    }

    // Auto-apply action items as editable task rows
    const detectedActions = suggestions.actions_hint;
    if (Array.isArray(detectedActions) && detectedActions.length > 0) {
      const normalized: ActionItem[] = detectedActions
        .filter((a: any) => a.title && a.title.trim())
        .map((a: any) => ({
          title: a.title || '',
          description: a.description || '',
          status: VALID_STATUSES.includes(a.status) ? a.status : 'Open',
          priority: VALID_PRIORITIES.includes(a.priority) ? a.priority : 'Medium',
          assigned_to: a.assigned_to || '',
          due_date: a.due_date || '',
          category: a.category || 'Action Required',
          remarks: a.remarks || '',
        }));
      setActionItems(normalized);
      setHasAiActions(normalized.length > 0);
    }
  };

  const handleApplyAttendees = () => {
    const detected = (analysisResult?.suggestions as any)?.attendees_hint;
    if (!detected?.length) return;
    const existingNames = new Set(attendees.map(a => a.name?.toLowerCase()));
    const newAttendees = detected.filter(
      (a: any) => a.name && !existingNames.has(a.name.toLowerCase())
    );
    setAttendees(prev => [...prev, ...newAttendees]);
  };

  // ── Action Item Helpers ──────────────────────────────
  const addActionItem = () => setActionItems(prev => [...prev, {
    title: '', description: '', status: 'Open', priority: 'Medium',
    assigned_to: '', due_date: '', category: 'Action Required', remarks: '',
  }]);

  const removeActionItem = (i: number) => setActionItems(prev => prev.filter((_, idx) => idx !== i));

  const updateActionItem = (i: number, key: keyof ActionItem, value: string) => {
    setActionItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: value } : item));
  };

  const handleRemoveDocument = () => {
    setSelectedFileName('');
    setFilledFields({});
    setActionItems([]);
    setHasAiActions(false);
    clearAnalysis();
    setForm(prev => ({
      ...prev,
      document_path: null,
      document_name: null,
      ai_analysis_id: null,
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Form Submit ────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.meeting_date) { setError('Meeting date is required'); return; }
    if (!form.week_number || form.week_number < 1 || form.week_number > 53) { setError('Valid week number is required'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      // Resolve "Other" custom value
      if (payload.meeting_type === OTHER) {
        payload.meeting_type = payload.meeting_type_custom || '';
      }
      delete payload.meeting_type_custom;

      await onSubmit({
        ...payload,
        attendees: attendees.filter(a => a.name.trim()),
        attachments: attachmentPaths,
        action_items: actionItems.filter(a => a.title.trim()),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Helper: Check if a field was AI-filled
  const isAiFilled = (suggKey: string) => suggKey in filledFields;

  // Helper: field wrapper className with optional AI highlight
  const fieldClass = (suggKey?: string) =>
    `mom-form-field ${suggKey && isAiFilled(suggKey) ? 'mom-form-field--ai-filled' : ''}`;

  const editHasDocument = isEdit && !!form.document_path && !analysisResult;
  const editWasAnalysed = isEdit && !!(momDetail as any)?.ai_analysed;

  return (
    <>
      <div className="mom-drawer-overlay" onClick={onClose} />
      <div className="mom-drawer">
        <div className="mom-drawer__header">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{isEdit ? 'Edit MOM' : 'New Weekly MOM'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-sunken"><XIcon size={18} /></button>
        </div>

        <div className="mom-drawer__body">
          {error && (
            <div style={{ marginBottom: 16, padding: '8px 12px', background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-danger-700)' }}>
              {error}
            </div>
          )}

          {/* ── AI Document Upload Section ── */}
          <div className="mom-section">
            <div className="mom-section__title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Document Analysis</span>
              {editWasAnalysed && !analysisResult && (
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-success-600)' }}>Previously analysed</span>
              )}
            </div>

            {/* State: Analysing */}
            {analysing && (
              <div className="mom-doc-analysing">
                <div className="mom-doc-analysing__spinner" />
                <div className="mom-doc-analysing__text">
                  <strong>Analysing document...</strong>
                  <span>Parsing your MOM document</span>
                </div>
              </div>
            )}

            {/* State: Error */}
            {analysisError && !analysing && (
              <div className="mom-doc-analysis-error">
                <span>Document analysis failed: {analysisError}</span>
              </div>
            )}

            {/* State: Analysis Complete */}
            {analysisResult && !analysing && (
              <>
                {/* File chip */}
                <div className="mom-doc-file-chip">
                  <span>📄</span>
                  <span className="mom-doc-file-chip__name">{selectedFileName}</span>
                  <button className="mom-doc-file-chip__remove" onClick={handleRemoveDocument} type="button">×</button>
                </div>

                {/* Analysis result banner */}
                <div className="mom-doc-analysis-banner">
                  <div className="mom-doc-analysis-banner__header">
                    <span className="mom-doc-analysis-banner__icon">✨</span>
                    <div>
                      <div className="mom-doc-analysis-banner__title">Analysis Complete</div>
                      <div className="mom-doc-analysis-banner__sub">Fields and action items were auto-filled from your document. Review and edit as needed before saving.</div>
                    </div>
                    {analysisResult.confidence != null && (
                      <div className="mom-doc-analysis-banner__confidence">
                        {analysisResult.confidence}% confidence
                        <div className="mom-doc-confidence-bar">
                          <div className="mom-doc-confidence-bar__fill" style={{ width: `${analysisResult.confidence}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {analysisResult.summary && (
                    <div className="mom-doc-analysis-summary">
                      <strong>Document Summary:</strong>
                      <p style={{ margin: '4px 0 0' }}>{analysisResult.summary}</p>
                    </div>
                  )}

                  {Object.keys(filledFields).length > 0 && (
                    <div className="mom-doc-analysis-fields">
                      <strong>Auto-filled fields:</strong>
                      <div className="mom-doc-analysis-field-chips">
                        {Object.keys(filledFields).map(f => (
                          <span key={f} className="mom-doc-analysis-field-chip">✓ {FIELD_LABELS[f] ?? f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult.missing_fields?.length > 0 && (
                    <div className="mom-doc-analysis-missing">
                      <strong>Fields to fill manually:</strong>
                      <div className="mom-doc-analysis-field-chips">
                        {analysisResult.missing_fields.map(f => (
                          <span key={f} className="mom-doc-analysis-missing-chip">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(analysisResult.suggestions as any)?.attendees_hint?.length > 0 && (
                    <div className="mom-doc-attendees-hint">
                      <strong>{(analysisResult.suggestions as any).attendees_hint.length} attendees detected and added</strong>
                      {attendees.length === 0 && (
                        <button type="button" className="mom-doc-attendees-hint__btn" onClick={handleApplyAttendees}>+ Re-apply attendees</button>
                      )}
                    </div>
                  )}

                  {actionItems.length > 0 && (
                    <div className="mom-doc-actions-hint">
                      <strong>{actionItems.length} action items extracted and added below</strong>
                      <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Scroll down to review and edit</span>
                    </div>
                  )}

                  <button type="button" className="mom-doc-reanalyse" onClick={() => fileInputRef.current?.click()}>
                    Upload different document
                  </button>
                </div>
              </>
            )}

            {/* State: Edit mode with existing document (no re-analysis) */}
            {editHasDocument && !analysing && (
              <div className="mom-doc-file-chip">
                <span>📄</span>
                <span className="mom-doc-file-chip__name">{selectedFileName || form.document_name}</span>
                <button className="mom-doc-file-chip__remove" onClick={handleRemoveDocument} type="button">×</button>
              </div>
            )}

            {/* State: Idle (no file, no analysis, not analysing) */}
            {!analysing && !analysisResult && !editHasDocument && (
              <>
                <div className="mom-doc-upload-label">
                  <span>📎 MOM Document</span>
                  <span className="mom-doc-upload-optional">Optional — will auto-fill fields from document</span>
                </div>
                <div
                  className="mom-doc-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleAiDrop}
                  onDragOver={e => e.preventDefault()}
                >
                  <div className="mom-doc-dropzone__icon">📄</div>
                  <div className="mom-doc-dropzone__text">Click or drag a MOM document here</div>
                  <div className="mom-doc-dropzone__hint">PDF, Word, PowerPoint, Excel & more · Max 20MB</div>
                </div>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.ppt,.pptx,.xls,.xlsx,.csv,.rtf,.odt,.odp,.ods"
              style={{ display: 'none' }}
              onChange={handleAiFileSelect}
            />
          </div>

          {/* Section 1 — Meeting Details */}
          <div className="mom-section">
            <div className="mom-section__title">Meeting Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className={fieldClass('meeting_title')}>
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Meeting Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => handleFieldChange('title', 'meeting_title', e.target.value)}
                  placeholder="e.g. HSE Weekly Meeting Week 9"
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400"
                />
                {isAiFilled('meeting_title') && <span className="mom-form-field__ai-badge">✨ Auto-filled by AI</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Week Number *</label>
                  <input type="number" min={1} max={53} value={form.week_number} onChange={e => updateField('week_number', parseInt(e.target.value) || '')}
                    className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Year *</label>
                  <input type="number" value={form.year} onChange={e => updateField('year', parseInt(e.target.value) || '')}
                    className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={fieldClass('meeting_date')}>
                  <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Meeting Date *</label>
                  <input type="date" value={form.meeting_date} onChange={e => handleFieldChange('meeting_date', 'meeting_date', e.target.value)}
                    className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
                  {isAiFilled('meeting_date') && <span className="mom-form-field__ai-badge">✨ Auto-filled by AI</span>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Meeting Time</label>
                  <input type="time" value={form.meeting_time} onChange={e => updateField('meeting_time', e.target.value)}
                    className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={fieldClass('meeting_type')}>
                  <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Meeting Type</label>
                  {form.meeting_type === OTHER ? (
                    <div className="flex gap-2">
                      <input type="text" value={form.meeting_type_custom} onChange={e => updateField('meeting_type_custom', e.target.value)}
                        className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400"
                        placeholder="Type meeting type..." autoFocus />
                      <button type="button" onClick={() => { updateField('meeting_type', 'Weekly HSE Meeting'); updateField('meeting_type_custom', ''); }}
                        className="px-2.5 py-1 text-[12px] font-medium border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken shrink-0">Back</button>
                    </div>
                  ) : (
                    <select value={form.meeting_type} onChange={e => handleFieldChange('meeting_type', 'meeting_type', e.target.value)}
                      className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none">
                      {MEETING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      <option value={OTHER}>Other (type manually)</option>
                    </select>
                  )}
                  {isAiFilled('meeting_type') && <span className="mom-form-field__ai-badge">✨ Auto-filled by AI</span>}
                </div>
                <div className={fieldClass('location')}>
                  <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Location</label>
                  <input type="text" value={form.meeting_location} onChange={e => handleFieldChange('meeting_location', 'location', e.target.value)} placeholder="Office / Site / Video Call"
                    className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
                  {isAiFilled('location') && <span className="mom-form-field__ai-badge">✨ Auto-filled by AI</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 — People */}
          <div className="mom-section">
            <div className="mom-section__title">People</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className={fieldClass('chaired_by')}>
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Chaired By</label>
                <input type="text" value={form.chaired_by} onChange={e => handleFieldChange('chaired_by', 'chaired_by', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
                {isAiFilled('chaired_by') && <span className="mom-form-field__ai-badge">✨ Auto-filled by AI</span>}
              </div>
              <div className={fieldClass('minutes_prepared_by')}>
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Minutes Prepared By</label>
                <input type="text" value={form.minutes_prepared_by} onChange={e => handleFieldChange('minutes_prepared_by', 'minutes_prepared_by', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
                {isAiFilled('minutes_prepared_by') && <span className="mom-form-field__ai-badge">✨ Auto-filled by AI</span>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Client Name</label>
                <input type="text" value={form.client_name} onChange={e => updateField('client_name', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-1">Site / Project</label>
                <input type="text" value={form.site_project} onChange={e => updateField('site_project', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400" />
              </div>
            </div>

            {/* Attendees */}
            <label className="block text-[11px] font-semibold text-text-tertiary uppercase mb-2">Attendees</label>
            {attendees.map((att, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-1.5 min-w-0">
                <input type="text" placeholder="Name" value={att.name} onChange={e => updateAttendee(i, 'name', e.target.value)}
                  className="min-w-0 px-3 py-[6px] text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:border-primary-400" />
                <input type="text" placeholder="Company" value={att.company || ''} onChange={e => updateAttendee(i, 'company', e.target.value)}
                  className="min-w-0 px-3 py-[6px] text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:border-primary-400 hidden sm:block" />
                <input type="text" placeholder="Role" value={att.role || ''} onChange={e => updateAttendee(i, 'role', e.target.value)}
                  className="min-w-0 px-3 py-[6px] text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:border-primary-400 hidden sm:block" />
                <button onClick={() => removeAttendee(i)} className="p-1 text-danger-500 hover:text-danger-700 shrink-0"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={addAttendee} className="text-[12px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-1">
              <Plus size={14} /> Add Attendee
            </button>
          </div>

          {/* Section 3 — Previous MOM Link */}
          <div className="mom-section">
            <div className="mom-section__title">Previous MOM Link</div>
            <select value={form.previous_mom_id} onChange={e => updateField('previous_mom_id', e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none">
              <option value="">— No link —</option>
              {previousMoms.filter(pm => pm.id !== mom?.id).map(pm => (
                <option key={pm.id} value={pm.id}>
                  Week {pm.week_number} — {pm.meeting_date} — {pm.mom_code}
                </option>
              ))}
            </select>
          </div>

          {/* Section 4 — Summary */}
          <div className="mom-section">
            <div className="mom-section__title">Meeting Summary</div>
            <div className={fieldClass('discussion_summary')}>
              <textarea
                value={form.summary}
                onChange={e => handleFieldChange('summary', 'discussion_summary', e.target.value)}
                rows={4}
                placeholder="Key discussion points and outcomes..."
                className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400 resize-y"
              />
              {isAiFilled('discussion_summary') && <span className="mom-form-field__ai-badge">✨ Auto-filled by AI</span>}
            </div>
          </div>

          {/* Section 5 — Action Items / Points */}
          <div className="mom-section">
            <div className="mom-section__title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Action Items / Points {actionItems.length > 0 && <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--color-text-tertiary)' }}>({actionItems.length})</span>}</span>
              {hasAiActions && actionItems.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-success-600)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>✨</span> Auto-populated from document
                </span>
              )}
            </div>

            {actionItems.length === 0 && !hasAiActions && (
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '4px 0 8px' }}>
                No action items yet. Upload a document to auto-extract, or add manually.
              </p>
            )}

            {actionItems.map((item, i) => (
              <div key={i} className={`mom-action-item ${hasAiActions ? 'mom-action-item--ai' : ''}`}>
                <div className="mom-action-item__header">
                  <span className="mom-action-item__num">#{i + 1}</span>
                  <button type="button" onClick={() => removeActionItem(i)} className="mom-action-item__remove" title="Remove">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label className="block text-[10px] font-semibold text-text-tertiary uppercase mb-0.5">Title *</label>
                    <input type="text" value={item.title} onChange={e => updateActionItem(i, 'title', e.target.value)}
                      placeholder="Action item title"
                      className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:border-primary-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-text-tertiary uppercase mb-0.5">Description</label>
                    <textarea value={item.description} onChange={e => updateActionItem(i, 'description', e.target.value)}
                      placeholder="Details..."
                      rows={2}
                      className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:border-primary-400 resize-y" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-text-tertiary uppercase mb-0.5">Status</label>
                      <select value={item.status} onChange={e => updateActionItem(i, 'status', e.target.value)}
                        className="w-full px-2 py-1.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none">
                        {VALID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-text-tertiary uppercase mb-0.5">Priority</label>
                      <select value={item.priority} onChange={e => updateActionItem(i, 'priority', e.target.value)}
                        className="w-full px-2 py-1.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none">
                        {VALID_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-text-tertiary uppercase mb-0.5">Assigned To</label>
                      <input type="text" value={item.assigned_to} onChange={e => updateActionItem(i, 'assigned_to', e.target.value)}
                        placeholder="Person"
                        className="w-full px-2 py-1.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:border-primary-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-text-tertiary uppercase mb-0.5">Due Date</label>
                      <input type="date" value={item.due_date} onChange={e => updateActionItem(i, 'due_date', e.target.value)}
                        className="w-full px-2 py-1.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:border-primary-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-text-tertiary uppercase mb-0.5">Category</label>
                      <input type="text" value={item.category} onChange={e => updateActionItem(i, 'category', e.target.value)}
                        placeholder="Category"
                        className="w-full px-2 py-1.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:border-primary-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-text-tertiary uppercase mb-0.5">Remarks</label>
                      <input type="text" value={item.remarks} onChange={e => updateActionItem(i, 'remarks', e.target.value)}
                        placeholder="Remarks"
                        className="w-full px-2 py-1.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:border-primary-400" />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button type="button" onClick={addActionItem} className="text-[12px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-1">
              <Plus size={14} /> Add Action Item
            </button>
          </div>

          {/* Section 6 — Attachments */}
          <div className="mom-section">
            <div className="mom-section__title">Attachments</div>
            {attachmentPaths.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {attachmentPaths.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                    <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>{p.split('/').pop()}</span>
                    <button onClick={() => setAttachmentPaths(prev => prev.filter((_, idx) => idx !== i))} className="text-danger-500 hover:text-danger-700"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-[var(--radius-md)] cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
              <Upload size={16} style={{ color: 'var(--color-text-tertiary)' }} />
              <span className="text-[12px] text-text-tertiary">{uploading ? 'Uploading...' : 'Drop files here or click to browse'}</span>
              <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt" onChange={e => handleFileUpload(e.target.files)} className="hidden" />
            </label>
            <p className="text-[10px] text-text-disabled mt-1">Images, PDF, Word, Excel, PowerPoint, CSV, TXT — Max 20MB each</p>
          </div>

          {/* Section 6 — Notes */}
          <div className="mom-section">
            <div className="mom-section__title">Internal Notes</div>
            <textarea
              value={form.notes}
              onChange={e => updateField('notes', e.target.value)}
              rows={2}
              placeholder="Optional internal notes..."
              className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-md)] bg-surface focus:outline-none focus:border-primary-400 resize-y"
            />
          </div>
        </div>

        <div className="mom-drawer__footer">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-semibold border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken" disabled={saving}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || analysing}
            className="px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 shadow-xs"
          >
            {saving ? 'Saving...' : isEdit ? 'Update MOM' : 'Create MOM'}
          </button>
        </div>
      </div>
    </>
  );
}
