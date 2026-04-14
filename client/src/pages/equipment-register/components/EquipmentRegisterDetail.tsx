import { useEffect, useState } from 'react';
import {
  X, Edit3, Trash2, Calendar, MapPin, Building2, Shield, Wrench,
  DollarSign, FileText, User, Clock,
} from 'lucide-react';
import Badge, { StatusBadge } from '../../../components/ui/Badge';
import { format } from 'date-fns';
import type { EquipmentItem } from '../hooks/useEquipmentRegister';

// ── Props ──────────────────────────────────────────

interface Props {
  item: EquipmentItem | null;
  open: boolean;
  onClose: () => void;
  onEdit: (item: EquipmentItem) => void;
  onDelete: (item: EquipmentItem) => void;
}

// ── Helpers ────────────────────────────────────────

function formatLabel(val: string): string {
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
}

function conditionColor(condition: string | null | undefined): string {
  if (!condition) return 'bg-gray-400';
  switch (condition.toLowerCase()) {
    case 'good': case 'excellent': return 'bg-green-500';
    case 'fair': case 'satisfactory': return 'bg-amber-500';
    case 'poor': case 'damaged': case 'critical': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
}

function conditionBadgeVariant(condition: string | null | undefined): 'success' | 'warning' | 'danger' | 'neutral' {
  if (!condition) return 'neutral';
  switch (condition.toLowerCase()) {
    case 'good': case 'excellent': return 'success';
    case 'fair': case 'satisfactory': return 'warning';
    case 'poor': case 'damaged': case 'critical': return 'danger';
    default: return 'neutral';
  }
}

function inspectionBadgeVariant(status: string | null | undefined): 'success' | 'warning' | 'danger' | 'neutral' {
  if (!status) return 'neutral';
  switch (status.toLowerCase()) {
    case 'valid': case 'current': return 'success';
    case 'due_soon': case 'due soon': return 'warning';
    case 'overdue': case 'expired': return 'danger';
    default: return 'neutral';
  }
}

// ── Sub-components ─────────────────────────────────

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value ?? '—';
  return (
    <div>
      <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{label}</p>
      <p className="text-[13px] text-text-primary mt-0.5">{display || '—'}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ size: number; className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} className="text-text-tertiary" />
      <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">{title}</h3>
    </div>
  );
}

// ── Main Component ─────────────────────────────────

