import { Eye, Pencil, Trash2, Paperclip } from 'lucide-react';
import ManifestStatusBadge from './ManifestStatusBadge';
import WasteCategoryBadge from './WasteCategoryBadge';
import ComplianceBadge from './ComplianceBadge';
import type { Manifest } from '../hooks/useManifests';

interface Props {
  manifests: Manifest[];
  loading: boolean;
  onView: (m: Manifest) => void;
  onEdit: (m: Manifest) => void;
  onDelete: (m: Manifest) => void;
  pagination: { current_page: number; last_page: number; total: number; per_page: number };
  onPageChange: (page: number) => void;
}

export default function ManifestTable({ manifests, loading, onView, onEdit, onDelete, pagination, onPageChange }: Props) {
  if (loading) {
    return (
      <div className="bg-surface rounded-[var(--radius-md)] border border-border overflow-hidden">
        <div className="p-8 text-center text-text-secondary text-[13px]">Loading manifests...</div>
      </div>
    );
  }

  if (!manifests.length) {
    return (
      <div className="bg-surface rounded-[var(--radius-md)] border border-border overflow-hidden">
        <div className="p-12 text-center">
          <p className="text-text-secondary text-[13px]">No waste manifests found</p>
          <p className="text-text-tertiary text-[12px] mt-1">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  const getRowStyle = (m: Manifest): string => {
    if (m.is_delayed) return 'border-l-[3px] border-l-red-500 bg-red-50/30';
    if (m.status === 'In Transit' || m.status === 'Dispatched') return 'border-l-[3px] border-l-amber-400 bg-amber-50/20';
    if (m.status === 'Completed') return 'border-l-[3px] border-l-green-400 opacity-[0.88]';
    return '';
  };

  return (
    <div className="bg-surface rounded-[var(--radius-md)] border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-surface-sunken border-b border-border">
              <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">Code</th>
              <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">Waste Type</th>
              <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">Source</th>
              <th className="text-right px-3 py-2.5 font-semibold text-text-secondary">Qty</th>
              <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">Transporter</th>
              <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">Facility</th>
              <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">Dispatch</th>
              <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">Status</th>
              <th className="text-center px-3 py-2.5 font-semibold text-text-secondary">Compliance</th>
              <th className="text-center px-2 py-2.5 font-semibold text-text-secondary"><Paperclip size={12} /></th>
              <th className="text-right px-3 py-2.5 font-semibold text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {manifests.map(m => (
              <tr
                key={m.id}
                className={`border-b border-border hover:bg-surface-sunken/50 transition-colors cursor-pointer ${getRowStyle(m)}`}
                onClick={() => onView(m)}
              >
                <td className="px-3 py-2.5">
                  <span className="font-mono text-[11px] font-semibold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                    {m.manifest_code}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-text-primary flex items-center gap-1">
                      {m.waste_category === 'Hazardous' && <span className="text-red-500">⚠</span>}
                      {m.waste_type}
                    </span>
                    <WasteCategoryBadge category={m.waste_category} size="xs" />
                  </div>
                </td>
                <td className="px-3 py-2.5 text-text-secondary">
                  {m.source_area || m.source_department || '—'}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-text-primary">
                  {Number(m.quantity).toLocaleString()} <span className="text-text-tertiary text-[10px]">{m.unit}</span>
                </td>
                <td className="px-3 py-2.5 text-text-secondary max-w-[120px] truncate">
                  {m.transporter_name || <span className="text-text-tertiary italic">Not assigned</span>}
                </td>
                <td className="px-3 py-2.5 text-text-secondary max-w-[120px] truncate">
                  {m.facility_name || <span className="text-text-tertiary italic">Not assigned</span>}
                </td>
                <td className="px-3 py-2.5 text-text-secondary">
                  {m.dispatch_date ? new Date(m.dispatch_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <ManifestStatusBadge status={m.status} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <ComplianceBadge status={m.manifest_compliance_status} />
                </td>
                <td className="px-2 py-2.5 text-center text-text-tertiary">
                  {(m.attachments_count ?? 0) > 0 && (
                    <span className="text-[10px] font-medium bg-gray-100 px-1.5 py-0.5 rounded-full">{m.attachments_count}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-center gap-1 table-actions" onClick={e => e.stopPropagation()}>
                    <button className="action-btn action-btn--view" title="View" onClick={() => onView(m)}>
                      <Eye size={15} />
                    </button>
                    <button className="action-btn action-btn--edit" title="Edit" onClick={() => onEdit(m)}>
                      <Pencil size={15} />
                    </button>
                    <button className="action-btn action-btn--delete" title="Delete" onClick={() => onDelete(m)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-[11px] text-text-tertiary">
            Showing {((pagination.current_page - 1) * pagination.per_page) + 1}–{Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(pagination.last_page, 7) }, (_, i) => {
              let page: number;
              if (pagination.last_page <= 7) {
                page = i + 1;
              } else if (pagination.current_page <= 4) {
                page = i + 1;
              } else if (pagination.current_page >= pagination.last_page - 3) {
                page = pagination.last_page - 6 + i;
              } else {
                page = pagination.current_page - 3 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`min-w-[28px] h-7 px-1.5 text-[11px] rounded-[var(--radius-sm)] transition-colors ${
                    page === pagination.current_page
                      ? 'bg-primary-500 text-white font-semibold'
                      : 'text-text-secondary hover:bg-surface-sunken'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
