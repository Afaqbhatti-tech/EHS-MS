import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Upload, FileText, Table, FileSpreadsheet, Presentation, File, CheckCircle2,
  AlertTriangle, XCircle, Clock, ChevronDown, ChevronUp, Trash2, Eye,
  Loader2, Info, ArrowRight, RotateCcw, History
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';

// ─── Types ────────────────────────────────────
interface ImportItem {
  id: string;
  target_module: string;
  target_model: string;
  target_record_id: string | null;
  action: string;
  section_heading: string | null;
  mapped_fields: Record<string, unknown>;
  confidence: number;
  status: string;
  duplicate_of: string | null;
  warnings: string[] | null;
  error_message: string | null;
}

interface ModuleGroup {
  module: string;
  module_label: string;
  records: ImportItem[];
  total: number;
}

interface InformationalSlide {
  heading: string;
  slide_title?: string;
  content_preview?: string;
  slide_type: string;
  label: string;
  source_slide_no: number;
  action: string;
}

interface PreviewData {
  import_id: string;
  original_name: string;
  document_type: string;
  classification: Record<string, number>;
  total_items: number;
  modules: ModuleGroup[];
  warnings: string[];
  metadata: Record<string, unknown>;
  informational_slides?: InformationalSlide[];
  informational_count?: number;
  is_weekly_meeting?: boolean;
}

interface ImportRecord {
  id: string;
  original_name: string;
  file_type: string;
  file_size: number;
  status: string;
  document_type: string;
  classification: Record<string, number>;
  total_sections: number;
  total_records_created: number;
  total_warnings: number;
  warnings: string[];
  errors: string[] | null;
  import_summary: { created: unknown[]; skipped: unknown[]; failed: unknown[]; informational?: InformationalSlide[] } | null;
  imported_by_name: string;
  processing_time_ms: number;
  confirmed_at: string | null;
  created_at: string;
  items?: ImportItem[];
  extracted_data?: {
    informational_slides?: InformationalSlide[];
    informational_count?: number;
    is_weekly_meeting?: boolean;
  };
}

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt';
const MAX_SIZE_MB = 20;

const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText, doc: FileText, docx: FileText,
  xls: Table, xlsx: FileSpreadsheet, csv: Table,
  ppt: Presentation, pptx: Presentation, txt: File,
};

const MODULE_COLORS: Record<string, string> = {
  mom: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  training: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  permits: 'bg-amber-50 text-amber-700 border-amber-200',
  observations: 'bg-blue-50 text-blue-700 border-blue-200',
  mockups: 'bg-violet-50 text-violet-700 border-violet-200',
  checklists: 'bg-teal-50 text-teal-700 border-teal-200',
  tracker: 'bg-orange-50 text-orange-700 border-orange-200',
  manpower: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  incidents: 'bg-red-50 text-red-700 border-red-200',
  reports: 'bg-gray-50 text-gray-700 border-gray-200',
};

// ─── Helpers ─────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function confidenceColor(c: number): string {
  if (c >= 0.8) return 'text-emerald-600';
  if (c >= 0.5) return 'text-amber-600';
  return 'text-red-500';
}

function getStatusIcon(status: string) {
  if (status === 'confirmed') return <CheckCircle2 size={16} className="text-emerald-500" />;
  if (status === 'analyzed') return <Eye size={16} className="text-blue-500" />;
  if (status === 'processing') return <Loader2 size={16} className="text-amber-500 animate-spin" />;
  if (status === 'failed') return <XCircle size={16} className="text-red-500" />;
  return <Clock size={16} className="text-gray-400" />;
}

