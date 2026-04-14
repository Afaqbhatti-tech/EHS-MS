import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../services/api';

// ── Types ────────────────────────────────────────────────

export interface ChecklistCategory {
  id: number;
  key: string;
  label: string;
  full_label: string;
  icon: string;
  color: string;
  light_color: string;
  text_color: string;
  has_plate: boolean;
  has_swl: boolean;
  has_cert: boolean;
  insp_freq_days: number;
  description: string;
  item_count: number;
  overdue_count: number;
  due_soon_count: number;
}

export interface ChecklistItem {
  id: string;
  item_code: string;
  category_id: number;
  category_key: string;
  category_label: string;
  category_color: string;
  category_light_color: string;
  category_text_color: string;
  name: string;
  item_type: string | null;
  plate_number: string | null;
  serial_number: string | null;
  make_model: string | null;
  swl: string | null;
  certificate_number: string | null;
  certificate_expiry: string | null;
  onboarding_date: string | null;
  last_internal_inspection_date: string | null;
  next_internal_inspection_date: string | null;
  last_third_party_inspection_date: string | null;
  next_third_party_inspection_date: string | null;
  health_condition: string;
  visual_condition: string | null;
  status: string;
  is_overdue: boolean;
  days_until_due: number | null;
  due_soon: boolean;
  cert_expiring_soon: boolean;
  location_area: string | null;
  assigned_to: string | null;
  notes: string | null;
  image_url: string | null;
  inspections_count: number;
  // Safety equipment fields
  manufacture_date: string | null;
  retirement_date: string | null;
  last_drop_arrest: boolean;
  drop_arrest_date: string | null;
  extinguisher_type: string | null;
  capacity_litres: number | null;
  last_service_date: string | null;
  next_service_date: string | null;
  pressure_status: string | null;
  engine_hours: number | null;
  fuel_type: string | null;
  kva_rating: number | null;
  last_toolbox_tag_date: string | null;
  toolbox_tag_colour: string | null;
  next_toolbox_tag_date: string | null;
  has_open_defect: boolean;
  defect_description: string | null;
  defect_reported_date: string | null;
  defect_closed_date: string | null;
  // MEWP fields
  mewp_type: string | null;
  third_party_cert_number: string | null;
  third_party_cert_expiry: string | null;
  third_party_inspector: string | null;
  third_party_company: string | null;
  service_interval_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistInspection {
  id: string;
  inspection_code: string;
  checklist_item_id: string;
  inspection_date: string;
  inspection_type: string;
  inspector_name: string;
  inspector_company: string | null;
  overall_result: string;
  health_condition_found: string;
  findings: string | null;
  corrective_actions: string | null;
  next_inspection_date: string | null;
  certificate_issued: boolean;
  certificate_number: string | null;
  certificate_expiry: string | null;
  image_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface ChecklistStats {
  kpis: {
    total: number;
    active: number;
    overdue: number;
    due_soon: number;
    out_of_service: number;
    inspections_this_month: number;
  };
  byCategory: { key: string; label: string; color: string; light_color: string; text_color: string; item_count: number; overdue_count: number; due_soon_count: number }[];
  upcoming: { id: string; item_code: string; name: string; category: string; due_date: string; days_until: number }[];
  overdueItems: { id: string; item_code: string; name: string; category: string; color: string; days_over: number }[];
  byHealth: { condition: string; total: number }[];
  byStatus: { status: string; total: number }[];
  monthlyInspections: { month: number; total: number; passed: number; failed: number }[];
}

export interface MewpStats {
  kpis: {
    total: number;
    active: number;
    overdue: number;
    due_soon: number;
    out_of_service: number;
    has_open_defect: number;
    cert_expiring: number;
  };
  byType: { mewp_type: string; total: number; active: number; overdue: number; defects: number }[];
  attention: ChecklistItem[];
  certsDue: ChecklistItem[];
}

export interface ChecklistFilters {
  search: string;
  category_key: string;
  status: string;
  health_condition: string;
  overdue: string;
  due_soon: string;
  period: string;
  sort_by: string;
  sort_dir: string;
  per_page: number;
  page: number;
}

export interface FilterOptions {
  categories: { id: number; key: string; label: string }[];
  statuses: string[];
  health_conditions: string[];
  locations: string[];
  assigned_to: string[];
}

// ── Defaults ─────────────────────────────────────────────

const DEFAULT_FILTERS: ChecklistFilters = {
  search: '',
  category_key: '',
  status: '',
  health_condition: '',
  overdue: '',
  due_soon: '',
  period: '',
  sort_by: 'created_at',
  sort_dir: 'desc',
  per_page: 25,
  page: 1,
};

// ── Hook ─────────────────────────────────────────────────

interface PaginatedResponse {
  data: ChecklistItem[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

export function useChecklists() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [categories, setCategories] = useState<ChecklistCategory[]>([]);
  const [stats, setStats] = useState<ChecklistStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 25 });
  const [filters, setFilters] = useState<ChecklistFilters>(DEFAULT_FILTERS);

  const fetchItems = useCallback(async (f: ChecklistFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = Object.entries(f)
        .filter(([, v]) => v !== '' && v !== 0)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      const data = await api.get<PaginatedResponse>(`/checklists/items?${params}`);
      setItems(data.data || []);
      setPagination({
        currentPage: data.page,
        lastPage: data.last_page,
        total: data.total,
        perPage: data.per_page,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load checklist items');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.get<ChecklistCategory[]>('/checklists/categories');
      setCategories(data);
    } catch (err) {
      console.error('Categories fetch error:', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await api.get<ChecklistStats>('/checklists/stats');
      setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const data = await api.get<FilterOptions>('/checklists/filters/options');
      setFilterOptions(data);
    } catch (err) {
      console.error('Filter options error:', err);
    }
  }, []);

  useEffect(() => {
    fetchItems(filters);
  }, [filters, fetchItems]);

  useEffect(() => {
    fetchCategories();
    fetchStats();
    fetchFilterOptions();
  }, [fetchCategories, fetchStats, fetchFilterOptions]);

  const createItem = async (data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; item: ChecklistItem }>('/checklists/items', data);
    await fetchItems(filters);
    await fetchStats();
    await fetchCategories();
    return result;
  };

  const updateItem = async (id: string, data: Record<string, unknown>) => {
    const result = await api.put<{ message: string; item: ChecklistItem }>(`/checklists/items/${id}`, data);
    await fetchItems(filters);
    await fetchStats();
    return result;
  };

  const updateStatus = async (id: string, statusData: { status: string }) => {
    const result = await api.patch<{ message: string; item: ChecklistItem }>(`/checklists/items/${id}/status`, statusData);
    setItems(prev => prev.map(item => item.id === id ? result.item : item));
    await fetchStats();
    return result;
  };

  const deleteItem = async (id: string) => {
    await api.delete(`/checklists/items/${id}`);
    await fetchItems(filters);
    await fetchStats();
    await fetchCategories();
  };

  const getItemDetail = async (id: string) => {
    return api.get<ChecklistItem & { inspections: ChecklistInspection[] }>(`/checklists/items/${id}`);
  };

  const recordInspection = async (itemId: string, data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; inspection: ChecklistInspection; item: ChecklistItem }>(
      `/checklists/items/${itemId}/inspections`, data
    );
    await fetchItems(filters);
    await fetchStats();
    return result;
  };

  const recordStructuredInspection = async (itemId: string, data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; result: string; fail_count: number; inspection: ChecklistInspection; item: ChecklistItem }>(
      `/checklists/items/${itemId}/structured-inspection`, data
    );
    await fetchItems(filters);
    await fetchStats();
    await fetchCategories();
    return result;
  };

