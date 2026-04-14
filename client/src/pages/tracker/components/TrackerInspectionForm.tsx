import { useState, useRef, useEffect } from 'react';
import { X as XIcon, Upload, Trash2, FileText } from 'lucide-react';
import { TRACKER_INSPECTION_TYPES, TRACKER_INSPECTION_RESULTS, TRACKER_CONDITIONS, getCategoryByKey } from '../../../config/trackerCategories';
import type { TrackerRecord, TrackerInspection } from '../hooks/useTracker';
import { api } from '../../../services/api';
import { ChecklistSection } from '../inspections/components/ChecklistSection';
import type { ChecklistResponse } from '../../../config/inspectionConfig';

const PURPOSES = ['Routine', 'Post-Incident', 'Pre-Mobilisation', 'Certification', 'TUV Renewal', 'Emergency', 'Scheduled'];
const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual'];
const HARNESS_CONDITIONS = ['Good', 'Fair', 'Poor', 'Remove from Service'];

function Field({ label, children, required, hint }: { label: string; children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-text-secondary mb-1">
        {label} {required && <span className="text-danger-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-text-tertiary mt-1">{hint}</p>}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">{title}</p>;
}

interface Props {
  record: TrackerRecord;
  onSubmit: (recordId: number, data: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
  existingInspection?: TrackerInspection | null;
}

export function TrackerInspectionForm({ record, onSubmit, onClose, existingInspection }: Props) {
  const isEditing = !!existingInspection;
  const catConfig = getCategoryByKey(record.category_key);
  const checklistFileRef = useRef<HTMLInputElement>(null);
  const checklistImageRef = useRef<HTMLInputElement>(null);
  const additionalImagesRef = useRef<HTMLInputElement>(null);
  const supportingDocsRef = useRef<HTMLInputElement>(null);

  const ei = existingInspection;
  const [form, setForm] = useState({
    inspection_date: ei?.inspection_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    inspection_type: ei?.inspection_type || 'Internal Weekly',
    inspection_purpose: ei?.inspection_purpose || '',
    inspection_frequency: ei?.inspection_frequency || '',
    inspector_name: ei?.inspector_name || '',
    inspector_company: ei?.inspector_company || '',
    result: ei?.result || 'Pass',
    condition_found: ei?.condition_found || record.condition || 'Good',
    next_inspection_date: ei?.next_inspection_date?.split('T')[0] || '',
    sticker_number: ei?.sticker_number || record.sticker_number || '',
    plate_number_at_insp: ei?.plate_number_at_insp || record.plate_number || '',
    certificate_issued: ei?.certificate_number ? true : false,
    certificate_number: ei?.certificate_number || '',
    certificate_expiry: ei?.certificate_expiry?.split('T')[0] || '',
    tuv_updated: false,
    findings: ei?.findings || '',
    corrective_actions: ei?.corrective_actions || '',
    visual_condition_notes: ei?.visual_condition_notes || '',
    defect_found: ei?.defect_found || false,
    defect_detail: ei?.defect_detail || '',
    notes: ei?.notes || '',
    verified_by: ei?.verified_by || '',
    // Category-specific
    extinguisher_weight_kg: ei?.extinguisher_weight_kg ?? '',
    civil_defense_tag_ok: ei?.civil_defense_tag_ok || false,
    harness_condition: ei?.harness_condition || '',
    drop_arrest_occurred: ei?.drop_arrest_occurred || false,
    ladder_type: ei?.ladder_type || '',
  });

  const [checklistResponses, setChecklistResponses] = useState<ChecklistResponse[]>([]);

  const [checklistFile, setChecklistFile] = useState<File | null>(null);
  const [checklistImage, setChecklistImage] = useState<File | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [supportingDocs, setSupportingDocs] = useState<File[]>([]);

  // Existing attachments from server (for edit mode)
  const [existingChecklistFile, setExistingChecklistFile] = useState<{ url: string; path: string } | null>(null);
  const [existingChecklistImage, setExistingChecklistImage] = useState<{ url: string; path: string } | null>(null);
  const [existingAdditionalImages, setExistingAdditionalImages] = useState<{ url: string; path: string }[]>([]);
  const [existingSupportingDocs, setExistingSupportingDocs] = useState<{ url: string; path: string }[]>([]);

  // Load existing attachments when editing
  useEffect(() => {
    if (ei) {
      if (ei.checklist_file_url && ei.checklist_file_path) {
        setExistingChecklistFile({ url: ei.checklist_file_url, path: ei.checklist_file_path });
      }
      if (ei.checklist_image_url && ei.checklist_image_path) {
        setExistingChecklistImage({ url: ei.checklist_image_url, path: ei.checklist_image_path });
      }
      if (ei.additional_image_urls?.length && ei.additional_images?.length) {
        setExistingAdditionalImages(
          ei.additional_image_urls.map((url, i) => ({ url, path: ei.additional_images![i] || '' })).filter(x => x.path)
        );
      }
      if (ei.supporting_doc_urls?.length && ei.supporting_docs?.length) {
        setExistingSupportingDocs(
          ei.supporting_doc_urls.map((url, i) => ({ url, path: ei.supporting_docs![i] || '' })).filter(x => x.path)
        );
      }
    }
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Build FormData for file uploads
      const formData = new FormData();
      const booleanFields = ['certificate_issued', 'tuv_updated', 'defect_found', 'civil_defense_tag_ok', 'drop_arrest_occurred'];
      Object.entries(form).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) return;
        // Send booleans as 1/0 for Laravel; skip false booleans on nullable fields
        if (booleanFields.includes(key)) {
          if (value) formData.append(key, '1');
          else formData.append(key, '0');
          return;
        }
        formData.append(key, String(value));
      });

      // Include inline checklist responses
      if (checklistResponses.length > 0) {
        formData.append('checklist_data', JSON.stringify(checklistResponses));
      }

      if (checklistFile) formData.append('checklist_file', checklistFile);
      if (checklistImage) formData.append('checklist_image', checklistImage);
      additionalImages.forEach(img => formData.append('additional_images[]', img));
      supportingDocs.forEach(doc => formData.append('supporting_docs[]', doc));

      // Send existing attachment info when editing
      if (isEditing) {
        // Tell backend if existing single files were removed
        if (ei?.checklist_file_path && !existingChecklistFile && !checklistFile) {
          formData.append('remove_checklist_file', '1');
        }
        if (ei?.checklist_image_path && !existingChecklistImage && !checklistImage) {
          formData.append('remove_checklist_image', '1');
        }
        // Send remaining existing array paths so backend knows what to keep
        existingAdditionalImages.forEach(img => formData.append('existing_additional_images[]', img.path));
        existingSupportingDocs.forEach(doc => formData.append('existing_supporting_docs[]', doc.path));
      }

      const endpoint = isEditing
        ? `/tracker/inspections/${existingInspection!.id}`
        : `/tracker/records/${record.id}/inspections`;
      // Laravel requires _method override for PUT with FormData
      if (isEditing) formData.append('_method', 'PUT');
      await api.uploadForm(endpoint, formData);

      // Trigger parent refresh
      await onSubmit(record.id, {});
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all";

  const isFire = record.category_key === 'fire_extinguisher';
  const isHarness = record.category_key === 'full_body_harness';
  const isLadder = record.category_key === 'ladder';
  const hasPlate = catConfig?.hasPlate;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel right-0 w-[520px] max-w-full animate-slideInRight">
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border" style={{ borderTop: `4px solid ${record.category_color || 'var(--color-primary-500)'}` }}>
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">{isEditing ? 'Edit Inspection' : 'Record Inspection'}</h2>
            <p className="text-[12px] text-text-tertiary mt-0.5">{record.record_code} — {record.equipment_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 overscroll-contain p-6 space-y-5">
          {error && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">{error}</div>
          )}

          {/* Inspection Info */}
          <div className="space-y-3">
            <SectionHeader title="Inspection Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Inspection Date" required>
                <input type="date" value={form.inspection_date} onChange={e => setForm(p => ({ ...p, inspection_date: e.target.value }))} className={inputCls} required />
              </Field>
              <Field label="Inspection Type" required>
                <select value={form.inspection_type} onChange={e => setForm(p => ({ ...p, inspection_type: e.target.value }))} className={inputCls}>
                  {TRACKER_INSPECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Purpose">
                <select value={form.inspection_purpose} onChange={e => setForm(p => ({ ...p, inspection_purpose: e.target.value }))} className={inputCls}>
                  <option value="">— Select —</option>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Frequency">
                <select value={form.inspection_frequency} onChange={e => setForm(p => ({ ...p, inspection_frequency: e.target.value }))} className={inputCls}>
                  <option value="">— Select —</option>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Inspector Name" required>
                <input value={form.inspector_name} onChange={e => setForm(p => ({ ...p, inspector_name: e.target.value }))} className={inputCls} required placeholder="Full name" />
              </Field>
              <Field label="Inspector Company">
                <input value={form.inspector_company} onChange={e => setForm(p => ({ ...p, inspector_company: e.target.value }))} className={inputCls} placeholder="Company name" />
              </Field>
            </div>
          </div>

          {/* Item Reference */}
          {(hasPlate || true) && (
            <div className="space-y-3">
              <SectionHeader title="Item Reference" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Sticker Number" hint="Inspection sticker reference on equipment">
                  <input value={form.sticker_number} onChange={e => setForm(p => ({ ...p, sticker_number: e.target.value }))} className={inputCls} placeholder="Sticker #" />
                </Field>
                {hasPlate && (
                  <Field label="Plate Number at Inspection">
                    <input value={form.plate_number_at_insp} onChange={e => setForm(p => ({ ...p, plate_number_at_insp: e.target.value }))} className={inputCls} placeholder="Plate #" />
                  </Field>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          <div className="space-y-3">
            <SectionHeader title="Results" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Overall Result" required>
                <select value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} className={inputCls}>
                  {TRACKER_INSPECTION_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Condition Found" required>
                <select value={form.condition_found} onChange={e => setForm(p => ({ ...p, condition_found: e.target.value }))} className={inputCls}>
                  {TRACKER_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Findings">
              <textarea value={form.findings} onChange={e => setForm(p => ({ ...p, findings: e.target.value }))} className={inputCls} rows={3} placeholder="What was found during inspection..." />
            </Field>
            {(form.result === 'Fail' || form.result === 'Requires Action' || form.result === 'Pass with Issues') && (
              <Field label="Corrective Actions">
                <textarea value={form.corrective_actions} onChange={e => setForm(p => ({ ...p, corrective_actions: e.target.value }))} className={inputCls} rows={3} placeholder="Actions required or taken..." />
              </Field>
            )}
            <Field label="Visual Condition Notes">
              <textarea value={form.visual_condition_notes} onChange={e => setForm(p => ({ ...p, visual_condition_notes: e.target.value }))} className={inputCls} rows={2} placeholder="Detailed visual condition description..." />
            </Field>
          </div>

          {/* Inspection Checklist */}
          <div className="space-y-3">
            <SectionHeader title="Inspection Checklist" />
            <p className="text-[11px] text-text-tertiary -mt-1">
              Complete the checklist items for this {catConfig?.label || 'equipment'} category. Items marked * are mandatory.
            </p>
            <ChecklistSection
              categoryKey={record.category_key}
              value={checklistResponses}
              onChange={setChecklistResponses}
              existingResponses={ei?.checklist_data as ChecklistResponse[] | null | undefined}
            />
          </div>

          {/* Category-specific fields */}
          {(isFire || isHarness || isLadder) && (
            <div className="space-y-3">
              <SectionHeader title="Category Details" />
              {isFire && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Weight at Inspection (KG)">
                    <input type="number" step="0.1" value={form.extinguisher_weight_kg} onChange={e => setForm(p => ({ ...p, extinguisher_weight_kg: e.target.value }))} className={inputCls} placeholder="e.g. 6.5" />
                  </Field>
                  <Field label="Civil Defense Tag Present?">
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input type="checkbox" checked={form.civil_defense_tag_ok} onChange={e => setForm(p => ({ ...p, civil_defense_tag_ok: e.target.checked }))}
                        className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500" />
                      <span className="text-[13px] text-text-primary">Yes, tag is present and valid</span>
                    </label>
                  </Field>
                </div>
              )}
              {isHarness && (
                <>
                  <Field label="Harness Condition">
                    <select value={form.harness_condition} onChange={e => setForm(p => ({ ...p, harness_condition: e.target.value }))} className={inputCls}>
                      <option value="">— Select —</option>
                      {HARNESS_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.drop_arrest_occurred} onChange={e => setForm(p => ({ ...p, drop_arrest_occurred: e.target.checked }))}
                      className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500" />
                    <span className="text-[13px] font-medium text-text-primary">Drop/Fall Arrest Since Last Inspection</span>
                  </label>
                  {form.drop_arrest_occurred && (
                    <div className="p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[12px] text-danger-700">
                      Equipment will be marked Out of Service when a drop arrest is recorded.
                    </div>
                  )}
                </>
              )}
              {isLadder && (
                <Field label="Ladder Type">
                  <input value={form.ladder_type} onChange={e => setForm(p => ({ ...p, ladder_type: e.target.value }))} className={inputCls} placeholder="e.g. Step, Extension, Roof" />
                </Field>
              )}
            </div>
          )}

          {/* Defect */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.defect_found} onChange={e => setForm(p => ({ ...p, defect_found: e.target.checked }))}
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500" />
              <span className="text-[13px] font-medium text-text-primary">Defect Found</span>
            </label>
            {form.defect_found && (
              <Field label="Defect Detail" required>
                <textarea value={form.defect_detail} onChange={e => setForm(p => ({ ...p, defect_detail: e.target.value }))} className={inputCls} rows={2} placeholder="Describe the defect..." />
              </Field>
            )}
          </div>

          {/* Next Inspection */}
          <Field label="Next Inspection Date" hint="Auto-calculated from category frequency if left empty">
            <input type="date" value={form.next_inspection_date} onChange={e => setForm(p => ({ ...p, next_inspection_date: e.target.value }))} className={inputCls} />
          </Field>

          {/* Certificate */}
          {catConfig?.hasCert && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.certificate_issued} onChange={e => setForm(p => ({ ...p, certificate_issued: e.target.checked }))}
                  className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500" />
                <span className="text-[13px] font-medium text-text-primary">Certificate Issued</span>
              </label>
              {form.certificate_issued && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Certificate Number">
                    <input value={form.certificate_number} onChange={e => setForm(p => ({ ...p, certificate_number: e.target.value }))} className={inputCls} />
                  </Field>
                  <Field label="Certificate Expiry">
                    <input type="date" value={form.certificate_expiry} onChange={e => setForm(p => ({ ...p, certificate_expiry: e.target.value }))} className={inputCls} />
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* TUV Update */}
          {catConfig?.hasTUV && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.tuv_updated} onChange={e => setForm(p => ({ ...p, tuv_updated: e.target.checked }))}
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500" />
              <span className="text-[13px] font-medium text-text-primary">TUV certificate was updated in this inspection</span>
            </label>
          )}

          {/* Attachments */}
          <div className="space-y-3">
            <SectionHeader title="Attachments" />

            {/* Checklist File */}
            <div>
              <p className="text-[12px] font-medium text-text-secondary mb-1.5">Checklist Document</p>
              {/* Show existing file from server */}
              {existingChecklistFile && !checklistFile && (
                <div className="flex items-center gap-2 p-2 bg-surface-sunken rounded-[var(--radius-sm)] border border-border mb-2">
                  <FileText size={16} className="text-primary-500 shrink-0" />
                  <a href={existingChecklistFile.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-[12px] text-primary-600 hover:underline truncate">
                    {existingChecklistFile.path.split('/').pop()}
                  </a>
                  <span className="text-[10px] text-text-tertiary shrink-0">Existing</span>
                  <button type="button" onClick={() => setExistingChecklistFile(null)}
                    className="p-1 text-danger-500 hover:bg-danger-50 rounded shrink-0"><Trash2 size={13} /></button>
                </div>
              )}
              {/* Show newly selected file */}
              {checklistFile ? (
                <div className="flex items-center gap-2 p-2 bg-surface-sunken rounded-[var(--radius-sm)] border border-border">
                  <span className="flex-1 text-[12px] text-text-primary truncate">{checklistFile.name}</span>
                  <span className="text-[10px] text-text-tertiary">{(checklistFile.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={() => { setChecklistFile(null); if (checklistFileRef.current) checklistFileRef.current.value = ''; }}
                    className="p-1 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={13} /></button>
                </div>
              ) : !existingChecklistFile && (
                <button type="button" onClick={() => checklistFileRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-border rounded-[var(--radius-md)] text-center hover:border-primary-300 hover:bg-primary-50/30 transition-colors cursor-pointer">
                  <Upload size={20} className="mx-auto text-text-tertiary mb-1" />
                  <p className="text-[12px] text-text-secondary">Upload checklist (PDF, Word, Excel, PowerPoint)</p>
                  <p className="text-[10px] text-text-tertiary">Max 20MB</p>
                </button>
              )}
              {/* Replace button when existing file is shown */}
              {existingChecklistFile && !checklistFile && (
                <button type="button" onClick={() => checklistFileRef.current?.click()}
                  className="mt-1 px-3 py-1 text-[10px] font-medium text-text-tertiary hover:text-primary-600 transition-colors">
                  Replace file
                </button>
              )}
              <input ref={checklistFileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt"
                onChange={e => { if (e.target.files?.[0]) { setChecklistFile(e.target.files[0]); setExistingChecklistFile(null); } }} />
            </div>

            {/* Checklist Image */}
            <div>
              <p className="text-[12px] font-medium text-text-secondary mb-1.5">Checklist Photo</p>
              {/* Show existing image from server */}
              {existingChecklistImage && !checklistImage && (
                <div className="flex items-center gap-2 p-2 bg-surface-sunken rounded-[var(--radius-sm)] border border-border mb-2">
                  <img src={existingChecklistImage.url} alt="Checklist" className="w-12 h-9 object-cover rounded" />
                  <a href={existingChecklistImage.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-[12px] text-primary-600 hover:underline truncate">
                    {existingChecklistImage.path.split('/').pop()}
                  </a>
                  <span className="text-[10px] text-text-tertiary shrink-0">Existing</span>
                  <button type="button" onClick={() => setExistingChecklistImage(null)}
                    className="p-1 text-danger-500 hover:bg-danger-50 rounded shrink-0"><Trash2 size={13} /></button>
                </div>
              )}
              {/* Show newly selected image */}
              {checklistImage ? (
                <div className="flex items-center gap-2 p-2 bg-surface-sunken rounded-[var(--radius-sm)] border border-border">
                  <img src={URL.createObjectURL(checklistImage)} alt="Preview" className="w-12 h-9 object-cover rounded" />
                  <span className="flex-1 text-[12px] text-text-primary truncate">{checklistImage.name}</span>
                  <button type="button" onClick={() => { setChecklistImage(null); if (checklistImageRef.current) checklistImageRef.current.value = ''; }}
                    className="p-1 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={13} /></button>
                </div>
              ) : !existingChecklistImage && (
                <button type="button" onClick={() => checklistImageRef.current?.click()}
                  className="w-full p-3 border-2 border-dashed border-border rounded-[var(--radius-md)] text-center hover:border-primary-300 hover:bg-primary-50/30 transition-colors cursor-pointer">
                  <p className="text-[12px] text-text-secondary">Upload photo of checklist (JPG, PNG)</p>
                </button>
              )}
              {/* Replace button when existing image is shown */}
              {existingChecklistImage && !checklistImage && (
                <button type="button" onClick={() => checklistImageRef.current?.click()}
                  className="mt-1 px-3 py-1 text-[10px] font-medium text-text-tertiary hover:text-primary-600 transition-colors">
                  Replace photo
                </button>
              )}
              <input ref={checklistImageRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt"
                onChange={e => { if (e.target.files?.[0]) { setChecklistImage(e.target.files[0]); setExistingChecklistImage(null); } }} />
            </div>

            {/* Additional Images */}
            <div>
              <p className="text-[12px] font-medium text-text-secondary mb-1.5">Additional Photos ({existingAdditionalImages.length + additionalImages.length}/5)</p>
              {/* Show existing images from server */}
              {existingAdditionalImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {existingAdditionalImages.map((img, i) => (
                    <div key={`existing-${i}`} className="relative group">
                      <a href={img.url} target="_blank" rel="noopener noreferrer">
                        <img src={img.url} alt={`Photo ${i + 1}`} className="w-16 h-12 object-cover rounded border border-border hover:brightness-90 transition" />
                      </a>
                      <button type="button" onClick={() => setExistingAdditionalImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 text-white rounded-full flex items-center justify-center text-[8px]">x</button>
                    </div>
                  ))}
                </div>
              )}
              {/* Show newly added images */}
              {additionalImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {additionalImages.map((img, i) => (
                    <div key={`new-${i}`} className="relative">
                      <img src={URL.createObjectURL(img)} alt={`New photo ${i + 1}`} className="w-16 h-12 object-cover rounded border border-border" />
                      <button type="button" onClick={() => setAdditionalImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 text-white rounded-full flex items-center justify-center text-[8px]">x</button>
                    </div>
                  ))}
                </div>
              )}
              {(existingAdditionalImages.length + additionalImages.length) < 5 && (
                <button type="button" onClick={() => additionalImagesRef.current?.click()}
                  className="px-3 py-1.5 text-[11px] font-medium text-primary-600 bg-primary-50 rounded-[var(--radius-sm)] hover:bg-primary-100 transition-colors">
                  + Add Photo
                </button>
              )}
              <input ref={additionalImagesRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt" multiple
                onChange={e => {
                  if (e.target.files) {
                    const remaining = 5 - existingAdditionalImages.length - additionalImages.length;
                    const newFiles = Array.from(e.target.files).slice(0, remaining);
                    setAdditionalImages(prev => [...prev, ...newFiles]);
                  }
                  if (additionalImagesRef.current) additionalImagesRef.current.value = '';
                }} />
            </div>

            {/* Supporting Docs */}
            <div>
              <p className="text-[12px] font-medium text-text-secondary mb-1.5">Supporting Documents ({existingSupportingDocs.length + supportingDocs.length}/3)</p>
              {/* Show existing docs from server */}
              {existingSupportingDocs.length > 0 && (
                <div className="space-y-1 mb-2">
                  {existingSupportingDocs.map((doc, i) => (
                    <div key={`existing-${i}`} className="flex items-center gap-2 p-1.5 bg-surface-sunken rounded-[var(--radius-sm)] border border-border">
                      <FileText size={13} className="text-primary-500 shrink-0" />
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 text-[11px] text-primary-600 hover:underline truncate">
                        {doc.path.split('/').pop()}
                      </a>
                      <span className="text-[9px] text-text-tertiary shrink-0">Existing</span>
                      <button type="button" onClick={() => setExistingSupportingDocs(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-0.5 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
              {/* Show newly added docs */}
              {supportingDocs.length > 0 && (
                <div className="space-y-1 mb-2">
                  {supportingDocs.map((doc, i) => (
                    <div key={`new-${i}`} className="flex items-center gap-2 p-1.5 bg-surface-sunken rounded-[var(--radius-sm)] border border-border">
                      <span className="flex-1 text-[11px] text-text-primary truncate">{doc.name}</span>
                      <button type="button" onClick={() => setSupportingDocs(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-0.5 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
              {(existingSupportingDocs.length + supportingDocs.length) < 3 && (
                <button type="button" onClick={() => supportingDocsRef.current?.click()}
                  className="px-3 py-1.5 text-[11px] font-medium text-primary-600 bg-primary-50 rounded-[var(--radius-sm)] hover:bg-primary-100 transition-colors">
                  + Add Document
                </button>
              )}
              <input ref={supportingDocsRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt" multiple
                onChange={e => {
                  if (e.target.files) {
                    const remaining = 3 - existingSupportingDocs.length - supportingDocs.length;
                    const newFiles = Array.from(e.target.files).slice(0, remaining);
                    setSupportingDocs(prev => [...prev, ...newFiles]);
                  }
                  if (supportingDocsRef.current) supportingDocsRef.current.value = '';
                }} />
            </div>
          </div>

          {/* Verification */}
          <Field label="Verified By">
            <input value={form.verified_by} onChange={e => setForm(p => ({ ...p, verified_by: e.target.value }))} className={inputCls} placeholder="Verifier name (optional)" />
          </Field>

          {/* Notes */}
          <Field label="Notes">
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputCls} rows={2} placeholder="Additional notes..." />
          </Field>

          {/* Actions */}
          <div className="shrink-0 flex justify-end gap-2 pt-3 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !form.inspector_name}
              className="px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-xs">
              {submitting ? 'Saving...' : 'Record Inspection'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
