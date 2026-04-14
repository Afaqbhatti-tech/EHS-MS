import React from 'react';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import type { AmendmentChange } from '../hooks/useAmendments';

/* ── Props ─────────────────────────────────────────── */

interface ChangeRowsTableProps {
  changes: AmendmentChange[];
  mode: 'view' | 'edit';
  onAdd?: () => void;
  onEdit?: (change: AmendmentChange) => void;
  onDelete?: (changeId: string) => void;
}

/* ── Helpers ───────────────────────────────────────── */

/** Small inline badge for the change category */
const CategoryChip: React.FC<{ category: string }> = ({ category }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 7px',
      borderRadius: 9999,
      fontSize: 10,
      fontWeight: 600,
      backgroundColor: 'var(--color-surface-sunken)',
      color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border)',
      whiteSpace: 'nowrap',
    }}
  >
    {category}
  </span>
);

/** Determines if old and new values differ so we know whether to style as changed */
function valuesChanged(oldVal: string | null, newVal: string | null): boolean {
  const a = (oldVal ?? '').trim();
  const b = (newVal ?? '').trim();
  return a !== b;
}

/* ── Component ─────────────────────────────────────── */

const ChangeRowsTable: React.FC<ChangeRowsTableProps> = ({
  changes,
  mode,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const isEdit = mode === 'edit';

  /* ── Empty state ────────────────────────────────── */

  if (changes.length === 0) {
    return (
      <div className="change-rows-empty">
        <Layers
          size={36}
          style={{ color: 'var(--color-text-disabled)', marginBottom: 8, opacity: 0.5 }}
        />
        <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4, fontSize: 14 }}>
          No change rows added yet.
        </div>
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 12, marginBottom: 14, maxWidth: 320 }}>
          Document the specific fields being changed, including old and new values, to maintain a clear audit trail.
        </div>
        {isEdit && onAdd && (
          <button
            className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-2"
            onClick={onAdd}
            type="button"
          >
            <Plus size={14} />
            Add Change Row
          </button>
        )}
      </div>
    );
  }

  /* ── Table ──────────────────────────────────────── */

  return (
    <div>
      <div className="change-rows-table-wrap">
        <table className="change-rows-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>Category</th>
              <th>Field</th>
              <th>Old Value</th>
              <th style={{ width: 30 }} />
              <th>New Value</th>
              <th>Reason</th>
              {isEdit && <th style={{ width: 72 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {changes.map((change, idx) => {
              const changed = valuesChanged(change.old_value, change.new_value);
              const oldVal = change.old_value ?? '';
              const newVal = change.new_value ?? '';

              return (
                <tr key={change.id || idx}>
                  {/* Row number */}
                  <td style={{ fontWeight: 600, color: 'var(--color-text-tertiary)', fontSize: 12 }}>
                    {idx + 1}
                  </td>

                  {/* Category */}
                  <td>
                    <CategoryChip category={change.change_category} />
                  </td>

                  {/* Field */}
                  <td className="change-rows-table__field">
                    {change.field_name}
                  </td>

                  {/* Old value */}
                  <td
                    className={changed && oldVal ? 'change-rows-table__old-value' : undefined}
                    style={!oldVal ? { color: 'var(--color-text-disabled)', fontStyle: 'italic', fontSize: 12 } : undefined}
                  >
                    {oldVal || '\u2014'}
                  </td>

                  {/* Arrow */}
                  <td className="change-rows-table__arrow" />

                  {/* New value */}
                  <td
                    className={changed && newVal ? 'change-rows-table__new-value' : undefined}
                    style={!newVal ? { color: 'var(--color-text-disabled)', fontStyle: 'italic', fontSize: 12 } : undefined}
                  >
                    {newVal || '\u2014'}
                  </td>

                  {/* Reason */}
                  <td style={{ fontSize: 12, color: 'var(--color-text-secondary)', maxWidth: 180 }}>
                    {change.change_reason || (
                      <span style={{ color: 'var(--color-text-disabled)', fontStyle: 'italic' }}>\u2014</span>
                    )}
                  </td>

                  {/* Actions */}
                  {isEdit && (
                    <td>
                      <div className="change-rows-table__actions">
                        {onEdit && (
                          <button
                            className="change-rows-table__action-btn"
                            title="Edit change"
                            onClick={() => onEdit(change)}
                            type="button"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            className="change-rows-table__action-btn change-rows-table__action-btn--danger"
                            title="Delete change"
                            onClick={() => onDelete(change.id)}
                            type="button"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add button below table (edit mode) */}
      {isEdit && onAdd && (
        <div style={{ marginTop: 10 }}>
          <button
            className="btn-secondary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5"
            onClick={onAdd}
            type="button"
          >
            <Plus size={13} />
            Add Change Row
          </button>
        </div>
      )}
    </div>
  );
};

export default ChangeRowsTable;
