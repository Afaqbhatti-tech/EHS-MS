import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

// ─── Types ──────────────────────────────────────

export interface Violation {
  id: string;
  violation_code: string;
  violation_date: string;
  violation_time: string | null;
  location: string | null;
  area: string | null;
  department: string | null;
  violator_name: string;
  employee_id: string | null;
  designation: string | null;
  contractor_name: string | null;
  violation_type: string;
  violation_category: string;
  description: string;
  violated_rule: string | null;
  hazard_description: string | null;
  severity: string;
  immediate_action: string | null;
  immediate_action_notes: string | null;
  reported_by: string | null;
  reported_by_name: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  investigated_by: string | null;
  investigated_by_name: string | null;
  investigation_date: string | null;
  root_cause: string | null;
  root_cause_category: string | null;
  intentional: boolean | null;
  system_failure: boolean | null;
  investigation_notes: string | null;
  status: string;
  closed_by_name: string | null;
  closed_at: string | null;
  close_notes: string | null;
  remarks: string | null;
  photos: Array<{ filename: string; originalName: string; size: number; mimetype: string }>;
  evidence?: ViolationEvidence[];
  actions?: ViolationAction[];
  logs?: ViolationLog[];
  created_at: string;
  updated_at: string;
}

export interface ViolationAction {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  completion_notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
}

