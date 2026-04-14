import { useState, useCallback } from 'react';
import {
  Plus, Wrench, Activity, AlertTriangle, Clock, Archive,
  CheckCircle2, XCircle, Cog,
} from 'lucide-react';
import { useEquipmentRegister, type EquipmentItem } from './hooks/useEquipmentRegister';
import EquipmentRegisterTable from './components/EquipmentRegisterTable';
import EquipmentRegisterFilters from './components/EquipmentRegisterFilters';
import EquipmentRegisterForm from './components/EquipmentRegisterForm';
import EquipmentRegisterDetail from './components/EquipmentRegisterDetail';
import ExportDropdown from '../../components/ui/ExportDropdown';
import TypedDeleteConfirmModal from '../../components/ui/TypedDeleteConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';

export default function EquipmentRegisterPage() {
  const { user } = useAuth();
  const role = user?.role || '';
  const toast = useToast();
  const canManage = ['master', 'system_admin', 'ehs_manager', 'safety_officer', 'site_engineer'].includes(role);

  const {
    items, stats, filterOptions, loading,
    page, lastPage, total, perPage, setPage,
    sortBy, sortDir, handleSort,
    filters, updateFilter, resetFilters,
    fetchItem, createItem, updateItem, deleteItem, exportData,
  } = useEquipmentRegister();

  // ── Modal/Drawer state ──
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [viewingItem, setViewingItem] = useState<EquipmentItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<EquipmentItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Handlers ──

  const handleAdd = useCallback(() => {
    setEditingItem(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback(async (item: EquipmentItem) => {
    const full = await fetchItem(item.id);
    if (full) {
      setEditingItem(full);
      setShowForm(true);
      setViewingItem(null);
    }
  }, [fetchItem]);

  const handleView = useCallback(async (item: EquipmentItem) => {
    const full = await fetchItem(item.id);
    if (full) setViewingItem(full);
  }, [fetchItem]);

  const handleDelete = useCallback((item: EquipmentItem) => {
    setDeletingItem(item);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingItem) return;
    setDeleteLoading(true);
    try {
      await deleteItem(deletingItem.id);
      setDeletingItem(null);
      setViewingItem(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete equipment');
    } finally {
      setDeleteLoading(false);
    }
  }, [deletingItem, deleteItem, toast]);

  const handleFormSubmit = useCallback(async (formData: FormData) => {
    try {
      if (editingItem) {
        await updateItem(editingItem.id, formData);
        toast.success('Equipment updated successfully');
      } else {
        await createItem(formData);
        toast.success('Equipment created successfully');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save equipment';
      toast.error(message);
      throw err;
    }
  }, [editingItem, createItem, updateItem, toast]);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingItem(null);
  }, []);

  const handleExport = useCallback((format: string) => {
    if (format === 'copy' || format === 'print') {
      toast.info(`${format === 'copy' ? 'Copy' : 'Print'} is not supported for equipment register`);
      return;
    }
    exportData(format);
  }, [exportData, toast]);

  // ── KPI Cards ──
  const kpis = [
    { label: 'Total Equipment', value: stats?.total ?? 0, icon: Wrench, cssColor: '#4F46E5' },
    { label: 'Active', value: stats?.active ?? 0, icon: CheckCircle2, cssColor: '#16A34A' },
    { label: 'Currently Working', value: stats?.currently_working ?? 0, icon: Activity, cssColor: '#2563EB' },
    { label: 'Under Maintenance', value: stats?.under_maintenance ?? 0, icon: Cog, cssColor: '#D97706' },
    { label: 'Overdue Inspection', value: stats?.overdue ?? 0, icon: AlertTriangle, cssColor: '#DC2626' },
    { label: 'Due Soon', value: stats?.due_soon ?? 0, icon: Clock, cssColor: '#EA580C' },
    { label: 'Retired / Old', value: (stats?.retired ?? 0) + (stats?.old_equipment ?? 0), icon: Archive, cssColor: '#6B7280' },
    { label: 'Out of Service', value: stats?.out_of_service ?? 0, icon: XCircle, cssColor: '#DC2626' },
  ];

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Wrench size={22} className="text-indigo-600" />
            Equipment Register
          </h1>
          <p className="text-[13px] text-text-secondary mt-0.5">
            Manage and track all equipment records, inspections, and lifecycle status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportDropdown onExport={handleExport} disabled={total === 0} />
          {canManage && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-semibold text-white
                bg-indigo-600 rounded-[var(--radius-md)] hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus size={15} />
              Add Equipment
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="std-kpi-grid">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="std-kpi-card"
              style={{ animationDelay: `${i * 60}ms`, borderLeft: `3px solid ${kpi.cssColor}` }}
            >
              <div className="std-kpi-card__label">
                <Icon size={14} style={{ color: kpi.cssColor }} />
                {kpi.label}
              </div>
              <div className="std-kpi-card__value" style={{ color: kpi.cssColor }}>
                {kpi.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="bg-surface border border-border rounded-[var(--radius-lg)] px-4 py-3.5 shadow-xs">
        <EquipmentRegisterFilters
          filters={filters}
          filterOptions={filterOptions}
          onFilterChange={updateFilter}
          onReset={resetFilters}
          total={total}
        />
      </div>

      {/* ── Table ── */}
      <EquipmentRegisterTable
        items={items}
        loading={loading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onView={handleView}
        onEdit={canManage ? handleEdit : handleView}
        onDelete={handleDelete}
        page={page}
        lastPage={lastPage}
        total={total}
        perPage={perPage}
        onPageChange={setPage}
      />

      {/* ── Add / Edit Form Modal ── */}
      <EquipmentRegisterForm
        open={showForm}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        existingItem={editingItem}
        filterOptions={filterOptions}
      />

      {/* ── Detail Drawer ── */}
      <EquipmentRegisterDetail
        item={viewingItem}
        open={!!viewingItem}
        onClose={() => setViewingItem(null)}
        onEdit={canManage ? handleEdit : () => {}}
        onDelete={canManage ? handleDelete : () => {}}
      />

      {/* ── Delete Confirmation ── */}
      <TypedDeleteConfirmModal
        open={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={confirmDelete}
        title="Delete Equipment"
        itemName={deletingItem?.equipment_name}
        itemType="Equipment"
        message="This equipment record will be moved to the Recycle Bin and can be restored later."
        loading={deleteLoading}
      />
    </div>
  );
}
