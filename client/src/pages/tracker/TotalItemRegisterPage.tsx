import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Eye, RefreshCw, ChevronLeft, ChevronRight, Filter, AlertTriangle, Download, X as XIcon, Package } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { getIcon } from '../../config/iconRegistry';
import { useEquipmentGroups } from './hooks/useEquipmentGroups';
import type { ExpiryStatus, EquipmentGroupField } from './hooks/useEquipmentGroups';

interface AllItemsItem {
  id: number;
  item_code: string;
  equipment_code: string | null;
  item_name: string | null;
  status: string;
  values: Record<string, string>;
  expiry_status: ExpiryStatus;
  category_id: number;
  category_name: string;
  category_color: string;
  category_icon: string;
  registry_group_name: string;
  created_at: string;
  updated_at: string;
}

interface FieldDef {
  field_key: string;
  field_label: string;
  field_type: string;
}

interface CategoryOption {
  id: number;
  name: string;
}

interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function ExpiryBadge({ expiry }: { expiry: ExpiryStatus }) {
  if (!expiry || expiry.status === 'valid') return null;

  if (expiry.status === 'expired') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] text-[10px] font-bold rounded-full bg-red-50 text-red-700 border border-red-200">
        <AlertTriangle size={9} /> Expired
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] text-[10px] font-bold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
      <AlertTriangle size={9} /> {expiry.label}
    </span>
  );
}

