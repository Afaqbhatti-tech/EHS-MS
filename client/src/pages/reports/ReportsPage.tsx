import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { format } from 'date-fns';
import {
  BarChart3, Download, Printer, Copy, FileText, FileSpreadsheet,
  ChevronDown, ChevronLeft, ChevronRight, Calendar,
  Eye, ClipboardCheck, AlertTriangle, Ban, Users, Wrench,
  GraduationCap, Truck, ClipboardList, Siren, Megaphone,
  FolderOpen, FileJson, FileType, Presentation,
  type LucideIcon,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  exportExcel, exportCSV, exportPDF, exportWord, exportPowerPoint, exportJSON,
  copyToClipboard, printReport,
  type ExportData, type ReportMeta,
} from './utils/exportUtils';
import PageHeader from '../../components/ui/PageHeader';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import { SectionCard } from '../../components/ui/Card';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

// ─── Types ──────────────────────────────────────────
type Period = 'daily' | 'weekly' | 'monthly';

interface BreakdownItem { label: string; value: number }
interface ModuleSummary { total: number; breakdown?: BreakdownItem[] }
interface ManpowerSummary { records: number; headcount: number; manhours: number }
interface ContractorRow { contractor: string; observations: number; permits: number; incidents: number; violations: number }
interface TrendPoint { date: string; label: string; observations: number; permits: number; incidents: number }
interface ActivityRecord { module: string; record_id: string; title: string; status: string; severity: string | null; contractor: string; area: string; created_at: string }

interface ReportData {
  period: { type: string; start: string; end: string; label: string };
  summary: {
    observations: ModuleSummary; permits: ModuleSummary; incidents: ModuleSummary;
    violations: ModuleSummary; manpower: ManpowerSummary; equipment: ModuleSummary;
    training: ModuleSummary; wasteManifests: ModuleSummary; mockups: ModuleSummary;
    moms: { total: number }; mockDrills: { total: number };
    campaigns: { total: number }; documents: { total: number };
  };
  contractorBreakdown: ContractorRow[];
  trend: TrendPoint[];
  records: { data: ActivityRecord[]; total: number; page: number; limit: number; pages: number };
}

