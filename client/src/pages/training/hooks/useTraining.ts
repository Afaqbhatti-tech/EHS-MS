import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../services/api';

export interface TrainingTopic {
  id: string;
  key: string;
  label: string;
  category: string;
  validity_days: number | null;
  is_mandatory: boolean;
  description: string | null;
  color: string | null;
  light_color: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface TrainingRecord {
  id: string;
  record_id: string;
  worker_id: string;
  worker: {
    id: string;
    worker_id: string;
    name: string;
    profession: string | null;
    company: string | null;
    department: string | null;
  } | null;
  training_topic_key: string;
  topic: {
    id: string;
    key: string;
    label: string;
    category: string;
    color: string | null;
    light_color: string | null;
  } | null;
  topic_label: string;
  training_date: string;
  expiry_date: string | null;
  next_training_date: string | null;
  training_duration: string | null;
  status: 'Valid' | 'Expired' | 'Expiring Soon' | 'Pending' | 'Not Required';
  result_status: string | null;
  days_until_expiry: number | null;
  trainer_name: string | null;
  training_provider: string | null;
  training_location: string | null;
  certificate_number: string | null;
  certificate_url: string | null;
  certificate_file_name: string | null;
  is_bulk_assignment: boolean;
  bulk_assignment_id: string | null;
  notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  audit_logs?: AuditLog[];
}

export interface AuditLog {
  id: string;
  action_type: string;
  description: string;
  user_name: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface TrainingStats {
  kpis: {
    total_records: number;
    valid: number;
    expired: number;
    expiring_soon: number;
    pending: number;
    workers_trained: number;
    total_workers: number;
    this_month: number;
  };
  byTopic: {
    training_topic_key: string;
    topic_label: string;
    topic_color: string | null;
    topic_light_color: string | null;
    total: number;
    valid: number;
    expired: number;
    expiring: number;
  }[];
  monthly: { month: number; total: number }[];
  byProfession: { profession: string; total: number; valid: number; expired: number }[];
  expiringSoon: {
    id: string;
    record_id: string;
    worker_name: string;
    worker_id_no: string;
    topic: string;
    expiry_date: string;
    days_left: number;
  }[];
}

export interface TrainingFilters {
  search: string;
  training_topic_key: string;
  status: string;
  profession: string;
  company: string;
  period: string;
  date_from: string;
  date_to: string;
  sort_by: string;
  sort_dir: string;
  per_page: number;
  page: number;
}

export interface TrainingFilterOptions {
  professions: string[];
  companies: string[];
  topics: { key: string; label: string; category: string }[];
  trainers: string[];
  locations: string[];
  providers: string[];
}

export interface TrainingRequirement {
  id: string;
  profession: string;
  training_topic_key: string;
  topic_label: string;
  topic_category: string | null;
  is_mandatory: boolean;
  notes: string | null;
  created_at: string;
}

export interface WorkerSearchResult {
  id: string;
  worker_id: string;
  name: string;
  profession: string | null;
  company: string | null;
  department: string | null;
  induction_status: string;
  training_count: number;
  valid_count: number;
  expired_count: number;
  expiring_count: number;
}

export interface BulkPreviewResult {
  total_selected: number;
  eligible_count: number;
  already_valid_count: number;
  eligible: { id: string; worker_id: string; name: string; profession: string | null; company: string | null }[];
  already_valid: { id: string; worker_id: string; name: string; profession: string | null; company: string | null }[];
}

export interface BulkAssignResult {
  message: string;
  bulk_id: string;
  created_count: number;
  skipped_count: number;
  skipped: { worker_id: string; worker_name: string; worker_code: string; reason: string }[];
  error_count: number;
  errors: { worker_id: string; error: string }[];
}

export interface ComplianceMatrix {
  workers: {
    id: string;
    worker_id: string;
    name: string;
    profession: string;
    company: string | null;
    required_count: number;
    valid_count: number;
    pending_count: number;
    expired_count: number;
    compliance_pct: number;
    topics: Record<string, { status: string; expiry_date: string | null; record_id: string | null }>;
  }[];
  topics: { key: string; label: string }[];
  requirements_count: number;
}

interface PaginatedResponse {
  data: TrainingRecord[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

const DEFAULT_FILTERS: TrainingFilters = {
  search: '',
  training_topic_key: '',
  status: '',
  profession: '',
  company: '',
  period: '',
  date_from: '',
  date_to: '',
  sort_by: 'training_date',
  sort_dir: 'desc',
  per_page: 25,
  page: 1,
};

export function useTraining() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [topics, setTopics] = useState<TrainingTopic[]>([]);
  const [filterOptions, setFilterOptions] = useState<TrainingFilterOptions | null>(null);
  const [requirements, setRequirements] = useState<TrainingRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 25 });
  const [filters, setFilters] = useState<TrainingFilters>(DEFAULT_FILTERS);

