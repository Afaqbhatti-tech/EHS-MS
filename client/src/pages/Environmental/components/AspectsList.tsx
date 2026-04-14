import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { ASPECT_CATEGORIES, ASPECT_STATUSES, getRiskLevel } from '../../../config/environmentalConfig';
import RiskLevelBadge from './RiskLevelBadge';
import EnvStatusBadge from './EnvStatusBadge';
import AspectForm from './AspectForm';
import AspectDetail from './AspectDetail';
import ExportDropdown from '../../../components/ui/ExportDropdown';
import { createEnvExportHandler } from './envExportHelper';

interface AspectsListProps {
  env: any;
}

const DEFAULT_FILTERS = {
  search: '',
  aspect_category: '',
  risk_level: '',
  status: '',
  page: 1,
  per_page: 15,
};

export default function AspectsList({ env }: AspectsListProps) {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState<any>(null);

  const load = useCallback(
    (overrides?: Record<string, unknown>) => {
      env.fetchAspects({ ...filters, ...overrides });
    },
    [env, filters],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Filter helpers ─────────────────────────────── */

  function onFilterChange(key: string, value: string) {
    const next = { ...filters, [key]: value, page: 1 };
    setFilters(next);
    env.fetchAspects(next);
  }

  function goToPage(page: number) {
    const next = { ...filters, page };
    setFilters(next);
    env.fetchAspects(next);
  }

  /* ── CRUD callbacks ─────────────────────────────── */

  async function handleSave(data: Record<string, unknown>) {
    if (selectedAspect?.id) {
      await env.updateAspect(selectedAspect.id, data);
    } else {
      await env.createAspect(data);
    }
    setShowForm(false);
    setSelectedAspect(null);
    load();
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Are you sure you want to delete this aspect?')) return;
    await env.deleteAspect(id);
    load();
  }

  function openAdd() {
    setSelectedAspect(null);
    setShowForm(true);
  }

  function openEdit(aspect: any) {
    setSelectedAspect(aspect);
    setShowForm(true);
    setShowDetail(false);
  }

  function openDetail(aspect: any) {
    setSelectedAspect(aspect);
    setShowDetail(true);
  }

  /* ── Export ───────────────────────────────────────── */

  const handleExport = createEnvExportHandler({
    title: 'Aspects & Impacts',
    filename: 'aspects_export',
    headers: ['Code', 'Activity', 'Category', 'Risk Level', 'Status', 'Area', 'Responsible'],
    getRows: () => (env.aspects || []).map((a: any) => {
      const risk = a.severity && a.likelihood ? getRiskLevel(a.severity, a.likelihood).level : '';
      return [a.aspect_code, a.activity || '', a.category || '', risk, a.status || '', a.area || '', a.responsible_person || ''];
    }),
  });

  /* ── Pagination data ────────────────────────────── */

  const { total, page, lastPage } = env.aspectsPagination;

  /* ── Render ─────────────────────────────────────── */

  return (
    <div>
      {/* ── Header ──────────────────────────────────── */}
      <div className="env-section-header">
        <div className="env-section-header-left">
          <h2 className="env-section-title">Aspects & Impacts</h2>
          <span className="env-section-count">{total} records</span>
        </div>
        <div className="env-section-header-actions">
          <ExportDropdown onExport={handleExport} />
          <button className="env-btn env-btn--primary" onClick={openAdd}>
            <Plus size={15} /> Add Aspect
          </button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <div className="env-filters-row">
        <input
          type="text"
          placeholder="Search aspects..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
        />
        <select
          value={filters.aspect_category}
          onChange={(e) => onFilterChange('aspect_category', e.target.value)}
        >
          <option value="">All Categories</option>
          {ASPECT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filters.risk_level}
          onChange={(e) => onFilterChange('risk_level', e.target.value)}
        >
          <option value="">All Risk Levels</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          {ASPECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* ── Table ───────────────────────────────────── */}
      {env.aspectsLoading ? (
        <div className="env-empty-state">Loading...</div>
      ) : !env.aspects?.length ? (
        <div className="env-empty-state">No aspects found. Click "+ Add Aspect" to create one.</div>
      ) : (
        <table className="env-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Activity</th>
              <th>Category</th>
              <th>Risk Level</th>
              <th>Status</th>
              <th>Area</th>
              <th>Responsible</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {env.aspects.map((a: any) => {
              const risk =
                a.severity && a.likelihood
                  ? getRiskLevel(a.severity, a.likelihood)
                  : { level: 'N/A', score: 0 };
              return (
                <tr key={a.id} onClick={() => openDetail(a)} style={{ cursor: 'pointer' }}>
                  <td>{a.aspect_code}</td>
                  <td>{a.activity}</td>
                  <td>{a.category}</td>
                  <td>
                    <RiskLevelBadge level={risk.level} />
                  </td>
                  <td>
                    <EnvStatusBadge status={a.status} />
                  </td>
                  <td>{a.area || '-'}</td>
                  <td>{a.responsible_person || '-'}</td>
                  <td>
                    <div className="flex items-center justify-center gap-1 table-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="action-btn action-btn--view" title="View" onClick={() => openDetail(a)}>
                        <Eye size={15} />
                      </button>
                      <button className="action-btn action-btn--edit" title="Edit" onClick={() => openEdit(a)}>
                        <Pencil size={15} />
                      </button>
                      <button className="action-btn action-btn--delete" title="Delete" onClick={() => handleDelete(a.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ── Pagination ──────────────────────────────── */}
      {lastPage > 1 && (
        <div className="env-pagination">
          <button disabled={page <= 1} onClick={() => goToPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {lastPage} ({total} records)
          </span>
          <button disabled={page >= lastPage} onClick={() => goToPage(page + 1)}>
            Next
          </button>
        </div>
      )}

      {/* ── Form Modal ──────────────────────────────── */}
      {showForm && (
        <AspectForm
          aspect={selectedAspect}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setSelectedAspect(null);
          }}
        />
      )}

      {/* ── Detail Modal ────────────────────────────── */}
      {showDetail && selectedAspect && (
        <AspectDetail
          aspectId={selectedAspect.id}
          env={env}
          onClose={() => {
            setShowDetail(false);
            setSelectedAspect(null);
          }}
          onEdit={() => openEdit(selectedAspect)}
        />
      )}
    </div>
  );
}
