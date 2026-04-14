import { useState, useEffect, useRef } from 'react';
import { X as XIcon, Upload, ImagePlus, Video, Trash2, Loader2 } from 'lucide-react';
import type { Observation, FilterOptions } from '../hooks/useObservations';

const CATEGORIES = [
  'Unsafe Act', 'Unsafe Condition', 'Positive Observation', 'Housekeeping',
  'Environmental', 'Behavioural', 'Work at Height', 'Lifting & Rigging',
  'Near Miss', 'Property Damage',
];

const OBSERVATION_TYPES = [
  'Safety', 'Environmental', 'Health', 'Quality', 'Behavioural',
];

const OTHER = '__other__';

const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Open', 'In Progress', 'Closed', 'Verified', 'Overdue', 'Reopened'];

const ACCEPTED_IMAGE = 'image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif';
const ACCEPTED_VIDEO = 'video/mp4,video/quicktime,video/x-msvideo,video/webm,video/3gpp';
const ACCEPTED_DOCS = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt';
const ACCEPTED_MEDIA = `${ACCEPTED_IMAGE},${ACCEPTED_VIDEO},${ACCEPTED_DOCS}`;

interface Props {
  observation: Observation | null;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  filterOptions: FilterOptions | null;
  onUploadFiles: (files: File[]) => Promise<{ filename: string; originalName: string; size: number; mimetype: string }[]>;
}

interface FormErrors {
  [key: string]: string;
}

interface MediaFile {
  file?: File;
  filename: string; // server path (for existing) or blob URL (for preview)
  originalName: string;
  mimetype: string;
  isExisting: boolean;
}

function isVideo(mimetype: string) {
  return mimetype.startsWith('video/');
}

