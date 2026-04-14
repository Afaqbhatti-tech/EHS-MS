import { useState } from 'react';
import { X as XIcon, Truck, Package, FileText, History, Link, Edit3, XCircle } from 'lucide-react';
import ManifestStatusBadge from './ManifestStatusBadge';
import WasteCategoryBadge from './WasteCategoryBadge';
import ComplianceBadge from './ComplianceBadge';
import ChainOfCustodyTimeline from './ChainOfCustodyTimeline';
import ManifestAuditLog from './ManifestAuditLog';
import type { Manifest } from '../hooks/useManifests';

interface Props {
  manifest: Manifest;
  onClose: () => void;
  onEdit: (m: Manifest) => void;
  onDispatch: (m: Manifest) => void;
  onReceive: (m: Manifest) => void;
  onDispose: (m: Manifest) => void;
  onCancel: (m: Manifest) => void;
  onStatusChange: (id: number, data: { status: string }) => Promise<unknown>;
}

type Tab = 'overview' | 'waste' | 'logistics' | 'attachments' | 'links' | 'history';

const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'overview', label: 'Overview', icon: FileText },
  { key: 'waste', label: 'Waste Details', icon: Package },
  { key: 'logistics', label: 'Logistics', icon: Truck },
  { key: 'attachments', label: 'Attachments', icon: FileText },
  { key: 'links', label: 'Links', icon: Link },
  { key: 'history', label: 'History', icon: History },
];

