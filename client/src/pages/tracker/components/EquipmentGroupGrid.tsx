import { useState } from 'react';
import { ChevronRight, Plus, PlusCircle, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { getIcon } from '../../../config/iconRegistry';
import type { EquipmentGroup, GroupTemplate } from '../hooks/useEquipmentGroups';

interface Props {
  groups: EquipmentGroup[];
  loading: boolean;
  canManage: boolean;
  groupTemplates?: GroupTemplate[];
  onGroupClick: (group: EquipmentGroup) => void;
  onAddItem: (group: EquipmentGroup) => void;
  onEditGroup: (group: EquipmentGroup) => void;
  onDeleteGroup: (group: EquipmentGroup) => void;
  onAddCategory?: (typeName: string) => void;
  onDeleteGroupType?: (typeName: string) => void;
}

export function EquipmentGroupGrid({ groups, loading, canManage, groupTemplates = [], onGroupClick, onAddItem, onEditGroup, onDeleteGroup, onAddCategory, onDeleteGroupType }: Props) {
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
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

  // Build sections from templates — each template is a section
  const templateNames = new Set(groupTemplates.map(t => t.name));

  // Group API records by category_type
  const byType: Record<string, EquipmentGroup[]> = {};
  groups.forEach(g => {
    const key = g.category_type || 'custom';
    if (!byType[key]) byType[key] = [];
    byType[key].push(g);
  });

  // Ensure all templates have sections (even empty ones)
  groupTemplates.forEach(t => {
    if (!byType[t.name]) byType[t.name] = [];
  });

  if (Object.keys(byType).length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {Object.entries(byType).map(([type, typeGroups]) => {
        const template = groupTemplates.find(t => t.name === type);
        const isTemplateSection = templateNames.has(type);
        const TemplateIcon = template ? getIcon(template.icon) : null;

        return (
          <div key={type}>
            {/* Section header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              {TemplateIcon && template && (
                <span
                  className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                  style={{ backgroundColor: template.light_color }}
                >
                  <TemplateIcon size={14} style={{ color: template.color }} />
                </span>
              )}
              <p className="text-[12px] font-bold text-text-tertiary uppercase tracking-widest">
                {type}
              </p>
              <span className="text-[11px] text-text-tertiary">({typeGroups.length})</span>
              {canManage && onAddCategory && (
                <button
                  onClick={() => onAddCategory(type)}
                  className="group-add-category-btn"
                  title={`Add category to ${type}`}
                >
                  <Plus size={14} />
                </button>
              )}
              {canManage && onDeleteGroupType && (
                <button
                  onClick={() => onDeleteGroupType(type)}
                  className="p-1 text-text-tertiary hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-60 hover:opacity-100"
                  title={`Delete group "${type}"`}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Existing category cards */}
              {typeGroups.map((group, i) => {
                const Icon = getIcon(group.icon);
                const isEmpty = group.item_count === 0;

                return (
                  <div
                    key={group.id}
                    className="folder-card relative flex flex-col bg-surface border border-border rounded-[var(--radius-lg)] text-left shadow-sm hover:shadow-md transition-all duration-200 group animate-fadeInUp overflow-visible hover:-translate-y-[3px] hover:border-border-strong"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {/* Management menu */}
                    {canManage && (
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === group.id ? null : group.id); }}
                          className="p-1 text-text-tertiary hover:text-text-primary hover:bg-white/80 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical size={14} />
                        </button>
                        {menuOpen === group.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 top-7 z-20 w-[140px] bg-surface border border-border rounded-[var(--radius-md)] shadow-lg py-1 animate-fadeInUp">
                              <button
                                onClick={e => { e.stopPropagation(); setMenuOpen(null); onEditGroup(group); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-sunken transition-colors"
                              >
                                <Pencil size={12} /> Edit
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setMenuOpen(null); onDeleteGroup(group); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Card body */}
                    <button
                      onClick={() => onGroupClick(group)}
                      className="w-full text-left cursor-pointer flex-1 flex flex-col"
                    >
                      {/* Folder tab */}
                      <div className="folder-tab" style={{ backgroundColor: group.color }} />

                      {/* Top color bar */}
                      <div className="h-[5px] w-full shrink-0 rounded-t-[var(--radius-lg)]" style={{ backgroundColor: group.color }} />

                      {/* Body */}
                      <div className="flex-1 flex flex-col p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div
                            className="w-[38px] h-[38px] rounded-[var(--radius-md)] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                            style={{ backgroundColor: group.light_color }}
                          >
                            <Icon size={20} style={{ color: group.color }} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-[14px] font-bold text-text-primary truncate leading-tight">{group.name}</h3>
                            {group.description && (
                              <p className="text-[11px] text-text-tertiary mt-0.5 truncate">{group.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Stats strip - pushed to bottom */}
                        <div className="mt-auto flex items-center gap-2 flex-wrap min-h-[1.5rem]">
                          <span className="inline-flex items-center px-2.5 py-[3px] text-[11px] font-semibold rounded-full bg-surface-sunken border border-border text-text-secondary">
                            {group.item_count} {group.item_count === 1 ? 'Item' : 'Items'}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-[3px] text-[11px] font-medium rounded-full bg-surface-sunken border border-border text-text-tertiary">
                            {group.fields_count} Fields
                          </span>
                        </div>
                      </div>

                      {/* Footer - pinned to bottom */}
                      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-surface-sunken border-t border-border rounded-b-[var(--radius-lg)]">
                        <span className="text-[11px] text-text-tertiary">
                          {group.category_type}
                        </span>
                        <span className="text-[11px] font-semibold text-primary-600 flex items-center gap-0.5">
                          {isEmpty ? 'Add first item' : 'Open'}
                          <ChevronRight size={12} />
                        </span>
                      </div>
                    </button>

                    {/* Quick add item button for non-empty groups */}
                    {!isEmpty && canManage && (
                      <button
                        onClick={e => { e.stopPropagation(); onAddItem(group); }}
                        className="absolute bottom-[52px] right-3 p-1.5 bg-primary-600 text-white rounded-full shadow-md hover:bg-primary-700 transition-colors opacity-0 group-hover:opacity-100"
                        title="Add item"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Show "Add Category" placeholder only when group is empty */}
              {typeGroups.length === 0 && canManage && (
                <div
                  onClick={() => onAddCategory?.(type)}
                  className="relative bg-transparent border-2 border-dashed border-border rounded-[var(--radius-lg)] text-left shadow-none hover:shadow-sm transition-all duration-200 cursor-pointer group flex flex-col items-center justify-center p-8 gap-2.5 min-h-[180px] hover:border-primary-500 hover:bg-primary-50/50"
                >
                  <PlusCircle
                    size={36}
                    className="text-text-tertiary transition-colors group-hover:text-primary-600"
                  />
                  <span className="text-[13px] font-semibold text-text-tertiary transition-colors group-hover:text-primary-600">
                    Add Category
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
