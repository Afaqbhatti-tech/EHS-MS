import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../services/api';
import { fetchAllPages, buildFilterQuery, CARD_VIEW_PER_PAGE } from '../../../utils/fetchAllPages';

export interface Permit {
  id: string;
  permit_number: string;
  permit_type: string;
  title: string;
  area: string | null;
  phase: string | null;
  activity_type: string | null;
  description: string | null;
  contractor: string | null;
  issued_to: string | null;
  permit_date: string;
  permit_date_end: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  safety_measures: string | null;
  ppe_requirements: string | null;
  image_path: string | null;
  image_url: string | null;
  attachments: string[];
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  type_config: Record<string, string>;
  type_abbr: string;
  type_label: string;
  created_at: string;
  updated_at: string;
}

export interface PermitStats {
  kpis: {
    total: number;
    active: number;
    draft: number;
    expired: number;
    closed: number;
    cancelled: number;
  };
  byType: { permit_type: string; total: number; active: number; closed: number; expired: number }[];
  monthly: { month: number; total: number; active: number; closed: number; expired: number }[];
  byArea: { area: string; total: number }[];
  byContractor: { contractor: string; total: number }[];
}

export interface PermitFilters {
  search: string;
  permit_type: string;
  status: string;
  area: string;
  contractor: string;
  period: string;
  date_from: string;
  date_to: string;
  per_page: number;
  page: number;
}

export interface PermitFilterOptions {
  areas: string[];
  contractors: string[];
  applicants: string[];
}

export interface CalendarPermit {
  id: string;
  permit_number: string;
  title: string;
  permit_type: string;
  type_label: string;
  abbr: string;
  color: string;
  lightColor: string;
  textColor: string;
  permit_date: string;
  permit_date_end: string | null;
  area: string | null;
  status: string;
}

interface PaginatedResponse {
  data: Permit[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

const DEFAULT_FILTERS: PermitFilters = {
  search: '',
  permit_type: '',
  status: '',
  area: '',
  contractor: '',
  period: '',
  date_from: '',
  date_to: '',
  per_page: 20,
  page: 1,
};

export function usePermits() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [stats, setStats] = useState<PermitStats | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarPermit[]>([]);
  const [filterOptions, setFilterOptions] = useState<PermitFilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 20 });
  const [filters, setFilters] = useState<PermitFilters>(DEFAULT_FILTERS);

  const fetchPermits = useCallback(async (f: PermitFilters) => {
    setLoading(true);
    setError(null);
    try {
      if (f.per_page >= CARD_VIEW_PER_PAGE) {
        // Card mode: fetch all pages and aggregate
        const result = await fetchAllPages<Permit>('/permits', buildFilterQuery(f));
        setPermits(result.data);
        setPagination({
          currentPage: 1,
          lastPage: 1,
          total: result.total,
          perPage: result.total || CARD_VIEW_PER_PAGE,
        });
      } else {
        // Table mode: normal paginated fetch
        const params = Object.entries(f)
          .filter(([, v]) => v !== '' && v !== 0)
          .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
          .join('&');
        const data = await api.get<PaginatedResponse>(`/permits?${params}`);
        setPermits(data.data || []);
        setPagination({
          currentPage: data.page,
          lastPage: data.last_page,
          total: data.total,
          perPage: data.per_page,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load permits');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await api.get<PermitStats>('/permits/stats');
      setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const data = await api.get<PermitFilterOptions>('/permits/filters/options');
      setFilterOptions(data);
    } catch (err) {
      console.error('Filter options error:', err);
    }
  }, []);

  const fetchCalendar = useCallback(async (month: number, year: number) => {
    try {
      const data = await api.get<CalendarPermit[]>(`/permits/calendar?month=${month}&year=${year}`);
      setCalendarData(data);
    } catch (err) {
      console.error('Calendar fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchPermits(filters);
  }, [filters, fetchPermits]);

  useEffect(() => {
    fetchStats();
    fetchFilterOptions();
  }, [fetchStats, fetchFilterOptions]);

  const createPermit = async (data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; permit: Permit }>('/permits', data);
    await fetchPermits(filters);
    await fetchStats();
    return result;
  };

  const updatePermit = async (id: string, data: Record<string, unknown>) => {
    const result = await api.put<{ message: string; permit: Permit }>(`/permits/${id}`, data);
    await fetchPermits(filters);
    await fetchStats();
    return result;
  };

  const updateStatus = async (id: string, statusData: { status: string }) => {
    const result = await api.patch<{ message: string; permit: Permit }>(`/permits/${id}/status`, statusData);
    setPermits(prev => prev.map(p => p.id === id ? result.permit : p));
    await fetchStats();
    return result;
  };

  const deletePermit = async (id: string) => {
    await api.delete(`/permits/${id}`);
    await fetchPermits(filters);
    await fetchStats();
  };

  const uploadFiles = async (files: File[]) => {
    const result = await api.upload<{ files: { filename: string; originalName: string; size: number; mimetype: string }[] }>('/permits/upload', files);
    return result.files;
  };

  const exportData = (format: string = 'csv') => {
    if (format === 'copy') {
      const headers = ['Permit Number', 'Type', 'Title', 'Area', 'Start Date', 'End Date', 'Status'];
      const text = headers.join('\t') + '\n' + permits.map(r =>
        [r.permit_number || '', r.permit_type || '', r.title || '', r.area || '', r.permit_date || '', r.permit_date_end || '', r.status || ''].join('\t')
      ).join('\n');
      navigator.clipboard.writeText(text);
      return;
    }
    const params = Object.entries(filters)
      .filter(([, v]) => v !== '' && v !== 0)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    api.download(`/permits/export?format=${format}&${params}`);
  };

  return {
    permits,
    stats,
    calendarData,
    filterOptions,
    loading,
    statsLoading,
    error,
    pagination,
    filters,
    setFilters,
    createPermit,
    updatePermit,
    updateStatus,
    deletePermit,
    uploadFiles,
    exportData,
    fetchCalendar,
    refresh: () => {
      setIsRefreshing(true);
      Promise.all([fetchPermits(filters), fetchStats()]).finally(() => setIsRefreshing(false));
    },
    isRefreshing,
  };
}