export default function TotalItemRegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { exportItems } = useEquipmentGroups();

  const [items, setItems] = useState<AllItemsItem[]>([]);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ current_page: 1, last_page: 1, per_page: 25, total: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // View item detail
  const [viewingItem, setViewingItem] = useState<AllItemsItem | null>(null);

  const activeFilterCount = (statusFilter ? 1 : 0) + (categoryFilter ? 1 : 0) + (expiryFilter ? 1 : 0);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 25 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category_id = categoryFilter;
      if (expiryFilter) params.expiry_status = expiryFilter;

      const qs = Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');

      const res = await api.get<{
        items: AllItemsItem[];
        fields: FieldDef[];
        categories: CategoryOption[];
        pagination: Pagination;
      }>(`/tracker/equipment-groups/all-items?${qs}`);

      setItems(res.items);
      setFields(res.fields);
      setCategories(res.categories);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, expiryFilter, page]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleExport = async () => {
    try {
      await exportItems();
      toast.success('Export started');
    } catch (err: any) {
      toast.error(err?.message || 'Export failed');
    }
  };

  // Show the first 5 fields in the table columns, rest visible in detail drawer
  const displayFields = fields.slice(0, 5);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 pb-5 border-b border-border flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tracker')}
            className="p-2 text-text-tertiary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-[var(--radius-md)] flex items-center justify-center shrink-0 bg-primary-50">
              <Package size={22} className="text-primary-600" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-text-primary leading-tight">Total Item Register</h1>
              <p className="text-[13px] text-text-secondary mt-0.5">
                All registered equipment items across every category
                <span className="mx-1.5">&middot;</span>
                <span className="font-medium">{pagination.total} item{pagination.total !== 1 ? 's' : ''}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadItems}
            disabled={loading}
            className="p-2 text-text-tertiary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            className="w-full pl-8 pr-3 py-2 text-[13px] bg-surface border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
            placeholder="Search by name, code, or field value..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-[var(--radius-md)] border transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'text-primary-700 bg-primary-50 border-primary-200'
              : 'text-text-secondary bg-surface border-border hover:bg-surface-sunken'
          }`}
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 w-4 h-4 text-[10px] font-bold bg-primary-600 text-white rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-surface-sunken border border-border rounded-[var(--radius-md)] flex-wrap">
          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary mb-1">Category</label>
            <select
              className="px-2 py-1.5 text-[12px] bg-surface border border-border rounded-[var(--radius-md)]"
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary mb-1">Status</label>
            <select
              className="px-2 py-1.5 text-[12px] bg-surface border border-border rounded-[var(--radius-md)]"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Out of Service">Out of Service</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Quarantined">Quarantined</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary mb-1">Expiry</label>
            <select
              className="px-2 py-1.5 text-[12px] bg-surface border border-border rounded-[var(--radius-md)]"
              value={expiryFilter}
              onChange={e => { setExpiryFilter(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              <option value="expired">Expired</option>
              <option value="expiring_soon">Expiring Soon</option>
            </select>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setStatusFilter(''); setCategoryFilter(''); setExpiryFilter(''); setPage(1); }}
              className="mt-4 text-[12px] text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>
      )}

      {/* Items table */}
      <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-sunken border-b border-border">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Equipment Code</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Item Name</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Status</th>
                {displayFields.map(f => (
                  <th key={f.field_key} className="text-left px-4 py-3 text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                    {f.field_label}
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Compliance</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3"><div className="skeleton h-4 w-24" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-32" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-24" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>
                    {displayFields.map(f => (
                      <td key={f.field_key} className="px-4 py-3"><div className="skeleton h-4 w-20" /></td>
                    ))}
                    <td className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={displayFields.length + 6} className="px-4 py-12 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-surface-sunken rounded-full flex items-center justify-center">
                      <Package size={20} className="text-text-tertiary" />
                    </div>
                    <p className="text-[14px] text-text-tertiary mb-1">No equipment items found</p>
                    <p className="text-[12px] text-text-tertiary">
                      {activeFilterCount > 0 || search
                        ? 'Try adjusting your search or filters.'
                        : 'Equipment items will appear here once added to any category.'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map(item => {
                  const CatIcon = getIcon(item.category_icon);
                  return (
                    <tr key={item.id} className="border-b border-border hover:bg-surface-sunken/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-mono font-medium text-primary-600">{item.equipment_code || item.item_code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-medium text-text-primary">{item.item_name || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                            style={{ backgroundColor: item.category_color + '20' }}
                          >
                            <CatIcon size={12} style={{ color: item.category_color }} />
                          </div>
                          <span className="text-[12px] font-medium text-text-secondary truncate max-w-[140px]">{item.category_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                          item.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' :
                          item.status === 'Out of Service' ? 'bg-red-50 text-red-700 border border-red-200' :
                          item.status === 'Under Maintenance' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                          'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      {displayFields.map(f => (
                        <td key={f.field_key} className="px-4 py-3">
                          <span className="text-[13px] text-text-secondary truncate block max-w-[200px]">
                            {item.values[f.field_key] || '—'}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <ExpiryBadge expiry={item.expiry_status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 table-actions">
                          <button onClick={() => setViewingItem(item)} className="action-btn action-btn--view" title="View Details">
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-sunken">
            <span className="text-[12px] text-text-tertiary">
              Showing {((pagination.current_page - 1) * pagination.per_page) + 1}–{Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.current_page <= 1}
                className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface rounded transition-colors disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[12px] text-text-secondary px-2">
                Page {pagination.current_page} of {pagination.last_page}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                disabled={pagination.current_page >= pagination.last_page}
                className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface rounded transition-colors disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Item Detail Drawer */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]">
          <div className="fixed inset-0" onClick={() => setViewingItem(null)} />
          <div className="relative bg-surface w-full max-w-[500px] h-full overflow-hidden flex flex-col shadow-xl animate-slideInRight border-l border-border">
            <div className="shrink-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-bold text-text-primary">{viewingItem.equipment_code || viewingItem.item_code}</h3>
                  <ExpiryBadge expiry={viewingItem.expiry_status} />
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center"
                    style={{ backgroundColor: viewingItem.category_color + '20' }}
                  >
                    {(() => { const I = getIcon(viewingItem.category_icon); return <I size={10} style={{ color: viewingItem.category_color }} />; })()}
                  </div>
                  <span className="text-[12px] text-text-tertiary">{viewingItem.category_name}</span>
                  {viewingItem.registry_group_name && (
                    <span className="text-[11px] text-text-tertiary ml-1">in {viewingItem.registry_group_name}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/tracker/categories/${viewingItem.category_id}?item=${viewingItem.id}`)}
                  className="text-[11px] font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50 transition-colors"
                  title="Open in category"
                >
                  Open in category
                </button>
                <button
                  onClick={() => setViewingItem(null)}
                  className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-sunken rounded transition-colors"
                >
                  <XIcon size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-4">
              {viewingItem.item_name && (
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-[12px] font-semibold text-text-tertiary">Item Name</span>
                  <span className="text-[13px] font-medium text-text-primary">{viewingItem.item_name}</span>
                </div>
              )}

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-[12px] font-semibold text-text-tertiary">Status</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${
                  viewingItem.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' :
                  viewingItem.status === 'Out of Service' ? 'bg-red-50 text-red-700 border border-red-200' :
                  'bg-gray-50 text-gray-700 border border-gray-200'
                }`}>
                  {viewingItem.status}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-[12px] font-semibold text-text-tertiary">Category</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: viewingItem.category_color + '20' }}
                  >
                    {(() => { const I = getIcon(viewingItem.category_icon); return <I size={12} style={{ color: viewingItem.category_color }} />; })()}
                  </div>
                  <span className="text-[13px] font-medium text-text-primary">{viewingItem.category_name}</span>
                </div>
              </div>

              {viewingItem.registry_group_name && (
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-[12px] font-semibold text-text-tertiary">Group</span>
                  <span className="text-[13px] text-text-primary">{viewingItem.registry_group_name}</span>
                </div>
              )}

              {/* All field values */}
              {fields.map(field => {
                const value = viewingItem.values[field.field_key];
                if (!value) return null;
                const isFileField = field.field_type === 'file';
                const isImage = isFileField && /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(value);
                const storageBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '') + '/storage/';

                const isExpiryField = ['tuv_expiry_date', 'next_inspection_date', 'certificate_expiry'].includes(field.field_key);
                let dateClass = '';
                if (isExpiryField && value) {
                  try {
                    const d = new Date(value);
                    if (d < new Date()) dateClass = 'text-red-600 font-bold';
                    else if (d < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) dateClass = 'text-yellow-600 font-semibold';
                  } catch {}
                }

                return (
                  <div key={field.field_key} className={`py-2 border-b border-border/50 ${isImage ? '' : 'flex items-start justify-between'}`}>
                    <span className="text-[12px] font-semibold text-text-tertiary shrink-0 mr-4">{field.field_label}</span>
                    {isImage ? (
                      <img
                        src={`${storageBase}${value}`}
                        alt={field.field_label}
                        className="mt-2 w-full max-h-[240px] object-contain rounded-[var(--radius-md)] border border-border bg-surface-sunken cursor-pointer"
                        onClick={() => window.open(`${storageBase}${value}`, '_blank')}
                      />
                    ) : (
                      <span className={`text-[13px] text-right ${dateClass || 'text-text-primary'}`}>{value}</span>
                    )}
                  </div>
                );
              })}

              <div className="pt-2 space-y-2 text-[11px] text-text-tertiary">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span>{new Date(viewingItem.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Updated</span>
                  <span>{new Date(viewingItem.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
