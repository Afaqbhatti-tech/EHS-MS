import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, AlertTriangle, Shield, Wrench, Clock,
  CheckCircle2, XCircle, Truck, ArrowUpDown, MoveUpRight,
  PersonStanding, MoveDiagonal, ChevronRight,
} from 'lucide-react';
import { MEWP_TYPES } from '../config/mewpTypes';
import { MewpTypeBadge, CertExpiryBadge } from './MewpTypeBadge';
import { MewpPreUseForm } from './MewpPreUseForm';
import type { ChecklistItem, MewpStats } from '../hooks/useChecklists';
import { api } from '../../../services/api';

interface Props {
  items: ChecklistItem[];
  loading: boolean;
  onBack: () => void;
  onView: (item: ChecklistItem) => void;
  onEdit: (item: ChecklistItem) => void;
  recordMewpPreUse: (itemId: string, data: Record<string, unknown>) => Promise<unknown>;
  closeDefect: (itemId: string, closureNotes: string) => Promise<unknown>;
  refresh: () => void;
}

const MEWP_ICONS: Record<string, React.ReactNode> = {
  forklift: <Truck size={16} />,
  scissor_lift: <ArrowUpDown size={16} />,
  telehandler: <MoveUpRight size={16} />,
  man_lift: <PersonStanding size={16} />,
  boom_lift: <MoveDiagonal size={16} />,
};