function isVideoByFilename(filename: string) {
  return /\.(mp4|mov|avi|webm|3gp)$/i.test(filename);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ObservationForm({ observation, onSubmit, onClose, filterOptions, onUploadFiles }: Props) {
  const isEdit = !!observation;
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const [beforeMedia, setBeforeMedia] = useState<MediaFile[]>([]);
  const [afterMedia, setAfterMedia] = useState<MediaFile[]>([]);

  const [form, setForm] = useState({
    observation_date: '',
    area: '',
    contractor: '',
    category: '',
    category_custom: '',
    observation_type: '',
    observation_type_custom: '',
    priority: 'Medium',
    description: '',
    immediate_action: '',
    responsible_supervisor: '',
    proposed_rectification_date: '',
    status: 'Open',
    escalation_required: false,
  });

  useEffect(() => {
    if (observation) {
      setForm({
        observation_date: observation.observation_date ? new Date(observation.observation_date).toISOString().slice(0, 16) : '',
        area: observation.area || '',
        contractor: observation.contractor || '',
        category: observation.category || '',
        observation_type: observation.observation_type || '',
        priority: observation.priority || 'Medium',
        description: observation.description || '',
        immediate_action: observation.immediate_action || '',
        responsible_supervisor: observation.responsible_supervisor || '',
        proposed_rectification_date: observation.proposed_rectification_date ? observation.proposed_rectification_date.slice(0, 10) : '',
        status: observation.status || 'Open',
        escalation_required: observation.escalation_required || false,
      });
      // Load existing media
      if (observation.before_photos?.length) {
        setBeforeMedia(observation.before_photos.map(f => ({
          filename: f,
          originalName: f.split('/').pop() || f,
          mimetype: isVideoByFilename(f) ? 'video/mp4' : 'image/jpeg',
          isExisting: true,
        })));
      }
      if (observation.after_photos?.length) {
        setAfterMedia(observation.after_photos.map(f => ({
          filename: f,
          originalName: f.split('/').pop() || f,
          mimetype: isVideoByFilename(f) ? 'video/mp4' : 'image/jpeg',
          isExisting: true,
        })));
      }
    } else {
      const now = new Date();
      setForm(f => ({
        ...f,
        observation_date: now.toISOString().slice(0, 16),
      }));
    }
  }, [observation]);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.area.trim()) errs.area = 'Area is required';
    if (!form.contractor.trim()) errs.contractor = 'Contractor is required';
    if (!form.category) errs.category = 'Category is required';
    if (!form.observation_type) errs.observation_type = 'Observation type is required';
    if (!form.priority) errs.priority = 'Priority is required';
    if (!form.description.trim() || form.description.trim().length < 10) errs.description = 'Description is required (min 10 chars)';
    if (!form.observation_date) errs.observation_date = 'Date & time is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddFiles = (files: FileList | null, target: 'before' | 'after') => {
    if (!files || files.length === 0) return;
    const newMedia: MediaFile[] = Array.from(files).map(f => ({
      file: f,
      filename: URL.createObjectURL(f),
      originalName: f.name,
      mimetype: f.type,
      isExisting: false,
    }));
    if (target === 'before') {
      setBeforeMedia(prev => [...prev, ...newMedia]);
    } else {
      setAfterMedia(prev => [...prev, ...newMedia]);
    }
  };

  const handleRemoveMedia = (target: 'before' | 'after', index: number) => {
    if (target === 'before') {
      setBeforeMedia(prev => {
        const item = prev[index];
        if (!item.isExisting && item.filename.startsWith('blob:')) URL.revokeObjectURL(item.filename);
        return prev.filter((_, i) => i !== index);
      });
    } else {
      setAfterMedia(prev => {
        const item = prev[index];
        if (!item.isExisting && item.filename.startsWith('blob:')) URL.revokeObjectURL(item.filename);
        return prev.filter((_, i) => i !== index);
      });
    }
  };

  const handleDrop = (e: React.DragEvent, target: 'before' | 'after') => {
    e.preventDefault();
    e.stopPropagation();
    handleAddFiles(e.dataTransfer.files, target);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Upload new files
      const newBeforeFiles = beforeMedia.filter(m => !m.isExisting && m.file).map(m => m.file!);
      const newAfterFiles = afterMedia.filter(m => !m.isExisting && m.file).map(m => m.file!);

      let uploadedBefore: string[] = [];
      let uploadedAfter: string[] = [];

      if (newBeforeFiles.length > 0) {
        setUploadProgress(`Uploading ${newBeforeFiles.length} before file(s)...`);
        const result = await onUploadFiles(newBeforeFiles);
        uploadedBefore = result.map(f => f.filename);
      }
      if (newAfterFiles.length > 0) {
        setUploadProgress(`Uploading ${newAfterFiles.length} after file(s)...`);
        const result = await onUploadFiles(newAfterFiles);
        uploadedAfter = result.map(f => f.filename);
      }

      // Combine existing + newly uploaded
      const beforePhotos = [
        ...beforeMedia.filter(m => m.isExisting).map(m => m.filename),
        ...uploadedBefore,
      ];
      const afterPhotos = [
        ...afterMedia.filter(m => m.isExisting).map(m => m.filename),
        ...uploadedAfter,
      ];

      setUploadProgress(null);

      const payload: Record<string, unknown> = { ...form };
      // Resolve "Other" custom values
      if (payload.category === OTHER) payload.category = payload.category_custom || '';
      delete payload.category_custom;
      if (payload.observation_type === OTHER) payload.observation_type = payload.observation_type_custom || '';
      delete payload.observation_type_custom;

      await onSubmit({
        ...payload,
        observation_date: form.observation_date ? new Date(form.observation_date).toISOString() : undefined,
        proposed_rectification_date: form.proposed_rectification_date || null,
        before_photos: beforePhotos,
        after_photos: afterPhotos,
      });
    } catch (err: any) {
      setUploadProgress(null);
      setErrors({ _general: err.message || 'Failed to save' });
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: string, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  };

  const apiBase = (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000') + '/storage';

  const inputClasses = 'w-full h-9 px-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all';
  const selectClasses = `${inputClasses} appearance-none cursor-pointer`;
  const textareaClasses = 'w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface resize-y transition-all';
  const labelClasses = 'block text-[12px] font-medium text-text-secondary mb-1';
  const errorClasses = 'text-[11px] text-danger-600 mt-0.5';

  const renderMediaSection = (
    title: string,
    media: MediaFile[],
    target: 'before' | 'after',
    inputRef: React.RefObject<HTMLInputElement | null>,
  ) => (
    <div>
      <p className="text-[11px] font-medium text-text-tertiary mb-2">{title}</p>

      {/* Thumbnails */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
          {media.map((m, i) => {
            const src = m.isExisting ? `${apiBase}/${m.filename}` : m.filename;
            const isVid = isVideo(m.mimetype);
            return (
              <div key={i} className="relative group rounded-[var(--radius-md)] border border-border overflow-hidden bg-surface-sunken">
                {isVid ? (
                  <video
                    src={src}
                    className="w-full h-[80px] object-cover"
                    muted
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={src}
                    alt={m.originalName}
                    className="w-full h-[80px] object-cover"
                  />
                )}
                {/* Video badge */}
                {isVid && (
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-[4px] flex items-center gap-0.5">
                    <Video size={10} />
                    Video
                  </div>
                )}
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveMedia(target, i)}
                  className="absolute top-1 right-1 p-1 bg-danger-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <Trash2 size={10} />
                </button>
                {/* File name */}
                <div className="px-1.5 py-1 text-[9px] text-text-tertiary truncate">
                  {m.originalName}
                  {m.file && <span className="ml-1 text-text-quaternary">({formatFileSize(m.file.size)})</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-border rounded-[var(--radius-md)] p-4 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={e => handleDrop(e, target)}
      >
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 text-text-tertiary">
            <ImagePlus size={16} />
            <Video size={16} />
          </div>
          <p className="text-[12px] text-text-tertiary">
            Click or drag & drop photos/videos
          </p>
          <p className="text-[10px] text-text-quaternary">
            Images, Videos, PDF, Word, Excel, PowerPoint (max 100MB each)
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MEDIA}
        multiple
        className="hidden"
        onChange={e => {
          handleAddFiles(e.target.files, target);
          e.target.value = '';
        }}
      />
    </div>
  );

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-surface z-10" style={{ borderTop: '4px solid var(--color-primary-500)' }}>
          <h2 className="text-[17px] font-bold text-text-primary">
            {isEdit ? 'Edit Observation' : 'Add Observation'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
            <XIcon size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-6">
          {errors._general && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">{errors._general}</div>
          )}

          {/* Observation ID (edit only) */}
          {isEdit && observation && (
            <div>
              <label className={labelClasses}>Observation ID</label>
              <input type="text" value={observation.observation_id} readOnly className={`${inputClasses} bg-surface-sunken text-text-tertiary cursor-not-allowed`} />
            </div>
          )}

          {/* Section: Date & Location */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Date & Location</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Date & Time *</label>
                <input type="datetime-local" value={form.observation_date} onChange={e => set('observation_date', e.target.value)} className={inputClasses} />
                {errors.observation_date && <p className={errorClasses}>{errors.observation_date}</p>}
              </div>
              <div>
                <label className={labelClasses}>Area / Zone *</label>
                <input type="text" value={form.area} onChange={e => set('area', e.target.value)} placeholder="e.g. Zone A, Station 3" className={inputClasses} list="areas-list" />
                <datalist id="areas-list">
                  {(filterOptions?.areas || []).map(a => <option key={a} value={a} />)}
                </datalist>
                {errors.area && <p className={errorClasses}>{errors.area}</p>}
              </div>
            </div>
            <div>
              <label className={labelClasses}>Contractor *</label>
              <input type="text" value={form.contractor} onChange={e => set('contractor', e.target.value)} placeholder="e.g. CCCC, CCC Rail" className={inputClasses} list="contractors-list" />
              <datalist id="contractors-list">
                {(filterOptions?.contractors || []).map(c => <option key={c} value={c} />)}
              </datalist>
              {errors.contractor && <p className={errorClasses}>{errors.contractor}</p>}
            </div>
          </div>

          {/* Section: Observation Details */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Observation Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Category *</label>
                {form.category === OTHER ? (
                  <div className="flex gap-2">
                    <input type="text" value={form.category_custom} onChange={e => set('category_custom', e.target.value)}
                      className={inputClasses} placeholder="Type category..." autoFocus />
                    <button type="button" onClick={() => { set('category', ''); set('category_custom', ''); }}
                      className="px-2.5 py-1 text-[12px] font-medium border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken shrink-0">Back</button>
                  </div>
                ) : (
                  <select value={form.category} onChange={e => set('category', e.target.value)} className={selectClasses}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value={OTHER}>Other (type manually)</option>
                  </select>
                )}
                {errors.category && <p className={errorClasses}>{errors.category}</p>}
              </div>
              <div>
                <label className={labelClasses}>Observation Type *</label>
                {form.observation_type === OTHER ? (
                  <div className="flex gap-2">
                    <input type="text" value={form.observation_type_custom} onChange={e => set('observation_type_custom', e.target.value)}
                      className={inputClasses} placeholder="Type observation type..." autoFocus />
                    <button type="button" onClick={() => { set('observation_type', ''); set('observation_type_custom', ''); }}
                      className="px-2.5 py-1 text-[12px] font-medium border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken shrink-0">Back</button>
                  </div>
                ) : (
                  <select value={form.observation_type} onChange={e => set('observation_type', e.target.value)} className={selectClasses}>
                    <option value="">Select type</option>
                    {OBSERVATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value={OTHER}>Other (type manually)</option>
                  </select>
                )}
                {errors.observation_type && <p className={errorClasses}>{errors.observation_type}</p>}
              </div>
            </div>
            <div>
              <label className={labelClasses}>Priority *</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className={selectClasses}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.priority && <p className={errorClasses}>{errors.priority}</p>}
            </div>
            <div>
              <label className={labelClasses}>Description *</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder="Describe the observation in detail..." className={textareaClasses} />
              {errors.description && <p className={errorClasses}>{errors.description}</p>}
            </div>
            <div>
              <label className={labelClasses}>Immediate Action Taken</label>
              <textarea value={form.immediate_action} onChange={e => set('immediate_action', e.target.value)} rows={2} placeholder="What action was taken immediately?" className={textareaClasses} />
            </div>
          </div>

          {/* Section: Attachments (Pictures & Videos) */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Attachments (Photos & Videos)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderMediaSection('Before Rectification', beforeMedia, 'before', beforeInputRef)}
              {renderMediaSection('After Rectification', afterMedia, 'after', afterInputRef)}
            </div>
          </div>

          {/* Section: People */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">People</p>
            <div>
              <label className={labelClasses}>Responsible Supervisor</label>
              <input type="text" value={form.responsible_supervisor} onChange={e => set('responsible_supervisor', e.target.value)} placeholder="Supervisor name" className={inputClasses} list="supervisors-list" />
              <datalist id="supervisors-list">
                {(filterOptions?.supervisors || []).map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          {/* Section: Status & Dates */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Status & Dates</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} className={selectClasses}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClasses}>Target Completion Date</label>
                <input type="date" value={form.proposed_rectification_date} onChange={e => set('proposed_rectification_date', e.target.value)} className={inputClasses} />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.escalation_required}
                onChange={e => set('escalation_required', e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-200"
              />
              <span className="text-[13px] text-text-primary">Escalation Required</span>
            </label>
          </div>

          {/* Footer */}
          <div className="shrink-0 flex justify-end gap-2 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting
                ? (uploadProgress || 'Saving...')
                : isEdit ? 'Update Observation' : 'Save Observation'
              }
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
