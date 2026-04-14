import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../services/api';

// ── Types ────────────────────────────────────────────

export interface EquipmentGroupField {
  id: number;
  group_id: number | null;
  registry_group_id: number | null;
  field_key: string;
  field_label: string;
  field_type: string;
  field_options?: string[] | null;
  is_required: boolean;
  sort_order: number;
}

export interface RegistryGroup {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  light_color: string;
  text_color: string;
  sort_order: number;
  categories_count: number;
  fields_count: number;
  fields: EquipmentGroupField[];
  total_items: number;
  active_items: number;
  expired_items: number;
  expiring_soon: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryStats {
  total: number;
  active: number;
  expired: number;
  expiring_soon: number;
}

export interface EquipmentCategory {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  light_color: string;
  text_color: string;
  code_prefix: string | null;
  item_count: number;
  stats: CategoryStats;
  created_at: string;
  updated_at: string;
}

export interface EquipmentGroup {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  light_color: string;
  text_color: string;
  category_type: string;
  code_prefix: string | null;
  registry_group_id: number | null;
  registry_group: { id: number; name: string } | null;
  item_count: number;
  fields_count: number;
  fields: EquipmentGroupField[];
  created_at: string;
  updated_at: string;
}

export interface ExpiryStatus {
  status: 'valid' | 'expired' | 'expiring_soon';
  label: string;
  days: number | null;
  field: string | null;
}

export interface EquipmentItem {
  id: number;
  item_code: string;
  equipment_code: string | null;
  item_name: string | null;
  status: string;
  values: Record<string, string>;
  expiry_status: ExpiryStatus;
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

export interface MasterFieldDef {
  key: string;
  label: string;
  type: string;
  category: string;
  options?: string[];
}

export interface GroupItemsPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface RegistryStats {
  kpis: {
    total_items: number;
    active_items: number;
    expired: number;
    expiring_soon: number;
    total_groups: number;
    total_categories: number;
  };
  by_group: Array<{
    id: number;
    name: string;
    icon: string;
    color: string;
    categories_count: number;
    total: number;
    active: number;
    expired: number;
    expiring_soon: number;
  }>;
}

export interface ImportPreview {
  file_columns: string[];
  system_fields: Array<{ key: string; label: string; required: boolean }>;
  mappings: Array<{
    system_field: { key: string; label: string; required: boolean };
    file_column: string | null;
    confidence: number;
  }>;
  preview_rows: Record<string, string>[];
  total_rows: number;
  category: { id: number; name: string };
}

// Legacy template type (kept for backward compat during transition)
export interface GroupTemplate {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  light_color: string;
  text_color: string;
  fields: Array<{
    field_key: string;
    field_label: string;
    field_type: string;
    field_options?: string[] | null;
    is_required?: boolean;
  }>;
  created_at: string;
}

export const CATEGORY_TYPES = [
  { value: 'lifting_equipment', label: 'Lifting Equipment' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'power_tools', label: 'Power Tools' },
  { value: 'safety_equipment', label: 'Safety Equipment' },
  { value: 'electrical_equipment', label: 'Electrical Equipment' },
  { value: 'custom', label: 'Custom' },
] as const;

// ── Hook ─────────────────────────────────────────────

export function useEquipmentGroups() {
  const [registryGroups, setRegistryGroups] = useState<RegistryGroup[]>([]);
  const [groups, setGroups] = useState<EquipmentGroup[]>([]);
  const [masterFields, setMasterFields] = useState<MasterFieldDef[]>([]);
  const [stats, setStats] = useState<RegistryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch registry groups ────────────────────────

  const fetchRegistryGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<RegistryGroup[]>('/tracker/equipment-groups/registry');
      setRegistryGroups(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load equipment groups');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch legacy groups (backward compat) ────────

  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get<EquipmentGroup[]>('/tracker/equipment-groups');
      setGroups(Array.isArray(res) ? res : []);
    } catch {
      // silent
    }
  }, []);

  // ── Fetch master fields ────────────────────────────

  const fetchMasterFields = useCallback(async () => {
    try {
      const res = await api.get<MasterFieldDef[]>('/tracker/equipment-groups/master-fields');
      setMasterFields(Array.isArray(res) ? res : []);
    } catch {
      // silent
    }
  }, []);

