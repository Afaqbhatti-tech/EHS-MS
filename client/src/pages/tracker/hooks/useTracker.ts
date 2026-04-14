import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../services/api';

// ── Types ────────────────────────────────────────────────

export interface TrackerCategory {
  id: number;
  key: string;
  label: string;
  group_name: string;
  icon: string;
  color: string;
  light_color: string;
  text_color: string;
  has_plate: boolean;
  has_swl: boolean;
  has_tuv: boolean;
  has_cert: boolean;
  insp_freq_days: number;
  tuv_freq_days: number | null;
  template_type: string;
  description: string;
  active_count: number;
  overdue_count: number;
  tuv_overdue_count: number;
  due_soon_count: number;
  cert_expired_count: number;
}

export interface ChecklistResponse {
  id: string;
  result: 'pass' | 'fail' | 'na';
  note?: string;
}

export interface ChecklistData {
  template_key: string;
  checklist_item: {
    id: string;
    item_code: string;
    name: string;
    health_condition: string;
    status: string;
  } | null;
  latest_inspection: {
    id: string;
    inspection_code: string;
    inspection_date: string;
    inspector_name: string;
    overall_result: string;
    health_condition_found: string;
    notes: string | null;
    findings: string | null;
  } | null;
  checklist_responses: ChecklistResponse[] | null;
}

export interface ChecklistMatchItem {
  id: string;
  item_code: string;
  name: string;
  serial_number: string | null;
  plate_number: string | null;
  status: string;
  health_condition: string;
}

export interface TrackerRecord {
  id: number;
  record_code: string;
  category_id: number;
  category_key: string;
  category_label: string;
  category_color: string;
  category_light_color: string;
  category_text_color: string;
  template_type: string;
  equipment_name: string;
  item_subtype: string | null;
  serial_number: string | null;
  make_model: string | null;
  location_area: string | null;
  assigned_to: string | null;
  onboarding_date: string | null;
  status: string;
  condition: string;
  plate_number: string | null;
  swl: string | null;
  load_capacity_tons: number | null;
  checker_number: string | null;
  sticker_number: string | null;
  certificate_number: string | null;
  certificate_expiry: string | null;
  certificate_issuer: string | null;
  tuv_inspection_date: string | null;
  tuv_expiry_date: string | null;
  tuv_inspector: string | null;
  tuv_company: string | null;
  tuv_certificate_number: string | null;
  last_internal_inspection_date: string | null;
  next_internal_inspection_date: string | null;
  inspected_by: string | null;
  expiry_date: string | null;
  is_overdue: boolean;
  days_until_due: number | null;
  is_tuv_overdue: boolean;
  days_until_tuv: number | null;
  is_cert_expired: boolean;
  due_soon: boolean;
  tuv_expiring_soon: boolean;
  extinguisher_type: string | null;
  weight_kg: number | null;
  civil_defense_tag: boolean;
  manufacture_date: string | null;
  retirement_date: string | null;
  last_drop_arrest: boolean;
  drop_arrest_date: string | null;
  voltage_rating: string | null;
  electrical_test_date: string | null;
  electrical_test_expiry: string | null;
  toolbox_tag_colour: string | null;
  has_open_defect: boolean;
  defect_description: string | null;
  defect_reported_date: string | null;
  total_inspections_count: number;
  last_inspection_result: string | null;
  last_inspector_name: string | null;
  image_url: string | null;
  notes: string | null;
  checklist_item_id?: string | null;
  checklist_data?: ChecklistData | null;
  inspections?: TrackerInspection[];
  created_at: string;
  updated_at: string;
}

export interface TrackerInspection {
  id: number;
  log_code: string;
  tracker_record_id: number;
  category_key: string;
  sticker_number: string | null;
  plate_number_at_insp: string | null;
  inspection_date: string;
  inspection_type: string;
  inspection_purpose: string | null;
  inspection_frequency: string | null;
  inspector_name: string;
  inspector_company: string | null;
  result: string;
  condition_found: string;
  next_inspection_date: string | null;
  certificate_issued: boolean;
  certificate_number: string | null;
  certificate_expiry: string | null;
  tuv_updated: boolean;
  findings: string | null;
  corrective_actions: string | null;
  visual_condition_notes: string | null;
  defect_found: boolean;
  defect_detail: string | null;
  extinguisher_weight_kg: number | null;
  civil_defense_tag_ok: boolean | null;
  harness_condition: string | null;
  drop_arrest_occurred: boolean;
  ladder_type: string | null;
  checklist_data: unknown[] | null;
  checklist_file_path: string | null;
  checklist_image_path: string | null;
  additional_images: string[] | null;
  supporting_docs: string[] | null;
  checklist_file_url: string | null;
  checklist_image_url: string | null;
  additional_image_urls: string[];
  supporting_doc_urls: string[];
  overdue_at_time: boolean;
  days_overdue_at_time: number | null;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  recorded_by: number | null;
  record?: {
    id: number;
    record_code: string;
    equipment_name: string;
    item_subtype: string | null;
    category_key: string;
    plate_number: string | null;
    serial_number: string | null;
    sticker_number: string | null;
    status?: string;
    condition?: string;
    category_id?: number;
    category?: TrackerCategory;
  };
  created_at: string;
}

