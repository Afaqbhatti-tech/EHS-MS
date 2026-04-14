import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../services/api';

// ── Types ────────────────────────────────────────────────

export interface MomListItem {
  id: string;
  mom_code: string;
  ref_number: string;
  week_number: number;
  year: number;
  title: string;
  meeting_date: string;
  meeting_time: string | null;
  meeting_location: string | null;
  meeting_type: string | null;
  chaired_by: string | null;
  client_name: string | null;
  site_project: string | null;
  status: 'Open' | 'In Progress' | 'Closed';
  total_points: number;
  open_points: number;
  in_progress_points: number;
  resolved_points: number;
  closed_points: number;
  overdue_points: number;
  has_attachments: boolean;
  previous_mom_id: string | null;
  distributed_at: string | null;
  points_count: number;
  created_at: string;
  updated_at: string;
}

export interface MomDetail extends MomListItem {
  minutes_prepared_by: string | null;
  attendees: Attendee[];
  summary: string | null;
  notes: string | null;
  attachment_urls: AttachmentFile[];
  attachments: string[];
  created_by: { id: string; name: string } | null;
  previous_mom: MomRef | null;
  next_mom: MomRef | null;
  points: MomPointItem[];
  previous_mom_open_points: MomPointItem[];
}

export interface Attendee {
  name: string;
  company?: string;
  role?: string;
}

export interface AttachmentFile {
  path: string;
  url: string;
  filename: string;
}

export interface MomRef {
  id: string;
  mom_code: string;
  week_number: number;
  year: number;
  title: string;
  meeting_date: string;
  open_points?: number;
  total_points?: number;
}

export interface PointPhoto {
  id: number;
  mom_point_id: number;
  file_name: string;
  original_name: string;
  file_path: string;
  url: string;
  file_size: number;
  mime_type: string;
  caption: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface MomPointItem {
  id: number;
  point_code: string;
  mom_id: string;
  point_number: number;
  title: string;
  description: string | null;
  category: string;
  raised_by: string | null;
  assigned_to: string | null;
  assigned_to_id: string | null;
  status: PointStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  due_date: string | null;
  completion_percentage: number;
  remarks: string | null;
  is_recurring: boolean;
  is_overdue: boolean;
  days_overdue: number | null;
  carry_count: number;
  carried_from_point_id: number | null;
  original_mom_id: string | null;
  resolved_at: string | null;
  resolution_summary: string | null;
  assignee: { id: string; name: string } | null;
  mom?: MomRef;
  updates: PointUpdateItem[];
  photos: PointPhoto[];
  created_at: string;
  updated_at: string;
}

export interface ExtractedPoint {
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assigned_to?: string | null;
  due_date?: string | null;
  category?: string;
  section_name?: string | null;
  remarks?: string | null;
  source_row_no?: number;
  source_slide_no?: number | null;
}

export interface ImportPreviewResult {
  message: string;
  extracted_points: ExtractedPoint[];
  document_metadata: {
    week_number: number;
    year: number;
    title: string;
    meeting_date: string | null;
    file_name: string;
  };
  file_path: string;
  total_extracted?: number;
  existing_mom?: MomListItem;
  requires_action?: 'duplicate';
}

export interface ImportResult {
  message: string;
  mom: MomListItem;
  summary: {
    created: number;
    skipped?: number;
    total_points: number;
    mode: string;
  };
}

export type PointStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed' | 'Pending' | 'Blocked' | 'Carried Forward';

export interface PointUpdateItem {
  id: number;
  old_status: string | null;
  new_status: string | null;
  old_completion: number | null;
  new_completion: number | null;
  update_note: string;
  updated_by_name: string | null;
  week_number: number;
  year: number;
  created_at: string;
}

export interface MomStats {
  kpis: {
    total_moms: number;
    total_points: number;
    open_points: number;
    in_progress: number;
    resolved: number;
    overdue: number;
    this_week: number;
  };
  weekly_trend: { week_number: number; year: number; total: number; open: number; resolved: number }[];
  by_category: { category: string; total: number }[];
  by_assignee: { assigned_to: string; total: number; open: number; resolved: number }[];
  recent_overdue: {
    id: number; point_code: string; title: string; status: string;
    priority: string; assigned_to: string; due_date: string;
    category: string; week_number: number; year: number; days_overdue: number;
  }[];
}

export interface MomFilters {
  search: string;
  year: string;
  week_number: string;
  meeting_type: string;
  status: string;
  has_open_points: string;
  has_overdue: string;
  date_from: string;
  date_to: string;
  period: string;
  sort_by: string;
  sort_dir: string;
  per_page: number;
  page: number;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

const DEFAULT_FILTERS: MomFilters = {
  search: '',
  year: '',
  week_number: '',
  meeting_type: '',
  status: '',
  has_open_points: '',
  has_overdue: '',
  date_from: '',
  date_to: '',
  period: '',
  sort_by: 'meeting_date',
  sort_dir: 'desc',
  per_page: 20,
  page: 1,
};

// ── Hook ─────────────────────────────────────────────────

export interface AnalysisResult {
  analysis_id: number;
  file_path: string;
  file_name: string;
  document_type: string;
  confidence: number | null;
  summary: string;
  suggestions: Record<string, unknown>;
  missing_fields: string[];
}

export function useMom() {
  const [moms, setMoms] = useState<MomListItem[]>([]);
  const [stats, setStats] = useState<MomStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 20 });
  const [filters, setFilters] = useState<MomFilters>(DEFAULT_FILTERS);

