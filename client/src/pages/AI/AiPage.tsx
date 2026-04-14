import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import { QUERY_SCOPES, getSeverityColor, getSeverityBg, getInsightTypeIcon } from '../../config/aiConfig';
import { StatusBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import './AiPage.css';

// ─── Types ──────────────────────────────────────────────

interface DashboardData {
  active_alerts: number;
  critical_alerts: number;
  active_insights: number;
  pending_recommendations: number;
  top_alerts: AiAlert[];
  top_insights: AiInsight[];
  top_recommendations: AiRecommendation[];
  module_summary: Record<string, number>;
  recent_queries: { id: number; query_text: string; response_type: string; created_at: string }[];
}

interface AiInsight {
  id: number;
  title: string;
  description: string;
  insight_type: string;
  severity: string;
  linked_module: string | null;
  data_snapshot: Record<string, unknown> | null;
  generated_at: string;
  status: string;
}

interface AiRecommendation {
  id: number;
  title: string;
  description: string;
  recommendation_type: string;
  priority: string;
  linked_module: string | null;
  action_suggestion: string | null;
  expected_outcome: string | null;
  status: string;
  generated_at: string;
  insight?: { id: number; title: string; severity: string } | null;
}

interface AiAlert {
  id: number;
  title: string;
  description: string;
  alert_type: string;
  severity: string;
  linked_module: string | null;
  status: string;
  generated_at: string;
  created_at: string;
}

interface AiQueryResult {
  id: number;
  query_text: string;
  response_text: string | null;
  response_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface AiDocAnalysis {
  id: number;
  original_name: string;
  file_type: string;
  detected_document_type: string | null;
  confidence_score: number | null;
  summary: string | null;
  suggested_module: string | null;
  suggested_action: string | null;
  mapping_status: string;
  file_url: string | null;
  created_at: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

// ─── Main Component ─────────────────────────────────────

export default function AiPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ask' | 'insights' | 'recommendations' | 'alerts' | 'documents' | 'history'>('dashboard');

  const tabs = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: '📊' },
    { key: 'ask' as const, label: 'Ask AI', icon: '💬' },
    { key: 'insights' as const, label: 'Insights', icon: '💡' },
    { key: 'recommendations' as const, label: 'Recommendations', icon: '✅' },
    { key: 'alerts' as const, label: 'Alerts', icon: '🔔' },
    { key: 'documents' as const, label: 'Doc Analysis', icon: '📄' },
    { key: 'history' as const, label: 'History', icon: '📜' },
  ];

  return (
    <div className="ai-page">
      <div className="ai-page__header">
        <div>
          <h1 className="ai-page__title">AI Intelligence</h1>
          <p className="ai-page__subtitle">Data-driven insights, alerts, and recommendations powered by AI analysis</p>
        </div>
      </div>

      <div className="ai-page__tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`ai-tab ${activeTab === tab.key ? 'ai-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="ai-tab__icon">{tab.icon}</span>
            <span className="ai-tab__label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="ai-page__content">
        {activeTab === 'dashboard'       && <DashboardTab />}
        {activeTab === 'ask'             && <AskAiTab />}
        {activeTab === 'insights'        && <InsightsTab />}
        {activeTab === 'recommendations' && <RecommendationsTab />}
        {activeTab === 'alerts'          && <AlertsTab />}
        {activeTab === 'documents'       && <DocumentsTab />}
        {activeTab === 'history'         && <HistoryTab />}
      </div>
    </div>
  );
}

// ─── Dashboard Tab ──────────────────────────────────────

