import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { fetchAllPages, buildFilterQuery, CARD_VIEW_PER_PAGE } from '../../../utils/fetchAllPages';

/* ── Types ──────────────────────────────────────── */

export interface PosterTemplate {
  id: number;
  name: string;
  category: string | null;
  layout_type: string | null;
  description: string | null;
  placeholder_schema: Record<string, unknown> | null;
  default_theme_key: string | null;
  default_orientation: 'Portrait' | 'Landscape';
  print_size: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface PosterLink {
  id: number;
  poster_id: number;
  linked_campaign_id: number | null;
  linked_mock_drill_id: number | null;
  linked_erp_id: number | null;
  linked_mom_id: string | null;
  linked_permit_id: string | null;
  linked_rams_id: string | null;
  linked_module_type: string | null;
  linked_module_id: string | null;
  link_notes: string | null;
}

export interface PosterMedia {
  id: number;
  poster_id: number;
  media_type: string;
  file_path: string;
  original_name: string | null;
  file_type: string | null;
  file_size_kb: number | null;
  caption: string | null;
  url: string;
  is_image: boolean;
  created_at: string;
}

export interface PosterLog {
  id: number;
  poster_id: number;
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

export interface Poster {
  id: number;
  poster_code: string;
  title: string;
  subtitle: string | null;
  category: string;
  poster_type: string;
  topic: string | null;
  description: string | null;
  headline: string | null;
  subheadline: string | null;
  main_body_text: string | null;
  bullet_points: string[] | null;
  warning_text: string | null;
  call_to_action: string | null;
  footer_text: string | null;
  quote_or_slogan: string | null;
  template_id: number | null;
  template: PosterTemplate | null;
  layout_type: string | null;
  orientation: 'Portrait' | 'Landscape';
  theme_key: string | null;
  background_color: string | null;
  accent_color: string | null;
  font_style: string | null;
  font_size: 'Small' | 'Medium' | 'Large' | 'Extra Large';
  text_alignment: 'Left' | 'Center' | 'Right';
  print_size: string;
  target_audience: string | null;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  language: string;
  site: string | null;
  project: string | null;
  area: string | null;
  zone: string | null;
  department: string | null;
  contractor_name: string | null;
  status: 'Draft' | 'Under Review' | 'Approved' | 'Published' | 'Archived';
  version: string;
  effective_date: string | null;
  expiry_date: string | null;
  created_by: string | null;
  created_by_user?: { id: string; full_name: string } | null;
  reviewed_by: string | null;
  approved_by: string | null;
  published_by: string | null;
  published_at: string | null;
  main_image_path: string | null;
  secondary_image_path: string | null;
  background_image_path: string | null;
  company_logo_path: string | null;
  qr_code_data: string | null;
  preview_file_path: string | null;
  pdf_file_path: string | null;
  main_image_url: string | null;
  secondary_image_url: string | null;
  background_image_url: string | null;
  company_logo_url: string | null;
  preview_url: string | null;
  pdf_url: string | null;
  theme: Record<string, string>;
  view_count: number;
  download_count: number;
  print_count: number;
  share_count: number;
  media_count: number;
  media: PosterMedia[];
  links: PosterLink | null;
  logs: PosterLog[];
  created_at: string;
  updated_at: string;
}

export interface PosterStats {
  kpis: {
    total_posters: number;
    published: number;
    draft: number;
    under_review: number;
    approved: number;
    archived: number;
    downloaded_this_month: number;
    created_this_month: number;
  };
  by_category: { category: string; count: number }[];
  by_topic: { topic: string; count: number }[];
  by_status: { status: string; count: number }[];
  monthly_trend: { month: string; created: number; published: number }[];
  top_downloaded: { poster_code: string; title: string; category: string; download_count: number }[];
  top_viewed: { poster_code: string; title: string; category: string; view_count: number }[];
  by_site: { site: string; count: number }[];
}

export interface PosterFilters {
  search: string;
  category: string;
  poster_type: string;
  topic: string;
  status: string;
  priority: string;
  site: string;
  area: string;
  zone: string;
  department: string;
  language: string;
  target_audience: string;
  template_id: string;
  linked_campaign_id: string;
  date_from: string;
  date_to: string;
  effective_from: string;
  effective_to: string;
  period: string;
  sort_by: string;
  sort_dir: string;
  per_page: number;
  page: number;
}

const defaultFilters: PosterFilters = {
  search: '', category: '', poster_type: '', topic: '', status: '',
  priority: '', site: '', area: '', zone: '', department: '',
  language: '', target_audience: '', template_id: '', linked_campaign_id: '',
  date_from: '', date_to: '', effective_from: '', effective_to: '',
  period: '', sort_by: 'created_at', sort_dir: 'desc', per_page: CARD_VIEW_PER_PAGE, page: 1,
};

function buildQuery(filters: PosterFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) {
      params.append(k, String(v));
    }
  });
  return params.toString();
}

/* ── Hook ───────────────────────────────────────── */