export interface TrackerStats {
  kpis: {
    total: number;
    active: number;
    overdue: number;
    tuv_overdue: number;
    due_soon: number;
    cert_expired: number;
    out_of_service: number;
  };
  byCategory: {
    key: string; label: string; color: string; light_color: string; text_color: string;
    active_count: number; overdue_count: number; due_soon_count: number;
  }[];
  overdueItems: { id: number; record_code: string; equipment_name: string; category_key: string; days_until_due: number }[];
  tuvExpiringSoon: { id: number; record_code: string; equipment_name: string; category_key: string; tuv_expiry_date: string; days_until_tuv: number }[];
}

export interface InspectionStats {
  kpis: {
    total_inspections: number;
    this_month: number;
    pass_count: number;
    fail_count: number;
    with_defects: number;
    with_checklists: number;
  };
  monthly: { month: number; total: number; pass_count: number; fail_count: number }[];
  byCategory: { category_key: string; total: number; pass_count: number; fail_count: number }[];
  byInspector: { inspector_name: string; total: number }[];
  byResult: { result: string; total: number }[];
  upcoming: {
    id: number; record_code: string; equipment_name: string;
    item_subtype: string | null; category_key: string;
    next_internal_inspection_date: string; days_until_due: number; is_overdue: boolean;
    category?: TrackerCategory;
  }[];
}

export interface TrackerFilters {
  search: string;
  category_key: string;
  status: string;
  condition: string;
  location_area: string;
  inspected_by: string;
  period: string;
  date_from: string;
  date_to: string;
  overdue: string;
  due_soon: string;
  tuv_overdue: string;
  cert_expired: string;
  sort_by: string;
  sort_dir: string;
  per_page: number;
  page: number;
}

export interface InspectionFilters {
  search: string;
  category_key: string;
  item_subtype: string;
  tracker_record_id: string;
  inspection_type: string;
  inspection_purpose: string;
  result: string;
  inspector_name: string;
  period: string;
  date_from: string;
  date_to: string;
  was_overdue: string;
  sort_by: string;
  sort_dir: string;
  per_page: number;
  page: number;
}

export interface SearchItem {
  id: number;
  record_code: string;
  equipment_name: string;
  item_subtype: string | null;
  category_key: string;
  category_label: string | null;
  category_color: string | null;
  category_light_color: string | null;
  category_text_color: string | null;
  status: string;
  condition: string;
  plate_number: string | null;
  serial_number: string | null;
  certificate_number: string | null;
  sticker_number: string | null;
  last_inspection_date: string | null;
  next_due_date: string | null;
  is_overdue: boolean;
  days_until_due: number | null;
  tuv_expiry_date: string | null;
  is_tuv_overdue: boolean;
  last_inspector: string | null;
  last_result: string | null;
  total_inspections: number;
}

export interface ImportResult {
  batch_id: string;
  total_rows: number;
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
  imported_records: string[];
}

// ── Defaults ─────────────────────────────────────────────

const DEFAULT_FILTERS: TrackerFilters = {
  search: '', category_key: '', status: '', condition: '',
  location_area: '', inspected_by: '', period: '',
  date_from: '', date_to: '',
  overdue: '', due_soon: '', tuv_overdue: '', cert_expired: '',
  sort_by: 'created_at', sort_dir: 'desc',
  per_page: 25, page: 1,
};

const DEFAULT_INSPECTION_FILTERS: InspectionFilters = {
  search: '', category_key: '', item_subtype: '',
  tracker_record_id: '', inspection_type: '',
  inspection_purpose: '', result: '', inspector_name: '',
  period: '', date_from: '', date_to: '', was_overdue: '',
  sort_by: 'inspection_date', sort_dir: 'desc',
  per_page: 25, page: 1,
};

// ── Hook ─────────────────────────────────────────────────

