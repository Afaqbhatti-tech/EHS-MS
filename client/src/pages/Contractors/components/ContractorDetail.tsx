import { useState, useCallback } from 'react';
import {
  X, Edit3, Building2, Phone, Mail, MapPin, Users, FileText, History,
  Link, ShieldCheck, Upload, Trash2, CheckCircle, XCircle, AlertTriangle,
  Calendar, Clock, ChevronDown, ChevronRight, Eye, Download,
} from 'lucide-react';
import ContractorStatusBadge from './ContractorStatusBadge';
import ComplianceBadge from './ComplianceBadge';
import { DOCUMENT_TYPES, CONTACT_ROLES, getDocumentStatusColor, isExpiringSoon, isExpired } from '../../../config/contractorConfig';
import type {
  Contractor, ContractorContact, ContractorDocument, ContractorLog,
} from '../hooks/useContractors';

interface Props {
  contractor: Contractor;
  onClose: () => void;
  onEdit: (c: Contractor) => void;
  onStatusChange: (id: number, data: { status: string; reason?: string; notes?: string }) => Promise<unknown>;
  onRefresh: () => void;
  addContact: (data: Record<string, unknown>) => Promise<ContractorContact>;
  updateContact: (contactId: number, data: Record<string, unknown>) => Promise<ContractorContact>;
  removeContact: (contactId: number) => Promise<void>;
  uploadDocument: (formData: FormData) => Promise<unknown>;
  removeDocument: (documentId: number) => Promise<void>;
  verifyDocument: (documentId: number, data: Record<string, unknown>) => Promise<ContractorDocument>;
}

type Tab = 'overview' | 'contacts' | 'documents' | 'compliance' | 'links' | 'history';

const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'overview',   label: 'Overview',    icon: Building2 },
  { key: 'contacts',   label: 'Contacts',    icon: Phone },
  { key: 'documents',  label: 'Documents',   icon: FileText },
  { key: 'compliance', label: 'Compliance',  icon: ShieldCheck },
  { key: 'links',      label: 'Linked Records', icon: Link },
  { key: 'history',    label: 'History',     icon: History },
];

/* ── Sub-components ─────────────────────────────────── */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-text-tertiary">{label}</span>
      <span className="text-[12px] text-text-primary font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function SectionCard({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="ctr-detail-section rounded-[var(--radius-md)] border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[13px] font-semibold text-text-primary">{title}</h4>
        {actions}
      </div>
      {children}
    </div>
  );
}

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Contact Form (inline) ──────────────────────────── */