export function MewpDashboard({ items, loading, onBack, onView, onEdit, recordMewpPreUse, closeDefect, refresh }: Props) {
  const [mewpStats, setMewpStats] = useState<MewpStats | null>(null);
  const [activeType, setActiveType] = useState<string>('');
  const [preUseItem, setPreUseItem] = useState<ChecklistItem | null>(null);
  const [closingDefectId, setClosingDefectId] = useState<string | null>(null);
  const [closureNotes, setClosureNotes] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get<MewpStats>('/checklists/mewp/stats');
      setMewpStats(data);
    } catch (err) {
      console.error('MEWP stats error:', err);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const filteredItems = activeType
    ? items.filter(i => i.mewp_type === activeType)
    : items;

  const kpis = mewpStats?.kpis;

  const KPI_CARDS = [
    { label: 'Total MEWP', value: kpis?.total ?? 0, color: 'var(--color-kpi-total)', icon: <Shield size={18} /> },
    { label: 'Active', value: kpis?.active ?? 0, color: 'var(--color-kpi-secondary)', icon: <CheckCircle2 size={18} /> },
    { label: 'Overdue', value: kpis?.overdue ?? 0, color: 'var(--color-kpi-danger)', icon: <Clock size={18} />, pulse: true },
    { label: 'Due Soon', value: kpis?.due_soon ?? 0, color: 'var(--color-kpi-warning)', icon: <Clock size={18} /> },
    { label: 'Out of Service', value: kpis?.out_of_service ?? 0, color: 'var(--color-danger-700)', icon: <XCircle size={18} /> },
    { label: 'Open Defects', value: kpis?.has_open_defect ?? 0, color: 'var(--color-danger-700)', icon: <AlertTriangle size={18} />, pulse: true },
  ];

  const handleCloseDefect = async () => {
    if (!closingDefectId || !closureNotes.trim()) return;
    await closeDefect(closingDefectId, closureNotes);
    setClosingDefectId(null);
    setClosureNotes('');
    fetchStats();
    refresh();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface-sunken"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-[18px] font-bold text-text-primary">MEWP Equipment</h2>
          <p className="text-[12px] text-text-secondary">Mobile Elevating Work Platforms — Pre-use checks, defect tracking, certifications</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI_CARDS.map((card, i) => (
          <div
            key={card.label}
            className={`bg-surface border border-border rounded-[var(--radius-lg)] p-3.5 shadow-xs hover:shadow-sm hover:-translate-y-0.5 transition-all ${
              card.pulse && card.value > 0 ? 'animate-[subtlePulse_2s_ease-in-out_infinite]' : ''
            }`}
            style={{
              borderLeftWidth: 3,
              borderLeftColor: card.color,
              animation: `fadeInUp 400ms ease-out ${i * 60}ms both`,
            }}
          >
            <div
              className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center mb-2"
              style={{ backgroundColor: `${card.color}12`, color: card.color }}
            >
              {card.icon}
            </div>
            <div className="text-[22px] font-bold text-text-primary" style={{ letterSpacing: '-0.02em' }}>
              {card.value}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-medium">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Equipment Type Mini-Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {MEWP_TYPES.map(type => {
          const typeStats = mewpStats?.byType.find(t => t.mewp_type === type.key);
          const isActive = activeType === type.key;
          return (
            <button
              key={type.key}
              onClick={() => setActiveType(isActive ? '' : type.key)}
              className={`flex items-center gap-2.5 p-3 rounded-[var(--radius-md)] border text-left transition-all ${
                isActive
                  ? 'border-primary-300 bg-primary-50 shadow-sm'
                  : 'border-border bg-surface hover:border-border-strong hover:shadow-xs'
              }`}
            >
              <div
                className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
                style={{ backgroundColor: type.lightColor, color: type.textColor }}
              >
                {MEWP_ICONS[type.key] || <Wrench size={16} />}
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-text-primary truncate">{type.label}</div>
                <div className="text-[11px] text-text-tertiary">
                  {typeStats?.total ?? 0} items
                  {(typeStats?.overdue ?? 0) > 0 && (
                    <span className="text-danger-600 ml-1">({typeStats!.overdue} overdue)</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Attention Alerts */}
      {(mewpStats?.attention?.length ?? 0) > 0 && (
        <div className="bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-danger-600" />
            <span className="text-[13px] font-semibold text-danger-700">Items Requiring Attention</span>
          </div>
          <div className="space-y-2">
            {mewpStats!.attention.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-[12px] p-2 bg-white rounded border border-danger-100">
                <span className="font-mono text-[11px] text-text-secondary">{item.item_code}</span>
                <span className="text-text-primary font-medium flex-1">{item.name}</span>
                {item.has_open_defect && (
                  <span className="text-[11px] px-2 py-0.5 bg-danger-100 text-danger-700 rounded-full font-semibold">Defect</span>
                )}
                {item.is_overdue && (
                  <span className="text-[11px] px-2 py-0.5 bg-danger-100 text-danger-700 rounded-full font-semibold">Overdue</span>
                )}
                <button
                  onClick={() => onView(item)}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  View <ChevronRight size={12} className="inline" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipment Table */}
      <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-sunken border-b-2 border-border">
                {['Type', 'Name', 'Plate', 'SWL', 'Last Check', 'Next Due', 'Cert Expiry', 'Health', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-text-tertiary text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 bg-surface-sunken rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <div className="text-text-tertiary text-[13px]">No MEWP equipment found</div>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isDefect = item.has_open_defect;
                  const isOverdue = item.is_overdue;
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-border hover:bg-canvas transition-colors group ${
                        isDefect ? 'bg-danger-50/50 border-l-3 border-l-danger-400' :
                        isOverdue ? 'bg-danger-50/30 border-l-3 border-l-danger-300' : ''
                      }`}
                      style={{ borderLeftWidth: isDefect || isOverdue ? 3 : undefined }}
                    >
                      <td className="px-3 py-2.5">
                        {item.mewp_type && <MewpTypeBadge mewpType={item.mewp_type} />}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-[12.5px] font-medium text-text-primary">{item.name}</div>
                        <div className="font-mono text-[10px] text-text-tertiary">{item.item_code}</div>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-secondary">{item.plate_number || '—'}</td>
                      <td className="px-3 py-2.5 text-[12px] text-text-secondary font-medium">{item.swl || '—'}</td>
                      <td className="px-3 py-2.5 text-[12px] text-text-secondary">
                        {item.last_internal_inspection_date || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-[12px]">
                        {item.next_internal_inspection_date ? (
                          <span className={item.is_overdue ? 'text-danger-600 font-semibold' : item.due_soon ? 'text-warning-600 font-medium' : 'text-text-secondary'}>
                            {item.next_internal_inspection_date}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <CertExpiryBadge expiryDate={item.third_party_cert_expiry} />
                      </td>
                      <td className="px-3 py-2.5">
                        <HealthPill condition={item.health_condition} />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusPill status={item.status} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setPreUseItem(item)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-white bg-primary-600 rounded-[var(--radius-sm)] hover:bg-primary-700"
                          >
                            Pre-Use Check
                          </button>
                          {isDefect && (
                            <button
                              onClick={() => { setClosingDefectId(item.id); setClosureNotes(''); }}
                              className="px-2 py-1 text-[11px] font-semibold text-danger-600 bg-danger-50 border border-danger-200 rounded-[var(--radius-sm)] hover:bg-danger-100"
                            >
                              Close Defect
                            </button>
                          )}
                          <button
                            onClick={() => onView(item)}
                            className="px-2 py-1 text-[11px] text-text-secondary hover:text-primary-600"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certs Due Section */}
      {(mewpStats?.certsDue?.length ?? 0) > 0 && (
        <div className="bg-warning-50 border border-warning-100 rounded-[var(--radius-md)] p-4">
          <h3 className="text-[13px] font-semibold text-warning-700 mb-3">
            Third-Party Certifications Due Within 60 Days
          </h3>
          <div className="space-y-2">
            {mewpStats!.certsDue.map(item => (
              <div key={item.id} className="flex items-center gap-3 text-[12px] p-2 bg-white rounded border border-warning-100">
                <span className="font-mono text-[11px]">{item.item_code}</span>
                <span className="font-medium flex-1">{item.name}</span>
                <CertExpiryBadge expiryDate={item.third_party_cert_expiry} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre-Use Form Modal */}
      {preUseItem && (
        <MewpPreUseForm
          item={preUseItem}
          onSubmit={async (itemId, data) => {
            await recordMewpPreUse(itemId, data);
            fetchStats();
          }}
          onClose={() => setPreUseItem(null)}
        />
      )}

      {/* Close Defect Modal */}
      {closingDefectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setClosingDefectId(null)} />
          <div className="relative bg-surface rounded-[var(--radius-lg)] shadow-xl p-5 w-full max-w-md" style={{ animation: 'fadeInUp 200ms ease-out' }}>
            <h3 className="text-[15px] font-bold text-text-primary mb-3">Close Defect</h3>
            <p className="text-[12px] text-text-secondary mb-3">
              Describe the corrective action taken. Equipment will return to Active status.
            </p>
            <textarea
              value={closureNotes}
              onChange={e => setClosureNotes(e.target.value)}
              rows={4}
              placeholder="Describe how the defect was resolved..."
              className="w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setClosingDefectId(null)}
                className="px-4 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseDefect}
                disabled={!closureNotes.trim()}
                className="px-4 py-2 text-[13px] font-semibold text-white bg-success-600 rounded-[var(--radius-md)] disabled:opacity-50"
              >
                Close Defect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const HEALTH_TOKENS: Record<string, { bg: string; text: string }> = {
  'Good':           { bg: 'var(--color-health-good)', text: 'var(--color-health-good-text)' },
  'Fair':           { bg: 'var(--color-health-fair)', text: 'var(--color-health-fair-text)' },
  'Poor':           { bg: 'var(--color-health-poor)', text: 'var(--color-health-poor-text)' },
  'Out of Service': { bg: 'var(--color-health-poor)', text: 'var(--color-health-poor-text)' },
  'Quarantined':    { bg: 'var(--color-health-quarantined)', text: 'var(--color-health-quarantined-text)' },
};

function HealthPill({ condition }: { condition: string }) {
  const c = HEALTH_TOKENS[condition] || HEALTH_TOKENS['Good'];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} />
      {condition}
    </span>
  );
}

const STATUS_TOKENS: Record<string, { bg: string; text: string }> = {
  'Active':            { bg: 'var(--color-item-active)', text: 'var(--color-item-active-text)' },
  'Inactive':          { bg: 'var(--color-item-inactive)', text: 'var(--color-item-inactive-text)' },
  'Out of Service':    { bg: 'var(--color-item-oos)', text: 'var(--color-item-oos-text)' },
  'Quarantined':       { bg: 'var(--color-item-quarantined)', text: 'var(--color-item-quarantined-text)' },
  'Removed from Site': { bg: 'var(--color-item-removed)', text: 'var(--color-item-removed-text)' },
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_TOKENS[status] || STATUS_TOKENS['Active'];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} />
      {status}
    </span>
  );
}