interface PaginatedResponse {
  data: TrackerRecord[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

interface InspectionPaginatedResponse {
  data: TrackerInspection[];
  total: number;
  current_page: number;
  per_page: number;
  last_page: number;
}

export function useTracker() {
  const [records, setRecords] = useState<TrackerRecord[]>([]);
  const [categories, setCategories] = useState<TrackerCategory[]>([]);
  const [stats, setStats] = useState<TrackerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 25 });
  const [filters, setFilters] = useState<TrackerFilters>(DEFAULT_FILTERS);

  // Inspection-specific state
  const [allInspections, setAllInspections] = useState<TrackerInspection[]>([]);
  const [inspectionStats, setInspectionStatsState] = useState<InspectionStats | null>(null);
  const [inspectionPagination, setInspPagination] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 25 });
  const [inspectionFilters, setInspectionFilters] = useState<InspectionFilters>(DEFAULT_INSPECTION_FILTERS);
  const [inspectionsLoading, setInspectionsLoading] = useState(false);
  const [inspectionStatsLoading, setInspectionStatsLoading] = useState(false);

  const fetchRecords = useCallback(async (f: TrackerFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = Object.entries(f)
        .filter(([, v]) => v !== '' && v !== 0)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      const data = await api.get<PaginatedResponse>(`/tracker/records?${params}`);
      setRecords(data.data || []);
      setPagination({
        currentPage: data.page,
        lastPage: data.last_page,
        total: data.total,
        perPage: data.per_page,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load tracker records');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.get<TrackerCategory[]>('/tracker/categories');
      setCategories(data);
    } catch (err) {
      console.error('Tracker categories fetch error:', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await api.get<TrackerStats>('/tracker/stats');
      setStats(data);
    } catch (err) {
      console.error('Tracker stats fetch error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords(filters);
  }, [filters, fetchRecords]);

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, [fetchCategories, fetchStats]);

  const createRecord = async (data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; record: TrackerRecord }>('/tracker/records', data);
    await fetchRecords(filters);
    await fetchStats();
    await fetchCategories();
    return result;
  };

  const updateRecord = async (id: number, data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; record: TrackerRecord }>(`/tracker/records/${id}`, data);
    await fetchRecords(filters);
    await fetchStats();
    return result;
  };

  const deleteRecord = async (id: number) => {
    await api.delete(`/tracker/records/${id}`);
    await fetchRecords(filters);
    await fetchStats();
    await fetchCategories();
  };

  const getRecordDetail = async (id: number) => {
    return api.get<TrackerRecord>(`/tracker/records/${id}`);
  };

  const recordInspection = async (recordId: number, data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; inspection: TrackerInspection; record: TrackerRecord }>(
      `/tracker/records/${recordId}/inspections`, data
    );
    await fetchRecords(filters);
    await fetchStats();
    await fetchCategories();
    return result;
  };

  // ── Category management ─────────────────────────────
  const createCategory = async (data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; category: TrackerCategory }>('/tracker/categories', data);
    await fetchCategories();
    return result;
  };

  const updateCategory = async (id: number, data: Record<string, unknown>) => {
    const result = await api.put<{ message: string; category: TrackerCategory }>(`/tracker/categories/${id}`, data);
    await fetchCategories();
    return result;
  };

  const deleteCategory = async (id: number) => {
    await api.delete(`/tracker/categories/${id}`);
    await fetchCategories();
    await fetchStats();
  };

  const renameGroup = async (oldName: string, newName: string) => {
    await api.put('/tracker/categories/rename-group', { old_name: oldName, new_name: newName });
    await fetchCategories();
  };

  const exportRecords = (format: string = 'csv') => {
    if (format === 'copy') {
      const headers = ['Record Code', 'Equipment Name', 'Category', 'Condition', 'Status', 'Next Inspection', 'Location'];
      const text = headers.join('\t') + '\n' + records.map(r =>
        [r.record_code || '', r.equipment_name || '', r.category_label || '', r.condition || '', r.status || '', r.next_internal_inspection_date || '', r.location_area || ''].join('\t')
      ).join('\n');
      navigator.clipboard.writeText(text);
      return;
    }
    const params = Object.entries(filters)
      .filter(([, v]) => v !== '' && v !== 0)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    api.download(`/tracker/export?format=${format}&${params}`);
  };

  const downloadTemplate = (categoryKey: string) => {
    api.download(`/tracker/import-template?category_key=${categoryKey}`);
  };

  const bulkImport = async (file: File, categoryKey: string): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category_key', categoryKey);

    const result = await api.uploadForm<ImportResult>('/tracker/import', formData);
    await fetchRecords(filters);
    await fetchStats();
    await fetchCategories();
    return result;
  };

  // ── Inspection-specific API methods ─────────────────────

  const fetchAllInspections = useCallback(async (f: InspectionFilters) => {
    setInspectionsLoading(true);
    try {
      const params = Object.entries(f)
        .filter(([, v]) => v !== '' && v !== 0)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      const data = await api.get<InspectionPaginatedResponse>(`/tracker/inspections?${params}`);
      setAllInspections(data.data || []);
      setInspPagination({
        currentPage: data.current_page,
        lastPage: data.last_page,
        total: data.total,
        perPage: data.per_page,
      });
    } catch (err: any) {
      console.error('Inspections fetch error:', err);
    } finally {
      setInspectionsLoading(false);
    }
  }, []);

  const fetchInspectionStats = useCallback(async () => {
    setInspectionStatsLoading(true);
    try {
      const data = await api.get<InspectionStats>('/tracker/inspections/stats');
      setInspectionStatsState(data);
    } catch (err) {
      console.error('Inspection stats fetch error:', err);
    } finally {
      setInspectionStatsLoading(false);
    }
  }, []);

  const searchItems = useCallback(async (params: { category_key?: string; item_subtype?: string; q?: string }) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join('&');
    return api.get<SearchItem[]>(`/tracker/inspection/search-items?${qs}`);
  }, []);

  const showInspection = async (logId: number) => {
    return api.get<TrackerInspection>(`/tracker/inspections/${logId}`);
  };

  const updateInspection = async (logId: number, data: Record<string, unknown>) => {
    return api.put<{ message: string; log: TrackerInspection }>(`/tracker/inspections/${logId}`, data);
  };

  const deleteInspection = async (logId: number) => {
    return api.delete<{ message: string }>(`/tracker/inspections/${logId}`);
  };

  // ── Checklist integration methods ─────────────────────

  const findChecklistMatches = async (recordId: number, search?: string) => {
    const qs = search ? `?q=${encodeURIComponent(search)}` : '';
    return api.get<ChecklistMatchItem[]>(`/tracker/records/${recordId}/checklist-matches${qs}`);
  };

  const linkChecklist = async (recordId: number, checklistItemId: string) => {
    return api.post<{ message: string; checklist_data: ChecklistData }>(
      `/tracker/records/${recordId}/link-checklist`,
      { checklist_item_id: checklistItemId }
    );
  };

  const saveChecklist = async (recordId: number, data: {
    checklist_item_id?: string;
    checklist_responses: ChecklistResponse[];
    inspector_name: string;
    inspection_date?: string;
    notes?: string;
  }) => {
    return api.post<{ message: string; checklist_data: ChecklistData }>(
      `/tracker/records/${recordId}/save-checklist`,
      data
    );
  };

  const exportInspections = (filterParams: InspectionFilters, format: string = 'csv') => {
    if (format === 'copy') {
      const headers = ['Log Code', 'Record Code', 'Equipment Name', 'Inspection Date', 'Type', 'Inspector', 'Result', 'Condition Found'];
      const text = headers.join('\t') + '\n' + allInspections.map(r =>
        [r.log_code || '', r.record?.record_code || '', r.record?.equipment_name || '', r.inspection_date || '', r.inspection_type || '', r.inspector_name || '', r.result || '', r.condition_found || ''].join('\t')
      ).join('\n');
      navigator.clipboard.writeText(text);
      return;
    }
    const params = Object.entries(filterParams)
      .filter(([, v]) => v !== '' && v !== 0)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    api.download(`/tracker/inspections/export?format=${format}&${params}`);
  };

  return {
    records, categories, stats, fetchStats,
    loading, statsLoading, error,
    pagination, filters, setFilters,
    createRecord, updateRecord, deleteRecord,
    getRecordDetail, recordInspection,
    exportRecords, downloadTemplate, bulkImport,
    // Inspection-specific
    allInspections, inspectionStats, inspectionPagination,
    inspectionFilters, setInspectionFilters,
    inspectionsLoading, inspectionStatsLoading,
    fetchAllInspections, fetchInspectionStats,
    searchItems, showInspection, updateInspection, deleteInspection,
    exportInspections,
    // Checklist integration
    findChecklistMatches, linkChecklist, saveChecklist,
    // Category management
    createCategory, updateCategory, deleteCategory, renameGroup,
    refresh: () => {
      setIsRefreshing(true);
      Promise.all([fetchRecords(filters), fetchStats(), fetchCategories()]).finally(() => setIsRefreshing(false));
    },
    isRefreshing,
  };
}
