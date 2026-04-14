import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { api } from '../../services/api';

// ─── Types ──────────────────────────────────────

export interface Incident {
  id: string;
  incident_code: string;
  incident_date: string;
  incident_time: string | null;
  location: string | null;
  area: string | null;
  department: string | null;
  incident_type: string;
  incident_category: string | null;
  description: string;
  immediate_action: string | null;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  affected_person_name: string | null;
  employee_id: string | null;
  designation: string | null;
  contractor_name: string | null;
  contact_number: string | null;
  supervisor_name: string | null;
  injury_type: string | null;
  body_part_affected: string | null;
  medical_treatment_required: boolean;
  lost_time_injury: boolean;
  hospitalization: boolean;
  property_damage: boolean;
  equipment_damage: boolean;
  environmental_impact: boolean;
  financial_loss: number | null;
  incident_outcome_summary: string | null;
  reported_by: string | null;
  reported_by_name: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  investigated_by: string | null;
  investigated_by_name: string | null;
  investigation_date: string | null;
  immediate_cause: string | null;
  root_cause: string | null;
  root_cause_category: string | null;
  ppe_used: boolean | null;
  procedure_followed: boolean | null;
  supervision_adequate: boolean | null;
  training_adequate: boolean | null;
  witness_details: string | null;
  investigation_notes: string | null;
  status: string;
  closed_by_name: string | null;
  closed_at: string | null;
  close_notes: string | null;
  remarks: string | null;
  photos: string[];
  evidence?: IncidentEvidenceItem[];
  actions?: IncidentActionItem[];
  logs?: IncidentLogItem[];
  created_at: string;
  updated_at: string;
}

