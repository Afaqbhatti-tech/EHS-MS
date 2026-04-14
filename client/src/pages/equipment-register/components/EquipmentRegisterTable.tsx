import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Pencil,
  Trash2,
  Wrench,
  ImageOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Badge, { StatusBadge } from '../../../components/ui/Badge';
import type { EquipmentItem } from '../hooks/useEquipmentRegister';

// ── Props ────────────────────────────────────────

interface Props {
  items: EquipmentItem[];
  loading: boolean;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (column: string) => void;
  onView: (item: EquipmentItem) => void;
  onEdit: (item: EquipmentItem) => void;
  onDelete: (item: EquipmentItem) => void;
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

// ── Helpers ──────────────────────────────────────

function fmt(val: string | null): string {
  if (!val) return '—';
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmtDate(val: string | null): string {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function conditionVariant(status: string | null): 'success' | 'warning' | 'danger' | 'neutral' {
  if (!status) return 'neutral';
  const s = status.toLowerCase();
  if (s === 'excellent' || s === 'good') return 'success';
  if (s === 'fair') return 'warning';
  if (s === 'poor' || s === 'damaged') return 'danger';
  return 'neutral';
}

function inspectionStatusColor(status: string | null): string {
  if (!status) return 'text-text-secondary';
  const s = status.toLowerCase();
  if (s === 'valid') return 'text-green-600';
  if (s === 'due_soon') return 'text-amber-600';
  if (s === 'overdue') return 'text-red-600';
  return 'text-text-secondary';
}

// ── Sortable columns definition ──────────────────

const COLUMNS: { key: string; label: string; sortable: boolean; className?: string }[] = [
  { key: 'image', label: '', sortable: false, className: 'w-[52px]' },
  { key: 'equipment_name', label: 'Equipment', sortable: true },
  { key: 'equipment_category', label: 'Category / Type', sortable: true },
  { key: 'serial_number', label: 'Serial No.', sortable: true },
  { key: 'area', label: 'Area / Zone', sortable: true },
  { key: 'company_name', label: 'Company / TUV', sortable: true },
  { key: 'equipment_status', label: 'Status', sortable: true },
  { key: 'condition_status', label: 'Condition', sortable: true },
  { key: 'working_status', label: 'Working', sortable: true },
  { key: 'next_inspection_date', label: 'Next Inspection', sortable: true },
  { key: 'actions', label: '', sortable: false, className: 'w-[100px]' },
];

// ── Component ────────────────────────────────────

export default function EquipmentRegisterTable({
  items,
  loading,
  sortBy,
  sortDir,
  onSort,
  onView,
  onEdit,
  onDelete,
  page,
  lastPage,
  total,
  perPage,
  onPageChange,
}: Props) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  // ── Sort icon ──
  function SortIcon({ column }: { column: string }) {
    if (sortBy !== column) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3" />
      : <ArrowDown className="w-3 h-3" />;
  }

  // ── Skeleton rows ──
  if (loading) {
    return (
      <div className="bg-surface rounded-lg border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="bg-surface-sunken">
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 text-left text-[11px] uppercase font-semibold text-text-secondary tracking-wider ${col.className ?? ''}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-surface-sunken/40' : ''}>
                  <td className="px-3 py-3"><div className="w-10 h-10 rounded bg-gray-200 animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-1" /><div className="h-3 w-16 bg-gray-100 rounded animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1" /><div className="h-3 w-14 bg-gray-100 rounded animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-1" /><div className="h-3 w-12 bg-gray-100 rounded animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1" /><div className="h-3 w-14 bg-gray-100 rounded animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-5 w-14 bg-gray-200 rounded-full animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (items.length === 0) {
    return (
      <div className="bg-surface rounded-lg border border-border shadow-xs overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Wrench className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No equipment found</p>
          <p className="text-xs mt-1 opacity-70">Try adjusting your filters or add new equipment</p>
        </div>
      </div>
    );
  }

  // ── Table ──
  return (
    <div className="bg-surface rounded-lg border border-border shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          {/* ── Header ── */}
          <thead>
            <tr className="bg-surface-sunken">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 text-left text-[11px] uppercase font-semibold text-text-secondary tracking-wider select-none ${col.className ?? ''} ${col.sortable ? 'cursor-pointer hover:text-text-primary transition-colors' : ''}`}
                  onClick={col.sortable ? () => onSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon column={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody className="text-[13px] text-text-primary">
            {items.map((item, idx) => (
              <tr
                key={item.id}
                className={`border-t border-border/60 hover:bg-primary/[0.03] transition-colors cursor-pointer ${idx % 2 === 1 ? 'bg-surface-sunken/40' : ''}`}
                onClick={() => onView(item)}
              >
                {/* Image */}
                <td className="px-3 py-2.5">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.equipment_name}
                      className="w-10 h-10 rounded object-cover border border-border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-100 border border-border flex items-center justify-center">
                      <ImageOff className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </td>

                {/* Equipment Code / Name */}
                <td className="px-3 py-2.5">
                  <div className="font-medium leading-tight">{item.equipment_name}</div>
                  <div className="text-[11px] text-text-secondary mt-0.5">{item.equipment_code}</div>
                </td>

                {/* Category / Type */}
                <td className="px-3 py-2.5">
                  <div className="leading-tight">{fmt(item.equipment_category)}</div>
                  {item.equipment_type && (
                    <div className="text-[11px] text-text-secondary mt-0.5">{fmt(item.equipment_type)}</div>
                  )}
                </td>

                {/* Serial Number */}
                <td className="px-3 py-2.5 font-mono text-[12px]">
                  {item.serial_number || '—'}
                </td>

                {/* Area / Zone */}
                <td className="px-3 py-2.5">
                  <div className="leading-tight">{fmt(item.area)}</div>
                  {item.zone && (
                    <div className="text-[11px] text-text-secondary mt-0.5">{fmt(item.zone)}</div>
                  )}
                </td>

                {/* Company / TUV */}
                <td className="px-3 py-2.5">
                  <div className="leading-tight">{item.company_name || '—'}</div>
                  <div className={`text-[11px] mt-0.5 font-medium ${item.tuv_authorized === 'yes' ? 'text-green-600' : 'text-text-tertiary'}`}>
                    TUV: {item.tuv_authorized === 'yes' ? 'Yes' : 'No'}
                  </div>
                </td>

                {/* Status */}
                <td className="px-3 py-2.5">
                  <StatusBadge status={fmt(item.equipment_status)} />
                </td>

                {/* Condition */}
                <td className="px-3 py-2.5">
                  <Badge variant={conditionVariant(item.condition_status)} dot>
                    {fmt(item.condition_status)}
                  </Badge>
                </td>

                {/* Working Status */}
                <td className="px-3 py-2.5">
                  <StatusBadge status={fmt(item.working_status)} />
                </td>

                {/* Next Inspection */}
                <td className={`px-3 py-2.5 text-[12px] font-medium ${inspectionStatusColor(item.inspection_status)}`}>
                  {fmtDate(item.next_inspection_date)}
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1 table-actions">
                    <button onClick={() => onView(item)} className="action-btn action-btn--view" title="View">
                      <Eye size={15} />
                    </button>
                    <button onClick={() => onEdit(item)} className="action-btn action-btn--edit" title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => onDelete(item)} className="action-btn action-btn--delete" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-sunken/40">
        <p className="text-[12px] text-text-secondary">
          Showing <span className="font-medium text-text-primary">{from}</span> to{' '}
          <span className="font-medium text-text-primary">{to}</span> of{' '}
          <span className="font-medium text-text-primary">{total}</span> equipment
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-md border border-border bg-surface text-text-secondary hover:bg-surface-sunken disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <span className="text-[12px] text-text-secondary tabular-nums">
            Page <span className="font-medium text-text-primary">{page}</span> of{' '}
            <span className="font-medium text-text-primary">{lastPage}</span>
          </span>

          <button
            type="button"
            disabled={page >= lastPage}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-md border border-border bg-surface text-text-secondary hover:bg-surface-sunken disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
