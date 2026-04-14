import { useState, useRef, useCallback } from 'react';
import {
  Upload, X as XIcon, FileSpreadsheet, FileText, FileType2, Table2, Presentation,
  Download, CheckCircle2, AlertCircle, Info, Loader2,
  FileUp, AlertTriangle, Clock,
} from 'lucide-react';
import { api } from '../../../services/api';

interface ImportError {
  row: number;
  error: string;
}

interface ImportSummary {
  total_parsed: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  errors: ImportError[];
  field_mapping: Record<string, string>;
}

interface ImportResult {
  message: string;
  batch_id: string;
  summary: ImportSummary;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<ImportResult>;
  onRefresh: () => void;
}

const SUPPORTED_FORMATS = [
  { ext: '.xlsx', label: 'Excel', icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50', accept: '.xlsx,.xls' },
  { ext: '.csv', label: 'CSV', icon: Table2, color: 'text-teal-600', bg: 'bg-teal-50', accept: '.csv' },
  { ext: '.docx', label: 'Word', icon: FileType2, color: 'text-blue-600', bg: 'bg-blue-50', accept: '.docx' },
  { ext: '.pptx', label: 'PowerPoint', icon: Presentation, color: 'text-orange-600', bg: 'bg-orange-50', accept: '.pptx,.ppt' },
  { ext: '.pdf', label: 'PDF', icon: FileText, color: 'text-red-600', bg: 'bg-red-50', accept: '.pdf' },
  { ext: '.txt', label: 'Text', icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', accept: '.txt' },
];

const ALL_ACCEPTS = SUPPORTED_FORMATS.map(f => f.accept).join(',');
const VALID_EXTENSIONS = SUPPORTED_FORMATS.flatMap(f => f.accept.split(',').map(a => a.replace('.', '')));

type Step = 'upload' | 'importing' | 'result';

export function ImportMockupModal({ open, onClose, onImport, onRefresh }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setShowAllErrors(false);
  }, []);

  const handleClose = () => {
    if (step === 'importing') return; // prevent close during import
    if (result && result.summary.success_count > 0) {
      onRefresh();
    }
    reset();
    onClose();
  };

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !VALID_EXTENSIONS.includes(ext)) {
      return `Unsupported file format ".${ext}". Supported: ${VALID_EXTENSIONS.map(e => '.' + e).join(', ')}`;
    }
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return 'File size exceeds 20MB limit.';
    }
    if (file.size === 0) {
      return 'File is empty.';
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleBrowse = (accept?: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept || ALL_ACCEPTS;
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    if (e.target) e.target.value = '';
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setStep('importing');
    setError(null);
    try {
      const res = await onImport(selectedFile);
      setResult(res);
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setStep('upload');
    }
  };

  const handleDownloadTemplate = () => {
    api.download('/mockups/import/template?format=xlsx');
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const format = SUPPORTED_FORMATS.find(f => f.accept.includes('.' + ext));
    if (format) {
      const Icon = format.icon;
      return <Icon size={20} className={format.color} />;
    }
    return <FileUp size={20} className="text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface rounded-[var(--radius-lg)] shadow-2xl border border-border overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-text-primary">Import Mockups</h2>
            <p className="text-[12px] text-text-secondary mt-0.5">
              Upload a file to import mockup records into the register
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={step === 'importing'}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-sunken rounded-[var(--radius-sm)] transition-colors disabled:opacity-50"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5">
          {/* ─── UPLOAD STEP ─── */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Format chips */}
              <div>
                <label className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-2 block">
                  Supported Formats
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_FORMATS.map(fmt => {
                    const Icon = fmt.icon;
                    return (
                      <button
                        key={fmt.ext}
                        onClick={() => handleBrowse(fmt.accept)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-full border border-border hover:border-primary-300 hover:bg-primary-50 transition-all cursor-pointer ${fmt.bg}`}
                      >
                        <Icon size={13} className={fmt.color} />
                        {fmt.label}
                        <span className="text-text-tertiary">({fmt.ext})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-[var(--radius-lg)] p-8 text-center transition-all ${
                  dragOver
                    ? 'border-primary-400 bg-primary-50'
                    : selectedFile
                    ? 'border-green-300 bg-green-50/50'
                    : 'border-border hover:border-primary-300 hover:bg-surface-sunken/50'
                }`}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] bg-white border border-border shadow-xs">
                      {getFileIcon(selectedFile.name)}
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-semibold text-text-primary">{selectedFile.name}</p>
                      <p className="text-[11px] text-text-tertiary">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      className="ml-2 p-1 text-text-tertiary hover:text-danger-600 hover:bg-danger-50 rounded-full transition-colors"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-primary-500' : 'text-text-tertiary'}`} />
                    <p className="text-[13px] font-medium text-text-primary mb-1">
                      Drag & drop your file here
                    </p>
                    <p className="text-[12px] text-text-tertiary mb-3">or</p>
                    <button
                      onClick={() => handleBrowse()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs"
                    >
                      <FileUp size={14} />
                      Browse Files
                    </button>
                  </>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)]">
                  <AlertCircle size={16} className="text-danger-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-danger-700">{error}</p>
                </div>
              )}

              {/* Template download */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-[var(--radius-md)]">
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div className="text-[12px] text-blue-700">
                  <p className="font-medium mb-1">For best results, use the import template</p>
                  <p className="text-blue-600 mb-2">
                    The template includes correct column headers for automatic field mapping. The system maps statuses like
                    Open, In Progress, Closed to the register's workflow states.
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-blue-700 bg-blue-100 rounded-[var(--radius-md)] hover:bg-blue-200 transition-colors"
                  >
                    <Download size={12} />
                    Download Template (.xlsx)
                  </button>
                </div>
              </div>

              {/* Status mapping info */}
              <details className="group">
                <summary className="flex items-center gap-1.5 text-[12px] font-medium text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
                  <Info size={13} />
                  Status & field mapping reference
                </summary>
                <div className="mt-2 p-3 bg-surface-sunken border border-border rounded-[var(--radius-md)] text-[11px] text-text-secondary space-y-2">
                  <div>
                    <span className="font-semibold text-text-primary">Status Mapping:</span>
                    <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
                      <span>Open, New, Pending, Not Started</span><span className="font-medium">→ Draft</span>
                      <span>In Progress, Ongoing, Under Review</span><span className="font-medium">→ Submitted for Review</span>
                      <span>Closed, Done, Completed, Approved</span><span className="font-medium">→ Approved</span>
                      <span>Rejected, Declined, Cancelled</span><span className="font-medium">→ Rejected</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-text-primary">Column Headers Recognized:</span>
                    <p className="mt-0.5">Activity Name/Title, Description, Status, Area, Zone, Phase, Contractor, Supervisor/Assigned To, Priority, Procedure Type, Start Date, End Date, Notes/Remarks</p>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* ─── IMPORTING STEP ─── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={40} className="text-primary-500 animate-spin mb-4" />
              <p className="text-[14px] font-semibold text-text-primary mb-1">Importing...</p>
              <p className="text-[12px] text-text-secondary">
                Parsing {selectedFile?.name} and creating mockup records
              </p>
            </div>
          )}

          {/* ─── RESULT STEP ─── */}
          {step === 'result' && result && (
            <div className="space-y-4">
              {/* Summary header */}
              <div className={`flex items-start gap-3 p-4 rounded-[var(--radius-md)] border ${
                result.summary.success_count > 0 && result.summary.failed_count === 0
                  ? 'bg-green-50 border-green-100'
                  : result.summary.success_count > 0
                  ? 'bg-amber-50 border-amber-100'
                  : 'bg-danger-50 border-danger-100'
              }`}>
                {result.summary.success_count > 0 && result.summary.failed_count === 0 ? (
                  <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
                ) : result.summary.success_count > 0 ? (
                  <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={20} className="text-danger-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">{result.message}</p>
                  <p className="text-[12px] text-text-secondary mt-0.5">
                    From file: {selectedFile?.name}
                  </p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 bg-surface-sunken rounded-[var(--radius-md)] border border-border">
                  <p className="text-[18px] font-bold text-text-primary">{result.summary.total_parsed}</p>
                  <p className="text-[11px] text-text-secondary font-medium">Total Parsed</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-[var(--radius-md)] border border-green-100">
                  <p className="text-[18px] font-bold text-green-700">{result.summary.success_count}</p>
                  <p className="text-[11px] text-green-600 font-medium">Created</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-[var(--radius-md)] border border-amber-100">
                  <p className="text-[18px] font-bold text-amber-700">{result.summary.skipped_count}</p>
                  <p className="text-[11px] text-amber-600 font-medium">Skipped</p>
                </div>
                <div className="text-center p-3 bg-danger-50 rounded-[var(--radius-md)] border border-danger-100">
                  <p className="text-[18px] font-bold text-danger-700">{result.summary.failed_count}</p>
                  <p className="text-[11px] text-danger-600 font-medium">Failed</p>
                </div>
              </div>

              {/* Field mapping used */}
              {result.summary.field_mapping && Object.keys(result.summary.field_mapping).length > 0 && (
                <details className="group">
                  <summary className="flex items-center gap-1.5 text-[12px] font-medium text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
                    <Info size={13} />
                    Field mapping applied ({Object.keys(result.summary.field_mapping).length} fields matched)
                  </summary>
                  <div className="mt-2 p-3 bg-surface-sunken border border-border rounded-[var(--radius-md)]">
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      {Object.entries(result.summary.field_mapping).map(([field, header]) => (
                        <div key={field} className="flex items-center gap-1">
                          <span className="text-text-tertiary">{header}</span>
                          <span className="text-text-tertiary">→</span>
                          <span className="font-medium text-text-primary">{field}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}

              {/* Errors list */}
              {result.summary.errors.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={13} />
                    Issues ({result.summary.errors.length})
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {(showAllErrors ? result.summary.errors : result.summary.errors.slice(0, 10)).map((err, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-surface-sunken rounded-[var(--radius-sm)] text-[11px]">
                        {err.row > 0 && (
                          <span className="shrink-0 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-mono font-medium">
                            Row {err.row}
                          </span>
                        )}
                        <span className="text-text-secondary">{err.error}</span>
                      </div>
                    ))}
                    {!showAllErrors && result.summary.errors.length > 10 && (
                      <button
                        onClick={() => setShowAllErrors(true)}
                        className="text-[11px] text-primary-600 font-medium hover:underline"
                      >
                        Show all {result.summary.errors.length} issues...
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-surface-sunken/50 shrink-0">
          {step === 'upload' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-[12px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedFile}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-[12px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <Upload size={14} />
                Import File
              </button>
            </>
          )}
          {step === 'importing' && (
            <div className="w-full text-center">
              <p className="text-[12px] text-text-tertiary flex items-center justify-center gap-1.5">
                <Clock size={13} />
                Please wait while the file is being processed...
              </p>
            </div>
          )}
          {step === 'result' && (
            <>
              <button
                onClick={reset}
                className="px-4 py-2 text-[12px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
              >
                Import Another
              </button>
              <button
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-[12px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors shadow-xs"
              >
                <CheckCircle2 size={14} />
                Done
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ALL_ACCEPTS}
        onChange={handleInputChange}
      />
    </div>
  );
}
