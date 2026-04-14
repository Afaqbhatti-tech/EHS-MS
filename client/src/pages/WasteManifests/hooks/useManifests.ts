import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../services/api';

/* ── Types ─────────────────────────────────────────── */

export interface ManifestAttachment {
  id: number;
  waste_manifest_id: number;
  file_path: string;
  original_name: string | null;
  file_type: string | null;
  file_size_kb: number | null;
  attachment_category: string;
  caption: string | null;
  description: string | null;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  url?: string;
  is_image?: boolean;
  created_at: string;
}

export interface ManifestLog {
  id: number;
  waste_manifest_id: number;
  action: string;
  from_status: string | null;
  to_status: string | null;
  performed_by: number | null;
  performed_by_name: string | null;
  performed_by_role: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  performer?: { id: number; full_name: string } | null;
}

export interface Manifest {
  id: number;
  manifest_code: string;
  manifest_number: string | null;
  manifest_date: string;
  dispatch_date: string | null;
  dispatch_time: string | null;
  priority: string;
  notes: string | null;
  status: string;
  // Source
  source_site: string | null;
  source_project: string | null;
  source_area: string | null;
  source_zone: string | null;
  source_department: string | null;
  generating_activity: string | null;
  generator_company: string | null;
  responsible_person: string | null;
  responsible_person_id: number | null;
  contact_number: string | null;
  // Waste
  waste_type: string;
  waste_category: string;
  waste_description: string | null;
  hazard_classification: string | null;
  waste_code: string | null;
  un_code: string | null;
  physical_form: string | null;
  chemical_composition: string | null;
  compatibility_notes: string | null;
  special_handling: string | null;
  // Quantity
  quantity: number;
  unit: string;
  container_count: number | null;
  packaging_type: string | null;
  container_ids: string | null;
  gross_weight_kg: number | null;
  net_weight_kg: number | null;
  temporary_storage_location: string | null;
  storage_condition: string | null;
  // Transporter
  transporter_name: string | null;
  transporter_license_no: string | null;
  driver_name: string | null;
  driver_contact: string | null;
  vehicle_number: string | null;
  vehicle_type: string | null;
  transport_permit_number: string | null;
  handover_by: string | null;
  handover_date: string | null;
  handover_time: string | null;
  transport_start_date: string | null;
  expected_delivery_date: string | null;
  handover_note: string | null;
  // Facility
  facility_name: string | null;
  facility_license_no: string | null;
  facility_address: string | null;
  treatment_method: string | null;
  receiving_person: string | null;
  receiving_date: string | null;
  receiving_time: string | null;
  final_destination_status: string | null;
  disposal_certificate_no: string | null;
  final_notes: string | null;
  // Compliance
  regulatory_reference: string | null;
  permit_license_reference: string | null;
  manifest_compliance_status: string;
  hazardous_waste_compliance: boolean;
  special_approval_required: boolean;
  special_approval_note: string | null;
  legal_remarks: string | null;
  // Links
  linked_waste_record_id: number | null;
  linked_env_incident_id: number | null;
  linked_incident_id: number | null;
  linked_inspection_id: number | null;
  linked_compliance_id: number | null;
  // Workflow
  created_by: number | null;
  updated_by: number | null;
  dispatched_by: number | null;
  dispatched_at: string | null;
  received_by: string | null;
  received_at: string | null;
  completed_by: number | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  is_delayed: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  is_hazardous?: boolean;
  days_in_transit?: number | null;
  is_overdue?: boolean;
  // Relations
  attachments?: ManifestAttachment[];
  logs?: ManifestLog[];
  attachments_count?: number;
  created_by_user?: { id: number; full_name: string } | null;
  dispatched_by_user?: { id: number; full_name: string } | null;
  completed_by_user?: { id: number; full_name: string } | null;
  responsible_person_user?: { id: number; full_name: string } | null;
  linked_waste_record?: { id: number; waste_code: string; waste_type: string } | null;
  linked_env_incident?: Record<string, unknown> | null;
  linked_inspection?: Record<string, unknown> | null;
  linked_compliance?: Record<string, unknown> | null;
}

export interface ManifestStats {
  kpis: {
    total_manifests: number;
    draft_prepared: number;
    in_transit: number;
    completed: number;
    cancelled_rejected: number;
    hazardous_manifests: number;
    non_compliant_manifests: number;
    delayed_manifests: number;
    created_this_month: number;
  };
  by_status: { status: string; count: number }[];
  by_waste_type: { waste_type: string; count: number; total_quantity: number }[];
  by_waste_category: { waste_category: string; count: number }[];
  by_treatment_method: { treatment_method: string; count: number }[];
  top_transporters: { transporter_name: string; count: number }[];
  top_facilities: { facility_name: string; count: number }[];
  monthly_trend: { month: string; total_manifests: number; hazardous_count: number; completed_count: number }[];
  quantity_by_type: { waste_type: string; unit: string; total_quantity: number }[];
  delayed_list: { id: number; manifest_code: string; waste_type: string; transporter_name: string; expected_delivery_date: string; days_delayed: number }[];
}

export interface ManifestFilters {
  search: string;
  status: string;
  waste_type: string;
  waste_category: string;
  source_area: string;
  source_department: string;
  transporter_name: string;
  facility_name: string;
  generator_company: string;
  priority: string;
  manifest_compliance_status: string;
  is_delayed: string;
  linked_waste_record_id: string;
  date_from: string;
  date_to: string;
  dispatch_from: string;
  dispatch_to: string;
  period: string;
  sort_by: string;
  sort_dir: string;
  per_page: number;
  page: number;
}

