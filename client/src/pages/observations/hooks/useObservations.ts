import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../services/api';

export interface Observation {
  id: string;
  observation_id: string;
  observation_date: string;
  reporting_officer_id: string | null;
  reporting_officer_name: string | null;
  area: string;
  contractor: string;
  category: string;
  observation_type: string;
  priority: 'High' | 'Medium' | 'Low';
  description: string;
  immediate_action: string | null;
  responsible_supervisor: string | null;
  proposed_rectification_date: string | null;
  status: 'Open' | 'In Progress' | 'Closed' | 'Verified' | 'Overdue' | 'Reopened';
  escalation_required: boolean;
  linked_permit_id: string | null;
  linked_incident_id: string | null;
  verified_by: string | null;
  verified_date: string | null;
  before_photos: string[];
  after_photos: string[];
  created_at: string;
  updated_at: string;
}

export interface ObservationStats {
  kpis: {
    total: number;
    open: number;
    in_progress: number;
    closed: number;
    verified: number;
    overdue: number;
    reopened: number;
  };
  monthly: { month: number; total: number; open: number; in_progress: number; closed: number; overdue: number }[];
  byCategory: { category: string; total: number }[];
  byContractor: { contractor: string; total: number }[];
  byOfficer: { officer_name: string; total: number }[];
}

export interface ObservationFilters {
  search: string;
  status: string;
  category: string;
  priority: string;
  contractor: string;
  observation_type: string;
  responsible_supervisor: string;
  period: string;
  date_from: string;
  date_to: string;
  per_page: number;
  page: number;
}

export interface FilterOptions {
  categories: string[];
  contractors: string[];
  areas: string[];
  observation_types: string[];
  supervisors: string[];
}

interface PaginatedResponse {
  data: Observation[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

const DEFAULT_FILTERS: ObservationFilters = {
  search: '',
  status: '',
  category: '',
  priority: '',
  contractor: '',
  observation_type: '',
  responsible_supervisor: '',
  period: '',
  date_from: '',
  date_to: '',
  per_page: 20,
  page: 1,
};

export function useObservations() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [stats, setStats] = useState<ObservationStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 20 });
  const [filters, setFilters] = useState<ObservationFilters>(DEFAULT_FILTERS);

  const fetchObservations = useCallback(async (f: ObservationFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = Object.entries(f)
        .filter(([, v]) => v !== '' && v !== 0)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      const data = await api.get<PaginatedResponse>(`/observations?${params}`);
      setObservations(data.data || []);
      setPagination({
        currentPage: data.page,
        lastPage: data.last_page,
        total: data.total,
        perPage: data.per_page,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load observations');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await api.get<ObservationStats>('/observations/stats');
      setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const data = await api.get<FilterOptions>('/observations/filters/options');
      setFilterOptions(data);
    } catch (err) {
      console.error('Filter options error:', err);
    }
  }, []);

  useEffect(() => {
    fetchObservations(filters);
  }, [filters, fetchObservations]);

  useEffect(() => {
    fetchStats();
    fetchFilterOptions();
  }, [fetchStats, fetchFilterOptions]);

  const createObservation = async (data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; observation: Observation }>('/observations', data);
    await fetchObservations(filters);
    await fetchStats();
    return result;
  };

  const updateObservation = async (id: string, data: Record<string, unknown>) => {
    const result = await api.put<{ message: string; observation: Observation }>(`/observations/${id}`, data);
    await fetchObservations(filters);
    await fetchStats();
    return result;
  };

  const updateStatus = async (id: string, statusData: { status: string; verified_by?: string; verified_date?: string }) => {
    const result = await api.patch<{ message: string; observation: Observation }>(`/observations/${id}/status`, statusData);
    setObservations(prev => prev.map(obs => obs.id === id ? result.observation : obs));
    await fetchStats();
    return result;
  };

  const deleteObservation = async (id: string) => {
    await api.delete(`/observations/${id}`);
    await fetchObservations(filters);
    await fetchStats();
  };

  const uploadFiles = async (files: File[]) => {
    const result = await api.upload<{ files: { filename: string; originalName: string; size: number; mimetype: string }[] }>('/observations/upload', files);
    return result.files;
  };

  const exportData = (format: string = 'csv') => {
    if (format === 'copy') {
      const headers = ['Ref Number', 'Date', 'Area', 'Contractor', 'Category', 'Priority', 'Status'];
      const text = headers.join('\t') + '\n' + observations.map(r =>
        [r.observation_id || '', r.observation_date || '', r.area || '', r.contractor || '', r.category || '', r.priority || '', r.status || ''].join('\t')
      ).join('\n');
      navigator.clipboard.writeText(text);
      return;
    }
    const params = Object.entries(filters)
      .filter(([, v]) => v !== '' && v !== 0)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    api.download(`/observations/export?format=${format}&${params}`);
  };

  return {
    observations,
    stats,
    filterOptions,
    loading,
    statsLoading,
    error,
    pagination,
    filters,
    setFilters,
    createObservation,
    updateObservation,
    updateStatus,
    deleteObservation,
    uploadFiles,
    exportData,
    refresh: () => {
      setIsRefreshing(true);
      Promise.all([fetchObservations(filters), fetchStats()]).finally(() => setIsRefreshing(false));
    },
    isRefreshing,
  };
}
