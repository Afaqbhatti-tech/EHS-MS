import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../services/api';

export interface MockupRamsDoc {
  id: string;
  ref_number: string;
  title: string;
  versions?: { id: string; version_number: number; file_name: string; file_size: number; notes: string | null; created_at: string }[];
}

export interface MockupPersonnelItem {
  id?: string;
  person_name: string;
  designation: string | null;
  company: string | null;
  user_id: string | null;
  source_type: 'linked' | 'manual';
}

export interface MockupApproverItem {
  id?: string;
  name: string;
  designation: string | null;
  approver_type: string | null;
  approval_status: string;
  approval_date: string | null;
}

export interface MockupAttachmentItem {
  id: string;
  attachment_type: 'approved' | 'rejected' | 'comments' | 'general';
  file_path: string;
  original_name: string | null;
  file_type: string | null;
  file_size: number;
  uploaded_by: string | null;
  created_at: string | null;
}

export interface RevisionEntry {
  id: string;
  ref_number: string;
  revision_number: number;
  approval_status: string;
  compliance_status: string | null;
  created_at: string | null;
  approved_at?: string | null;
  created_by?: string | null;
  approved_by?: string | null;
  is_current: boolean;
}

export interface Mockup {
  id: string;
  ref_number: string;
  title: string;
  description: string | null;
  procedure_type: string | null;
  mockup_type: string | null;
  area: string | null;
  zone: string | null;
  phase: string | null;
  trim_line: string | null;
  site: string | null;
  project: string | null;
  contractor: string | null;
  supervisor_name: string | null;
  approval_status: ApprovalStatus;
  revision_number: number;
  parent_mockup_id: string | null;
  compliance_status: string | null;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  can_proceed: boolean;
  has_unresolved_comments: boolean;
  unresolved_comment_count: number;
  fft_decision: string | null;
  consultant_decision: string | null;
  client_decision: string | null;
  rams_document: MockupRamsDoc | null;
  rams_version: { id: string; version_number: number; file_name: string } | null;
  rams_revision_number: string | null;
  rams_work_line: { id: string; name: string; slug: string } | null;
  involved_candidates: string | null;
  manual_approved_by: string | null;
  photos: string[];
  tags: string[] | null;
  mockup_date: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_by: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
  personnel: MockupPersonnelItem[];
  approvers: MockupApproverItem[];
}

export interface MockupDetail extends Mockup {
  notes: string | null;
  rejection_reason: string | null;
  general_remarks: string | null;
  consultant_comments: string | null;
  mockup_time: string | null;
  attachments: string[] | null;
  typed_attachments: MockupAttachmentItem[];
  submitted_by: { id: string; name: string } | null;
  approved_by: { id: string; name: string } | null;
  comments: MockupComment[];
  history: MockupHistoryEntry[];
  revision_history: RevisionEntry[];
}

export interface MockupComment {
  id: string;
  parent_comment_id: string | null;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  comment_type: string;
  comment_text: string;
  is_resolved: boolean;
  resolved_by_name: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  mockup_status_at_time: string | null;
  replies: MockupComment[];
  created_at: string;
}

