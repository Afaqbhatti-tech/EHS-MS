import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../services/api';

// ── Types ────────────────────────────────────────

export interface EquipmentItem {
  id: number;
  equipment_code: string;
  equipment_name: string;
  serial_number: string | null;
  equipment_category: string | null;
  equipment_type: string | null;
  manufacturer: string | null;
  model_number: string | null;
  asset_tag: string | null;
  registration_number: string | null;
  equipment_status: string;
  working_status: string;
  condition_status: string;
  condition_details: string | null;
  purchase_date: string | null;
  commissioning_date: string | null;
  retirement_date: string | null;
  project_name: string | null;
  current_location: string | null;
  area: string | null;
  zone: string | null;
  assigned_team: string | null;
  assigned_supervisor: string | null;
  assigned_operator: string | null;
  company_name: string | null;
  tuv_authorized: string | null;
  vendor_supplier: string | null;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  inspection_frequency: string | null;
  inspection_status: string;
  certificate_number: string | null;
  tuv_valid_until: string | null;
  purchase_cost: string | null;
  rental_status: string;
  rental_company: string | null;
  warranty_expiry: string | null;
  image_path: string | null;
  image_url: string | null;
  additional_images: string[] | null;
  additional_image_urls: string[];
  attachments: string[] | null;
  attachment_urls: string[];
  notes: string | null;
  remarks: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentStats {
  total: number;
  active: number;
  inactive: number;
  retired: number;
  under_maintenance: number;
  out_of_service: number;
  overdue: number;
  due_soon: number;
  currently_working: number;
  old_equipment: number;
  by_category: { equipment_category: string; total: number }[];
  by_company: { company_name: string; total: number }[];
}

export interface FilterOptions {
  areas: string[];
  zones: string[];
  companies: string[];
  owners: string[];
  statuses: string[];
  working_statuses: string[];
  conditions: string[];
  categories: string[];
  inspection_frequencies: string[];
  rental_statuses: string[];
}

export interface Filters {
  search: string;
  equipment_status: string;
  working_status: string;
  condition_status: string;
  equipment_category: string;
  company_name: string;
  area: string;
  zone: string;
  inspection_status: string;
}

interface PaginatedResponse {
  data: EquipmentItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ── Hook ─────────────────────────────────────────

export function useEquipmentRegister() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [stats, setStats] = useState<EquipmentStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(25);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    equipment_status: '',
    working_status: '',
    condition_status: '',
    equipment_category: '',
    company_name: '',
    area: '',
    zone: '',
    inspection_status: '',
  });

  // ── Fetch List ──
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('per_page', String(perPage));
      params.set('sort_by', sortBy);
      params.set('sort_dir', sortDir);

      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.set(key, val);
      });

      const res = await api.get<PaginatedResponse>(`/equipment-register?${params}`);
      setItems(res.data);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to fetch equipment:', err);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy, sortDir, filters]);

  // ── Fetch Stats ──
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get<EquipmentStats>('/equipment-register/stats');
      setStats(res);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // ── Fetch Filter Options ──
  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await api.get<FilterOptions>('/equipment-register/filter-options');
      setFilterOptions(res);
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  }, []);

  // ── Fetch Single Item ──
  const fetchItem = useCallback(async (id: number): Promise<EquipmentItem | null> => {
    try {
      return await api.get<EquipmentItem>(`/equipment-register/${id}`);
    } catch (err) {
      console.error('Failed to fetch equipment item:', err);
      return null;
    }
  }, []);

  // ── Create ──
  const createItem = useCallback(async (formData: FormData): Promise<{ success: boolean; message: string; data?: EquipmentItem }> => {
    try {
      const json = await api.uploadForm<{ message: string; data: EquipmentItem }>('/equipment-register', formData);
      fetchItems();
      fetchStats();
      return { success: true, message: json.message, data: json.data };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to create equipment' };
    }
  }, [fetchItems, fetchStats]);

  // ── Update ──
  const updateItem = useCallback(async (id: number, formData: FormData): Promise<{ success: boolean; message: string; data?: EquipmentItem }> => {
    try {
      const json = await api.uploadForm<{ message: string; data: EquipmentItem }>(`/equipment-register/${id}`, formData);
      fetchItems();
      fetchStats();
      return { success: true, message: json.message, data: json.data };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update equipment' };
    }
  }, [fetchItems, fetchStats]);

  // ── Delete ──
  const deleteItem = useCallback(async (id: number): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await api.delete<{ message: string }>(`/equipment-register/${id}`);
      fetchItems();
      fetchStats();
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to delete' };
    }
  }, [fetchItems, fetchStats]);

  // ── Export ──
  const exportData = useCallback(async (format: string) => {
    const params = new URLSearchParams();
    params.set('format', format);
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.set(key, val);
    });
    api.download(`/equipment-register/export?${params}`);
  }, [filters]);

  // ── Sort ──
  const handleSort = useCallback((column: string) => {
    if (sortBy === column) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setPage(1);
  }, [sortBy]);

  // ── Filter Change ──
  const updateFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      equipment_status: '',
      working_status: '',
      condition_status: '',
      equipment_category: '',
      company_name: '',
      area: '',
      zone: '',
      inspection_status: '',
    });
    setPage(1);
  }, []);

  // ── Effects ──
  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchStats(); fetchFilterOptions(); }, []);

  return {
    items, stats, filterOptions, loading,
    page, lastPage, total, perPage, setPage,
    sortBy, sortDir, handleSort,
    filters, updateFilter, resetFilters,
    fetchItems, fetchStats, fetchItem,
    createItem, updateItem, deleteItem, exportData,
  };
}
