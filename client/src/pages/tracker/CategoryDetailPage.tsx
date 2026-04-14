import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Pencil, Trash2, Eye, RefreshCw, ChevronLeft, ChevronRight, X as XIcon, Download, Upload, AlertTriangle, Filter } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { getIcon } from '../../config/iconRegistry';
import { useEquipmentGroups } from './hooks/useEquipmentGroups';
import { GroupItemForm } from './components/GroupItemForm';
import { ImportEquipmentModal } from './components/ImportEquipmentModal';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import TypedDeleteConfirmModal from '../../components/ui/TypedDeleteConfirmModal';
import type { EquipmentGroup, EquipmentGroupField, EquipmentItem, GroupItemsPagination, ExpiryStatus } from './hooks/useEquipmentGroups';

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

export default function CategoryDetailPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('can_manage_equipment_categories');
  const toast = useToast();

  const { fetchGroupItems, createItem, updateItem, deleteItem, getItem, exportItems, importPreview, importConfirm } = useEquipmentGroups();

  const [group, setGroup] = useState<EquipmentGroup | null>(null);
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [pagination, setPagination] = useState<GroupItemsPagination>({ current_page: 1, last_page: 1, per_page: 25, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Form/modal state
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [viewingItem, setViewingItem] = useState<EquipmentItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<EquipmentItem | null>(null);
  const [showImport, setShowImport] = useState(false);

  const cid = Number(categoryId);
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkItemId = searchParams.get('item');
  const deepLinkHandled = useRef(false);

  // Deep-link: auto-open item detail when ?item=ID is present
  useEffect(() => {
    if (!deepLinkItemId || deepLinkHandled.current || loading || !group) return;

    const itemId = Number(deepLinkItemId);
    if (!itemId || isNaN(itemId)) {
      deepLinkHandled.current = true;
      return;
    }

    deepLinkHandled.current = true;

    // Try to find the item in the currently loaded page
    const found = items.find(i => i.id === itemId);
    if (found) {
      handleViewItem(found);
    } else {
      // Item not on current page — fetch it directly via API
      (async () => {
        try {
          const detail = await getItem(cid, itemId);
          if (detail) {
            setViewingItem({
              id: detail.id,
              item_code: detail.item_code,
              equipment_code: detail.equipment_code,
              item_name: detail.item_name || null,
              status: detail.status,
              values: detail.values,
              expiry_status: detail.expiry_status,
              created_at: detail.created_at,
              updated_at: detail.updated_at,
              created_by: null,
            });
          }
        } catch {
          // Item doesn't exist or doesn't belong to this category — fail silently
        }
      })();
    }

    // Clean the query param so it doesn't re-trigger on navigation
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('item');
      return next;
    }, { replace: true });
  }, [deepLinkItemId, loading, items, group]);

  const loadItems = useCallback(async () => {
    if (!cid) return;
    setLoading(true);
    try {
      const result = await fetchGroupItems(cid, {
        search,
        status: statusFilter,
        expiry_status: expiryFilter,
        page,
        per_page: 25,
      });

      let groupData = result.group as unknown as EquipmentGroup;
      if (!groupData.fields || groupData.fields.length === 0) {
        try {
          const detail = await api.get<EquipmentGroup>(`/tracker/equipment-groups/${cid}`);
          if (detail.fields && detail.fields.length > 0) {
            groupData = { ...groupData, fields: detail.fields };
          }
        } catch {}
      }

      setGroup(groupData);
      setItems(result.items);
      setPagination(result.pagination);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [cid, search, statusFilter, expiryFilter, page, fetchGroupItems]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleAddItem = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEditItem = async (item: EquipmentItem) => {
    try {
      const detail = await getItem(cid, item.id);
      setEditingItem({
        id: detail.id,
        item_code: detail.item_code,
        equipment_code: detail.equipment_code,
        item_name: detail.item_name || null,
        status: detail.status,
        values: detail.values,
        expiry_status: detail.expiry_status,
        created_at: detail.created_at,
        updated_at: detail.updated_at,
        created_by: null,
      });
      setShowForm(true);
    } catch {
      setEditingItem(item);
      setShowForm(true);
    }
  };

  const handleFormSubmit = async (data: { values: Record<string, string>; status?: string; item_name?: string }) => {
    let result;
    if (editingItem) {
      result = await updateItem(cid, editingItem.id, data);
    } else {
      result = await createItem(cid, data);
    }
    setShowForm(false);
    setEditingItem(null);
    await loadItems();
    return result;
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteItem(cid, deleteConfirm.id);
      toast.success('Item moved to recycle bin');
      setDeleteConfirm(null);
      await loadItems();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete item');
      setDeleteConfirm(null);
    }
  };

  const handleExport = async () => {
    try {
      await exportItems({ category_id: cid });
      toast.success('Export started');
    } catch (err: any) {
      toast.error(err?.message || 'Export failed');
    }
  };

  const handleViewItem = async (item: EquipmentItem) => {
    try {
      const detail = await getItem(cid, item.id);
      setViewingItem({
        ...item,
        values: detail.values,
        expiry_status: detail.expiry_status,
      });
    } catch {
      setViewingItem(item);
    }
  };

  const fields: EquipmentGroupField[] = (group as any)?.fields || [];
  const Icon = getIcon(group?.icon);
  const displayFields = fields.slice(0, 5);

  const backPath = '/tracker';

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 pb-5 border-b border-border flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(backPath)}
            className="p-2 text-text-tertiary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          {group && (
            <div className="flex items-center gap-3">
              <div
                className="w-[42px] h-[42px] rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                style={{ backgroundColor: group.light_color }}
              >
                <Icon size={22} style={{ color: group.color }} />
              </div>
              <div>
                <h1 className="text-[22px] font-bold text-text-primary leading-tight">Item Register</h1>
                <p className="text-[13px] text-text-secondary mt-0.5">
                  <span className="font-medium">{group.name}</span>
                  <span className="mx-1.5">&middot;</span>
                  {pagination.total} item{pagination.total !== 1 ? 's' : ''}
                  {group.registry_group_id && group.registry_group && (
                    <span className="ml-2 text-text-tertiary">
                      in {(group.registry_group as any)?.name || group.category_type}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
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
          {canManage && (
            <>
              <button
                onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
              >
                <Upload size={14} />
                Import
              </button>
              <button
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs"
              >
                <Plus size={16} />
                Add Item
              </button>
            </>
          )}
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
            showFilters || statusFilter || expiryFilter
              ? 'text-primary-700 bg-primary-50 border-primary-200'
              : 'text-text-secondary bg-surface border-border hover:bg-surface-sunken'
          }`}
        >
          <Filter size={14} />
          Filters
          {(statusFilter || expiryFilter) && (
            <span className="ml-1 w-4 h-4 text-[10px] font-bold bg-primary-600 text-white rounded-full flex items-center justify-center">
              {(statusFilter ? 1 : 0) + (expiryFilter ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-surface-sunken border border-border rounded-[var(--radius-md)]">
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
          {(statusFilter || expiryFilter) && (
            <button
              onClick={() => { setStatusFilter(''); setExpiryFilter(''); setPage(1); }}
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
                  <td colSpan={displayFields.length + 5} className="px-4 py-12 text-center">
                    <p className="text-[14px] text-text-tertiary mb-2">No items found</p>
                    {canManage && (
                      <button
                        onClick={handleAddItem}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors"
                      >
                        <Plus size={14} />
                        Add first item
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="border-b border-border hover:bg-surface-sunken/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-mono font-medium text-primary-600">{item.equipment_code || item.item_code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-medium text-text-primary">{item.item_name || '—'}</span>
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
                        <button onClick={() => handleViewItem(item)} className="action-btn action-btn--view" title="View">
                          <Eye size={15} />
                        </button>
                        {canManage && (
                          <>
                            <button onClick={() => handleEditItem(item)} className="action-btn action-btn--edit" title="Edit">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => setDeleteConfirm(item)} className="action-btn action-btn--delete" title="Delete">
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
      {viewingItem && group && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]">
          <div className="fixed inset-0" onClick={() => setViewingItem(null)} />
          <div className="relative bg-surface w-full max-w-[500px] h-full overflow-hidden flex flex-col shadow-xl animate-slideInRight border-l border-border">
            <div className="shrink-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-bold text-text-primary">{viewingItem.equipment_code || viewingItem.item_code}</h3>
                  <ExpiryBadge expiry={viewingItem.expiry_status} />
                </div>
                <p className="text-[12px] text-text-tertiary mt-0.5">{group.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {canManage && (
                  <button
                    onClick={() => { setViewingItem(null); handleEditItem(viewingItem); }}
                    className="p-1.5 text-text-tertiary hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                )}
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

              {fields.map(field => {
                const value = viewingItem.values[field.field_key];
                if (!value) return null;
                const isFileField = field.field_type === 'file';
                const isImage = isFileField && /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(value);
                const storageBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '') + '/storage/';

                // Expiry highlighting for date fields
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

      {/* Item Form Modal */}
      {showForm && group && (
        <GroupItemForm
          groupId={cid}
          groupName={group.name}
          groupColor={group.color}
          fields={fields}
          editingItem={editingItem}
          onSubmit={handleFormSubmit}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
        />
      )}

      {/* Import Modal */}
      {showImport && group && (
        <ImportEquipmentModal
          categoryId={cid}
          categoryName={group.name}
          onImportPreview={importPreview}
          onImportConfirm={importConfirm}
          onClose={() => setShowImport(false)}
          onSuccess={loadItems}
        />
      )}

      {/* Delete Confirmation */}
      <TypedDeleteConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteItem}
        itemType="Equipment Item"
        itemName={deleteConfirm?.equipment_code || deleteConfirm?.item_code}
        message="This item will be moved to the recycle bin and can be restored later."
      />
    </div>
  );
}