// ─── Constants ──────────────────────────────────────
const CHART_COLORS = ['#1F8034', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const MODULE_ICONS: Record<string, LucideIcon> = {
  observations: Eye, permits: ClipboardCheck, incidents: AlertTriangle,
  violations: Ban, manpower: Users, equipment: Wrench,
  training: GraduationCap, wasteManifests: Truck, mockups: ClipboardList,
  moms: FileText, mockDrills: Siren, campaigns: Megaphone, documents: FolderOpen,
};

const MODULE_LABELS: Record<string, string> = {
  observations: 'Observations', permits: 'Permits', incidents: 'Incidents',
  violations: 'Violations', manpower: 'Manpower', equipment: 'Equipment',
  training: 'Training', wasteManifests: 'Waste Manifests', mockups: 'Mock-Ups',
  moms: 'Weekly MOM', mockDrills: 'Mock Drills', campaigns: 'Campaigns', documents: 'Documents',
};

const MODULE_COLORS: Record<string, { badge: string; text: string }> = {
  observations:   { badge: 'bg-primary-50 text-primary-600', text: 'text-primary-600' },
  permits:        { badge: 'bg-info-50 text-info-600', text: 'text-info-600' },
  incidents:      { badge: 'bg-danger-50 text-danger-600', text: 'text-danger-600' },
  violations:     { badge: 'bg-warning-50 text-warning-600', text: 'text-warning-600' },
  manpower:       { badge: 'bg-success-50 text-success-600', text: 'text-success-600' },
  equipment:      { badge: 'bg-[#F5F3FF] text-[#8B5CF6]', text: 'text-[#8B5CF6]' },
  training:       { badge: 'bg-[#ECFDF5] text-[#059669]', text: 'text-[#059669]' },
  wasteManifests: { badge: 'bg-[#FFF7ED] text-[#EA580C]', text: 'text-[#EA580C]' },
  mockups:        { badge: 'bg-[#EFF6FF] text-[#2563EB]', text: 'text-[#2563EB]' },
  moms:           { badge: 'bg-[#FDF4FF] text-[#9333EA]', text: 'text-[#9333EA]' },
  mockDrills:     { badge: 'bg-danger-50 text-danger-600', text: 'text-danger-600' },
  campaigns:      { badge: 'bg-[#FFF1F2] text-[#E11D48]', text: 'text-[#E11D48]' },
  documents:      { badge: 'bg-surface-sunken text-text-secondary', text: 'text-text-secondary' },
};

// ─── Component ──────────────────────────────────────
export default function ReportsPage() {
  const { user, hasPermission } = useAuth();
  const toast = useToast();
  const canExport = hasPermission('can_export_reports');

  // State
  const [period, setPeriod] = useState<Period>('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [contractor, setContractor] = useState('');
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Reset page on filter change
  const changePeriod = (p: Period) => { setPeriod(p); setPage(1); };
  const changeContractor = (c: string) => { setContractor(c); setPage(1); };

  // ── Data fetching ──
  const { data: reportData, isLoading, error } = useQuery<ReportData>({
    queryKey: ['reports-data', period, selectedDate, contractor, page],
    queryFn: () => api.get(`/reports/data?period=${period}&date=${selectedDate}&contractor=${encodeURIComponent(contractor)}&page=${page}&limit=25`),
  });

  const { data: contractors } = useQuery<string[]>({
    queryKey: ['report-contractors'],
    queryFn: () => api.get('/reports/contractors'),
    staleTime: 300_000,
  });

  // ── Export helpers ──
  const buildExportData = useCallback((): ExportData => {
    const d = reportData!;
    const sm = d.summary;
    const meta: ReportMeta = {
      title: `EHS·OS ${period.charAt(0).toUpperCase() + period.slice(1)} Report`,
      period: d.period.label,
      dateRange: `${d.period.start} to ${d.period.end}`,
      generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      generatedBy: user?.name || user?.email || 'System',
      filters: contractor ? `Contractor: ${contractor}` : undefined,
    };
    const summaryRows = [
      { label: 'Observations', value: sm.observations.total },
      { label: 'Permits', value: sm.permits.total },
      { label: 'Incidents', value: sm.incidents.total },
      { label: 'Violations', value: sm.violations.total },
      { label: 'Manpower Records', value: sm.manpower.records || 0 },
      { label: 'Total Headcount', value: sm.manpower.headcount || 0 },
      { label: 'Total Man-Hours', value: sm.manpower.manhours || 0 },
      { label: 'Equipment', value: sm.equipment.total },
      { label: 'Training Records', value: sm.training.total },
      { label: 'Waste Manifests', value: sm.wasteManifests.total },
      { label: 'Mock-Ups', value: sm.mockups.total },
      { label: 'Weekly MOM', value: sm.moms.total },
      { label: 'Mock Drills', value: sm.mockDrills.total },
      { label: 'Campaigns', value: sm.campaigns.total },
      { label: 'Documents', value: sm.documents.total },
    ];
    const tableHeaders = ['Module', 'Record ID', 'Title', 'Status', 'Severity', 'Contractor', 'Area', 'Created'];
    const tableRows = d.records.data.map(r => [
      r.module, r.record_id, r.title || '', r.status || '', r.severity || '',
      r.contractor || '', r.area || '',
      r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd HH:mm') : '',
    ]);
    return { meta, summaryRows, tableHeaders, tableRows };
  }, [reportData, period, contractor, user]);

  const filePrefix = () => {
    const base = period === 'daily' ? `daily-report-${selectedDate}`
      : period === 'weekly' ? `weekly-report-${reportData?.period.start ?? selectedDate}`
      : `monthly-report-${selectedDate.substring(0, 7)}`;
    return base;
  };

  const handleExport = async (fmt: string) => {
    if (!reportData) return;
    if (isExporting) return;

    // Empty data validation
    if (reportData.records.total === 0 && !['print'].includes(fmt)) {
      setCopyMsg('');
      setExportOpen(false);
      return;
    }

    setExportOpen(false);
    setIsExporting(true);

    try {
      // For file exports, fetch ALL records (not just current page of 25)
      let exportRecords = reportData;
      if (['excel', 'csv', 'pdf', 'word', 'pptx', 'json'].includes(fmt)) {
        try {
          exportRecords = await api.get<ReportData>(
            `/reports/data?period=${period}&date=${selectedDate}&contractor=${encodeURIComponent(contractor)}&page=1&limit=10000`
          );
        } catch (err) {
          // Fall back to current page data if full fetch fails
          console.warn('Failed to fetch full export data, falling back to current page:', err);
          exportRecords = reportData;
        }
      }

      const data = (() => {
        const d = exportRecords;
        const sm = d.summary;
        const meta: ReportMeta = {
          title: `EHS·OS ${period.charAt(0).toUpperCase() + period.slice(1)} Report`,
          period: d.period.label,
          dateRange: `${d.period.start} to ${d.period.end}`,
          generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
          generatedBy: user?.name || user?.email || 'System',
          filters: contractor ? `Contractor: ${contractor}` : undefined,
        };
        const summaryRows = [
          { label: 'Observations', value: sm.observations.total },
          { label: 'Permits', value: sm.permits.total },
          { label: 'Incidents', value: sm.incidents.total },
          { label: 'Violations', value: sm.violations.total },
          { label: 'Manpower Records', value: sm.manpower.records || 0 },
          { label: 'Total Headcount', value: sm.manpower.headcount || 0 },
          { label: 'Total Man-Hours', value: sm.manpower.manhours || 0 },
          { label: 'Equipment', value: sm.equipment.total },
          { label: 'Training Records', value: sm.training.total },
          { label: 'Waste Manifests', value: sm.wasteManifests.total },
          { label: 'Mock-Ups', value: sm.mockups.total },
          { label: 'Weekly MOM', value: sm.moms.total },
          { label: 'Mock Drills', value: sm.mockDrills.total },
          { label: 'Campaigns', value: sm.campaigns.total },
          { label: 'Documents', value: sm.documents.total },
        ];
        const tableHeaders = ['Module', 'Record ID', 'Title', 'Status', 'Severity', 'Contractor', 'Area', 'Created'];
        const tableRows = d.records.data.map(r => [
          r.module, r.record_id, r.title || '', r.status || '', r.severity || '',
          r.contractor || '', r.area || '',
          r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd HH:mm') : '',
        ]);
        return { meta, summaryRows, tableHeaders, tableRows } as ExportData;
      })();

      const name = filePrefix();
      switch (fmt) {
        case 'excel': exportExcel(data, name); break;
        case 'csv':   exportCSV(data, name); break;
        case 'pdf':   exportPDF(data, name); break;
        case 'word':  await exportWord(data, name); break;
        case 'pptx':  await exportPowerPoint(data, name); break;
        case 'json':  exportJSON({ period: exportRecords.period, summary: exportRecords.summary, contractorBreakdown: exportRecords.contractorBreakdown, records: exportRecords.records.data }, name); break;
        case 'copy': {
          const ok = await copyToClipboard(buildExportData());
          setCopyMsg(ok ? 'Copied!' : 'Failed');
          setTimeout(() => setCopyMsg(''), 2000);
          break;
        }
        case 'print': printReport(); break;
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      toast.error(err?.message || 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Render ──
  const sm = reportData?.summary;

  // Status breakdown for pie chart (merge all module breakdowns)
  const pieData = sm ? [
    ...(sm.observations.breakdown || []),
    ...(sm.permits.breakdown || []),
  ].reduce<BreakdownItem[]>((acc, item) => {
    const existing = acc.find(a => a.label === item.label);
    if (existing) existing.value += item.value;
    else acc.push({ ...item });
    return acc;
  }, []) : [];

  return (
    <div className="space-y-6 max-w-[1440px]">
      {/* ── Header ── */}
      <PageHeader
        title="KPIs & Reports"
        subtitle={reportData?.period.label ?? 'Reporting Dashboard'}
        icon={<BarChart3 />}
        actions={
          canExport ? (
            <div className="relative print:hidden" ref={exportRef}>
              <Button
                variant="primary"
                icon={<Download size={16} />}
                onClick={() => setExportOpen(!exportOpen)}
                disabled={isExporting || !reportData}
              >
                {isExporting ? 'Exporting...' : 'Export'} <ChevronDown size={14} />
              </Button>
              {exportOpen && !isExporting && (
                <div className="absolute right-0 top-full mt-1.5 w-full sm:w-52 bg-surface border border-border rounded-[var(--radius-md)] shadow-lg z-50 py-1">
                  {[
                    { key: 'excel', icon: FileSpreadsheet, label: 'Excel (.xlsx)', color: 'text-success-600' },
                    { key: 'csv', icon: FileText, label: 'CSV (.csv)', color: 'text-info-600' },
                    { key: 'pdf', icon: FileType, label: 'PDF (.pdf)', color: 'text-danger-600' },
                    { key: 'word', icon: FileText, label: 'Word (.docx)', color: 'text-primary-700' },
                    { key: 'pptx', icon: Presentation, label: 'PowerPoint (.pptx)', color: 'text-orange-600' },
                    { key: 'json', icon: FileJson, label: 'JSON (.json)', color: 'text-warning-600' },
                    { key: 'copy', icon: Copy, label: copyMsg || 'Copy Summary', color: 'text-[#8B5CF6]' },
                    { key: 'print', icon: Printer, label: 'Print View', color: 'text-text-secondary' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => handleExport(opt.key)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-primary hover:bg-surface-sunken transition-colors duration-150"
                    >
                      <opt.icon size={15} className={opt.color} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : undefined
        }
      />

      {/* ── Period Tabs + Filters ── */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 print:hidden">
        <div className="flex bg-surface-sunken rounded-[var(--radius-md)] p-1">
          {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => changePeriod(p)}
              className={`px-3 sm:px-4 py-1.5 text-[12px] sm:text-[13px] font-medium rounded-[var(--radius-sm)] transition-colors duration-150 ${
                period === p ? 'bg-surface text-primary-600 shadow-xs' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-text-tertiary hidden sm:block" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-[13px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all duration-150"
          />
        </div>

        <select
          value={contractor}
          onChange={e => changeContractor(e.target.value)}
          className="px-3 py-1.5 text-[13px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all duration-150 w-full sm:max-w-[200px]"
        >
          <option value="">All Contractors</option>
          {(contractors || []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Print-only header ── */}
      <div className="hidden print:block print:mb-4">
        <p className="text-[11px] text-text-tertiary">
          Generated: {format(new Date(), 'yyyy-MM-dd HH:mm')} | By: {user?.name || user?.email}
          {contractor ? ` | Contractor: ${contractor}` : ''}
        </p>
      </div>

      {/* ── Loading / Error ── */}
      {isLoading && <PageSpinner label="Generating report..." />}

      {error && (
        <div className="bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] p-4 text-danger-700 text-[13px]">
          Failed to load report data. Please try again.
        </div>
      )}

      {reportData && sm && (
        <>
          {/* ── Charts Row ── */}
          {reportData.trend.length > 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 print:grid-cols-2">
              <SectionCard title="Activity Trend" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={reportData.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="observations" stroke="#1F8034" strokeWidth={2} dot={{ r: 3 }} name="Observations" />
                    <Line type="monotone" dataKey="permits" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Permits" />
                    <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Incidents" />
                  </LineChart>
                </ResponsiveContainer>
              </SectionCard>

              {pieData.length > 0 && (
                <SectionCard title="Status Distribution">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="label" label={({ name, value }: { name?: string; value?: number }) => `${name ?? ''}: ${value ?? 0}`}>
                        {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </SectionCard>
              )}
            </div>
          )}

          {/* ── Module Breakdown Cards ── */}
          <div>
            <h3 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wider mb-3">Module Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {Object.entries(MODULE_LABELS).map(([key, label]) => {
                const mod = (sm as any)[key];
                if (!mod) return null;
                const total = mod.total ?? mod.records ?? 0;
                const Icon = MODULE_ICONS[key] || BarChart3;
                const colors = MODULE_COLORS[key] || { badge: 'bg-surface-sunken text-text-tertiary', text: 'text-text-tertiary' };
                const breakdown: BreakdownItem[] = mod.breakdown || [];
                return (
                  <div key={key} className="bg-surface rounded-[var(--radius-lg)] border border-border p-4 shadow-xs hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-[var(--radius-md)] ${colors.badge}`}>
                        <Icon size={16} />
                      </div>
                      <span className={`text-[22px] font-bold ${colors.text}`}>{total}</span>
                    </div>
                    <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">{label}</p>
                    {breakdown.length > 0 && (
                      <div className="space-y-1">
                        {breakdown.slice(0, 5).map(b => (
                          <div key={b.label} className="flex justify-between text-[11px] text-text-tertiary">
                            <span>{b.label}</span>
                            <span className="font-medium text-text-secondary">{b.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {key === 'manpower' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-text-tertiary">
                          <span>Headcount</span>
                          <span className="font-medium text-text-secondary">{sm.manpower.headcount || 0}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-text-tertiary">
                          <span>Man-Hours</span>
                          <span className="font-medium text-text-secondary">{Number(sm.manpower.manhours || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Contractor Breakdown ── */}
          {reportData.contractorBreakdown.length > 0 && (
            <SectionCard title="Contractor Breakdown">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Contractor</th>
                      <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Observations</th>
                      <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Permits</th>
                      <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Incidents</th>
                      <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Violations</th>
                      <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.contractorBreakdown.map(row => (
                      <tr key={row.contractor} className="border-b border-border last:border-0 hover:bg-surface-sunken transition-colors duration-150">
                        <td className="py-2.5 px-3 font-medium text-text-primary">{row.contractor}</td>
                        <td className="py-2.5 px-3 text-right text-text-secondary">{row.observations}</td>
                        <td className="py-2.5 px-3 text-right text-text-secondary">{row.permits}</td>
                        <td className="py-2.5 px-3 text-right text-danger-600">{row.incidents}</td>
                        <td className="py-2.5 px-3 text-right text-warning-600">{row.violations}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-text-primary">{row.observations + row.permits + row.incidents + row.violations}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* ── Detailed Records Table ── */}
          <SectionCard
            title="Detailed Records"
            action={<span className="text-[11px] text-text-tertiary">{reportData.records.total} total</span>}
          >
            {reportData.records.data.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No records found"
                description="Try selecting a different date range or removing filters."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Module</th>
                        <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Record ID</th>
                        <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Title</th>
                        <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Status</th>
                        <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Severity</th>
                        <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Contractor</th>
                        <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Area</th>
                        <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-text-secondary">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.records.data.map((row, idx) => (
                        <tr key={`${row.record_id}-${idx}`} className="border-b border-border last:border-0 hover:bg-surface-sunken transition-colors duration-150">
                          <td className="py-2.5 px-3">
                            <Badge variant="neutral">{row.module}</Badge>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-text-secondary">{row.record_id}</td>
                          <td className="py-2.5 px-3 text-text-primary max-w-xs truncate">{row.title}</td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="py-2.5 px-3">
                            {row.severity && <SeverityBadge severity={row.severity} />}
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary">{row.contractor}</td>
                          <td className="py-2.5 px-3 text-text-secondary">{row.area}</td>
                          <td className="py-2.5 px-3 text-[11px] text-text-tertiary whitespace-nowrap">
                            {row.created_at ? format(new Date(row.created_at), 'MMM d, HH:mm') : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {reportData.records.pages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border print:hidden gap-2">
                    <span className="text-[10px] sm:text-[11px] text-text-tertiary whitespace-nowrap">
                      Page {reportData.records.page} of {reportData.records.pages}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded-[var(--radius-sm)] border border-border hover:bg-surface-sunken text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(reportData.records.pages, p + 1))}
                        disabled={page >= reportData.records.pages}
                        className="p-1.5 rounded-[var(--radius-sm)] border border-border hover:bg-surface-sunken text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const variantMap: Record<string, 'danger' | 'warning' | 'success' | 'neutral'> = {
    Critical: 'danger', Major: 'warning', Minor: 'warning',
    High: 'danger', Medium: 'warning', Low: 'success',
  };
  return <Badge variant={variantMap[severity] || 'neutral'}>{severity}</Badge>;
}
