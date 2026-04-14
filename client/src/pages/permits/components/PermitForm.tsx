import { useState, useEffect, useRef } from 'react';
import { X as XIcon, Upload, ImagePlus, Trash2, Loader2 } from 'lucide-react';
import { PERMIT_TYPES, PERMIT_STATUSES, getPermitType } from '../config/permitTypes';
import type { Permit, PermitFilterOptions } from '../hooks/usePermits';

interface Props {
  permit: Permit | null;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  filterOptions: PermitFilterOptions | null;
  onUploadFiles: (files: File[]) => Promise<{ filename: string; originalName: string; size: number; mimetype: string }[]>;
}

interface FormErrors {
  [key: string]: string;
}

interface MediaFile {
  file?: File;
  filename: string;
  originalName: string;
  isExisting: boolean;
}

export function PermitForm({ permit, onSubmit, onClose, filterOptions, onUploadFiles }: Props) {
  const isEdit = !!permit;
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] = useState<MediaFile[]>([]);

  const [form, setForm] = useState({
    permit_type: '',
    permit_type_custom: '',
    title: '',
    area: '',
    activity_type: '',
    description: '',
    contractor: '',
    issued_to: '',
    permit_date: '',
    permit_date_end: '',
    start_time: '',
    end_time: '',
    status: 'Active',
    safety_measures: '',
    ppe_requirements: '',
    notes: '',
    approved_by: '',
  });

  useEffect(() => {
    if (permit) {
      setForm({
        permit_type: permit.permit_type || '',
        title: permit.title || '',
        area: permit.area || '',
        activity_type: permit.activity_type || '',
        description: permit.description || '',
        contractor: permit.contractor || '',
        issued_to: permit.issued_to || '',
        permit_date: permit.permit_date || '',
        permit_date_end: permit.permit_date_end || '',
        start_time: permit.start_time || '',
        end_time: permit.end_time || '',
        status: permit.status || 'Active',
        safety_measures: permit.safety_measures || '',
        ppe_requirements: permit.ppe_requirements || '',
        notes: permit.notes || '',
        approved_by: permit.approved_by || '',
      });
      if (permit.attachments?.length) {
        setAttachments(permit.attachments.map(f => ({
          filename: f,
          originalName: f.split('/').pop() || f,
          isExisting: true,
        })));
      }
    } else {
      setForm(f => ({ ...f, permit_date: new Date().toISOString().slice(0, 10) }));
    }
  }, [permit]);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.permit_type) errs.permit_type = 'Permit type is required';
    if (!form.title.trim() || form.title.trim().length < 3) errs.title = 'Title is required (min 3 chars)';
    if (!form.permit_date) errs.permit_date = 'Permit date is required';
    if (form.permit_date_end && form.permit_date_end < form.permit_date) {
      errs.permit_date_end = 'End date must be after start date';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newMedia: MediaFile[] = Array.from(files).map(f => ({
      file: f,
      filename: URL.createObjectURL(f),
      originalName: f.name,
      isExisting: false,
    }));
    setAttachments(prev => [...prev, ...newMedia]);
  };

  const handleRemoveMedia = (index: number) => {
    setAttachments(prev => {
      const item = prev[index];
      if (!item.isExisting && item.filename.startsWith('blob:')) URL.revokeObjectURL(item.filename);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleAddFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Upload new files
      const newFiles = attachments.filter(m => !m.isExisting && m.file).map(m => m.file!);
      let uploadedPaths: string[] = [];

      if (newFiles.length > 0) {
        setUploadProgress(`Uploading ${newFiles.length} file(s)...`);
        const result = await onUploadFiles(newFiles);
        uploadedPaths = result.map(f => f.filename);
      }

      // Resolve "Other" permit type
      if (form.permit_type === '__other__') {
        (form as any).permit_type = form.permit_type_custom?.trim() || '';
      }
      // Combine existing + newly uploaded
      const allAttachments = [
        ...attachments.filter(m => m.isExisting).map(m => m.filename),
        ...uploadedPaths,
      ];

      setUploadProgress(null);

      await onSubmit({
        ...form,
        attachments: allAttachments,
        image_path: allAttachments[0] || null,
      });
    } catch (err: any) {
      setUploadProgress(null);
      setErrors({ _general: err.message || 'Failed to save permit' });
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: string, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  };

  const typeConfig = getPermitType(form.permit_type);
  const apiBase = (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000') + '/storage';

  const inputClasses = 'w-full h-9 px-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all';
  const selectClasses = `${inputClasses} appearance-none cursor-pointer`;
  const textareaClasses = 'w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface resize-y transition-all';
  const labelClasses = 'block text-[12px] font-medium text-text-secondary mb-1';
  const errorClasses = 'text-[11px] text-danger-600 mt-0.5';

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        {/* Header */}
        <div
          className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-surface z-10"
          style={typeConfig ? { borderTop: `4px solid ${typeConfig.color}`, backgroundColor: typeConfig.lightColor } : undefined}
        >
          <h2 className="text-[17px] font-bold text-text-primary">
            {isEdit ? 'Edit Permit' : 'New Permit to Work'}
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

          {/* Permit ID (edit only) */}
          {isEdit && permit && (
            <div>
              <label className={labelClasses}>Permit Number</label>
              <input type="text" value={permit.permit_number} readOnly className={`${inputClasses} bg-surface-sunken text-text-tertiary cursor-not-allowed`} />
            </div>
          )}

          {/* Section: Identification */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Identification</p>
            <div>
              <label className={labelClasses}>Permit Type *</label>
              <select value={form.permit_type} onChange={e => { set('permit_type', e.target.value); if (e.target.value !== '__other__') set('permit_type_custom', ''); }} className={selectClasses}>
                <option value="">Select permit type</option>
                {PERMIT_TYPES.map(t => (
                  <option key={t.key} value={t.key}>{t.abbr} - {t.label}</option>
                ))}
                <option value="__other__">Other</option>
              </select>
              {form.permit_type === '__other__' && (
                <input type="text" value={form.permit_type_custom} onChange={e => set('permit_type_custom', e.target.value)} placeholder="Enter permit type..." className={`${inputClasses} mt-1.5`} autoFocus />
              )}
              {errors.permit_type && <p className={errorClasses}>{errors.permit_type}</p>}
            </div>
          </div>

          {/* Section: Work Details */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Work Details</p>
            <div>
              <label className={labelClasses}>Title / Work Description *</label>
              <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Welding on elevated platform Zone B" className={inputClasses} />
              {errors.title && <p className={errorClasses}>{errors.title}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Area / Zone</label>
                <input type="text" value={form.area} onChange={e => set('area', e.target.value)} placeholder="e.g. Zone A" className={inputClasses} list="permit-areas-list" />
                <datalist id="permit-areas-list">
                  {(filterOptions?.areas || []).map(a => <option key={a} value={a} />)}
                </datalist>
              </div>
              <div>
                <label className={labelClasses}>Activity Type</label>
                <input type="text" value={form.activity_type} onChange={e => set('activity_type', e.target.value)} placeholder="e.g. Structural welding" className={inputClasses} />
              </div>
            </div>
            <div>
              <label className={labelClasses}>Contractor</label>
              <input type="text" value={form.contractor} onChange={e => set('contractor', e.target.value)} placeholder="e.g. CCCC, CCC Rail" className={inputClasses} list="permit-contractors-list" />
              <datalist id="permit-contractors-list">
                {(filterOptions?.contractors || []).map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className={labelClasses}>Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Detailed work description..." className={textareaClasses} />
            </div>
          </div>

          {/* Section: Schedule */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Schedule</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Permit Date *</label>
                <input type="date" value={form.permit_date} onChange={e => set('permit_date', e.target.value)} className={inputClasses} />
                {errors.permit_date && <p className={errorClasses}>{errors.permit_date}</p>}
              </div>
              <div>
                <label className={labelClasses}>End Date</label>
                <input type="date" value={form.permit_date_end} onChange={e => set('permit_date_end', e.target.value)} className={inputClasses} />
                {errors.permit_date_end && <p className={errorClasses}>{errors.permit_date_end}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Start Time</label>
                <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>End Time</label>
                <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className={inputClasses} />
              </div>
            </div>
          </div>

          {/* Section: Authorization */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Authorization</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} className={selectClasses}>
                  {PERMIT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClasses}>Approved By</label>
                <input type="text" value={form.approved_by} onChange={e => set('approved_by', e.target.value)} className={inputClasses} />
              </div>
            </div>
            <div>
              <label className={labelClasses}>Issued To</label>
              <input type="text" value={form.issued_to} onChange={e => set('issued_to', e.target.value)} placeholder="Person or company" className={inputClasses} list="permit-applicants-list" />
              <datalist id="permit-applicants-list">
                {(filterOptions?.applicants || []).map(a => <option key={a} value={a} />)}
              </datalist>
            </div>
          </div>

          {/* Section: Safety */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Safety Requirements</p>
            <div>
              <label className={labelClasses}>Safety Measures</label>
              <textarea value={form.safety_measures} onChange={e => set('safety_measures', e.target.value)} rows={2} placeholder="Safety precautions to be followed..." className={textareaClasses} />
            </div>
            <div>
              <label className={labelClasses}>PPE Requirements</label>
              <textarea value={form.ppe_requirements} onChange={e => set('ppe_requirements', e.target.value)} rows={2} placeholder="Required PPE..." className={textareaClasses} />
            </div>
            <div>
              <label className={labelClasses}>Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Additional notes..." className={textareaClasses} />
            </div>
          </div>

          {/* Section: Attachments */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Attachments</p>

            {/* Thumbnails */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {attachments.map((m, i) => {
                  const src = m.isExisting ? `${apiBase}/${m.filename}` : m.filename;
                  return (
                    <div key={i} className="relative group rounded-[var(--radius-md)] border border-border overflow-hidden bg-surface-sunken">
                      <img src={src} alt={m.originalName} className="w-full h-[80px] object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(i)}
                        className="absolute top-1 right-1 p-1 bg-danger-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove"
                      >
                        <Trash2 size={10} />
                      </button>
                      <div className="px-1.5 py-1 text-[9px] text-text-tertiary truncate">{m.originalName}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-border rounded-[var(--radius-md)] p-4 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
              onClick={() => imageInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-1.5">
                <ImagePlus size={20} className="text-text-tertiary" />
                <p className="text-[12px] text-text-tertiary">Click or drag & drop permit files</p>
                <p className="text-[10px] text-text-quaternary">Images, PDF, Word, Excel, PowerPoint (max 10MB each)</p>
              </div>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt"
              multiple
              className="hidden"
              onChange={e => {
                handleAddFiles(e.target.files);
                e.target.value = '';
              }}
            />
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
                : isEdit ? 'Update Permit' : 'Create Permit'
              }
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
