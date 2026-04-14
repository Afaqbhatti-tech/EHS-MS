import { X as XIcon, Download, ExternalLink, FileText, Image as ImageIcon, Paperclip, Camera, Pencil, Trash2, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { InspectionResultBadge, CategoryBadge, ConditionBadge } from '../../components/TrackerBadges';
import { format } from 'date-fns';
import type { TrackerInspection } from '../../hooks/useTracker';
import type { ChecklistResponse } from '../../../../config/inspectionConfig';
import { getChecklistStats } from '../../../../config/inspectionConfig';

interface Props {
  inspection: TrackerInspection;
  onClose: () => void;
  onEdit: (inspection: TrackerInspection) => void;
  onDelete: (inspection: TrackerInspection) => void;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
}

function DetailField({ label, value }: { label: string; value: string | null | undefined | number | boolean }) {
  if (value === null || value === undefined || value === '') return null;
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  return (
    <div>
      <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{label}</p>
      <p className="text-[13px] text-text-primary mt-0.5">{display}</p>
    </div>
  );
}

export function InspectionDetailDrawer({ inspection: insp, onClose, onEdit, onDelete }: Props) {
  const hasAnyAttachment = !!(insp.checklist_file_url || insp.checklist_image_url ||
    (insp.additional_image_urls?.length) || (insp.supporting_doc_urls?.length));

  const attachmentCount = (insp.checklist_file_url ? 1 : 0) + (insp.checklist_image_url ? 1 : 0) +
    (insp.additional_image_urls?.length || 0) + (insp.supporting_doc_urls?.length || 0);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel right-0 w-[580px] max-w-full animate-slideInRight">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-border" style={{ borderTop: `4px solid ${insp.record?.category?.color || 'var(--color-primary-500)'}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-mono font-semibold text-text-tertiary">{insp.log_code}</span>
            <button onClick={onClose} className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
              <XIcon size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <InspectionResultBadge result={insp.result} />
            {insp.record?.category && (
              <CategoryBadge
                label={insp.record.category.label}
                color={insp.record.category.color}
                lightColor={insp.record.category.light_color}
                textColor={insp.record.category.text_color}
              />
            )}
          </div>
          <h2 className="text-[16px] font-bold text-text-primary">{insp.record?.equipment_name || '—'}</h2>
          <p className="text-[12px] text-text-tertiary mt-0.5">{insp.inspection_type} — {formatDate(insp.inspection_date)}</p>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
          {/* Equipment Section */}
          {insp.record && (
            <div className="mx-6 mt-4 p-3 bg-surface-sunken rounded-[var(--radius-md)] border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ backgroundColor: insp.record.category?.color || '#666' }}>
                    {insp.record.equipment_name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">{insp.record.equipment_name}</p>
                    <p className="text-[11px] text-text-tertiary">{insp.record.record_code}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-text-secondary">
                {insp.record.item_subtype && <span>Type: {insp.record.item_subtype}</span>}
                {insp.record.plate_number && <span>Plate: {insp.record.plate_number}</span>}
                {insp.record.serial_number && <span>Serial: {insp.record.serial_number}</span>}
                {insp.record.sticker_number && <span>Sticker: {insp.record.sticker_number}</span>}
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Inspection Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailField label="Inspection Date" value={formatDate(insp.inspection_date)} />
              <DetailField label="Inspection Type" value={insp.inspection_type} />
              <DetailField label="Purpose" value={insp.inspection_purpose} />
              <DetailField label="Frequency" value={insp.inspection_frequency} />
              <DetailField label="Inspector" value={insp.inspector_name} />
              <DetailField label="Company" value={insp.inspector_company} />
              <DetailField label="Condition Found" value={insp.condition_found} />
              <DetailField label="Result" value={insp.result} />
              <DetailField label="Sticker Number" value={insp.sticker_number} />
              <DetailField label="Plate at Inspection" value={insp.plate_number_at_insp} />
              <DetailField label="Next Due Date" value={formatDate(insp.next_inspection_date)} />
              <DetailField label="Verified By" value={insp.verified_by} />
              <DetailField label="Was Overdue" value={insp.overdue_at_time ? `Yes (${insp.days_overdue_at_time}d)` : 'No'} />
              <DetailField label="Certificate No." value={insp.certificate_number} />
            </div>
          </div>

          {/* Category-Specific Details */}
          {(insp.extinguisher_weight_kg || insp.civil_defense_tag_ok !== null || insp.harness_condition || insp.ladder_type) && (
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Category Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailField label="Extinguisher Weight (KG)" value={insp.extinguisher_weight_kg} />
                <DetailField label="Civil Defense Tag" value={insp.civil_defense_tag_ok} />
                <DetailField label="Harness Condition" value={insp.harness_condition} />
                <DetailField label="Drop Arrest Occurred" value={insp.drop_arrest_occurred} />
                <DetailField label="Ladder Type" value={insp.ladder_type} />
              </div>
            </div>
          )}

          {/* Checklist Results */}
          {insp.checklist_data && Array.isArray(insp.checklist_data) && (insp.checklist_data as ChecklistResponse[]).length > 0 && (() => {
            const responses = insp.checklist_data as ChecklistResponse[];
            const stats = getChecklistStats(responses);
            const failedItems = responses.filter(r => r.answer === 'fail');
            return (
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Checklist Results</h3>
                {/* Summary */}
                <div className="flex items-center gap-3 p-2 bg-surface-sunken rounded-[var(--radius-sm)] mb-3 text-[11px] font-semibold">
                  <span className="flex items-center gap-1 text-success-600"><CheckCircle2 size={12} /> {stats.pass} Pass</span>
                  <span className="flex items-center gap-1 text-danger-600"><XCircle size={12} /> {stats.fail} Fail</span>
                  <span className="flex items-center gap-1 text-neutral-500"><MinusCircle size={12} /> {stats.na} N/A</span>
                  <span className="ml-auto text-text-tertiary">{stats.pct}% completed</span>
                </div>
                {/* Failed items */}
                {failedItems.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-danger-600">Failed Items:</p>
                    {failedItems.map(item => (
                      <div key={item.id} className="p-2 bg-danger-50 border border-danger-100 rounded-[var(--radius-sm)]">
                        <p className="text-[12px] text-danger-800 font-medium">{item.item}</p>
                        {item.note && <p className="text-[11px] text-danger-600 mt-0.5">{item.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Findings */}
          {insp.findings && (
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Findings</h3>
              <p className="text-[13px] text-text-secondary bg-surface-sunken rounded-[var(--radius-md)] px-3 py-2">{insp.findings}</p>
            </div>
          )}

          {/* Corrective Actions */}
          {insp.corrective_actions && (
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Corrective Actions</h3>
              <p className="text-[13px] text-text-secondary bg-surface-sunken rounded-[var(--radius-md)] px-3 py-2">{insp.corrective_actions}</p>
            </div>
          )}

          {/* Visual Condition Notes */}
          {insp.visual_condition_notes && (
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Visual Condition Notes</h3>
              <p className="text-[13px] text-text-secondary bg-surface-sunken rounded-[var(--radius-md)] px-3 py-2">{insp.visual_condition_notes}</p>
            </div>
          )}

          {/* Attachments Section */}
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip size={14} className="text-text-tertiary" />
              <h3 className="text-[13px] font-semibold text-text-primary">Inspection Attachments</h3>
              {attachmentCount > 0 && (
                <span className="text-[11px] text-text-tertiary">{attachmentCount} file{attachmentCount !== 1 ? 's' : ''} attached</span>
              )}
            </div>

            {!hasAnyAttachment ? (
              <div className="p-6 border-2 border-dashed border-border rounded-[var(--radius-md)] text-center">
                <Camera size={28} className="mx-auto text-text-tertiary mb-2" />
                <p className="text-[12px] text-text-tertiary">No attachments</p>
                <p className="text-[10px] text-text-tertiary mt-0.5">No files were uploaded with this inspection</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Checklist Document */}
                {insp.checklist_file_url && (
                  <div className="p-3 bg-surface-sunken rounded-[var(--radius-md)] border border-border">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-primary-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-text-primary">Checklist Document</p>
                      </div>
                      <a href={insp.checklist_file_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-primary-600 bg-primary-50 rounded-[var(--radius-sm)] hover:bg-primary-100 transition-colors">
                        <Download size={11} /> Download
                      </a>
                    </div>
                  </div>
                )}

                {/* Checklist Photo */}
                {insp.checklist_image_url && (
                  <div>
                    <p className="text-[11px] font-semibold text-text-tertiary mb-1.5">Checklist Photo</p>
                    <a href={insp.checklist_image_url} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={insp.checklist_image_url}
                        alt="Checklist"
                        className="max-h-[300px] w-full object-contain bg-surface-sunken rounded-[var(--radius-md)] border border-border cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    </a>
                    <a href={insp.checklist_image_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-[11px] text-primary-600 hover:text-primary-700">
                      <ExternalLink size={10} /> View Full Size
                    </a>
                  </div>
                )}

                {/* Additional Images */}
                {insp.additional_image_urls && insp.additional_image_urls.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-text-tertiary mb-1.5">
                      Additional Photos ({insp.additional_image_urls.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {insp.additional_image_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt={`Photo ${i + 1}`}
                            className="w-[100px] h-[75px] object-cover rounded-[var(--radius-sm)] border border-border cursor-pointer hover:brightness-90 hover:scale-[1.02] transition-all"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supporting Documents */}
                {insp.supporting_doc_urls && insp.supporting_doc_urls.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-text-tertiary mb-1.5">
                      Supporting Documents ({insp.supporting_doc_urls.length})
                    </p>
                    <div className="space-y-1.5">
                      {insp.supporting_doc_urls.map((url, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-surface-sunken rounded-[var(--radius-sm)] border border-border">
                          <FileText size={14} className="text-text-tertiary shrink-0" />
                          <span className="flex-1 text-[12px] text-text-primary truncate">Document {i + 1}</span>
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] font-medium text-primary-600 hover:text-primary-700">
                            <Download size={12} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {insp.notes && (
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Notes</h3>
              <p className="text-[13px] text-text-secondary bg-surface-sunken rounded-[var(--radius-md)] px-3 py-2">{insp.notes}</p>
            </div>
          )}

          {/* Defect Alert */}
          {insp.defect_found && (
            <div className="mx-6 my-3 p-3 bg-danger-50 border-l-3 border-l-danger-500 border border-danger-100 rounded-[var(--radius-md)]">
              <p className="text-[12px] font-bold text-danger-700 mb-1">Defect Found</p>
              <p className="text-[12px] text-danger-600">{insp.defect_detail}</p>
            </div>
          )}

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { onClose(); onEdit(insp); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] hover:bg-amber-100 transition-colors"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={() => onDelete(insp)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-danger-700 bg-danger-50 border border-danger-200 rounded-[var(--radius-md)] hover:bg-danger-100 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
            <button onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
