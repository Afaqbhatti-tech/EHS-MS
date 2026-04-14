import { useState } from 'react';
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useChecklists } from './hooks/useChecklists';
import { ChecklistKPICards } from './components/ChecklistKPICards';
import { CategoryCards } from './components/CategoryCards';
import { ChecklistFilters } from './components/ChecklistFilters';
import { ChecklistTable } from './components/ChecklistTable';
import { ChecklistItemForm } from './components/ChecklistItemForm';
import { ChecklistItemDetail } from './components/ChecklistItemDetail';
import { InspectionForm } from './components/InspectionForm';
import { EquipmentInspectionForm } from './components/EquipmentInspectionForm';
import { CategoryDetailView } from './components/CategoryDetailView';
import { ChecklistCharts } from './components/ChecklistCharts';
import { CategoryManageModal } from './components/CategoryManageModal';
import { STRUCTURED_CATEGORIES } from './config/checklistCategories';
import { MewpDashboard } from './mewp/MewpDashboard';
import { useAuth } from '../../contexts/AuthContext';
import TypedDeleteConfirmModal from '../../components/ui/TypedDeleteConfirmModal';
import type { ChecklistItem, ChecklistCategory, ChecklistFilters as Filters } from './hooks/useChecklists';

type Tab = 'overview' | 'items' | 'analytics';

