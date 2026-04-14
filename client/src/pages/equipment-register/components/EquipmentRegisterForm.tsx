import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
  Settings,
  MapPin,
  Building2,
  Shield,
  Camera,
  ImagePlus,
  Trash2,
  Upload,
  FileText,
  X,
  Eye,
  Download,
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import type { EquipmentItem, FilterOptions } from '../hooks/useEquipmentRegister';

// ── Types ────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<{ success: boolean; message: string }>;
  existingItem?: EquipmentItem | null;
  filterOptions: FilterOptions | null;
}

interface FormState {
  equipment_name: string;
  serial_number: string;
  equipment_category: string;
  equipment_category_custom: string;
  equipment_type: string;
  manufacturer: string;
  model_number: string;
  asset_tag: string;
  registration_number: string;
  equipment_status: string;
  working_status: string;
  condition_status: string;
  condition_details: string;
  purchase_date: string;
  commissioning_date: string;
  retirement_date: string;
  project_name: string;
  current_location: string;
  area: string;
  zone: string;
  assigned_team: string;
  assigned_supervisor: string;
  assigned_operator: string;
  company_name: string;
  tuv_authorized: string;
  vendor_supplier: string;
  last_inspection_date: string;
  next_inspection_date: string;
  inspection_frequency: string;
  certificate_number: string;
  tuv_valid_until: string;
  purchase_cost: string;
  rental_status: string;
  rental_company: string;
  warranty_expiry: string;
  notes: string;
  remarks: string;
}

// ── Helpers ──────────────────────────────────────

const EQUIPMENT_STATUSES = ['active', 'inactive', 'under_maintenance', 'out_of_service', 'retired'];
const WORKING_STATUSES = ['currently_working', 'standby', 'damaged', 'old_equipment'];
const CONDITION_STATUSES = ['excellent', 'good', 'fair', 'poor', 'damaged'];
const INSPECTION_FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'];
const RENTAL_STATUSES = ['owned', 'rented', 'leased'];

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function emptyForm(): FormState {
  return {
    equipment_name: '',
    serial_number: '',
    equipment_category: '',
    equipment_category_custom: '',
    equipment_type: '',
    manufacturer: '',
    model_number: '',
    asset_tag: '',
    registration_number: '',
    equipment_status: 'active',
    working_status: 'currently_working',
    condition_status: 'good',
    condition_details: '',
    purchase_date: '',
    commissioning_date: '',
    retirement_date: '',
    project_name: '',
    current_location: '',
    area: '',
    zone: '',
    assigned_team: '',
    assigned_supervisor: '',
    assigned_operator: '',
    company_name: '',
    tuv_authorized: 'no',
    vendor_supplier: '',
    last_inspection_date: '',
    next_inspection_date: '',
    inspection_frequency: '',
    certificate_number: '',
    tuv_valid_until: '',
    purchase_cost: '',
    rental_status: 'owned',
    rental_company: '',
    warranty_expiry: '',
    notes: '',
    remarks: '',
  };
}

function itemToForm(item: EquipmentItem): FormState {
  return {
    equipment_name: item.equipment_name || '',
    serial_number: item.serial_number || '',
    equipment_category: item.equipment_category || '',
    equipment_type: item.equipment_type || '',
    manufacturer: item.manufacturer || '',
    model_number: item.model_number || '',
    asset_tag: item.asset_tag || '',
    registration_number: item.registration_number || '',
    equipment_status: item.equipment_status || 'active',
    working_status: item.working_status || 'currently_working',
    condition_status: item.condition_status || 'good',
    condition_details: item.condition_details || '',
    purchase_date: item.purchase_date || '',
    commissioning_date: item.commissioning_date || '',
    retirement_date: item.retirement_date || '',
    project_name: item.project_name || '',
    current_location: item.current_location || '',
    area: item.area || '',
    zone: item.zone || '',
    assigned_team: item.assigned_team || '',
    assigned_supervisor: item.assigned_supervisor || '',
    assigned_operator: item.assigned_operator || '',
    company_name: item.company_name || '',
    tuv_authorized: item.tuv_authorized || 'no',
    vendor_supplier: item.vendor_supplier || '',
    last_inspection_date: item.last_inspection_date || '',
    next_inspection_date: item.next_inspection_date || '',
    inspection_frequency: item.inspection_frequency || '',
    certificate_number: item.certificate_number || '',
    tuv_valid_until: item.tuv_valid_until || '',
    purchase_cost: item.purchase_cost || '',
    rental_status: item.rental_status || 'owned',
    rental_company: item.rental_company || '',
    warranty_expiry: item.warranty_expiry || '',
    notes: item.notes || '',
    remarks: item.remarks || '',
  };
}