function DashboardTab() {
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardData>('/ai/dashboard')
      .then(setData)
      .catch(() => toast.error('Failed to load AI dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState message="Failed to load dashboard data" />;

  const moduleLabels: Record<string, string> = {
    open_observations: 'Open Observations',
    overdue_observations: 'Overdue Observations',
    open_incidents: 'Open Incidents',
    active_permits: 'Active Permits',
    open_violations: 'Open Violations',
    overdue_mom_actions: 'Overdue MOM Actions',
    expired_documents: 'Expired Documents',
    suspended_contractors: 'Suspended Contractors',
    delayed_waste_manifests: 'Delayed Manifests',
    training_expiring: 'Training Expiring',
  };

  return (
    <div className="ai-dashboard">
      {/* KPI Cards */}
      <div className="ai-kpi-grid">
        <KpiCard label="Active Alerts" value={data.active_alerts} color="danger" sub={`${data.critical_alerts} critical`} />
        <KpiCard label="Active Insights" value={data.active_insights} color="warning" />
        <KpiCard label="Pending Actions" value={data.pending_recommendations} color="info" />
        <KpiCard label="Recent Queries" value={data.recent_queries.length} color="primary" />
      </div>

      {/* Module Summary */}
      <div className="ai-section">
        <h3 className="ai-section__title">System Health Overview</h3>
        <div className="ai-module-grid">
          {Object.entries(data.module_summary).map(([key, val]) => (
            <div key={key} className={`ai-module-card ${(val as number) > 0 ? 'ai-module-card--warning' : ''}`}>
              <span className="ai-module-card__value">{val as number}</span>
              <span className="ai-module-card__label">{moduleLabels[key] || key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Alerts + Insights side by side */}
      <div className="ai-dashboard__row">
        <div className="ai-section ai-section--half">
          <h3 className="ai-section__title">Top Alerts</h3>
          {data.top_alerts.length === 0 ? <EmptyState message="No active alerts" small /> : (
            <div className="ai-card-list">
              {data.top_alerts.map(alert => (
                <div key={alert.id} className="ai-mini-card" style={{ borderLeftColor: getSeverityColor(alert.severity) }}>
                  <div className="ai-mini-card__header">
                    <StatusBadge status={alert.severity} />
                    <span className="ai-mini-card__type">{alert.alert_type}</span>
                  </div>
                  <p className="ai-mini-card__title">{alert.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ai-section ai-section--half">
          <h3 className="ai-section__title">Top Insights</h3>
          {data.top_insights.length === 0 ? <EmptyState message="No active insights" small /> : (
            <div className="ai-card-list">
              {data.top_insights.map(insight => (
                <div key={insight.id} className="ai-mini-card" style={{ borderLeftColor: getSeverityColor(insight.severity) }}>
                  <div className="ai-mini-card__header">
                    <span>{getInsightTypeIcon(insight.insight_type)}</span>
                    <StatusBadge status={insight.severity} />
                  </div>
                  <p className="ai-mini-card__title">{insight.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ask AI Tab ─────────────────────────────────────────

function AskAiTab() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AiQueryResult[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(() => {
    api.get<AiQueryResult[]>('/ai/queries?limit=20')
      .then(res => { if (Array.isArray(res) && res.length) setHistory(res); })
      .catch(() => toast.error('Failed to load query history'));
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleAsk = async () => {
    if (!query.trim() || loading) return;
    const asked = query.trim();
    setLoading(true);
    try {
      const result = await api.post<AiQueryResult>('/ai/ask', { query: asked, scope });
      // Ensure query_text is always set (backend may omit it)
      const entry: AiQueryResult = {
        ...result,
        query_text: result.query_text || asked,
        status: result.status || 'completed',
      };
      setHistory(prev => [...prev, entry]);
      setQuery('');
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get AI response';
      setHistory(prev => [...prev, {
        id: Date.now(),
        query_text: asked,
        response_text: null,
        response_type: 'general',
        status: 'failed',
        error_message: msg,
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQueries = [
    'What is the current safety status overview?',
    'Which contractors have the most violations?',
    'Are there any overdue training certifications?',
    'Show me incident trends for this month',
    'Which areas have the highest risk?',
    'Are there any expired documents I should know about?',
  ];

  return (
    <div className="ai-ask">
      {/* Chat History */}
      <div className="ai-ask__chat">
        {history.length === 0 && (
          <div className="ai-ask__welcome">
            <div className="ai-ask__welcome-icon">🧠</div>
            <h3>Ask AI about your EHS data</h3>
            <p>I analyze real data from all modules. Ask me about safety trends, compliance gaps, risk areas, or any EHS topic.</p>
            <div className="ai-ask__suggestions">
              {suggestedQueries.map((sq, i) => (
                <button key={i} className="ai-ask__suggestion" onClick={() => setQuery(sq)}>
                  {sq}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((item, idx) => (
          <div key={item.id || idx} className="ai-ask__turn">
            <div className="ai-ask__msg ai-ask__msg--user">
              <div className="ai-ask__msg-label">You</div>
              <p>{item.query_text}</p>
            </div>
            <div className={`ai-ask__msg ai-ask__msg--ai ${item.status === 'failed' ? 'ai-ask__msg--error' : ''}`}>
              <div className="ai-ask__msg-label">AI Assistant</div>
              {item.status === 'failed' ? (
                <div className="ai-ask__error-block">
                  <div className="ai-ask__error-header">
                    <span className="ai-ask__error-icon">⚠</span>
                    <span className="ai-ask__error-title">Error</span>
                  </div>
                  <p className="ai-ask__error">{item.error_message || 'An unexpected error occurred. Please try again.'}</p>
                </div>
              ) : (
                <p style={{ whiteSpace: 'pre-wrap' }}>{item.response_text}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="ai-ask__msg ai-ask__msg--ai">
            <div className="ai-ask__msg-label">AI Assistant</div>
            <div className="ai-ask__typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="ai-ask__input-area">
        <select className="ai-ask__scope" value={scope} onChange={e => setScope(e.target.value)}>
          {Object.entries(QUERY_SCOPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          className="ai-ask__input"
          type="text"
          placeholder="Ask about safety data, compliance, risks..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAsk()}
          disabled={loading}
        />
        <button className="ai-ask__send" onClick={handleAsk} disabled={loading || !query.trim()}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

// ─── Insights Tab ───────────────────────────────────────

function InsightsTab() {
  const toast = useToast();
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState({ status: 'Active', severity: '', insight_type: '' });
  const [selected, setSelected] = useState<AiInsight | null>(null);
  const [dismissReason, setDismissReason] = useState('');

  const fetchInsights = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.severity) params.set('severity', filter.severity);
    if (filter.insight_type) params.set('insight_type', filter.insight_type);
    params.set('per_page', '50');

    api.get<PaginatedResponse<AiInsight>>(`/ai/insights?${params}`)
      .then(res => setInsights(res.data))
      .catch(() => toast.error('Failed to load AI insights'))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post('/ai/insights/generate', {});
      fetchInsights();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  };

  const handleDismiss = async (insight: AiInsight) => {
    try {
      await api.post(`/ai/insights/${insight.id}/dismiss`, { reason: dismissReason });
      setSelected(null);
      setDismissReason('');
      fetchInsights();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to dismiss insight');
    }
  };

  return (
    <div className="ai-list-tab">
      <div className="ai-list-tab__toolbar">
        <div className="ai-list-tab__filters">
          <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Dismissed">Dismissed</option>
            <option value="Actioned">Actioned</option>
            <option value="Expired">Expired</option>
          </select>
          <select value={filter.severity} onChange={e => setFilter(f => ({ ...f, severity: e.target.value }))}>
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Info">Info</option>
          </select>
        </div>
        <button className="ai-btn ai-btn--primary" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Analyzing...' : 'Generate Insights'}
        </button>
      </div>

      {loading ? <LoadingState /> : insights.length === 0 ? <EmptyState message="No insights found" /> : (
        <div className="ai-card-grid">
          {insights.map(insight => (
            <div
              key={insight.id}
              className="ai-insight-card"
              style={{ borderLeftColor: getSeverityColor(insight.severity) }}
              onClick={() => setSelected(insight)}
            >
              <div className="ai-insight-card__header">
                <span className="ai-insight-card__icon">{getInsightTypeIcon(insight.insight_type)}</span>
                <StatusBadge status={insight.severity} />
                <StatusBadge status={insight.status} />
              </div>
              <h4 className="ai-insight-card__title">{insight.title}</h4>
              <p className="ai-insight-card__desc">{(insight.description || '').slice(0, 150)}{insight.description?.length > 150 ? '...' : ''}</p>
              <div className="ai-insight-card__footer">
                <span className="ai-insight-card__module">{insight.linked_module || 'System'}</span>
                <span className="ai-insight-card__date">{new Date(insight.generated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Insight Details" size="lg">
        {selected && (
          <div className="ai-detail">
            <div className="ai-detail__badges">
              <StatusBadge status={selected.severity} />
              <StatusBadge status={selected.status} />
              <span className="ai-detail__type">{selected.insight_type}</span>
            </div>
            <h3>{selected.title}</h3>
            <p style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{selected.description}</p>
            {selected.linked_module && (
              <p style={{ marginTop: 8, color: 'var(--color-text-secondary)', fontSize: 13 }}>
                Module: {selected.linked_module}
              </p>
            )}
            {selected.status === 'Active' && (
              <div className="ai-detail__actions" style={{ marginTop: 16 }}>
                <textarea
                  className="ai-textarea"
                  placeholder="Reason for dismissing (optional)"
                  value={dismissReason}
                  onChange={e => setDismissReason(e.target.value)}
                  rows={2}
                />
                <button className="ai-btn ai-btn--danger" onClick={() => handleDismiss(selected)}>
                  Dismiss Insight
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Recommendations Tab ────────────────────────────────

function RecommendationsTab() {
  const toast = useToast();
  const [recs, setRecs] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState({ status: 'Pending', priority: '' });
  const [selected, setSelected] = useState<AiRecommendation | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  const fetchRecs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.priority) params.set('priority', filter.priority);
    params.set('per_page', '50');

    api.get<PaginatedResponse<AiRecommendation>>(`/ai/recommendations?${params}`)
      .then(res => setRecs(res.data))
      .catch(() => toast.error('Failed to load AI recommendations'))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchRecs(); }, [fetchRecs]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post('/ai/recommendations/generate', {});
      fetchRecs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate recommendations');
    } finally {
      setGenerating(false);
    }
  };

  const handleAccept = async (rec: AiRecommendation) => {
    try {
      await api.post(`/ai/recommendations/${rec.id}/accept`, {});
      setSelected(null);
      fetchRecs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept recommendation');
    }
  };

  const handleComplete = async (rec: AiRecommendation) => {
    if (!completionNotes.trim()) return;
    try {
      await api.post(`/ai/recommendations/${rec.id}/complete`, { completion_notes: completionNotes });
      setSelected(null);
      setCompletionNotes('');
      fetchRecs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete recommendation');
    }
  };

  return (
    <div className="ai-list-tab">
      <div className="ai-list-tab__toolbar">
        <div className="ai-list-tab__filters">
          <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Accepted">Accepted</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Dismissed">Dismissed</option>
          </select>
          <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}>
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <button className="ai-btn ai-btn--primary" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Analyzing...' : 'Generate Recommendations'}
        </button>
      </div>

      {loading ? <LoadingState /> : recs.length === 0 ? <EmptyState message="No recommendations found" /> : (
        <div className="ai-card-grid">
          {recs.map(rec => (
            <div
              key={rec.id}
              className="ai-rec-card"
              style={{ borderLeftColor: getSeverityColor(rec.priority) }}
              onClick={() => setSelected(rec)}
            >
              <div className="ai-rec-card__header">
                <StatusBadge status={rec.priority} />
                <StatusBadge status={rec.status} />
              </div>
              <h4 className="ai-rec-card__title">{rec.title}</h4>
              <p className="ai-rec-card__type">{rec.recommendation_type}</p>
              {rec.action_suggestion && (
                <p className="ai-rec-card__desc">{rec.action_suggestion.slice(0, 120)}...</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => { setSelected(null); setCompletionNotes(''); }} title="Recommendation Details" size="lg">
        {selected && (
          <div className="ai-detail">
            <div className="ai-detail__badges">
              <StatusBadge status={selected.priority} />
              <StatusBadge status={selected.status} />
            </div>
            <h3>{selected.title}</h3>
            <p className="ai-detail__type">{selected.recommendation_type}</p>
            <p style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{selected.description}</p>
            {selected.action_suggestion && (
              <div style={{ marginTop: 12 }}>
                <strong>Action Steps:</strong>
                <p style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{selected.action_suggestion}</p>
              </div>
            )}
            {selected.expected_outcome && (
              <div style={{ marginTop: 12 }}>
                <strong>Expected Outcome:</strong>
                <p style={{ marginTop: 4 }}>{selected.expected_outcome}</p>
              </div>
            )}
            <div className="ai-detail__actions" style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              {selected.status === 'Pending' && (
                <button className="ai-btn ai-btn--primary" onClick={() => handleAccept(selected)}>
                  Accept Recommendation
                </button>
              )}
              {(selected.status === 'Accepted' || selected.status === 'In Progress') && (
                <div style={{ width: '100%' }}>
                  <textarea
                    className="ai-textarea"
                    placeholder="Completion notes (required)"
                    value={completionNotes}
                    onChange={e => setCompletionNotes(e.target.value)}
                    rows={2}
                  />
                  <button className="ai-btn ai-btn--success" onClick={() => handleComplete(selected)} disabled={!completionNotes.trim()}>
                    Mark Completed
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Alerts Tab ─────────────────────────────────────────

function AlertsTab() {
  const toast = useToast();
  const [alerts, setAlerts] = useState<AiAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState({ status: 'Active', severity: '' });
  const [selected, setSelected] = useState<AiAlert | null>(null);
  const [notes, setNotes] = useState('');

  const fetchAlerts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.severity) params.set('severity', filter.severity);
    params.set('per_page', '50');

    api.get<PaginatedResponse<AiAlert>>(`/ai/alerts?${params}`)
      .then(res => setAlerts(res.data))
      .catch(() => toast.error('Failed to load AI alerts'))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post('/ai/alerts/generate', {});
      fetchAlerts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate alerts');
    } finally {
      setGenerating(false);
    }
  };

  const handleAcknowledge = async (alert: AiAlert) => {
    try {
      await api.post(`/ai/alerts/${alert.id}/acknowledge`, {});
      setSelected(null);
      fetchAlerts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alert: AiAlert) => {
    try {
      await api.post(`/ai/alerts/${alert.id}/resolve`, { resolution_notes: notes });
      setSelected(null);
      setNotes('');
      fetchAlerts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve alert');
    }
  };

  return (
    <div className="ai-list-tab">
      <div className="ai-list-tab__toolbar">
        <div className="ai-list-tab__filters">
          <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resolved">Resolved</option>
            <option value="Dismissed">Dismissed</option>
          </select>
          <select value={filter.severity} onChange={e => setFilter(f => ({ ...f, severity: e.target.value }))}>
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <button className="ai-btn ai-btn--primary" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Scanning...' : 'Scan for Alerts'}
        </button>
      </div>

      {loading ? <LoadingState /> : alerts.length === 0 ? <EmptyState message="No alerts found" /> : (
        <div className="ai-card-grid">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className="ai-alert-card"
              style={{ borderLeftColor: getSeverityColor(alert.severity), backgroundColor: getSeverityBg(alert.severity) }}
              onClick={() => setSelected(alert)}
            >
              <div className="ai-alert-card__header">
                <StatusBadge status={alert.severity} />
                <StatusBadge status={alert.status} />
              </div>
              <h4 className="ai-alert-card__title">{alert.title}</h4>
              <p className="ai-alert-card__desc">{alert.description.slice(0, 120)}</p>
              <div className="ai-alert-card__footer">
                <span>{alert.alert_type}</span>
                <span>{new Date(alert.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => { setSelected(null); setNotes(''); }} title="Alert Details" size="lg">
        {selected && (
          <div className="ai-detail">
            <div className="ai-detail__badges">
              <StatusBadge status={selected.severity} />
              <StatusBadge status={selected.status} />
            </div>
            <h3>{selected.title}</h3>
            <p className="ai-detail__type">{selected.alert_type}</p>
            <p style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{selected.description}</p>
            {selected.linked_module && (
              <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Module: {selected.linked_module}
              </p>
            )}
            <div className="ai-detail__actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selected.status === 'Active' && (
                <button className="ai-btn ai-btn--warning" onClick={() => handleAcknowledge(selected)}>
                  Acknowledge
                </button>
              )}
              {(selected.status === 'Active' || selected.status === 'Acknowledged') && (
                <div style={{ width: '100%' }}>
                  <textarea
                    className="ai-textarea"
                    placeholder="Resolution notes (optional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                  />
                  <button className="ai-btn ai-btn--success" onClick={() => handleResolve(selected)}>
                    Resolve Alert
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Documents Tab ──────────────────────────────────────

function DocumentsTab() {
  const toast = useToast();
  const [analyses, setAnalyses] = useState<AiDocAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAnalyses = useCallback(() => {
    setLoading(true);
    api.get<PaginatedResponse<AiDocAnalysis>>('/ai/document-analyses?per_page=50')
      .then(res => setAnalyses(res.data))
      .catch(() => toast.error('Failed to load document analyses'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      await api.uploadForm('/ai/analyze-document', formData);
      toast.success('Document uploaded and analyzed successfully');
      fetchAnalyses();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to analyze document');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="ai-list-tab">
      <div className="ai-list-tab__toolbar">
        <p className="ai-list-tab__info">Upload documents for AI analysis. Supported: All document types (max 20MB)</p>
        <div>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xls,.xlsx,.csv,.ppt,.pptx,.rtf,.odt,.ods,.odp,.xml,.html,.htm,.json,.md,.zip,.rar,.7z,.mp4,.mp3,.wav,.avi,.mov,.svg,.gif,.bmp,.webp,.tiff,.tif" onChange={handleUpload} style={{ display: 'none' }} />
          <button className="ai-btn ai-btn--primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? 'Analyzing...' : 'Upload & Analyze'}
          </button>
        </div>
      </div>

      {loading ? <LoadingState /> : analyses.length === 0 ? <EmptyState message="No documents analyzed yet" /> : (
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Detected Type</th>
                <th>Confidence</th>
                <th>Suggested Module</th>
                <th>Summary</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map(a => (
                <tr key={a.id}>
                  <td className="ai-table__file">
                    <span>{a.original_name}</span>
                    <span className="ai-table__filetype">{a.file_type?.toUpperCase()}</span>
                  </td>
                  <td>{a.detected_document_type || '-'}</td>
                  <td>
                    {a.confidence_score != null ? (
                      <span className={`ai-confidence ${a.confidence_score >= 70 ? 'ai-confidence--high' : a.confidence_score >= 40 ? 'ai-confidence--med' : 'ai-confidence--low'}`}>
                        {a.confidence_score}%
                      </span>
                    ) : '-'}
                  </td>
                  <td>{a.suggested_module || '-'}</td>
                  <td className="ai-table__summary">{a.summary?.slice(0, 80) || '-'}</td>
                  <td><StatusBadge status={a.mapping_status} /></td>
                  <td>{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── History Tab ────────────────────────────────────────

function HistoryTab() {
  const toast = useToast();
  const [logs, setLogs] = useState<{ id: number; user_name: string; action_type: string; input_reference: string; output_reference: string; module_scope: string; tokens_used: number; duration_ms: number; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PaginatedResponse<typeof logs[0]>>('/ai/history?per_page=50')
      .then(res => setLogs(res.data))
      .catch(() => toast.error('Failed to load AI activity history'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="ai-list-tab">
      <div className="ai-list-tab__toolbar">
        <h3 style={{ margin: 0 }}>AI Activity Log</h3>
      </div>

      {loading ? <LoadingState /> : logs.length === 0 ? <EmptyState message="No activity yet" /> : (
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>User</th>
                <th>Scope</th>
                <th>Tokens</th>
                <th>Duration</th>
                <th>Reference</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td><span className="ai-log-action">{log.action_type}</span></td>
                  <td>{log.user_name || 'System'}</td>
                  <td>{log.module_scope || '-'}</td>
                  <td>{log.tokens_used || '-'}</td>
                  <td>{log.duration_ms ? `${log.duration_ms}ms` : '-'}</td>
                  <td className="ai-table__ref">{log.output_reference || log.input_reference || '-'}</td>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────

function KpiCard({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  const colorMap: Record<string, string> = {
    primary: 'var(--color-primary-500)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger:  'var(--color-danger)',
    info:    'var(--color-info)',
  };
  const bgMap: Record<string, string> = {
    primary: 'rgba(46,158,69,0.08)',
    success: 'rgba(22,163,74,0.08)',
    warning: 'rgba(217,119,6,0.08)',
    danger:  'rgba(220,38,38,0.08)',
    info:    'rgba(2,132,199,0.08)',
  };

  return (
    <div className="ai-kpi" style={{ borderColor: colorMap[color], backgroundColor: bgMap[color] }}>
      <span className="ai-kpi__value" style={{ color: colorMap[color] }}>{value}</span>
      <span className="ai-kpi__label">{label}</span>
      {sub && <span className="ai-kpi__sub">{sub}</span>}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="ai-loading">
      <div className="ai-loading__spinner" />
      <p>Loading...</p>
    </div>
  );
}

function EmptyState({ message, small }: { message: string; small?: boolean }) {
  return (
    <div className={`ai-empty ${small ? 'ai-empty--small' : ''}`}>
      <p>{message}</p>
    </div>
  );
}