  const fetchRecords = useCallback(async (f: TrainingFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = Object.entries(f)
        .filter(([, v]) => v !== '' && v !== 0)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      const data = await api.get<PaginatedResponse>(`/training/records?${params}`);
      setRecords(data.data || []);
      setPagination({
        currentPage: data.page,
        lastPage: data.last_page,
        total: data.total,
        perPage: data.per_page,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load training records');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await api.get<TrainingStats>('/training/stats');
      setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchTopics = useCallback(async () => {
    try {
      const data = await api.get<TrainingTopic[]>('/training/topics');
      setTopics(data);
    } catch (err) {
      console.error('Topics fetch error:', err);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const data = await api.get<TrainingFilterOptions>('/training/filters/options');
      setFilterOptions(data);
    } catch (err) {
      console.error('Filter options error:', err);
    }
  }, []);

  const fetchRequirements = useCallback(async (profession?: string) => {
    try {
      const params = profession ? `?profession=${encodeURIComponent(profession)}` : '';
      const data = await api.get<{ data: TrainingRequirement[] }>(`/training/requirements${params}`);
      setRequirements(data.data || []);
      return data.data || [];
    } catch (err) {
      console.error('Requirements fetch error:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchRecords(filters);
  }, [filters, fetchRecords]);

  useEffect(() => {
    fetchStats();
    fetchTopics();
    fetchFilterOptions();
    fetchRequirements();
  }, [fetchStats, fetchTopics, fetchFilterOptions, fetchRequirements]);

  const createRecord = async (data: Record<string, unknown> | FormData) => {
    const isFormData = data instanceof FormData;
    const result = isFormData
      ? await api.uploadForm<{ message: string; record: TrainingRecord }>('/training/records', data)
      : await api.post<{ message: string; record: TrainingRecord }>('/training/records', data);
    await fetchRecords(filters);
    await fetchStats();
    return result;
  };

  const updateRecord = async (id: string, data: Record<string, unknown> | FormData) => {
    let result;
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      result = await api.uploadForm<{ message: string; record: TrainingRecord }>(`/training/records/${id}`, data);
    } else {
      result = await api.put<{ message: string; record: TrainingRecord }>(`/training/records/${id}`, data);
    }
    await fetchRecords(filters);
    await fetchStats();
    return result;
  };

  const deleteRecord = async (id: string) => {
    await api.delete(`/training/records/${id}`);
    await fetchRecords(filters);
    await fetchStats();
  };

  const checkDuplicate = async (workerId: string, topicKey: string, trainingDate: string) => {
    return await api.post<{
      is_exact_duplicate: boolean;
      existing_record_id: string | null;
      has_valid_record: boolean;
    }>('/training/check-duplicate', {
      worker_id: workerId,
      training_topic_key: topicKey,
      training_date: trainingDate,
    });
  };

  const bulkPreview = async (workerIds: string[], topicKey: string) => {
    return await api.post<BulkPreviewResult>('/training/bulk-preview', {
      worker_ids: workerIds,
      training_topic_key: topicKey,
    });
  };

  const bulkAssign = async (data: {
    worker_ids: string[];
    training_topic_key: string;
    training_date: string;
    expiry_date?: string;
    next_training_date?: string;
    training_duration?: string;
    trainer_name?: string;
    training_provider?: string;
    training_location?: string;
    result_status?: string;
    notes?: string;
    skip_valid?: boolean;
  }) => {
    const result = await api.post<BulkAssignResult>('/training/bulk-assign', { ...data, skip_valid: true });
    await fetchRecords(filters);
    await fetchStats();
    return result;
  };

  const fetchWorkerSummary = async (workerId: string) => {
    return await api.get<{
      worker: { id: string; worker_id: string; name: string; profession: string | null };
      summary: { total: number; valid: number; expired: number; expiring_soon: number; pending: number };
      records: TrainingRecord[];
      required_topics: { training_topic_key: string; topic_label: string; is_mandatory: boolean; status: string }[];
    }>(`/training/worker/${workerId}/summary`);
  };

  const searchWorkers = async (query: string, profession?: string, company?: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (profession) params.set('profession', profession);
    if (company) params.set('company', company);
    return await api.get<WorkerSearchResult[]>(`/training/search-workers?${params.toString()}`);
  };

  const fetchComplianceMatrix = async (profession?: string, search?: string) => {
    const params = new URLSearchParams();
    if (profession) params.set('profession', profession);
    if (search) params.set('search', search);
    return await api.get<ComplianceMatrix>(`/training/compliance-matrix?${params.toString()}`);
  };

  const addRequirement = async (data: { profession: string; training_topic_key: string; is_mandatory?: boolean; notes?: string }) => {
    const result = await api.post<{ message: string; requirement: TrainingRequirement }>('/training/requirements', data);
    await fetchRequirements();
    return result;
  };

  const removeRequirement = async (id: string) => {
    await api.delete(`/training/requirements/${id}`);
    await fetchRequirements();
  };

  const uploadCertificate = async (recordId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const result = await api.uploadForm<{ message: string; certificate_url: string; certificate_file_name: string }>(`/training/records/${recordId}/certificate`, formData);
    await fetchRecords(filters);
    return result;
  };

  const removeCertificate = async (recordId: string) => {
    await api.delete(`/training/records/${recordId}/certificate`);
    await fetchRecords(filters);
  };

  const exportData = (format: string = 'csv') => {
    if (format === 'copy') {
      const headers = ['Record ID', 'Worker Name', 'Topic', 'Status', 'Training Date', 'Expiry Date', 'Company'];
      const text = headers.join('\t') + '\n' + records.map(r =>
        [r.record_id, r.worker?.name || '', r.topic?.label || r.topic_label || '', r.status || '', r.training_date || '', r.expiry_date || '', r.worker?.company || ''].join('\t')
      ).join('\n');
      navigator.clipboard.writeText(text);
      return;
    }
    const params = Object.entries(filters)
      .filter(([, v]) => v !== '' && v !== 0)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    api.download(`/training/export?format=${format}&${params}`);
  };

  return {
    records, stats, topics, filterOptions, requirements, loading, statsLoading, error, pagination,
    filters, setFilters,
    createRecord, updateRecord, deleteRecord,
    checkDuplicate, bulkPreview, bulkAssign,
    fetchWorkerSummary, searchWorkers,
    fetchComplianceMatrix, fetchRequirements, addRequirement, removeRequirement,
    uploadCertificate, removeCertificate,
    exportData,
    refresh: () => {
      setIsRefreshing(true);
      Promise.all([fetchRecords(filters), fetchStats()]).finally(() => setIsRefreshing(false));
    },
    isRefreshing,
  };
}