  // AI Document Analysis state
  const [analysing, setAnalysing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const buildParams = (f: Record<string, unknown>) =>
    Object.entries(f)
      .filter(([, v]) => v !== '' && v !== 0 && v !== null && v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');

  const fetchMoms = useCallback(async (f: MomFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<PaginatedResponse<MomListItem>>(`/mom?${buildParams(f)}`);
      setMoms(data.data || []);
      setPagination({
        currentPage: data.page,
        lastPage: data.last_page,
        total: data.total,
        perPage: data.per_page,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load MOMs');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (year?: string) => {
    setStatsLoading(true);
    try {
      const params = year ? `?year=${year}` : '';
      const data = await api.get<MomStats>(`/mom/stats${params}`);
      setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMoms(filters);
  }, [filters, fetchMoms]);

  useEffect(() => {
    fetchStats(filters.year || undefined);
  }, [fetchStats, filters.year]);

  const createMom = async (data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; mom: MomListItem }>('/mom', data);
    await fetchMoms(filters);
    await fetchStats(filters.year || undefined);
    return result;
  };

  const updateMom = async (id: string, data: Record<string, unknown>) => {
    const result = await api.put<{ message: string; mom: MomListItem }>(`/mom/${id}`, data);
    await fetchMoms(filters);
    await fetchStats(filters.year || undefined);
    return result;
  };

  const deleteMom = async (id: string) => {
    await api.delete(`/mom/${id}`);
    await fetchMoms(filters);
    await fetchStats(filters.year || undefined);
  };

  const getMomDetail = async (id: string) => {
    return api.get<MomDetail>(`/mom/${id}`);
  };

  const addPoint = async (momId: string, data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; point: MomPointItem }>(`/mom/${momId}/points`, data);
    await fetchMoms(filters);
    await fetchStats(filters.year || undefined);
    return result;
  };

  const updatePoint = async (momId: string, pointId: number, data: Record<string, unknown>) => {
    const result = await api.put<{ message: string; point: MomPointItem }>(`/mom/${momId}/points/${pointId}`, data);
    await fetchMoms(filters);
    await fetchStats(filters.year || undefined);
    return result;
  };

  const deletePoint = async (momId: string, pointId: number) => {
    await api.delete(`/mom/${momId}/points/${pointId}`);
    await fetchMoms(filters);
    await fetchStats(filters.year || undefined);
  };

  const carryForward = async (momId: string, pointIds: number[]) => {
    const result = await api.post<{ message: string; carried: number; new_points: MomPointItem[] }>(
      `/mom/${momId}/carry-forward`,
      { point_ids: pointIds }
    );
    await fetchStats(filters.year || undefined);
    return result;
  };

  const searchPoints = async (searchFilters: Record<string, unknown>) => {
    return api.get<PaginatedResponse<MomPointItem>>(`/mom/points/search?${buildParams(searchFilters)}`);
  };

  const uploadFiles = async (files: File[]) => {
    const result = await api.upload<{ files: { filename: string; originalName: string; size: number; mimetype: string }[] }>('/mom/upload', files);
    return result.files;
  };

  const importDocument = async (file: File, options?: {
    week_number?: number; year?: number; title?: string; meeting_date?: string;
    mode?: 'create' | 'merge' | 'replace'; preview_only?: boolean;
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.week_number) formData.append('week_number', String(options.week_number));
    if (options?.year) formData.append('year', String(options.year));
    if (options?.title) formData.append('title', options.title);
    if (options?.meeting_date) formData.append('meeting_date', options.meeting_date);
    if (options?.mode) formData.append('mode', options.mode);
    if (options?.preview_only) formData.append('preview_only', '1');

    const data = await api.uploadForm<ImportResult & { status?: number }>('/mom/import', formData);

    // Refresh after import unless preview
    if (!options?.preview_only) {
      await fetchMoms(filters);
      await fetchStats(filters.year || undefined);
    }

    return data;
  };

  const confirmImport = async (params: {
    file_path: string; week_number: number; year: number; title: string;
    meeting_date?: string; mode: 'create' | 'merge' | 'replace';
    points?: ExtractedPoint[]; skip_indices?: number[];
  }) => {
    const result = await api.post<ImportResult>('/mom/import/confirm', params);
    await fetchMoms(filters);
    await fetchStats(filters.year || undefined);
    return result;
  };

  const uploadPointPhoto = async (momId: string, pointId: number, files: File[], caption?: string) => {
    const formData = new FormData();
    files.forEach(f => formData.append('photos[]', f));
    if (caption) formData.append('caption', caption);

    return api.uploadForm<{ message: string; photos: PointPhoto[] }>(`/mom/${momId}/points/${pointId}/photos`, formData);
  };

  const deletePointPhoto = async (momId: string, pointId: number, photoId: number) => {
    await api.delete(`/mom/${momId}/points/${pointId}/photos/${photoId}`);
  };

  const analyseMomDocument = async (file: File): Promise<AnalysisResult | null> => {
    setAnalysing(true);
    setAnalysisResult(null);
    setAnalysisError(null);

    try {
      const fd = new FormData();
      fd.append('document', file);

      const response = await api.uploadForm<AnalysisResult>('/mom/parse-document', fd);

      setAnalysisResult(response);
      return response;
    } catch (err: any) {
      const msg = err.message ?? 'Document analysis failed.';
      setAnalysisError(msg);
      return null;
    } finally {
      setAnalysing(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  const exportMoms = (format: string = 'csv') => {
    if (format === 'copy') {
      const headers = ['MOM Code', 'Meeting Date', 'Title', 'Status', 'Total Points'];
      const text = headers.join('\t') + '\n' + moms.map(r =>
        [r.mom_code || '', r.meeting_date || '', r.title || '', r.status || '', r.total_points ?? ''].join('\t')
      ).join('\n');
      navigator.clipboard.writeText(text);
      return;
    }
    const params = buildParams(filters);
    api.download(`/mom/export?format=${format}&${params}`);
  };

  return {
    moms,
    stats,
    loading,
    statsLoading,
    error,
    pagination,
    filters,
    setFilters,
    createMom,
    updateMom,
    deleteMom,
    getMomDetail,
    addPoint,
    updatePoint,
    deletePoint,
    carryForward,
    searchPoints,
    uploadFiles,
    importDocument,
    confirmImport,
    uploadPointPhoto,
    deletePointPhoto,
    exportMoms,
    analysing,
    analysisResult,
    analysisError,
    analyseMomDocument,
    clearAnalysis,
    refresh: () => {
      setIsRefreshing(true);
      Promise.all([fetchMoms(filters), fetchStats(filters.year || undefined)]).finally(() => setIsRefreshing(false));
    },
    isRefreshing,
  };
}
