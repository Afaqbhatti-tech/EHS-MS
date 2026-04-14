import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../services/api';

/* ── Types ─────────────────────────────────────────── */

export interface AmendmentChange {
  id: string;
  amendment_id: string;
  change_order: number;
  change_category: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_reason: string | null;
  is_major_trigger: boolean;
}

export interface AmendmentAttachment {
  id: string;
  amendment_id: string;
  file_path: string;
  original_name: string | null;
  file_type: string | null;
  file_size_kb: number | null;
  attachment_category: string;
  caption: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  url?: string;
  is_image?: boolean;
  created_at: string;
}

export interface AmendmentLog {
  id: string;
  amendment_id: string;
  permit_id: string | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_by_role: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AmendmentPermit {
  id: string;
  ref_number: string;
  permit_type: string;
  zone: string | null;
  status: string;
  current_revision_number: number;
}

export interface Amendment {
  id: string;
  ref_number: string;
  amendment_code: string;
  permit_id: string;
  revision_number: number;
  amendment_title: string;
  amendment_type: string;
  amendment_category: string;
  amendment_reason: string | null;
  reason: string;
  priority: string;
  status: string;
  requested_by: string | null;
  requested_by_id: string | null;
  request_date: string | null;
  effective_from: string | null;
  effective_to: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  approval_comments: string | null;
  conditions: string | null;
  rejected_by: string | null;
  rejected_by_id: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  is_active_revision: boolean;
  superseded_by_id: string | null;
  is_major_change_flagged: boolean;
  major_change_note: string | null;
  permit_number_snapshot: string | null;
  permit_type_snapshot: string | null;
  permit_area_snapshot: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  permit?: AmendmentPermit;
  changes?: AmendmentChange[];
  attachments?: AmendmentAttachment[];
  logs?: AmendmentLog[];
  requested_by_user?: { id: string; name: string } | null;
  reviewed_by_user?: { id: string; name: string } | null;
  // Counts
  changes_count?: number;
  attachments_count?: number;
  change_count?: number;
  is_major?: boolean;
  permit_amendments_summary?: Amendment[];
}

export interface AmendmentStats {
  kpis: {
    total_amendments: number;
    pending_review: number;
    approved: number;
    rejected: number;
    approved_with_comments: number;
    major_amendments: number;
    minor_amendments: number;
    this_month: number;
    open_for_permits: number;
  };
  by_type: { amendment_type: string; count: number }[];
  by_category: { amendment_category: string; count: number }[];
  by_status: { status: string; count: number }[];
  monthly_trend: { month: string; total: number; approved: number; rejected: number }[];
  most_amended: { permit_id: string; permit_number_snapshot: string; permit_type_snapshot: string; amendment_count: number }[];
  avg_approval_days: number;
  by_area: { permit_area_snapshot: string; count: number }[];
}

export interface AmendmentFilters {
  search: string;
  amendment_type: string;
  amendment_category: string;
  status: string;
  priority: string;
  permit_id: string;
  area: string;
  permit_type: string;
  date_from: string;
  date_to: string;
  effective_from: string;
  effective_to: string;
  is_major_change_flagged: string;
  period: string;
  sort_by: string;
  sort_dir: string;
  per_page: number;
  page: number;
}

const defaultFilters: AmendmentFilters = {
  search: '', amendment_type: '', amendment_category: '', status: '',
  priority: '', permit_id: '', area: '', permit_type: '',
  date_from: '', date_to: '', effective_from: '', effective_to: '',
  is_major_change_flagged: '', period: '', sort_by: 'created_at',
  sort_dir: 'desc', per_page: 20, page: 1,
};

/* ── Hook ──────────────────────────────────────────── */

export function useAmendments() {
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [stats, setStats] = useState<AmendmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 20 });
  const [filters, setFilters] = useState<AmendmentFilters>(defaultFilters);
  const [selectedAmendment, setSelectedAmendment] = useState<Amendment | null>(null);

  // Build query string from filters
  const buildQuery = useCallback((f: AmendmentFilters) => {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) params.append(k, String(v));
    });
    return params.toString();
  }, []);

  // Fetch list
  const fetchAmendments = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true); else setLoading(true);
      setError(null);
      const qs = buildQuery(filters);
      const res = await api.get<{ data: Amendment[]; current_page: number; last_page: number; total: number; per_page: number }>(
        `/permit-amendments?${qs}`
      );
      setAmendments(res.data);
      setPagination({ current_page: res.current_page, last_page: res.last_page, total: res.total, per_page: res.per_page });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch amendments');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filters, buildQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.get<AmendmentStats>('/permit-amendments/stats');
      setStats(res);
    } catch {
      // stats failure is non-blocking
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch single
  const fetchAmendment = useCallback(async (id: string): Promise<Amendment> => {
    const res = await api.get<Amendment>(`/permit-amendments/${id}`);
    setSelectedAmendment(res);
    return res;
  }, []);

  // CRUD
  const createAmendment = useCallback(async (data: Record<string, unknown>) => {
    const res = await api.post<{ amendment: Amendment }>('/permit-amendments', data);
    await fetchAmendments();
    await fetchStats();
    return res.amendment;
  }, [fetchAmendments, fetchStats]);

  const updateAmendment = useCallback(async (id: string, data: Record<string, unknown>) => {
    const res = await api.put<{ amendment: Amendment }>(`/permit-amendments/${id}`, data);
    await fetchAmendments();
    await fetchStats();
    return res.amendment;
  }, [fetchAmendments, fetchStats]);

  const deleteAmendment = useCallback(async (id: string) => {
    await api.delete(`/permit-amendments/${id}`);
    await fetchAmendments();
    await fetchStats();
  }, [fetchAmendments, fetchStats]);

  // Workflow
  const submitForReview = useCallback(async (id: string) => {
    const res = await api.post<{ amendment: Amendment }>(`/permit-amendments/${id}/submit`, {});
    await fetchAmendments();
    await fetchStats();
    return res.amendment;
  }, [fetchAmendments, fetchStats]);

  const approve = useCallback(async (id: string, data: { approval_comments?: string; conditions?: string }) => {
    const res = await api.post<{ amendment: Amendment }>(`/permit-amendments/${id}/approve`, data);
    await fetchAmendments();
    await fetchStats();
    return res.amendment;
  }, [fetchAmendments, fetchStats]);

  const reject = useCallback(async (id: string, data: { rejection_reason: string }) => {
    const res = await api.post<{ amendment: Amendment }>(`/permit-amendments/${id}/reject`, data);
    await fetchAmendments();
    await fetchStats();
    return res.amendment;
  }, [fetchAmendments, fetchStats]);

  const approveWithComments = useCallback(async (id: string, data: { approval_comments: string; conditions?: string }) => {
    const res = await api.post<{ amendment: Amendment }>(`/permit-amendments/${id}/approve-with-comments`, data);
    await fetchAmendments();
    await fetchStats();
    return res.amendment;
  }, [fetchAmendments, fetchStats]);

  const markUnderReview = useCallback(async (id: string) => {
    const res = await api.post<{ amendment: Amendment }>(`/permit-amendments/${id}/mark-under-review`, {});
    await fetchAmendments();
    return res.amendment;
  }, [fetchAmendments]);

  const cancel = useCallback(async (id: string, data: { cancellation_reason: string }) => {
    const res = await api.post<{ amendment: Amendment }>(`/permit-amendments/${id}/cancel`, data);
    await fetchAmendments();
    await fetchStats();
    return res.amendment;
  }, [fetchAmendments, fetchStats]);

  // Change rows
  const addChange = useCallback(async (amendmentId: string, data: Record<string, unknown>) => {
    const res = await api.post<{ change: AmendmentChange }>(`/permit-amendments/${amendmentId}/changes`, data);
    return res.change;
  }, []);

  const updateChange = useCallback(async (amendmentId: string, changeId: string, data: Record<string, unknown>) => {
    const res = await api.put<{ change: AmendmentChange }>(`/permit-amendments/${amendmentId}/changes/${changeId}`, data);
    return res.change;
  }, []);

  const deleteChange = useCallback(async (amendmentId: string, changeId: string) => {
    await api.delete(`/permit-amendments/${amendmentId}/changes/${changeId}`);
  }, []);

  // Attachments
  const uploadAttachment = useCallback(async (amendmentId: string, files: File[], category?: string) => {
    const formData = new FormData();
    files.forEach(f => formData.append('attachments[]', f));
    if (category) formData.append('attachment_category', category);
    return api.uploadForm(`/permit-amendments/${amendmentId}/attachments`, formData);
  }, []);

  const removeAttachment = useCallback(async (amendmentId: string, attachmentId: string) => {
    await api.delete(`/permit-amendments/${amendmentId}/attachments/${attachmentId}`);
  }, []);

  // Permit history
  const fetchPermitHistory = useCallback(async (permitId: string) => {
    return api.get<{ permit: Record<string, unknown>; amendments: Amendment[] }>(
      `/permit-amendments/permit/${permitId}/history`
    );
  }, []);

  // Export
  const exportAmendments = useCallback(async (format: string = 'xlsx') => {
    const qs = buildQuery(filters);
    api.download(`/permit-amendments/export?${qs}&format=${format}`);
  }, [filters, buildQuery]);

  // Refresh helper
  const refresh = useCallback(() => {
    fetchAmendments(true);
    fetchStats();
  }, [fetchAmendments, fetchStats]);

  // Initial load
  useEffect(() => { fetchAmendments(); }, [fetchAmendments]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  return {
    amendments, stats, loading, statsLoading, error, isRefreshing,
    pagination, filters, setFilters,
    selectedAmendment, setSelectedAmendment,
    fetchAmendments, fetchStats, fetchAmendment,
    createAmendment, updateAmendment, deleteAmendment,
    submitForReview, approve, reject, approveWithComments,
    markUnderReview, cancel,
    addChange, updateChange, deleteChange,
    uploadAttachment, removeAttachment,
    fetchPermitHistory, exportAmendments, refresh,
  };
}

/* ── Constants ─────────────────────────────────────── */

export const AMENDMENT_TYPES = [
  'Date Extension', 'Time Extension', 'Scope Change',
  'Location Change', 'Area / Zone Change', 'Work Method Change',
  'Hazard Update', 'Control Measure Update', 'Manpower Change',
  'Equipment Change', 'Material Change', 'Supervisor Change',
  'Permit Holder Change', 'RAMS / Method Statement Update',
  'Drawing / Document Update', 'Shift Change',
  'Environmental Condition Update', 'Emergency Arrangement Update',
  'Other',
];

export const CHANGE_CATEGORIES = [
  'Permit Basics', 'Location', 'People', 'Equipment',
  'Hazards', 'Control Measures', 'Documents', 'Other',
];

export const ATTACHMENT_CATEGORIES = [
  'Revised RAMS', 'Revised Drawing', 'Revised Method Statement',
  'Photo Evidence', 'Inspection Certificate', 'Training Proof',
  'Approval Note', 'Checklist', 'Other',
];

export const STATUSES = [
  'Draft', 'Submitted', 'Under Review', 'Approved',
  'Rejected', 'Approved with Comments', 'Cancelled', 'Superseded',
];

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent', 'Critical'];

export const CHANGE_FIELD_SUGGESTIONS: Record<string, string[]> = {
  'Permit Basics': ['Permit Title', 'Start Date', 'End Date', 'Work Scope', 'Shift', 'Permit Type'],
  'Location': ['Site', 'Area', 'Zone', 'Work Location', 'Building', 'Floor / Level'],
  'People': ['Permit Holder', 'Supervisor', 'Contractor', 'Safety Officer', 'Team Lead'],
  'Equipment': ['Crane', 'MEWP', 'Scaffolding', 'Power Tools', 'Lifting Equipment'],
  'Hazards': ['Hazard Level', 'Risk Assessment', 'New Hazard', 'Hazard Classification'],
  'Control Measures': ['PPE Requirements', 'Safety Nets', 'Barriers', 'Fire Watch', 'Gas Detection'],
  'Documents': ['RAMS Reference', 'Method Statement', 'Drawing Number', 'Inspection Certificate'],
  'Other': ['General Note', 'Special Condition'],
};