export interface IncidentEvidenceItem {
  id: string;
  related_type: string;
  related_id: string | null;
  file_path: string;
  original_name: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export interface IncidentActionItem {
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

export interface IncidentLogItem {
  id: string;
  action_type: string;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  user_name: string;
  created_at: string;
}

export interface IncidentStats {
  kpis: {
    total: number;
    reported: number;
    under_investigation: number;
    action_assigned: number;
    in_progress: number;
    closed: number;
    reopened: number;
    escalated: number;
    critical: number;
    high_severity: number;
    near_misses: number;
    lost_time_incidents: number;
    medical_treatment: number;
    hospitalizations: number;
    property_damage: number;
    environmental: number;
  };
  monthly: { month: number; total: number; open: number; closed: number; high_severity: number; near_misses: number; lti: number }[];
  byType: { label: string; total: number }[];
  byCategory: { label: string; total: number }[];
  bySeverity: { label: string; total: number }[];
  byLocation: { label: string; total: number }[];
  byContractor: { label: string; total: number }[];
  byRootCause: { label: string; total: number }[];
  byInjuryType: { label: string; total: number }[];
  byBodyPart: { label: string; total: number }[];
}

export interface IncidentFilters {
  search: string;
  status: string;
  severity: string;
  incident_type: string;
  incident_category: string;
  contractor: string;
  location: string;
  date_from: string;
  date_to: string;
  page: number;
}

interface PaginatedResponse {
  data: Incident[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

// ─── Constants ──────────────────────────────────

export const INCIDENT_TYPES = [
  'Injury Incident', 'First Aid Case', 'Medical Treatment Case', 'Lost Time Incident',
  'Property Damage', 'Equipment Damage', 'Environmental Incident', 'Fire Incident',
  'Vehicle Incident', 'Near Miss', 'Dangerous Occurrence', 'Occupational Illness',
  'Security Incident', 'Other',
];

export const INCIDENT_CATEGORIES = [
  'Slip / Trip / Fall', 'Work at Height', 'Electrical', 'Mechanical', 'Lifting',
  'Fire', 'Chemical', 'Vehicle / Traffic', 'Manual Handling', 'PPE Related',
  'Housekeeping', 'Confined Space', 'Excavation', 'Hot Work', 'Other',
];

export const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'] as const;

export const INCIDENT_STATUSES = [
  'Reported', 'Under Investigation', 'Action Assigned', 'In Progress', 'Closed', 'Reopened', 'Escalated',
];

export const ROOT_CAUSE_CATEGORIES = [
  'Human Error', 'Lack of Training', 'Poor Supervision', 'Unsafe Condition',
  'Unsafe Act', 'Equipment Failure', 'Procedure Failure', 'Management Failure',
  'Time Pressure', 'Environmental Factor', 'Communication Failure', 'Other',
];

export const INJURY_TYPES = [
  'Cut / Laceration', 'Bruise / Contusion', 'Fracture', 'Burn', 'Sprain / Strain',
  'Crush Injury', 'Eye Injury', 'Inhalation', 'Electric Shock', 'Foreign Body',
  'Amputation', 'Back Injury', 'Heat Stroke', 'Fatigue / Exhaustion', 'Other',
];

export const BODY_PARTS = [
  'Head', 'Face', 'Eyes', 'Neck', 'Chest', 'Back', 'Abdomen',
  'Left Arm', 'Right Arm', 'Left Hand', 'Right Hand', 'Fingers',
  'Left Leg', 'Right Leg', 'Left Foot', 'Right Foot', 'Toes',
  'Shoulder', 'Hip', 'Knee', 'Multiple', 'Other',
];

// ─── Hook ───────────────────────────────────────

export function useIncidents() {
  const qc = useQueryClient();

  const [filters, setFilters] = useState<IncidentFilters>({
    search: '', status: '', severity: '', incident_type: '', incident_category: '',
    contractor: '', location: '', date_from: '', date_to: '', page: 1,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ─── Queries ────────────────────

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    if (filters.search) p.set('search', filters.search);
    if (filters.status) p.set('status', filters.status);
    if (filters.severity) p.set('severity', filters.severity);
    if (filters.incident_type) p.set('incident_type', filters.incident_type);
    if (filters.incident_category) p.set('incident_category', filters.incident_category);
    if (filters.contractor) p.set('contractor', filters.contractor);
    if (filters.location) p.set('location', filters.location);
    if (filters.date_from) p.set('date_from', filters.date_from);
    if (filters.date_to) p.set('date_to', filters.date_to);
    p.set('page', String(filters.page));
    p.set('per_page', '20');
    return p.toString();
  }, [filters]);

  const listQuery = useQuery<PaginatedResponse>({
    queryKey: ['incidents', filters],
    queryFn: () => api.get(`/incidents?${buildParams()}`),
  });

  const statsQuery = useQuery<IncidentStats>({
    queryKey: ['incidents', 'stats'],
    queryFn: () => api.get('/incidents/stats'),
  });

  const filterOptionsQuery = useQuery<{
    categories: string[];
    types: string[];
    locations: string[];
    contractors: string[];
    severities: string[];
    statuses: string[];
  }>({
    queryKey: ['incidents', 'filterOptions'],
    queryFn: () => api.get('/incidents/filters/options'),
    staleTime: 60_000,
  });

  const detailQuery = useQuery<Incident>({
    queryKey: ['incidents', 'detail', selectedId],
    queryFn: () => api.get(`/incidents/${selectedId}`),
    enabled: !!selectedId,
  });

  // ─── Mutations ──────────────────

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['incidents'] });
  };

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<{ incident: Incident }>('/incidents', data),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<{ incident: Incident }>(`/incidents/${id}`, data),
    onSuccess: invalidate,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, close_notes }: { id: string; status: string; close_notes?: string }) =>
      api.patch<{ incident: Incident }>(`/incidents/${id}/status`, { status, close_notes }),
    onSuccess: invalidate,
  });

  const assign = useMutation({
    mutationFn: ({ id, ...data }: { id: string; assigned_to_name: string; assigned_to_id?: string }) =>
      api.post<{ incident: Incident }>(`/incidents/${id}/assign`, data),
    onSuccess: invalidate,
  });

  const addInvestigation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.post<{ incident: Incident }>(`/incidents/${id}/investigation`, data),
    onSuccess: invalidate,
  });

  const addAction = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.post<{ action: IncidentActionItem }>(`/incidents/${id}/actions`, data),
    onSuccess: invalidate,
  });

  const updateAction = useMutation({
    mutationFn: ({ incidentId, actionId, data }: { incidentId: string; actionId: string; data: Record<string, unknown> }) =>
      api.put<{ action: IncidentActionItem; all_actions_completed: boolean }>(`/incidents/${incidentId}/actions/${actionId}`, data),
    onSuccess: invalidate,
  });

  const deleteAction = useMutation({
    mutationFn: ({ incidentId, actionId }: { incidentId: string; actionId: string }) =>
      api.delete(`/incidents/${incidentId}/actions/${actionId}`),
    onSuccess: invalidate,
  });

  const uploadFiles = useMutation({
    mutationFn: (files: File[]) => api.upload<{ files: { filename: string; originalName: string; size: number; mimetype: string }[] }>('/incidents/upload', files),
  });

  const uploadEvidence = useMutation({
    mutationFn: ({ id, files, related_type }: { id: string; files: File[]; related_type?: string }) => {
      const fd = new FormData();
      files.forEach(f => fd.append('files[]', f));
      if (related_type) fd.append('related_type', related_type);
      return api.uploadForm(`/incidents/${id}/evidence`, fd);
    },
    onSuccess: invalidate,
  });

  const deleteEvidence = useMutation({
    mutationFn: ({ incidentId, evidenceId }: { incidentId: string; evidenceId: string }) =>
      api.delete(`/incidents/${incidentId}/evidence/${evidenceId}`),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/incidents/${id}`),
    onSuccess: invalidate,
  });

  // ─── Filter helpers ─────────────

  const setFilter = useCallback((key: keyof IncidentFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value, ...(key !== 'page' ? { page: 1 } : {}) }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ search: '', status: '', severity: '', incident_type: '', incident_category: '', contractor: '', location: '', date_from: '', date_to: '', page: 1 });
  }, []);

  return {
    // Queries
    listQuery, statsQuery, filterOptionsQuery, detailQuery,
    // Mutations
    create, update, updateStatus, assign, addInvestigation,
    addAction, updateAction, deleteAction,
    uploadFiles, uploadEvidence, deleteEvidence, remove,
    // State
    filters, setFilter, resetFilters,
    selectedId, setSelectedId,
    incidents: listQuery.data?.data ?? [],
    total: listQuery.data?.total ?? 0,
    lastPage: listQuery.data?.last_page ?? 1,
    stats: statsQuery.data,
    filterOptions: filterOptionsQuery.data,
    detail: detailQuery.data,
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
