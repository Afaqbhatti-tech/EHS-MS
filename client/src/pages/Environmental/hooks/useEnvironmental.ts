import { useState, useCallback } from 'react';
import { api } from '../../../services/api';

// ─── Interfaces ──────────────────────────────────

export interface Aspect {
  id: number;
  aspect_code: string;
  activity: string;
  aspect: string;
  impact: string;
  category: string;
  source: string | null;
  area: string | null;
  zone: string | null;
  condition: string;
  significance: string;
  likelihood: number | null;
  severity: number | null;
  risk_score: number | null;
  control_measures: string | null;
  legal_requirement: string | null;
  responsible_person: string | null;
  responsible_person_id: string | null;
  review_date: string | null;
  status: string;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Risk {
  id: number;
  risk_code: string;
  aspect_id: number | null;
  title: string;
  description: string | null;
  risk_type: string;
  category: string;
  source: string | null;
  area: string | null;
  zone: string | null;
  likelihood: number;
  consequence: number;
  risk_level: string;
  risk_score: number;
  existing_controls: string | null;
  additional_controls: string | null;
  residual_likelihood: number | null;
  residual_consequence: number | null;
  residual_risk_level: string | null;
  residual_risk_score: number | null;
  responsible_person: string | null;
  responsible_person_id: string | null;
  review_date: string | null;
  status: string;
  notes: string | null;
  aspect?: Aspect | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface WasteRecord {
  id: number;
  waste_code: string;
  waste_type: string;
  waste_category: string;
  description: string | null;
  source: string | null;
  area: string | null;
  zone: string | null;
  quantity: number;
  unit: string;
  generation_date: string;
  storage_location: string | null;
  disposal_method: string | null;
  disposal_date: string | null;
  disposal_vendor: string | null;
  manifest_number: string | null;
  cost: number | null;
  responsible_person: string | null;
  responsible_person_id: string | null;
  status: string;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Monitoring {
  id: number;
  monitoring_code: string;
  parameter: string;
  category: string;
  location: string;
  area: string | null;
  zone: string | null;
  measurement_value: number;
  unit: string;
  threshold_min: number | null;
  threshold_max: number | null;
  standard_reference: string | null;
  monitoring_date: string;
  monitoring_time: string | null;
  frequency: string | null;
  method: string | null;
  equipment_used: string | null;
  calibration_date: string | null;
  sampled_by: string | null;
  sampled_by_id: string | null;
  is_exceedance: boolean;
  corrective_action: string | null;
  status: string;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: number;
  resource_code: string;
  resource_type: string;
  name: string;
  description: string | null;
  category: string;
  area: string | null;
  zone: string | null;
  consumption_value: number;
  unit: string;
  period_start: string;
  period_end: string;
  baseline_value: number | null;
  target_value: number | null;
  cost: number | null;
  supplier: string | null;
  reduction_initiative: string | null;
  responsible_person: string | null;
  responsible_person_id: string | null;
  status: string;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: number;
  incident_code: string;
  title: string;
  description: string | null;
  incident_type: string;
  category: string;
  severity: string;
  area: string | null;
  zone: string | null;
  location: string | null;
  incident_date: string;
  incident_time: string | null;
  reported_by: string | null;
  reported_by_id: string | null;
  reported_date: string | null;
  cause: string | null;
  root_cause: string | null;
  immediate_action: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  environmental_impact: string | null;
  media_affected: string | null;
  quantity_released: number | null;
  release_unit: string | null;
  containment_measures: string | null;
  cleanup_method: string | null;
  regulatory_notified: boolean;
  regulatory_reference: string | null;
  investigation_status: string | null;
  responsible_person: string | null;
  responsible_person_id: string | null;
  closure_date: string | null;
  closure_notes: string | null;
  status: string;
  notes: string | null;
  evidence?: Array<{ id: number; file_path: string; original_name: string; url: string }>;
  actions?: Array<{ id: number; title: string; status: string; due_date: string | null }>;
  logs?: LogEntry[];
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: number;
  inspection_code: string;
  title: string;
  inspection_type: string;
  category: string;
  area: string | null;
  zone: string | null;
  location: string | null;
  scheduled_date: string;
  conducted_date: string | null;
  conducted_by: string | null;
  conducted_by_id: string | null;
  frequency: string | null;
  checklist_used: string | null;
  findings: string | null;
  non_conformances: number;
  observations_count: number;
  recommendations: string | null;
  corrective_actions: string | null;
  follow_up_date: string | null;
  follow_up_status: string | null;
  overall_rating: string | null;
  score: number | null;
  responsible_person: string | null;
  responsible_person_id: string | null;
  status: string;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Compliance {
  id: number;
  compliance_code: string;
  regulation: string;
  requirement: string;
  description: string | null;
  category: string;
  authority: string | null;
  applicable_area: string | null;
  compliance_status: string;
  evidence: string | null;
  gap_description: string | null;
  action_required: string | null;
  deadline: string | null;
  permit_number: string | null;
  permit_expiry: string | null;
  last_audit_date: string | null;
  next_audit_date: string | null;
  responsible_person: string | null;
  responsible_person_id: string | null;
  risk_level: string | null;
  penalty_risk: string | null;
  status: string;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Objective {
  id: number;
  objective_code: string;
  title: string;
  description: string | null;
  category: string;
  target: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  baseline_value: number | null;
  baseline_year: string | null;
  target_year: string | null;
  start_date: string;
  end_date: string;
  progress_percentage: number;
  kpi: string | null;
  measurement_method: string | null;
  frequency: string | null;
  responsible_person: string | null;
  responsible_person_id: string | null;
  department: string | null;
  budget_allocated: number | null;
  budget_spent: number | null;
  status: string;
  notes: string | null;
  actions?: Action[];
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Action {
  id: number;
  action_code: string;
  title: string;
  description: string | null;
  action_type: string;
  category: string;
  source_type: string | null;
  source_id: number | null;
  priority: string;
  assigned_to: string | null;
  assigned_to_id: string | null;
  due_date: string | null;
  start_date: string | null;
  completion_date: string | null;
  completion_notes: string | null;
  verification_required: boolean;
  verified_by: string | null;
  verified_date: string | null;
  cost_estimate: number | null;
  actual_cost: number | null;
  status: string;
  notes: string | null;
  assigned_to_user?: { id: string; full_name: string } | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnvStats {
  kpis: {
    total_aspects: number;
    significant_aspects: number;
    high_risks: number;
    open_incidents: number;
    pending_inspections: number;
    compliance_rate: number;
    waste_this_month: number;
    exceedances_this_month: number;
    active_objectives: number;
    open_actions: number;
    overdue_actions: number;
    resource_consumption_trend: number;
  };
  by_category: Array<{ label: string; total: number }>;
  risk_matrix: Array<{ likelihood: number; consequence: number; count: number }>;
  waste_by_type: Array<{ label: string; total_quantity: number; unit: string }>;
  monitoring_trends: Array<{ month: string; exceedances: number; readings: number }>;
  compliance_by_status: Array<{ label: string; total: number }>;
  incident_trend: Array<{ month: string; incidents: number; severity_high: number }>;
  objective_progress: Array<{ id: number; objective_code: string; title: string; progress_percentage: number; status: string }>;
  action_summary: Array<{ status: string; total: number }>;
  resource_by_type: Array<{ label: string; total_consumption: number; unit: string }>;
}

export interface LogEntry {
  id: number;
  action: string;
  from_status: string | null;
  to_status: string | null;
  performed_by_name: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Paginated Response ──────────────────────────

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

// ─── Section State ───────────────────────────────

interface SectionState<T> {
  data: T[];
  loading: boolean;
  total: number;
  page: number;
  lastPage: number;
}

function defaultSectionState<T>(): SectionState<T> {
  return { data: [], loading: false, total: 0, page: 1, lastPage: 1 };
}

// ─── Helper ──────────────────────────────────────

function buildQueryString(filters?: Record<string, unknown>): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

// ─── Hook ────────────────────────────────────────

export function useEnvironmental() {
  // Stats
  const [stats, setStats] = useState<EnvStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Section states
  const [aspects, setAspects] = useState<SectionState<Aspect>>(defaultSectionState);
  const [risks, setRisks] = useState<SectionState<Risk>>(defaultSectionState);
  const [waste, setWaste] = useState<SectionState<WasteRecord>>(defaultSectionState);
  const [monitoring, setMonitoring] = useState<SectionState<Monitoring>>(defaultSectionState);
  const [resources, setResources] = useState<SectionState<Resource>>(defaultSectionState);
  const [incidents, setIncidents] = useState<SectionState<Incident>>(defaultSectionState);
  const [inspections, setInspections] = useState<SectionState<Inspection>>(defaultSectionState);
  const [compliance, setCompliance] = useState<SectionState<Compliance>>(defaultSectionState);
  const [objectives, setObjectives] = useState<SectionState<Objective>>(defaultSectionState);
  const [actions, setActions] = useState<SectionState<Action>>(defaultSectionState);

  // ─── Stats ───────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get<EnvStats>('/environmental/stats');
      setStats(res);
      return res;
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ─── Generic fetch helper ────────────────────────

  function createFetchFn<T>(
    section: string,
    setter: React.Dispatch<React.SetStateAction<SectionState<T>>>,
  ) {
    return async (filters?: Record<string, unknown>) => {
      setter(prev => ({ ...prev, loading: true }));
      try {
        const qs = buildQueryString(filters);
        const url = `/environmental/${section}${qs ? `?${qs}` : ''}`;
        const res = await api.get<PaginatedResponse<T>>(url);
        setter({
          data: res.data,
          loading: false,
          total: res.total,
          page: res.page,
          lastPage: res.last_page,
        });
        return res;
      } catch (err) {
        setter(prev => ({ ...prev, loading: false }));
        throw err;
      }
    };
  }

  // ─── Aspects ─────────────────────────────────────

  const fetchAspects = useCallback(createFetchFn<Aspect>('aspects', setAspects), []);

  const createAspect = useCallback(async (data: Record<string, unknown>) => {
    return api.post<{ aspect: Aspect }>('/environmental/aspects', data);
  }, []);

  const updateAspect = useCallback(async (id: number, data: Record<string, unknown>) => {
    return api.put<{ aspect: Aspect }>(`/environmental/aspects/${id}`, data);
  }, []);

  const deleteAspect = useCallback(async (id: number) => {
    return api.delete(`/environmental/aspects/${id}`);
  }, []);

  const showAspect = useCallback(async (id: number) => {
    return api.get<Aspect>(`/environmental/aspects/${id}`);
  }, []);

  // ─── Risks ───────────────────────────────────────

  const fetchRisks = useCallback(createFetchFn<Risk>('risks', setRisks), []);

  const createRisk = useCallback(async (data: Record<string, unknown>) => {
    return api.post<{ risk: Risk }>('/environmental/risks', data);
  }, []);

  const updateRisk = useCallback(async (id: number, data: Record<string, unknown>) => {
    return api.put<{ risk: Risk }>(`/environmental/risks/${id}`, data);
  }, []);

  const deleteRisk = useCallback(async (id: number) => {
    return api.delete(`/environmental/risks/${id}`);
  }, []);

  const showRisk = useCallback(async (id: number) => {
    return api.get<Risk>(`/environmental/risks/${id}`);
  }, []);

  // ─── Waste ───────────────────────────────────────

  const fetchWaste = useCallback(createFetchFn<WasteRecord>('waste', setWaste), []);

  const createWaste = useCallback(async (data: Record<string, unknown>) => {
    return api.post<{ waste: WasteRecord }>('/environmental/waste', data);
  }, []);

  const updateWaste = useCallback(async (id: number, data: Record<string, unknown>) => {
    return api.put<{ waste: WasteRecord }>(`/environmental/waste/${id}`, data);
  }, []);

  const deleteWaste = useCallback(async (id: number) => {
    return api.delete(`/environmental/waste/${id}`);
  }, []);

  const showWaste = useCallback(async (id: number) => {
    return api.get<WasteRecord>(`/environmental/waste/${id}`);
  }, []);

  // ─── Monitoring ──────────────────────────────────

  const fetchMonitoring = useCallback(createFetchFn<Monitoring>('monitoring', setMonitoring), []);

  const createMonitoring = useCallback(async (data: Record<string, unknown>) => {
    return api.post<{ monitoring: Monitoring }>('/environmental/monitoring', data);
  }, []);

  const updateMonitoring = useCallback(async (id: number, data: Record<string, unknown>) => {
    return api.put<{ monitoring: Monitoring }>(`/environmental/monitoring/${id}`, data);
  }, []);

  const deleteMonitoring = useCallback(async (id: number) => {
    return api.delete(`/environmental/monitoring/${id}`);
  }, []);

  const showMonitoring = useCallback(async (id: number) => {
    return api.get<Monitoring>(`/environmental/monitoring/${id}`);
  }, []);

  // ─── Resources ───────────────────────────────────

  const fetchResources = useCallback(createFetchFn<Resource>('resources', setResources), []);

  const createResource = useCallback(async (data: Record<string, unknown>) => {
    return api.post<{ resource: Resource }>('/environmental/resources', data);
  }, []);

  const updateResource = useCallback(async (id: number, data: Record<string, unknown>) => {
    return api.put<{ resource: Resource }>(`/environmental/resources/${id}`, data);
  }, []);

  const deleteResource = useCallback(async (id: number) => {
    return api.delete(`/environmental/resources/${id}`);
  }, []);

  const showResource = useCallback(async (id: number) => {
    return api.get<Resource>(`/environmental/resources/${id}`);
  }, []);

  // ─── Incidents ───────────────────────────────────

  const fetchIncidents = useCallback(createFetchFn<Incident>('incidents', setIncidents), []);

  const createIncident = useCallback(async (data: Record<string, unknown>) => {
    return api.post<{ incident: Incident }>('/environmental/incidents', data);
  }, []);

  const updateIncident = useCallback(async (id: number, data: Record<string, unknown>) => {
    return api.put<{ incident: Incident }>(`/environmental/incidents/${id}`, data);
  }, []);

  const deleteIncident = useCallback(async (id: number) => {
    return api.delete(`/environmental/incidents/${id}`);
  }, []);

  const showIncident = useCallback(async (id: number) => {
    return api.get<Incident>(`/environmental/incidents/${id}`);
  }, []);

  const closeIncident = useCallback(async (id: number, notes: string) => {
    return api.post<{ incident: Incident }>(`/environmental/incidents/${id}/close`, { closure_notes: notes });
  }, []);

  // ─── Inspections ─────────────────────────────────

  const fetchInspections = useCallback(createFetchFn<Inspection>('inspections', setInspections), []);

  const createInspection = useCallback(async (data: Record<string, unknown>) => {
    return api.post<{ inspection: Inspection }>('/environmental/inspections', data);
  }, []);

  const updateInspection = useCallback(async (id: number, data: Record<string, unknown>) => {
    return api.put<{ inspection: Inspection }>(`/environmental/inspections/${id}`, data);
  }, []);

  const deleteInspection = useCallback(async (id: number) => {
    return api.delete(`/environmental/inspections/${id}`);
  }, []);

  const showInspection = useCallback(async (id: number) => {
    return api.get<Inspection>(`/environmental/inspections/${id}`);
  }, []);

  // ─── Compliance ──────────────────────────────────

  const fetchCompliance = useCallback(createFetchFn<Compliance>('compliance', setCompliance), []);

  const createCompliance = useCallback(async (data: Record<string, unknown>) => {
    return api.post<{ compliance: Compliance }>('/environmental/compliance', data);
  }, []);

  const updateCompliance = useCallback(async (id: number, data: Record<string, unknown>) => {
    return api.put<{ compliance: Compliance }>(`/environmental/compliance/${id}`, data);
  }, []);

  const deleteCompliance = useCallback(async (id: number) => {
    return api.delete(`/environmental/compliance/${id}`);
  }, []);

  const showCompliance = useCallback(async (id: number) => {
    return api.get<Compliance>(`/environmental/compliance/${id}`);
  }, []);

  // ─── Objectives ──────────────────────────────────

  const fetchObjectives = useCallback(createFetchFn<Objective>('objectives', setObjectives), []);

  const createObjective = useCallback(async (data: Record<string, unknown>) => {
    return api.post<{ objective: Objective }>('/environmental/objectives', data);
  }, []);

  const updateObjective = useCallback(async (id: number, data: Record<string, unknown>) => {
    return api.put<{ objective: Objective }>(`/environmental/objectives/${id}`, data);
  }, []);

  const deleteObjective = useCallback(async (id: number) => {
    return api.delete(`/environmental/objectives/${id}`);
  }, []);

  const showObjective = useCallback(async (id: number) => {
    return api.get<Objective>(`/environmental/objectives/${id}`);
  }, []);

  const updateProgress = useCallback(async (id: number, data: Record<string, unknown>) => {
    return api.patch<{ objective: Objective }>(`/environmental/objectives/${id}/progress`, data);
  }, []);

  // ─── Actions ─────────────────────────────────────

  const fetchActions = useCallback(createFetchFn<Action>('actions', setActions), []);

  const createAction = useCallback(async (data: Record<string, unknown>) => {
    return api.post<{ action: Action }>('/environmental/actions', data);
  }, []);

  const updateAction = useCallback(async (id: number, data: Record<string, unknown>) => {
    return api.put<{ action: Action }>(`/environmental/actions/${id}`, data);
  }, []);

  const deleteAction = useCallback(async (id: number) => {
    return api.delete(`/environmental/actions/${id}`);
  }, []);

  const showAction = useCallback(async (id: number) => {
    return api.get<Action>(`/environmental/actions/${id}`);
  }, []);

  // ─── Return ──────────────────────────────────────

  return {
    // Stats
    stats,
    statsLoading,
    fetchStats,

    // Aspects
    aspects: aspects.data,
    aspectsLoading: aspects.loading,
    aspectsPagination: { total: aspects.total, page: aspects.page, lastPage: aspects.lastPage },
    fetchAspects,
    createAspect,
    updateAspect,
    deleteAspect,
    showAspect,

    // Risks
    risks: risks.data,
    risksLoading: risks.loading,
    risksPagination: { total: risks.total, page: risks.page, lastPage: risks.lastPage },
    fetchRisks,
    createRisk,
    updateRisk,
    deleteRisk,
    showRisk,

    // Waste
    waste: waste.data,
    wasteLoading: waste.loading,
    wastePagination: { total: waste.total, page: waste.page, lastPage: waste.lastPage },
    fetchWaste,
    createWaste,
    updateWaste,
    deleteWaste,
    showWaste,

    // Monitoring
    monitoring: monitoring.data,
    monitoringLoading: monitoring.loading,
    monitoringPagination: { total: monitoring.total, page: monitoring.page, lastPage: monitoring.lastPage },
    fetchMonitoring,
    createMonitoring,
    updateMonitoring,
    deleteMonitoring,
    showMonitoring,

    // Resources
    resources: resources.data,
    resourcesLoading: resources.loading,
    resourcesPagination: { total: resources.total, page: resources.page, lastPage: resources.lastPage },
    fetchResources,
    createResource,
    updateResource,
    deleteResource,
    showResource,

    // Incidents
    incidents: incidents.data,
    incidentsLoading: incidents.loading,
    incidentsPagination: { total: incidents.total, page: incidents.page, lastPage: incidents.lastPage },
    fetchIncidents,
    createIncident,
    updateIncident,
    deleteIncident,
    showIncident,
    closeIncident,

    // Inspections
    inspections: inspections.data,
    inspectionsLoading: inspections.loading,
    inspectionsPagination: { total: inspections.total, page: inspections.page, lastPage: inspections.lastPage },
    fetchInspections,
    createInspection,
    updateInspection,
    deleteInspection,
    showInspection,

    // Compliance
    compliance: compliance.data,
    complianceLoading: compliance.loading,
    compliancePagination: { total: compliance.total, page: compliance.page, lastPage: compliance.lastPage },
    fetchCompliance,
    createCompliance,
    updateCompliance,
    deleteCompliance,
    showCompliance,

    // Objectives
    objectives: objectives.data,
    objectivesLoading: objectives.loading,
    objectivesPagination: { total: objectives.total, page: objectives.page, lastPage: objectives.lastPage },
    fetchObjectives,
    createObjective,
    updateObjective,
    deleteObjective,
    showObjective,
    updateProgress,

    // Actions
    actions: actions.data,
    actionsLoading: actions.loading,
    actionsPagination: { total: actions.total, page: actions.page, lastPage: actions.lastPage },
    fetchActions,
    createAction,
    updateAction,
    deleteAction,
    showAction,
  };
}

export default useEnvironmental;