const defaultFilters: ManifestFilters = {
  search: '', status: '', waste_type: '', waste_category: '',
  source_area: '', source_department: '', transporter_name: '',
  facility_name: '', generator_company: '', priority: '',
  manifest_compliance_status: '', is_delayed: '', linked_waste_record_id: '',
  date_from: '', date_to: '', dispatch_from: '', dispatch_to: '',
  period: '', sort_by: 'manifest_date', sort_dir: 'desc',
  per_page: 20, page: 1,
};

/* ── Hook ──────────────────────────────────────────── */

export function useManifests() {
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [stats, setStats] = useState<ManifestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 20 });
  const [filters, setFilters] = useState<ManifestFilters>(defaultFilters);

  const buildQuery = useCallback((f: ManifestFilters) => {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) params.append(k, String(v));
    });
    return params.toString();
  }, []);

  // Fetch list
  const fetchManifests = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true); else setLoading(true);
      setError(null);
      const qs = buildQuery(filters);
      const res = await api.get<{ data: Manifest[]; current_page: number; last_page: number; total: number; per_page: number }>(
        `/waste-manifests?${qs}`
      );
      setManifests(res.data);
      setPagination({ current_page: res.current_page, last_page: res.last_page, total: res.total, per_page: res.per_page });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch manifests');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filters, buildQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.get<ManifestStats>('/waste-manifests/stats');
      setStats(res);
    } catch {
      // stats failure is non-blocking
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch single
  const fetchManifest = useCallback(async (id: number): Promise<Manifest> => {
    return api.get<Manifest>(`/waste-manifests/${id}`);
  }, []);

  // CRUD
  const createManifest = useCallback(async (data: Record<string, unknown>) => {
    const res = await api.post<{ manifest: Manifest }>('/waste-manifests', data);
    await fetchManifests();
    await fetchStats();
    return res.manifest;
  }, [fetchManifests, fetchStats]);

  const updateManifest = useCallback(async (id: number, data: Record<string, unknown>) => {
    const res = await api.put<{ manifest: Manifest }>(`/waste-manifests/${id}`, data);
    await fetchManifests();
    return res.manifest;
  }, [fetchManifests]);

  const deleteManifest = useCallback(async (id: number) => {
    await api.delete(`/waste-manifests/${id}`);
    await fetchManifests();
    await fetchStats();
  }, [fetchManifests, fetchStats]);

  // Workflow
  const changeStatus = useCallback(async (id: number, data: { status: string; cancellation_reason?: string }) => {
    const res = await api.post<{ manifest: Manifest }>(`/waste-manifests/${id}/status`, data);
    await fetchManifests();
    await fetchStats();
    return res.manifest;
  }, [fetchManifests, fetchStats]);

  const confirmDispatch = useCallback(async (id: number, data: Record<string, unknown>) => {
    const res = await api.post<{ manifest: Manifest }>(`/waste-manifests/${id}/confirm-dispatch`, data);
    await fetchManifests();
    await fetchStats();
    return res.manifest;
  }, [fetchManifests, fetchStats]);

  const confirmReceiving = useCallback(async (id: number, data: Record<string, unknown>) => {
    const res = await api.post<{ manifest: Manifest }>(`/waste-manifests/${id}/confirm-receiving`, data);
    await fetchManifests();
    await fetchStats();
    return res.manifest;
  }, [fetchManifests, fetchStats]);

  const confirmDisposal = useCallback(async (id: number, formData: FormData) => {
    const result = await api.uploadForm<{ manifest: Manifest }>(`/waste-manifests/${id}/confirm-disposal`, formData);
    await fetchManifests();
    await fetchStats();
    return result.manifest;
  }, [fetchManifests, fetchStats]);

  // Attachments
  const uploadAttachment = useCallback(async (manifestId: number, files: File[], category?: string) => {
    const formData = new FormData();
    files.forEach(f => formData.append('attachments[]', f));
    if (category) formData.append('attachment_category', category);
    return api.uploadForm(`/waste-manifests/${manifestId}/attachments`, formData);
  }, []);

  const removeAttachment = useCallback(async (manifestId: number, attachmentId: number) => {
    await api.delete(`/waste-manifests/${manifestId}/attachments/${attachmentId}`);
  }, []);

  // Export
  const exportManifests = useCallback(async (format: string = 'xlsx') => {
    const qs = buildQuery(filters);
    api.download(`/waste-manifests/export?${qs}&format=${format}`);
  }, [filters, buildQuery]);

  // Refresh
  const refresh = useCallback(() => {
    fetchManifests(true);
    fetchStats();
  }, [fetchManifests, fetchStats]);

  // Initial load
  useEffect(() => { fetchManifests(); }, [fetchManifests]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  return {
    manifests, stats, loading, statsLoading, error, isRefreshing,
    pagination, filters, setFilters,
    fetchManifests, fetchStats, fetchManifest,
    createManifest, updateManifest, deleteManifest,
    changeStatus, confirmDispatch, confirmReceiving, confirmDisposal,
    uploadAttachment, removeAttachment,
    exportManifests, refresh,
  };
}
