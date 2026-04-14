import { Eye, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import ContractorStatusBadge from './ContractorStatusBadge';
import ComplianceBadge from './ComplianceBadge';
import type { Contractor } from '../hooks/useContractors';

interface Props {
  contractors: Contractor[];
  onView: (c: Contractor) => void;
  onEdit: (c: Contractor) => void;
  onDelete: (c: Contractor) => void;
  loading: boolean;
}

export default function ContractorTable({ contractors, onView, onEdit, onDelete, loading }: Props) {
  if (loading) {
    return (
      <div className="ctr-table-wrapper bg-surface rounded-[var(--radius-md)] border border-border overflow-hidden">
        <div className="p-8 text-center text-text-secondary text-[13px]">Loading contractors...</div>
      </div>
    );
  }

  if (!contractors.length) {
    return (
      <div className="ctr-table-wrapper bg-surface rounded-[var(--radius-md)] border border-border overflow-hidden">
        <div className="p-12 text-center">
          <p className="text-text-secondary text-[13px]">No contractors found</p>
          <p className="text-text-tertiary text-[12px] mt-1">Try adjusting your filters or add a new contractor</p>
        </div>
      </div>
    );
  }

  const getRowClass = (c: Contractor): string => {
    if (c.contractor_status === 'Blacklisted')
      return 'ctr-row--blacklisted border-l-[3px] border-l-gray-800 bg-gray-50/40';
    if (c.contractor_status === 'Suspended' || c.is_suspended)
      return 'ctr-row--suspended border-l-[3px] border-l-amber-400 bg-amber-50/20';
    if (c.has_expired_documents)
      return 'ctr-row--expired-docs border-l-[3px] border-l-red-400 bg-red-50/20';
    if (c.contractor_status === 'Active' && c.is_active)
      return 'ctr-row--active border-l-[3px] border-l-green-400';
    return '';
  };

  const formatDate = (d: string | null) => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  return (
    <div className="ctr-table-wrapper bg-surface rounded-[var(--radius-md)] border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="ctr-table w-full text-[12px]">
          <thead>
            <tr className="bg-surface-sunken border-b border-border">
              <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">Code</th>
              <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">Contractor</th>
              <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">Scope</th>
              <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">Site / Area</th>
              <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">Contact</th>
              <th className="text-right px-3 py-2.5 font-semibold text-text-secondary">Workforce</th>
              <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">Status</th>
              <th className="text-center px-3 py-2.5 font-semibold text-text-secondary">Compliance</th>
              <th className="text-center px-3 py-2.5 font-semibold text-text-secondary">Docs</th>
              <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">Contract End</th>
              <th className="text-right px-3 py-2.5 font-semibold text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contractors.map(c => (
              <tr
                key={c.id}
                className={`border-b border-border hover:bg-surface-sunken/50 transition-colors cursor-pointer ${getRowClass(c)}`}
                onClick={() => onView(c)}
              >
                {/* Code */}
                <td className="px-3 py-2.5">
                  <span className="font-mono text-[11px] font-semibold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                    {c.contractor_code}
                  </span>
                </td>

                {/* Contractor name + type */}
                <td className="px-3 py-2.5 max-w-[180px]">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-text-primary truncate">{c.contractor_name}</span>
                    <span className="text-[10px] text-text-tertiary truncate">{c.company_type}</span>
                  </div>
                </td>

                {/* Scope */}
                <td className="px-3 py-2.5 text-text-secondary max-w-[120px] truncate">
                  {c.scope_of_work || '\u2014'}
                </td>

                {/* Site / Area */}
                <td className="px-3 py-2.5 text-text-secondary max-w-[120px]">
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate">{c.site || '\u2014'}</span>
                    {c.area && <span className="text-[10px] text-text-tertiary truncate">{c.area}</span>}
                  </div>
                </td>

                {/* Contact */}
                <td className="px-3 py-2.5 max-w-[140px]">
                  {c.primary_contact_name ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-text-primary truncate">{c.primary_contact_name}</span>
                      {c.primary_contact_phone && (
                        <span className="text-[10px] text-text-tertiary truncate">{c.primary_contact_phone}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-text-tertiary italic">No contact</span>
                  )}
                </td>

                {/* Workforce */}
                <td className="px-3 py-2.5 text-right">
                  <span className="font-mono text-text-primary font-medium">
                    {c.total_workforce != null ? c.total_workforce.toLocaleString() : '\u2014'}
                  </span>
                </td>

                {/* Status */}
                <td className="px-3 py-2.5">
                  <ContractorStatusBadge status={c.contractor_status} />
                </td>

                {/* Compliance */}
                <td className="px-3 py-2.5 text-center">
                  <ComplianceBadge status={c.compliance_status} />
                </td>

                {/* Docs */}
                <td className="px-3 py-2.5 text-center">
                  <div className="inline-flex items-center gap-1">
                    <span className="text-[10px] font-medium bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {c.document_count ?? 0}
                    </span>
                    {c.has_expired_documents && (
                      <AlertTriangle size={12} className="text-red-500" />
                    )}
                    {!c.has_expired_documents && c.has_expiring_documents && (
                      <AlertTriangle size={12} className="text-amber-500" />
                    )}
                  </div>
                </td>

                {/* Contract End */}
                <td className="px-3 py-2.5 text-text-secondary">
                  <span className={c.is_contract_expired ? 'text-red-600 font-medium' : ''}>
                    {formatDate(c.contract_end_date)}
                  </span>
                  {c.days_to_contract_end != null && c.days_to_contract_end > 0 && c.days_to_contract_end <= 30 && (
                    <span className="block text-[9px] text-amber-600 font-medium">
                      {c.days_to_contract_end}d left
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-center gap-1 table-actions" onClick={e => e.stopPropagation()}>
                    <button className="action-btn action-btn--view" title="View" onClick={() => onView(c)}>
                      <Eye size={15} />
                    </button>
                    <button className="action-btn action-btn--edit" title="Edit" onClick={() => onEdit(c)}>
                      <Pencil size={15} />
                    </button>
                    <button className="action-btn action-btn--delete" title="Delete" onClick={() => onDelete(c)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
