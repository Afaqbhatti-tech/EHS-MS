import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Eye, Search, X as XIcon, Package, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getIcon } from '../../../config/iconRegistry';
import { api } from '../../../services/api';
import type { EquipmentGroup, EquipmentItem, GroupTemplate } from '../hooks/useEquipmentGroups';

interface Props {
  groups: EquipmentGroup[];
  loading: boolean;
  canManage?: boolean;
  groupTemplates?: GroupTemplate[];
  onViewGroup: (group: EquipmentGroup) => void;
  onAddItem?: (group: EquipmentGroup) => void;
}

interface GroupItemsMap {
  [groupId: number]: {
    items: EquipmentItem[];
    loading: boolean;
    loaded: boolean;
  };
}

const statusStyles: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Inactive: 'bg-neutral-100 text-neutral-600',
  'Out of Service': 'bg-red-100 text-red-700',
  'Under Maintenance': 'bg-amber-100 text-amber-700',
  Quarantined: 'bg-purple-100 text-purple-700',
};

export function EquipmentRegisterView({ groups, loading, canManage, groupTemplates = [], onViewGroup, onAddItem }: Props) {
  const navigate = useNavigate();
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [groupItems, setGroupItems] = useState<GroupItemsMap>({});
  const [search, setSearch] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Build sections by category_type
  const byType: Record<string, EquipmentGroup[]> = {};
  groups.forEach(g => {
    const key = g.category_type || 'custom';
    if (!byType[key]) byType[key] = [];
    byType[key].push(g);
  });

  // Also include empty template sections
  groupTemplates.forEach(t => {
    if (!byType[t.name]) byType[t.name] = [];
  });

  // Total items across all groups
  const totalItems = groups.reduce((sum, g) => sum + (g.item_count || 0), 0);
  const totalGroups = groups.length;
  const typesWithItems = Object.values(byType).filter(gs => gs.some(g => g.item_count > 0)).length;

  // Auto-expand types that have items on first load
  useEffect(() => {
    const typesWithContent = Object.entries(byType)
      .filter(([, gs]) => gs.some(g => g.item_count > 0))
      .map(([type]) => type);
    setExpandedTypes(new Set(typesWithContent));
  }, [groups.length]);

  // Fetch items for a group when expanded
  const fetchItems = useCallback(async (groupId: number) => {
    setGroupItems(prev => ({
      ...prev,
      [groupId]: { items: prev[groupId]?.items || [], loading: true, loaded: false },
    }));
    try {
      const res = await api.get<{ items: EquipmentItem[] }>(
        `/tracker/equipment-groups/${groupId}/items?per_page=200`
      );
      setGroupItems(prev => ({
        ...prev,
        [groupId]: { items: res.items || [], loading: false, loaded: true },
      }));
    } catch {
      setGroupItems(prev => ({
        ...prev,
        [groupId]: { items: [], loading: false, loaded: true },
      }));
    }
  }, []);

  const toggleType = (type: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggleGroup = (group: EquipmentGroup) => {
    const isExpanded = expandedGroups.has(group.id);
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (isExpanded) next.delete(group.id);
      else next.add(group.id);
      return next;
    });
    if (!isExpanded && !groupItems[group.id]?.loaded) {
      fetchItems(group.id);
    }
  };

  // Filter items by search
  const filterItems = (items: EquipmentItem[]): EquipmentItem[] => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(item => {
      if (item.item_code?.toLowerCase().includes(q)) return true;
      if (item.status?.toLowerCase().includes(q)) return true;
      return Object.values(item.values || {}).some(v =>
        String(v).toLowerCase().includes(q)
      );
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-[var(--radius-lg)] p-4">
            <div className="skeleton h-5 w-48 mb-3" />
            <div className="skeleton h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center">
        <Package size={40} className="mx-auto text-text-tertiary mb-3" />
        <p className="text-text-secondary text-sm font-medium">No equipment items yet</p>
        <p className="text-text-tertiary text-xs mt-1">Add items to your groups to see them here</p>
        {canManage && onAddItem && groups.length > 0 && (
          <div className="relative inline-block mt-4">
            {groups.length === 1 ? (
              <button
                onClick={() => onAddItem(groups[0])}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs"
              >
                <Plus size={16} />
                Add Item
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs"
                >
                  <Plus size={16} />
                  Add Item
                </button>
                {showAddMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 w-[220px] max-h-[300px] overflow-y-auto bg-surface border border-border rounded-[var(--radius-lg)] shadow-lg py-1 animate-fadeInUp">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Select Category</div>
                      {groups.map(g => {
                        const GIcon = getIcon(g.icon);
                        return (
                          <button
                            key={g.id}
                            onClick={() => { setShowAddMenu(false); onAddItem(g); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-primary hover:bg-surface-sunken transition-colors"
                          >
                            <span
                              className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                              style={{ backgroundColor: g.light_color }}
                            >
                              <GIcon size={13} style={{ color: g.color }} />
                            </span>
                            <span className="truncate">{g.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1.5 text-[12px] font-semibold rounded-full bg-primary-50 text-primary-700 border border-primary-200">
            {totalItems} Items
          </span>
          <span className="inline-flex items-center px-3 py-1.5 text-[12px] font-medium rounded-full bg-surface-sunken border border-border text-text-secondary">
            {totalGroups} Categories
          </span>
          <span className="inline-flex items-center px-3 py-1.5 text-[12px] font-medium rounded-full bg-surface-sunken border border-border text-text-secondary">
            {typesWithItems} Groups
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="input-field w-full pl-9 py-2 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
              >
                <XIcon size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Accordion by Group Type > Category > Items */}
      {Object.entries(byType).map(([type, typeGroups]) => {
        const template = groupTemplates.find(t => t.name === type);
        const TypeIcon = template ? getIcon(template.icon) : null;
        const isTypeExpanded = expandedTypes.has(type);
        const typeItemCount = typeGroups.reduce((s, g) => s + (g.item_count || 0), 0);

        if (typeItemCount === 0 && !search) return null;

        return (
          <div key={type} className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
            {/* Group Type header */}
            <button
              onClick={() => toggleType(type)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-canvas hover:bg-surface-sunken transition-colors border-b border-border"
            >
              {isTypeExpanded ? <ChevronDown size={16} className="text-text-tertiary shrink-0" /> : <ChevronRight size={16} className="text-text-tertiary shrink-0" />}
              {TypeIcon && template && (
                <span
                  className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: template.light_color }}
                >
                  <TypeIcon size={14} style={{ color: template.color }} />
                </span>
              )}
              <span className="text-[13px] font-bold text-text-primary uppercase tracking-wide">{type}</span>
              <span className="text-[11px] text-text-tertiary ml-1">
                {typeGroups.length} {typeGroups.length === 1 ? 'category' : 'categories'} &middot; {typeItemCount} items
              </span>
            </button>

            {/* Category sections */}
            {isTypeExpanded && (
              <div className="divide-y divide-border">
                {typeGroups.map(group => {
                  if (group.item_count === 0 && !search) return null;
                  const Icon = getIcon(group.icon);
                  const isGroupExpanded = expandedGroups.has(group.id);
                  const gi = groupItems[group.id];
                  const items = gi?.loaded ? filterItems(gi.items) : [];

                  return (
                    <div key={group.id}>
                      {/* Category header */}
                      <button
                        onClick={() => toggleGroup(group)}
                        className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-surface-sunken/50 transition-colors"
                      >
                        {isGroupExpanded ? <ChevronDown size={14} className="text-text-tertiary shrink-0" /> : <ChevronRight size={14} className="text-text-tertiary shrink-0" />}
                        <span
                          className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                          style={{ backgroundColor: group.light_color }}
                        >
                          <Icon size={13} style={{ color: group.color }} />
                        </span>
                        <span className="text-[13px] font-semibold text-text-primary">{group.name}</span>
                        <span className="inline-flex items-center px-2 py-[1px] text-[10px] font-semibold rounded-full bg-surface-sunken border border-border text-text-secondary">
                          {group.item_count}
                        </span>
                        <span className="text-[11px] text-text-tertiary ml-auto">{group.fields_count} fields</span>
                      </button>

                      {/* Items table */}
                      {isGroupExpanded && (
                        <div className="px-6 pb-3">
                          {gi?.loading ? (
                            <div className="py-4 text-center text-text-tertiary text-xs">Loading items...</div>
                          ) : items.length === 0 ? (
                            <div className="py-4 text-center text-text-tertiary text-xs">
                              {search ? 'No matching items' : 'No items in this category'}
                            </div>
                          ) : (
                            <div className="border border-border rounded-[var(--radius-md)] overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-canvas/80">
                                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Code</th>
                                    {group.fields.slice(0, 4).map(f => (
                                      <th key={f.field_key} className="text-left px-3 py-2 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                                        {f.field_label}
                                      </th>
                                    ))}
                                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                                    <th className="w-10" />
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {items.map(item => (
                                    <tr
                                      key={item.id}
                                      className="hover:bg-canvas/50 transition-colors cursor-pointer"
                                      onClick={() => navigate(`/tracker/categories/${group.id}`)}
                                    >
                                      <td className="px-3 py-2 font-mono text-[11px] font-semibold text-primary-700 whitespace-nowrap">{item.item_code}</td>
                                      {group.fields.slice(0, 4).map(f => (
                                        <td key={f.field_key} className="px-3 py-2 text-text-secondary text-xs truncate max-w-[160px]">
                                          {item.values?.[f.field_key] || '—'}
                                        </td>
                                      ))}
                                      <td className="px-3 py-2">
                                        <span className={`inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-medium ${statusStyles[item.status] || 'bg-neutral-100 text-neutral-600'}`}>
                                          {item.status || 'Active'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <button
                                          onClick={e => { e.stopPropagation(); navigate(`/tracker/categories/${group.id}`); }}
                                          className="p-1 rounded text-text-tertiary hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                          title="View item"
                                        >
                                          <Eye size={14} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
