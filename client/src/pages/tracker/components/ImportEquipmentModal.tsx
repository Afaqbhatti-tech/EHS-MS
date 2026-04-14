import { useState, useRef, useCallback } from 'react';
import { X as XIcon, Upload, FileSpreadsheet, Check, AlertTriangle, ArrowRight, ArrowLeft, ChevronDown } from 'lucide-react';
import type { ImportPreview } from '../hooks/useEquipmentGroups';

interface Props {
  categoryId: number;
  categoryName: string;
  onImportPreview: (file: File, categoryId: number) => Promise<ImportPreview>;
  onImportConfirm: (file: File, categoryId: number, mappings: Array<{ system_field: string; file_column: string }>) => Promise<unknown>;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'done';

export function ImportEquipmentModal({ categoryId, categoryName, onImportPreview, onImportConfirm, onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  // Step 1: Upload file and get preview
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError('');
    setLoading(true);
    try {
      const result = await onImportPreview(selectedFile, categoryId);
      setPreview(result);

      // Initialize mappings from auto-detected ones
      const initialMappings: Record<string, string> = {};
      result.mappings.forEach(m => {
        if (m.file_column) {
          initialMappings[m.system_field.key] = m.file_column;
        }
      });
      setMappings(initialMappings);
      setStep('mapping');
    } catch (err: any) {
      setError(err?.message || 'Failed to parse file. Please check the format.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      handleFileSelect(droppedFile);
    } else {
      setError('Please upload a CSV or Excel file');
    }
  }, [categoryId]);

  // Step 2: Update mapping
  const handleMappingChange = (systemField: string, fileColumn: string) => {
    setMappings(prev => {
      const next = { ...prev };
      if (fileColumn) next[systemField] = fileColumn;
      else delete next[systemField];
      return next;
    });
  };

  // Validate mappings: required fields must be mapped
  const requiredFields = preview?.system_fields.filter(f => f.required) || [];
  const unmappedRequired = requiredFields.filter(f => !mappings[f.key]);

  // Step 3: Confirm import
  const handleConfirmImport = async () => {
    if (!file || !preview) return;

    setStep('importing');
    setError('');
    try {
      const mappingArray = Object.entries(mappings).map(([system_field, file_column]) => ({
        system_field,
        file_column,
      }));

      const result = await onImportConfirm(file, categoryId, mappingArray) as any;
      setImportResult({
        imported: result?.imported ?? result?.data?.imported ?? 0,
        skipped: result?.skipped ?? result?.data?.skipped ?? 0,
        errors: result?.errors ?? result?.data?.errors ?? [],
      });
      setStep('done');
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Import failed');
      setStep('preview');
    }
  };

  const inputCls = 'w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-xl w-full max-w-[680px] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-fadeInUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">Import Equipment</h2>
            <p className="text-[12px] text-text-tertiary mt-0.5">
              Import items into: <span className="font-semibold text-text-secondary">{categoryName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={step === 'importing'}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-sunken rounded-[var(--radius-md)] transition-colors disabled:opacity-50"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-surface-sunken">
          {(['upload', 'mapping', 'preview'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ArrowRight size={12} className="text-text-tertiary" />}
              <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${
                step === s ? 'bg-primary-100 text-primary-700' :
                ['mapping', 'preview', 'importing', 'done'].indexOf(step) > ['upload', 'mapping', 'preview'].indexOf(s)
                  ? 'text-green-600'
                  : 'text-text-tertiary'
              }`}>
                {i + 1}. {s === 'upload' ? 'Upload' : s === 'mapping' ? 'Map Columns' : 'Preview & Import'}
              </span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="px-6 py-5">
            {error && (
              <div className="mb-4 p-3 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[var(--radius-md)] flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Upload */}
            {step === 'upload' && (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-border rounded-[var(--radius-lg)] p-10 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    <p className="text-[14px] text-text-secondary">Analyzing file...</p>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet size={40} className="mx-auto mb-3 text-text-tertiary" />
                    <h3 className="text-[15px] font-semibold text-text-primary mb-1">
                      Drop your file here
                    </h3>
                    <p className="text-[13px] text-text-tertiary mb-4">
                      Supports CSV and Excel files (.csv, .xlsx, .xls)
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelect(f);
                        e.target.value = '';
                      }}
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs"
                    >
                      <Upload size={16} />
                      Choose File
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Column Mapping */}
            {step === 'mapping' && preview && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-[var(--radius-md)] text-[12px] text-blue-700">
                  <strong>{preview.total_rows}</strong> rows found in <strong>{file?.name}</strong>.
                  Map your file columns to system fields below. Auto-detected mappings are pre-selected.
                </div>

                <div className="space-y-3">
                  {preview.system_fields.map(sf => {
                    const currentMapping = mappings[sf.key] || '';
                    const autoMapping = preview.mappings.find(m => m.system_field.key === sf.key);
                    const confidence = autoMapping?.confidence ?? 0;

                    return (
                      <div key={sf.key} className="flex items-center gap-3">
                        <div className="w-[200px] shrink-0">
                          <span className="text-[13px] font-medium text-text-primary">{sf.label}</span>
                          {sf.required && <span className="text-red-500 ml-0.5 text-[11px]">*</span>}
                        </div>
                        <ArrowLeft size={14} className="text-text-tertiary shrink-0" />
                        <div className="flex-1 relative">
                          <select
                            className={inputCls}
                            value={currentMapping}
                            onChange={e => handleMappingChange(sf.key, e.target.value)}
                          >
                            <option value="">— Skip —</option>
                            {preview.file_columns.map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                          {confidence > 0.7 && currentMapping && (
                            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                              Auto
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {unmappedRequired.length > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-[var(--radius-md)] text-[12px] text-yellow-700">
                    <AlertTriangle size={12} className="inline mr-1" />
                    Required fields not mapped: {unmappedRequired.map(f => f.label).join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Preview */}
            {step === 'preview' && preview && (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-[var(--radius-md)] text-[12px] text-green-700">
                  Ready to import <strong>{preview.total_rows}</strong> items with{' '}
                  <strong>{Object.keys(mappings).length}</strong> mapped fields.
                </div>

                {/* Preview table */}
                <div className="border border-border rounded-[var(--radius-md)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-surface-sunken border-b border-border">
                          {Object.entries(mappings).map(([sysField, fileCol]) => {
                            const sf = preview.system_fields.find(f => f.key === sysField);
                            return (
                              <th key={sysField} className="text-left px-3 py-2 text-[11px] font-bold text-text-tertiary uppercase tracking-wider whitespace-nowrap">
                                {sf?.label || sysField}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.preview_rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-border">
                            {Object.entries(mappings).map(([sysField, fileCol]) => (
                              <td key={sysField} className="px-3 py-2 text-text-secondary whitespace-nowrap max-w-[200px] truncate">
                                {row[fileCol] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.total_rows > 5 && (
                    <div className="px-3 py-2 text-[11px] text-text-tertiary bg-surface-sunken border-t border-border">
                      Showing first 5 of {preview.total_rows} rows
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Importing */}
            {step === 'importing' && (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="w-12 h-12 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                <p className="text-[14px] font-medium text-text-primary">Importing items...</p>
                <p className="text-[13px] text-text-tertiary">This may take a moment for large files.</p>
              </div>
            )}

            {/* Done */}
            {step === 'done' && importResult && (
              <div className="space-y-4 py-4">
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-3 bg-green-50 rounded-full flex items-center justify-center">
                    <Check size={28} className="text-green-600" />
                  </div>
                  <h3 className="text-[16px] font-bold text-text-primary mb-1">Import Complete</h3>
                  <p className="text-[13px] text-text-tertiary">
                    Successfully imported <strong className="text-green-600">{importResult.imported}</strong> items
                    {importResult.skipped > 0 && (
                      <>, <strong className="text-yellow-600">{importResult.skipped}</strong> skipped</>
                    )}
                  </p>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-[var(--radius-md)]">
                    <p className="text-[12px] font-semibold text-yellow-700 mb-1">Warnings:</p>
                    <ul className="text-[11px] text-yellow-600 space-y-0.5 max-h-[120px] overflow-y-auto">
                      {importResult.errors.slice(0, 20).map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                      {importResult.errors.length > 20 && (
                        <li className="font-medium">...and {importResult.errors.length - 20} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <div>
            {step === 'mapping' && (
              <button
                onClick={() => { setStep('upload'); setFile(null); setPreview(null); setError(''); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={() => setStep('mapping')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step !== 'importing' && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
              >
                {step === 'done' ? 'Close' : 'Cancel'}
              </button>
            )}

            {step === 'mapping' && (
              <button
                onClick={() => setStep('preview')}
                disabled={unmappedRequired.length > 0 || Object.keys(mappings).length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                Preview
                <ArrowRight size={14} />
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-green-600 rounded-[var(--radius-md)] hover:bg-green-700 transition-colors"
              >
                <Upload size={14} />
                Confirm Import
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
