import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw, ChevronRight, MoreVertical, Pencil, Trash2, AlertTriangle, Download, Upload, CheckCircle } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { getIcon } from '../../config/iconRegistry';
import { useEquipmentGroups } from './hooks/useEquipmentGroups';
import { AddCategoryModal } from './components/AddCategoryModal';
import { CreateFieldModal } from './components/CreateFieldModal';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import TypedDeleteConfirmModal from '../../components/ui/TypedDeleteConfirmModal';
import type { RegistryGroup, EquipmentCategory, EquipmentGroupField } from './hooks/useEquipmentGroups';

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('can_manage_equipment_categories');

  const toast = useToast();
  const {
    masterFields,
    createCategory,
    deleteCategory,
    syncRegistryGroupFields,
    exportItems,
  } = useEquipmentGroups();

  const [group, setGroup] = useState<RegistryGroup | null>(null);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showCreateField, setShowCreateField] = useState(false);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<EquipmentCategory | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  const gid = Number(groupId);

  const loadGroup = useCallback(async () => {
    if (!gid) return;
    setLoading(true);
    try {
      const data = await api.get<{
        id: number;
        name: string;
        description: string | null;
        icon: string;
        color: string;
        light_color: string;
        text_color: string;
        sort_order: number;
        fields: EquipmentGroupField[];
        categories: EquipmentCategory[];
        created_at: string;
      }>(`/tracker/equipment-groups/registry/${gid}`);

      setGroup({
        id: data.id,
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        light_color: data.light_color,
        text_color: data.text_color,
        sort_order: data.sort_order,
        categories_count: data.categories.length,
        fields_count: data.fields.length,
        fields: data.fields,
        total_items: data.categories.reduce((sum, c) => sum + c.item_count, 0),
        active_items: data.categories.reduce((sum, c) => sum + (c.stats?.active ?? 0), 0),
        expired_items: data.categories.reduce((sum, c) => sum + (c.stats?.expired ?? 0), 0),
        expiring_soon: data.categories.reduce((sum, c) => sum + (c.stats?.expiring_soon ?? 0), 0),
        created_at: data.created_at,
        updated_at: data.created_at,
      });
      setCategories(data.categories);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }, [gid]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

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
  }) => {
    await createCategory(gid, data);
    await loadGroup();
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryConfirm) return;
    try {
      await deleteCategory(deleteCategoryConfirm.id);
      toast.success('Category deleted');
      setDeleteCategoryConfirm(null);
      await loadGroup();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete category');
      setDeleteCategoryConfirm(null);
    }
  };

  const handleSaveFields = async (groupId: number, fields: Parameters<typeof syncRegistryGroupFields>[1]) => {
    await syncRegistryGroupFields(groupId, fields);
    await loadGroup();
  };

  const handleExport = async () => {
    try {
      await exportItems({ registry_group_id: gid });
      toast.success('Export started');
    } catch (err: any) {
      toast.error(err?.message || 'Export failed');
    }
  };

  const Icon = group ? getIcon(group.icon) : getIcon('Package');

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
          {group && (
            <div className="flex items-center gap-3">
              <div
                className="w-[44px] h-[44px] rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                style={{ backgroundColor: group.light_color }}
              >
                <Icon size={22} style={{ color: group.color }} />
              </div>
              <div>
                <h1 className="text-[22px] font-bold text-text-primary leading-tight">{group.name}</h1>
                <p className="text-[13px] text-text-secondary mt-0.5">
                  {group.categories_count} {group.categories_count === 1 ? 'category' : 'categories'} &middot; {group.total_items} items &middot; {group.fields_count} fields
                  {group.description && <span className="ml-2 text-text-tertiary">— {group.description}</span>}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadGroup}
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
                onClick={() => setShowCreateField(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-[var(--radius-md)] hover:bg-primary-100 transition-colors"
              >
                Manage Fields
              </button>
              <button
                onClick={() => setShowAddCategory(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs"
              >
                <Plus size={16} />
                Add Category
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary badges */}
      {group && (group.expired_items > 0 || group.expiring_soon > 0) && (
        <div className="flex items-center gap-3 mb-5 p-3 bg-surface border border-border rounded-[var(--radius-md)]">
          {group.expired_items > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-bold rounded-full bg-red-50 text-red-700 border border-red-200">
              <AlertTriangle size={12} />
              {group.expired_items} Expired
            </span>
          )}
          {group.expiring_soon > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-bold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
              <AlertTriangle size={12} />
              {group.expiring_soon} Expiring Soon
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
            <CheckCircle size={12} />
            {group.active_items} Active
          </span>
        </div>
      )}

      {/* Category Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
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
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-surface-sunken rounded-full flex items-center justify-center">
            <Plus size={28} className="text-text-tertiary" />
          </div>
          <h3 className="text-[16px] font-semibold text-text-primary mb-1">No Categories Yet</h3>
          <p className="text-[13px] text-text-tertiary mb-4">
            Add categories like Forklift, Boom Truck, Scissor Lift to organize equipment.
          </p>
          {canManage && (
            <button
              onClick={() => setShowAddCategory(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors"
            >
              <Plus size={14} />
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
                {/* Menu */}
                {canManage && (
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === cat.id ? null : cat.id); }}
                      className="p-1 text-text-tertiary hover:text-text-primary hover:bg-white/80 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {menuOpen === cat.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-7 z-20 w-[140px] bg-surface border border-border rounded-[var(--radius-md)] shadow-lg py-1 animate-fadeInUp">
                          <button
                            onClick={e => { e.stopPropagation(); setMenuOpen(null); handleCategoryClick(cat); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-sunken transition-colors"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setMenuOpen(null); setDeleteCategoryConfirm(cat); }}
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
                  <div className="folder-tab" style={{ backgroundColor: cat.color || group?.color }} />
                  <div className="h-[5px] w-full rounded-t-[var(--radius-lg)]" style={{ backgroundColor: cat.color || group?.color }} />

                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-[38px] h-[38px] rounded-[var(--radius-md)] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                        style={{ backgroundColor: cat.light_color || group?.light_color }}
                      >
                        <CatIcon size={20} style={{ color: cat.color || group?.color }} />
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
                      {cat.item_count === 0 ? 'Add first item' : 'Open'}
                      <ChevronRight size={12} />
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && group && (
        <AddCategoryModal
          groupName={group.name}
          groupColor={group.color}
          onSave={handleAddCategory}
          onClose={() => setShowAddCategory(false)}
        />
      )}

      {/* Create Field Modal */}
      {showCreateField && group && (
        <CreateFieldModal
          groups={[{ id: group.id, name: group.name, fields: group.fields }]}
          masterFields={masterFields}
          onSave={handleSaveFields}
          onClose={() => setShowCreateField(false)}
          preselectedGroupId={group.id}
        />
      )}

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
    </div>
  );
}
