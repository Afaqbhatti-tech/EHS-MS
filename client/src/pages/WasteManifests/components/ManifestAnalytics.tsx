import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { ManifestStats } from '../hooks/useManifests';

interface Props {
  stats: ManifestStats | null;
  loading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  'Draft': '#9CA3AF', 'Prepared': '#8B5CF6', 'Ready for Dispatch': '#3B82F6',
  'Dispatched': '#F59E0B', 'In Transit': '#D97706', 'Received': '#14B8A6',
  'Completed': '#22C55E', 'Cancelled': '#6B7280', 'Rejected': '#EF4444', 'Under Review': '#EAB308',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Hazardous': '#EF4444', 'Non-Hazardous': '#6B7280', 'Recyclable': '#22C55E',
  'Special Waste': '#F59E0B', 'Inert Waste': '#3B82F6',
};

const CHART_COLORS = ['#2E9E45', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#EC4899', '#6366F1', '#84CC16', '#F97316'];

export default function ManifestAnalytics({ stats, loading }: Props) {
  if (loading || !stats) {
    return <div className="p-8 text-center text-[13px] text-text-secondary">Loading analytics...</div>;
  }

  const statusData = stats.by_status.map(s => ({
    name: s.status,
    value: s.count,
    fill: STATUS_COLORS[s.status] || '#9CA3AF',
  }));

  const categoryData = stats.by_waste_category.map(c => ({
    name: c.waste_category,
    value: c.count,
    fill: CATEGORY_COLORS[c.waste_category] || '#9CA3AF',
  }));

  return (
    <div className="space-y-6">
      {/* Row 1: Status + Category donuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
          <h4 className="text-[13px] font-semibold text-text-primary mb-3">Status Distribution</h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip formatter={(v: number) => v} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
          <h4 className="text-[13px] font-semibold text-text-primary mb-3">By Waste Category</h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                {categoryData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip formatter={(v: number) => v} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Monthly trend */}
      <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
        <h4 className="text-[13px] font-semibold text-text-primary mb-3">Monthly Trend (12 Months)</h4>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={stats.monthly_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: '11px' }} />
            <Bar dataKey="total_manifests" fill="#2E9E45" name="Total" radius={[3, 3, 0, 0]} />
            <Bar dataKey="hazardous_count" fill="#EF4444" name="Hazardous" radius={[3, 3, 0, 0]} />
            <Bar dataKey="completed_count" fill="#3B82F6" name="Completed" radius={[3, 3, 0, 0]} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3: Waste type + Transporters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
          <h4 className="text-[13px] font-semibold text-text-primary mb-3">Top Waste Types</h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.by_waste_type.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="waste_type" type="category" tick={{ fontSize: 10 }} width={120} />
              <Tooltip contentStyle={{ fontSize: '11px' }} />
              <Bar dataKey="count" fill="#2E9E45" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
          <h4 className="text-[13px] font-semibold text-text-primary mb-3">Top Transporters</h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.top_transporters.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="transporter_name" type="category" tick={{ fontSize: 10 }} width={140} />
              <Tooltip contentStyle={{ fontSize: '11px' }} />
              <Bar dataKey="count" fill="#F59E0B" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4: Delayed manifests list */}
      {stats.delayed_list.length > 0 && (
        <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50/30 p-4">
          <h4 className="text-[13px] font-semibold text-red-700 mb-3">Delayed Manifests</h4>
          <div className="space-y-2">
            {stats.delayed_list.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2 rounded bg-white border border-red-100">
                <div>
                  <span className="font-mono text-[11px] font-semibold text-primary-600">{d.manifest_code}</span>
                  <span className="text-[11px] text-text-secondary ml-2">{d.waste_type}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-text-tertiary">{d.transporter_name}</span>
                  <span className="text-[11px] font-bold text-red-600 ml-2">{d.days_delayed}d overdue</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
