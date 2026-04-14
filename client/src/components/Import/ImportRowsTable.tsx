import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import type { ImportRow, Classification } from './useImport';
import ClassificationBadge from './ClassificationBadge';
import ConfidenceBadge from './ConfidenceBadge';

interface Props {
  rows: ImportRow[];
  filter: Classification | 'all';
}

const rowBg: Record<Classification, string> = {
  new: '',
  update: 'bg-blue-50/40 border-l-[3px] border-l-blue-400',
  duplicate: 'opacity-60',
  conflict: 'bg-amber-50/40 border-l-[3px] border-l-amber-500',
  intra_file_dup: 'bg-orange-50/40 border-l-[3px] border-l-orange-400',
  error: 'bg-red-50/40 border-l-[3px] border-l-red-400',
};

function FieldLabel({ label }: { label: string }) {
  return <span className="text-gray-500 font-semibold min-w-[140px] text-[11px]">{label.replace(/_/g, ' ')}</span>;
}

function ExpandedDetail({ row }: { row: ImportRow }) {
  const hasMatch = row.matched_record_code || row.matched_record_id || row.matched_record_uuid;
  const toFill = row.fields_to_fill || {};
  const conflicts = row.fields_conflicting || {};
  const identical = row.fields_identical || [];

  return (
    <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 text-[12px] space-y-3">
      {/* Match info */}
      {hasMatch && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Match Info</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-gray-600">
            {row.matched_record_code && <span>Matched: <strong>{row.matched_record_code}</strong></span>}
            {row.match_type && <span>Basis: <strong>{row.match_type.replace(/_/g, ' ')}</strong></span>}
            <span>Confidence: <ConfidenceBadge confidence={row.match_confidence} /></span>
          </div>
        </div>
      )}

      {/* Fields to fill */}
      {Object.keys(toFill).length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-green-600 mb-1">Fields to Fill</div>
          {Object.entries(toFill).map(([field, value]) => (
            <div key={field} className="flex items-center gap-2 py-0.5">
              <FieldLabel label={field} />
              <span className="text-green-600">→</span>
              <span className="font-semibold text-green-700">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Identical fields */}
      {identical.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Identical Fields</div>
          <div className="text-gray-500">{identical.map(f => f.replace(/_/g, ' ')).join(', ')}</div>
        </div>
      )}

      {/* Conflicts */}
      {Object.keys(conflicts).length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">Conflicts (will NOT be changed)</div>
          {Object.entries(conflicts).map(([field, data]) => (
            <div key={field} className="p-2 bg-amber-50 border border-amber-200 rounded mb-1.5">
              <div className="font-bold text-amber-800 mb-1">{field.replace(/_/g, ' ')}</div>
              <div className="flex gap-1.5 items-center text-gray-600">
                <span>Existing: <strong className="text-red-600">{String(data.existing)}</strong></span>
                <span className="text-gray-300">|</span>
                <span>Incoming: <strong className="text-blue-600">{String(data.incoming)}</strong></span>
              </div>
              {data.reason && <div className="text-amber-700 text-[11px] mt-1">{data.reason}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Conflict reason */}
      {row.conflict_reason && row.classification === 'conflict' && (
        <div className="text-amber-700 text-[11px] italic">
          {row.conflict_reason}
        </div>
      )}

      {/* Raw data */}
      <details className="text-[11px]">
        <summary className="cursor-pointer text-gray-400 hover:text-gray-600">Raw imported data</summary>
        <pre className="mt-1 p-2 bg-white border border-gray-200 rounded text-[10px] overflow-x-auto max-h-40">
          {JSON.stringify(row.raw_data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default function ImportRowsTable({ rows, filter }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const filtered = filter === 'all' ? rows : rows.filter(r => r.classification === filter);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (filtered.length === 0) {
    return <div className="text-center py-8 text-gray-400 text-sm">No rows match this filter</div>;
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider">
            <th className="w-8 px-2 py-2"></th>
            <th className="px-3 py-2 text-left">Row</th>
            <th className="px-3 py-2 text-left">Classification</th>
            <th className="px-3 py-2 text-left">Name / Identifier</th>
            <th className="px-3 py-2 text-left">Match</th>
            <th className="px-3 py-2 text-left">Fields to Fill</th>
            <th className="px-3 py-2 text-left">Conflicts</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(row => {
            const isExpanded = expandedIds.has(row.id);
            const fillCount = row.fields_to_fill ? Object.keys(row.fields_to_fill).length : 0;
            const conflictCount = row.fields_conflicting ? Object.keys(row.fields_conflicting).length : 0;

            return (
              <tbody key={row.id}>
                <tr
                  className={clsx(
                    'border-t border-gray-100 cursor-pointer hover:bg-gray-50/50 transition-colors',
                    rowBg[row.classification],
                  )}
                  onClick={() => toggleExpand(row.id)}
                >
                  <td className="px-2 py-2 text-gray-400">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </td>
                  <td className="px-3 py-2 text-gray-500 font-mono">{row.row_number}</td>
                  <td className="px-3 py-2"><ClassificationBadge classification={row.classification} /></td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-800 truncate max-w-[200px]">{row.display_name}</div>
                    {row.display_id && <div className="text-[10px] text-gray-400 font-mono">{row.display_id}</div>}
                  </td>
                  <td className="px-3 py-2">
                    {row.matched_record_code ? (
                      <div>
                        <span className="text-gray-700 font-medium">{row.matched_record_code}</span>
                        <div className="mt-0.5"><ConfidenceBadge confidence={row.match_confidence} /></div>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {fillCount > 0 ? (
                      <span className="text-green-600 font-semibold">{fillCount} field{fillCount !== 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {conflictCount > 0 ? (
                      <span className="text-amber-600 font-semibold">{conflictCount} field{conflictCount !== 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <ExpandedDetail row={row} />
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