function ContactFormInline({
  onSave,
  onCancel,
  initial,
}: {
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  initial?: ContractorContact | null;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    designation: initial?.designation ?? '',
    role: initial?.role ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    id_number: initial?.id_number ?? '',
    is_primary_contact: initial?.is_primary_contact ?? false,
    is_site_supervisor: initial?.is_site_supervisor ?? false,
    is_safety_rep: initial?.is_safety_rep ?? false,
    is_emergency_contact: initial?.is_emergency_contact ?? false,
    notes: initial?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const s = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full h-[32px] px-2.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-300';

  return (
    <div className="ctr-contact-form p-3 rounded-[var(--radius-sm)] bg-surface-sunken border border-border space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input type="text" placeholder="Name *" value={form.name} onChange={e => s('name', e.target.value)} className={inputClass} required />
        <input type="text" placeholder="Designation" value={form.designation} onChange={e => s('designation', e.target.value)} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={form.role} onChange={e => s('role', e.target.value)} className={inputClass}>
          <option value="">Select role...</option>
          {CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input type="text" placeholder="ID / Iqama Number" value={form.id_number} onChange={e => s('id_number', e.target.value)} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="text" placeholder="Phone" value={form.phone} onChange={e => s('phone', e.target.value)} className={inputClass} />
        <input type="email" placeholder="Email" value={form.email} onChange={e => s('email', e.target.value)} className={inputClass} />
      </div>
      <div className="flex flex-wrap gap-3">
        {([
          ['is_primary_contact', 'Primary'],
          ['is_site_supervisor', 'Site Supervisor'],
          ['is_safety_rep', 'Safety Rep'],
          ['is_emergency_contact', 'Emergency'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-1.5 text-[11px] text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={form[key] as boolean}
              onChange={e => s(key, e.target.checked)}
              className="rounded border-border"
            />
            {label}
          </label>
        ))}
      </div>
      <textarea
        placeholder="Notes..."
        value={form.notes}
        onChange={e => s('notes', e.target.value)}
        className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-300 resize-none"
        rows={2}
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-[11px] text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface transition-colors">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving || !form.name}
          className="px-3 py-1.5 text-[11px] font-medium text-white bg-primary-500 rounded-[var(--radius-sm)] hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : initial ? 'Update' : 'Add Contact'}
        </button>
      </div>
    </div>
  );
}

/* ── Document Upload Form (inline) ──────────────────── */

function DocumentUploadInline({
  onUpload,
  onCancel,
}: {
  onUpload: (formData: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [docType, setDocType] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const submit = async () => {
    if (!docType || !file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('document_type', docType);
      fd.append('document_number', docNumber);
      fd.append('issue_date', issueDate);
      fd.append('expiry_date', expiryDate);
      fd.append('issued_by', issuedBy);
      fd.append('remarks', remarks);
      fd.append('file', file);
      await onUpload(fd);
    } finally {
      setUploading(false);
    }
  };

  const inputClass =
    'w-full h-[32px] px-2.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-300';

  return (
    <div className="ctr-doc-upload p-3 rounded-[var(--radius-sm)] bg-surface-sunken border border-border space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select value={docType} onChange={e => setDocType(e.target.value)} className={inputClass} required>
          <option value="">Document type *</option>
          {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="text" placeholder="Document Number" value={docNumber} onChange={e => setDocNumber(e.target.value)} className={inputClass} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] text-text-tertiary mb-0.5">Issue Date</label>
          <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-[10px] text-text-tertiary mb-0.5">Expiry Date</label>
          <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-[10px] text-text-tertiary mb-0.5">Issued By</label>
          <input type="text" value={issuedBy} onChange={e => setIssuedBy(e.target.value)} className={inputClass} />
        </div>
      </div>
      <input type="text" placeholder="Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} className={inputClass} />
      <div className="flex items-center gap-3">
        <label className="flex-1 flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-[var(--radius-sm)] cursor-pointer hover:bg-white transition-colors text-[11px] text-text-secondary">
          <Upload size={14} />
          {file ? file.name : 'Choose file *'}
          <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-[11px] text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface transition-colors">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={uploading || !docType || !file}
          className="px-3 py-1.5 text-[11px] font-medium text-white bg-primary-500 rounded-[var(--radius-sm)] hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────── */

export default function ContractorDetail({
  contractor: c,
  onClose,
  onEdit,
  onStatusChange,
  onRefresh,
  addContact,
  updateContact,
  removeContact,
  uploadDocument,
  removeDocument,
  verifyDocument,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<ContractorContact | null>(null);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [statusAction, setStatusAction] = useState<string | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [processingStatus, setProcessingStatus] = useState(false);

  const canEdit = !['Blacklisted'].includes(c.contractor_status);
  const canApprove = ['Under Review'].includes(c.contractor_status);
  const canActivate = ['Approved'].includes(c.contractor_status);
  const canSuspend = ['Active', 'Approved'].includes(c.contractor_status);
  const canReactivate = ['Suspended', 'Inactive'].includes(c.contractor_status);

  const doStatusChange = useCallback(async (status: string) => {
    setProcessingStatus(true);
    try {
      await onStatusChange(c.id, { status, reason: statusReason, notes: statusReason });
      setStatusAction(null);
      setStatusReason('');
      onRefresh();
    } finally {
      setProcessingStatus(false);
    }
  }, [c.id, onStatusChange, statusReason, onRefresh]);

  const handleAddContact = async (data: Record<string, unknown>) => {
    await addContact(data);
    setShowContactForm(false);
    onRefresh();
  };

  const handleUpdateContact = async (data: Record<string, unknown>) => {
    if (!editingContact) return;
    await updateContact(editingContact.id, data);
    setEditingContact(null);
    onRefresh();
  };

  const handleRemoveContact = async (contactId: number) => {
    if (!confirm('Remove this contact?')) return;
    await removeContact(contactId);
    onRefresh();
  };

  const handleUploadDoc = async (formData: FormData) => {
    await uploadDocument(formData);
    setShowDocUpload(false);
    onRefresh();
  };

  const handleRemoveDoc = async (docId: number) => {
    if (!confirm('Delete this document?')) return;
    await removeDocument(docId);
    onRefresh();
  };

  const handleVerifyDoc = async (docId: number, status: string) => {
    await verifyDocument(docId, { verification_status: status });
    onRefresh();
  };

  const contacts = c.contacts ?? [];
  const documents = c.documents ?? [];
  const logs = c.logs ?? [];
  const links = c.links ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="ctr-detail-drawer relative w-full max-w-[720px] bg-white h-full flex flex-col shadow-xl overflow-hidden animate-in slide-in-from-right duration-200">

        {/* ── Header ──────────────────────────────── */}
        <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-[14px] font-bold text-primary-600">{c.contractor_code}</span>
                <ContractorStatusBadge status={c.contractor_status} size="md" />
                <ComplianceBadge status={c.compliance_status} size="sm" />
              </div>
              <h2 className="text-[16px] font-semibold text-text-primary truncate">{c.contractor_name}</h2>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-text-tertiary flex-wrap">
                <span className="inline-flex items-center gap-1"><Building2 size={11} /> {c.company_type}</span>
                {c.scope_of_work && <span>| {c.scope_of_work}</span>}
                {c.site && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {c.site}</span>}
                {c.total_workforce != null && (
                  <span className="inline-flex items-center gap-1"><Users size={11} /> {c.total_workforce} workers</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken transition-colors"
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {canApprove && (
              <button
                onClick={() => setStatusAction('Approved')}
                className="px-3 py-1.5 text-[11px] font-medium text-white bg-purple-600 rounded-[var(--radius-sm)] hover:bg-purple-700 transition-colors"
              >
                <CheckCircle size={12} className="inline mr-1" /> Approve
              </button>
            )}
            {canActivate && (
              <button
                onClick={() => doStatusChange('Active')}
                className="px-3 py-1.5 text-[11px] font-medium text-white bg-green-600 rounded-[var(--radius-sm)] hover:bg-green-700 transition-colors"
              >
                Activate
              </button>
            )}
            {canSuspend && (
              <button
                onClick={() => setStatusAction('Suspended')}
                className="px-3 py-1.5 text-[11px] font-medium text-amber-700 border border-amber-300 bg-amber-50 rounded-[var(--radius-sm)] hover:bg-amber-100 transition-colors"
              >
                Suspend
              </button>
            )}
            {canReactivate && (
              <button
                onClick={() => doStatusChange('Active')}
                className="px-3 py-1.5 text-[11px] font-medium text-green-700 border border-green-300 bg-green-50 rounded-[var(--radius-sm)] hover:bg-green-100 transition-colors"
              >
                Reactivate
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(c)}
                className="px-3 py-1.5 text-[11px] font-medium text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors"
              >
                <Edit3 size={12} className="inline mr-1" /> Edit
              </button>
            )}
          </div>

          {/* Status change dialog */}
          {statusAction && (
            <div className="mt-3 p-3 rounded-[var(--radius-sm)] bg-amber-50 border border-amber-200 space-y-2">
              <p className="text-[12px] text-amber-800 font-medium">
                {statusAction === 'Approved' ? 'Approve this contractor?' : `Change status to ${statusAction}?`}
              </p>
              <textarea
                placeholder="Reason / notes..."
                value={statusReason}
                onChange={e => setStatusReason(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[12px] border border-amber-300 rounded-[var(--radius-sm)] bg-white resize-none focus:outline-none"
                rows={2}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setStatusAction(null); setStatusReason(''); }}
                  className="px-3 py-1.5 text-[11px] text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => doStatusChange(statusAction)}
                  disabled={processingStatus}
                  className="px-3 py-1.5 text-[11px] font-medium text-white bg-primary-500 rounded-[var(--radius-sm)] hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {processingStatus ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Tabs ────────────────────────────────── */}
        <div className="px-5 border-b border-border shrink-0">
          <div className="flex gap-0 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2.5 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {tab.label}
                {tab.key === 'contacts' && contacts.length > 0 && ` (${contacts.length})`}
                {tab.key === 'documents' && documents.length > 0 && ` (${documents.length})`}
                {tab.key === 'history' && logs.length > 0 && ` (${logs.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ─────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">

          {/* ─── OVERVIEW ──────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="ctr-detail-overview grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 space-y-4">
                <SectionCard title="Company Information">
                  <InfoRow label="Contractor Name" value={c.contractor_name} />
                  <InfoRow label="Registered Name" value={c.registered_company_name} />
                  <InfoRow label="Trade Name" value={c.trade_name} />
                  <InfoRow label="Company Type" value={c.company_type} />
                  <InfoRow label="Scope of Work" value={c.scope_of_work} />
                  <InfoRow label="Registration No." value={c.registration_number} />
                  <InfoRow label="Tax / VAT No." value={c.tax_number} />
                  <InfoRow label="Country" value={c.country} />
                  <InfoRow label="City" value={c.city} />
                  <InfoRow label="Address" value={c.address} />
                  {c.description && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-[11px] text-text-tertiary mb-0.5">Description</p>
                      <p className="text-[12px] text-text-secondary whitespace-pre-wrap">{c.description}</p>
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Primary Contact">
                  <InfoRow label="Name" value={c.primary_contact_name} />
                  <InfoRow label="Designation" value={c.primary_contact_designation} />
                  <InfoRow label="Phone" value={c.primary_contact_phone} />
                  <InfoRow label="Email" value={c.primary_contact_email} />
                  <InfoRow label="Alternate" value={c.alternate_contact} />
                  <InfoRow label="Emergency" value={c.emergency_contact_number} />
                </SectionCard>

                <SectionCard title="Operational Details">
                  <InfoRow label="Site" value={c.site} />
                  <InfoRow label="Project" value={c.project} />
                  <InfoRow label="Area" value={c.area} />
                  <InfoRow label="Zone" value={c.zone} />
                  <InfoRow label="Department" value={c.department} />
                  <InfoRow label="Supervisor" value={c.assigned_supervisor} />
                  <InfoRow label="Contract Start" value={formatDate(c.contract_start_date)} />
                  <InfoRow label="Contract End" value={formatDate(c.contract_end_date)} />
                  <InfoRow label="Mobilized" value={formatDate(c.mobilized_date)} />
                  <InfoRow label="Demobilized" value={formatDate(c.demobilized_date)} />
                </SectionCard>

                {c.notes && (
                  <SectionCard title="Notes">
                    <p className="text-[12px] text-text-secondary whitespace-pre-wrap">{c.notes}</p>
                  </SectionCard>
                )}
              </div>

              {/* Right sidebar */}
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-[var(--radius-md)] border-2 border-primary-200 bg-primary-50/30 p-4">
                  <ContractorStatusBadge status={c.contractor_status} size="md" />
                  <div className="mt-3 space-y-1.5">
                    <InfoRow label="Created" value={formatDate(c.created_at)} />
                    <InfoRow label="Approved" value={formatDate(c.approved_at)} />
                    {c.approved_by_user && <InfoRow label="Approved By" value={c.approved_by_user.full_name} />}
                    {c.is_suspended && (
                      <>
                        <InfoRow label="Suspended" value={formatDate(c.suspended_at)} />
                        {c.suspension_reason && (
                          <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                            Reason: {c.suspension_reason}
                          </div>
                        )}
                      </>
                    )}
                    {c.is_contract_expired && (
                      <div className="mt-2 p-2 rounded bg-red-50 border border-red-200 text-[11px] text-red-700 font-medium">
                        Contract has expired
                      </div>
                    )}
                    {c.days_to_contract_end != null && c.days_to_contract_end > 0 && c.days_to_contract_end <= 30 && (
                      <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-700 font-medium">
                        Contract expires in {c.days_to_contract_end} days
                      </div>
                    )}
                  </div>
                </div>

                <SectionCard title="Workforce Summary">
                  <InfoRow label="Total Workforce" value={c.total_workforce} />
                  <InfoRow label="Site Headcount" value={c.current_site_headcount} />
                  <InfoRow label="Skilled Workers" value={c.skilled_workers_count} />
                  <InfoRow label="Unskilled Workers" value={c.unskilled_workers_count} />
                  <InfoRow label="Supervisors" value={c.supervisors_count} />
                  <InfoRow label="Operators" value={c.operators_count} />
                  <InfoRow label="Drivers" value={c.drivers_count} />
                  <InfoRow label="Safety Staff" value={c.safety_staff_count} />
                </SectionCard>

                <SectionCard title="Quick Metrics">
                  <InfoRow label="Contacts" value={c.contacts_count ?? contacts.length} />
                  <InfoRow label="Documents" value={c.documents_count ?? documents.length} />
                  <InfoRow label="Expired Docs" value={c.has_expired_documents ? 'Yes' : 'No'} />
                  <InfoRow label="Next Expiry" value={formatDate(c.next_expiry_date)} />
                  <InfoRow label="Linked Records" value={links.length} />
                </SectionCard>
              </div>
            </div>
          )}

          {/* ─── CONTACTS ──────────────────────────── */}
          {activeTab === 'contacts' && (
            <div className="ctr-detail-contacts space-y-4">
              <div className="flex justify-end">
                {!showContactForm && !editingContact && (
                  <button
                    onClick={() => setShowContactForm(true)}
                    className="px-3 py-1.5 text-[11px] font-medium text-white bg-primary-500 rounded-[var(--radius-sm)] hover:bg-primary-600 transition-colors"
                  >
                    + Add Contact
                  </button>
                )}
              </div>

              {showContactForm && (
                <ContactFormInline onSave={handleAddContact} onCancel={() => setShowContactForm(false)} />
              )}

              {contacts.length === 0 && !showContactForm && (
                <p className="text-[12px] text-text-tertiary p-4 text-center">No contacts added yet.</p>
              )}

              {contacts.map(ct => (
                <div key={ct.id}>
                  {editingContact?.id === ct.id ? (
                    <ContactFormInline
                      initial={ct}
                      onSave={handleUpdateContact}
                      onCancel={() => setEditingContact(null)}
                    />
                  ) : (
                    <div className="ctr-contact-card rounded-[var(--radius-md)] border border-border p-3 flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold text-white"
                        style={{ backgroundColor: ct.is_primary_contact ? '#059669' : ct.is_safety_rep ? '#D97706' : '#6366F1' }}
                      >
                        {ct.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-medium text-text-primary">{ct.name}</span>
                          {ct.role && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{ct.role}</span>
                          )}
                          {ct.is_primary_contact && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">PRIMARY</span>
                          )}
                          {ct.is_safety_rep && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">SAFETY</span>
                          )}
                          {ct.is_emergency_contact && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">EMERGENCY</span>
                          )}
                        </div>
                        {ct.designation && (
                          <p className="text-[11px] text-text-tertiary mt-0.5">{ct.designation}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-text-secondary">
                          {ct.phone && (
                            <span className="inline-flex items-center gap-1"><Phone size={10} /> {ct.phone}</span>
                          )}
                          {ct.email && (
                            <span className="inline-flex items-center gap-1"><Mail size={10} /> {ct.email}</span>
                          )}
                        </div>
                        {ct.notes && <p className="text-[11px] text-text-tertiary mt-1">{ct.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditingContact(ct)}
                          className="p-1 text-text-tertiary hover:text-primary-600 transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleRemoveContact(ct.id)}
                          className="p-1 text-text-tertiary hover:text-red-600 transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ─── DOCUMENTS ─────────────────────────── */}
          {activeTab === 'documents' && (
            <div className="ctr-detail-documents space-y-4">
              <div className="flex justify-end">
                {!showDocUpload && (
                  <button
                    onClick={() => setShowDocUpload(true)}
                    className="px-3 py-1.5 text-[11px] font-medium text-white bg-primary-500 rounded-[var(--radius-sm)] hover:bg-primary-600 transition-colors inline-flex items-center gap-1"
                  >
                    <Upload size={12} /> Upload Document
                  </button>
                )}
              </div>

              {showDocUpload && (
                <DocumentUploadInline onUpload={handleUploadDoc} onCancel={() => setShowDocUpload(false)} />
              )}

              {documents.length === 0 && !showDocUpload && (
                <p className="text-[12px] text-text-tertiary p-4 text-center">No documents uploaded yet.</p>
              )}

              {documents.map(doc => {
                const { bg, text: textColor } = getDocumentStatusColor(doc.status);
                const expired = isExpired(doc.expiry_date);
                const expiring = isExpiringSoon(doc.expiry_date);

                return (
                  <div
                    key={doc.id}
                    className={`ctr-doc-card rounded-[var(--radius-md)] border p-3 ${
                      expired ? 'border-red-300 bg-red-50/30' : expiring ? 'border-amber-300 bg-amber-50/20' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-gray-100 flex items-center justify-center shrink-0">
                        {doc.is_image ? (
                          <img src={doc.url || ''} alt="" className="w-10 h-10 rounded-[var(--radius-sm)] object-cover" />
                        ) : (
                          <FileText size={18} className="text-text-tertiary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-medium text-text-primary">{doc.document_type}</span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: bg, color: textColor }}
                          >
                            {doc.status}
                          </span>
                          {doc.verification_status === 'Verified' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold inline-flex items-center gap-0.5">
                              <CheckCircle size={9} /> Verified
                            </span>
                          )}
                          {doc.verification_status === 'Rejected' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold inline-flex items-center gap-0.5">
                              <XCircle size={9} /> Rejected
                            </span>
                          )}
                          {expired && (
                            <AlertTriangle size={12} className="text-red-500" />
                          )}
                          {!expired && expiring && (
                            <AlertTriangle size={12} className="text-amber-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-text-tertiary">
                          {doc.document_number && <span>#{doc.document_number}</span>}
                          {doc.issued_by && <span>By: {doc.issued_by}</span>}
                          {doc.issue_date && (
                            <span className="inline-flex items-center gap-0.5">
                              <Calendar size={9} /> {formatDate(doc.issue_date)}
                            </span>
                          )}
                          {doc.expiry_date && (
                            <span className={`inline-flex items-center gap-0.5 ${expired ? 'text-red-600 font-medium' : expiring ? 'text-amber-600 font-medium' : ''}`}>
                              <Clock size={9} /> Exp: {formatDate(doc.expiry_date)}
                            </span>
                          )}
                          {doc.file_size_kb && <span>{doc.file_size_kb} KB</span>}
                        </div>
                        {doc.original_name && (
                          <p className="text-[10px] text-text-tertiary mt-0.5 truncate">{doc.original_name}</p>
                        )}
                        {doc.remarks && <p className="text-[11px] text-text-tertiary mt-1 italic">{doc.remarks}</p>}
                        {doc.verified_by && (
                          <p className="text-[10px] text-text-tertiary mt-0.5">
                            Verified by {doc.verified_by_name ?? doc.verified_by} on {formatDate(doc.verified_date)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-text-tertiary hover:text-primary-600 transition-colors"
                            title="Download"
                            onClick={e => e.stopPropagation()}
                          >
                            <Download size={13} />
                          </a>
                        )}
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-text-tertiary hover:text-primary-600 transition-colors"
                            title="View"
                            onClick={e => e.stopPropagation()}
                          >
                            <Eye size={13} />
                          </a>
                        )}
                        {doc.verification_status !== 'Verified' && (
                          <button
                            onClick={() => handleVerifyDoc(doc.id, 'Verified')}
                            className="p-1 text-text-tertiary hover:text-green-600 transition-colors"
                            title="Verify"
                          >
                            <CheckCircle size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="p-1 text-text-tertiary hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── COMPLIANCE ────────────────────────── */}
          {activeTab === 'compliance' && (
            <div className="ctr-detail-compliance space-y-4">
              <SectionCard title="Compliance Overview">
                <div className="flex items-center gap-2 mb-3">
                  <ComplianceBadge status={c.compliance_status} size="sm" />
                  <ContractorStatusBadge status={c.contractor_status} size="sm" />
                </div>
                {c.compliance_summary && (
                  <div className="space-y-2">
                    {([
                      ['license_valid', 'Trade License Valid'],
                      ['insurance_valid', 'Insurance Valid'],
                      ['docs_complete', 'Documents Complete'],
                      ['is_approved', 'Contractor Approved'],
                    ] as const).map(([key, label]) => {
                      const ok = c.compliance_summary![key as keyof typeof c.compliance_summary];
                      return (
                        <div key={key} className="flex items-center gap-2 py-1 border-b border-border/50 last:border-0">
                          {ok ? (
                            <CheckCircle size={14} className="text-green-500 shrink-0" />
                          ) : (
                            <XCircle size={14} className="text-red-500 shrink-0" />
                          )}
                          <span className="text-[12px] text-text-primary">{label}</span>
                          <span className={`ml-auto text-[11px] font-medium ${ok ? 'text-green-600' : 'text-red-600'}`}>
                            {ok ? 'Yes' : 'No'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Document Status Summary">
                {documents.length === 0 ? (
                  <p className="text-[12px] text-text-tertiary">No documents to review.</p>
                ) : (
                  <div className="space-y-1.5">
                    {documents.map(doc => {
                      const expired = isExpired(doc.expiry_date);
                      const expiring = isExpiringSoon(doc.expiry_date);
                      return (
                        <div key={doc.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                          <span className="text-[12px] text-text-primary">{doc.document_type}</span>
                          <div className="flex items-center gap-2">
                            {expired && <span className="text-[10px] text-red-600 font-medium">Expired</span>}
                            {!expired && expiring && <span className="text-[10px] text-amber-600 font-medium">Expiring Soon</span>}
                            {!expired && !expiring && doc.expiry_date && <span className="text-[10px] text-green-600 font-medium">Valid</span>}
                            {!doc.expiry_date && <span className="text-[10px] text-text-tertiary">No expiry</span>}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              doc.verification_status === 'Verified' ? 'bg-green-100 text-green-700' :
                              doc.verification_status === 'Rejected' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {doc.verification_status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              {c.has_expired_documents && (
                <div className="p-3 rounded-[var(--radius-sm)] bg-red-50 border border-red-200 text-[12px] text-red-700">
                  <AlertTriangle size={14} className="inline mr-1" />
                  This contractor has expired documents that require renewal.
                </div>
              )}

              {c.has_expiring_documents && !c.has_expired_documents && (
                <div className="p-3 rounded-[var(--radius-sm)] bg-amber-50 border border-amber-200 text-[12px] text-amber-700">
                  <Clock size={14} className="inline mr-1" />
                  Some documents are expiring within 30 days.
                </div>
              )}
            </div>
          )}

          {/* ─── LINKED RECORDS ────────────────────── */}
          {activeTab === 'links' && (
            <div className="ctr-detail-links space-y-4">
              {links.length === 0 ? (
                <p className="text-[12px] text-text-tertiary p-4 text-center">No linked records found.</p>
              ) : (
                <>
                  {/* Group by module type */}
                  {Object.entries(
                    links.reduce<Record<string, typeof links>>((acc, link) => {
                      if (!acc[link.module_type]) acc[link.module_type] = [];
                      acc[link.module_type].push(link);
                      return acc;
                    }, {})
                  ).map(([moduleType, moduleLinks]) => (
                    <SectionCard key={moduleType} title={`${moduleType} (${moduleLinks.length})`}>
                      <div className="space-y-1.5">
                        {moduleLinks.map(link => (
                          <div key={link.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                            <div>
                              <span className="text-[12px] font-medium text-text-primary">{link.module_title || link.module_code}</span>
                              {link.module_code && link.module_title && (
                                <span className="text-[10px] text-text-tertiary ml-2 font-mono">{link.module_code}</span>
                              )}
                            </div>
                            <span className="text-[10px] text-text-tertiary">{formatDate(link.link_date || link.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ─── HISTORY ───────────────────────────── */}
          {activeTab === 'history' && (
            <div className="ctr-detail-history space-y-0">
              {logs.length === 0 ? (
                <p className="text-[12px] text-text-tertiary p-4 text-center">No history entries.</p>
              ) : (
                <div className="relative pl-6">
                  {/* Timeline line */}
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

                  {logs.map((log, i) => (
                    <div key={log.id} className="relative pb-4 last:pb-0">
                      {/* Dot */}
                      <div
                        className="absolute left-[-15px] top-1.5 w-3 h-3 rounded-full border-2 border-white"
                        style={{
                          backgroundColor:
                            log.action === 'created' ? '#6366F1' :
                            log.action === 'status_changed' ? '#D97706' :
                            log.action === 'approved' ? '#059669' :
                            log.action === 'suspended' ? '#DC2626' :
                            '#9CA3AF',
                        }}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[12px] font-medium text-text-primary capitalize">
                            {log.action.replace(/_/g, ' ')}
                          </p>
                          {log.description && (
                            <p className="text-[11px] text-text-secondary mt-0.5">{log.description}</p>
                          )}
                          {log.from_status && log.to_status && (
                            <div className="flex items-center gap-1 mt-1">
                              <ContractorStatusBadge status={log.from_status} size="sm" />
                              <span className="text-[10px] text-text-tertiary">&rarr;</span>
                              <ContractorStatusBadge status={log.to_status} size="sm" />
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-text-tertiary">
                            {log.performed_by_name && <span>by {log.performed_by_name}</span>}
                            {log.performed_by_role && <span>({log.performed_by_role})</span>}
                          </div>
                        </div>
                        <span className="text-[10px] text-text-tertiary whitespace-nowrap shrink-0">
                          {new Date(log.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: '2-digit',
                          })}{' '}
                          {new Date(log.created_at).toLocaleTimeString('en-GB', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