export interface MockupHistoryEntry {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  performed_by_name: string | null;
  performed_by_role: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type ApprovalStatus =
  | 'Draft'
  | 'Submitted for Review'
  | 'Approved'
  | 'Rejected'
  | 'Approved with Comments'
  | 'Pending Compliance'
  | 'Comments Resolved'
  | 'Re-submitted'
  | 'Superseded';

export interface ImportResult {
  message: string;
  batch_id: string;
  summary: {
    total_parsed: number;
    success_count: number;
    failed_count: number;
    skipped_count: number;
    errors: { row: number; error: string }[];
    field_mapping: Record<string, string>;
  };
}

export interface MockupStats {
  kpis: {
    total: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    approved_with_comments: number;
    comments_resolved: number;
    resubmitted: number;
    pending_compliance: number;
    can_proceed: number;
    blocked: number;
    compliance_pending: number;
  };
  byContractor: { contractor: string; total: number }[];
  byPhase: { phase: string; total: number }[];
  byPriority: { priority: string; total: number }[];
  byMockupType: { mockup_type: string; total: number }[];
  monthly: { month: number; total: number; approved: number; rejected: number; pending: number }[];
}

export interface MockupFilters {
  search: string;
  approval_status: string;
  contractor: string;
  zone: string;
  area: string;
  phase: string;
  trim_line: string;
  mockup_type: string;
  supervisor_name: string;
  priority: string;
  period: string;
  date_from: string;
  date_to: string;
  per_page: number;
  page: number;
}

export interface FilterOptions {
  contractors: string[];
  zones: string[];
  areas: string[];
  phases: string[];
  trim_lines: string[];
  supervisors: string[];
  mockup_types: string[];
  rams_documents: { id: string; ref_number: string; title: string; versions?: { id: string; version_number: number; file_name: string }[] }[];
}

interface PaginatedResponse {
  data: Mockup[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

const DEFAULT_FILTERS: MockupFilters = {
  search: '',
  approval_status: '',
  contractor: '',
  zone: '',
  area: '',
  phase: '',
  trim_line: '',
  mockup_type: '',
  supervisor_name: '',
  priority: '',
  period: '',
  date_from: '',
  date_to: '',
  per_page: 20,
  page: 1,
};

export function useMockups() {
  const [mockups, setMockups] = useState<Mockup[]>([]);
  const [stats, setStats] = useState<MockupStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 20 });
  const [filters, setFilters] = useState<MockupFilters>(DEFAULT_FILTERS);

