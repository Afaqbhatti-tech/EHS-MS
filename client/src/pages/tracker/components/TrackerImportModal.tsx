import { useState, useRef } from 'react';
import { X as XIcon, Upload, Download, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { TRACKER_CATEGORIES } from '../../../config/trackerCategories';
import type { ImportResult, TrackerCategory } from '../hooks/useTracker';

interface Props {
  categories: TrackerCategory[];
  preselectedCategory: string;
  onImport: (file: File, categoryKey: string) => Promise<ImportResult>;
  onDownloadTemplate: (categoryKey: string) => void;
  onClose: () => void;
}

export function TrackerImportModal({ categories, preselectedCategory, onImport, onDownloadTemplate, onClose }: Props) {
  const [categoryKey, setCategoryKey] = useState(preselectedCategory || '');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const catConfig = categoryKey ? TRACKER_CATEGORIES.find(c => c.key === categoryKey) : null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file || !categoryKey) return;
    setImporting(true);
    setError(null);
    try {
      const res = await onImport(file, categoryKey);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[102] bg-surface border border-border rounded-[var(--radius-lg)] shadow-xl w-[520px] max-w-[90vw] max-h-[85vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-primary-600" />
            <h2 className="text-[16px] font-bold text-text-primary">Bulk Import Equipment</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-5">
          {/* Success result */}
          {result && (
            <div className={`p-4 rounded-[var(--radius-md)] border ${result.failed > 0 ? 'bg-warning-50 border-warning-200' : 'bg-success-50 border-success-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className={result.failed > 0 ? 'text-warning-600' : 'text-success-600'} />
                <span className="text-[14px] font-semibold text-text-primary">Import Complete</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center mb-3">
                <div>
                  <div className="text-[18px] font-bold text-text-primary">{result.total_rows}</div>
                  <div className="text-[11px] text-text-tertiary">Total Rows</div>
                </div>
                <div>
                  <div className="text-[18px] font-bold text-success-600">{result.success}</div>
                  <div className="text-[11px] text-text-tertiary">Imported</div>
                </div>
                <div>
                  <div className="text-[18px] font-bold text-danger-600">{result.failed}</div>
                  <div className="text-[11px] text-text-tertiary">Failed</div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-[160px] overflow-y-auto">
                  <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">Errors</p>
                  <div className="space-y-1">
                    {result.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px]">
                        <span className="text-danger-600 font-mono shrink-0">Row {err.row}:</span>
                        <span className="text-text-secondary">{err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <button onClick={onClose} className="px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors">
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Import form */}
          {!result && (
            <>
              {error && (
                <div className="p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] flex items-start gap-2">
                  <AlertTriangle size={14} className="text-danger-600 mt-0.5 shrink-0" />
                  <span className="text-[13px] text-danger-700">{error}</span>
                </div>
              )}

              {/* Category selection */}
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary mb-1">
                  Category <span className="text-danger-500">*</span>
                </label>
                <select value={categoryKey} onChange={e => { setCategoryKey(e.target.value); setFile(null); setError(null); }}
                  className="w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all">
                  <option value="">Select a category...</option>
                  {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>

              {/* Template download */}
              {categoryKey && (
                <div className="p-3 bg-surface-sunken rounded-[var(--radius-md)] border border-border">
                  <p className="text-[12px] text-text-secondary mb-2">
                    Download the Excel template for <strong>{catConfig?.label || categoryKey}</strong>, fill in your data, then upload it below.
                  </p>
                  <button onClick={() => onDownloadTemplate(categoryKey)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-primary-600 bg-primary-50 rounded-[var(--radius-md)] hover:bg-primary-100 transition-colors">
                    <Download size={14} />
                    Download Template
                  </button>
                </div>
              )}

              {/* File upload */}
              {categoryKey && (
                <div>
                  <label className="block text-[12px] font-semibold text-text-secondary mb-1">
                    Upload File <span className="text-danger-500">*</span>
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-[var(--radius-md)] p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all"
                  >
                    <Upload size={24} className="mx-auto text-text-tertiary mb-2" />
                    {file ? (
                      <div>
                        <p className="text-[13px] font-medium text-text-primary">{file.name}</p>
                        <p className="text-[11px] text-text-tertiary mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[13px] text-text-secondary">Click to select file</p>
                        <p className="text-[11px] text-text-tertiary mt-0.5">Accepts .xlsx, .csv, and .pptx files</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept=".xlsx,.csv,.pptx,.ppt" onChange={handleFileSelect} className="hidden" />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">
                  Cancel
                </button>
                <button onClick={handleImport} disabled={importing || !file || !categoryKey}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-xs">
                  <Upload size={14} />
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