export default function ChecklistPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [viewingItem, setViewingItem] = useState<ChecklistItem | null>(null);
  const [inspectingItem, setInspectingItem] = useState<ChecklistItem | null>(null);
  const [structuredInspectingItem, setStructuredInspectingItem] = useState<ChecklistItem | null>(null);
  const [activeCategoryKey, setActiveCategoryKey] = useState<string>('');

  // Category management state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ChecklistCategory | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ChecklistCategory | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const toast = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('can_manage_equipment_categories');

  const {
    items, categories, stats, filterOptions,
    loading, statsLoading, error, pagination,
    filters, setFilters,
    createItem, updateItem, updateStatus, deleteItem,
    getItemDetail, recordInspection, recordStructuredInspection, uploadFiles, exportData,
    fetchMewpStats, recordMewpPreUse, closeDefect,
    createCategory, updateCategory, deleteCategory,
    refresh, isRefreshing,
  } = useChecklists();

  const handleAddNew = (categoryKey?: string) => {
    setEditingItem(null);
    setActiveCategoryKey(categoryKey || '');
    setShowForm(true);
  };

  const handleEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setActiveCategoryKey('');
    setShowForm(true);
  };

  const handleView = (item: ChecklistItem) => {
    setViewingItem(item);
  };

  const handleCategoryClick = (categoryKey: string) => {
    // Clear stale editing/viewing state when switching categories
    setEditingItem(null);
    setViewingItem(null);
    setInspectingItem(null);
    setStructuredInspectingItem(null);
    setShowForm(false);
    setActiveCategoryKey('');
    setFilters(prev => ({ ...prev, category_key: categoryKey, page: 1 }));
    setActiveTab('items');
  };

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    try {
      if (editingItem) {
        await updateItem(editingItem.id, formData);
        toast.success('Item updated successfully');
      } else {
        await createItem(formData);
        toast.success('Item created successfully');
      }
      setShowForm(false);
      setEditingItem(null);
      setActiveCategoryKey('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save checklist item');
    }
  };

  const handleRecordInspection = async (itemId: string, data: Record<string, unknown>) => {
    await recordInspection(itemId, data);
  };

  // Category management handlers
  const handleEditCategory = (cat: ChecklistCategory) => {
    setEditingCategory(cat);
    setShowCategoryModal(true);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setShowCategoryModal(true);
  };

  const handleCategorySave = async (data: Record<string, unknown>) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, data);
        toast.success('Category updated successfully');
      } else {
        await createCategory(data);
        toast.success('Category created successfully');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
      throw err;
    }
  };

  const handleDeleteCategory = (cat: ChecklistCategory) => {
    setDeleteError('');
    setDeleteConfirm(cat);
  };

  const confirmDeleteCategory = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteCategory(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete category');
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'items', label: 'Items Register' },
    { key: 'analytics', label: 'Analytics & Charts' },
  ];

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3 mb-6 pb-5 border-b border-border flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">
            Equipment & Safety Checklists
          </h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Track inspections, manage equipment health, and ensure compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="p-2 text-text-tertiary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => handleAddNew()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <ChecklistKPICards kpis={stats?.kpis} loading={statsLoading} />

      {/* Tab Navigation */}
      <div className="flex gap-0 mb-5 border-b-2 border-border">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-[2px] transition-colors ${
              activeTab === tab.key
                ? 'text-primary-600 border-primary-600 font-semibold'
                : 'text-text-tertiary border-transparent hover:text-text-primary'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <CategoryCards
          categories={categories}
          loading={statsLoading}
          canManage={canManage}
          onCategoryClick={handleCategoryClick}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          onAddCategory={handleAddCategory}
        />
      )}

      {activeTab === 'items' && (
        <>
          {/* MEWP Dashboard — replaces generic view when MEWP is selected */}
          {filters.category_key === 'mewp' ? (
            <MewpDashboard
              items={items}
              loading={loading}
              onBack={() => {
                setFilters(prev => ({ ...prev, category_key: '', page: 1 }));
                setActiveTab('overview');
              }}
              onView={handleView}
              onEdit={handleEdit}
              recordMewpPreUse={recordMewpPreUse}
              closeDefect={closeDefect}
              refresh={refresh}
            />
          ) : (
          <>
          {/* Category detail header when filtered to a structured category */}
          {filters.category_key && (STRUCTURED_CATEGORIES as readonly string[]).includes(filters.category_key) && (
            <div className="mb-4">
              <CategoryDetailView
                categoryKey={filters.category_key}
                items={items}
                loading={loading}
                onBack={() => {
                  setFilters(prev => ({ ...prev, category_key: '', page: 1 }));
                  setActiveTab('overview');
                }}
              />
            </div>
          )}

          <ChecklistFilters
            filters={filters}
            onFilterChange={(key, val) =>
              setFilters(prev => ({ ...prev, [key]: val, page: key === 'page' ? val as number : 1 }))
            }
            onExport={exportData}
            filterOptions={filterOptions}
            loading={loading}
          />

          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] flex items-center justify-between">
              <span className="text-[13px] text-danger-700">{error}</span>
              <button onClick={refresh} className="text-[12px] font-medium text-danger-600 hover:text-danger-700 underline">Retry</button>
            </div>
          )}

          <ChecklistTable
            items={items}
            loading={loading}
            pagination={pagination}
            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={deleteItem}
            onStatusChange={updateStatus}
            onAddNew={() => handleAddNew()}
            showCategory={!filters.category_key}
          />
          </>
          )}
        </>
      )}

      {activeTab === 'analytics' && (
        <ChecklistCharts stats={stats} loading={statsLoading} />
      )}

      {/* Item Form Drawer */}
      {showForm && (
        <ChecklistItemForm
          item={editingItem}
          categories={categories}
          preselectedCategory={activeCategoryKey}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
            setActiveCategoryKey('');
          }}
        />
      )}

      {/* Item Detail Drawer */}
      {viewingItem && (
        <ChecklistItemDetail
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          onEdit={() => {
            setEditingItem(viewingItem);
            setViewingItem(null);
            setShowForm(true);
          }}
          onRecordInspection={() => {
            setInspectingItem(viewingItem);
            setViewingItem(null);
          }}
          onStructuredInspection={
            (STRUCTURED_CATEGORIES as readonly string[]).includes(viewingItem.category_key)
              ? () => {
                  setStructuredInspectingItem(viewingItem);
                  setViewingItem(null);
                }
              : undefined
          }
          getItemDetail={getItemDetail}
        />
      )}

      {/* Inspection Form Drawer */}
      {inspectingItem && (
        <InspectionForm
          item={inspectingItem}
          onSubmit={handleRecordInspection}
          onClose={() => setInspectingItem(null)}
        />
      )}

      {/* Structured Inspection Form Drawer */}
      {structuredInspectingItem && (
        <EquipmentInspectionForm
          item={structuredInspectingItem}
          categoryKey={structuredInspectingItem.category_key}
          onSubmit={recordStructuredInspection}
          onClose={() => setStructuredInspectingItem(null)}
        />
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <CategoryManageModal
          category={editingCategory}
          onSave={handleCategorySave}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <TypedDeleteConfirmModal
        open={!!deleteConfirm}
        onClose={() => { setDeleteConfirm(null); setDeleteError(''); }}
        onConfirm={confirmDeleteCategory}
        itemType="Checklist Category"
        itemName={deleteConfirm?.label}
        message={
          deleteConfirm?.item_count && deleteConfirm.item_count > 0
            ? `This category has ${deleteConfirm.item_count} item(s). Remove or reassign them first.`
            : deleteError || 'This category will be moved to the recycle bin.'
        }
      />
    </div>
  );
}