// ── Styles ───────────────────────────────────────

const inputClasses =
  'w-full h-9 px-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all';
const selectClasses = `${inputClasses} appearance-none cursor-pointer`;
const textareaClasses =
  'w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface resize-y transition-all';
const labelClasses = 'block text-[12px] font-medium text-text-secondary mb-1';
const errorClasses = 'text-[11px] text-danger-600 mt-0.5';

// ── Section wrapper ──────────────────────────────

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ title, icon, isOpen, onToggle, children }: SectionProps) {
  return (
    <div className="border border-border rounded-[var(--radius-md)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-surface-sunken hover:bg-surface-sunken/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary">{icon}</span>
          <span className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">
            {title}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp size={16} className="text-text-tertiary" />
        ) : (
          <ChevronDown size={16} className="text-text-tertiary" />
        )}
      </button>
      {isOpen && <div className="px-4 py-4 space-y-3">{children}</div>}
    </div>
  );
}

// ── Main component ───────────────────────────────

export default function EquipmentRegisterForm({
  open,
  onClose,
  onSubmit,
  existingItem,
  filterOptions,
}: Props) {
  const isEdit = !!existingItem;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalImagesRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalImageFiles, setAdditionalImageFiles] = useState<File[]>([]);
  const [existingAdditionalImages, setExistingAdditionalImages] = useState<string[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [previewOverlay, setPreviewOverlay] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Section open/close state — all open by default
  const [sections, setSections] = useState({
    basic: true,
    status: true,
    location: true,
    ownership: true,
    inspection: true,
    financial: true,
    media: true,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Populate form when editing ──
  useEffect(() => {
    if (existingItem) {
      setForm(itemToForm(existingItem));
      setImagePreview(existingItem.image_url || null);
      setExistingAdditionalImages(existingItem.additional_image_urls || []);
      setExistingAttachments(existingItem.attachment_urls || []);
    } else {
      setForm(emptyForm());
      setImagePreview(null);
      setExistingAdditionalImages([]);
      setExistingAttachments([]);
    }
    setImageFile(null);
    setAdditionalImageFiles([]);
    setAttachmentFiles([]);
    setError(null);
    setFieldErrors({});
  }, [existingItem, open]);

  // Preview URLs for new additional images
  const additionalImagePreviews = useMemo(
    () => additionalImageFiles.map(f => URL.createObjectURL(f)),
    [additionalImageFiles],
  );
  useEffect(() => {
    return () => additionalImagePreviews.forEach(url => URL.revokeObjectURL(url));
  }, [additionalImagePreviews]);

  // ── Field helpers ──
  const set = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  };

  // ── Image handling ──
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    // Revoke previous blob URL if we created one
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
  };

  const handleAdditionalImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setAdditionalImageFiles(prev => [...prev, ...Array.from(files)]);
    e.target.value = '';
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAdditionalImage = (index: number) => {
    setExistingAdditionalImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAttachmentsSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setAttachmentFiles(prev => [...prev, ...Array.from(files)]);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (index: number) => {
    setExistingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // ── Validation ──
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.equipment_name.trim()) {
      errs.equipment_name = 'Equipment name is required';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();

      // Resolve "Other" values
      const resolvedForm = { ...form };
      if (resolvedForm.equipment_category === '__other__') {
        resolvedForm.equipment_category = resolvedForm.equipment_category_custom?.trim() || '';
      }
      // Append all text fields (skip custom helper fields)
      const skipFields = ['equipment_category_custom'];
      (Object.keys(resolvedForm) as (keyof FormState)[]).forEach((key) => {
        if (skipFields.includes(key)) return;
        const value = resolvedForm[key];
        if (value !== '' && value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });

      // Append primary image if selected
      if (imageFile) {
        formData.append('image', imageFile);
      }

      // Append additional images (new files)
      additionalImageFiles.forEach(f => formData.append('additional_images[]', f));

      // Append document attachments (new files)
      attachmentFiles.forEach(f => formData.append('attachments[]', f));

      const result = await onSubmit(formData);

      if (result.success) {
        onClose();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render helpers ──

  const renderInput = (
    key: keyof FormState,
    label: string,
    opts?: { required?: boolean; type?: string; placeholder?: string }
  ) => {
    const { required, type = 'text', placeholder } = opts || {};
    return (
      <div>
        <label className={labelClasses}>
          {label}
          {required && ' *'}
        </label>
        <input
          type={type}
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          placeholder={placeholder}
          className={inputClasses}
        />
        {fieldErrors[key] && <p className={errorClasses}>{fieldErrors[key]}</p>}
      </div>
    );
  };

  const renderSelect = (
    key: keyof FormState,
    label: string,
    options: string[],
    opts?: { placeholder?: string }
  ) => {
    const { placeholder } = opts || {};
    return (
      <div>
        <label className={labelClasses}>{label}</label>
        <select
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          className={selectClasses}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {formatLabel(opt)}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderTextarea = (
    key: keyof FormState,
    label: string,
    opts?: { rows?: number; placeholder?: string }
  ) => {
    const { rows = 3, placeholder } = opts || {};
    return (
      <div>
        <label className={labelClasses}>{label}</label>
        <textarea
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={textareaClasses}
        />
      </div>
    );
  };

  // ── Footer buttons ──
  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="equipment-register-form"
        disabled={submitting}
        className="px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2"
      >
        {submitting && <Loader2 size={14} className="animate-spin" />}
        {submitting ? 'Saving...' : isEdit ? 'Update Equipment' : 'Save Equipment'}
      </button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Equipment' : 'Add Equipment'}
      subtitle={
        isEdit
          ? `Editing ${existingItem?.equipment_code || existingItem?.equipment_name || ''}`
          : 'Register a new equipment item'
      }
      size="lg"
      footer={footer}
    >
      <form
        id="equipment-register-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* General error */}
        {error && (
          <div className="p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">
            {error}
          </div>
        )}

        {/* ── Section 1: Basic Information ── */}
        <Section
          title="Basic Information"
          icon={<Info size={15} />}
          isOpen={sections.basic}
          onToggle={() => toggleSection('basic')}
        >
          {renderInput('equipment_name', 'Equipment Name', {
            required: true,
            placeholder: 'e.g. Tower Crane TC-01',
          })}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderInput('serial_number', 'Serial Number', {
              placeholder: 'Manufacturer serial',
            })}
            <div>
              <label className={labelClasses}>Equipment Category</label>
              <select
                value={form.equipment_category}
                onChange={(e) => { set('equipment_category', e.target.value); if (e.target.value !== '__other__') set('equipment_category_custom', ''); }}
                className={selectClasses}
              >
                <option value="">Select category</option>
                {(filterOptions?.categories || []).filter((cat) => cat.toLowerCase() !== 'other').map((cat) => (
                  <option key={cat} value={cat}>
                    {formatLabel(cat)}
                  </option>
                ))}
                <option value="__other__">Other</option>
              </select>
              {form.equipment_category === '__other__' && (
                <input type="text" value={form.equipment_category_custom} onChange={e => set('equipment_category_custom', e.target.value)} placeholder="Enter category..." className={`${selectClasses} mt-1.5`} autoFocus />
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderInput('equipment_type', 'Equipment Type', {
              placeholder: 'e.g. Crane, Excavator',
            })}
            {renderInput('manufacturer', 'Manufacturer', {
              placeholder: 'e.g. Liebherr',
            })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderInput('model_number', 'Model Number', {
              placeholder: 'e.g. LTM 1300',
            })}
            {renderInput('asset_tag', 'Asset Tag', {
              placeholder: 'Internal asset tag',
            })}
          </div>
          {renderInput('registration_number', 'Registration Number', {
            placeholder: 'Government / authority registration',
          })}
        </Section>

        {/* ── Section 2: Status & Lifecycle ── */}
        <Section
          title="Status & Lifecycle"
          icon={<Settings size={15} />}
          isOpen={sections.status}
          onToggle={() => toggleSection('status')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderSelect('equipment_status', 'Equipment Status', EQUIPMENT_STATUSES)}
            {renderSelect('working_status', 'Working Status', WORKING_STATUSES)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderSelect('condition_status', 'Condition', CONDITION_STATUSES)}
            <div /> {/* spacer for alignment */}
          </div>
          {renderTextarea('condition_details', 'Condition Details', {
            rows: 2,
            placeholder: 'Describe the current condition...',
          })}
        </Section>

        {/* ── Section 3: Location & Assignment ── */}
        <Section
          title="Location & Assignment"
          icon={<MapPin size={15} />}
          isOpen={sections.location}
          onToggle={() => toggleSection('location')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderInput('project_name', 'Project Name', {
              placeholder: 'e.g. KAEC Residential',
            })}
            {renderInput('area', 'Area', { placeholder: 'e.g. Zone B' })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderInput('zone', 'Zone', { placeholder: 'e.g. North Wing' })}
            {renderInput('assigned_team', 'Assigned Team', {
              placeholder: 'e.g. Structural Crew A',
            })}
          </div>
          {renderInput('assigned_supervisor', 'Assigned Supervisor', {
            placeholder: 'Supervisor name',
          })}
        </Section>

        {/* ── Section 4: Ownership & Authorization ── */}
        <Section
          title="Ownership & Authorization"
          icon={<Building2 size={15} />}
          isOpen={sections.ownership}
          onToggle={() => toggleSection('ownership')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderInput('company_name', 'Company Name', {
              placeholder: 'e.g. CCCC',
            })}
            <div>
              <label className={labelClasses}>TUV Authorized</label>
              <label className="relative inline-flex items-center gap-3 mt-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.tuv_authorized === 'yes'}
                  onChange={(e) => set('tuv_authorized', e.target.checked ? 'yes' : 'no')}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:ring-[3px] peer-focus:ring-primary-500/10 rounded-full peer peer-checked:bg-primary-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                <span className={`text-[13px] font-medium ${form.tuv_authorized === 'yes' ? 'text-primary-700' : 'text-text-secondary'}`}>
                  {form.tuv_authorized === 'yes' ? 'Yes' : 'No'}
                </span>
              </label>
            </div>
          </div>
          {renderInput('vendor_supplier', 'Vendor / Supplier', {
            placeholder: 'e.g. Al-Jazeera Equipment Co.',
          })}
        </Section>

        {/* ── Section 5: Inspection & Certification ── */}
        <Section
          title="Inspection & Certification"
          icon={<Shield size={15} />}
          isOpen={sections.inspection}
          onToggle={() => toggleSection('inspection')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderInput('last_inspection_date', 'Last Inspection Date', {
              type: 'date',
            })}
            {renderInput('next_inspection_date', 'Next Inspection Date', {
              type: 'date',
            })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderSelect(
              'inspection_frequency',
              'Inspection Frequency',
              INSPECTION_FREQUENCIES,
              { placeholder: 'Select frequency' }
            )}
            {renderInput('certificate_number', 'Certificate Number', {
              placeholder: 'Cert. reference',
            })}
          </div>
          {renderInput('tuv_valid_until', 'TUV Valid Until', { type: 'date' })}
        </Section>

        {/* ── Section 7: Media & Notes ── */}
        <Section
          title="Media & Notes"
          icon={<Camera size={15} />}
          isOpen={sections.media}
          onToggle={() => toggleSection('media')}
        >
          {/* Primary Image */}
          <div>
            <label className={labelClasses}>Primary Image</label>
            {imagePreview ? (
              <div className="relative group w-full h-[160px] rounded-[var(--radius-md)] border border-border overflow-hidden bg-surface-sunken">
                <img
                  src={imagePreview}
                  alt="Equipment preview"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setPreviewOverlay(imagePreview)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-[12px] font-medium text-white bg-black/50 rounded-[var(--radius-md)] hover:bg-black/70 transition-colors"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1.5 text-white bg-danger-600/80 rounded-[var(--radius-md)] hover:bg-danger-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border rounded-[var(--radius-md)] p-4 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <ImagePlus size={24} className="text-text-tertiary" />
                  <p className="text-[12px] text-text-tertiary">Click to upload primary image</p>
                  <p className="text-[10px] text-text-quaternary">JPG, PNG, GIF, WebP (max 10MB)</p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          {/* Additional Images */}
          <div>
            <label className={labelClasses}>Additional Images</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {/* Existing additional images */}
              {existingAdditionalImages.map((url, i) => (
                <div key={`existing-img-${i}`} className="relative group rounded-[var(--radius-md)] overflow-hidden border border-border bg-surface-sunken aspect-square">
                  <img src={url} alt={`Additional ${i + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewOverlay(url)} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  <button
                    type="button"
                    onClick={() => removeExistingAdditionalImage(i)}
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {/* New additional images */}
              {additionalImageFiles.map((file, i) => (
                <div key={`new-img-${i}`} className="relative group rounded-[var(--radius-md)] overflow-hidden border border-border bg-surface-sunken aspect-square">
                  <img src={additionalImagePreviews[i]} alt={file.name} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewOverlay(additionalImagePreviews[i])} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  <button
                    type="button"
                    onClick={() => removeAdditionalImage(i)}
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger-600"
                  >
                    <Trash2 size={12} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-black/50 text-white">
                    <p className="text-[9px] truncate">{file.name}</p>
                    <p className="text-[8px] opacity-75">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              ))}
              {/* Add more button */}
              <div
                className="aspect-square border-2 border-dashed border-border rounded-[var(--radius-md)] flex flex-col items-center justify-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
                onClick={() => additionalImagesRef.current?.click()}
              >
                <ImagePlus size={20} className="text-text-tertiary" />
                <p className="text-[10px] text-text-tertiary mt-1">Add Images</p>
              </div>
            </div>
            <input
              ref={additionalImagesRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleAdditionalImagesSelect}
            />
          </div>

          {/* Document Attachments */}
          <div>
            <label className={labelClasses}>Document Attachments</label>
            <div
              className="border-2 border-dashed border-border rounded-[var(--radius-md)] p-4 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
              onClick={() => attachmentsRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-1.5">
                <Upload size={20} className="text-text-tertiary" />
                <p className="text-[12px] text-text-tertiary">Click to upload documents</p>
                <p className="text-[10px] text-text-quaternary">PDF, Word, Excel, PPT, CSV, TXT (max 20MB each)</p>
              </div>
            </div>
            <input
              ref={attachmentsRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.zip,.rar"
              className="hidden"
              onChange={handleAttachmentsSelect}
            />

            {/* Existing attachments */}
            {existingAttachments.map((url, i) => {
              const name = url.split('/').pop() || `Document ${i + 1}`;
              return (
                <div key={`existing-att-${i}`} className="flex items-center gap-3 mt-2 bg-surface-sunken rounded-[var(--radius-md)] px-3 py-2">
                  <FileText size={14} className="text-primary-600 shrink-0" />
                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 text-[12px] text-text-primary truncate hover:text-primary-600">{name}</a>
                  <button type="button" onClick={() => removeExistingAttachment(i)} className="p-1 text-danger-500 hover:bg-danger-50 rounded transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}

            {/* New attachment files */}
            {attachmentFiles.map((file, i) => (
              <div key={`new-att-${i}`} className="flex items-center gap-3 mt-2 bg-primary-50/50 border border-primary-100 rounded-[var(--radius-md)] px-3 py-2">
                <FileText size={14} className="text-primary-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-text-primary truncate">{file.name}</p>
                  <p className="text-[10px] text-text-tertiary">{formatFileSize(file.size)}</p>
                </div>
                <button type="button" onClick={() => removeAttachment(i)} className="p-1 text-danger-500 hover:bg-danger-50 rounded transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Image Preview Overlay */}
          {previewOverlay && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={() => setPreviewOverlay(null)}>
              <div className="relative max-w-[90vw] max-h-[90vh]">
                <img src={previewOverlay} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                <button type="button" onClick={() => setPreviewOverlay(null)} className="absolute -top-3 -right-3 p-2 rounded-full bg-white shadow-lg text-text-primary hover:bg-gray-100 transition-colors">
                  <XIcon size={16} />
                </button>
              </div>
            </div>
          )}

          {renderTextarea('notes', 'Notes', {
            rows: 3,
            placeholder: 'General notes about this equipment...',
          })}
          {renderTextarea('remarks', 'Remarks', {
            rows: 3,
            placeholder: 'Additional remarks...',
          })}
        </Section>
      </form>
    </Modal>
  );
}
