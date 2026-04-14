import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText, FileType2, Table2, Braces, Copy, Printer, Presentation } from 'lucide-react';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'docx' | 'pptx' | 'json' | 'copy' | 'print';

interface ExportOption {
  format: ExportFormat;
  label: string;
  ext?: string;
  icon: typeof FileText;
  color: string;
  bg: string;
  dividerBefore?: boolean;
}

const EXPORT_OPTIONS: ExportOption[] = [
  { format: 'xlsx', label: 'Excel',        ext: '.xlsx', icon: FileSpreadsheet, color: 'text-green-600',   bg: 'bg-green-50' },
  { format: 'csv',  label: 'CSV',          ext: '.csv',  icon: Table2,          color: 'text-teal-600',    bg: 'bg-teal-50' },
  { format: 'pdf',  label: 'PDF',          ext: '.pdf',  icon: FileText,        color: 'text-red-600',     bg: 'bg-red-50' },
  { format: 'docx', label: 'Word',         ext: '.docx', icon: FileType2,       color: 'text-blue-600',    bg: 'bg-blue-50' },
  { format: 'pptx', label: 'PowerPoint',  ext: '.pptx', icon: Presentation,    color: 'text-orange-600',  bg: 'bg-orange-50' },
  { format: 'json', label: 'JSON',         ext: '.json', icon: Braces,          color: 'text-amber-600',   bg: 'bg-amber-50' },
  { format: 'copy', label: 'Copy Summary',               icon: Copy,            color: 'text-violet-600',  bg: 'bg-violet-50', dividerBefore: true },
  { format: 'print',label: 'Print View',                 icon: Printer,         color: 'text-gray-600',    bg: 'bg-gray-100' },
];

interface Props {
  onExport: (format: ExportFormat) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

export default function ExportDropdown({ onExport, disabled, className }: Props) {
  const [open, setOpen] = useState(false);
  const [copyMsg, setCopyMsg] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setCopyMsg(false); }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setCopyMsg(false); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = async (format: ExportFormat) => {
    if (format === 'print') {
      setOpen(false);
      window.print();
      return;
    }
    if (format === 'copy') {
      try { await onExport('copy'); } catch { /* handled by caller */ }
      setCopyMsg(true);
      setTimeout(() => { setCopyMsg(false); setOpen(false); }, 1200);
      return;
    }
    setOpen(false);
    try { await onExport(format); } catch { /* handled by caller */ }
  };

  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold text-white bg-green-600 rounded-[var(--radius-md)] hover:bg-green-700 transition-colors disabled:opacity-50 shadow-xs print:hidden"
      >
        <Download size={14} />
        Export
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-surface border border-border rounded-[var(--radius-lg)] shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {EXPORT_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isCopy = opt.format === 'copy';
            return (
              <div key={opt.format}>
                {opt.dividerBefore && <div className="my-1.5 border-t border-border" />}
                <button
                  onClick={() => handleSelect(opt.format)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-sunken transition-colors"
                >
                  <span className={`flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] ${opt.bg} shrink-0`}>
                    <Icon size={14} className={opt.color} />
                  </span>
                  <span className="text-[13px] font-medium text-text-primary leading-tight">
                    {isCopy && copyMsg ? 'Copied!' : opt.label}
                    {opt.ext && <span className="text-text-tertiary ml-1">({opt.ext})</span>}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
