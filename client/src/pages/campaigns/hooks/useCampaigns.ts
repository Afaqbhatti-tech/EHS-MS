import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { fetchAllPages, buildFilterQuery, CARD_VIEW_PER_PAGE } from '../../../utils/fetchAllPages';

// ─── Types ──────────────────────────────────────

export interface CampaignActivity {
  id: number;
  activity_code: string;
  campaign_id: number;
  title: string;
  activity_type: string;
  activity_date: string;
  activity_time: string | null;
  location: string | null;
  conducted_by: string | null;
  description: string | null;
  attendance_count: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignParticipant {
  id: number;
  campaign_id: number;
  activity_id: number | null;
  user_id: string | null;
  participant_name: string;
  employee_id: string | null;
  designation: string | null;
  department: string | null;
  company: string | null;
  attendance_status: string;
  participation_type: string;
  remarks: string | null;
  activity?: CampaignActivity;
  created_at: string;
}

export interface CampaignEvidence {
  id: number;
  campaign_id: number;
  activity_id: number | null;
  file_path: string;
  original_name: string | null;
  file_type: string | null;
  file_size_kb: number | null;
  evidence_category: string | null;
  caption: string | null;
  uploaded_by_name: string | null;
  url: string;
  created_at: string;
}

export interface CampaignAction {
  id: number;
  action_code: string;
  campaign_id: number;
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
  assigned_to_user?: { id: string; full_name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignResult {
  id: number;
  campaign_id: number;
  total_activities_conducted: number;
  total_participants: number;
  participation_rate: number | null;
  areas_covered: number;
  sessions_delivered: number;
  observations_raised: number;
  violations_before: number | null;
  violations_after: number | null;
  incidents_before: number | null;
  incidents_after: number | null;
  actions_created: number;
  actions_closed: number;
  effectiveness_rating: string | null;
  outcome_summary: string | null;
  lessons_learned: string | null;
  recommendations: string | null;
  next_steps: string | null;
  evaluated_by: string | null;
  evaluated_at: string | null;
}

export interface CampaignLog {
  id: number;
  campaign_id: number;
  action: string;
  from_status: string | null;
  to_status: string | null;
  performed_by_name: string | null;
  performed_by_role: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  performer?: { id: string; full_name: string } | null;
  created_at: string;
}

export interface Campaign {
  id: number;
  campaign_code: string;
  title: string;
  campaign_type: string;
  topic: string;
  description: string | null;
  objective: string | null;
  start_date: string;
  end_date: string;
  duration_days: number | null;
  frequency: string;
  owner_name: string | null;
  owner_id: string | null;
  conducted_by: string | null;
  approved_by: string | null;
  site: string | null;
  project: string | null;
  area: string | null;
  zone: string | null;
  department: string | null;
  contractor_name: string | null;
  target_audience: string | null;
  expected_participants: number | null;
  status: string;
  activity_count: number;
  participant_count: number;
  evidence_count: number;
  action_count: number;
  open_action_count: number;
  completion_percentage: number;
  notes: string | null;
  is_active?: boolean;
  is_overdue?: boolean;
  duration_formatted?: string;
  owner?: { id: string; full_name: string } | null;
  created_by_user?: { id: string; full_name: string } | null;
  activities?: CampaignActivity[];
  participants?: CampaignParticipant[];
  evidence?: CampaignEvidence[];
  actions?: CampaignAction[];
  result?: CampaignResult | null;
  logs?: CampaignLog[];
  created_at: string;
  updated_at: string;
}

export interface CampaignStats {
  kpis: {
    total_campaigns: number;
    active_now: number;
    planned: number;
    completed: number;
    cancelled: number;
    participants_this_month: number;
    activities_conducted: number;
    open_actions: number;
    campaigns_this_month: number;
  };
  by_type: Array<{ label: string; total: number }>;
  by_topic: Array<{ label: string; total: number }>;
  by_status: Array<{ label: string; total: number }>;
  monthly_trend: Array<{ month: string; campaigns_started: number; participants: number }>;
  effectiveness_distribution: Array<{ rating: string; total: number }>;
  top_participation: Array<{ id: number; campaign_code: string; title: string; participant_count: number }>;
  open_actions_list: Array<{
    id: number; action_code: string; title: string; due_date: string;
    priority: string; status: string; assigned_to: string;
    campaign_code: string; campaign_title: string; campaign_id: number;
  }>;
}

export interface CampaignFilters {
  search: string;
  campaign_type: string;
  topic: string;
  status: string;
  site: string;
  area: string;
  zone: string;
  department: string;
  contractor_name: string;
  owner_id: string;
  date_from: string;
  date_to: string;
  active_now: string;
  has_open_actions: string;
  period: string;
  sort_by: string;
  sort_dir: string;
  per_page: number;
  page: number;
}

interface PaginatedResponse {
  data: Campaign[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}



const defaultFilters: CampaignFilters = {
  search: '', campaign_type: '', topic: '', status: '',
  site: '', area: '', zone: '', department: '', contractor_name: '',
  owner_id: '', date_from: '', date_to: '',
  active_now: '', has_open_actions: '', period: '',
  sort_by: 'start_date', sort_dir: 'desc', per_page: 20, page: 1,
};

// ─── Hook ───────────────────────────────────────

export function useCampaigns() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<CampaignFilters>(defaultFilters);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== 0 && v !== undefined) params.set(k, String(v));
    });
    return params.toString();
  }, [filters]);

  // ─── Queries ──────────────────────────────────

  const listQuery = useQuery<PaginatedResponse>({
    queryKey: ['campaigns', 'list', filters],
    queryFn: async (): Promise<PaginatedResponse> => {
      if (filters.per_page >= CARD_VIEW_PER_PAGE) {
        return fetchAllPages<Campaign>('/campaigns', buildFilterQuery(filters));
      }
      return api.get(`/campaigns?${buildQuery()}`);
    },
    staleTime: 30_000,
  });

  const statsQuery = useQuery<CampaignStats>({
    queryKey: ['campaigns', 'stats'],
    queryFn: () => api.get('/campaigns/stats'),
    staleTime: 60_000,
  });

  const detailQuery = useQuery<Campaign>({
    queryKey: ['campaigns', 'detail', selectedId],
    queryFn: () => api.get(`/campaigns/${selectedId}`),
    enabled: !!selectedId,
    staleTime: 15_000,
  });

  // ─── Mutations ────────────────────────────────

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['campaigns'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<{ campaign: Campaign }>('/campaigns', data),
    onSuccess: invalidateAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.put<{ campaign: Campaign }>(`/campaigns/${id}`, data),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/campaigns/${id}`),
    onSuccess: invalidateAll,
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.post<{ campaign: Campaign }>(`/campaigns/${id}/status`, { status }),
    onSuccess: invalidateAll,
  });

  // ── Activities ──
  const addActivityMutation = useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: number; data: Record<string, unknown> }) =>
      api.post<{ activity: CampaignActivity }>(`/campaigns/${campaignId}/activities`, data),
    onSuccess: invalidateAll,
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ campaignId, activityId, data }: { campaignId: number; activityId: number; data: Record<string, unknown> }) =>
      api.put<{ activity: CampaignActivity }>(`/campaigns/${campaignId}/activities/${activityId}`, data),
    onSuccess: invalidateAll,
  });

  const deleteActivityMutation = useMutation({
    mutationFn: ({ campaignId, activityId }: { campaignId: number; activityId: number }) =>
      api.delete(`/campaigns/${campaignId}/activities/${activityId}`),
    onSuccess: invalidateAll,
  });

  // ── Participants ──
  const addParticipantMutation = useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: number; data: Record<string, unknown> }) =>
      api.post<{ participant: CampaignParticipant }>(`/campaigns/${campaignId}/participants`, data),
    onSuccess: invalidateAll,
  });

  const bulkAddParticipantsMutation = useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: number; data: { participants: Record<string, unknown>[]; activity_id?: number } }) =>
      api.post<{ participants: CampaignParticipant[] }>(`/campaigns/${campaignId}/participants/bulk`, data),
    onSuccess: invalidateAll,
  });

  const removeParticipantMutation = useMutation({
    mutationFn: ({ campaignId, participantId }: { campaignId: number; participantId: number }) =>
      api.delete(`/campaigns/${campaignId}/participants/${participantId}`),
    onSuccess: invalidateAll,
  });

  // ── Evidence ──
  const uploadEvidenceMutation = useMutation({
    mutationFn: ({ campaignId, files, activity_id, evidence_category, caption }: {
      campaignId: number; files: File[]; activity_id?: number;
      evidence_category?: string; caption?: string;
    }) => {
      const formData = new FormData();
      files.forEach(f => formData.append('evidence[]', f));
      if (activity_id) formData.append('activity_id', String(activity_id));
      if (evidence_category) formData.append('evidence_category', evidence_category);
      if (caption) formData.append('caption', caption);
      return api.uploadForm(`/campaigns/${campaignId}/evidence`, formData);
    },
    onSuccess: invalidateAll,
  });

  const removeEvidenceMutation = useMutation({
    mutationFn: ({ campaignId, evidenceId }: { campaignId: number; evidenceId: number }) =>
      api.delete(`/campaigns/${campaignId}/evidence/${evidenceId}`),
    onSuccess: invalidateAll,
  });

  // ── Actions ──
  const addActionMutation = useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: number; data: Record<string, unknown> }) =>
      api.post<{ action: CampaignAction }>(`/campaigns/${campaignId}/actions`, data),
    onSuccess: invalidateAll,
  });

  const updateActionMutation = useMutation({
    mutationFn: ({ campaignId, actionId, data }: { campaignId: number; actionId: number; data: Record<string, unknown> }) =>
      api.put<{ action: CampaignAction }>(`/campaigns/${campaignId}/actions/${actionId}`, data),
    onSuccess: invalidateAll,
  });

  // ── Results ──
  const saveResultMutation = useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: number; data: Record<string, unknown> }) =>
      api.post<{ result: CampaignResult }>(`/campaigns/${campaignId}/result`, data),
    onSuccess: invalidateAll,
  });

  // ─── Filter helpers ───────────────────────────

  const updateFilter = useCallback((key: keyof CampaignFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value, ...(key !== 'page' ? { page: 1 } : {}) }));
  }, []);

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  // ─── Export ───────────────────────────────────

  const exportCampaigns = useCallback((format: string = 'csv') => {
    const params = new URLSearchParams();
    if (filters.campaign_type) params.set('campaign_type', filters.campaign_type);
    if (filters.status) params.set('status', filters.status);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    params.set('format', format);
    api.download(`/campaigns/export?${params.toString()}`);
  }, [filters]);

  return {
    // Data
    campaigns: listQuery.data?.data ?? [],
    total: listQuery.data?.total ?? 0,
    page: listQuery.data?.page ?? 1,
    lastPage: listQuery.data?.last_page ?? 1,
    isLoading: listQuery.isLoading,

    stats: statsQuery.data,
    isStatsLoading: statsQuery.isLoading,

    selectedCampaign: detailQuery.data ?? null,
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
    destroy: deleteMutation.mutateAsync,
    changeStatus: changeStatusMutation.mutateAsync,

    // Activities
    addActivity: addActivityMutation.mutateAsync,
    updateActivity: updateActivityMutation.mutateAsync,
    deleteActivity: deleteActivityMutation.mutateAsync,

    // Participants
    addParticipant: addParticipantMutation.mutateAsync,
    bulkAddParticipants: bulkAddParticipantsMutation.mutateAsync,
    removeParticipant: removeParticipantMutation.mutateAsync,

    // Evidence
    uploadEvidence: uploadEvidenceMutation.mutateAsync,
    removeEvidence: removeEvidenceMutation.mutateAsync,

    // Actions
    addAction: addActionMutation.mutateAsync,
    updateAction: updateActionMutation.mutateAsync,

    // Results
    saveResult: saveResultMutation.mutateAsync,

    // Export
    exportCampaigns,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isUploading: uploadEvidenceMutation.isPending,

    // Refresh
    refresh: () => {
      listQuery.refetch();
      statsQuery.refetch();
      if (selectedId) detailQuery.refetch();
    },
    isRefreshing: listQuery.isRefetching || statsQuery.isRefetching,
  };
}