export function usePosters() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<PosterFilters>(defaultFilters);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const updateFilter = useCallback((key: keyof PosterFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value, ...(key !== 'page' ? { page: 1 } : {}) }));
  }, []);

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  // ── List ─────────────────────────────────────
  const listQuery = useQuery({
    queryKey: ['posters', 'list', filters],
    queryFn: async () => {
      if (filters.per_page >= CARD_VIEW_PER_PAGE) {
        return fetchAllPages<Poster>('/posters', buildFilterQuery(filters));
      }
      return api.get<{ data: Poster[]; total: number; page: number; per_page: number; last_page: number }>(`/posters?${buildQuery(filters)}`);
    },
    staleTime: 30_000,
  });

  // ── Stats ────────────────────────────────────
  const statsQuery = useQuery({
    queryKey: ['posters', 'stats'],
    queryFn: () => api.get<PosterStats>('/posters/stats'),
    staleTime: 60_000,
  });

  // ── Templates ────────────────────────────────
  const templatesQuery = useQuery({
    queryKey: ['posters', 'templates'],
    queryFn: () => api.get<PosterTemplate[]>('/posters/templates'),
    staleTime: 300_000,
  });

  // ── Detail ───────────────────────────────────
  const detailQuery = useQuery({
    queryKey: ['posters', 'detail', selectedId],
    queryFn: () => api.get<Poster>(`/posters/${selectedId}`),
    enabled: !!selectedId,
    staleTime: 15_000,
  });

  // ── Invalidation helper ──────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['posters'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  // ── CRUD mutations ───────────────────────────
  const createMutation = useMutation({
    mutationFn: (formData: FormData) => api.uploadForm('/posters', formData),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormData }) => {
      data.append('_method', 'PUT');
      return api.uploadForm(`/posters/${id}`, data);
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/posters/${id}`),
    onSuccess: invalidate,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/posters/templates/${id}`),
    onSuccess: invalidate,
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: string; notes?: string }) =>
      api.post(`/posters/${id}/status`, { status, notes }),
    onSuccess: invalidate,
  });

  // ── Media ────────────────────────────────────
  const uploadMediaMutation = useMutation({
    mutationFn: ({ id, files, mediaType, caption }: { id: number; files: File[]; mediaType?: string; caption?: string }) => {
      const fd = new FormData();
      files.forEach(f => fd.append('files[]', f));
      if (mediaType) fd.append('media_type', mediaType);
      if (caption) fd.append('caption', caption);
      return api.uploadForm(`/posters/${id}/media`, fd);
    },
    onSuccess: invalidate,
  });

  const removeMediaMutation = useMutation({
    mutationFn: ({ posterId, mediaId }: { posterId: number; mediaId: number }) =>
      api.delete(`/posters/${posterId}/media/${mediaId}`),
    onSuccess: invalidate,
  });

  // ── Links ────────────────────────────────────
  const saveLinkMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.post(`/posters/${id}/link`, data),
    onSuccess: invalidate,
  });

  // ── Tracking ─────────────────────────────────
  const trackDownload = useCallback(async (id: number) => {
    return api.post<{ download_count: number }>(`/posters/${id}/track-download`, {});
  }, []);

  const trackPrint = useCallback(async (id: number) => {
    return api.post<{ print_count: number }>(`/posters/${id}/track-print`, {});
  }, []);

  // ── Save PDF ─────────────────────────────────
  const savePdfMutation = useMutation({
    mutationFn: ({ id, pdfBase64, previewBase64 }: { id: number; pdfBase64: string; previewBase64?: string }) =>
      api.post(`/posters/${id}/save-pdf`, { pdf_base64: pdfBase64, preview_base64: previewBase64 }),
    onSuccess: invalidate,
  });

  // ── Export ───────────────────────────────────
  const exportPosters = useCallback((format: string = 'csv') => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.poster_type) params.append('poster_type', filters.poster_type);
    if (filters.status) params.append('status', filters.status);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    params.append('format', format);
    api.download(`/posters/export?${params.toString()}`);
  }, [filters]);

  return {
    // Data
    posters: listQuery.data?.data ?? [],
    total: listQuery.data?.total ?? 0,
    page: listQuery.data?.page ?? 1,
    lastPage: listQuery.data?.last_page ?? 1,
    isLoading: listQuery.isLoading,
    stats: statsQuery.data ?? null,
    isStatsLoading: statsQuery.isLoading,
    templates: templatesQuery.data ?? [],
    isTemplatesLoading: templatesQuery.isLoading,
    selectedPoster: detailQuery.data ?? null,
    isDetailLoading: detailQuery.isLoading,

    // Filters
    filters,
    updateFilter,
    resetFilters,
    setFilters,
    selectedId,
    setSelectedId,

    // CRUD
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    destroy: deleteMutation.mutateAsync,
    destroyTemplate: deleteTemplateMutation.mutateAsync,
    changeStatus: changeStatusMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,

    // Media
    uploadMedia: uploadMediaMutation.mutateAsync,
    removeMedia: removeMediaMutation.mutateAsync,
    isUploading: uploadMediaMutation.isPending,

    // Links
    saveLink: saveLinkMutation.mutateAsync,

    // Tracking
    trackDownload,
    trackPrint,
    savePdf: savePdfMutation.mutateAsync,

    // Export
    exportPosters,

    // Refresh
    refresh: () => invalidate(),
    isRefreshing: listQuery.isRefetching,
  };
}
