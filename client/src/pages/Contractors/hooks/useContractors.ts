import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../services/api';

/* ── Types ─────────────────────────────────────────── */

export interface ContractorContact {
  id: number;
  contractor_id: number;
  name: string;
  designation: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  id_number: string | null;
  is_primary_contact: boolean;
  is_site_supervisor: boolean;
  is_safety_rep: boolean;
  is_emergency_contact: boolean;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface ContractorDocument {
  id: number;
  contractor_id: number;
  document_type: string;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  issued_by: string | null;
  file_path: string | null;
  original_name: string | null;
  file_type: string | null;
  file_size_kb: number | null;
  status: string;
  verification_status: string;
  verified_by: string | null;
  verified_by_id: string | null;
  verified_date: string | null;
  remarks: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  url?: string | null;
  is_image?: boolean;
  created_at: string;
}

export interface ContractorLog {
  id: number;
  contractor_id: number;
  action: string;
  from_status: string | null;
  to_status: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_by_role: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  performer?: { id: string; full_name: string } | null;
}

export interface ContractorModuleLink {
  id: number;
  contractor_id: number;
  module_type: string;
  module_id: number;
  module_code: string | null;
  module_title: string | null;
  link_date: string | null;
  created_at: string;
}

export interface Contractor {
  id: number;
  contractor_code: string;
  contractor_name: string;
  registered_company_name: string | null;
  trade_name: string | null;
  company_type: string;
  scope_of_work: string;
  description: string | null;
  registration_number: string | null;
  tax_number: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  primary_contact_name: string | null;
  primary_contact_designation: string | null;
  primary_contact_phone: string | null;
  primary_contact_email: string | null;
  alternate_contact: string | null;
  emergency_contact_number: string | null;
  site: string | null;
  project: string | null;
  area: string | null;
  zone: string | null;
  department: string | null;
  assigned_supervisor: string | null;
  assigned_supervisor_id: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  total_workforce: number | null;
  skilled_workers_count: number | null;
  unskilled_workers_count: number | null;
  supervisors_count: number | null;
  operators_count: number | null;
  drivers_count: number | null;
  safety_staff_count: number | null;
  current_site_headcount: number | null;
  mobilized_date: string | null;
  demobilized_date: string | null;
  contractor_status: string;
  compliance_status: string;
  is_active: boolean;
  is_suspended: boolean;
  has_expired_documents: boolean;
  has_expiring_documents: boolean;
  next_expiry_date: string | null;
  document_count: number;
  contact_count: number;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  is_contract_expired?: boolean;
  days_to_contract_end?: number | null;
  active_documents_count?: number;
  compliance_summary?: {
    license_valid: boolean;
    insurance_valid: boolean;
    docs_complete: boolean;
    is_approved: boolean;
    overall: string;
  };
  // Relations
  contacts?: ContractorContact[];
  documents?: ContractorDocument[];
  logs?: ContractorLog[];
  links?: ContractorModuleLink[];
  contacts_count?: number;
  documents_count?: number;
  created_by_user?: { id: string; full_name: string } | null;
  approved_by_user?: { id: string; full_name: string } | null;
  assigned_supervisor_user?: { id: string; full_name: string } | null;
}

export interface ContractorStats {
  kpis: {
    total_contractors: number;
    active_contractors: number;
    approved_not_active: number;
    suspended: number;
    expired: number;
    with_expired_docs: number;
    with_expiring_docs: number;
    contracts_expiring_soon: number;
    total_workforce: number;
  };
  by_status: { status: string; count: number }[];
  by_compliance: { status: string; count: number }[];
  by_type: { company_type: string; count: number }[];
  by_site: { site: string; count: number }[];
  expiry_alerts: {
    contractor_code: string;
    contractor_name: string;
    document_type: string;
    expiry_date: string;
    status: string;
    days_to_expiry: number;
  }[];
  contract_expiry_alerts: {
    contractor_code: string;
    contractor_name: string;
    contract_end_date: string;
    days_remaining: number;
  }[];
  monthly_trend: { month: string; contractors_added: number; activated: number }[];
  performance_summary: {
    contractor_id: number;
    contractor_name: string;
    permit_count: number;
    incident_count: number;
    violation_count: number;
    total_links: number;
  }[];
}

export interface ContractorFilters {
  search: string;
  contractor_status: string;
  compliance_status: string;
  company_type: string;
  scope_of_work: string;
  site: string;
  area: string;
  project: string;
  is_active: string;
  is_suspended: string;
  has_expired_documents: string;
  has_expiring_documents: string;
  contract_expiring: string;
  date_from: string;
  date_to: string;
  period: string;
  sort_by: string;
  sort_dir: string;
  per_page: number;
  page: number;
}

const defaultFilters: ContractorFilters = {
  search: '', contractor_status: '', compliance_status: '',
  company_type: '', scope_of_work: '', site: '', area: '', project: '',
  is_active: '', is_suspended: '',
  has_expired_documents: '', has_expiring_documents: '', contract_expiring: '',
  date_from: '', date_to: '', period: '',
  sort_by: 'contractor_name', sort_dir: 'asc',
  per_page: 20, page: 1,
};

/* ── Hook ──────────────────────────────────────────── */

export function useContractors() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [stats, setStats] = useState<ContractorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 20 });
  const [filters, setFilters] = useState<ContractorFilters>(defaultFilters);

  const buildQuery = useCallback((f: ContractorFilters) => {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) params.append(k, String(v));
    });
    return params.toString();
  }, []);

  // Fetch list
  const fetchContractors = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true); else setLoading(true);
      setError(null);
      const qs = buildQuery(filters);
      const res = await api.get<{ data: Contractor[]; current_page: number; last_page: number; total: number; per_page: number }>(
        `/contractors?${qs}`
      );
      setContractors(res.data);
      setPagination({ current_page: res.current_page, last_page: res.last_page, total: res.total, per_page: res.per_page });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch contractors');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filters, buildQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.get<ContractorStats>('/contractors/stats');
      setStats(res);
    } catch {
      // non-blocking
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch single
  const fetchContractor = useCallback(async (id: number): Promise<Contractor> => {
    return api.get<Contractor>(`/contractors/${id}`);
  }, []);

  // CRUD
  const createContractor = useCallback(async (data: Record<string, unknown>) => {
    const res = await api.post<{ contractor: Contractor }>('/contractors', data);
    await fetchContractors();
    await fetchStats();
    return res.contractor;
  }, [fetchContractors, fetchStats]);

  const updateContractor = useCallback(async (id: number, data: Record<string, unknown>) => {
    const res = await api.put<{ contractor: Contractor }>(`/contractors/${id}`, data);
    await fetchContractors();
    return res.contractor;
  }, [fetchContractors]);

  const deleteContractor = useCallback(async (id: number) => {
    await api.delete(`/contractors/${id}`);
    await fetchContractors();
    await fetchStats();
  }, [fetchContractors, fetchStats]);

  // Workflow
  const changeStatus = useCallback(async (id: number, data: { status: string; reason?: string; notes?: string }) => {
    const res = await api.post<{ contractor: Contractor }>(`/contractors/${id}/status`, data);
    await fetchContractors();
    await fetchStats();
    return res.contractor;
  }, [fetchContractors, fetchStats]);

  // Contacts
  const addContact = useCallback(async (contractorId: number, data: Record<string, unknown>) => {
    const res = await api.post<{ contact: ContractorContact }>(`/contractors/${contractorId}/contacts`, data);
    return res.contact;
  }, []);

  const updateContact = useCallback(async (contractorId: number, contactId: number, data: Record<string, unknown>) => {
    const res = await api.put<{ contact: ContractorContact }>(`/contractors/${contractorId}/contacts/${contactId}`, data);
    return res.contact;
  }, []);

  const removeContact = useCallback(async (contractorId: number, contactId: number) => {
    await api.delete(`/contractors/${contractorId}/contacts/${contactId}`);
  }, []);

  // Documents
  const uploadDocument = useCallback(async (contractorId: number, formData: FormData) => {
    return api.uploadForm(`/contractors/${contractorId}/documents`, formData);
  }, []);

  const removeDocument = useCallback(async (contractorId: number, documentId: number) => {
    await api.delete(`/contractors/${contractorId}/documents/${documentId}`);
  }, []);

  const verifyDocument = useCallback(async (contractorId: number, documentId: number, data: Record<string, unknown>) => {
    const res = await api.post<{ document: ContractorDocument }>(`/contractors/${contractorId}/documents/${documentId}/verify`, data);
    return res.document;
  }, []);

  // Linked Records
  const fetchLinkedRecords = useCallback(async (contractorId: number) => {
    return api.get<{ grouped: { module_type: string; count: number; latest: ContractorModuleLink[] }[]; total: number }>(`/contractors/${contractorId}/linked-records`);
  }, []);

  const addLink = useCallback(async (contractorId: number, data: Record<string, unknown>) => {
    return api.post<{ link: ContractorModuleLink }>(`/contractors/${contractorId}/link`, data);
  }, []);

  // Performance
  const fetchPerformance = useCallback(async (contractorId: number) => {
    return api.get<{ summary: Record<string, number>; monthly_activity: { month: string; incidents: number; violations: number; permits: number }[] }>(`/contractors/${contractorId}/performance`);
  }, []);

  // Export
  const exportContractors = useCallback(async (format: string = 'xlsx') => {
    const qs = buildQuery(filters);
    api.download(`/contractors/export?${qs}&format=${format}`);
  }, [filters, buildQuery]);

  // Refresh
  const refresh = useCallback(() => {
    fetchContractors(true);
    fetchStats();
  }, [fetchContractors, fetchStats]);

  // Initial load
  useEffect(() => { fetchContractors(); }, [fetchContractors]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  return {
    contractors, stats, loading, statsLoading, error, isRefreshing,
    pagination, filters, setFilters,
    fetchContractors, fetchStats, fetchContractor,
    createContractor, updateContractor, deleteContractor,
    changeStatus,
    addContact, updateContact, removeContact,
    uploadDocument, removeDocument, verifyDocument,
    fetchLinkedRecords, addLink,
    fetchPerformance,
    exportContractors, refresh,
  };
}