  const fetchMockups = useCallback(async (f: MockupFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = Object.entries(f)
        .filter(([, v]) => v !== '' && v !== 0)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      const data = await api.get<PaginatedResponse>(`/mockups?${params}`);
      setMockups(data.data || []);
      setPagination({
        currentPage: data.page,
        lastPage: data.last_page,
        total: data.total,
        perPage: data.per_page,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load mock-ups');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await api.get<MockupStats>('/mockups/stats');
      setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const data = await api.get<FilterOptions>('/mockups/filters/options');
      setFilterOptions(data);
    } catch (err) {
      console.error('Filter options error:', err);
    }
  }, []);

  useEffect(() => {
    fetchMockups(filters);
  }, [filters, fetchMockups]);

  useEffect(() => {
    fetchStats();
    fetchFilterOptions();
  }, [fetchStats, fetchFilterOptions]);

  const createMockup = async (data: Record<string, unknown>) => {
    const result = await api.post<{ message: string; mockup: Mockup }>('/mockups', data);
    await fetchMockups(filters);
    await fetchStats();
    return result;
  };

  const updateMockup = async (id: string, data: Record<string, unknown>) => {
    const result = await api.put<{ message: string; mockup: Mockup }>(`/mockups/${id}`, data);
    await fetchMockups(filters);
    await fetchStats();
    return result;
  };

  const deleteMockup = async (id: string) => {
    await api.delete(`/mockups/${id}`);
    await fetchMockups(filters);
    await fetchStats();
  };

  const getMockupDetail = async (id: string) => {
    return api.get<MockupDetail>(`/mockups/${id}`);
  };

  // Workflow actions
  const submitForReview = async (id: string) => {
    const result = await api.post<{ message: string; mockup: Mockup }>(`/mockups/${id}/submit`, {});
    await fetchMockups(filters);
    await fetchStats();
    return result;
  };

  const approve = async (id: string, approvalNote?: string, generalRemarks?: string) => {
    const result = await api.post<{ message: string; mockup: Mockup }>(`/mockups/${id}/approve`, {
      approval_note: approvalNote,
      general_remarks: generalRemarks,
    });
    await fetchMockups(filters);
    await fetchStats();
    return result;
  };

  const reject = async (id: string, rejectionReason: string) => {
    const result = await api.post<{ message: string; mockup: Mockup }>(`/mockups/${id}/reject`, { rejection_reason: rejectionReason });
    await fetchMockups(filters);
    await fetchStats();
    return result;
  };

  const approveWithComments = async (id: string, consultantComments: string) => {
    const result = await api.post<{ message: string; mockup: Mockup }>(`/mockups/${id}/approve-with-comments`, {
      consultant_comments: consultantComments,
    });
    await fetchMockups(filters);
    await fetchStats();
    return result;
  };

  const createRevision = async (id: string, resubmissionNote: string) => {
    const result = await api.post<{ message: string; mockup: Mockup }>(`/mockups/${id}/revision`, {
      resubmission_note: resubmissionNote,
    });
    await fetchMockups(filters);
    await fetchStats();
    return result;
  };

  const reSubmit = async (id: string, resubmissionNote: string, ramsVersionId?: string) => {
    const result = await api.post<{ message: string; mockup: Mockup }>(`/mockups/${id}/resubmit`, {
      resubmission_note: resubmissionNote,
      rams_version_id: ramsVersionId,
    });
    await fetchMockups(filters);
    await fetchStats();
    return result;
  };

  const addComment = async (id: string, commentText: string, commentType?: string, parentCommentId?: string) => {
    const result = await api.post<{ message: string; comment: MockupComment }>(`/mockups/${id}/comments`, {
      comment_text: commentText,
      comment_type: commentType,
      parent_comment_id: parentCommentId,
    });
    return result;
  };

  const resolveComment = async (mockupId: string, commentId: string, resolutionNote?: string) => {
    const result = await api.post<{ message: string; comment: MockupComment; mockup_can_proceed: boolean; unresolved_count: number }>(
      `/mockups/${mockupId}/comments/${commentId}/resolve`,
      { resolution_note: resolutionNote }
    );
    await fetchMockups(filters);
    await fetchStats();
    return result;
  };

  const uploadFiles = async (files: File[]) => {
    const result = await api.upload<{ files: { filename: string; originalName: string; size: number; mimetype: string }[] }>('/mockups/upload', files);
    return result.files;
  };

  const uploadPhotos = async (mockupId: string, photos: File[]): Promise<{ photos: string[]; new: { path: string; originalName: string }[] }> => {
    const formData = new FormData();
    photos.forEach(p => formData.append('photos[]', p));
    return api.uploadForm(`/mockups/${mockupId}/photos`, formData);
  };

  const deletePhoto = async (mockupId: string, photoPath: string): Promise<{ photos: string[] }> => {
    return api.delete(`/mockups/${mockupId}/photos`, { photo_path: photoPath });
  };

  const uploadAttachments = async (mockupId: string, attachmentType: string, files: File[]) => {
    const formData = new FormData();
    formData.append('attachment_type', attachmentType);
    files.forEach(f => formData.append('files[]', f));
    return api.uploadForm<{ message: string; attachments: MockupAttachmentItem[] }>(`/mockups/${mockupId}/attachments`, formData);
  };

  const deleteAttachment = async (mockupId: string, attachmentId: string) => {
    return api.delete(`/mockups/${mockupId}/attachments/${attachmentId}`);
  };

  const importMockups = async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const result = await api.uploadForm<ImportResult>('/mockups/import', formData);
    await fetchMockups(filters);
    await fetchStats();
    return result;
  };

  const exportData = (format: string = 'csv') => {
    if (format === 'copy') {
      const headers = ['Ref Number', 'Title', 'Type', 'RAMS', 'Status', 'Rev', 'Phase'];
      const text = headers.join('\t') + '\n' + mockups.map(r =>
        [r.ref_number || '', r.title || '', r.mockup_type || '', r.rams_document?.ref_number || '', r.approval_status || '', `Rev ${r.revision_number}`, r.phase || ''].join('\t')
      ).join('\n');
      navigator.clipboard.writeText(text);
      return;
    }
    const params = Object.entries(filters)
      .filter(([, v]) => v !== '' && v !== 0)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    api.download(`/mockups/export?format=${format}&${params}`);
  };

  return {
    mockups, stats, filterOptions, loading, statsLoading, error,
    pagination, filters, setFilters,
    createMockup, updateMockup, deleteMockup, getMockupDetail,
    submitForReview, approve, reject, approveWithComments,
    createRevision, reSubmit,
    addComment, resolveComment,
    uploadFiles, uploadPhotos, deletePhoto,
    uploadAttachments, deleteAttachment,
    importMockups, exportData,
    refresh: () => {
      setIsRefreshing(true);
      Promise.all([fetchMockups(filters), fetchStats()]).finally(() => setIsRefreshing(false));
    },
    isRefreshing,
  };
}
