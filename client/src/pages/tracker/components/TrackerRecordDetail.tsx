import { useState, useEffect } from 'react';
import { X as XIcon, Pencil, MapPin, User, Calendar, FileCheck, AlertTriangle, Clock, Shield, Plus, ShieldAlert, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import { TrackerStatusBadge, ConditionBadge, InspectionResultBadge, CategoryBadge, OverdueBadge, DueSoonBadge, TuvBadge } from './TrackerBadges';
import { format } from 'date-fns';
import type { TrackerRecord, TrackerInspection } from '../hooks/useTracker';

interface Props {
  record: TrackerRecord;
  onClose: () => void;
  onEdit: () => void;
  onRecordInspection: () => void;
  getRecordDetail: (id: number) => Promise<TrackerRecord>;
}

export function TrackerRecordDetail({ record, onClose, onEdit, onRecordInspection, getRecordDetail }: Props) {
  const [inspections, setInspections] = useState<TrackerInspection[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);

  useEffect(() => {
    setLoadingDetail(true);
    getRecordDetail(record.id)
      .then(data => setInspections(data.inspections || []))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [record.id, getRecordDetail]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel right-0 w-[560px] max-w-full animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border" style={{ borderTop: `4px solid ${record.category_color || 'var(--color-primary-500)'}` }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-mono font-semibold text-text-tertiary">{record.record_code}</span>
              <CategoryBadge label={record.category_label} color={record.category_color} lightColor={record.category_light_color} textColor={record.category_text_color} />
            </div>
            <h2 className="text-[16px] font-bold text-text-primary">{record.equipment_name}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-warning-600 hover:bg-warning-50 transition-colors" title="Edit"><Pencil size={16} /></button>
            <button onClick={onClose} className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors"><XIcon size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Status strip */}
          <div className="px-6 py-4 flex items-center gap-3 flex-wrap border-b border-border bg-surface-sunken/50">
            <ConditionBadge condition={record.condition} />
            <TrackerStatusBadge status={record.status} />
            {record.is_overdue && record.days_until_due !== null && <OverdueBadge daysOver={Math.abs(record.days_until_due)} />}
            {record.due_soon && !record.is_overdue && record.days_until_due !== null && <DueSoonBadge daysUntil={record.days_until_due} />}
            <TuvBadge isOverdue={record.is_tuv_overdue} daysUntil={record.days_until_tuv} />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-b border-border">
            <div className="px-4 py-3.5 text-center border-r border-border">
              <div className="text-[14px] font-bold text-text-primary">{formatDate(record.last_internal_inspection_date)}</div>
              <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Last Inspected</div>
            </div>
            <div className="px-4 py-3.5 text-center border-r border-border">
              <div className={`text-[14px] font-bold ${record.is_overdue ? 'text-danger-600' : 'text-text-primary'}`}>
                {formatDate(record.next_internal_inspection_date)}
              </div>
              <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Next Due</div>
            </div>
            <div className="px-4 py-3.5 text-center">
              <div className={`text-[14px] font-bold ${record.is_tuv_overdue ? 'text-danger-600' : 'text-text-primary'}`}>
                {formatDate(record.tuv_expiry_date)}
              </div>
              <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">TUV Expiry</div>
            </div>
          </div>

          {/* Details */}
          <div className="px-6 py-5 space-y-4 border-b border-border">
            <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">Equipment Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {record.item_subtype && <DetailRow icon={Shield} label="Type" value={record.item_subtype} />}
              {record.plate_number && <DetailRow icon={FileCheck} label="Plate No." value={record.plate_number} />}
              {record.serial_number && <DetailRow icon={FileCheck} label="Serial No." value={record.serial_number} />}
              {record.make_model && <DetailRow icon={FileCheck} label="Make/Model" value={record.make_model} />}
              {record.swl && <DetailRow icon={AlertTriangle} label="SWL" value={record.swl} />}
              {record.certificate_number && <DetailRow icon={FileCheck} label="Cert No." value={record.certificate_number} />}
              {record.certificate_expiry && <DetailRow icon={Calendar} label="Cert Expiry" value={formatDate(record.certificate_expiry)} highlight={record.is_cert_expired} />}
              {record.checker_number && <DetailRow icon={FileCheck} label="Checker No." value={record.checker_number} />}
              {record.onboarding_date && <DetailRow icon={Calendar} label="Onboarded" value={formatDate(record.onboarding_date)} />}
              {record.location_area && <DetailRow icon={MapPin} label="Location" value={record.location_area} />}
              {record.assigned_to && <DetailRow icon={User} label="Assigned To" value={record.assigned_to} />}
              {record.inspected_by && <DetailRow icon={User} label="Inspected By" value={record.inspected_by} />}
            </div>

            {/* TUV Details */}
            {(record.tuv_certificate_number || record.tuv_inspector) && (
              <div className="mt-3 p-3 bg-surface-sunken rounded-[var(--radius-md)] border border-border">
                <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">TUV Certificate</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                  {record.tuv_certificate_number && <div><span className="text-text-tertiary">Cert:</span> <span className="font-medium">{record.tuv_certificate_number}</span></div>}
                  {record.tuv_inspector && <div><span className="text-text-tertiary">Inspector:</span> <span className="font-medium">{record.tuv_inspector}</span></div>}
                  {record.tuv_company && <div><span className="text-text-tertiary">Company:</span> <span className="font-medium">{record.tuv_company}</span></div>}
                </div>
              </div>
            )}

            {record.notes && (
              <div>
                <p className="text-[11px] font-semibold text-text-tertiary mb-1">Notes</p>
                <p className="text-[13px] text-text-secondary bg-surface-sunken rounded-[var(--radius-md)] px-3 py-2">{record.notes}</p>
              </div>
            )}
          </div>

          {/* Open Defect */}
          {record.has_open_defect && (
            <div className="mx-6 my-3 p-3 bg-danger-50 border-l-3 border-l-danger-500 border border-danger-100 rounded-[var(--radius-md)]">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-danger-600" />
                <span className="text-[12px] font-bold text-danger-700">Open Defect</span>
              </div>
              <p className="text-[12px] text-danger-600">{record.defect_description}</p>
            </div>
          )}

          {/* Inspection History */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">Inspection History</h3>
              <button onClick={onRecordInspection}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-primary-600 bg-primary-50 rounded-[var(--radius-md)] hover:bg-primary-100 transition-colors">
                <Plus size={13} /> Record Inspection
              </button>
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
                {inspections.map(insp => {
                  const attachCount = (insp.checklist_file_url ? 1 : 0) + (insp.checklist_image_url ? 1 : 0) +
                    (insp.additional_image_urls?.length || 0) + (insp.supporting_doc_urls?.length || 0);
                  const hasCatFields = !!(insp.extinguisher_weight_kg || insp.harness_condition || insp.ladder_type || insp.civil_defense_tag_ok !== undefined && insp.civil_defense_tag_ok !== null);

                  return (
                    <div key={insp.id} className={`border border-border rounded-[var(--radius-md)] p-3 hover:bg-canvas transition-colors ${insp.overdue_at_time ? 'border-l-2 border-l-warning-400' : ''}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-mono font-semibold text-text-tertiary">{insp.log_code}</span>
                          <InspectionResultBadge result={insp.result} />
                          {insp.condition_found && <ConditionBadge condition={insp.condition_found} />}
                        </div>
                        <span className="text-[12px] text-text-tertiary">{formatDate(insp.inspection_date)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-text-secondary">
                        <span>{insp.inspection_type}</span>
                        <span className="text-text-tertiary">by</span>
                        <span className="font-medium">{insp.inspector_name}</span>
                        {insp.inspector_company && <span className="text-text-tertiary">({insp.inspector_company})</span>}
                      </div>

                      {/* Category-specific fields */}
                      {hasCatFields && (
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {insp.extinguisher_weight_kg && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-surface-sunken rounded text-text-secondary">Weight: {insp.extinguisher_weight_kg} kg</span>
                          )}
                          {insp.civil_defense_tag_ok !== undefined && insp.civil_defense_tag_ok !== null && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${insp.civil_defense_tag_ok ? 'bg-health-50 text-health-700' : 'bg-danger-50 text-danger-700'}`}>
                              CD Tag: {insp.civil_defense_tag_ok ? 'OK' : 'Missing'}
                            </span>
                          )}
                          {insp.harness_condition && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-surface-sunken rounded text-text-secondary">Harness: {insp.harness_condition}</span>
                          )}
                          {insp.drop_arrest_occurred && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-warning-50 text-warning-700 rounded">Drop Arrest</span>
                          )}
                          {insp.ladder_type && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-surface-sunken rounded text-text-secondary">Ladder: {insp.ladder_type}</span>
                          )}
                        </div>
                      )}

                      {insp.findings && <p className="text-[12px] text-text-secondary mt-1.5 line-clamp-2">{insp.findings}</p>}

                      {/* Defect alert */}
                      {insp.defect_found && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-danger-600">
                          <AlertTriangle size={11} />
                          <span className="font-semibold">Defect:</span>
                          <span className="line-clamp-1">{insp.defect_detail}</span>
                        </div>
                      )}

                      {/* Attachments indicator + thumbnails */}
                      {attachCount > 0 && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Paperclip size={11} className="text-text-tertiary" />
                            <span className="text-[10px] font-semibold text-text-tertiary">{attachCount} attachment{attachCount !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {insp.checklist_file_url && (
                              <a href={insp.checklist_file_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100 transition-colors">
                                <FileText size={10} /> Checklist
                              </a>
                            )}
                            {insp.checklist_image_url && (
                              <a href={insp.checklist_image_url} target="_blank" rel="noopener noreferrer">
                                <img src={insp.checklist_image_url} alt="Checklist" className="w-10 h-10 object-cover rounded border border-border hover:brightness-90 transition" />
                              </a>
                            )}
                            {insp.additional_image_urls?.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`Photo ${i + 1}`} className="w-10 h-10 object-cover rounded border border-border hover:brightness-90 transition" />
                              </a>
                            ))}
                            {insp.supporting_doc_urls?.map((url, i) => (
                              <a key={`doc-${i}`} href={url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-text-secondary bg-surface-sunken rounded hover:bg-surface transition-colors border border-border">
                                <FileText size={10} /> Doc {i + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Overdue warning */}
                      {insp.overdue_at_time && (
                        <span className="inline-flex items-center px-1.5 py-[1px] text-[9px] font-bold rounded bg-warning-50 text-warning-700 border border-warning-200 mt-1.5">
                          Was overdue {insp.days_overdue_at_time ? `by ${insp.days_overdue_at_time}d` : ''}
                        </span>
                      )}
                    </div>
                  );
                })}
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
        <p className={`text-[13px] ${highlight ? 'text-danger-600 font-semibold' : 'text-text-primary'}`}>{value}</p>
      </div>
    </div>
  );
}
