import { useState, useEffect } from 'react';
import { X as XIcon, Pencil, MapPin, User, Calendar, FileCheck, AlertTriangle, Clock, Shield, Plus, Zap, Flame, Droplets, Truck, Hash, Wrench, Weight } from 'lucide-react';
import { HealthBadge, ItemStatusBadge, InspectionResultBadge, CategoryBadge, OverdueBadge, DueSoonBadge } from './ChecklistBadges';
import { STRUCTURED_CATEGORIES, INSPECTION_BUTTON_LABELS } from '../config/checklistCategories';
import { format } from 'date-fns';
import type { ChecklistItem, ChecklistInspection } from '../hooks/useChecklists';

interface Props {
  item: ChecklistItem;
  onClose: () => void;
  onEdit: () => void;
  onRecordInspection: () => void;
  onStructuredInspection?: () => void;
  getItemDetail: (id: string) => Promise<ChecklistItem & { inspections: ChecklistInspection[] }>;
}

export function ChecklistItemDetail({ item, onClose, onEdit, onRecordInspection, onStructuredInspection, getItemDetail }: Props) {
  const hasStructuredTemplate = (STRUCTURED_CATEGORIES as readonly string[]).includes(item.category_key);
  const structuredLabel = INSPECTION_BUTTON_LABELS[item.category_key] || 'Structured Inspection';
  const [inspections, setInspections] = useState<ChecklistInspection[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);

  useEffect(() => {
    setLoadingDetail(true);
    getItemDetail(item.id)
      .then(data => setInspections(data.inspections || []))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [item.id, getItemDetail]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel right-0 w-[560px] max-w-full animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border" style={{ borderTop: `4px solid ${item.category_color || 'var(--color-primary-500)'}` }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-mono font-semibold text-text-tertiary">{item.item_code}</span>
              <CategoryBadge label={item.category_label} color={item.category_color}
                lightColor={item.category_light_color} textColor={item.category_text_color} />
            </div>
            <h2 className="text-[16px] font-bold text-text-primary">{item.name}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-warning-600 hover:bg-warning-50 transition-colors" title="Edit">
              <Pencil size={16} />
            </button>
            <button onClick={onClose} className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
              <XIcon size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Status strip */}
          <div className="px-6 py-4 flex items-center gap-3 flex-wrap border-b border-border bg-surface-sunken/50">
            <HealthBadge condition={item.health_condition} />
            <ItemStatusBadge status={item.status} />
            {item.is_overdue && item.days_until_due !== null && <OverdueBadge daysOver={Math.abs(item.days_until_due)} />}
            {item.due_soon && !item.is_overdue && item.days_until_due !== null && <DueSoonBadge daysUntil={item.days_until_due} />}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-b border-border">
            <div className="px-4 py-3.5 text-center border-r border-border">
              <div className="text-[20px] font-bold text-text-primary">{item.inspections_count}</div>
              <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Inspections</div>
            </div>
            <div className="px-4 py-3.5 text-center border-r border-border">
              <div className="text-[14px] font-bold text-text-primary">{formatDate(item.last_internal_inspection_date)}</div>
              <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Last Inspected</div>
            </div>
            <div className="px-4 py-3.5 text-center">
              <div className={`text-[14px] font-bold ${item.is_overdue ? 'text-danger-600' : 'text-text-primary'}`}>
                {formatDate(item.next_internal_inspection_date)}
              </div>
              <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Next Due</div>
            </div>
          </div>

          {/* Details */}
          <div className="px-6 py-5 space-y-4 border-b border-border">
            <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">Item Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {item.item_type && <DetailRow icon={Shield} label="Type" value={item.item_type} />}
              {item.plate_number && <DetailRow icon={FileCheck} label="Plate No." value={item.plate_number} />}
              {item.serial_number && <DetailRow icon={FileCheck} label="Serial No." value={item.serial_number} />}
              {item.make_model && <DetailRow icon={FileCheck} label="Make/Model" value={item.make_model} />}
              {item.swl && <DetailRow icon={AlertTriangle} label="SWL" value={item.swl} />}
              {item.certificate_number && <DetailRow icon={FileCheck} label="Cert No." value={item.certificate_number} />}
              {item.certificate_expiry && (
                <DetailRow icon={Calendar} label="Cert Expiry" value={formatDate(item.certificate_expiry)}
                  highlight={item.cert_expiring_soon} />
              )}
              {item.onboarding_date && <DetailRow icon={Calendar} label="Onboarded" value={formatDate(item.onboarding_date)} />}
              {item.location_area && <DetailRow icon={MapPin} label="Location" value={item.location_area} />}
              {item.assigned_to && <DetailRow icon={User} label="Assigned To" value={item.assigned_to} />}
            </div>
            {item.visual_condition && (
              <div>
                <p className="text-[11px] font-semibold text-text-tertiary mb-1">Visual Condition</p>
                <p className="text-[13px] text-text-secondary bg-surface-sunken rounded-[var(--radius-md)] px-3 py-2">{item.visual_condition}</p>
              </div>
            )}
            {item.notes && (
              <div>
                <p className="text-[11px] font-semibold text-text-tertiary mb-1">Notes</p>
                <p className="text-[13px] text-text-secondary bg-surface-sunken rounded-[var(--radius-md)] px-3 py-2">{item.notes}</p>
              </div>
            )}
          </div>

          {/* Category-specific detail sections */}
          {item.category_key === 'full_body_harness' && (item.manufacture_date || item.retirement_date || item.last_drop_arrest) && (
            <div className="px-6 py-4 border-b border-border space-y-3">
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">Harness Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {item.manufacture_date && <DetailRow icon={Calendar} label="Manufacture Date" value={formatDate(item.manufacture_date)} />}
                {item.retirement_date && <DetailRow icon={Calendar} label="Retirement Date" value={formatDate(item.retirement_date)} />}
              </div>
              {item.retirement_date && new Date(item.retirement_date) < new Date() && (
                <div className="flex items-start gap-2 p-2.5 bg-danger-50 border border-danger-200 rounded-[var(--radius-md)]">
                  <AlertTriangle size={16} className="text-danger-600 shrink-0 mt-0.5" />
                  <p className="text-[12px] font-semibold text-danger-700">RETIRED — Remove from service immediately</p>
                </div>
              )}
              {item.retirement_date && new Date(item.retirement_date) > new Date() && (() => {
                const months = Math.round((new Date(item.retirement_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30));
                return months <= 3 ? (
                  <div className="flex items-start gap-2 p-2.5 bg-warning-50 border border-warning-200 rounded-[var(--radius-md)]">
                    <Clock size={16} className="text-warning-600 shrink-0 mt-0.5" />
                    <p className="text-[12px] font-semibold text-warning-700">Retirement approaching: {formatDate(item.retirement_date)}</p>
                  </div>
                ) : null;
              })()}
              {item.last_drop_arrest && (
                <div className="flex items-start gap-2 p-2.5 bg-danger-50 border border-danger-200 rounded-[var(--radius-md)]">
                  <AlertTriangle size={16} className="text-danger-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-white bg-danger-600 rounded-full mb-1">Fall Arrest Recorded{item.drop_arrest_date ? ` — ${formatDate(item.drop_arrest_date)}` : ''}</span>
                    <p className="text-[12px] text-danger-700">This harness must be removed from service</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {item.category_key === 'fire_extinguisher' && (item.extinguisher_type || item.capacity_litres || item.pressure_status) && (
            <div className="px-6 py-4 border-b border-border space-y-3">
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">Extinguisher Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {item.extinguisher_type && <DetailRow icon={Flame} label="Type" value={item.extinguisher_type} />}
                {item.capacity_litres && <DetailRow icon={Droplets} label="Capacity" value={`${item.capacity_litres} L`} />}
                {item.pressure_status && (
                  <div className="flex items-start gap-2">
                    <FileCheck size={14} className="text-text-tertiary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Pressure</p>
                      <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                        item.pressure_status === 'Normal' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>{item.pressure_status}</span>
                    </div>
                  </div>
                )}
                {item.last_service_date && <DetailRow icon={Calendar} label="Last Service" value={formatDate(item.last_service_date)} />}
                {item.next_service_date && <DetailRow icon={Calendar} label="Next Service" value={formatDate(item.next_service_date)} />}
              </div>
            </div>
          )}

          {item.category_key === 'lifting_gear' && (item.swl || item.certificate_number) && (
            <div className="px-6 py-4 border-b border-border space-y-3">
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">Certification</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {item.swl && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-text-tertiary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">SWL</p>
                      <p className="text-[16px] font-bold text-text-primary">{item.swl}</p>
                    </div>
                  </div>
                )}
                {item.certificate_number && <DetailRow icon={FileCheck} label="Certificate" value={item.certificate_number} />}
                {item.certificate_expiry && (
                  <DetailRow icon={Calendar} label="Cert Expiry" value={formatDate(item.certificate_expiry)} highlight={item.cert_expiring_soon} />
                )}
              </div>
            </div>
          )}

          {item.category_key === 'generator' && (item.fuel_type || item.kva_rating || item.engine_hours) && (
            <div className="px-6 py-4 border-b border-border space-y-3">
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">Generator Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {item.fuel_type && <DetailRow icon={Zap} label="Fuel Type" value={item.fuel_type} />}
                {item.kva_rating && <DetailRow icon={Zap} label="kVA Rating" value={String(item.kva_rating)} />}
                {item.engine_hours && <DetailRow icon={Clock} label="Engine Hours" value={`${item.engine_hours} hrs`} />}
              </div>
            </div>
          )}

          {/* MEWP Details */}
          {item.category_key === 'mewp' && (
            <div className="px-6 py-4 border-b border-border space-y-3">
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">MEWP Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {item.mewp_type && <DetailRow icon={Truck} label="Equipment Type" value={item.mewp_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} />}
                {item.plate_number && <DetailRow icon={Hash} label="Plate / Reg" value={item.plate_number} />}
                {item.make_model && <DetailRow icon={Wrench} label="Make / Model" value={item.make_model} />}
                {item.swl && <DetailRow icon={Weight} label="SWL" value={item.swl} />}
                {item.engine_hours != null && <DetailRow icon={Clock} label="Engine Hours" value={`${item.engine_hours} hrs`} />}
                {item.serial_number && <DetailRow icon={Hash} label="Serial Number" value={item.serial_number} />}
              </div>
              {(item.third_party_cert_number || item.third_party_cert_expiry) && (
                <div className="mt-3 p-3 bg-surface-sunken rounded-[var(--radius-md)] border border-border">
                  <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Third-Party Certificate</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                    {item.third_party_cert_number && <div><span className="text-text-tertiary">Cert No:</span> <span className="font-medium">{item.third_party_cert_number}</span></div>}
                    {item.third_party_cert_expiry && <div><span className="text-text-tertiary">Expiry:</span> <span className="font-medium">{item.third_party_cert_expiry}</span></div>}
                    {item.third_party_inspector && <div><span className="text-text-tertiary">Inspector:</span> <span className="font-medium">{item.third_party_inspector}</span></div>}
                    {item.third_party_company && <div><span className="text-text-tertiary">Company:</span> <span className="font-medium">{item.third_party_company}</span></div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Open Defect Alert */}
          {item.has_open_defect && (
            <div className="mx-6 my-3 p-3 bg-danger-50 border-l-3 border-l-danger-500 border border-danger-100 rounded-[var(--radius-md)]">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-danger-600" />
                <span className="text-[12px] font-bold text-danger-700">Open Defect</span>
              </div>
              <p className="text-[12px] text-danger-600">{item.defect_description}</p>
              {item.defect_reported_date && (
                <p className="text-[11px] text-danger-500 mt-1">Reported: {item.defect_reported_date}</p>
              )}
            </div>
          )}

          {/* Inspection History */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">Inspection History</h3>
              <div className="flex gap-2">
                {hasStructuredTemplate && onStructuredInspection && (
                  <button
                    onClick={onStructuredInspection}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-white rounded-[var(--radius-md)] transition-colors shadow-xs"
                    style={{ backgroundColor: item.category_color || '#6366f1' }}
                  >
                    <Plus size={13} />
                    {structuredLabel}
                  </button>
                )}
                <button
                  onClick={onRecordInspection}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-primary-600 bg-primary-50 rounded-[var(--radius-md)] hover:bg-primary-100 transition-colors"
                >
                  <Plus size={13} />
                  Record Inspection
                </button>
              </div>
            </div>

            {loadingDetail ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border border-border rounded-[var(--radius-md)] p-3">
                    <div className="skeleton h-4 w-1/3 mb-2" />
                    <div className="skeleton h-3 w-2/3" />
                  </div>
                ))}
              </div>
            ) : inspections.length === 0 ? (
              <div className="text-center py-8">
                <Clock size={32} className="mx-auto text-text-tertiary mb-2" />
                <p className="text-[13px] text-text-tertiary">No inspections recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inspections.map(insp => (
                  <div key={insp.id} className="border border-border rounded-[var(--radius-md)] p-3 hover:bg-canvas transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-mono font-semibold text-text-tertiary">{insp.inspection_code}</span>
                        <InspectionResultBadge result={insp.overall_result} />
                      </div>
                      <span className="text-[12px] text-text-tertiary">{formatDate(insp.inspection_date)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-text-secondary">
                      <span>{insp.inspection_type}</span>
                      <span className="text-text-tertiary">by</span>
                      <span className="font-medium">{insp.inspector_name}</span>
                      {insp.inspector_company && <span className="text-text-tertiary">({insp.inspector_company})</span>}
                    </div>
                    {insp.findings && (
                      <p className="text-[12px] text-text-secondary mt-1.5 line-clamp-2">{insp.findings}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function DetailRow({ icon: Icon, label, value, highlight }: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-text-tertiary mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{label}</p>
        <p className={`text-[13px] ${highlight ? 'text-warning-600 font-semibold' : 'text-text-primary'}`}>{value}</p>
      </div>
    </div>
  );
}
