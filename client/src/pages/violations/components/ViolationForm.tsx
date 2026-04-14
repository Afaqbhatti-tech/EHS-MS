import { useState, useRef, useMemo, useEffect } from 'react';
import { Upload, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { api } from '../../../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<unknown>;
  isSubmitting: boolean;
  initialData?: Record<string, unknown> | null;
  contractors?: string[];
}

const CATEGORIES = [
  'PPE Violation', 'Work at Height', 'Electrical Safety', 'Confined Space',
  'Equipment Misuse', 'Procedure Violation', 'Unsafe Act', 'Unsafe Condition',
  'Permit Violation', 'Housekeeping', 'Fire Safety',
];

const IMMEDIATE_ACTIONS = [
  'None', 'Warning Given', 'Work Stopped', 'Area Secured',
  'PPE Provided', 'Equipment Isolated',
];

const LOCATIONS = [
  'Zone A', 'Zone B', 'Zone C', 'Station 1', 'Station 2', 'Station 3',
  'Station 4', 'Station 5', 'Chassis Line', 'Door Line', 'Trim Line',
  'Outwork Area', 'Logistics Gate', 'Workshop',
];

const OTHER = '__other__';

// Reusable select-or-type component
function SelectOrType({ label, value, customValue, options, onChange, onCustomChange, onBack, placeholder, required, error }: {
  label: string; value: string; customValue: string; options: string[];
  onChange: (v: string) => void; onCustomChange: (v: string) => void; onBack: () => void;
  placeholder?: string; required?: boolean; error?: string;
}) {
  const isOther = value === OTHER;
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}{required ? ' *' : ''}</label>
      {isOther ? (
        <div className="flex gap-2">
          <input type="text" value={customValue} onChange={e => onCustomChange(e.target.value)}
            className="input-field w-full" placeholder={placeholder || `Type ${label.toLowerCase()}...`} autoFocus />
          <button type="button" onClick={onBack}
            className="btn-secondary px-2 py-1 text-xs rounded-lg shrink-0">Back</button>
        </div>
      ) : (
        <select value={value} onChange={e => onChange(e.target.value)}
          className={`input-field w-full ${error ? 'border-danger-400' : ''}`}>
          <option value="">Select...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
          <option value={OTHER}>Other (type manually)</option>
        </select>
      )}
      {error && <p className="text-danger-500 text-xs mt-0.5">{error}</p>}
    </div>
  );
}

