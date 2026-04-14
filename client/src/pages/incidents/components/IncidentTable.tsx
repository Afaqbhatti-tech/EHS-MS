import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Eye, Pencil, Trash2 } from 'lucide-react';

interface Incident {
  id: string;
  incident_code: string;
  incident_date: string;
  location: string | null;
  incident_type: string;
  incident_category: string | null;
  affected_person_name: string | null;
  severity: string;
  status: string;
  assigned_to_name: string | null;
}

interface Props {
  hook: {
    incidents: Incident[];
    total: number;
    lastPage: number;
    filters: { page: number; sort_by?: string; sort_dir?: string };
    setFilter: (key: string, value: string | number) => void;
    listQuery: { isLoading: boolean };
    remove: { mutateAsync: (id: string) => Promise<unknown> };
  };
  onRowClick: (id: string) => void;
  onEdit?: (id: string) => void;
}

const severityConfig: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 ring-1 ring-red-200',
  High: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  Medium: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  Low: 'bg-green-100 text-green-700 ring-1 ring-green-200',
};

const statusConfig: Record<string, string> = {
  Reported: 'bg-blue-100 text-blue-700',
  'Under Investigation': 'bg-purple-100 text-purple-700',
  'Action Assigned': 'bg-amber-100 text-amber-700',
  'In Progress': 'bg-orange-100 text-orange-700',
  Closed: 'bg-green-100 text-green-700',
  Reopened: 'bg-rose-100 text-rose-700',
  Escalated: 'bg-red-100 text-red-700',
};

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold leading-tight ${severityConfig[severity] ?? 'bg-gray-100 text-gray-600'}`}>
      {severity === 'Critical' && <AlertTriangle size={11} className="shrink-0" />}
      {severity}
    </span>
  );
}

function IncidentStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-medium leading-tight ${statusConfig[status] ?? 'bg-gray-100 text-gray-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        status === 'Reported' ? 'bg-blue-500' :
        status === 'Under Investigation' ? 'bg-purple-500' :
        status === 'Action Assigned' ? 'bg-amber-500' :
        status === 'In Progress' ? 'bg-orange-500' :
        status === 'Closed' ? 'bg-green-500' :
        status === 'Reopened' ? 'bg-rose-500' :
        status === 'Escalated' ? 'bg-red-500' :
        'bg-gray-500'
      }`} />
      {status}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

type SortKey = 'incident_code' | 'incident_date' | 'location' | 'incident_type' | 'incident_category' | 'severity' | 'status' | 'affected_person_name' | 'assigned_to_name';

const columns: { key: SortKey; label: string; hiddenOn?: string }[] = [
  { key: 'incident_code', label: 'Incident ID' },
  { key: 'incident_date', label: 'Date' },
  { key: 'location', label: 'Location' },
  { key: 'incident_type', label: 'Type', hiddenOn: 'hidden xl:table-cell' },
  { key: 'incident_category', label: 'Category', hiddenOn: 'hidden lg:table-cell' },
  { key: 'affected_person_name', label: 'Affected Person', hiddenOn: 'hidden lg:table-cell' },
  { key: 'severity', label: 'Severity' },
  { key: 'status', label: 'Status' },
  { key: 'assigned_to_name', label: 'Assigned To', hiddenOn: 'hidden xl:table-cell' },
];

const PER_PAGE = 20;

