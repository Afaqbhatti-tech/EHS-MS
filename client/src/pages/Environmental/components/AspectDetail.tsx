import React, { useEffect, useState } from 'react';
import { getRiskLevel } from '../../../config/environmentalConfig';
import RiskLevelBadge from './RiskLevelBadge';
import EnvStatusBadge from './EnvStatusBadge';

interface AspectDetailProps {
  aspectId: number;
  env: any;
  onClose: () => void;
  onEdit: () => void;
}

export default function AspectDetail({ aspectId, env, onClose, onEdit }: AspectDetailProps) {
  const [aspect, setAspect] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    env.showAspect(aspectId).then((res: any) => {
      if (!cancelled) {
        // Backend returns { aspect: {...}, logs: [...] }
        const data = res.aspect || res;
        if (res.logs) data.logs = res.logs;
        setAspect(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspectId]);

  if (loading) {
    return (
      <div className="env-modal-overlay" onClick={onClose}>
        <div className="env-modal" onClick={(e) => e.stopPropagation()}>
          <div className="env-empty-state">Loading aspect details...</div>
        </div>
      </div>
    );
  }

  if (!aspect) {
    return (
      <div className="env-modal-overlay" onClick={onClose}>
        <div className="env-modal" onClick={(e) => e.stopPropagation()}>
          <div className="env-empty-state">Aspect not found.</div>
          <div className="env-modal-footer">
            <button className="env-btn env-btn--secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const risk =
    aspect.severity && aspect.likelihood
      ? getRiskLevel(aspect.severity, aspect.likelihood)
      : null;

  const logs: any[] = aspect.logs || [];
  const relatedRisks: any[] = aspect.risks || [];
  const relatedActions: any[] = aspect.actions || [];

  return (
    <div className="env-modal-overlay" onClick={onClose}>
      <div
        className="env-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 740 }}
      >
        {/* ── Header ────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0 }}>{aspect.aspect_code}</h2>
            <EnvStatusBadge status={aspect.status} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="env-btn env-btn--secondary" onClick={onEdit}>
              Edit
            </button>
            <button className="env-btn env-btn--secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {/* ── Info Grid ─────────────────────────────── */}
        <div className="env-card" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px 24px',
              fontSize: 14,
            }}
          >
            <div>
              <strong>Activity</strong>
              <div style={{ marginTop: 2 }}>{aspect.activity || '-'}</div>
            </div>
            <div>
              <strong>Category</strong>
              <div style={{ marginTop: 2 }}>{aspect.category || '-'}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>Description</strong>
              <div style={{ marginTop: 2 }}>
                {aspect.aspect || aspect.aspect_description || '-'}
              </div>
            </div>
            <div>
              <strong>Impact Type</strong>
              <div style={{ marginTop: 2 }}>{aspect.impact_type || '-'}</div>
            </div>
            <div>
              <strong>Impact Description</strong>
              <div style={{ marginTop: 2 }}>
                {aspect.impact || aspect.impact_description || '-'}
              </div>
            </div>
            <div>
              <strong>Severity</strong>
              <div style={{ marginTop: 2 }}>{aspect.severity ?? '-'}</div>
            </div>
            <div>
              <strong>Likelihood</strong>
              <div style={{ marginTop: 2 }}>{aspect.likelihood ?? '-'}</div>
            </div>
            <div>
              <strong>Risk Score</strong>
              <div style={{ marginTop: 2 }}>{risk ? risk.score : '-'}</div>
            </div>
            <div>
              <strong>Risk Level</strong>
              <div style={{ marginTop: 4 }}>
                {risk ? <RiskLevelBadge level={risk.level} /> : '-'}
              </div>
            </div>
            <div>
              <strong>Area</strong>
              <div style={{ marginTop: 2 }}>{aspect.area || '-'}</div>
            </div>
            <div>
              <strong>Responsible</strong>
              <div style={{ marginTop: 2 }}>{aspect.responsible_person || '-'}</div>
            </div>
            <div>
              <strong>Review Date</strong>
              <div style={{ marginTop: 2 }}>
                {aspect.review_date ? new Date(aspect.review_date).toLocaleDateString() : '-'}
              </div>
            </div>
            <div>
              <strong>Created</strong>
              <div style={{ marginTop: 2 }}>
                {aspect.created_at
                  ? new Date(aspect.created_at).toLocaleDateString()
                  : '-'}
                {aspect.created_by_name ? ` by ${aspect.created_by_name}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* ── Controls ──────────────────────────────── */}
        {(aspect.control_measures || aspect.controls || aspect.additional_controls) && (
          <div className="env-card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Controls</h3>
            {(aspect.control_measures || aspect.controls) && (
              <div style={{ marginBottom: 6 }}>
                <strong>Existing Controls:</strong>
                <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>
                  {aspect.control_measures || aspect.controls}
                </div>
              </div>
            )}
            {aspect.additional_controls && (
              <div>
                <strong>Additional Controls:</strong>
                <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>
                  {aspect.additional_controls}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Notes ─────────────────────────────────── */}
        {aspect.notes && (
          <div className="env-card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Notes</h3>
            <div style={{ whiteSpace: 'pre-wrap' }}>{aspect.notes}</div>
          </div>
        )}

        {/* ── Related Risks ─────────────────────────── */}
        {relatedRisks.length > 0 && (
          <div className="env-card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>
              Related Risks ({relatedRisks.length})
            </h3>
            <table className="env-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Risk Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {relatedRisks.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.risk_code}</td>
                    <td>{r.description || r.title || '-'}</td>
                    <td>
                      <RiskLevelBadge level={r.risk_level} />
                    </td>
                    <td>
                      <EnvStatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Related Actions ───────────────────────── */}
        {relatedActions.length > 0 && (
          <div className="env-card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>
              Related Actions ({relatedActions.length})
            </h3>
            <table className="env-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {relatedActions.map((a: any) => (
                  <tr key={a.id}>
                    <td>{a.action_code}</td>
                    <td>{a.title || '-'}</td>
                    <td>
                      <EnvStatusBadge status={a.status} />
                    </td>
                    <td>
                      {a.due_date
                        ? new Date(a.due_date).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Activity Log ──────────────────────────── */}
        {logs.length > 0 && (
          <div className="env-card">
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Activity Log</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {logs.map((log: any) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    fontSize: 13,
                    borderLeft: '3px solid #E5E7EB',
                    paddingLeft: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{log.action}</div>
                    {log.description && (
                      <div style={{ color: '#6B7280', marginTop: 2 }}>{log.description}</div>
                    )}
                    {log.from_status && log.to_status && (
                      <div style={{ color: '#6B7280', marginTop: 2 }}>
                        {log.from_status} &rarr; {log.to_status}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      flexShrink: 0,
                      color: '#9CA3AF',
                      fontSize: 12,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div>{log.performed_by_name || 'System'}</div>
                    <div>
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString()
                        : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