export default function ViolationForm({ open, onClose, onSubmit, isSubmitting, initialData, contractors = [] }: Props) {
  const isEdit = !!initialData;
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Record<string, unknown>>(() => ({
    violation_date: new Date().toISOString().slice(0, 10),
    violation_time: new Date().toTimeString().slice(0, 5),
    location: '', location_custom: '',
    area: '', department: '',
    violator_name: '', employee_id: '', designation: '',
    contractor_name: '', contractor_name_custom: '',
    violation_type: 'Routine',
    violation_category: '', violation_category_custom: '',
    description: '', violated_rule: '', hazard_description: '',
    severity: 'Medium',
    immediate_action: 'None', immediate_action_custom: '',
    immediate_action_notes: '',
    remarks: '',
    ...initialData,
  }));
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ filename: string; originalName: string; size: number; mimetype: string }>>([]);
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Generate preview URLs for image files
  const previewUrls = useMemo(
    () => localFiles.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : null),
    [localFiles],
  );
  useEffect(() => {
    return () => previewUrls.forEach(url => { if (url) URL.revokeObjectURL(url); });
  }, [previewUrls]);

  const set = (key: string, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.violation_date) errs.violation_date = 'Date is required';
    if (!(form.violator_name as string)?.trim()) errs.violator_name = 'Violator name is required';
    if (!form.violation_type) errs.violation_type = 'Type is required';
    const catVal = form.violation_category === OTHER ? form.violation_category_custom : form.violation_category;
    if (!(catVal as string)?.trim()) errs.violation_category = 'Category is required';
    if (!(form.description as string)?.trim() || ((form.description as string)?.length ?? 0) < 10) errs.description = 'Description (min 10 chars) is required';
    if (!form.severity) errs.severity = 'Severity is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files?.length) return;
    setLocalFiles(prev => [...prev, ...Array.from(files)]);
  };

  const removeLocalFile = (idx: number) => {
    setLocalFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const removeUploadedFile = (idx: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Resolve all "Other" fields before submitting
  const resolveOther = (field: string, customField: string, payload: Record<string, unknown>) => {
    if (payload[field] === OTHER) {
      payload[field] = payload[customField] || '';
    }
    delete payload[customField];
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitError(null);

    try {
      let allUploaded = [...uploadedFiles];

      // Upload any local files first
      if (localFiles.length > 0) {
        setUploading(true);
        try {
          const res = await api.upload<{ files: typeof uploadedFiles }>('/violations/upload', localFiles);
          allUploaded = [...allUploaded, ...res.files];
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : 'Failed to upload files. Please try again.');
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      const payload = { ...form };
      resolveOther('location', 'location_custom', payload);
      resolveOther('contractor_name', 'contractor_name_custom', payload);
      resolveOther('violation_category', 'violation_category_custom', payload);
      resolveOther('immediate_action', 'immediate_action_custom', payload);
      if (allUploaded.length > 0) {
        payload.evidence_files = allUploaded;
        payload.photos = allUploaded;
      }

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit violation. Please try again.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Violation' : 'Report Violation'} size="lg">
      <div className="space-y-6">
        {/* Basic Info */}
        <fieldset>
          <legend className="text-sm font-semibold text-text-primary mb-3">Basic Information</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Date *</label>
              <input type="date" value={form.violation_date as string} onChange={e => set('violation_date', e.target.value)}
                className={`input-field w-full ${errors.violation_date ? 'border-danger-400' : ''}`} />
              {errors.violation_date && <p className="text-danger-500 text-xs mt-0.5">{errors.violation_date}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Time</label>
              <input type="time" value={form.violation_time as string} onChange={e => set('violation_time', e.target.value)}
                className="input-field w-full" />
            </div>
            <SelectOrType
              label="Location / Zone"
              value={form.location as string}
              customValue={form.location_custom as string || ''}
              options={LOCATIONS}
              onChange={v => set('location', v)}
              onCustomChange={v => set('location_custom', v)}
              onBack={() => { set('location', ''); set('location_custom', ''); }}
              placeholder="Type location name..."
            />
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Area</label>
              <input type="text" value={form.area as string} onChange={e => set('area', e.target.value)}
                className="input-field w-full" placeholder="e.g., Level 3, Bay 2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Department</label>
              <input type="text" value={form.department as string} onChange={e => set('department', e.target.value)}
                className="input-field w-full" placeholder="e.g., Civil Works" />
            </div>
          </div>
        </fieldset>

        {/* Person Involved */}
        <fieldset>
          <legend className="text-sm font-semibold text-text-primary mb-3">Person Involved</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Violator Name *</label>
              <input type="text" value={form.violator_name as string} onChange={e => set('violator_name', e.target.value)}
                className={`input-field w-full ${errors.violator_name ? 'border-danger-400' : ''}`}
                placeholder="Full name of violator" />
              {errors.violator_name && <p className="text-danger-500 text-xs mt-0.5">{errors.violator_name}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Employee ID</label>
              <input type="text" value={form.employee_id as string} onChange={e => set('employee_id', e.target.value)}
                className="input-field w-full" placeholder="Badge/ID number" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Role / Designation</label>
              <input type="text" value={form.designation as string} onChange={e => set('designation', e.target.value)}
                className="input-field w-full" placeholder="e.g., Electrician, Welder" />
            </div>
            <SelectOrType
              label="Contractor / Company"
              value={form.contractor_name as string}
              customValue={form.contractor_name_custom as string || ''}
              options={contractors}
              onChange={v => set('contractor_name', v)}
              onCustomChange={v => set('contractor_name_custom', v)}
              onBack={() => { set('contractor_name', ''); set('contractor_name_custom', ''); }}
              placeholder="Type contractor name..."
            />
          </div>
        </fieldset>

        {/* Violation Details */}
        <fieldset>
          <legend className="text-sm font-semibold text-text-primary mb-3">Violation Details</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Type *</label>
              <select value={form.violation_type as string} onChange={e => set('violation_type', e.target.value)}
                className={`input-field w-full ${errors.violation_type ? 'border-danger-400' : ''}`}>
                <option value="">Select...</option>
                <option value="Routine">Routine Violation</option>
                <option value="Situational">Situational Violation</option>
                <option value="Exceptional">Exceptional Violation</option>
              </select>
              {errors.violation_type && <p className="text-danger-500 text-xs mt-0.5">{errors.violation_type}</p>}
            </div>
            <SelectOrType
              label="Category"
              value={form.violation_category as string}
              customValue={form.violation_category_custom as string || ''}
              options={CATEGORIES}
              onChange={v => set('violation_category', v)}
              onCustomChange={v => set('violation_category_custom', v)}
              onBack={() => { set('violation_category', ''); set('violation_category_custom', ''); }}
              placeholder="Type category name..."
              required
              error={errors.violation_category}
            />
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Severity *</label>
              <select value={form.severity as string} onChange={e => set('severity', e.target.value)}
                className={`input-field w-full ${errors.severity ? 'border-danger-400' : ''}`}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-text-secondary mb-1">Description *</label>
            <textarea value={form.description as string} onChange={e => set('description', e.target.value)}
              className={`input-field w-full min-h-[80px] ${errors.description ? 'border-danger-400' : ''}`}
              placeholder="Detailed description of the violation observed..." rows={3} />
            {errors.description && <p className="text-danger-500 text-xs mt-0.5">{errors.description}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Rule / Procedure Violated</label>
              <textarea value={form.violated_rule as string} onChange={e => set('violated_rule', e.target.value)}
                className="input-field w-full" rows={2} placeholder="e.g., PPE Policy Section 4.2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Immediate Risk / Hazard</label>
              <textarea value={form.hazard_description as string} onChange={e => set('hazard_description', e.target.value)}
                className="input-field w-full" rows={2} placeholder="Describe the immediate risk/hazard" />
            </div>
          </div>
        </fieldset>

        {/* Immediate Action */}
        <fieldset>
          <legend className="text-sm font-semibold text-text-primary mb-3">Immediate Action Taken</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectOrType
              label="Action"
              value={form.immediate_action as string}
              customValue={form.immediate_action_custom as string || ''}
              options={IMMEDIATE_ACTIONS}
              onChange={v => set('immediate_action', v)}
              onCustomChange={v => set('immediate_action_custom', v)}
              onBack={() => { set('immediate_action', 'None'); set('immediate_action_custom', ''); }}
              placeholder="Type action taken..."
            />
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Action Notes</label>
              <textarea value={form.immediate_action_notes as string} onChange={e => set('immediate_action_notes', e.target.value)}
                className="input-field w-full" rows={2} placeholder="Additional notes on action taken" />
            </div>
          </div>
        </fieldset>

        {/* Evidence Upload */}
        <fieldset>
          <legend className="text-sm font-semibold text-text-primary mb-3">Evidence / Photos</legend>
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt" className="hidden"
            onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />
          <div
            className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary-300 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFileSelect(e.dataTransfer.files); }}
          >
            <div className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700">
              <Upload size={16} />
              Upload photos or documents
            </div>
            <p className="text-xs text-text-tertiary mt-1">Images, PDF, Word, Excel, PowerPoint — max 10MB per file</p>
          </div>

          {/* Local file previews (not yet uploaded) */}
          {localFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                Files ready to upload ({localFiles.length})
              </p>
              {localFiles.some(f => f.type.startsWith('image/')) && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {localFiles.map((file, i) =>
                    file.type.startsWith('image/') && previewUrls[i] ? (
                      <div key={`img-${i}`} className="relative group rounded-lg overflow-hidden border border-border bg-surface-sunken aspect-square">
                        <img src={previewUrls[i]!} alt={file.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                        <button type="button" onClick={() => removeLocalFile(i)}
                          className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger-600"
                          title="Remove">
                          <Trash2 size={12} />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/50 text-white">
                          <p className="text-[10px] truncate">{file.name}</p>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              )}
              {localFiles.map((file, i) =>
                !file.type.startsWith('image/') ? (
                  <div key={`doc-${i}`} className="flex items-center justify-between bg-canvas rounded-lg px-3 py-2 text-sm">
                    <span className="text-text-primary truncate flex-1">{file.name}</span>
                    <button onClick={() => removeLocalFile(i)} className="p-1 text-danger-500 hover:bg-danger-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Already-uploaded files */}
          {uploadedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Uploaded ({uploadedFiles.length})</p>
              {uploadedFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-success-50 border border-success-100 rounded-lg px-3 py-2 text-sm">
                  <span className="text-text-primary truncate flex-1">{f.originalName}</span>
                  <button onClick={() => removeUploadedFile(i)} className="p-1 text-danger-500 hover:bg-danger-50 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        {/* Remarks */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Remarks / Additional Notes</label>
          <textarea value={form.remarks as string} onChange={e => set('remarks', e.target.value)}
            className="input-field w-full" rows={2} placeholder="Any additional remarks..." />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-border space-y-3">
        {submitError && (
          <div className="flex items-center gap-2 p-3 bg-danger-50 border border-danger-100 rounded-lg text-[13px] text-danger-700">
            <AlertTriangle size={16} className="text-danger-500 shrink-0" />
            {submitError}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={isSubmitting || uploading} className="btn-secondary px-4 py-2 text-sm rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting || uploading}
            className="btn-primary px-5 py-2 text-sm rounded-lg disabled:opacity-50 inline-flex items-center gap-2">
            {(isSubmitting || uploading) && <Loader2 size={14} className="animate-spin" />}
            {uploading ? 'Uploading files...' : isSubmitting ? 'Saving...' : isEdit ? 'Update Violation' : 'Report Violation'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
