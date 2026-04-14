import { useState, useEffect, useCallback } from 'react';
import { Search, X as XIcon, ChevronRight, AlertTriangle, Clock } from 'lucide-react';
import { TRACKER_CATEGORIES, getCategoryByKey } from '../../../../config/trackerCategories';
import { CategoryBadge, InspectionResultBadge, OverdueBadge } from '../../components/TrackerBadges';
import { format } from 'date-fns';
import type { SearchItem } from '../../hooks/useTracker';

interface Props {
  onSelect: (item: SearchItem) => void;
  onClose: () => void;
  searchItems: (params: { category_key?: string; item_subtype?: string; q?: string }) => Promise<SearchItem[]>;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
}

export function InspectionSearchPanel({ onSelect, onClose, searchItems }: Props) {
  const [categoryKey, setCategoryKey] = useState('');
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const items = await searchItems({
        category_key: categoryKey || undefined,
        q: searchText || undefined,
      });
      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [categoryKey, searchText, searchItems]);

  // Auto-search on category change or initial mount
  useEffect(() => {
    doSearch();
  }, [categoryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch();
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel right-0 w-[560px] max-w-full animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border" style={{ borderTop: '4px solid var(--color-primary-500)' }}>
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">Add Inspection</h2>
            <p className="text-[12px] text-text-tertiary mt-0.5">Search and select an equipment item to inspect</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        {/* Search Controls */}
        <div className="px-6 py-4 border-b border-border space-y-3">
          {/* Category Filter */}
          <div>
            <label className="block text-[12px] font-semibold text-text-secondary mb-1">Category</label>
            <select
              value={categoryKey}
              onChange={e => setCategoryKey(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 transition-all"
            >
              <option value="">All Categories</option>
              {TRACKER_CATEGORIES.map(cat => (
                <option key={cat.key} value={cat.key}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by name, code, plate, serial..."
              className="w-full pl-9 pr-20 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 transition-all"
            />
            <button
              onClick={doSearch}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 text-[12px] font-semibold text-white bg-primary-600 rounded-[var(--radius-sm)] hover:bg-primary-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-3 border border-border rounded-[var(--radius-md)]">
                  <div className="skeleton h-4 w-2/3 mb-2" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center">
              <Search size={36} className="mx-auto text-text-tertiary mb-3" />
              <p className="text-[14px] font-medium text-text-secondary mb-1">
                {searched ? 'No equipment found' : 'Search for equipment'}
              </p>
              <p className="text-[12px] text-text-tertiary">
                {searched ? 'Try a different search term or category' : 'Select a category or type a search term'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider px-1 mb-2">
                {results.length} item{results.length !== 1 ? 's' : ''} found
              </p>
              {results.map(item => {
                const cat = getCategoryByKey(item.category_key);
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className="w-full text-left p-3 border border-border rounded-[var(--radius-md)] hover:bg-canvas hover:border-primary-200 transition-all group cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[12px] font-mono font-semibold text-text-tertiary">{item.record_code}</span>
                          {item.category_label && cat && (
                            <CategoryBadge
                              label={cat.label}
                              color={cat.color}
                              lightColor={cat.lightColor}
                              textColor={cat.textColor}
                            />
                          )}
                        </div>
                        <p className="text-[14px] font-semibold text-text-primary truncate">{item.equipment_name}</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-text-tertiary">
                          {item.item_subtype && <span>{item.item_subtype}</span>}
                          {item.plate_number && <span>Plate: {item.plate_number}</span>}
                          {item.serial_number && <span>Serial: {item.serial_number}</span>}
                        </div>

                        {/* Status row */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            item.status === 'Active' ? 'bg-health-50 text-health-700' :
                            item.status === 'Out of Service' ? 'bg-danger-50 text-danger-700' :
                            'bg-surface-sunken text-text-tertiary'
                          }`}>
                            {item.status}
                          </span>
                          {item.is_overdue && item.days_until_due !== null && (
                            <OverdueBadge daysOver={Math.abs(item.days_until_due)} />
                          )}
                          {item.last_result && <InspectionResultBadge result={item.last_result} />}
                          {item.total_inspections > 0 && (
                            <span className="text-[10px] text-text-tertiary">{item.total_inspections} inspection{item.total_inspections !== 1 ? 's' : ''}</span>
                          )}
                        </div>

                        {/* Last/Next dates */}
                        <div className="flex items-center gap-4 mt-1.5 text-[10px] text-text-tertiary">
                          <span className="flex items-center gap-1">
                            <Clock size={9} /> Last: {formatDate(item.last_inspection_date)}
                          </span>
                          <span className={`flex items-center gap-1 ${item.is_overdue ? 'text-danger-600 font-semibold' : ''}`}>
                            {item.is_overdue && <AlertTriangle size={9} />}
                            Next: {formatDate(item.next_due_date)}
                          </span>
                        </div>
                      </div>

                      <ChevronRight size={18} className="text-text-tertiary group-hover:text-primary-600 mt-2 shrink-0 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
