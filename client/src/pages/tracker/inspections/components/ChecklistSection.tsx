import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import type { ChecklistResponse } from '../../../../config/inspectionConfig';
import { getChecklistStats, initChecklistResponses, mergeChecklistResponses } from '../../../../config/inspectionConfig';

interface Props {
  categoryKey: string;
  value: ChecklistResponse[];
  onChange: (responses: ChecklistResponse[]) => void;
  existingResponses?: ChecklistResponse[] | null;
}

type Answer = 'pass' | 'fail' | 'na' | null;

function AnswerButton({ answer, selected, onClick }: { answer: 'pass' | 'fail' | 'na'; selected: boolean; onClick: () => void }) {
  const label = answer === 'pass' ? 'Pass' : answer === 'fail' ? 'Fail' : 'N/A';

  const base = 'px-3 py-1 text-[11px] font-bold rounded-[var(--radius-sm)] border cursor-pointer transition-all select-none';
  const styles: Record<string, string> = {
    pass: selected
      ? 'bg-success-600 text-white border-success-600 shadow-xs'
      : 'bg-surface border-border text-text-tertiary hover:border-success-400 hover:text-success-600',
    fail: selected
      ? 'bg-danger-600 text-white border-danger-600 shadow-xs'
      : 'bg-surface border-border text-text-tertiary hover:border-danger-400 hover:text-danger-600',
    na: selected
      ? 'bg-neutral-500 text-white border-neutral-500 shadow-xs'
      : 'bg-surface border-border text-text-tertiary hover:border-neutral-400 hover:text-neutral-600',
  };

  return (
    <button type="button" className={`${base} ${styles[answer]}`} onClick={onClick}>
      {label}
    </button>
  );
}

export function ChecklistSection({ categoryKey, value, onChange, existingResponses }: Props) {
  // Initialize or merge responses when category changes
  useEffect(() => {
    if (existingResponses && existingResponses.length > 0) {
      onChange(mergeChecklistResponses(categoryKey, existingResponses));
    } else if (value.length === 0) {
      onChange(initChecklistResponses(categoryKey));
    }
  }, [categoryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = (index: number, answer: Answer) => {
    const updated = [...value];
    // Toggle off if same answer clicked again
    updated[index] = {
      ...updated[index],
      answer: updated[index].answer === answer ? null : answer,
      // Clear note when changing from fail to something else
      note: answer !== 'fail' && updated[index].answer === 'fail' ? '' : updated[index].note,
    };
    onChange(updated);
  };

  const handleNote = (index: number, note: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], note };
    onChange(updated);
  };

  // Group by section
  const sections = value.reduce<Record<string, { items: (ChecklistResponse & { _idx: number })[] }>>((acc, item, idx) => {
    const key = item.section;
    if (!acc[key]) acc[key] = { items: [] };
    acc[key].items.push({ ...item, _idx: idx });
    return acc;
  }, {});

  const stats = getChecklistStats(value);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Quick-fill actions
  const markAllPass = () => {
    onChange(value.map(r => ({ ...r, answer: 'pass' as const, note: '' })));
  };

  if (value.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className="flex items-center justify-between gap-3 p-2.5 bg-surface-sunken rounded-[var(--radius-md)] border border-border">
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <span className="flex items-center gap-1 text-success-600">
            <CheckCircle2 size={12} /> {stats.pass}
          </span>
          <span className="flex items-center gap-1 text-danger-600">
            <XCircle size={12} /> {stats.fail}
          </span>
          <span className="flex items-center gap-1 text-neutral-500">
            <MinusCircle size={12} /> {stats.na}
          </span>
          <span className="text-text-tertiary">
            {stats.pending} pending
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress */}
          <div className="flex items-center gap-1.5">
            <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${stats.pct}%`,
                  background: stats.fail > 0 ? 'var(--color-danger)' : 'var(--color-success)',
                }}
              />
            </div>
            <span className="text-[10px] font-semibold text-text-tertiary">{stats.pct}%</span>
          </div>
          <button
            type="button"
            onClick={markAllPass}
            className="px-2 py-0.5 text-[10px] font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100 transition-colors"
          >
            All Pass
          </button>
        </div>
      </div>

      {/* Sections */}
      {Object.entries(sections).map(([section, { items }]) => {
        const isCollapsed = collapsed[section];
        const sectionPass = items.filter(i => i.answer === 'pass').length;
        const sectionFail = items.filter(i => i.answer === 'fail').length;
        const sectionTotal = items.length;

        return (
          <div key={section} className="border border-border rounded-[var(--radius-md)] overflow-hidden">
            {/* Section Header */}
            <button
              type="button"
              onClick={() => toggleSection(section)}
              className="w-full flex items-center justify-between px-3 py-2 bg-canvas hover:bg-surface-sunken transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? <ChevronRight size={14} className="text-text-tertiary" /> : <ChevronDown size={14} className="text-text-tertiary" />}
                <span className="text-[12px] font-semibold text-text-primary">{section}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-medium">
                {sectionFail > 0 && <span className="text-danger-600">{sectionFail} fail</span>}
                <span className="text-text-tertiary">{sectionPass}/{sectionTotal}</span>
              </div>
            </button>

            {/* Section Items */}
            {!isCollapsed && (
              <div className="divide-y divide-border">
                {items.map(item => (
                  <div key={item.id} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {item.required && (
                          <span className="text-danger-500 text-[10px] font-bold shrink-0">*</span>
                        )}
                        <span className="text-[12px] text-text-primary leading-snug">{item.item}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <AnswerButton answer="pass" selected={item.answer === 'pass'} onClick={() => handleAnswer(item._idx, 'pass')} />
                        <AnswerButton answer="fail" selected={item.answer === 'fail'} onClick={() => handleAnswer(item._idx, 'fail')} />
                        {!item.required && (
                          <AnswerButton answer="na" selected={item.answer === 'na'} onClick={() => handleAnswer(item._idx, 'na')} />
                        )}
                      </div>
                    </div>

                    {/* Failure note */}
                    {item.answer === 'fail' && (
                      <input
                        type="text"
                        value={item.note}
                        onChange={e => handleNote(item._idx, e.target.value)}
                        placeholder="Describe the failure..."
                        className="mt-2 w-full px-2.5 py-1.5 text-[12px] bg-danger-50 border border-danger-200 rounded-[var(--radius-sm)] text-danger-800 placeholder:text-danger-400 focus:outline-none focus:ring-2 focus:ring-danger-200"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
