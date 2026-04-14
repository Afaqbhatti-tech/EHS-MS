import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

// ─── Types ──────────────────────────────────────

export interface DrillParticipant {
  id: string;
  mock_drill_id: string;
  user_id: string | null;
  name: string;
  employee_id: string | null;
  designation: string | null;
  department: string | null;
  company: string | null;
  emergency_role: string | null;
  attendance_status: string;
  participation_status: string | null;
  responsibility: string | null;
  remarks: string | null;
  created_at: string;
}

export interface DrillResource {
  id: string;
  mock_drill_id: string;
  equipment_name: string;
  equipment_type: string | null;
  quantity: number | null;
  condition: string | null;
  was_available: boolean;
  was_functional: boolean;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface DrillObservation {
  id: string;
  obs_code: string;
  mock_drill_id: string;
  title: string;
  description: string;
  observation_type: string | null;
  category: string | null;
  severity: string | null;
  reported_by: string | null;
  reported_by_id: string | null;
  photo_paths: string[] | null;
  file_path: string | null;
  notes: string | null;
  created_by: string | null;
  actions?: DrillAction[];
  evidence?: DrillEvidence[];
  created_at: string;
  updated_at: string;
}

export interface DrillAction {
  id: string;
  action_code: string;
  mock_drill_id: string;
  observation_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_to_id: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  completion_notes: string | null;
  evidence_path: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DrillEvaluation {
  id: string;
  mock_drill_id: string;
  overall_result: string | null;
  response_time_score: number | null;
  communication_score: number | null;
  team_coordination_score: number | null;
  equipment_readiness_score: number | null;
  erp_compliance_score: number | null;
  participation_score: number | null;
  final_score: number | null;
  final_rating: string | null;
  drill_effectiveness: string | null;
  strengths: string | null;
  weaknesses: string | null;
  recommendations: string | null;
  overall_notes: string | null;
  evaluated_by: string | null;
  evaluated_by_id: string | null;
  evaluated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DrillEvidence {
  id: string;
  mock_drill_id: string;
  linked_type: string;
  linked_id: string | null;
  file_path: string;
  original_name: string | null;
  file_type: string | null;
  file_size_kb: number | null;
  caption: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface DrillLog {
  id: string;
  mock_drill_id: string;
  erp_id: string | null;
  log_type: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  description: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_by_role: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface MockDrill {
  id: string;
  drill_code: string;
  erp_id: string | null;
  title: string;
  drill_type: string;
  planned_date: string;
  planned_time: string | null;
  location: string | null;
  area: string | null;
  department: string | null;
  responsible_person: string | null;
  responsible_person_id: string | null;
  conducted_by: string | null;
  observed_by: string | null;
  approved_by: string | null;
  scenario_description: string | null;
  trigger_method: string | null;
  expected_response: string | null;
  actual_response: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  total_duration_minutes: number | null;
  alarm_trigger_time: string | null;
  first_response_time: string | null;
  first_response_seconds: number | null;
  evacuation_start_time: string | null;
  evacuation_complete_time: string | null;
  evacuation_duration_seconds: number | null;
  muster_complete_time: string | null;
  muster_duration_seconds: number | null;
  response_complete_time: string | null;
  total_response_seconds: number | null;
  status: string;
  participant_count: number | null;
  observation_count: number | null;
  action_count: number | null;
  open_action_count: number | null;
  frequency: string | null;
  next_drill_due: string | null;
  closed_at: string | null;
  closed_by: string | null;
  closure_notes: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  // Computed (from show endpoint)
  is_overdue?: boolean;
  duration_formatted?: string | null;
  response_time_formatted?: string | null;
  // Relations
  erp?: {
    id: string;
    erp_code: string;
    title: string;
  } | null;
  created_by_user?: { id: string; full_name: string } | null;
  participants?: DrillParticipant[];
  resources?: DrillResource[];
  observations?: DrillObservation[];
  actions?: DrillAction[];
  evaluation?: DrillEvaluation | null;
  evidence?: DrillEvidence[];
  logs?: DrillLog[];
  created_at: string;
  updated_at: string;
}

export interface DrillStats {
  kpis: {
    total_erps: number;
    active_erps: number;
    total_drills: number;
    planned: number;
    scheduled: number;
    conducted: number;
    closed: number;
    cancelled: number;
    overdue_drills: number;
    open_actions: number;
    avg_response_seconds: number;
    avg_evacuation_seconds: number;
    drills_this_month: number;
  };
  by_type: Array<{ label: string; total: number }>;
  by_status: Array<{ label: string; total: number }>;
  monthly_trend: Array<{ month: string; total: number; conducted: number; closed: number; cancelled: number }>;
  common_observations: Array<{ category: string; total: number }>;
  top_open_actions: Array<{
    id: string;
    drill_id: string;
    action_code: string;
    title: string;
    due_date: string;
    priority: string;
    status: string;
    assigned_to_name: string | null;
    drill_code: string;
    drill_title: string;
  }>;
}

export interface PlannerData {
  upcoming: MockDrill[];
  overdue: MockDrill[];
  this_month: MockDrill[];
}

export interface DrillFilters {
  search: string;
  erp_id: string;
  drill_type: string;
  status: string;
  area: string;
  department: string;
  date_from: string;
  date_to: string;
  overdue: string;
  upcoming: string;
  period: string;
  page: number;
}

interface PaginatedResponse {
  data: MockDrill[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

// ─── Defaults ───────────────────────────────────

const defaultFilters: DrillFilters = {
  search: '',
  erp_id: '',
  drill_type: '',
  status: '',
  area: '',
  department: '',
  date_from: '',
  date_to: '',
  overdue: '',
  upcoming: '',
  period: '',
  page: 1,
};

// ─── Hook ───────────────────────────────────────

export function useDrills() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<DrillFilters>(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plannerMonth, setPlannerMonth] = useState<number>(new Date().getMonth() + 1);
  const [plannerYear, setPlannerYear] = useState<number>(new Date().getFullYear());

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
    queryKey: ['drills', 'list', filters],
    queryFn: () => api.get(`/drills?${buildQuery()}`),
    staleTime: 30_000,
  });

  const statsQuery = useQuery<DrillStats>({
    queryKey: ['drills', 'stats'],
    queryFn: () => api.get('/drills/stats'),
    staleTime: 60_000,
  });

  const detailQuery = useQuery<MockDrill>({
    queryKey: ['drills', 'detail', selectedId],
    queryFn: () => api.get(`/drills/${selectedId}`),
    enabled: !!selectedId,
    staleTime: 15_000,
  });

  const plannerQuery = useQuery<PlannerData>({
    queryKey: ['drills', 'planner', plannerMonth, plannerYear],
    queryFn: () => {
      const dateFrom = `${plannerYear}-${String(plannerMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(plannerYear, plannerMonth, 0).getDate();
      const dateTo = `${plannerYear}-${String(plannerMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return api.get(`/drills/planner?date_from=${dateFrom}&date_to=${dateTo}`);
    },
    staleTime: 60_000,
  });

  // ─── Mutations ────────────────────────────────

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['drills'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<{ drill: MockDrill }>('/drills', data),
    onSuccess: invalidateAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<{ drill: MockDrill }>(`/drills/${id}`, data),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/drills/${id}`),
    onSuccess: invalidateAll,
  });

  const conductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.post<{ drill: MockDrill }>(`/drills/${id}/conduct`, data),
    onSuccess: invalidateAll,
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.post<{ drill: MockDrill }>(`/drills/${id}/close`, data),
    onSuccess: invalidateAll,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.post<{ drill: MockDrill }>(`/drills/${id}/cancel`, data),
    onSuccess: invalidateAll,
  });

  // ── Participants ──

  const addParticipantMutation = useMutation({
    mutationFn: ({ drillId, data }: { drillId: string; data: Record<string, unknown> }) =>
      api.post<{ participant: DrillParticipant }>(`/drills/${drillId}/participants`, data),
    onSuccess: invalidateAll,
  });

  const updateParticipantMutation = useMutation({
    mutationFn: ({ drillId, participantId, data }: { drillId: string; participantId: string; data: Record<string, unknown> }) =>
      api.put<{ participant: DrillParticipant }>(`/drills/${drillId}/participants/${participantId}`, data),
    onSuccess: invalidateAll,
  });

  const bulkAddParticipantsMutation = useMutation({
    mutationFn: ({ drillId, data }: { drillId: string; data: Record<string, unknown>[] }) =>
      api.post<{ participants: DrillParticipant[] }>(`/drills/${drillId}/participants/bulk`, { participants: data }),
    onSuccess: invalidateAll,
  });

  const removeParticipantMutation = useMutation({
    mutationFn: ({ drillId, participantId }: { drillId: string; participantId: string }) =>
      api.delete(`/drills/${drillId}/participants/${participantId}`),
    onSuccess: invalidateAll,
  });

  // ── Resources ──

  const addResourceMutation = useMutation({
    mutationFn: ({ drillId, data }: { drillId: string; data: Record<string, unknown> }) =>
      api.post<{ resource: DrillResource }>(`/drills/${drillId}/resources`, data),
    onSuccess: invalidateAll,
  });

  const updateResourceMutation = useMutation({
    mutationFn: ({ drillId, resourceId, data }: { drillId: string; resourceId: string; data: Record<string, unknown> }) =>
      api.put<{ resource: DrillResource }>(`/drills/${drillId}/resources/${resourceId}`, data),
    onSuccess: invalidateAll,
  });

  const removeResourceMutation = useMutation({
    mutationFn: ({ drillId, resourceId }: { drillId: string; resourceId: string }) =>
      api.delete(`/drills/${drillId}/resources/${resourceId}`),
    onSuccess: invalidateAll,
  });

  // ── Observations ──

  const addObservationMutation = useMutation({
    mutationFn: ({ drillId, data, files }: { drillId: string; data: Record<string, unknown>; files?: File[] }) => {
      if (files && files.length > 0) {
        const formData = new FormData();
        Object.entries(data).forEach(([k, v]) => {
          if (v !== undefined && v !== null) formData.append(k, String(v));
        });
        files.forEach(f => formData.append('photos[]', f));
        return api.uploadForm<{ observation: DrillObservation }>(`/drills/${drillId}/observations`, formData);
      }
      return api.post<{ observation: DrillObservation }>(`/drills/${drillId}/observations`, data);
    },
    onSuccess: invalidateAll,
  });

  const updateObservationMutation = useMutation({
    mutationFn: ({ drillId, observationId, data }: { drillId: string; observationId: string; data: Record<string, unknown> }) =>
      api.put<{ observation: DrillObservation }>(`/drills/${drillId}/observations/${observationId}`, data),
    onSuccess: invalidateAll,
  });

  const deleteObservationMutation = useMutation({
    mutationFn: ({ drillId, observationId }: { drillId: string; observationId: string }) =>
      api.delete(`/drills/${drillId}/observations/${observationId}`),
    onSuccess: invalidateAll,
  });

  // ── Actions ──

  const addActionMutation = useMutation({
    mutationFn: ({ drillId, data }: { drillId: string; data: Record<string, unknown> }) =>
      api.post<{ action: DrillAction }>(`/drills/${drillId}/actions`, data),
    onSuccess: invalidateAll,
  });

  const updateActionMutation = useMutation({
    mutationFn: ({ drillId, actionId, data }: { drillId: string; actionId: string; data: Record<string, unknown> }) =>
      api.put<{ action: DrillAction }>(`/drills/${drillId}/actions/${actionId}`, data),
    onSuccess: invalidateAll,
  });

  // ── Evaluation ──

  const saveEvaluationMutation = useMutation({
    mutationFn: ({ drillId, data }: { drillId: string; data: Record<string, unknown> }) =>
      api.post<{ evaluation: DrillEvaluation }>(`/drills/${drillId}/evaluation`, data),
    onSuccess: invalidateAll,
  });

  // ── Evidence ──

  const uploadEvidenceMutation = useMutation({
    mutationFn: ({ drillId, files, linked_type, linked_id }: { drillId: string; files: File[]; linked_type?: string; linked_id?: string }) => {
      const formData = new FormData();
      files.forEach(f => formData.append('files[]', f));
      if (linked_type) formData.append('linked_type', linked_type);
      if (linked_id) formData.append('linked_id', linked_id);
      return api.uploadForm(`/drills/${drillId}/evidence`, formData);
    },
    onSuccess: invalidateAll,
  });

  // ─── Filter helpers ───────────────────────────

  const updateFilter = useCallback((key: keyof DrillFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value, ...(key !== 'page' ? { page: 1 } : {}) }));
  }, []);

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  return {
    // Data
    drills: listQuery.data?.data ?? [],
    total: listQuery.data?.total ?? 0,
    page: listQuery.data?.page ?? 1,
    lastPage: listQuery.data?.last_page ?? 1,
    isLoading: listQuery.isLoading,

    stats: statsQuery.data,
    isStatsLoading: statsQuery.isLoading,

    selectedDrill: detailQuery.data ?? null,
    isDetailLoading: detailQuery.isLoading,

    planner: plannerQuery.data ?? null,
    isPlannerLoading: plannerQuery.isLoading,
    plannerMonth,
    setPlannerMonth,
    plannerYear,
    setPlannerYear,

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
    destroy: deleteMutation.mutateAsync,

    // Workflow
    conductDrill: conductMutation.mutateAsync,
    closeDrill: closeMutation.mutateAsync,
    cancelDrill: cancelMutation.mutateAsync,

    // Participants
    addParticipant: addParticipantMutation.mutateAsync,
    updateParticipant: updateParticipantMutation.mutateAsync,
    bulkAddParticipants: bulkAddParticipantsMutation.mutateAsync,
    removeParticipant: removeParticipantMutation.mutateAsync,

    // Resources
    addResource: addResourceMutation.mutateAsync,
    updateResource: updateResourceMutation.mutateAsync,
    removeResource: removeResourceMutation.mutateAsync,

    // Observations
    addObservation: addObservationMutation.mutateAsync,
    updateObservation: updateObservationMutation.mutateAsync,
    deleteObservation: deleteObservationMutation.mutateAsync,

    // Actions
    addAction: addActionMutation.mutateAsync,
    updateAction: updateActionMutation.mutateAsync,

    // Evaluation
    saveEvaluation: saveEvaluationMutation.mutateAsync,

    // Evidence
    uploadEvidence: uploadEvidenceMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isConducting: conductMutation.isPending,
    isClosing: closeMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isUploading: uploadEvidenceMutation.isPending,

    // Refresh
    refresh: () => {
      listQuery.refetch();
      statsQuery.refetch();
      plannerQuery.refetch();
      if (selectedId) detailQuery.refetch();
    },
    isRefreshing: listQuery.isRefetching || statsQuery.isRefetching,
  };
}
