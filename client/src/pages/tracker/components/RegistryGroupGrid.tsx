import { useState } from 'react';
import { ChevronRight, MoreVertical, Pencil, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { getIcon } from '../../../config/iconRegistry';
import type { RegistryGroup } from '../hooks/useEquipmentGroups';

interface Props {
  groups: RegistryGroup[];
  loading: boolean;
  canManage: boolean;
  onGroupClick: (group: RegistryGroup) => void;
  onEditGroup: (group: RegistryGroup) => void;
  onDeleteGroup: (group: RegistryGroup) => void;
}

export function RegistryGroupGrid({ groups, loading, canManage, onGroupClick, onEditGroup, onDeleteGroup }: Props) {
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
            <div className="h-[5px] skeleton" />
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="skeleton w-12 h-12 rounded-[var(--radius-md)]" />
                <div className="flex-1">
                  <div className="skeleton h-4 w-32 mb-2" />
                  <div className="skeleton h-3 w-20" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="skeleton h-6 w-16" />
                <div className="skeleton h-6 w-16" />
                <div className="skeleton h-6 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-surface-sunken rounded-full flex items-center justify-center">
          <AlertTriangle size={28} className="text-text-tertiary" />
        </div>
        <h3 className="text-[16px] font-semibold text-text-primary mb-1">No Equipment Groups</h3>
        <p className="text-[13px] text-text-tertiary">
          Create your first equipment group to start tracking equipment.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map((group, i) => {
        const Icon = getIcon(group.icon);
        const hasIssues = group.expired_items > 0;
        const hasWarnings = group.expiring_soon > 0;

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
                    className="w-[44px] h-[44px] rounded-[var(--radius-md)] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                    style={{ backgroundColor: group.light_color }}
                  >
                    <Icon size={22} style={{ color: group.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-bold text-text-primary truncate leading-tight">{group.name}</h3>
                    {group.description && (
                      <p className="text-[11px] text-text-tertiary mt-0.5 truncate">{group.description}</p>
                    )}
                  </div>
                </div>

                {/* Stats + alerts - pushed to bottom */}
                <div className="mt-auto space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-[3px] text-[11px] font-semibold rounded-full bg-surface-sunken border border-border text-text-secondary">
                      {group.categories_count} {group.categories_count === 1 ? 'Category' : 'Categories'}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-[3px] text-[11px] font-medium rounded-full bg-surface-sunken border border-border text-text-tertiary">
                      {group.total_items} Items
                    </span>
                    <span className="inline-flex items-center px-2.5 py-[3px] text-[11px] font-medium rounded-full bg-surface-sunken border border-border text-text-tertiary">
                      {group.fields_count} Fields
                    </span>
                  </div>

                  {/* Alert badges */}
                  <div className="min-h-[1.25rem]">
                    {(hasIssues || hasWarnings) && (
                      <div className="flex items-center gap-2 flex-wrap">
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
                      </div>
                    )}

                    {!hasIssues && !hasWarnings && group.total_items > 0 && (
                      <div className="flex items-center gap-1">
                        <CheckCircle size={12} className="text-green-500" />
                        <span className="text-[11px] text-green-600 font-medium">All compliant</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer - pinned to bottom */}
              <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-surface-sunken border-t border-border rounded-b-[var(--radius-lg)]">
                <span className="text-[11px] text-text-tertiary">
                  {group.active_items} active
                </span>
                <span className="text-[11px] font-semibold text-primary-600 flex items-center gap-0.5">
                  View Categories
                  <ChevronRight size={12} />
                </span>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