export interface ViolationEvidence {
  id: string;
  related_type: string;
  related_id: string | null;
  file_path: string;
  original_name: string | null;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ViolationLog {
  id: string;
  action_type: string;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  user_name: string | null;
  created_at: string;
}

export interface ViolationStats {
  kpis: {
    total: number;
    open: number;
    under_investigation: number;
    action_assigned: number;
    in_progress: number;
    closed: number;
    reopened: number;
    escalated: number;
    critical: number;
    high_severity: number;
  };
  monthly: Array<{ month: number; total: number; open: number; closed: number; high_severity: number }>;
  byType: Array<{ label: string; total: number }>;
  byCategory: Array<{ label: string; total: number }>;
  bySeverity: Array<{ label: string; total: number }>;
  byLocation: Array<{ label: string; total: number }>;
  byContractor: Array<{ label: string; total: number }>;
  byRootCause: Array<{ label: string; total: number }>;
  repeatViolators: Array<{ violator_name: string; contractor_name: string; total: number }>;
}

export interface FilterOptions {
  categories: string[];
  types: string[];
  locations: string[];
  contractors: string[];
  severities: string[];
  statuses: string[];
}

interface PaginatedResponse {
  data: Violation[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

// ─── Filters ────────────────────────────────────

export interface ViolationFilters {
  search: string;
  status: string;
  severity: string;
  violation_type: string;
  violation_category: string;
  contractor: string;
  location: string;
  date_from: string;
  date_to: string;
  page: number;
}

const defaultFilters: ViolationFilters = {
  search: '', status: '', severity: '', violation_type: '',
  violation_category: '', contractor: '', location: '',
  date_from: '', date_to: '', page: 1,
};

// ─── Hook ───────────────────────────────────────

export function useViolations() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<ViolationFilters>(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Build query string
  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== 0 && v !== undefined) params.set(k, String(v));
    });
    return params.toString();
  }, [filters]);

  // ─── Queries ──────────────────────────────────

  const listQuery = useQuery<PaginatedResponse>({
    queryKey: ['violations', 'list', filters],
    queryFn: () => api.get(`/violations?${buildQuery()}`),
    staleTime: 30_000,
  });

  const statsQuery = useQuery<ViolationStats>({
    queryKey: ['violations', 'stats'],
    queryFn: () => api.get('/violations/stats'),
    staleTime: 60_000,
  });

  const filterOptionsQuery = useQuery<FilterOptions>({
    queryKey: ['violations', 'filterOptions'],
    queryFn: () => api.get('/violations/filters/options'),
    staleTime: 120_000,
  });

  const detailQuery = useQuery<Violation>({
    queryKey: ['violations', 'detail', selectedId],
    queryFn: () => api.get(`/violations/${selectedId}`),
    enabled: !!selectedId,
    staleTime: 15_000,
  });

  // ─── Mutations ────────────────────────────────

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['violations'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<{ violation: Violation }>('/violations', data),
    onSuccess: invalidateAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<{ violation: Violation }>(`/violations/${id}`, data),
    onSuccess: invalidateAll,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, close_notes }: { id: string; status: string; close_notes?: string }) =>
      api.patch<{ violation: Violation }>(`/violations/${id}/status`, { status, close_notes }),
    onSuccess: invalidateAll,
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, assigned_to_name, assigned_to_id }: { id: string; assigned_to_name: string; assigned_to_id?: string }) =>
      api.post<{ violation: Violation }>(`/violations/${id}/assign`, { assigned_to_name, assigned_to_id }),
    onSuccess: invalidateAll,
  });

  const investigationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.post<{ violation: Violation }>(`/violations/${id}/investigation`, data),
    onSuccess: invalidateAll,
  });

  const addActionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.post<{ action: ViolationAction }>(`/violations/${id}/actions`, data),
    onSuccess: invalidateAll,
  });

  const updateActionMutation = useMutation({
    mutationFn: ({ violationId, actionId, data }: { violationId: string; actionId: string; data: Record<string, unknown> }) =>
      api.put<{ action: ViolationAction }>(`/violations/${violationId}/actions/${actionId}`, data),
    onSuccess: invalidateAll,
  });

  const deleteActionMutation = useMutation({
    mutationFn: ({ violationId, actionId }: { violationId: string; actionId: string }) =>
      api.delete(`/violations/${violationId}/actions/${actionId}`),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/violations/${id}`),
    onSuccess: invalidateAll,
  });

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => api.upload<{ files: Array<{ filename: string; originalName: string; size: number; mimetype: string }> }>('/violations/upload', files),
  });

  const uploadEvidenceMutation = useMutation({
    mutationFn: ({ id, files, related_type }: { id: string; files: File[]; related_type?: string }) => {
      const formData = new FormData();
      files.forEach(f => formData.append('files[]', f));
      if (related_type) formData.append('related_type', related_type);
      return api.uploadForm(`/violations/${id}/evidence`, formData);
    },
    onSuccess: invalidateAll,
  });

  // ─── Filter helpers ───────────────────────────

  const updateFilter = useCallback((key: keyof ViolationFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value, ...(key !== 'page' ? { page: 1 } : {}) }));
  }, []);

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  return {
    // Data
    violations: listQuery.data?.data ?? [],
    total: listQuery.data?.total ?? 0,
    page: listQuery.data?.page ?? 1,
    lastPage: listQuery.data?.last_page ?? 1,
    perPage: listQuery.data?.per_page ?? 20,
    isLoading: listQuery.isLoading,

    stats: statsQuery.data,
    isStatsLoading: statsQuery.isLoading,

    filterOptions: filterOptionsQuery.data,

    selectedViolation: detailQuery.data ?? null,
    isDetailLoading: detailQuery.isLoading,

    // Filters
    filters,
    updateFilter,
    resetFilters,
    setFilters,

    // Selection
    selectedId,
    setSelectedId,

    // CRUD
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    updateStatus: statusMutation.mutateAsync,
    assign: assignMutation.mutateAsync,
    addInvestigation: investigationMutation.mutateAsync,
    addAction: addActionMutation.mutateAsync,
    updateAction: updateActionMutation.mutateAsync,
    deleteAction: deleteActionMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    upload: uploadMutation.mutateAsync,
    uploadEvidence: uploadEvidenceMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,

    // Refresh
    refresh: () => {
      listQuery.refetch();
      statsQuery.refetch();
      filterOptionsQuery.refetch();
      if (selectedId) detailQuery.refetch();
    },
    isRefreshing: listQuery.isRefetching || statsQuery.isRefetching,
  };
}
