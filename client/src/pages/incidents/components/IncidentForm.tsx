import { useState, useRef, useMemo, useEffect } from 'react';
import { Save, X as XIcon, Upload, AlertTriangle, User, FileText, Shield, Camera, Trash2, Loader2, Download, Eye } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { api } from '../../../services/api';
import type { Incident, IncidentEvidenceItem } from '../useIncidents';
import {
  INCIDENT_TYPES,
  INCIDENT_CATEGORIES,
  SEVERITY_LEVELS,
  INJURY_TYPES,
  BODY_PARTS,
} from '../useIncidents';

const STORAGE_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '') + '/storage/';

// ─── Constants ──────────────────────────────────

const LOCATIONS = [
  'Zone A', 'Zone B', 'Zone C',
  'Station 1', 'Station 2', 'Station 3', 'Station 4', 'Station 5',
  'Chassis Line', 'Door Line', 'Trim Line',
  'Outwork Area', 'Logistics Gate', 'Workshop',
];

const CONTRACTORS = ['CCCC', 'CCC Rail', 'Artal', 'FFT Direct'];

const OTHER = '__other__';

// ─── Types ──────────────────────────────────────

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  existingIncident?: Incident | null;
  hook: {
    create: { mutateAsync: (data: Record<string, unknown>) => Promise<unknown>; isPending: boolean };
    update: { mutateAsync: (args: { id: string; data: Record<string, unknown> }) => Promise<unknown>; isPending: boolean };
    uploadFiles: { mutateAsync: (files: File[]) => Promise<{ files: { filename: string; originalName: string; size: number; mimetype: string }[] }> };
    uploadEvidence: { mutateAsync: (args: { id: string; files: File[]; related_type?: string }) => Promise<unknown> };
    deleteEvidence: { mutateAsync: (args: { incidentId: string; evidenceId: string }) => Promise<unknown> };
  };
}

interface FormState {
  // Basic Information
  incident_date: string;
  incident_time: string;
  location: string;
  area: string;
  department: string;
  // Incident Classification
  incident_type: string;
  incident_category: string;
  severity: string;
  description: string;
  immediate_action: string;
  // Person Involved
  affected_person_name: string;
  employee_id: string;
  designation: string;
  contractor_name: string;
  contact_number: string;
  supervisor_name: string;
  // Injury / Impact Details
  injury_type: string;
  body_part_affected: string;
  medical_treatment_required: boolean;
  lost_time_injury: boolean;
  hospitalization: boolean;
  property_damage: boolean;
  equipment_damage: boolean;
  environmental_impact: boolean;
  financial_loss: string;
  incident_outcome_summary: string;
  // Evidence
  remarks: string;
  // Custom "Other" fields
  location_custom: string;
  incident_type_custom: string;
  incident_category_custom: string;
  contractor_name_custom: string;
  injury_type_custom: string;
  body_part_affected_custom: string;
}

interface UploadedFile {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
}

// ─── Helpers ────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

// ─── Section Card (outside component to avoid remount on re-render) ──

