import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import Modal from '../ui/Modal';
import { useImport, type Classification } from './useImport';
import ImportSummaryBar from './ImportSummaryBar';
import ImportRowsTable from './ImportRowsTable';

const MODULE_LABELS: Record<string, string> = {
  workers: 'Workers / Manpower',
  training: 'Training Records',
  equipment: 'Equipment / Tracker',
  contractors: 'Contractors',
};

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  module: string;
  onComplete?: () => void;
}

export default function ImportModal({ open, onClose, module, onComplete }: ImportModalProps) {
  const {
    stage, batch, rows, syncResult,
    uploading, confirming, error,
    uploadFile, confirmSync, cancelImport, reset,
  } = useImport(module);

  const handleClose = useCallback(() => {
    if (stage === 'preview' && batch) {
      cancelImport();
    }
    if (stage === 'result' && onComplete) {
      onComplete();
    }
    reset();
    onClose();
  }, [stage, batch, cancelImport, reset, onClose, onComplete]);

  const moduleName = MODULE_LABELS[module] || module;

  const title = stage === 'upload'
    ? `Import ${moduleName}`
    : stage === 'preview'
      ? `Review Before Sync — ${batch?.original_filename || ''}`
      : 'Sync Complete';

  const subtitle = stage === 'upload'
    ? 'Upload an Excel or CSV file to sync records'
    : stage === 'preview'
      ? `${batch?.total_rows || 0} rows analysed`
      : undefined;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      size="lg"
      footer={
        stage === 'upload' ? <UploadFooter /> :
        stage === 'preview' ? (
          <PreviewFooter
            batch={batch!}
            confirming={confirming}
            onCancel={() => { cancelImport(); reset(); }}
            onConfirm={confirmSync}
          />
        ) : (
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-[13px] font-medium hover:bg-gray-700"
          >
            Close
          </button>
        )
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-700 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {stage === 'upload' && (
        <UploadStep uploading={uploading} onFileSelect={uploadFile} />
      )}

      {stage === 'preview' && batch && (
        <PreviewStep batch={batch} rows={rows} />
      )}

      {stage === 'result' && syncResult && (
        <ResultStep result={syncResult} />
      )}
    </Modal>
  );
}

// ── STAGE 1: Upload ─────────────────────────────────

function UploadStep({ uploading, onFileSelect }: { uploading: boolean; onFileSelect: (file: File) => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  if (uploading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <div className="text-[14px] font-medium text-gray-700">Analysing your file...</div>
        <div className="text-[12px] text-gray-400">Comparing against existing records...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          dragOver ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <FileSpreadsheet size={36} className="mx-auto text-gray-300 mb-3" />
        <div className="text-[13px] font-medium text-gray-600">
          Drag & drop your file here
        </div>
        <div className="text-[11px] text-gray-400 mt-1">
          or click to browse
        </div>
        <div className="text-[10px] text-gray-300 mt-2">
          Accepted: .xlsx, .xls, .csv &middot; Max 20MB
        </div>
      </div>

      {selectedFile && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <FileSpreadsheet size={16} className="text-green-600" />
          <span className="text-[12px] font-medium text-gray-700 flex-1 truncate">{selectedFile.name}</span>
          <span className="text-[10px] text-gray-400">{(selectedFile.size / 1024).toFixed(0)} KB</span>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            <X size={14} className="text-gray-400" />
          </button>
        </div>
      )}

      {selectedFile && (
        <button
          onClick={() => onFileSelect(selectedFile)}
          className="w-full py-2.5 bg-green-600 text-white rounded-lg text-[13px] font-medium hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <Upload size={16} /> Upload & Analyse
        </button>
      )}
    </div>
  );
}

function UploadFooter() {
  return null; // Upload button is inline
}

// ── STAGE 2: Preview ────────────────────────────────

function PreviewStep({ batch, rows }: { batch: NonNullable<ReturnType<typeof useImport>['batch']>; rows: ReturnType<typeof useImport>['rows'] }) {
  const [filter, setFilter] = useState<Classification | 'all'>('all');

  return (
    <div>
      <ImportSummaryBar batch={batch} activeFilter={filter} onFilterChange={setFilter} />

      {batch.conflict_count > 0 && (
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-300 rounded-lg mb-3 text-[12px] text-amber-800 leading-relaxed">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>{batch.conflict_count} row{batch.conflict_count !== 1 ? 's have' : ' has'} conflicts.</strong>{' '}
            These will NOT be modified automatically. After sync, you can review them individually.
          </span>
        </div>
      )}

      <ImportRowsTable rows={rows} filter={filter} />
    </div>
  );
}

function PreviewFooter({
  batch, confirming, onCancel, onConfirm,
}: {
  batch: NonNullable<ReturnType<typeof useImport>['batch']>;
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const hasActionable = batch.new_count > 0 || batch.update_count > 0;

  const label = [
    batch.new_count > 0 && `Create ${batch.new_count}`,
    batch.update_count > 0 && `Update ${batch.update_count}`,
    batch.duplicate_count > 0 && `Skip ${batch.duplicate_count}`,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <button
        onClick={onCancel}
        disabled={confirming}
        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-[13px] font-medium flex items-center gap-1.5"
      >
        <ArrowLeft size={14} /> Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={confirming || !hasActionable}
        className={clsx(
          'px-4 py-2 rounded-lg text-[13px] font-medium flex items-center gap-2 text-white',
          hasActionable ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed',
        )}
      >
        {confirming ? (
          <><Loader2 size={14} className="animate-spin" /> Syncing...</>
        ) : (
          <><CheckCircle2 size={14} /> Confirm Sync{label ? `: ${label}` : ''}</>
        )}
      </button>
    </>
  );
}

// ── STAGE 3: Result ─────────────────────────────────

function ResultStep({ result }: { result: NonNullable<ReturnType<typeof useImport>['syncResult']> }) {
  const stats = [
    { label: 'records created', count: result.created, color: 'text-green-600', icon: '✅' },
    { label: 'records updated', count: result.updated, color: 'text-blue-600', icon: '✏️' },
    { label: 'duplicates skipped', count: result.skipped, color: 'text-gray-500', icon: '⟳' },
    { label: 'conflicts held for review', count: result.conflicts_held, color: 'text-amber-600', icon: '⚠️' },
    { label: 'errors', count: result.errors, color: 'text-red-600', icon: '❌' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {stats.filter(s => s.count > 0).map((s, i) => (
          <div
            key={i}
            className={clsx(
              'flex items-center gap-3 py-2.5',
              i > 0 && 'border-t border-gray-100'
            )}
          >
            <span className="text-[20px]">{s.icon}</span>
            <span className={clsx('text-[22px] font-extrabold min-w-[50px] text-right', s.color)}>
              {s.count}
            </span>
            <span className="text-[14px] text-gray-600">{s.label}</span>
          </div>
        ))}
      </div>

      {result.conflicts_held > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-[12px] text-amber-800 leading-relaxed">
          <strong>{result.conflicts_held} row{result.conflicts_held !== 1 ? 's were' : ' was'} held</strong> because of conflicting data.
          Review them manually and update as needed.
        </div>
      )}

      {result.errors > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-700">
          <strong>{result.errors} row{result.errors !== 1 ? 's' : ''} had errors.</strong> Check the import history for details.
        </div>
      )}
    </div>
  );
}
