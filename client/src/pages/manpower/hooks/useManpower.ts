import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { fetchAllPages, buildFilterQuery, CARD_VIEW_PER_PAGE } from '../../../utils/fetchAllPages';

export interface Worker {
  id: string;
  worker_id: string;
  name: string;
  employee_number: string | null;
  profession: string | null;
  department: string | null;
  company: string | null;
  nationality: string | null;
  joining_date: string | null;
  demobilization_date: string | null;
  induction_status: 'Done' | 'Not Done' | 'Pending';
  induction_date: string | null;
  induction_by: string | null;
  status: 'Active' | 'Inactive' | 'Demobilised' | 'Suspended';
  id_number: string | null;
  iqama_number: string | null;
  contact_number: string | null;
  emergency_contact: string | null;
  remarks: string | null;
  days_on_site: number;
  training_profile_id: string | null;
  hours_stats?: {
    total_days_recorded: number;
    total_hours: number;
    total_overtime: number;
    days_present: number;
    days_absent: number;
  };
  created_at: string;
  updated_at: string;
}

export interface ManpowerStats {
  kpis: {
    total: number;
    active: number;
    inducted: number;
    not_inducted: number;
    demobilised: number;
    induction_rate: number;
    legacy_review_count: number;
  };
  byProfession: { profession: string; total: number; inducted: number }[];
  byCompany: { company: string; total: number }[];
  monthlyJoinings: { month: number; total: number }[];
  inductionBreakdown: { induction_status: string; total: number }[];
  hoursThisMonth: {
    total_regular: number;
    total_overtime: number;
    workers_recorded: number;
  };
}

export interface ManpowerFilters {
  search: string;
  profession: string;
  induction_status: string;
  status: string;
  company: string;
  department: string;
  period: string;
  joined_from: string;
  joined_to: string;
  sort_by: string;
  sort_dir: string;
  per_page: number;
  page: number;
  legacy_review: string;
}

export interface FilterOptions {
  professions: string[];
  companies: string[];
  departments: string[];
  nationalities: string[];
}

export interface WorkerHoursRecord {
  id: string;
  worker_id: string;
  work_date: string;
  day_name: string | null;
  shift: 'Day' | 'Night' | 'Split';
  hours_worked: number;
  overtime_hours: number;
  attendance_status: string;
  site_area: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface HoursSummary {
  total_regular: number;
  total_overtime: number;
  days_recorded: number;
  days_present: number;
}

interface PaginatedResponse {
  data: Worker[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

const DEFAULT_FILTERS: ManpowerFilters = {
  search: '',
  profession: '',
  induction_status: '',
  status: '',
  company: '',
  department: '',
  period: '',
  joined_from: '',
  joined_to: '',
  sort_by: 'created_at',
  sort_dir: 'desc',
  per_page: 25,
  page: 1,
  legacy_review: '',
};

export function useManpower() {
  const queryClient = useQueryClient();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [stats, setStats] = useState<ManpowerStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 25 });
  const [filters, setFilters] = useState<ManpowerFilters>(DEFAULT_FILTERS);

  const fetchWorkers = useCallback(async (f: ManpowerFilters) => {
    setLoading(true);
    setError(null);
    try {
      if (f.per_page >= CARD_VIEW_PER_PAGE) {
        // Card mode: fetch all pages and aggregate
        const result = await fetchAllPages<Worker>('/workers', buildFilterQuery(f));
        setWorkers(result.data);
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
        const data = await api.get<PaginatedResponse>(`/workers?${params}`);
        setWorkers(data.data || []);
        setPagination({
          currentPage: data.page,
          lastPage: data.last_page,
          total: data.total,
          perPage: data.per_page,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load workers');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await api.get<ManpowerStats>('/workers/stats');
      setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const data = await api.get<FilterOptions>('/workers/filters/options');
      setFilterOptions(data);
    } catch (err) {
      console.error('Filter options error:', err);
    }
  }, []);

  useEffect(() => {
    fetchWorkers(filters);
  }, [filters, fetchWorkers]);

  useEffect(() => {
    fetchStats();
    fetchFilterOptions();
  }, [fetchStats, fetchFilterOptions]);

  const invalidateDependentQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createWorker = async (data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; worker: Worker }>('/workers', data);
    await fetchWorkers(filters);
    await fetchStats();
    invalidateDependentQueries();
    return result;
  };

  const updateWorker = async (id: string, data: Record<string, unknown>) => {
    const result = await api.put<{ message: string; worker: Worker }>(`/workers/${id}`, data);
    await fetchWorkers(filters);
    await fetchStats();
    invalidateDependentQueries();
    return result;
  };

  const deleteWorker = async (id: string) => {
    await api.delete(`/workers/${id}`);
    await fetchWorkers(filters);
    await fetchStats();
    invalidateDependentQueries();
  };

  const fetchWorkerDetail = async (id: string): Promise<Worker> => {
    return await api.get<Worker>(`/workers/${id}`);
  };

  const fetchWorkerHours = async (workerId: string, period?: string) => {
    const params = period ? `?period=${period}` : '';
    return await api.get<{ hours: { data: WorkerHoursRecord[] }; summary: HoursSummary }>(`/workers/${workerId}/hours${params}`);
  };

  const recordHours = async (workerId: string, data: Record<string, unknown>) => {
    return await api.post<{ message: string; record: WorkerHoursRecord }>(`/workers/${workerId}/hours`, data);
  };

  const deleteHoursRecord = async (workerId: string, recordId: string) => {
    return await api.delete(`/workers/${workerId}/hours/${recordId}`);
  };

  const migrateIqama = async (workerId: string, action: 'copy_to_iqama' | 'move_to_iqama') => {
    const result = await api.post<{ message: string; worker: Worker }>(`/workers/${workerId}/migrate-iqama`, { action });
    await fetchWorkers(filters);
    await fetchStats();
    invalidateDependentQueries();
    return result;
  };

  const exportData = (format: string = 'csv') => {
    if (format === 'copy') {
      const headers = ['Worker ID', 'Name', 'Company', 'Profession', 'Induction Status'];
      const text = headers.join('\t') + '\n' + workers.map(r =>
        [r.worker_id || '', r.name || '', r.company || '', r.profession || '', r.induction_status || ''].join('\t')
      ).join('\n');
      navigator.clipboard.writeText(text);
      return;
    }
    const params = Object.entries(filters)
      .filter(([, v]) => v !== '' && v !== 0)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    api.download(`/workers/export?format=${format}&${params}`);
  };

  return {
    workers, stats, filterOptions, loading, statsLoading, error, pagination,
    filters, setFilters,
    createWorker, updateWorker, deleteWorker,
    fetchWorkerDetail, fetchWorkerHours, recordHours, deleteHoursRecord,
    migrateIqama, exportData,
    refresh: () => {
      setIsRefreshing(true);
      Promise.all([fetchWorkers(filters), fetchStats()]).finally(() => setIsRefreshing(false));
    },
    isRefreshing,
  };
}