function SectionCard({
  id,
  icon: Icon,
  title,
  collapsed,
  onToggle,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-2.5 px-5 py-3.5 text-left hover:bg-surface-sunken/50 transition-colors"
      >
        <Icon size={16} className="text-primary-600 shrink-0" />
        <span className="text-[13px] font-semibold text-text-primary flex-1">{title}</span>
        <svg
          className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${collapsed ? '-rotate-90' : 'rotate-0'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!collapsed && (
        <div className="px-5 pb-5 pt-1 border-t border-border/50">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────

export default function IncidentForm({ onSuccess, onCancel, existingIncident, hook }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const isEdit = !!existingIncident;

  const buildInitialForm = (): FormState => {
    if (!existingIncident) {
      return {
        incident_date: new Date().toISOString().slice(0, 10),
        incident_time: new Date().toTimeString().slice(0, 5),
        location: '', area: '', department: '',
        incident_type: '', incident_category: '', severity: '',
        description: '', immediate_action: '',
        affected_person_name: '', employee_id: '', designation: '',
        contractor_name: '', contact_number: '', supervisor_name: '',
        injury_type: '', body_part_affected: '',
        medical_treatment_required: false, lost_time_injury: false,
        hospitalization: false, property_damage: false,
        equipment_damage: false, environmental_impact: false,
        financial_loss: '', incident_outcome_summary: '', remarks: '',
        location_custom: '', incident_type_custom: '', incident_category_custom: '',
        contractor_name_custom: '', injury_type_custom: '', body_part_affected_custom: '',
      };
    }
    const e = existingIncident;
    // Check if stored value is a custom "Other" value not in the predefined lists
    const checkCustom = (val: string | null, list: readonly string[]) => {
      if (!val) return { value: '', custom: '' };
      if (list.includes(val)) return { value: val, custom: '' };
      return { value: OTHER, custom: val };
    };
    const loc = checkCustom(e.location, LOCATIONS);
    const iType = checkCustom(e.incident_type, INCIDENT_TYPES);
    const iCat = checkCustom(e.incident_category, INCIDENT_CATEGORIES);
    const contr = checkCustom(e.contractor_name, CONTRACTORS);
    const inj = checkCustom(e.injury_type, INJURY_TYPES);
    const body = checkCustom(e.body_part_affected, BODY_PARTS);

    return {
      incident_date: e.incident_date?.slice(0, 10) || '',
      incident_time: e.incident_time || '',
      location: loc.value, location_custom: loc.custom,
      area: e.area || '',
      department: e.department || '',
      incident_type: iType.value, incident_type_custom: iType.custom,
      incident_category: iCat.value, incident_category_custom: iCat.custom,
      severity: e.severity || '',
      description: e.description || '',
      immediate_action: e.immediate_action || '',
      affected_person_name: e.affected_person_name || '',
      employee_id: e.employee_id || '',
      designation: e.designation || '',
      contractor_name: contr.value, contractor_name_custom: contr.custom,
      contact_number: e.contact_number || '',
      supervisor_name: e.supervisor_name || '',
      injury_type: inj.value, injury_type_custom: inj.custom,
      body_part_affected: body.value, body_part_affected_custom: body.custom,
      medical_treatment_required: e.medical_treatment_required ?? false,
      lost_time_injury: e.lost_time_injury ?? false,
      hospitalization: e.hospitalization ?? false,
      property_damage: e.property_damage ?? false,
      equipment_damage: e.equipment_damage ?? false,
      environmental_impact: e.environmental_impact ?? false,
      financial_loss: e.financial_loss != null ? String(e.financial_loss) : '',
      incident_outcome_summary: e.incident_outcome_summary || '',
      remarks: e.remarks || '',
    };
  };

  const [form, setForm] = useState<FormState>(buildInitialForm);

  const resolveOther = (field: keyof FormState, customField: keyof FormState, obj: Record<string, unknown>) => {
    if (obj[field] === OTHER) obj[field] = obj[customField] || '';
    delete obj[customField];
  };

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [existingEvidence, setExistingEvidence] = useState<IncidentEvidenceItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch existing evidence when editing an incident
  useEffect(() => {
    if (!isEdit || !existingIncident) return;
    // If evidence is already on the object (loaded from detail view), use it
    if (existingIncident.evidence?.length) {
      setExistingEvidence(existingIncident.evidence);
      return;
    }
    // Otherwise fetch from API
    api.get<Incident>(`/incidents/${existingIncident.id}`)
      .then(data => {
        if (data.evidence?.length) setExistingEvidence(data.evidence);
      })
      .catch(() => { /* silently fail */ });
  }, [isEdit, existingIncident]);

  // Generate preview URLs for image files — revoked on cleanup
  const previewUrls = useMemo(
    () => localFiles.map(f => isImageFile(f) ? URL.createObjectURL(f) : null),
    [localFiles],
  );

  useEffect(() => {
    return () => previewUrls.forEach(url => { if (url) URL.revokeObjectURL(url); });
  }, [previewUrls]);

  // ─── State Helpers ──────────────────────────────

  const set = (key: keyof FormState, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ─── Validation ─────────────────────────────────

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.incident_date) errs.incident_date = 'Incident date is required';
    if (!form.incident_type) errs.incident_type = 'Incident type is required';
    if (!form.severity) errs.severity = 'Severity is required';
    if (!form.description.trim()) {
      errs.description = 'Description is required';
    } else if (form.description.trim().length < 10) {
      errs.description = 'Description must be at least 10 characters';
    }

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      // Expand any collapsed section that contains an error
      const sectionFieldMap: Record<string, (keyof FormState)[]> = {
        basic: ['incident_date'],
        classification: ['incident_type', 'severity', 'description'],
      };
      for (const [section, fields] of Object.entries(sectionFieldMap)) {
        if (fields.some(f => errs[f])) {
          setCollapsedSections(prev => ({ ...prev, [section]: false }));
        }
      }

      // Scroll to top of form so user sees the error summary
      setTimeout(() => {
        formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }

    return Object.keys(errs).length === 0;
  };

  // ─── File Handling ──────────────────────────────

  const handleFileSelect = (files: FileList | null) => {
    if (!files?.length) return;
    setLocalFiles(prev => [...prev, ...Array.from(files)]);
  };

  const removeLocalFile = (index: number) => {
    setLocalFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingEvidence = async (evidenceId: string) => {
    if (!existingIncident) return;
    try {
      await hook.deleteEvidence.mutateAsync({ incidentId: existingIncident.id, evidenceId });
      setExistingEvidence(prev => prev.filter(e => e.id !== evidenceId));
      toast.success('Evidence removed');
    } catch {
      toast.error('Failed to remove evidence');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // ─── Submit ─────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setErrors(prev => { const next = { ...prev }; delete next._general; return next; });

    try {
      // Build the payload and resolve "Other" custom values
      const payload: Record<string, unknown> = { ...form };
      resolveOther('location', 'location_custom', payload);
      resolveOther('incident_type', 'incident_type_custom', payload);
      resolveOther('incident_category', 'incident_category_custom', payload);
      resolveOther('contractor_name', 'contractor_name_custom', payload);
      resolveOther('injury_type', 'injury_type_custom', payload);
      resolveOther('body_part_affected', 'body_part_affected_custom', payload);
      // Normalize
      payload.incident_time = payload.incident_time || null;
      payload.location = payload.location || null;
      payload.area = payload.area || null;
      payload.department = payload.department || null;
      payload.incident_category = payload.incident_category || null;
      payload.immediate_action = payload.immediate_action || null;
      payload.affected_person_name = payload.affected_person_name || null;
      payload.employee_id = payload.employee_id || null;
      payload.designation = payload.designation || null;
      payload.contractor_name = payload.contractor_name || null;
      payload.contact_number = payload.contact_number || null;
      payload.supervisor_name = payload.supervisor_name || null;
      payload.injury_type = payload.injury_type || null;
      payload.body_part_affected = payload.body_part_affected || null;
      payload.financial_loss = form.financial_loss ? parseFloat(form.financial_loss) : null;
      payload.incident_outcome_summary = payload.incident_outcome_summary || null;
      payload.remarks = payload.remarks || null;

      if (isEdit && existingIncident) {
        await hook.update.mutateAsync({ id: existingIncident.id, data: payload });
        // Upload new evidence files if any were added during edit
        if (localFiles.length > 0) {
          setUploading(true);
          await hook.uploadEvidence.mutateAsync({
            id: existingIncident.id,
            files: localFiles,
            related_type: 'report',
          });
        }
      } else {
        // Create the incident first
        const result = await hook.create.mutateAsync(payload) as { incident: { id: string } };

        // Then upload evidence files directly to the new incident via FormData
        const allFiles = [...localFiles];
        if (allFiles.length > 0 && result?.incident?.id) {
          setUploading(true);
          await hook.uploadEvidence.mutateAsync({
            id: result.incident.id,
            files: allFiles,
            related_type: 'report',
          });
        }
      }
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit incident report. Please try again.';
      setErrors(prev => ({ ...prev, _general: message }));
      toast.error(message);
      // Scroll to top so user sees the error
      setTimeout(() => {
        formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  // ─── Styles ─────────────────────────────────────

  const inputClasses = 'w-full h-9 px-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all';
  const selectClasses = `${inputClasses} appearance-none cursor-pointer`;
  const textareaClasses = 'w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface resize-y transition-all';
  const labelClasses = 'block text-[12px] font-medium text-text-secondary mb-1';
  const errorClasses = 'text-[11px] text-danger-600 mt-0.5';
  const checkboxLabelClasses = 'flex items-center gap-2.5 cursor-pointer select-none';
  const checkboxClasses = 'w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-200 cursor-pointer';

  const isProcessing = submitting || hook.create.isPending || hook.update.isPending;

  // ─── Render ─────────────────────────────────────

  const fieldErrors = Object.entries(errors).filter(([k]) => k !== '_general');
  const hasValidationErrors = fieldErrors.length > 0;

  return (
    <div className="space-y-5" ref={formTopRef}>
      {/* General Error */}
      {errors._general && (
        <div className="flex items-center gap-2 p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">
          <AlertTriangle size={16} className="text-danger-500 shrink-0" />
          {errors._general}
        </div>
      )}

      {/* Validation Error Summary */}
      {hasValidationErrors && (
        <div className="flex items-center gap-2 p-3 bg-warning-50 border border-warning-200 rounded-[var(--radius-md)] text-[13px] text-warning-700">
          <AlertTriangle size={16} className="text-warning-500 shrink-0" />
          Please fill in all required fields: {fieldErrors.map(([, msg]) => msg).join(', ')}
        </div>
      )}

      {/* ═══ Section 1: Basic Information ═══ */}
      <SectionCard id="basic" icon={FileText} title="Basic Information" collapsed={collapsedSections['basic'] ?? false} onToggle={toggleSection}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Incident Date */}
          <div>
            <label className={labelClasses}>Incident Date *</label>
            <input
              type="date"
              value={form.incident_date}
              onChange={e => set('incident_date', e.target.value)}
              className={`${inputClasses} ${errors.incident_date ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/10' : ''}`}
            />
            {errors.incident_date && <p className={errorClasses}>{errors.incident_date}</p>}
          </div>

          {/* Incident Time */}
          <div>
            <label className={labelClasses}>Incident Time</label>
            <input
              type="time"
              value={form.incident_time}
              onChange={e => set('incident_time', e.target.value)}
              className={inputClasses}
            />
          </div>

          {/* Location / Zone */}
          <div>
            <label className={labelClasses}>Location / Zone</label>
            {form.location === OTHER ? (
              <div className="flex gap-2">
                <input type="text" value={form.location_custom} onChange={e => set('location_custom', e.target.value)}
                  className={inputClasses} placeholder="Type location..." autoFocus />
                <button type="button" onClick={() => { set('location', ''); set('location_custom', ''); }}
                  className="px-2.5 py-1 text-[12px] font-medium border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken shrink-0">Back</button>
              </div>
            ) : (
              <select value={form.location} onChange={e => set('location', e.target.value)} className={selectClasses}>
                <option value="">Select location...</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                <option value={OTHER}>Other (type manually)</option>
              </select>
            )}
          </div>

          {/* Area */}
          <div>
            <label className={labelClasses}>Area</label>
            <input
              type="text"
              value={form.area}
              onChange={e => set('area', e.target.value)}
              placeholder="e.g., Level 3, Bay 2"
              className={inputClasses}
            />
          </div>

          {/* Department */}
          <div className="sm:col-span-2">
            <label className={labelClasses}>Department</label>
            <input
              type="text"
              value={form.department}
              onChange={e => set('department', e.target.value)}
              placeholder="e.g., Civil Works, Electrical"
              className={inputClasses}
            />
          </div>
        </div>
      </SectionCard>

      {/* ═══ Section 2: Incident Classification ═══ */}
      <SectionCard id="classification" icon={AlertTriangle} title="Incident Classification" collapsed={collapsedSections['classification'] ?? false} onToggle={toggleSection}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Incident Type */}
          <div>
            <label className={labelClasses}>Incident Type *</label>
            {form.incident_type === OTHER ? (
              <div className="flex gap-2">
                <input type="text" value={form.incident_type_custom} onChange={e => set('incident_type_custom', e.target.value)}
                  className={`${inputClasses} ${errors.incident_type ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/10' : ''}`}
                  placeholder="Type incident type..." autoFocus />
                <button type="button" onClick={() => { set('incident_type', ''); set('incident_type_custom', ''); }}
                  className="px-2.5 py-1 text-[12px] font-medium border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken shrink-0">Back</button>
              </div>
            ) : (
              <select value={form.incident_type} onChange={e => set('incident_type', e.target.value)}
                className={`${selectClasses} ${errors.incident_type ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/10' : ''}`}>
                <option value="">Select type...</option>
                {INCIDENT_TYPES.filter(t => t !== 'Other').map(t => <option key={t} value={t}>{t}</option>)}
                <option value={OTHER}>Other (type manually)</option>
              </select>
            )}
            {errors.incident_type && <p className={errorClasses}>{errors.incident_type}</p>}
          </div>

          {/* Incident Category */}
          <div>
            <label className={labelClasses}>Incident Category</label>
            {form.incident_category === OTHER ? (
              <div className="flex gap-2">
                <input type="text" value={form.incident_category_custom} onChange={e => set('incident_category_custom', e.target.value)}
                  className={inputClasses} placeholder="Type category..." autoFocus />
                <button type="button" onClick={() => { set('incident_category', ''); set('incident_category_custom', ''); }}
                  className="px-2.5 py-1 text-[12px] font-medium border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken shrink-0">Back</button>
              </div>
            ) : (
              <select value={form.incident_category} onChange={e => set('incident_category', e.target.value)} className={selectClasses}>
                <option value="">Select category...</option>
                {INCIDENT_CATEGORIES.filter(c => c !== 'Other').map(c => <option key={c} value={c}>{c}</option>)}
                <option value={OTHER}>Other (type manually)</option>
              </select>
            )}
          </div>

          {/* Severity */}
          <div>
            <label className={labelClasses}>Severity *</label>
            <select
              value={form.severity}
              onChange={e => set('severity', e.target.value)}
              className={`${selectClasses} ${errors.severity ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/10' : ''}`}
            >
              <option value="">Select severity...</option>
              {SEVERITY_LEVELS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.severity && <p className={errorClasses}>{errors.severity}</p>}
          </div>
        </div>

        {/* Description */}
        <div className="mt-4">
          <label className={labelClasses}>Description *</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={4}
            placeholder="Provide a detailed description of the incident..."
            className={`${textareaClasses} min-h-[100px] ${errors.description ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/10' : ''}`}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.description ? (
              <p className={errorClasses}>{errors.description}</p>
            ) : (
              <span />
            )}
            <span className={`text-[11px] ${form.description.length < 10 ? 'text-text-tertiary' : 'text-success-600'}`}>
              {form.description.length} / 10 min
            </span>
          </div>
        </div>

        {/* Immediate Action */}
        <div className="mt-4">
          <label className={labelClasses}>Immediate Action Taken</label>
          <textarea
            value={form.immediate_action}
            onChange={e => set('immediate_action', e.target.value)}
            rows={2}
            placeholder="What immediate action was taken at the scene?"
            className={textareaClasses}
          />
        </div>
      </SectionCard>

      {/* ═══ Section 3: Person Involved ═══ */}
      <SectionCard id="person" icon={User} title="Person Involved" collapsed={collapsedSections['person'] ?? false} onToggle={toggleSection}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Affected Person Name */}
          <div>
            <label className={labelClasses}>Affected Person Name</label>
            <input
              type="text"
              value={form.affected_person_name}
              onChange={e => set('affected_person_name', e.target.value)}
              placeholder="Full name"
              className={inputClasses}
            />
          </div>

          {/* Employee ID */}
          <div>
            <label className={labelClasses}>Employee / Badge ID</label>
            <input
              type="text"
              value={form.employee_id}
              onChange={e => set('employee_id', e.target.value)}
              placeholder="Badge or ID number"
              className={inputClasses}
            />
          </div>

          {/* Designation */}
          <div>
            <label className={labelClasses}>Designation / Role</label>
            <input
              type="text"
              value={form.designation}
              onChange={e => set('designation', e.target.value)}
              placeholder="e.g., Electrician, Welder"
              className={inputClasses}
            />
          </div>

          {/* Contractor Name */}
          <div>
            <label className={labelClasses}>Contractor / Company</label>
            {form.contractor_name === OTHER ? (
              <div className="flex gap-2">
                <input type="text" value={form.contractor_name_custom} onChange={e => set('contractor_name_custom', e.target.value)}
                  className={inputClasses} placeholder="Type contractor name..." autoFocus />
                <button type="button" onClick={() => { set('contractor_name', ''); set('contractor_name_custom', ''); }}
                  className="px-2.5 py-1 text-[12px] font-medium border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken shrink-0">Back</button>
              </div>
            ) : (
              <select value={form.contractor_name} onChange={e => set('contractor_name', e.target.value)} className={selectClasses}>
                <option value="">Select contractor...</option>
                {CONTRACTORS.map(c => <option key={c} value={c}>{c}</option>)}
                <option value={OTHER}>Other (type manually)</option>
              </select>
            )}
          </div>

          {/* Contact Number */}
          <div>
            <label className={labelClasses}>Contact Number</label>
            <input
              type="text"
              value={form.contact_number}
              onChange={e => set('contact_number', e.target.value)}
              placeholder="Phone number"
              className={inputClasses}
            />
          </div>

          {/* Supervisor Name */}
          <div>
            <label className={labelClasses}>Supervisor Name</label>
            <input
              type="text"
              value={form.supervisor_name}
              onChange={e => set('supervisor_name', e.target.value)}
              placeholder="Direct supervisor"
              className={inputClasses}
            />
          </div>
        </div>
      </SectionCard>

      {/* ═══ Section 4: Injury / Impact Details ═══ */}
      <SectionCard id="injury" icon={Shield} title="Injury / Impact Details" collapsed={collapsedSections['injury'] ?? false} onToggle={toggleSection}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Injury Type */}
          <div>
            <label className={labelClasses}>Injury Type</label>
            {form.injury_type === OTHER ? (
              <div className="flex gap-2">
                <input type="text" value={form.injury_type_custom} onChange={e => set('injury_type_custom', e.target.value)}
                  className={inputClasses} placeholder="Type injury type..." autoFocus />
                <button type="button" onClick={() => { set('injury_type', ''); set('injury_type_custom', ''); }}
                  className="px-2.5 py-1 text-[12px] font-medium border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken shrink-0">Back</button>
              </div>
            ) : (
              <select value={form.injury_type} onChange={e => set('injury_type', e.target.value)} className={selectClasses}>
                <option value="">Select injury type...</option>
                {INJURY_TYPES.filter(t => t !== 'Other').map(t => <option key={t} value={t}>{t}</option>)}
                <option value={OTHER}>Other (type manually)</option>
              </select>
            )}
          </div>

          {/* Body Part Affected */}
          <div>
            <label className={labelClasses}>Body Part Affected</label>
            {form.body_part_affected === OTHER ? (
              <div className="flex gap-2">
                <input type="text" value={form.body_part_affected_custom} onChange={e => set('body_part_affected_custom', e.target.value)}
                  className={inputClasses} placeholder="Type body part..." autoFocus />
                <button type="button" onClick={() => { set('body_part_affected', ''); set('body_part_affected_custom', ''); }}
                  className="px-2.5 py-1 text-[12px] font-medium border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-sunken shrink-0">Back</button>
              </div>
            ) : (
              <select value={form.body_part_affected} onChange={e => set('body_part_affected', e.target.value)} className={selectClasses}>
                <option value="">Select body part...</option>
                {BODY_PARTS.filter(b => b !== 'Other').map(b => <option key={b} value={b}>{b}</option>)}
                <option value={OTHER}>Other (type manually)</option>
              </select>
            )}
          </div>
        </div>

        {/* Checkboxes */}
        <div className="mt-5">
          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Impact Assessment</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className={checkboxLabelClasses}>
              <input
                type="checkbox"
                checked={form.medical_treatment_required}
                onChange={e => set('medical_treatment_required', e.target.checked)}
                className={checkboxClasses}
              />
              <span className="text-[13px] text-text-primary">Medical Treatment Required</span>
            </label>

            <label className={checkboxLabelClasses}>
              <input
                type="checkbox"
                checked={form.lost_time_injury}
                onChange={e => set('lost_time_injury', e.target.checked)}
                className={checkboxClasses}
              />
              <span className="text-[13px] text-text-primary">Lost Time Injury</span>
            </label>

            <label className={checkboxLabelClasses}>
              <input
                type="checkbox"
                checked={form.hospitalization}
                onChange={e => set('hospitalization', e.target.checked)}
                className={checkboxClasses}
              />
              <span className="text-[13px] text-text-primary">Hospitalization</span>
            </label>

            <label className={checkboxLabelClasses}>
              <input
                type="checkbox"
                checked={form.property_damage}
                onChange={e => set('property_damage', e.target.checked)}
                className={checkboxClasses}
              />
              <span className="text-[13px] text-text-primary">Property Damage</span>
            </label>

            <label className={checkboxLabelClasses}>
              <input
                type="checkbox"
                checked={form.equipment_damage}
                onChange={e => set('equipment_damage', e.target.checked)}
                className={checkboxClasses}
              />
              <span className="text-[13px] text-text-primary">Equipment Damage</span>
            </label>

            <label className={checkboxLabelClasses}>
              <input
                type="checkbox"
                checked={form.environmental_impact}
                onChange={e => set('environmental_impact', e.target.checked)}
                className={checkboxClasses}
              />
              <span className="text-[13px] text-text-primary">Environmental Impact</span>
            </label>
          </div>
        </div>

        {/* Financial Loss */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Estimated Financial Loss</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-tertiary">SAR</span>
              <input
                type="number"
                value={form.financial_loss}
                onChange={e => set('financial_loss', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={`${inputClasses} pl-12`}
              />
            </div>
          </div>
        </div>

        {/* Outcome Summary */}
        <div className="mt-4">
          <label className={labelClasses}>Incident Outcome Summary</label>
          <textarea
            value={form.incident_outcome_summary}
            onChange={e => set('incident_outcome_summary', e.target.value)}
            rows={3}
            placeholder="Summary of the incident outcome and overall impact..."
            className={textareaClasses}
          />
        </div>
      </SectionCard>

      {/* ═══ Section 5: Evidence ═══ */}
      <SectionCard id="evidence" icon={Camera} title="Evidence & Attachments" collapsed={collapsedSections['evidence'] ?? false} onToggle={toggleSection}>
        {/* Drop zone */}
        <label
          className="border-2 border-dashed border-border rounded-[var(--radius-md)] p-6 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors block"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt"
            className="hidden"
            onChange={e => {
              handleFileSelect(e.target.files);
              e.target.value = '';
            }}
          />
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
              <Upload size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-text-primary">
                Click to upload or drag & drop
              </p>
              <p className="text-[11px] text-text-tertiary mt-0.5">
                Images, PDF, Word, Excel, PowerPoint — max 10MB per file
              </p>
            </div>
          </div>
        </label>

        {/* Pending local files (not yet uploaded) */}
        {localFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
              Files ready to upload ({localFiles.length})
            </p>
            {/* Image thumbnails grid */}
            {localFiles.some(f => isImageFile(f)) && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {localFiles.map((file, i) =>
                  isImageFile(file) && previewUrls[i] ? (
                    <div key={`img-${i}`} className="relative group rounded-[var(--radius-md)] overflow-hidden border border-border bg-surface-sunken aspect-square">
                      <img
                        src={previewUrls[i]!}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                      <button
                        type="button"
                        onClick={() => removeLocalFile(i)}
                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger-600"
                        title="Remove"
                      >
                        <Trash2 size={12} />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/50 text-white">
                        <p className="text-[10px] truncate">{file.name}</p>
                        <p className="text-[9px] opacity-75">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            )}
            {/* Non-image file rows */}
            {localFiles.map((file, i) =>
              !isImageFile(file) ? (
                <div
                  key={`local-${i}`}
                  className="flex items-center gap-3 bg-surface-sunken rounded-[var(--radius-md)] px-3 py-2"
                >
                  <FileText size={14} className="text-text-tertiary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-text-primary truncate">{file.name}</p>
                    <p className="text-[10px] text-text-tertiary">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLocalFile(i)}
                    className="p-1 text-danger-500 hover:bg-danger-50 rounded transition-colors"
                    title="Remove file"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Already-uploaded files (from current session) */}
        {uploadedFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
              Uploaded ({uploadedFiles.length})
            </p>
            {uploadedFiles.map((file, i) => (
              <div
                key={`uploaded-${i}`}
                className="flex items-center gap-3 bg-success-50 border border-success-100 rounded-[var(--radius-md)] px-3 py-2"
              >
                <FileText size={14} className="text-success-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-text-primary truncate">{file.originalName}</p>
                  <p className="text-[10px] text-text-tertiary">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeUploadedFile(i)}
                  className="p-1 text-danger-500 hover:bg-danger-50 rounded transition-colors"
                  title="Remove file"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Existing evidence (previously uploaded to server) */}
        {existingEvidence.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
              Previously uploaded ({existingEvidence.length})
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {existingEvidence.map(ev => {
                const isImage = ev.file_type?.startsWith('image/');
                const fileUrl = `${STORAGE_BASE}${ev.file_path}`;
                return (
                  <div key={ev.id} className="relative group rounded-[var(--radius-md)] overflow-hidden border border-border bg-surface-sunken aspect-square">
                    {isImage ? (
                      <img
                        src={fileUrl}
                        alt={ev.original_name}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setPreviewUrl(fileUrl)}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-surface-sunken">
                        <FileText size={24} className="text-text-tertiary" />
                        <p className="text-[9px] text-text-tertiary mt-1 px-1 text-center truncate max-w-full">
                          {ev.original_name.split('.').pop()?.toUpperCase()}
                        </p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                    {/* Actions overlay */}
                    <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-full bg-white/90 text-text-secondary hover:text-primary-600 shadow-sm"
                        title="Download"
                      >
                        <Download size={12} />
                      </a>
                      <button
                        type="button"
                        onClick={() => removeExistingEvidence(ev.id)}
                        className="p-1 rounded-full bg-white/90 text-text-secondary hover:text-danger-600 shadow-sm"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/50 text-white">
                      <p className="text-[10px] truncate">{ev.original_name}</p>
                      <p className="text-[9px] opacity-75">{formatFileSize(ev.file_size)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Image Preview Overlay */}
        {previewUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={() => setPreviewUrl(null)}>
            <div className="relative max-w-[90vw] max-h-[90vh]">
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="absolute -top-3 -right-3 p-2 rounded-full bg-white shadow-lg text-text-primary hover:bg-gray-100 transition-colors"
              >
                <XIcon size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Remarks */}
        <div className="mt-5">
          <label className={labelClasses}>Remarks / Additional Notes</label>
          <textarea
            value={form.remarks}
            onChange={e => set('remarks', e.target.value)}
            rows={3}
            placeholder="Any additional remarks or context..."
            className={textareaClasses}
          />
        </div>
      </SectionCard>

      {/* ═══ Footer Buttons ═══ */}
      <div className="pt-2 pb-4 space-y-3">
        {/* Inline error near submit button */}
        {(hasValidationErrors || errors._general) && (
          <div className="flex items-center gap-2 p-2.5 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[12px] text-danger-700">
            <AlertTriangle size={14} className="text-danger-500 shrink-0" />
            {errors._general || `Please fill in the required fields above (${fieldErrors.map(([, msg]) => msg).join(', ')})`}
          </div>
        )}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors disabled:opacity-50"
          >
            <XIcon size={15} />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                {uploading ? 'Uploading files...' : isEdit ? 'Updating...' : 'Submitting...'}
              </>
            ) : (
              <>
                <Save size={15} />
                {isEdit ? 'Update Incident' : 'Submit Incident Report'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
