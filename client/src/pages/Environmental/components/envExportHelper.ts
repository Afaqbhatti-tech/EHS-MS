import type { ExportFormat } from '../../../components/ui/ExportDropdown';
import type { ExportData } from '../../reports/utils/exportUtils';
import {
  exportExcel,
  exportCSV,
  exportPDF,
  exportWord,
  exportPowerPoint,
  exportJSON,
  copyToClipboard,
} from '../../reports/utils/exportUtils';

interface EnvExportOpts {
  title: string;
  filename: string;
  headers: string[];
  getRows: () => (string | number)[][];
  getSummary?: () => { label: string; value: string | number }[];
}

export function createEnvExportHandler(opts: EnvExportOpts) {
  let exporting = false;
  return async (format: ExportFormat) => {
    if (exporting) return;
    if (format === 'print') {
      window.print();
      return;
    }

    const rows = opts.getRows();
    if (!rows.length) return;

    exporting = true;
    try {
      const now = new Date();
      const data: ExportData = {
        meta: {
          title: opts.title,
          period: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
          dateRange: 'All Records',
          generatedAt: now.toLocaleString(),
          generatedBy: 'EHS\u00b7OS',
        },
        summaryRows: opts.getSummary?.() || [{ label: 'Total Records', value: rows.length }],
        tableHeaders: opts.headers,
        tableRows: rows,
      };

      switch (format) {
        case 'xlsx': exportExcel(data, opts.filename); break;
        case 'csv':  exportCSV(data, opts.filename); break;
        case 'pdf':  exportPDF(data, opts.filename); break;
        case 'docx': await exportWord(data, opts.filename); break;
        case 'pptx': await exportPowerPoint(data, opts.filename); break;
        case 'json': exportJSON(data, opts.filename); break;
        case 'copy': await copyToClipboard(data); break;
      }
    } catch (err) {
      console.error('Environmental export failed:', err);
    } finally {
      exporting = false;
    }
  };
}
