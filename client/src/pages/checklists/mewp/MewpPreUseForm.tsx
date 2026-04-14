import { useState, useMemo } from 'react';
import { X as XIcon, ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, Minus } from 'lucide-react';
import { MEWP_PREUSE_CHECKLIST } from '../config/mewpChecklists';
import type { ChecklistItem } from '../hooks/useChecklists';
import { MewpTypeBadge } from './MewpTypeBadge';

interface Props {
  item: ChecklistItem;
  onSubmit: (itemId: string, data: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
}

interface Response {
  id: string;
  result: 'pass' | 'fail' | 'na';
  note: string;
}

export function MewpPreUseForm({ item, onSubmit, onClose }: Props) {
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspectorName, setInspectorName] = useState('');
  const [engineHours, setEngineHours] = useState(item.engine_hours?.toString() || '');
  const [defectFound, setDefectFound] = useState(false);
  const [defectDetail, setDefectDetail] = useState('');
  const [notes, setNotes] = useState('');
  const [responses, setResponses] = useState<Response[]>(
    MEWP_PREUSE_CHECKLIST.map(ci => ({ id: ci.id, result: 'pass' as const, note: '' }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const sections = useMemo(() => {
    const map = new Map<string, typeof MEWP_PREUSE_CHECKLIST>();
    MEWP_PREUSE_CHECKLIST.forEach(ci => {
      if (!map.has(ci.section)) map.set(ci.section, []);
      map.get(ci.section)!.push(ci);
    });
    return Array.from(map.entries());
  }, []);

  const setResult = (id: string, result: 'pass' | 'fail' | 'na') => {
    setResponses(prev => prev.map(r => r.id === id ? { ...r, result } : r));
  };

  const setNote = (id: string, note: string) => {
    setResponses(prev => prev.map(r => r.id === id ? { ...r, note } : r));
  };

  const counts = useMemo(() => {
    const pass = responses.filter(r => r.result === 'pass').length;
    const fail = responses.filter(r => r.result === 'fail').length;
    const na = responses.filter(r => r.result === 'na').length;
    return { pass, fail, na, total: MEWP_PREUSE_CHECKLIST.length };
  }, [responses]);

  const overallColor = defectFound || counts.fail >= 3 ? 'var(--color-danger-600)'
    : counts.fail > 0 ? 'var(--color-warning-600)' : 'var(--color-secondary)';

  const overallLabel = defectFound || counts.fail >= 3 ? 'FAIL'
    : counts.fail > 0 ? 'PASS WITH ISSUES' : 'PASS';

  const handleSubmit = async () => {
    if (!inspectorName.trim()) {
      setError('Inspector name is required');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(item.id, {
        inspection_date: inspectionDate,
        inspector_name: inspectorName,
        checklist_responses: responses,
        engine_hours: engineHours ? parseFloat(engineHours) : null,
        defect_found: defectFound,
        defect_detail: defectFound ? defectDetail : null,
        notes: notes || null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record inspection');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" onClick={onClose} />
      <div
        className="relative w-full max-w-[680px] bg-surface shadow-xl flex flex-col border-l border-border overflow-hidden"
        style={{ animation: 'slideInRight 260ms ease-out' }}
      >
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-border" style={{ borderTop: '4px solid var(--color-primary-600)' }}>
          <button
            onClick={onClose}
            className="absolute right-3 top-3 w-7 h-7 flex items-center justify-center rounded-full text-text-tertiary hover:bg-surface-sunken"
          >
            <XIcon size={16} />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck size={20} className="text-primary-600" />
            <span className="text-[15px] font-bold text-text-primary">MEWP Daily Pre-Use Check</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] px-2 py-0.5 bg-surface-sunken border border-border rounded text-text-secondary">
              {item.item_code}
            </span>
            <span className="text-[13px] text-text-secondary">{item.name}</span>
            {item.mewp_type && <MewpTypeBadge mewpType={item.mewp_type} />}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain p-5 space-y-5" style={{ scrollbarWidth: 'thin' }}>
          {/* Inspector Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-1">
                Date *
              </label>
              <input
                type="date"
                value={inspectionDate}
                onChange={e => setInspectionDate(e.target.value)}
                className="w-full h-[34px] px-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-1">
                Inspector *
              </label>
              <input
                type="text"
                value={inspectorName}
                onChange={e => setInspectorName(e.target.value)}
                placeholder="Inspector name"
                className="w-full h-[34px] px-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-1">
                Engine Hours
              </label>
              <input
                type="number"
                value={engineHours}
                onChange={e => setEngineHours(e.target.value)}
                placeholder="0.00"
                step="0.5"
                className="w-full h-[34px] px-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
              />
            </div>
          </div>

          {/* Score Summary */}
          <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border" style={{ borderColor: `${overallColor}40`, backgroundColor: `${overallColor}08` }}>
            <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--color-secondary)' }}>
              <CheckCircle2 size={14} /> {counts.pass} Pass
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--color-danger-600)' }}>
              <XCircle size={14} /> {counts.fail} Fail
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-text-tertiary">
              <Minus size={14} /> {counts.na} N/A
            </div>
            <div className="ml-auto text-[12px] font-bold" style={{ color: overallColor }}>
              {overallLabel}
            </div>
          </div>

          {/* Checklist Items by Section */}
          {sections.map(([sectionName, sectionItems]) => (
            <div key={sectionName}>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary mb-2 pb-1 border-b border-border">
                {sectionName}
              </h4>
              <div className="space-y-1">
                {sectionItems.map(ci => {
                  const response = responses.find(r => r.id === ci.id);
                  const isFail = response?.result === 'fail';
                  return (
                    <div
                      key={ci.id}
                      className={`p-2.5 rounded-[var(--radius-sm)] transition-colors ${
                        isFail ? 'bg-danger-50 border border-danger-100' : 'hover:bg-surface-sunken'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-[12.5px] text-text-primary">{ci.item}</span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => setResult(ci.id, 'pass')}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-[var(--radius-sm)] border transition-all ${
                              response?.result === 'pass'
                                ? 'bg-success-100 border-success-300 text-success-700'
                                : 'bg-surface border-border text-text-tertiary hover:bg-surface-sunken'
                            }`}
                          >
                            Pass
                          </button>
                          <button
                            onClick={() => setResult(ci.id, 'fail')}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-[var(--radius-sm)] border transition-all ${
                              response?.result === 'fail'
                                ? 'bg-danger-100 border-danger-300 text-danger-700'
                                : 'bg-surface border-border text-text-tertiary hover:bg-surface-sunken'
                            }`}
                          >
                            Fail
                          </button>
                          {ci.type === 'pass_fail_na' && (
                            <button
                              onClick={() => setResult(ci.id, 'na')}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded-[var(--radius-sm)] border transition-all ${
                                response?.result === 'na'
                                  ? 'bg-gray-100 border-gray-300 text-gray-700'
                                  : 'bg-surface border-border text-text-tertiary hover:bg-surface-sunken'
                              }`}
                            >
                              N/A
                            </button>
                          )}
                        </div>
                      </div>
                      {isFail && (
                        <input
                          type="text"
                          value={response?.note || ''}
                          onChange={e => setNote(ci.id, e.target.value)}
                          placeholder="Describe the issue..."
                          className="mt-2 w-full h-[30px] px-2.5 text-[12px] bg-white border border-danger-200 rounded-[var(--radius-sm)] focus:border-danger-400 focus:ring-1 focus:ring-danger-300/30 text-danger-700 placeholder:text-danger-300"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Defect Toggle */}
          <div className="pt-3 border-t border-border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={defectFound}
                onChange={e => setDefectFound(e.target.checked)}
                className="w-4 h-4 rounded border-border text-danger-600 focus:ring-danger-500"
              />
              <span className="text-[13px] font-medium text-text-primary">Defect Found</span>
            </label>
            {defectFound && (
              <div className="mt-3 p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)]">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-danger-600" />
                  <span className="text-[12px] font-semibold text-danger-700">
                    Equipment will be placed Out of Service
                  </span>
                </div>
                <textarea
                  value={defectDetail}
                  onChange={e => setDefectDetail(e.target.value)}
                  placeholder="Describe the defect in detail..."
                  rows={3}
                  className="w-full px-3 py-2 text-[12px] bg-white border border-danger-200 rounded-[var(--radius-sm)] text-text-primary focus:border-danger-400 focus:ring-1 focus:ring-danger-300/30"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Additional observations..."
              className="w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 bg-surface-sunken border-t border-border flex items-center justify-between">
          {error && (
            <span className="text-[12px] text-danger-600">{error}</span>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 text-[13px] font-semibold text-white rounded-[var(--radius-md)] shadow-xs disabled:opacity-50"
              style={{ backgroundColor: overallColor }}
            >
              {submitting ? 'Recording...' : `Submit — ${overallLabel}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
