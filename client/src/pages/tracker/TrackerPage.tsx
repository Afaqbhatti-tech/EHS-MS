import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Layers, PlusCircle, Download, Upload, Plus, MoreVertical, Pencil, Trash2, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { useEquipmentGroups } from './hooks/useEquipmentGroups';
import { TrackerKPICards } from './components/TrackerKPICards';
import { CreateGroupModal } from './components/CreateGroupModal';
import { CreateFieldModal } from './components/CreateFieldModal';
import { AddCategoryModal } from './components/AddCategoryModal';
import { useAuth } from '../../contexts/AuthContext';
import { getIcon } from '../../config/iconRegistry';
import { api } from '../../services/api';
import TypedDeleteConfirmModal from '../../components/ui/TypedDeleteConfirmModal';
import { ImportModal } from '../../components/Import';
import type { RegistryGroup, EquipmentCategory, EquipmentGroupField } from './hooks/useEquipmentGroups';

export default function TrackerPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const canManage = hasPermission('can_manage_equipment_categories');

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateField, setShowCreateField] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<RegistryGroup | null>(null);

  // Category-level state
  const [groupCategories, setGroupCategories] = useState<Record<number, EquipmentCategory[]>>({});
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [addCategoryForGroup, setAddCategoryForGroup] = useState<RegistryGroup | null>(null);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<EquipmentCategory | null>(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState<number | null>(null);

  const {
    registryGroups,
    masterFields,
    loading,
    stats,
    statsLoading,
    createRegistryGroup,
    deleteRegistryGroup,
    syncRegistryGroupFields,
    createCategory,
    deleteCategory,
    refresh,
    fetchStats,
    exportItems,
  } = useEquipmentGroups();

  // ── Load categories for all groups ──────────────────

  const loadAllCategories = useCallback(async () => {
    if (registryGroups.length === 0) return;
    setCategoriesLoading(true);
    try {
      const results = await Promise.all(
        registryGroups.map(async (group) => {
          const data = await api.get<{
            id: number;
            categories: EquipmentCategory[];
          }>(`/tracker/equipment-groups/registry/${group.id}`);
          return { groupId: group.id, categories: data.categories || [] };
        })
      );
      const map: Record<number, EquipmentCategory[]> = {};
      results.forEach(r => { map[r.groupId] = r.categories; });
      setGroupCategories(map);
    } catch (err: any) {
      // Fallback: empty categories
    } finally {
      setCategoriesLoading(false);
    }
  }, [registryGroups]);

  useEffect(() => {
    loadAllCategories();
  }, [loadAllCategories]);

  // ── Handlers ──────────────────────────────────────

  const handleDeleteGroup = (group: RegistryGroup) => {
    setDeleteGroupConfirm(group);
  };

  const confirmDeleteGroup = async () => {
    if (!deleteGroupConfirm) return;
    try {
      await deleteRegistryGroup(deleteGroupConfirm.id);
      toast.success('Group deleted successfully');
      setDeleteGroupConfirm(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete group');
      setDeleteGroupConfirm(null);
    }
  };

  const handleCreateGroupSave = async (data: Parameters<typeof createRegistryGroup>[0]) => {
    await createRegistryGroup(data);
  };

  const handleCreateFieldSave = async (groupId: number, fields: Parameters<typeof syncRegistryGroupFields>[1]) => {
    await syncRegistryGroupFields(groupId, fields);
  };

  const handleExport = async () => {
    try {
      await exportItems();
      toast.success('Export started');
    } catch (err: any) {
      toast.error(err?.message || 'Export failed');
    }
  };

  const handleCategoryClick = (cat: EquipmentCategory) => {
    navigate(`/tracker/categories/${cat.id}`);
  };

  const handleAddCategory = async (data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    light_color?: string;
    text_color?: string;
    code_prefix?: string;
    addedFields?: Array<{
      field_key: string;
      field_label: string;
      field_type: string;
      field_options?: string[] | null;
      is_required?: boolean;
    }>;
  }) => {
    if (!addCategoryForGroup) return;
    const { addedFields, ...categoryData } = data;

    // If new fields were selected, sync group fields first (add-only, preserve existing)
    if (addedFields && addedFields.length > 0) {
      const existingFields = addCategoryForGroup.fields.map(f => ({
        field_key: f.field_key,
        field_label: f.field_label,
        field_type: f.field_type,
        field_options: f.field_options ?? null,
        is_required: f.is_required,
      }));
      await syncRegistryGroupFields(addCategoryForGroup.id, [...existingFields, ...addedFields]);
    }

    await createCategory(addCategoryForGroup.id, categoryData);
    await refresh();
    await loadAllCategories();
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryConfirm) return;
    try {
      await deleteCategory(deleteCategoryConfirm.id);
      toast.success('Category deleted');
      setDeleteCategoryConfirm(null);
      await loadAllCategories();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete category');
      setDeleteCategoryConfirm(null);
    }
  };

  const handleRefresh = () => {
    refresh();
    fetchStats();
    loadAllCategories();
  };

  const isLoading = loading || categoriesLoading;

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3 mb-6 pb-5 border-b border-border flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">
            Equipment Tracker
          </h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Manage equipment groups, categories, inspections, and compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-text-tertiary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
            title="Export All"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
          >
            <Upload size={14} />
            Import
          </button>
          {canManage && (
            <>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs"
              >
                <Layers size={16} />
                Create Group
              </button>
              <button
                onClick={() => setShowCreateField(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-[var(--radius-md)] hover:bg-primary-100 transition-colors"
              >
                <PlusCircle size={16} />
                Create Field
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <TrackerKPICards
        kpis={stats?.kpis ? {
          total_items: stats.kpis.total_items,
          active: stats.kpis.active_items,
          expired: stats.kpis.expired,
          expiring_soon: stats.kpis.expiring_soon,
          total_groups: stats.kpis.total_groups,
          total_categories: stats.kpis.total_categories,
        } : undefined}
        loading={statsLoading}
      />

      {/* Groups + Categories */}
      {loading ? (
        /* Loading skeletons */
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, gi) => (
            <div key={gi}>
              <div className="skeleton h-6 w-48 mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, ci) => (
                  <div key={ci} className="bg-surface border border-border rounded-[var(--radius-lg)] p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="skeleton w-10 h-10 rounded-[var(--radius-md)]" />
                      <div className="skeleton h-4 w-24" />
                    </div>
                    <div className="skeleton h-8 w-12 mb-2" />
                    <div className="skeleton h-3 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : registryGroups.length === 0 ? (
        /* Empty state */
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-surface-sunken rounded-full flex items-center justify-center">
            <AlertTriangle size={28} className="text-text-tertiary" />
          </div>
          <h3 className="text-[16px] font-semibold text-text-primary mb-1">No Equipment Groups</h3>
          <p className="text-[13px] text-text-tertiary">
            Create your first equipment group to start tracking equipment.
          </p>
        </div>
      ) : (
        /* Group sections with category cards */
        <div className="space-y-8">
          {registryGroups.map((group) => {
            const Icon = getIcon(group.icon);
            const categories = groupCategories[group.id] || [];
            const hasIssues = group.expired_items > 0;
            const hasWarnings = group.expiring_soon > 0;

            return (
              <section key={group.id} className="animate-fadeInUp">
                {/* Group Section Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-[38px] h-[38px] rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                      style={{ backgroundColor: group.light_color }}
                    >
                      <Icon size={20} style={{ color: group.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[17px] font-bold text-text-primary leading-tight">{group.name}</h2>
                        <span className="text-[11px] font-medium text-text-tertiary bg-surface-sunken border border-border px-2 py-[2px] rounded-full">
                          {group.categories_count} {group.categories_count === 1 ? 'category' : 'categories'}
                        </span>
                        <span className="text-[11px] font-medium text-text-tertiary bg-surface-sunken border border-border px-2 py-[2px] rounded-full">
                          {group.total_items} items
                        </span>
                      </div>
                      {group.description && (
                        <p className="text-[12px] text-text-tertiary mt-0.5">{group.description}</p>
                      )}
                    </div>
                    {/* Alert badges inline */}
                    {hasIssues && (
                      <span className="inline-flex items-center gap-1 px-2 py-[2px] text-[10px] font-bold rounded-full bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle size={10} />
                        {group.expired_items} Expired
                      </span>
                    )}
                    {hasWarnings && (
                      <span className="inline-flex items-center gap-1 px-2 py-[2px] text-[10px] font-bold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                        <AlertTriangle size={10} />
                        {group.expiring_soon} Expiring Soon
                      </span>
                    )}
                    {!hasIssues && !hasWarnings && group.total_items > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-[2px] text-[10px] font-medium rounded-full bg-green-50 text-green-600 border border-green-200">
                        <CheckCircle size={10} />
                        All compliant
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage && (
                      <>
                        <button
                          onClick={() => setAddCategoryForGroup(group)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-[var(--radius-md)] hover:bg-primary-100 transition-colors"
                        >
                          <Plus size={12} />
                          Add Category
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group)}
                          className="p-1.5 text-text-tertiary hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-[var(--radius-md)] transition-colors"
                          title="Delete Group"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-border mb-4" style={{ background: `linear-gradient(to right, ${group.color}40, transparent)` }} />

                {/* Category Cards Grid */}
                {categoriesLoading && !groupCategories[group.id] ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="bg-surface border border-border rounded-[var(--radius-lg)] p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="skeleton w-10 h-10 rounded-[var(--radius-md)]" />
                          <div className="skeleton h-4 w-24" />
                        </div>
                        <div className="skeleton h-8 w-12 mb-2" />
                        <div className="skeleton h-3 w-20" />
                      </div>
                    ))}
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-8 bg-surface-sunken/50 border border-dashed border-border rounded-[var(--radius-lg)]">
                    <p className="text-[13px] text-text-tertiary mb-2">No categories in this group yet</p>
                    {canManage && (
                      <button
                        onClick={() => setAddCategoryForGroup(group)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                      >
                        <Plus size={12} />
                        Add First Category
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {categories.map((cat, i) => {
                      const CatIcon = getIcon(cat.icon);
                      const hasExpired = (cat.stats?.expired ?? 0) > 0;
                      const hasExpiring = (cat.stats?.expiring_soon ?? 0) > 0;

                      return (
                        <div
                          key={cat.id}
                          className="folder-card relative bg-surface border border-border rounded-[var(--radius-lg)] text-left shadow-sm hover:shadow-md transition-all duration-200 group animate-fadeInUp overflow-visible hover:-translate-y-[3px] hover:border-border-strong"
                          style={{ animationDelay: `${i * 40}ms` }}
                        >
                          {/* Category menu */}
                          {canManage && (
                            <div className="absolute top-2 right-2 z-10">
                              <button
                                onClick={e => { e.stopPropagation(); setCategoryMenuOpen(categoryMenuOpen === cat.id ? null : cat.id); }}
                                className="p-1 text-text-tertiary hover:text-text-primary hover:bg-white/80 rounded transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <MoreVertical size={14} />
                              </button>
                              {categoryMenuOpen === cat.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setCategoryMenuOpen(null)} />
                                  <div className="absolute right-0 top-7 z-20 w-[140px] bg-surface border border-border rounded-[var(--radius-md)] shadow-lg py-1 animate-fadeInUp">
                                    <button
                                      onClick={e => { e.stopPropagation(); setCategoryMenuOpen(null); handleCategoryClick(cat); }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-sunken transition-colors"
                                    >
                                      <Pencil size={12} /> Open
                                    </button>
                                    <button
                                      onClick={e => { e.stopPropagation(); setCategoryMenuOpen(null); setDeleteCategoryConfirm(cat); }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <Trash2 size={12} /> Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => handleCategoryClick(cat)}
                            className="w-full text-left cursor-pointer"
                          >
                            <div className="folder-tab" style={{ backgroundColor: cat.color || group.color }} />
                            <div className="h-[5px] w-full rounded-t-[var(--radius-lg)]" style={{ backgroundColor: cat.color || group.color }} />

                            <div className="p-5">
                              <div className="flex items-center gap-3 mb-4">
                                <div
                                  className="w-[38px] h-[38px] rounded-[var(--radius-md)] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                                  style={{ backgroundColor: cat.light_color || group.light_color }}
                                >
                                  <CatIcon size={20} style={{ color: cat.color || group.color }} />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-[14px] font-bold text-text-primary truncate leading-tight">{cat.name}</h3>
                                  {cat.description && (
                                    <p className="text-[11px] text-text-tertiary mt-0.5 truncate">{cat.description}</p>
                                  )}
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <span className="inline-flex items-center px-2.5 py-[3px] text-[11px] font-semibold rounded-full bg-surface-sunken border border-border text-text-secondary">
                                  {cat.item_count} {cat.item_count === 1 ? 'Item' : 'Items'}
                                </span>
                                {cat.code_prefix && (
                                  <span className="inline-flex items-center px-2 py-[2px] text-[10px] font-mono font-medium rounded bg-surface-sunken border border-border text-text-tertiary">
                                    {cat.code_prefix}-*
                                  </span>
                                )}
                              </div>

                              {/* Expiry badges */}
                              {(hasExpired || hasExpiring) && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {hasExpired && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] text-[10px] font-bold rounded-full bg-red-50 text-red-700 border border-red-200">
                                      {cat.stats.expired} Expired
                                    </span>
                                  )}
                                  {hasExpiring && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] text-[10px] font-bold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                                      {cat.stats.expiring_soon} Expiring
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between px-5 py-3 bg-surface-sunken border-t border-border rounded-b-[var(--radius-lg)]">
                              <span className="text-[11px] text-text-tertiary">
                                {cat.stats?.active ?? 0} active
                              </span>
                              <span className="text-[11px] font-semibold text-primary-600 flex items-center gap-0.5">
                                {cat.item_count === 0 ? 'Add first item' : 'Item Register'}
                                <ChevronRight size={12} />
                              </span>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          masterFields={masterFields}
          onSave={handleCreateGroupSave}
          onClose={() => setShowCreateGroup(false)}
        />
      )}

      {/* Create Field Modal */}
      {showCreateField && (
        <CreateFieldModal
          groups={registryGroups.map(rg => ({
            id: rg.id,
            name: rg.name,
            fields: rg.fields,
          }))}
          masterFields={masterFields}
          onSave={handleCreateFieldSave}
          onClose={() => setShowCreateField(false)}
        />
      )}

      {/* Add Category Modal */}
      {addCategoryForGroup && (
        <AddCategoryModal
          groupName={addCategoryForGroup.name}
          groupColor={addCategoryForGroup.color}
          groupFields={addCategoryForGroup.fields}
          masterFields={masterFields}
          onSave={handleAddCategory}
          onClose={() => setAddCategoryForGroup(null)}
        />
      )}

      {/* Delete Group Confirmation */}
      <TypedDeleteConfirmModal
        open={!!deleteGroupConfirm}
        onClose={() => setDeleteGroupConfirm(null)}
        onConfirm={confirmDeleteGroup}
        itemType="Group"
        itemName={deleteGroupConfirm?.name}
        message={
          deleteGroupConfirm?.total_items && deleteGroupConfirm.total_items > 0
            ? `This group has ${deleteGroupConfirm.categories_count} category(s) with ${deleteGroupConfirm.total_items} total item(s). Remove all items first.`
            : deleteGroupConfirm?.categories_count && deleteGroupConfirm.categories_count > 0
            ? `This group contains ${deleteGroupConfirm.categories_count} empty category(s). They will all be deleted.`
            : 'This empty group will be permanently deleted.'
        }
      />

      {/* Delete Category Confirmation */}
      <TypedDeleteConfirmModal
        open={!!deleteCategoryConfirm}
        onClose={() => setDeleteCategoryConfirm(null)}
        onConfirm={handleDeleteCategory}
        itemType="Category"
        itemName={deleteCategoryConfirm?.name}
        message={
          deleteCategoryConfirm?.item_count && deleteCategoryConfirm.item_count > 0
            ? `This category has ${deleteCategoryConfirm.item_count} item(s). Remove all items first.`
            : 'This category will be permanently deleted.'
        }
      />

      {/* Import Reconciliation Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        module="equipment"
        onComplete={() => window.location.reload()}
      />
    </div>
  );
}
