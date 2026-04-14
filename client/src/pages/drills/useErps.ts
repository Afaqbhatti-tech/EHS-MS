import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

// ─── Types ──────────────────────────────────────

export interface Erp {
  id: string;
  erp_code: string;
  title: string;
  erp_type: string;
  version: string | null;
  revision_number: string | null;
  status: string;
  site: string | null;
  project: string | null;
  area: string | null;
  zone: string | null;
  department: string | null;
  scenario_description: string | null;
  scope: string | null;
  purpose: string | null;
  risk_level: string;
  trigger_conditions: string | null;
  incident_controller: string | null;
  emergency_coordinator: string | null;
  fire_wardens: unknown;
  first_aiders: unknown;
  rescue_team: unknown;
  security_team: unknown;
  medical_team: unknown;
  emergency_contacts: unknown;
  communication_method: string | null;
  radio_channel: string | null;
  alarm_method: string | null;
  assembly_point: string | null;
  muster_point: string | null;
  evacuation_route: string | null;
  response_steps: string | null;
  escalation_hierarchy: string | null;
  required_equipment: unknown;
  equipment_locations: string | null;
  backup_equipment: string | null;
  file_path: string | null;
  file_url: string | null;
  drawings_path: string | null;
  drawings_url: string | null;
  sop_path: string | null;
  notes: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approval_date: string | null;
  review_frequency: string | null;
  next_review_date: string | null;
  due_for_review: boolean;
  drills_count: number;
  created_by: string | null;
  created_by_name: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Present only from show endpoint
  drills?: {
    count: number;
    recent: Array<{
      id: string;
      title: string | null;
      drill_type: string | null;
      drill_date: string | null;
      status: string | null;
      score: number | null;
      created_at: string;
    }>;
  };
  logs?: Array<{
    id: string;
    action: string;
    from_status: string | null;
    to_status: string | null;
    description: string | null;
    performed_by_name: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>;
}

export interface ErpStats {
  total: number;
  active: number;
  draft: number;
  under_review: number;
  obsolete: number;
  due_for_review: number;
  by_type: Array<{ erp_type: string; total: number }>;
  recent_created: Array<{
    id: string;
    erp_code: string;
    title: string;
    erp_type: string;
    status: string;
    risk_level: string;
    created_at: string;
  }>;
}

export interface ErpFilters {
  search: string;
  erp_type: string;
  status: string;
  site: string;
  risk_level: string;
  due_for_review: string;
  date_from: string;
  date_to: string;
  page: number;
}

interface PaginatedResponse {
  data: Erp[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

// ─── Defaults ───────────────────────────────────

const defaultFilters: ErpFilters = {
  search: '',
  erp_type: '',
  status: '',
  site: '',
  risk_level: '',
  due_for_review: '',
  date_from: '',
  date_to: '',
  page: 1,
};

// ─── Hook ───────────────────────────────────────

export function useErps() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<ErpFilters>(defaultFilters);
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
    queryKey: ['erps', 'list', filters],
    queryFn: () => api.get(`/erps?${buildQuery()}`),
    staleTime: 30_000,
  });

  const statsQuery = useQuery<ErpStats>({
    queryKey: ['erps', 'stats'],
    queryFn: () => api.get('/erps/stats'),
    staleTime: 60_000,
  });

  const detailQuery = useQuery<Erp>({
    queryKey: ['erps', 'detail', selectedId],
    queryFn: () => api.get(`/erps/${selectedId}`),
    enabled: !!selectedId,
    staleTime: 15_000,
  });

  // ─── Mutations ────────────────────────────────

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['erps'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.uploadForm('/erps', data),
    onSuccess: invalidateAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<{ erp: Erp }>(`/erps/${id}`, data),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/erps/${id}`),
    onSuccess: invalidateAll,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post<{ erp: Erp }>(`/erps/${id}/approve`, {}),
    onSuccess: invalidateAll,
  });

  // ─── Filter helpers ───────────────────────────

  const updateFilter = useCallback((key: keyof ErpFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value, ...(key !== 'page' ? { page: 1 } : {}) }));
  }, []);

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  return {
    // Data
    erps: listQuery.data?.data ?? [],
    total: listQuery.data?.total ?? 0,
    page: listQuery.data?.page ?? 1,
    lastPage: listQuery.data?.last_page ?? 1,
    isLoading: listQuery.isLoading,

    stats: statsQuery.data,
    isStatsLoading: statsQuery.isLoading,

    selectedErp: detailQuery.data ?? null,
    isDetailLoading: detailQuery.isLoading,

    // Filters
    filters,
    updateFilter,
    resetFilters,

    // Selection
    selectedId,
    setSelectedId,

    // CRUD
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    destroy: deleteMutation.mutateAsync,
    approve: approveMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,

    // Refresh
    refresh: () => {
      listQuery.refetch();
      statsQuery.refetch();
      if (selectedId) detailQuery.refetch();
    },
    isRefreshing: listQuery.isRefetching || statsQuery.isRefetching,
  };
}