export default function IncidentTable({ hook, onRowClick, onEdit }: Props) {
  const { incidents, total, lastPage, filters, setFilter, listQuery, remove } = hook;
  const currentPage = filters.page || 1;

  const [sortBy, setSortBy] = useState<SortKey | null>((filters.sort_by as SortKey) ?? null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>((filters.sort_dir as 'asc' | 'desc') ?? 'desc');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSort = (key: SortKey) => {
    let newDir: 'asc' | 'desc' = 'asc';
    if (sortBy === key) {
      newDir = sortDir === 'asc' ? 'desc' : 'asc';
    }
    setSortBy(key);
    setSortDir(newDir);
    setFilter('sort_by', key);
    setFilter('sort_dir', newDir);
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortBy !== columnKey) return <ArrowUpDown size={12} className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-primary-600" />
      : <ArrowDown size={12} className="text-primary-600" />;
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await remove.mutateAsync(confirmDelete);
    } catch {
      // error handled by mutation
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  // Loading skeleton
  if (listQuery.isLoading && incidents.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-sunken border-b-2 border-border">
                {columns.map(col => (
                  <th key={col.key} className={`px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary ${col.hiddenOn ?? ''}`}>
                    {col.label}
                  </th>
                ))}
                <th className="px-3.5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-text-tertiary w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-3.5 py-3.5 ${col.hiddenOn ?? ''}`}>
                      <div className="skeleton h-4 w-full rounded" />
                    </td>
                  ))}
                  <td className="px-3.5 py-3.5"><div className="skeleton h-4 w-16 mx-auto rounded" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Empty state
  if (!listQuery.isLoading && incidents.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm py-16 flex flex-col items-center justify-center text-center">
        <AlertTriangle size={48} className="text-text-tertiary mb-4" />
        <p className="text-[15px] font-semibold text-text-primary mb-1">No incidents found</p>
        <p className="text-[13px] text-text-tertiary mb-1">Try adjusting your filters or report a new incident</p>
      </div>
    );
  }

  const startItem = (currentPage - 1) * PER_PAGE + 1;
  const endItem = Math.min(currentPage * PER_PAGE, total);

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm overflow-hidden">
      <div className="overflow-x-auto table-responsive">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-surface-sunken border-b-2 border-border">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`group px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary cursor-pointer select-none hover:text-text-secondary transition-colors ${col.hiddenOn ?? ''}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon columnKey={col.key} />
                  </span>
                </th>
              ))}
              <th className="px-3.5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-text-tertiary w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map(incident => (
              <tr
                key={incident.id}
                onClick={() => onRowClick(incident.id)}
                className="border-b border-border transition-colors hover:bg-canvas cursor-pointer"
              >
                {/* Incident ID */}
                <td className="px-3.5 py-3">
                  <span className="font-mono text-[12px] font-semibold text-primary-700">
                    {incident.incident_code}
                  </span>
                </td>

                {/* Date */}
                <td className="px-3.5 py-3 text-[13px] text-text-primary whitespace-nowrap">
                  {formatDate(incident.incident_date)}
                </td>

                {/* Location */}
                <td className="px-3.5 py-3 text-[13px] text-text-primary max-w-[150px] truncate">
                  {incident.location || '\u2014'}
                </td>

                {/* Type */}
                <td className="px-3.5 py-3 text-[13px] text-text-secondary hidden xl:table-cell">
                  {incident.incident_type}
                </td>

                {/* Category */}
                <td className="px-3.5 py-3 text-[13px] text-text-secondary hidden lg:table-cell truncate max-w-[130px]">
                  {incident.incident_category || '\u2014'}
                </td>

                {/* Affected Person */}
                <td className="px-3.5 py-3 text-[13px] text-text-primary hidden lg:table-cell truncate max-w-[140px]">
                  {incident.affected_person_name || '\u2014'}
                </td>

                {/* Severity */}
                <td className="px-3.5 py-3">
                  <SeverityBadge severity={incident.severity} />
                </td>

                {/* Status */}
                <td className="px-3.5 py-3">
                  <IncidentStatusBadge status={incident.status} />
                </td>

                {/* Assigned To */}
                <td className="px-3.5 py-3 text-[13px] text-text-secondary hidden xl:table-cell truncate max-w-[130px]">
                  {incident.assigned_to_name || '\u2014'}
                </td>

                {/* Actions */}
                <td className="px-3.5 py-3 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1 table-actions">
                    <button onClick={() => onRowClick(incident.id)} className="action-btn action-btn--view" title="View">
                      <Eye size={15} />
                    </button>
                    {onEdit && (
                      <button onClick={() => onEdit(incident.id)} className="action-btn action-btn--edit" title="Edit">
                        <Pencil size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDelete(incident.id)}
                      className="action-btn action-btn--delete"
                      title="Delete"
                    >
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
      {total > PER_PAGE && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-[12px] text-text-tertiary">
            Showing {startItem}&ndash;{endItem} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter('page', currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => {
              let pageNum: number;
              if (lastPage <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= lastPage - 2) {
                pageNum = lastPage - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setFilter('page', pageNum)}
                  className={`w-8 h-8 text-[12px] font-medium rounded-[var(--radius-sm)] transition-colors ${
                    pageNum === currentPage
                      ? 'bg-primary-600 text-white'
                      : 'text-text-secondary hover:bg-surface-sunken'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setFilter('page', currentPage + 1)}
              disabled={currentPage >= lastPage}
              className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => !deleting && setConfirmDelete(null)} />
          <div className="relative bg-surface rounded-xl shadow-xl border border-border p-6 w-full max-w-sm mx-4 animate-fadeInUp">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-danger-50">
                <AlertTriangle size={20} className="text-danger-600" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-text-primary">Delete Incident</h3>
                <p className="text-[13px] text-text-secondary mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-sunken rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-danger-600 hover:bg-danger-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
