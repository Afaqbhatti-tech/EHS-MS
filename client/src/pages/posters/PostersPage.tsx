import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Image, Plus, RefreshCw, List, LayoutGrid, Search, X,
  Eye, Download, Printer, ChevronLeft, ChevronRight, Pencil,
  Trash2, BarChart3, Send, Archive, FileText, TrendingUp, Clock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CARD_VIEW_PER_PAGE } from '../../utils/fetchAllPages';
import { usePosters, type Poster, type PosterTemplate, type PosterStats, type PosterLog } from './hooks/usePosters';
import PosterPreview from './components/PosterPreview';
import { POSTER_CATEGORIES, POSTER_TYPES, POSTER_TOPICS, POSTER_STATUSES, getThemeByKey } from '../../config/posterConfig';
import ExportDropdown from '../../components/ui/ExportDropdown';
import TypedDeleteConfirmModal from '../../components/ui/TypedDeleteConfirmModal';
import { useToast } from '../../components/ui/Toast';
import './PostersPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const STORAGE_BASE = API_BASE.replace('/api', '') + '/storage/';

type Tab = 'register' | 'published' | 'templates' | 'analytics';
type ViewMode = 'grid' | 'table';
type DetailTab = 'preview' | 'details' | 'media' | 'links' | 'audit';

/* ── Status Badge ────────────────────────────────── */
function PosterStatusBadge({ status }: { status: string }) {
  const cls = status.toLowerCase().replace(/\s/g, '-');
  return (
    <span className={`pst-status-badge pst-status-badge--${cls}`}>
      <span className={`pst-status-dot pst-status-dot--${cls}`} />
      {status}
    </span>
  );
}