export default function EquipmentRegisterDetail({ item, open, onClose, onEdit, onDelete }: Props) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Handle open/close with animation
  useEffect(() => {
    if (open && item) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open, item]);

  if (!visible || !item) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-[rgba(15,35,24,0.45)] transition-opacity duration-300 ${animating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[560px] max-w-full bg-surface border-l border-border shadow-xl flex flex-col transition-transform duration-300 ease-out ${animating ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* ── Header ────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              {/* Thumbnail */}
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.equipment_name}
                  className="w-16 h-16 rounded-[var(--radius-md)] object-cover border border-border shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-[12px] font-mono font-semibold text-text-tertiary mb-0.5">{item.equipment_code}</p>
                <h2 className="text-[16px] font-bold text-text-primary truncate">{item.equipment_name}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <StatusBadge status={formatLabel(item.equipment_status)} />
                  <StatusBadge status={formatLabel(item.working_status)} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(item)}
                className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-warning-600 hover:bg-warning-50 transition-colors"
                title="Edit"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => onDelete(item)}
                className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-danger-600 hover:bg-danger-50 transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors"
              >
                <XIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Scrollable Body ───────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* 1. Quick Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-b border-border">
            <div className="px-4 py-3.5 text-center border-r border-border">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full shrink-0 ${conditionColor(item.condition_status)}`} />
                <span className="text-[14px] font-bold text-text-primary">
                  {item.condition_status ? formatLabel(item.condition_status) : '—'}
                </span>
              </div>
              <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Condition</div>
            </div>
            <div className="px-4 py-3.5 text-center border-r border-border">
              <Badge variant={inspectionBadgeVariant(item.inspection_status)} dot className="mb-1">
                {item.inspection_status ? formatLabel(item.inspection_status) : '—'}
              </Badge>
              <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mt-1">Inspection</div>
            </div>
            <div className="px-4 py-3.5 text-center">
              <div className={`text-[14px] font-bold ${item.inspection_status?.toLowerCase() === 'overdue' ? 'text-danger-600' : 'text-text-primary'}`}>
                {formatDate(item.next_inspection_date)}
              </div>
              <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Next Inspection</div>
            </div>
          </div>

          {/* 2. Basic Information */}
          <div className="px-6 py-5 border-b border-border">
            <SectionHeader icon={Wrench} title="Basic Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailField label="Serial Number" value={item.serial_number} />
              <DetailField label="Category" value={item.equipment_category ? formatLabel(item.equipment_category) : null} />
              <DetailField label="Type" value={item.equipment_type ? formatLabel(item.equipment_type) : null} />
              <DetailField label="Manufacturer" value={item.manufacturer} />
              <DetailField label="Model" value={item.model_number} />
              <DetailField label="Asset Tag" value={item.asset_tag} />
              <DetailField label="Registration Number" value={item.registration_number} />
            </div>
          </div>

          {/* 3. Status & Lifecycle */}
          <div className="px-6 py-5 border-b border-border">
            <SectionHeader icon={Shield} title="Status & Lifecycle" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Equipment Status</p>
                <div className="mt-0.5"><StatusBadge status={formatLabel(item.equipment_status)} /></div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Working Status</p>
                <div className="mt-0.5"><StatusBadge status={formatLabel(item.working_status)} /></div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Condition</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${conditionColor(item.condition_status)}`} />
                  <Badge variant={conditionBadgeVariant(item.condition_status)}>
                    {item.condition_status ? formatLabel(item.condition_status) : '—'}
                  </Badge>
                </div>
              </div>
              <DetailField label="Condition Details" value={item.condition_details} />
              <DetailField label="Purchase Date" value={formatDate(item.purchase_date)} />
              <DetailField label="Commissioning Date" value={formatDate(item.commissioning_date)} />
              <DetailField label="Retirement Date" value={formatDate(item.retirement_date)} />
            </div>
          </div>

          {/* 4. Location & Assignment */}
          <div className="px-6 py-5 border-b border-border">
            <SectionHeader icon={MapPin} title="Location & Assignment" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailField label="Project Name" value={item.project_name} />
              <DetailField label="Current Location" value={item.current_location} />
              <DetailField label="Area" value={item.area} />
              <DetailField label="Zone" value={item.zone} />
              <DetailField label="Assigned Team" value={item.assigned_team} />
              <DetailField label="Assigned Supervisor" value={item.assigned_supervisor} />
              <DetailField label="Assigned Operator" value={item.assigned_operator} />
            </div>
          </div>

          {/* 5. Ownership & Authorization */}
          <div className="px-6 py-5 border-b border-border">
            <SectionHeader icon={Building2} title="Ownership & Authorization" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailField label="Company Name" value={item.company_name} />
              <div>
                <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">TUV Authorized</p>
                <div className="mt-0.5">
                  <Badge variant={item.tuv_authorized === 'yes' ? 'success' : 'neutral'}>
                    {item.tuv_authorized === 'yes' ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
              <DetailField label="Vendor / Supplier" value={item.vendor_supplier} />
            </div>
          </div>

          {/* 6. Inspection & Certification */}
          <div className="px-6 py-5 border-b border-border">
            <SectionHeader icon={Calendar} title="Inspection & Certification" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailField label="Last Inspection Date" value={formatDate(item.last_inspection_date)} />
              <DetailField label="Next Inspection Date" value={formatDate(item.next_inspection_date)} />
              <DetailField label="Inspection Frequency" value={item.inspection_frequency ? formatLabel(item.inspection_frequency) : null} />
              <div>
                <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Inspection Status</p>
                <div className="mt-0.5">
                  <Badge variant={inspectionBadgeVariant(item.inspection_status)} dot>
                    {item.inspection_status ? formatLabel(item.inspection_status) : '—'}
                  </Badge>
                </div>
              </div>
              <DetailField label="Certificate Number" value={item.certificate_number} />
              <DetailField label="TUV Valid Until" value={formatDate(item.tuv_valid_until)} />
            </div>
          </div>

          {/* 7. Financial */}
          <div className="px-6 py-5 border-b border-border">
            <SectionHeader icon={DollarSign} title="Financial" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailField label="Purchase Cost" value={item.purchase_cost} />
              <div>
                <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Rental Status</p>
                <div className="mt-0.5"><StatusBadge status={formatLabel(item.rental_status)} /></div>
              </div>
              <DetailField label="Rental Company" value={item.rental_company} />
              <DetailField label="Warranty Expiry" value={formatDate(item.warranty_expiry)} />
            </div>
          </div>

          {/* 8. Notes */}
          {(item.notes || item.remarks) && (
            <div className="px-6 py-5 border-b border-border">
              <SectionHeader icon={FileText} title="Notes" />
              {item.notes && (
                <div className="mb-3">
                  <p className="text-[11px] font-semibold text-text-tertiary mb-1">Notes</p>
                  <p className="text-[13px] text-text-secondary bg-surface-sunken rounded-[var(--radius-md)] px-3 py-2">{item.notes}</p>
                </div>
              )}
              {item.remarks && (
                <div>
                  <p className="text-[11px] font-semibold text-text-tertiary mb-1">Remarks</p>
                  <p className="text-[13px] text-text-secondary bg-surface-sunken rounded-[var(--radius-md)] px-3 py-2">{item.remarks}</p>
                </div>
              )}
            </div>
          )}

          {/* 9. Equipment Image */}
          {(item.image_url || (item.additional_image_urls && item.additional_image_urls.length > 0)) && (
            <div className="px-6 py-5 border-b border-border">
              <SectionHeader icon={FileText} title="Equipment Image" />
              {item.image_url && (
                <a href={item.image_url} target="_blank" rel="noopener noreferrer" className="block mb-3">
                  <img
                    src={item.image_url}
                    alt={item.equipment_name}
                    className="max-h-[300px] w-full object-contain bg-surface-sunken rounded-[var(--radius-md)] border border-border cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </a>
              )}
              {item.additional_image_urls && item.additional_image_urls.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-text-tertiary mb-1.5">
                    Additional Images ({item.additional_image_urls.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.additional_image_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={`Additional ${i + 1}`}
                          className="w-[80px] h-[80px] object-cover rounded-[var(--radius-sm)] border border-border cursor-pointer hover:brightness-90 hover:scale-[1.02] transition-all"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 10. Audit Info */}
          <div className="px-6 py-5">
            <SectionHeader icon={Clock} title="Audit Info" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <User size={14} className="text-text-tertiary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Created By</p>
                  <p className="text-[13px] text-text-primary mt-0.5">{item.created_by || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User size={14} className="text-text-tertiary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Updated By</p>
                  <p className="text-[13px] text-text-primary mt-0.5">{item.updated_by || '—'}</p>
                </div>
              </div>
              <DetailField label="Created At" value={formatDate(item.created_at)} />
              <DetailField label="Updated At" value={formatDate(item.updated_at)} />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