export default function ManifestDetail({ manifest: m, onClose, onEdit, onDispatch, onReceive, onDispose, onCancel, onStatusChange }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const canEdit = !['Completed', 'Cancelled'].includes(m.status);
  const canDispatch = ['Draft', 'Prepared', 'Ready for Dispatch'].includes(m.status);
  const canReceive = ['Dispatched', 'In Transit'].includes(m.status);
  const canDispose = m.status === 'Received';
  const canCancel = !['Completed', 'Cancelled', 'Rejected'].includes(m.status);
  const canPrepare = m.status === 'Draft';

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    value ? (
      <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
        <span className="text-[11px] text-text-tertiary">{label}</span>
        <span className="text-[12px] text-text-primary font-medium text-right max-w-[60%]">{value}</span>
      </div>
    ) : null
  );

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
      <h4 className="text-[13px] font-semibold text-text-primary mb-3">{title}</h4>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[720px] bg-white h-full flex flex-col shadow-xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-[14px] font-bold text-primary-600">{m.manifest_code}</span>
                <ManifestStatusBadge status={m.status} size="md" />
                {m.priority !== 'Normal' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.priority === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {m.priority}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] text-text-primary font-medium">{m.waste_type}</span>
                <WasteCategoryBadge category={m.waste_category} size="xs" />
              </div>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-text-tertiary">
                <span>{Number(m.quantity).toLocaleString()} {m.unit}</span>
                {m.source_area && <span>· {m.source_area}</span>}
                {m.facility_name && <span>· {m.facility_name}</span>}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken transition-colors">
              <XIcon size={18} />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {canPrepare && (
              <button onClick={() => onStatusChange(m.id, { status: 'Prepared' })} className="px-3 py-1.5 text-[11px] font-medium text-white bg-purple-600 rounded-[var(--radius-sm)] hover:bg-purple-700 transition-colors">
                Mark Prepared
              </button>
            )}
            {canDispatch && (
              <button onClick={() => onDispatch(m)} className="px-3 py-1.5 text-[11px] font-medium text-white bg-amber-600 rounded-[var(--radius-sm)] hover:bg-amber-700 transition-colors">
                <Truck size={12} className="inline mr-1" /> Confirm Dispatch
              </button>
            )}
            {canReceive && (
              <button onClick={() => onReceive(m)} className="px-3 py-1.5 text-[11px] font-medium text-white bg-teal-600 rounded-[var(--radius-sm)] hover:bg-teal-700 transition-colors">
                Confirm Receiving
              </button>
            )}
            {canDispose && (
              <button onClick={() => onDispose(m)} className="px-3 py-1.5 text-[11px] font-medium text-white bg-green-600 rounded-[var(--radius-sm)] hover:bg-green-700 transition-colors">
                Confirm Disposal
              </button>
            )}
            {canEdit && (
              <button onClick={() => onEdit(m)} className="px-3 py-1.5 text-[11px] font-medium text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors">
                <Edit3 size={12} className="inline mr-1" /> Edit
              </button>
            )}
            {canCancel && (
              <button onClick={() => onCancel(m)} className="px-3 py-1.5 text-[11px] font-medium text-red-600 border border-red-200 rounded-[var(--radius-sm)] hover:bg-red-50 transition-colors">
                <XCircle size={12} className="inline mr-1" /> Cancel
              </button>
            )}
          </div>
        </div>

        {/* Chain of Custody */}
        <div className="shrink-0 px-5 pt-4">
          <ChainOfCustodyTimeline manifest={m} />
        </div>

        {/* Tabs */}
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
                {tab.key === 'attachments' && m.attachments && ` (${m.attachments.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 space-y-4">
                <SectionCard title="Source / Generator">
                  <InfoRow label="Source Site" value={m.source_site} />
                  <InfoRow label="Project" value={m.source_project} />
                  <InfoRow label="Area" value={m.source_area} />
                  <InfoRow label="Zone" value={m.source_zone} />
                  <InfoRow label="Department" value={m.source_department} />
                  <InfoRow label="Generator Company" value={m.generator_company} />
                  <InfoRow label="Responsible Person" value={m.responsible_person} />
                  <InfoRow label="Contact" value={m.contact_number} />
                </SectionCard>
                <SectionCard title="Quantity & Packaging">
                  <InfoRow label="Quantity" value={`${Number(m.quantity).toLocaleString()} ${m.unit}`} />
                  <InfoRow label="Container Count" value={m.container_count} />
                  <InfoRow label="Packaging" value={m.packaging_type} />
                  <InfoRow label="Gross Weight" value={m.gross_weight_kg ? `${m.gross_weight_kg} kg` : null} />
                  <InfoRow label="Net Weight" value={m.net_weight_kg ? `${m.net_weight_kg} kg` : null} />
                  <InfoRow label="Storage Location" value={m.temporary_storage_location} />
                </SectionCard>
                <SectionCard title="Compliance">
                  <div className="flex items-center gap-2 mb-2">
                    <ComplianceBadge status={m.manifest_compliance_status} size="sm" />
                    {m.hazardous_waste_compliance && <span className="text-[10px] text-green-600">Hazardous compliant</span>}
                  </div>
                  <InfoRow label="Regulatory Ref." value={m.regulatory_reference} />
                  <InfoRow label="Permit Ref." value={m.permit_license_reference} />
                  {m.special_approval_required && (
                    <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                      Special approval required: {m.special_approval_note || 'N/A'}
                    </div>
                  )}
                </SectionCard>
                {m.notes && (
                  <SectionCard title="Notes">
                    <p className="text-[12px] text-text-secondary whitespace-pre-wrap">{m.notes}</p>
                  </SectionCard>
                )}
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-[var(--radius-md)] border-2 border-primary-200 bg-primary-50/30 p-4">
                  <ManifestStatusBadge status={m.status} size="md" />
                  <div className="mt-3 space-y-1.5">
                    <InfoRow label="Created" value={m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB') : null} />
                    <InfoRow label="Dispatched" value={m.dispatched_at ? new Date(m.dispatched_at).toLocaleDateString('en-GB') : null} />
                    <InfoRow label="Received" value={m.received_at ? new Date(m.received_at).toLocaleDateString('en-GB') : null} />
                    <InfoRow label="Completed" value={m.completed_at ? new Date(m.completed_at).toLocaleDateString('en-GB') : null} />
                    {m.is_delayed && (
                      <div className="mt-2 p-2 rounded bg-red-50 border border-red-200 text-[11px] text-red-700 font-medium">
                        ⚠ This manifest is delayed
                      </div>
                    )}
                  </div>
                </div>
                <SectionCard title="Quick Metrics">
                  <InfoRow label="Attachments" value={m.attachments?.length ?? 0} />
                  <InfoRow label="Log Entries" value={m.logs?.length ?? 0} />
                  <InfoRow label="Days in Transit" value={m.days_in_transit != null ? `${m.days_in_transit} days` : null} />
                </SectionCard>
              </div>
            </div>
          )}

          {activeTab === 'waste' && (
            <div className="space-y-4">
              <SectionCard title="Waste Identification">
                <InfoRow label="Waste Type" value={m.waste_type} />
                <InfoRow label="Category" value={<WasteCategoryBadge category={m.waste_category} />} />
                <InfoRow label="Description" value={m.waste_description} />
                <InfoRow label="Hazard Classification" value={m.hazard_classification} />
                <InfoRow label="Waste Code" value={m.waste_code} />
                <InfoRow label="UN Code" value={m.un_code} />
                <InfoRow label="Physical Form" value={m.physical_form} />
                <InfoRow label="Chemical Composition" value={m.chemical_composition} />
              </SectionCard>
              {(m.special_handling || m.compatibility_notes) && (
                <SectionCard title="Handling Requirements">
                  {m.special_handling && (
                    <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[12px] text-amber-800 mb-2">
                      <strong>Special Handling:</strong> {m.special_handling}
                    </div>
                  )}
                  {m.compatibility_notes && <InfoRow label="Compatibility" value={m.compatibility_notes} />}
                </SectionCard>
              )}
            </div>
          )}

          {activeTab === 'logistics' && (
            <div className="space-y-4">
              <SectionCard title="Transporter Details">
                <InfoRow label="Transporter" value={m.transporter_name} />
                <InfoRow label="License No." value={m.transporter_license_no} />
                <InfoRow label="Driver" value={m.driver_name} />
                <InfoRow label="Driver Contact" value={m.driver_contact} />
                <InfoRow label="Vehicle" value={m.vehicle_number} />
                <InfoRow label="Vehicle Type" value={m.vehicle_type} />
                <InfoRow label="Handover By" value={m.handover_by} />
                <InfoRow label="Handover Date" value={m.handover_date ? new Date(m.handover_date).toLocaleDateString('en-GB') : null} />
                <InfoRow label="Expected Delivery" value={m.expected_delivery_date ? new Date(m.expected_delivery_date).toLocaleDateString('en-GB') : null} />
                {m.handover_note && <InfoRow label="Handover Note" value={m.handover_note} />}
              </SectionCard>
              <SectionCard title="Disposal Facility">
                <InfoRow label="Facility" value={m.facility_name} />
                <InfoRow label="License No." value={m.facility_license_no} />
                <InfoRow label="Address" value={m.facility_address} />
                <InfoRow label="Treatment Method" value={m.treatment_method} />
                <InfoRow label="Receiving Person" value={m.receiving_person} />
                <InfoRow label="Receiving Date" value={m.receiving_date ? new Date(m.receiving_date).toLocaleDateString('en-GB') : null} />
                <InfoRow label="Disposal Certificate" value={m.disposal_certificate_no} />
                {m.final_notes && <InfoRow label="Final Notes" value={m.final_notes} />}
              </SectionCard>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div>
              {(!m.attachments || m.attachments.length === 0) ? (
                <p className="text-[12px] text-text-tertiary p-4">No attachments.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {m.attachments.map(att => (
                    <div key={att.id} className="rounded-[var(--radius-md)] border border-border p-3 flex items-start gap-3">
                      {att.is_image ? (
                        <img src={att.url} alt={att.original_name || ''} className="w-14 h-14 rounded object-cover border border-border" />
                      ) : (
                        <div className="w-14 h-14 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-text-tertiary uppercase">
                          {att.file_type || 'FILE'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-text-primary truncate">{att.original_name || 'Unnamed'}</p>
                        <p className="text-[10px] text-text-tertiary">{att.attachment_category} · {att.file_size_kb ? `${att.file_size_kb} KB` : ''}</p>
                        {att.url && (
                          <a href={att.url} target="_blank" rel="noreferrer" className="text-[11px] text-primary-600 hover:underline mt-1 inline-block">Download</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'links' && (
            <div className="space-y-3">
              {m.linked_waste_record && (
                <SectionCard title="Linked Waste Record">
                  <InfoRow label="Code" value={m.linked_waste_record.waste_code} />
                  <InfoRow label="Type" value={m.linked_waste_record.waste_type} />
                </SectionCard>
              )}
              {!m.linked_waste_record && !m.linked_env_incident && !m.linked_inspection && !m.linked_compliance && (
                <p className="text-[12px] text-text-tertiary p-4">No linked records.</p>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <ManifestAuditLog logs={m.logs || []} />
          )}
        </div>
      </div>
    </div>
  );
}