  // ── Fetch stats ──────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get<RegistryStats>('/tracker/equipment-groups/registry/stats');
      setStats(res);
    } catch {
      // silent
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Auto-load on mount ───────────────────────────

  useEffect(() => {
    fetchRegistryGroups();
    fetchMasterFields();
    fetchStats();
  }, [fetchRegistryGroups, fetchMasterFields, fetchStats]);

  // ═══════════════════════════════════════════════════
  //  REGISTRY GROUP OPERATIONS
  // ═══════════════════════════════════════════════════

  const createRegistryGroup = useCallback(async (data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    light_color?: string;
    text_color?: string;
    fields?: Array<{
      field_key: string;
      field_label: string;
      field_type: string;
      field_options?: string[] | null;
      is_required?: boolean;
    }>;
  }) => {
    const res = await api.post<{ message: string; group: RegistryGroup }>('/tracker/equipment-groups/registry', data);
    await fetchRegistryGroups();
    await fetchStats();
    return res;
  }, [fetchRegistryGroups, fetchStats]);

  const updateRegistryGroup = useCallback(async (id: number, data: Record<string, unknown>) => {
    const res = await api.put(`/tracker/equipment-groups/registry/${id}`, data);
    await fetchRegistryGroups();
    return res;
  }, [fetchRegistryGroups]);

  const deleteRegistryGroup = useCallback(async (id: number) => {
    await api.delete(`/tracker/equipment-groups/registry/${id}`);
    await fetchRegistryGroups();
    await fetchStats();
  }, [fetchRegistryGroups, fetchStats]);

  const syncRegistryGroupFields = useCallback(async (id: number, fields: Array<{
    field_key: string;
    field_label: string;
    field_type: string;
    field_options?: string[] | null;
    is_required?: boolean;
  }>) => {
    const res = await api.put(`/tracker/equipment-groups/registry/${id}/fields`, { fields });
    await fetchRegistryGroups();
    return res;
  }, [fetchRegistryGroups]);

  // ═══════════════════════════════════════════════════
  //  CATEGORY OPERATIONS
  // ═══════════════════════════════════════════════════

  const fetchCategories = useCallback(async (registryGroupId: number): Promise<EquipmentCategory[]> => {
    return api.get(`/tracker/equipment-groups/registry/${registryGroupId}/categories`);
  }, []);

  const createCategory = useCallback(async (registryGroupId: number, data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    light_color?: string;
    text_color?: string;
    code_prefix?: string;
  }) => {
    const res = await api.post(`/tracker/equipment-groups/registry/${registryGroupId}/categories`, data);
    await fetchRegistryGroups();
    await fetchStats();
    return res;
  }, [fetchRegistryGroups, fetchStats]);

  const updateCategory = useCallback(async (categoryId: number, data: Record<string, unknown>) => {
    const res = await api.put(`/tracker/equipment-groups/categories/${categoryId}`, data);
    await fetchRegistryGroups();
    return res;
  }, [fetchRegistryGroups]);

  const deleteCategory = useCallback(async (categoryId: number) => {
    await api.delete(`/tracker/equipment-groups/categories/${categoryId}`);
    await fetchRegistryGroups();
    await fetchStats();
  }, [fetchRegistryGroups, fetchStats]);

  // ═══════════════════════════════════════════════════
  //  ITEM OPERATIONS (same as before, via category/group)
  // ═══════════════════════════════════════════════════

  const fetchGroupItems = useCallback(async (groupId: number, params?: {
    search?: string;
    status?: string;
    expiry_status?: string;
    page?: number;
    per_page?: number;
  }): Promise<{
    group: EquipmentGroup;
    items: EquipmentItem[];
    pagination: GroupItemsPagination;
  }> => {
    const qs = params
      ? '?' + Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
          .join('&')
      : '';
    return api.get(`/tracker/equipment-groups/${groupId}/items${qs}`);
  }, []);

  const createItem = useCallback(async (groupId: number, data: {
    values: Record<string, string>;
    status?: string;
    item_name?: string;
  }) => {
    const res = await api.post(`/tracker/equipment-groups/${groupId}/items`, data);
    await fetchRegistryGroups();
    await fetchStats();
    return res;
  }, [fetchRegistryGroups, fetchStats]);

  const updateItem = useCallback(async (groupId: number, itemId: number, data: {
    values: Record<string, string>;
    status?: string;
    item_name?: string;
  }) => {
    return api.put(`/tracker/equipment-groups/${groupId}/items/${itemId}`, data);
  }, []);

  const deleteItem = useCallback(async (groupId: number, itemId: number) => {
    await api.delete(`/tracker/equipment-groups/${groupId}/items/${itemId}`);
    await fetchRegistryGroups();
    await fetchStats();
  }, [fetchRegistryGroups, fetchStats]);

  const getItem = useCallback(async (groupId: number, itemId: number) => {
    return api.get(`/tracker/equipment-groups/${groupId}/items/${itemId}`);
  }, []);

  // ═══════════════════════════════════════════════════
  //  IMPORT / EXPORT
  // ═══════════════════════════════════════════════════

  const importPreview = useCallback(async (file: File, categoryId: number): Promise<ImportPreview> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category_id', String(categoryId));
    return api.uploadForm('/tracker/equipment-groups/import/preview', formData);
  }, []);

  const importConfirm = useCallback(async (file: File, categoryId: number, mappings: Array<{
    system_field: string;
    file_column: string;
  }>) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category_id', String(categoryId));
    formData.append('mappings', JSON.stringify(mappings));
    const res = await api.uploadForm('/tracker/equipment-groups/import/confirm', formData);
    await fetchRegistryGroups();
    await fetchStats();
    return res;
  }, [fetchRegistryGroups, fetchStats]);

  const exportItems = useCallback(async (params?: {
    registry_group_id?: number;
    category_id?: number;
    status?: string;
    from_date?: string;
    to_date?: string;
  }) => {
    const qs = params
      ? '?' + Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
          .join('&')
      : '';
    return api.download(`/tracker/equipment-groups/export${qs}`);
  }, []);

  // ═══════════════════════════════════════════════════
  //  LEGACY GROUP OPERATIONS (backward compat)
  // ═══════════════════════════════════════════════════

  const createGroup = useCallback(async (data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    light_color?: string;
    text_color?: string;
    category_type?: string;
    registry_group_id?: number;
    fields?: Array<{
      field_key: string;
      field_label: string;
      field_type: string;
      field_options?: string[] | null;
      is_required?: boolean;
    }>;
  }) => {
    const res = await api.post<{ message: string; group: EquipmentGroup }>('/tracker/equipment-groups', data);
    await fetchGroups();
    await fetchRegistryGroups();
    return res;
  }, [fetchGroups, fetchRegistryGroups]);

  const updateGroup = useCallback(async (id: number, data: Record<string, unknown>) => {
    const res = await api.put(`/tracker/equipment-groups/${id}`, data);
    await fetchGroups();
    return res;
  }, [fetchGroups]);

  const deleteGroup = useCallback(async (id: number) => {
    await api.delete(`/tracker/equipment-groups/${id}`);
    await fetchGroups();
    await fetchRegistryGroups();
  }, [fetchGroups, fetchRegistryGroups]);

  const addFieldsToGroup = useCallback(async (groupId: number, fields: Array<{
    field_key: string;
    field_label: string;
    field_type: string;
    field_options?: string[] | null;
    is_required?: boolean;
  }>) => {
    const res = await api.post(`/tracker/equipment-groups/${groupId}/fields`, { fields });
    await fetchGroups();
    return res;
  }, [fetchGroups]);

  const syncGroupFields = useCallback(async (groupId: number, fields: Array<{
    field_key: string;
    field_label: string;
    field_type: string;
    field_options?: string[] | null;
    is_required?: boolean;
  }>) => {
    const res = await api.put(`/tracker/equipment-groups/${groupId}/fields`, { fields });
    await fetchGroups();
    return res;
  }, [fetchGroups]);

  const removeField = useCallback(async (groupId: number, fieldId: number) => {
    await api.delete(`/tracker/equipment-groups/${groupId}/fields/${fieldId}`);
    await fetchGroups();
  }, [fetchGroups]);

  return {
    // Registry groups (new)
    registryGroups,
    stats,
    statsLoading,
    fetchStats,
    createRegistryGroup,
    updateRegistryGroup,
    deleteRegistryGroup,
    syncRegistryGroupFields,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    importPreview,
    importConfirm,
    exportItems,

    // Legacy (backward compat)
    groups,
    masterFields,
    loading,
    error,
    refresh: fetchRegistryGroups,
    refreshGroups: fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    addFieldsToGroup,
    syncGroupFields,
    removeField,
    fetchGroupItems,
    createItem,
    updateItem,
    deleteItem,
    getItem,
  };
}
