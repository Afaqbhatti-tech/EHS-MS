import { useState } from 'react';
import { AlertTriangle, Clock, Package, ChevronRight, ShieldAlert, MoreVertical, Pencil, Trash2, Plus, PlusCircle, Check, X as XIcon } from 'lucide-react';
import { getIcon } from '../../../config/iconRegistry';
import type { TrackerCategory } from '../hooks/useTracker';

function getInspFreqLabelFromDays(days: number): string {
  if (days <= 1) return 'Daily';
  if (days <= 7) return 'Weekly';
  if (days <= 30) return 'Monthly';
  if (days <= 90) return 'Quarterly';
  return 'Periodic';
}

interface Props {
  categories: TrackerCategory[];
  loading: boolean;
  canManage: boolean;
  onCategoryClick: (categoryKey: string) => void;
  onEditCategory: (category: TrackerCategory) => void;
  onDeleteCategory: (category: TrackerCategory) => void;
  onAddCategory: (groupName?: string) => void;
  onRenameGroup: (oldName: string, newName: string) => Promise<void>;
  onDeleteGroup?: (groupName: string) => void;
}

export function TrackerCategoryGrid({ categories, loading, canManage, onCategoryClick, onEditCategory, onDeleteCategory, onAddCategory, onRenameGroup, onDeleteGroup }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [renamingSaving, setRenamingSaving] = useState(false);

  // Derive groups dynamically from API data
  const groups = [...new Set(categories.map(c => c.group_name))];

  const handleGroupRename = async (oldName: string) => {
    if (!groupNameInput.trim() || groupNameInput.trim() === oldName) {
      setEditingGroup(null);
      return;
    }
    setRenamingSaving(true);
    try {
      await onRenameGroup(oldName, groupNameInput.trim());
    } finally {
      setRenamingSaving(false);
      setEditingGroup(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
            <div className="h-[5px] skeleton" />
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="skeleton w-10 h-10 rounded-[var(--radius-md)]" />
                <div className="skeleton h-4 w-24" />
              </div>
              <div className="skeleton h-8 w-12 mb-2" />
              <div className="skeleton h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(group => {
        const groupCats = categories.filter(c => c.group_name === group);
        if (!groupCats.length) return null;

        return (
          <div key={group}>
            {/* Group Header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              {editingGroup === group ? (
                <div className="flex items-center gap-1.5">
                  <input
                    className="px-2 py-0.5 text-[12px] font-bold uppercase tracking-widest bg-surface border border-primary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={groupNameInput}
                    onChange={e => setGroupNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleGroupRename(group); if (e.key === 'Escape') setEditingGroup(null); }}
                    autoFocus
                    disabled={renamingSaving}
                  />
                  <button onClick={() => handleGroupRename(group)} className="p-0.5 text-primary-600 hover:text-primary-700" disabled={renamingSaving}>
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingGroup(null)} className="p-0.5 text-text-tertiary hover:text-text-primary">
                    <XIcon size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[12px] font-bold text-text-tertiary uppercase tracking-widest">
                    {group}
                  </p>
                  <span className="text-[11px] text-text-tertiary">({groupCats.length})</span>
                  {canManage && (
                    <button
                      onClick={() => onAddCategory(group)}
                      className="group-add-category-btn"
                      title={`Add category to ${group}`}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                  {canManage && onDeleteGroup && (
                    <button
                      onClick={() => onDeleteGroup(group)}
                      className="p-1 text-text-tertiary hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-60 hover:opacity-100"
                      title={`Delete group "${group}"`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {groupCats.map((cat, i) => {
                const Icon = getIcon(cat.icon);
                const isEmpty = cat.active_count === 0;

                return (
                  <div
                    key={cat.key}
                    className={`folder-card relative flex flex-col bg-surface border border-border rounded-[var(--radius-lg)] text-left shadow-sm hover:shadow-md transition-all duration-200 group animate-fadeInUp overflow-visible hover:-translate-y-[3px] hover:border-border-strong ${isEmpty ? 'opacity-65' : ''}`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {/* Management menu */}
                    {canManage && (
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === cat.key ? null : cat.key); }}
                          className="p-1 text-text-tertiary hover:text-text-primary hover:bg-white/80 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical size={14} />
                        </button>
                        {menuOpen === cat.key && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 top-7 z-20 w-[140px] bg-surface border border-border rounded-[var(--radius-md)] shadow-lg py-1 animate-fadeInUp">
                              <button
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(null); onEditCategory(cat); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-sunken transition-colors"
                              >
                                <Pencil size={12} /> Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(null); onDeleteCategory(cat); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Clickable card body */}
                    <button
                      onClick={() => onCategoryClick(cat.key)}
                      className="w-full text-left cursor-pointer flex-1 flex flex-col"
                    >
                      {/* Folder tab */}
                      <div className="folder-tab" style={{ backgroundColor: cat.color }} />

                      {/* Top color bar */}
                      <div className="h-[5px] w-full shrink-0 rounded-t-[var(--radius-lg)]" style={{ backgroundColor: cat.color }} />

                      {/* Body */}
                      <div className="flex-1 flex flex-col p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div
                            className="w-[38px] h-[38px] rounded-[var(--radius-md)] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                            style={{ backgroundColor: cat.light_color }}
                          >
                            <Icon size={20} style={{ color: cat.color }} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-[14px] font-bold text-text-primary truncate leading-tight">{cat.label}</h3>
                            <p className="text-[11px] text-text-tertiary mt-0.5 truncate">{cat.description}</p>
                          </div>
                        </div>

                        {/* Stats strip - pushed to bottom */}
                        <div className="mt-auto flex items-center gap-2 flex-wrap min-h-[1.5rem]">
                          <span className="inline-flex items-center px-2.5 py-[3px] text-[11px] font-semibold rounded-full bg-surface-sunken border border-border text-text-secondary">
                            {cat.active_count} {cat.active_count === 1 ? 'Item' : 'Items'}
                          </span>
                          {cat.overdue_count > 0 && (
                            <span className="inline-flex items-center gap-[4px] px-2.5 py-[3px] text-[11px] font-semibold rounded-full border"
                              style={{ backgroundColor: 'var(--color-health-poor)', color: 'var(--color-health-poor-text)', borderColor: 'var(--color-health-poor-border)' }}>
                              <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ backgroundColor: 'currentColor', animation: 'dotPulse 1.5s infinite' }} />
                              {cat.overdue_count} Overdue
                            </span>
                          )}
                          {cat.tuv_overdue_count > 0 && (
                            <span className="inline-flex items-center gap-[4px] px-2.5 py-[3px] text-[11px] font-semibold rounded-full border"
                              style={{ backgroundColor: '#FEE2E2', color: '#991B1B', borderColor: '#FECACA' }}>
                              <ShieldAlert size={11} />
                              {cat.tuv_overdue_count} TUV
                            </span>
                          )}
                          {cat.due_soon_count > 0 && (
                            <span className="inline-flex items-center gap-[4px] px-2.5 py-[3px] text-[11px] font-semibold rounded-full border"
                              style={{ backgroundColor: 'var(--color-health-fair)', color: 'var(--color-health-fair-text)', borderColor: 'var(--color-health-fair-border)' }}>
                              {cat.due_soon_count} Due Soon
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer - pinned to bottom */}
                      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-surface-sunken border-t border-border rounded-b-[var(--radius-lg)]">
                        <span className="text-[11px] text-text-tertiary">
                          {getInspFreqLabelFromDays(cat.insp_freq_days)} inspection
                        </span>
                        <span className="text-[11px] font-semibold text-primary-600 flex items-center gap-0.5">
                          {isEmpty ? 'Add first item' : 'Open'}
                          <ChevronRight size={12} />
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}

              {/* "Add Categories" placeholder */}
              {canManage && (
                <div
                  onClick={() => onAddCategory(group)}
                  className="relative bg-transparent border-2 border-dashed border-border rounded-[var(--radius-lg)] text-left shadow-none hover:shadow-sm transition-all duration-200 cursor-pointer group flex flex-col items-center justify-center p-8 gap-2.5 min-h-[180px] hover:border-primary-500 hover:bg-primary-50/50"
                >
                  <PlusCircle
                    size={36}
                    className="text-text-tertiary transition-colors group-hover:text-primary-600"
                  />
                  <span className="text-[13px] font-semibold text-text-tertiary transition-colors group-hover:text-primary-600">
                    Add Categories
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

    </div>
  );
}