  const uploadFiles = async (files: File[]) => {
    const result = await api.upload<{ files: { filename: string; originalName: string; size: number; mimetype: string }[] }>(
      '/checklists/upload', files
    );
    return result.files;
  };

  // ── Category management ─────────────────────────────
  const createCategory = async (data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; category: ChecklistCategory }>('/checklists/categories', data);
    await fetchCategories();
    return result;
  };

  const updateCategory = async (id: number, data: Record<string, unknown>) => {
    const result = await api.put<{ message: string; category: ChecklistCategory }>(`/checklists/categories/${id}`, data);
    await fetchCategories();
    return result;
  };

  const deleteCategory = async (id: number) => {
    await api.delete(`/checklists/categories/${id}`);
    await fetchCategories();
    await fetchStats();
  };

  const exportData = (format: string = 'csv') => {
    if (format === 'copy') {
      const headers = ['Item Code', 'Name', 'Category', 'Condition', 'Status', 'Next Inspection', 'Location'];
      const text = headers.join('\t') + '\n' + items.map(r =>
        [r.item_code || '', r.name || '', r.category_label || '', r.health_condition || '', r.status || '', r.next_internal_inspection_date || '', r.location_area || ''].join('\t')
      ).join('\n');
      navigator.clipboard.writeText(text);
      return;
    }
    const params = Object.entries(filters)
      .filter(([, v]) => v !== '' && v !== 0)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    api.download(`/checklists/export?format=${format}&${params}`);
  };

  // MEWP specific
  const fetchMewpStats = async () => {
    return api.get<MewpStats>('/checklists/mewp/stats');
  };

  const recordMewpPreUse = async (itemId: string, data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; result: string; fail_count: number; inspection: ChecklistInspection; item: ChecklistItem }>(
      `/checklists/items/${itemId}/mewp-preuse`, data
    );
    await fetchItems(filters);
    await fetchStats();
    await fetchCategories();
    return result;
  };

  const closeDefect = async (itemId: string, closureNotes: string) => {
    const result = await api.patch<{ message: string; item: ChecklistItem }>(
      `/checklists/items/${itemId}/close-defect`, { closure_notes: closureNotes }
    );
    await fetchItems(filters);
    await fetchStats();
    return result;
  };

  return {
    items,
    categories,
    stats,
    filterOptions,
    loading,
    statsLoading,
    error,
    pagination,
    filters,
    setFilters,
    createItem,
    updateItem,
    updateStatus,
    deleteItem,
    getItemDetail,
    recordInspection,
    recordStructuredInspection,
    uploadFiles,
    exportData,
    fetchMewpStats,
    recordMewpPreUse,
    closeDefect,
    // Category management
    createCategory,
    updateCategory,
    deleteCategory,
    refresh: () => {
      setIsRefreshing(true);
      Promise.all([fetchItems(filters), fetchStats(), fetchCategories()]).finally(() => setIsRefreshing(false));
    },
    isRefreshing,
  };
}