// ─── Page Component ─────────────────────────────
export default function DocumentImportPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Import data
  const [currentImport, setCurrentImport] = useState<ImportRecord | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [skipItems, setSkipItems] = useState<Set<string>>(new Set());

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Expanded modules
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Detail modal
  const [detailItem, setDetailItem] = useState<ImportItem | null>(null);

  // Permission check
  if (!hasPermission('can_import_documents')) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <XCircle size={48} className="mx-auto text-red-300 mb-3" />
          <p className="text-text-secondary">You don't have permission to import documents.</p>
        </div>
      </div>
    );
  }

  // ─── File handling ────────────────────────────
  const handleFile = useCallback((file: File) => {
    setError(null);
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragActive(false), []);

  // ─── Upload & Analyze ─────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const data = await api.uploadForm<{ success: boolean; message?: string; data: { import: ImportRecord; preview: PreviewData } }>('/imports/upload', formData);
      if (!data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      setCurrentImport(data.data.import);
      setPreview(data.data.preview);
      setSkipItems(new Set());
      setStep('preview');
      // Auto-expand all modules
      setExpandedModules(new Set(data.data.preview.modules.map((m: ModuleGroup) => m.module)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ─── Confirm import ───────────────────────────
  const handleConfirm = async () => {
    if (!currentImport) return;
    setConfirming(true);
    setError(null);

    try {
      const data = await api.post<{ success: boolean; message?: string; data: { import: ImportRecord } }>(`/imports/${currentImport.id}/confirm`, { skip_items: Array.from(skipItems) });
      if (!data.success) {
        throw new Error(data.message || 'Confirm failed');
      }

      setCurrentImport(data.data.import);
      setStep('result');
      toast.success('Import confirmed — records have been created');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Confirm failed');
    } finally {
      setConfirming(false);
    }
  };

  // ─── Load history ─────────────────────────────
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.get<{ success: boolean; data: ImportRecord[] }>('/imports');
      if (data.success) setHistory(data.data);
    } catch (err) {
      console.error('Failed to load import history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ─── Toggle item skip ────────────────────────
  const toggleSkip = (itemId: string) => {
    setSkipItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // ─── Toggle module expand ─────────────────────
  const toggleModule = (module: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  // ─── Reset to upload ─────────────────────────
  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setCurrentImport(null);
    setPreview(null);
    setError(null);
    setSkipItems(new Set());
  };

  // ─── Render ────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary">Document Import</h1>
          <p className="text-[13px] text-text-secondary mt-0.5">
            Upload and analyze documents to automatically extract data into application modules
          </p>
        </div>
        <button
          onClick={() => { setShowHistory(true); loadHistory(); }}
          className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
        >
          <History size={16} />
          Import History
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-[var(--radius-md)] flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-medium text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
          {/* Drag-drop zone */}
          <div
            className={`p-8 sm:p-12 border-2 border-dashed rounded-[var(--radius-lg)] m-4 transition-colors cursor-pointer ${
              dragActive
                ? 'border-primary-500 bg-primary-500/5'
                : 'border-border hover:border-primary-400 hover:bg-primary-500/[0.02]'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary-500/10 flex items-center justify-center mb-4">
                <Upload size={28} className="text-primary-600" />
              </div>
              <h3 className="text-[16px] font-semibold text-text-primary mb-1">
                {selectedFile ? selectedFile.name : 'Drop your file here or click to browse'}
              </h3>
              {selectedFile ? (
                <p className="text-[13px] text-text-secondary">
                  {selectedFile.type || selectedFile.name.split('.').pop()?.toUpperCase()} &middot; {formatBytes(selectedFile.size)}
                </p>
              ) : (
                <p className="text-[13px] text-text-secondary">
                  PDF, Word, Excel, CSV, PowerPoint, or Text &middot; Max {MAX_SIZE_MB}MB
                </p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {/* Supported formats */}
          <div className="px-4 sm:px-6 pb-4">
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {['PDF', 'DOCX', 'DOC', 'XLSX', 'XLS', 'CSV', 'PPTX', 'TXT'].map(ext => (
                <span key={ext} className="px-2.5 py-1 bg-surface-sunken text-text-tertiary text-[11px] font-medium rounded-full border border-border">
                  .{ext.toLowerCase()}
                </span>
              ))}
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-100 rounded-[var(--radius-md)] px-4 py-3 flex gap-3">
              <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <div className="text-[12px] text-blue-700 space-y-1">
                <p className="font-medium">How it works</p>
                <p>The system will analyze your document structure, detect sections (MOM points, training records, permits, observations, etc.), and map them to the correct application modules. You'll get a preview before any data is saved.</p>
              </div>
            </div>
          </div>

          {/* Action */}
          {selectedFile && (
            <div className="px-4 sm:px-6 py-4 border-t border-border flex items-center justify-between">
              <button
                onClick={() => setSelectedFile(null)}
                className="text-[13px] text-text-secondary hover:text-text-primary"
              >
                Clear selection
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-[13px] font-medium rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Analyzing document...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload &amp; Analyze
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="bg-surface border border-border rounded-[var(--radius-lg)] px-4 sm:px-6 py-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-[15px] font-semibold text-text-primary flex items-center gap-2">
                  <FileText size={18} className="text-primary-500" />
                  {preview.original_name}
                </h3>
                <p className="text-[12px] text-text-secondary mt-0.5">
                  Detected as: <span className="font-medium text-text-primary">{(preview.document_type || 'unknown').replace(/_/g, ' ')}</span>
                  {currentImport?.processing_time_ms && (
                    <> &middot; Processed in {currentImport.processing_time_ms}ms</>
                  )}
                </p>
              </div>
              <button onClick={handleReset} className="text-[12px] text-text-tertiary hover:text-text-primary flex items-center gap-1">
                <RotateCcw size={14} />
                Start over
              </button>
            </div>

            {/* Module classification scores */}
            {preview.classification && Object.keys(preview.classification).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(preview.classification)
                  .sort(([, a], [, b]) => b - a)
                  .map(([mod, score]) => (
                    <span
                      key={mod}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${MODULE_COLORS[mod] || 'bg-gray-50 text-gray-700 border-gray-200'}`}
                    >
                      {mod.replace(/_/g, ' ')} {Math.round(score * 100)}%
                    </span>
                  ))}
              </div>
            )}

            {/* Stats bar */}
            <div className="flex items-center gap-4 text-[12px] flex-wrap">
              <span className="text-emerald-600 font-medium">{preview.total_items} records extracted</span>
              <span className="text-text-tertiary">{preview.modules.length} modules detected</span>
              {(preview.informational_count ?? 0) > 0 && (
                <span className="text-blue-600">{preview.informational_count} informational slides (ignored)</span>
              )}
              {(preview.warnings?.length ?? 0) > 0 && (
                <span className="text-amber-600">{preview.warnings.length} warnings</span>
              )}
              {preview.is_weekly_meeting && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-full border border-indigo-200">
                  <Presentation size={12} /> Weekly EHS Meeting
                </span>
              )}
            </div>
          </div>

          {/* Extracted metadata */}
          {preview.metadata && Object.keys(preview.metadata).length > 0 && (
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] px-4 sm:px-6 py-3">
              <h4 className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Extracted Metadata</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                {Object.entries(preview.metadata).map(([key, value]) => (
                  <div key={key} className="text-[12px]">
                    <span className="text-text-tertiary">{key.replace(/_/g, ' ')}: </span>
                    <span className="text-text-primary font-medium">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Module groups */}
          {preview.modules.map(group => {
            const isExpanded = expandedModules.has(group.module);
            const skippedInGroup = group.records.filter(r => skipItems.has(r.id)).length;

            return (
              <div key={group.module} className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
                <button
                  className="w-full px-4 sm:px-6 py-3 flex items-center justify-between hover:bg-surface-sunken/50 transition-colors"
                  onClick={() => toggleModule(group.module)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${MODULE_COLORS[group.module] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                      {group.module_label}
                    </span>
                    <span className="text-[13px] text-text-secondary">
                      {group.total} record{group.total !== 1 ? 's' : ''}
                      {skippedInGroup > 0 && <span className="text-amber-500 ml-1">({skippedInGroup} skipped)</span>}
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-text-tertiary" /> : <ChevronDown size={16} className="text-text-tertiary" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="bg-surface-sunken/50">
                            <th className="px-4 py-2 text-left font-medium text-text-tertiary uppercase tracking-wider w-8">
                              <input
                                type="checkbox"
                                checked={group.records.every(r => !skipItems.has(r.id))}
                                onChange={() => {
                                  const allSelected = group.records.every(r => !skipItems.has(r.id));
                                  setSkipItems(prev => {
                                    const next = new Set(prev);
                                    group.records.forEach(r => allSelected ? next.add(r.id) : next.delete(r.id));
                                    return next;
                                  });
                                }}
                                className="rounded accent-primary-600"
                              />
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-text-tertiary uppercase tracking-wider">Content</th>
                            <th className="px-3 py-2 text-left font-medium text-text-tertiary uppercase tracking-wider">Status</th>
                            <th className="px-3 py-2 text-left font-medium text-text-tertiary uppercase tracking-wider">Confidence</th>
                            <th className="px-3 py-2 text-left font-medium text-text-tertiary uppercase tracking-wider">Flags</th>
                            <th className="px-3 py-2 text-right font-medium text-text-tertiary uppercase tracking-wider w-16">View</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {group.records.map(item => {
                            const isSkipped = skipItems.has(item.id);
                            const fields = item.mapped_fields || {};
                            const displayText = (fields.title || fields.description || fields.name || fields.work_description || fields.equipment_name || 'Untitled') as string;

                            return (
                              <tr key={item.id} className={isSkipped ? 'opacity-40' : 'hover:bg-surface-sunken/30'}>
                                <td className="px-4 py-2.5">
                                  <input
                                    type="checkbox"
                                    checked={!isSkipped}
                                    onChange={() => toggleSkip(item.id)}
                                    className="rounded accent-primary-600"
                                  />
                                </td>
                                <td className="px-3 py-2.5 max-w-[300px]">
                                  <p className="text-text-primary font-medium truncate">{String(displayText).substring(0, 120)}</p>
                                  {item.section_heading && (
                                    <p className="text-text-tertiary text-[11px] truncate mt-0.5">From: {item.section_heading}</p>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  {fields.status ? (
                                    <StatusBadge status={fields.status as string} />
                                  ) : (
                                    <span className="text-text-tertiary">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className={`font-medium ${confidenceColor(item.confidence)}`}>
                                    {Math.round(item.confidence * 100)}%
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  {item.duplicate_of && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded-full border border-amber-200">
                                      <AlertTriangle size={10} /> Duplicate?
                                    </span>
                                  )}
                                  {item.warnings && item.warnings.length > 0 && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded-full border border-amber-200 ml-1">
                                      <AlertTriangle size={10} /> Warning
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <button
                                    onClick={() => setDetailItem(item)}
                                    className="p-1 text-text-tertiary hover:text-primary-600 transition-colors"
                                  >
                                    <Eye size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Informational slides (not errors) */}
          {preview.informational_slides && preview.informational_slides.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-[var(--radius-lg)] px-4 sm:px-6 py-3">
              <h4 className="text-[12px] font-semibold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Info size={14} /> Ignored Informational Slides ({preview.informational_slides.length})
              </h4>
              <ul className="space-y-1">
                {preview.informational_slides.map((slide, i) => (
                  <li key={i} className="text-[12px] text-blue-700 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-full shrink-0">
                      {slide.source_slide_no}
                    </span>
                    <span className="font-medium">{slide.label}</span>
                    {slide.slide_title && <span className="text-blue-500">&mdash; {slide.slide_title}</span>}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-blue-500 mt-2 italic">
                These slides contain title/header or closing content and are intentionally excluded from data import.
              </p>
            </div>
          )}

          {/* Warnings (only true unmapped content) */}
          {preview.warnings && preview.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] px-4 sm:px-6 py-3">
              <h4 className="text-[12px] font-semibold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Warnings
              </h4>
              <ul className="space-y-1">
                {preview.warnings.slice(0, 10).map((w, i) => (
                  <li key={i} className="text-[12px] text-amber-700">&bull; {w}</li>
                ))}
                {preview.warnings.length > 10 && (
                  <li className="text-[12px] text-amber-600 italic">... and {preview.warnings.length - 10} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Confirm bar */}
          <div className="bg-surface border border-border rounded-[var(--radius-lg)] px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="text-[13px]">
              <span className="text-text-secondary">Ready to import </span>
              <span className="font-semibold text-text-primary">
                {preview.total_items - skipItems.size}
              </span>
              <span className="text-text-secondary"> of {preview.total_items} records</span>
              {skipItems.size > 0 && <span className="text-amber-500 ml-1">({skipItems.size} skipped)</span>}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-[13px] font-medium text-text-secondary border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming || preview.total_items - skipItems.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-[13px] font-medium rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {confirming ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating records...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Confirm Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && currentImport && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-[var(--radius-lg)] px-6 py-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-[20px] font-bold text-text-primary mb-2">Import Complete</h2>
            <p className="text-[14px] text-text-secondary mb-6">
              {currentImport.original_name} has been processed successfully.
            </p>

            {/* Result stats */}
            <div className="flex justify-center gap-6 mb-6 flex-wrap">
              <div className="text-center">
                <div className="text-[28px] font-bold text-text-primary">{currentImport.total_sections ?? 0}</div>
                <div className="text-[12px] text-text-secondary">Slides Classified</div>
              </div>
              <div className="text-center">
                <div className="text-[28px] font-bold text-emerald-600">{currentImport.import_summary?.created?.length ?? currentImport.total_records_created}</div>
                <div className="text-[12px] text-text-secondary">Records Created</div>
              </div>
              <div className="text-center">
                <div className="text-[28px] font-bold text-amber-500">{currentImport.import_summary?.skipped?.length ?? 0}</div>
                <div className="text-[12px] text-text-secondary">Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-[28px] font-bold text-red-500">{currentImport.import_summary?.failed?.length ?? 0}</div>
                <div className="text-[12px] text-text-secondary">Failed</div>
              </div>
              {(currentImport.import_summary?.informational ?? currentImport.extracted_data?.informational_slides ?? []).length > 0 && (
                <div className="text-center">
                  <div className="text-[28px] font-bold text-blue-500">
                    {(currentImport.import_summary?.informational ?? currentImport.extracted_data?.informational_slides ?? []).length}
                  </div>
                  <div className="text-[12px] text-text-secondary">Informational (Ignored)</div>
                </div>
              )}
            </div>

            {/* Created records summary */}
            {currentImport.import_summary?.created && currentImport.import_summary.created.length > 0 && (
              <div className="max-w-md mx-auto text-left bg-emerald-50 border border-emerald-200 rounded-[var(--radius-md)] px-4 py-3 mb-6">
                <h4 className="text-[12px] font-semibold text-emerald-700 uppercase tracking-wider mb-2">Created Records</h4>
                {(currentImport.import_summary.created as Array<{ module: string; heading?: string }>).slice(0, 10).map((c, i) => (
                  <p key={i} className="text-[12px] text-emerald-700">
                    &bull; <span className="font-medium">{c.module}</span>
                    {c.heading && <> &mdash; {c.heading}</>}
                  </p>
                ))}
              </div>
            )}

            {/* Errors */}
            {currentImport.import_summary?.failed && (currentImport.import_summary.failed as unknown[]).length > 0 && (
              <div className="max-w-md mx-auto text-left bg-red-50 border border-red-200 rounded-[var(--radius-md)] px-4 py-3 mb-6">
                <h4 className="text-[12px] font-semibold text-red-700 uppercase tracking-wider mb-2">Failures</h4>
                {(currentImport.import_summary.failed as Array<{ module: string; error: string }>).map((f, i) => (
                  <p key={i} className="text-[12px] text-red-700">
                    &bull; <span className="font-medium">{f.module}</span>: {f.error}
                  </p>
                ))}
              </div>
            )}

            <div className="flex justify-center gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-[13px] font-medium rounded-[var(--radius-md)] hover:bg-primary-700 transition-colors"
              >
                <ArrowRight size={16} />
                Import Another Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <Modal
          open={!!detailItem}
          onClose={() => setDetailItem(null)}
          title="Record Details"
          subtitle={detailItem.section_heading || undefined}
          size="lg"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${MODULE_COLORS[detailItem.target_module] || ''}`}>
                {detailItem.target_module}
              </span>
              <span className={`text-[12px] font-medium ${confidenceColor(detailItem.confidence)}`}>
                {Math.round(detailItem.confidence * 100)}% confidence
              </span>
              {detailItem.duplicate_of && (
                <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Possible duplicate of {detailItem.duplicate_of}
                </span>
              )}
            </div>

            {detailItem.mapped_fields && (
              <div className="bg-surface-sunken rounded-[var(--radius-md)] p-3 space-y-2">
                {Object.entries(detailItem.mapped_fields).map(([key, value]) => (
                  <div key={key} className="flex gap-3 text-[12px]">
                    <span className="text-text-tertiary min-w-[120px] font-medium">{key.replace(/_/g, ' ')}</span>
                    <span className="text-text-primary break-all">{value !== null && value !== undefined ? String(value) : '-'}</span>
                  </div>
                ))}
              </div>
            )}

            {detailItem.warnings && detailItem.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] px-3 py-2">
                {detailItem.warnings.map((w, i) => (
                  <p key={i} className="text-[11px] text-amber-700">&bull; {w}</p>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* History Modal */}
      <Modal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        title="Import History"
        subtitle="Recent document imports"
        size="lg"
      >
        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-primary-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-text-secondary text-[13px]">
            No imports yet
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(imp => (
              <div key={imp.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface-sunken/50 rounded-[var(--radius-md)] border border-border">
                {getStatusIcon(imp.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary truncate">{imp.original_name}</p>
                  <p className="text-[11px] text-text-tertiary">
                    {formatDate(imp.created_at)} &middot; {imp.imported_by_name}
                    {imp.document_type && <> &middot; {imp.document_type.replace(/_/g, ' ')}</>}
                  </p>
                </div>
                <div className="text-right text-[11px] shrink-0">
                  <StatusBadge status={imp.status} />
                  {imp.total_records_created > 0 && (
                    <p className="text-emerald-600 mt-0.5">{imp.total_records_created} created</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