/* ── KPI Card ────────────────────────────────────── */
function KPICard({ icon: Icon, label, value, color, delay, pulse }: {
  icon: React.ElementType; label: string; value: number; color: string; delay: number; pulse?: boolean;
}) {
  const shouldPulse = pulse && value > 0;
  return (
    <div
      className={`std-kpi-card${shouldPulse ? ' std-kpi-card--pulse' : ''}`}
      style={{ animationDelay: `${delay}ms`, borderLeft: `3px solid ${color}` }}
    >
      <div className="std-kpi-card__label">
        <Icon size={14} style={{ color }} />
        {label}
      </div>
      <div className="std-kpi-card__value" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

/* ── Analytics Bars ──────────────────────────────── */
const CHART_COLORS = ['#1F8034', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1', '#F97316', '#059669', '#0EA5E9'];

function HorizontalBarChart({ data, labelKey, valueKey, title }: {
  data: Record<string, unknown>[]; labelKey: string; valueKey: string; title: string;
}) {
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
  return (
    <div className="pst-chart-card">
      <div className="pst-chart-card__title">{title}</div>
      {data.length === 0 && <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>No data available</p>}
      {data.slice(0, 10).map((d, i) => (
        <div className="pst-bar" key={i}>
          <div className="pst-bar__label">{String(d[labelKey] || 'N/A')}</div>
          <div className="pst-bar__fill" style={{
            width: `${(Number(d[valueKey]) / max) * 100}%`,
            background: CHART_COLORS[i % CHART_COLORS.length],
          }} />
          <div className="pst-bar__count">{Number(d[valueKey])}</div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════ */
export default function PostersPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('can_manage_posters');
  const toast = useToast();

  const {
    posters, total, page, lastPage, isLoading,
    stats, isStatsLoading,
    templates, isTemplatesLoading,
    selectedPoster, isDetailLoading,
    filters, updateFilter, resetFilters, setFilters,
    selectedId, setSelectedId,
    destroy, destroyTemplate, changeStatus,
    trackDownload, trackPrint,
    exportPosters, refresh, isRefreshing,
  } = usePosters();

  const [tab, setTab] = useState<Tab>('register');
  const [viewMode, setViewModeState] = useState<ViewMode>('grid');
  const savedTablePageRef = useRef(1);
  const handleViewModeChange = (mode: ViewMode) => {
    if (viewMode === 'table' && mode !== 'table') {
      savedTablePageRef.current = filters.page || 1;
    }
    setViewModeState(mode);
    setFilters(prev => ({
      ...prev,
      per_page: mode === 'grid' ? CARD_VIEW_PER_PAGE : 20,
      page: mode === 'grid' ? 1 : savedTablePageRef.current,
    }));
  };
  const [detailTab, setDetailTab] = useState<DetailTab>('preview');
  const [deleteTarget, setDeleteTarget] = useState<Poster | null>(null);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<PosterTemplate | null>(null);

  const kpis = stats?.kpis;
  const publishedCount = kpis?.published ?? 0;

  const filtersActive = filters.search || filters.category || filters.poster_type ||
    filters.topic || filters.status || filters.period;

  // Published-only list
  const publishedPosters = useMemo(() =>
    tab === 'published' ? posters : posters.filter(p => p.status === 'Published'),
    [posters, tab]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await destroy(deleteTarget.id);
    setDeleteTarget(null);
    if (selectedId === deleteTarget.id) setSelectedId(null);
  }, [deleteTarget, destroy, selectedId, setSelectedId]);

  const handleDeleteTemplate = useCallback(async () => {
    if (!deleteTemplateTarget) return;
    await destroyTemplate(deleteTemplateTarget.id);
    setDeleteTemplateTarget(null);
  }, [deleteTemplateTarget, destroyTemplate]);

  const handleStatusChange = useCallback(async (poster: Poster, newStatus: string) => {
    try {
      await changeStatus({ id: poster.id, status: newStatus });
      toast.success(`Poster status changed to ${newStatus}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change poster status';
      toast.error(message);
    }
  }, [changeStatus, toast]);

  const handleDownload = useCallback(async (poster: Poster) => {
    // Determine the best file to download: PDF > preview > main image
    const fileUrl = poster.pdf_url
      || (poster.pdf_file_path ? STORAGE_BASE + poster.pdf_file_path : null)
      || poster.preview_url
      || (poster.preview_file_path ? STORAGE_BASE + poster.preview_file_path : null)
      || poster.main_image_url
      || (poster.main_image_path ? STORAGE_BASE + poster.main_image_path : null);

    if (!fileUrl) {
      toast.warning('No downloadable file available. Please edit the poster and generate a PDF first.');
      return;
    }

    // Track the download
    try { await trackDownload(poster.id); } catch { /* ignore tracking errors */ }

    try {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error('Fetch failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const ext = fileUrl.match(/\.(pdf|png|jpg|jpeg|webp)(\?|$)/i)?.[1] || 'pdf';
      a.download = `${poster.poster_code || poster.title || 'poster'}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      // Fallback: open in new tab
      window.open(fileUrl, '_blank');
    }
  }, [trackDownload]);

  /* ── DETAIL PANEL ────────────────────────────── */
  const renderDetail = () => {
    if (!selectedPoster) return null;
    const p = selectedPoster;
    const storageUrl = (path: string | null) => path ? STORAGE_BASE + path : null;

    return (
      <>
        <div className="pst-detail__overlay" onClick={() => setSelectedId(null)} />
        <div className="pst-detail">
          <div className="pst-detail__header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                <X size={20} />
              </button>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{p.poster_code}</span>
                  <PosterStatusBadge status={p.status} />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>{p.title}</h2>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <span className="pst-badge">{p.category}</span>
                  <span className="pst-badge">{p.poster_type}</span>
                  {p.topic && <span className="pst-badge pst-badge--topic">{p.topic}</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              {canManage && (p.status === 'Draft' || p.status === 'Under Review' || p.status === 'Approved') && (
                <button className="pst-pagination__btn" onClick={() => navigate(`/poster-generator/${p.id}/edit`)}>
                  <Pencil size={14} /> Edit
                </button>
              )}
              {p.status === 'Draft' && canManage && (
                <button className="pst-pagination__btn" onClick={() => handleStatusChange(p, 'Under Review')} style={{ borderColor: '#3B82F6', color: '#3B82F6' }}>
                  <Send size={14} /> Submit
                </button>
              )}
              {p.status === 'Under Review' && canManage && (
                <button className="pst-pagination__btn" onClick={() => handleStatusChange(p, 'Approved')} style={{ borderColor: '#10B981', color: '#10B981' }}>
                  <FileText size={14} /> Approve
                </button>
              )}
              {p.status === 'Approved' && canManage && (
                <button className="pst-pagination__btn" onClick={() => handleStatusChange(p, 'Published')} style={{ borderColor: '#065F46', color: '#065F46' }}>
                  <Send size={14} /> Publish
                </button>
              )}
              {(p.status === 'Published' || p.status === 'Approved') && canManage && (
                <button className="pst-pagination__btn" onClick={() => handleStatusChange(p, 'Archived')} style={{ color: '#9CA3AF' }}>
                  <Archive size={14} /> Archive
                </button>
              )}
            </div>
          </div>

          {/* Detail Tabs */}
          <div className="pst-tabs" style={{ padding: '0 20px' }}>
            {(['preview', 'details', 'media', 'links', 'audit'] as DetailTab[]).map(t => (
              <button key={t} className={`pst-tab ${detailTab === t ? 'pst-tab--active' : ''}`} onClick={() => setDetailTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="pst-detail__body">
            {detailTab === 'preview' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                <div style={{ background: '#E5E7EB', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                  <PosterPreview poster={{ ...p, main_image_url: p.main_image_url || (p.main_image_path ? STORAGE_BASE + p.main_image_path : null), secondary_image_url: p.secondary_image_url || (p.secondary_image_path ? STORAGE_BASE + p.secondary_image_path : null), company_logo_url: p.company_logo_url || (p.company_logo_path ? STORAGE_BASE + p.company_logo_path : null), background_image_url: p.background_image_url || (p.background_image_path ? STORAGE_BASE + p.background_image_path : null) }} scale={0.55} />
                </div>
                <div className="pst-usage-strip">
                  <span className="pst-usage-strip__item"><Eye size={14} /> {p.view_count} views</span>
                  <span className="pst-usage-strip__item"><Download size={14} /> {p.download_count} downloads</span>
                  <span className="pst-usage-strip__item"><Printer size={14} /> {p.print_count} prints</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="pst-pagination__btn" onClick={() => handleDownload(p)} style={{ borderColor: '#3B82F6', color: '#3B82F6' }}>
                    <Download size={14} /> Download
                  </button>
                  <button className="pst-pagination__btn" onClick={() => trackPrint(p.id)}>
                    <Printer size={14} /> Track Print
                  </button>
                </div>
              </div>
            )}

            {detailTab === 'details' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'var(--color-surface-sunken)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Content</h4>
                  {[
                    ['Headline', p.headline], ['Subheadline', p.subheadline],
                    ['Body', p.main_body_text], ['Warning', p.warning_text],
                    ['CTA', p.call_to_action], ['Footer', p.footer_text],
                    ['Quote', p.quote_or_slogan],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <div key={String(label)} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{String(val)}</div>
                    </div>
                  ))}
                  {p.bullet_points && p.bullet_points.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Bullet Points</div>
                      <ul style={{ fontSize: 13, paddingLeft: 16, margin: 4 }}>
                        {p.bullet_points.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
                <div style={{ background: 'var(--color-surface-sunken)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Settings</h4>
                  {[
                    ['Category', p.category], ['Type', p.poster_type], ['Topic', p.topic],
                    ['Theme', p.theme_key], ['Orientation', p.orientation], ['Font Size', p.font_size],
                    ['Print Size', p.print_size], ['Version', p.version],
                    ['Site', p.site], ['Area', p.area], ['Zone', p.zone],
                    ['Department', p.department], ['Audience', p.target_audience],
                    ['Priority', p.priority], ['Language', p.language],
                    ['Created By', p.created_by_user?.full_name], ['Reviewed By', p.reviewed_by],
                    ['Approved By', p.approved_by], ['Published By', p.published_by],
                    ['Effective Date', p.effective_date], ['Expiry Date', p.expiry_date],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <div key={String(label)} style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{String(val)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailTab === 'media' && (
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Uploaded Media</h4>
                {(!p.media || p.media.length === 0) && <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>No media files uploaded.</p>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {(p.media || []).map(m => (
                    <div key={m.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      {m.is_image ? (
                        <img src={STORAGE_BASE + m.file_path} alt={m.original_name || ''} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-sunken)' }}>
                          <FileText size={24} color="var(--color-text-tertiary)" />
                        </div>
                      )}
                      <div style={{ padding: '6px 8px', fontSize: 11 }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.original_name}</div>
                        <div style={{ color: 'var(--color-text-tertiary)' }}>{m.media_type} · {m.file_size_kb}KB</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailTab === 'links' && (
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Module Links</h4>
                {!p.links && <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>No modules linked.</p>}
                {p.links && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {p.links.linked_campaign_id && <span className="pst-badge">Campaign #{p.links.linked_campaign_id}</span>}
                    {p.links.linked_mock_drill_id && <span className="pst-badge">Mock Drill #{p.links.linked_mock_drill_id}</span>}
                    {p.links.linked_erp_id && <span className="pst-badge">ERP #{p.links.linked_erp_id}</span>}
                    {p.links.linked_mom_id && <span className="pst-badge">MOM #{p.links.linked_mom_id}</span>}
                    {p.links.linked_permit_id && <span className="pst-badge">Permit #{p.links.linked_permit_id}</span>}
                    {p.links.linked_rams_id && <span className="pst-badge">RAMS #{p.links.linked_rams_id}</span>}
                    {p.links.linked_module_type && <span className="pst-badge">{p.links.linked_module_type} #{p.links.linked_module_id}</span>}
                    {p.links.link_notes && <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 8 }}>{p.links.link_notes}</p>}
                  </div>
                )}
              </div>
            )}

            {detailTab === 'audit' && (
              <div className="pst-timeline">
                {(!p.logs || p.logs.length === 0) && <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>No audit log entries.</p>}
                {(p.logs || []).map((log: PosterLog) => {
                  const dotCls = log.action.includes('Created') ? 'created'
                    : log.action.includes('Status') ? 'status'
                    : log.action.includes('Published') ? 'published'
                    : log.action.includes('Content') ? 'content'
                    : log.action.includes('Media') ? 'media'
                    : log.action.includes('Download') ? 'download'
                    : log.action.includes('Archived') ? 'archived'
                    : 'created';
                  return (
                    <div key={log.id} className="pst-timeline__item">
                      <div className={`pst-timeline__dot pst-timeline__dot--${dotCls}`} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{log.action}</div>
                      {log.from_status && log.to_status && (
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{log.from_status} → {log.to_status}</div>
                      )}
                      {log.description && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{log.description}</div>}
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                        {log.performed_by_name || 'System'} · {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  /* ── RENDER ──────────────────────────────────── */
  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Poster Generator</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '4px 0 0' }}>Create, manage, and publish safety communication posters</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ExportDropdown onExport={exportPosters} />
          {canManage && (
            <button
              onClick={() => navigate('/poster-generator/create')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                background: 'var(--color-primary)', color: 'white', border: 'none',
                borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Plus size={16} /> Create Poster
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="pst-tabs">
        <button className={`pst-tab ${tab === 'register' ? 'pst-tab--active' : ''}`} onClick={() => { setTab('register'); updateFilter('status', ''); }}>
          Poster Register
        </button>
        <button className={`pst-tab ${tab === 'published' ? 'pst-tab--active' : ''}`} onClick={() => { setTab('published'); updateFilter('status', 'Published'); }}>
          Published {publishedCount > 0 && <span className="pst-tab__count">{publishedCount}</span>}
        </button>
        <button className={`pst-tab ${tab === 'templates' ? 'pst-tab--active' : ''}`} onClick={() => setTab('templates')}>
          Templates
        </button>
        <button className={`pst-tab ${tab === 'analytics' ? 'pst-tab--active' : ''}`} onClick={() => setTab('analytics')}>
          Analytics
        </button>
      </div>

      {/* ── TAB: Register / Published ────────────── */}
      {(tab === 'register' || tab === 'published') && (
        <>
          {/* KPI Cards */}
          {kpis && (
            <div className="std-kpi-grid">
              <KPICard icon={Image} label="Total Posters" value={kpis.total_posters} color="#1F8034" delay={0} />
              <KPICard icon={Send} label="Published" value={kpis.published} color="#065F46" delay={60} pulse />
              <KPICard icon={FileText} label="Draft" value={kpis.draft} color="#6B7280" delay={120} />
              <KPICard icon={Eye} label="Under Review" value={kpis.under_review} color="#3B82F6" delay={180} />
              <KPICard icon={Archive} label="Archived" value={kpis.archived} color="#9CA3AF" delay={240} />
              <KPICard icon={Download} label="Downloads (Month)" value={kpis.downloaded_this_month} color="#8B5CF6" delay={300} />
              <KPICard icon={TrendingUp} label="Created (Month)" value={kpis.created_this_month} color="#F59E0B" delay={360} />
            </div>
          )}

          {/* Filters */}
          <div className="pst-filter-bar">
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--color-text-tertiary)' }} />
              <input
                placeholder="Search posters..."
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
                style={{ paddingLeft: 32, width: '100%' }}
              />
            </div>
            {tab !== 'published' && (
              <select value={filters.status} onChange={e => updateFilter('status', e.target.value)}>
                <option value="">All Statuses</option>
                {POSTER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <select value={filters.category} onChange={e => updateFilter('category', e.target.value)}>
              <option value="">All Categories</option>
              {POSTER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filters.topic} onChange={e => updateFilter('topic', e.target.value)}>
              <option value="">All Topics</option>
              {POSTER_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {filtersActive && (
              <button onClick={resetFilters} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-tertiary)' }}>
                <X size={14} /> Reset
              </button>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <button onClick={refresh} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
              <button onClick={() => handleViewModeChange('grid')} style={{ background: viewMode === 'grid' ? 'var(--color-primary-50)' : 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', cursor: 'pointer', color: viewMode === 'grid' ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
                <LayoutGrid size={14} />
              </button>
              <button onClick={() => handleViewModeChange('table')} style={{ background: viewMode === 'table' ? 'var(--color-primary-50)' : 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', cursor: 'pointer', color: viewMode === 'table' ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
                <List size={14} />
              </button>
            </div>
          </div>

          {/* Loading */}
          {isLoading && <p style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>Loading posters...</p>}

          {/* Grid View */}
          {!isLoading && viewMode === 'grid' && (
            <div className="pst-grid">
              {posters.map(p => (
                <div key={p.id} className="pst-card" onClick={() => { setSelectedId(p.id); setDetailTab('preview'); }}>
                  <div className="pst-card__preview">
                    <div style={{ transform: 'scale(0.22)', transformOrigin: 'top left' }}>
                      <PosterPreview poster={{ ...p, main_image_url: p.main_image_path ? STORAGE_BASE + p.main_image_path : null, secondary_image_url: p.secondary_image_path ? STORAGE_BASE + p.secondary_image_path : null, company_logo_url: p.company_logo_path ? STORAGE_BASE + p.company_logo_path : null }} scale={1} />
                    </div>
                    <div className="pst-card__preview-overlay">
                      <button className="pst-card__preview-action" onClick={e => { e.stopPropagation(); setSelectedId(p.id); setDetailTab('preview'); }}>View</button>
                      {canManage && p.status === 'Draft' && (
                        <button className="pst-card__preview-action" onClick={e => { e.stopPropagation(); navigate(`/poster-generator/${p.id}/edit`); }}>Edit</button>
                      )}
                    </div>
                  </div>
                  <div className="pst-card__footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div className="pst-card__title">{p.title}</div>
                      <PosterStatusBadge status={p.status} />
                    </div>
                    <div className="pst-card__meta">
                      <span className="pst-card__code">{p.poster_code}</span>
                      <span className="pst-badge" style={{ fontSize: 10 }}>{p.category}</span>
                      {p.topic && <span className="pst-badge pst-badge--topic" style={{ fontSize: 10 }}>{p.topic}</span>}
                    </div>
                    <div className="pst-card__stats">
                      <span className="pst-card__stat"><Eye size={12} /> {p.view_count}</span>
                      <span className="pst-card__stat"><Download size={12} /> {p.download_count}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, paddingTop: 6, borderTop: '1px solid var(--color-border)', marginTop: 6 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setSelectedId(p.id); setDetailTab('preview'); }}
                        className="pst-action-btn"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      {canManage && (
                        <button
                          onClick={() => navigate(`/poster-generator/${p.id}/edit`)}
                          className="pst-action-btn"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(p)}
                        className="pst-action-btn"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      {canManage && (
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="pst-action-btn pst-action-btn--danger"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {posters.length === 0 && !isLoading && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--color-text-tertiary)' }}>
                  <Image size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p>No posters found. {canManage && <span style={{ color: 'var(--color-primary)', cursor: 'pointer' }} onClick={() => navigate('/poster-generator/create')}>Create your first poster</span>}</p>
                </div>
              )}
            </div>
          )}

          {/* Table View */}
          {!isLoading && viewMode === 'table' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="pst-table">
                <thead>
                  <tr>
                    <th>Code</th><th>Title</th><th>Category</th><th>Topic</th>
                    <th>Status</th><th>Priority</th><th>Views</th><th>Downloads</th>
                    <th>Created</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posters.map(p => (
                    <tr key={p.id} onClick={() => { setSelectedId(p.id); setDetailTab('preview'); }}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.poster_code}</td>
                      <td style={{ fontWeight: 600, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</td>
                      <td><span className="pst-badge" style={{ fontSize: 10 }}>{p.category}</span></td>
                      <td>{p.topic || '—'}</td>
                      <td><PosterStatusBadge status={p.status} /></td>
                      <td>{p.priority}</td>
                      <td>{p.view_count}</td>
                      <td>{p.download_count}</td>
                      <td style={{ fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                          <button
                            onClick={() => { setSelectedId(p.id); setDetailTab('preview'); }}
                            className="pst-action-btn"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          {canManage && (
                            <button
                              onClick={() => navigate(`/poster-generator/${p.id}/edit`)}
                              className="pst-action-btn"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(p)}
                            className="pst-action-btn"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                          {canManage && (
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="pst-action-btn pst-action-btn--danger"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination — only in table view; grid shows all records */}
          {total > 0 && viewMode === 'table' && (
            <div className="pst-pagination">
              <span>Showing {posters.length} of {total} posters</span>
              <div className="pst-pagination__buttons">
                <button className="pst-pagination__btn" disabled={page <= 1} onClick={() => updateFilter('page', page - 1)}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ padding: '6px 12px', fontSize: 13 }}>Page {page} of {lastPage}</span>
                <button className="pst-pagination__btn" disabled={page >= lastPage} onClick={() => updateFilter('page', page + 1)}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
          {total > 0 && viewMode === 'grid' && (
            <div className="pst-pagination">
              <span>Showing all {total} poster{total !== 1 ? 's' : ''}</span>
            </div>
          )}
        </>
      )}

      {/* ── TAB: Templates ───────────────────────── */}
      {tab === 'templates' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            Browse available poster templates. Click "Use Template" to create a new poster.
          </p>
          {isTemplatesLoading && <p style={{ color: 'var(--color-text-tertiary)' }}>Loading templates...</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {templates.map(t => {
              const theme = t.default_theme_key ? getThemeByKey(t.default_theme_key) : getThemeByKey('safety_green');
              return (
                <div key={t.id} className="pst-template-card">
                  <div className="pst-template-card__preview" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, color: theme.header_text }}>
                    {t.layout_type?.toUpperCase() || 'POSTER'}
                  </div>
                  <div className="pst-template-card__footer">
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: 'var(--color-text-primary)' }}>{t.name}</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 6 }}>
                      <span className="pst-badge" style={{ fontSize: 10 }}>{t.category}</span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{t.default_orientation} · {t.print_size || 'A4'}</span>
                    </div>
                    {canManage && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => navigate(`/poster-generator/create?template=${t.id}`)}
                          style={{
                            flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 600,
                            background: 'var(--color-primary-50)', color: 'var(--color-primary)',
                            border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                          }}
                        >
                          Use Template
                        </button>
                        <button
                          onClick={() => setDeleteTemplateTarget(t)}
                          title="Delete template"
                          className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-danger-600 hover:bg-danger-50 transition-colors"
                          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: Analytics ───────────────────────── */}
      {tab === 'analytics' && stats && (
        <div className="pst-chart-grid">
          <HorizontalBarChart data={stats.by_status} labelKey="status" valueKey="count" title="By Status" />
          <HorizontalBarChart data={stats.by_category} labelKey="category" valueKey="count" title="By Category" />
          <HorizontalBarChart data={stats.by_topic} labelKey="topic" valueKey="count" title="By Topic" />
          <HorizontalBarChart data={stats.top_downloaded} labelKey="title" valueKey="download_count" title="Top 10 Downloaded" />
          <HorizontalBarChart data={stats.top_viewed} labelKey="title" valueKey="view_count" title="Top 10 Viewed" />
          {stats.by_site.length > 0 && <HorizontalBarChart data={stats.by_site} labelKey="site" valueKey="count" title="By Site" />}
          {stats.monthly_trend.length > 0 && (
            <div className="pst-chart-card" style={{ gridColumn: '1 / -1' }}>
              <div className="pst-chart-card__title">Monthly Trend (12 Months)</div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
                {stats.monthly_trend.map((m, i) => {
                  const maxV = Math.max(...stats.monthly_trend.map(x => x.created), 1);
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', width: '100%', justifyContent: 'center', height: 100 }}>
                        <div style={{ width: '40%', background: '#1F8034', borderRadius: 2, height: `${(m.created / maxV) * 100}%`, minHeight: 2 }} title={`Created: ${m.created}`} />
                        <div style={{ width: '40%', background: '#065F46', borderRadius: 2, height: `${(m.published / maxV) * 100}%`, minHeight: 2 }} title={`Published: ${m.published}`} />
                      </div>
                      <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>{m.month.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: 11 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#1F8034', borderRadius: 2 }} /> Created</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#065F46', borderRadius: 2 }} /> Published</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Drawer */}
      {selectedId && renderDetail()}

      {/* Delete Poster Confirmation */}
      {deleteTarget && (
        <TypedDeleteConfirmModal
          title="Delete Poster"
          message={`Type "${deleteTarget.poster_code}" to confirm deletion.`}
          confirmText={deleteTarget.poster_code}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Delete Template Confirmation */}
      {deleteTemplateTarget && (
        <TypedDeleteConfirmModal
          title="Delete Template"
          message={`Type "${deleteTemplateTarget.name}" to confirm deletion. Templates used by existing posters cannot be deleted.`}
          confirmText={deleteTemplateTarget.name}
          onConfirm={handleDeleteTemplate}
          onCancel={() => setDeleteTemplateTarget(null)}
        />
      )}
    </div>
  );
}
