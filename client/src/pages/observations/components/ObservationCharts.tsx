import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ObservationStats } from '../hooks/useObservations';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_COLORS: Record<string, string> = {
  open: 'var(--color-chart-2)',
  in_progress: 'var(--color-chart-4)',
  closed: 'var(--color-chart-3)',
  overdue: 'var(--color-chart-5)',
};

const PIE_COLORS = [
  'var(--color-chart-2)', 'var(--color-chart-4)', 'var(--color-chart-3)',
  'var(--color-chart-7)', 'var(--color-chart-5)', 'var(--color-chart-8)',
];
const BAR_GREEN = 'var(--color-chart-1)';

interface Props {
  stats: ObservationStats | null;
  loading: boolean;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm p-5 chart-container">
      <h3 className="text-[13px] font-semibold text-text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
}

export function ObservationCharts({ stats, loading }: Props) {
  const [tab, setTab] = useState<'overview' | 'category' | 'team'>('overview');

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-surface border border-border rounded-[var(--radius-md)] p-5">
            <div className="skeleton h-5 w-1/3 mb-4" />
            <div className="skeleton h-[250px] w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Prepare monthly trend data
  const monthlyData = MONTHS.map((name, i) => {
    const m = stats.monthly.find(r => r.month === i + 1);
    return {
      name,
      total: m?.total || 0,
      open: m?.open || 0,
      in_progress: m?.in_progress || 0,
      closed: m?.closed || 0,
      overdue: m?.overdue || 0,
    };
  });

  // Status distribution for pie chart
  const statusData = [
    { name: 'Open', value: stats.kpis.open },
    { name: 'In Progress', value: stats.kpis.in_progress },
    { name: 'Closed', value: stats.kpis.closed },
    { name: 'Verified', value: stats.kpis.verified },
    { name: 'Overdue', value: stats.kpis.overdue },
    { name: 'Reopened', value: stats.kpis.reopened },
  ].filter(d => d.value > 0);

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'category' as const, label: 'By Category & Priority' },
    { key: 'team' as const, label: 'By Contractor & Officer' },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0 mb-5 border-b-2 border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-[2px] transition-colors ${
              tab === t.key
                ? 'text-primary-600 border-primary-600 font-semibold'
                : 'text-text-tertiary border-transparent hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Monthly Observation Trend">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="total" stroke={BAR_GREEN} strokeWidth={2} name="Total" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="open" stroke={STATUS_COLORS.open} strokeWidth={1.5} name="Open" dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="closed" stroke={STATUS_COLORS.closed} strokeWidth={1.5} name="Closed" dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Status Distribution">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Monthly Breakdown by Status">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="open" stackId="a" fill={STATUS_COLORS.open} name="Open" radius={[0, 0, 0, 0]} />
                <Bar dataKey="in_progress" stackId="a" fill={STATUS_COLORS.in_progress} name="In Progress" />
                <Bar dataKey="closed" stackId="a" fill={STATUS_COLORS.closed} name="Closed" />
                <Bar dataKey="overdue" stackId="a" fill={STATUS_COLORS.overdue} name="Overdue" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Category Tab */}
      {tab === 'category' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fadeIn">
          <ChartCard title="Observations by Category">
            <ResponsiveContainer width="100%" height={Math.max(280, stats.byCategory.length * 36)}>
              <BarChart data={stats.byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} width={130} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
                <Bar dataKey="total" fill={BAR_GREEN} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Priority Distribution">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[
                { name: 'Low', count: stats.byCategory.length > 0 ? 0 : 0 },
                { name: 'Medium', count: 0 },
                { name: 'High', count: 0 },
              ].map(() => ({ name: '', count: 0 }))}>
                {/* Placeholder - priority stats need separate endpoint */}
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[12px] text-text-tertiary text-center mt-2">Priority breakdown available in observation list</p>
          </ChartCard>
        </div>
      )}

      {/* Team Tab */}
      {tab === 'team' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fadeIn">
          <ChartCard title="Observations by Contractor">
            <ResponsiveContainer width="100%" height={Math.max(280, stats.byContractor.length * 36)}>
              <BarChart data={stats.byContractor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                <YAxis type="category" dataKey="contractor" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} width={120} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
                <Bar dataKey="total" fill={BAR_GREEN} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Reporting Officers">
            <ResponsiveContainer width="100%" height={Math.max(280, stats.byOfficer.length * 36)}>
              <BarChart data={stats.byOfficer} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                <YAxis type="category" dataKey="officer_name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} width={130} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
                <Bar dataKey="total" fill="var(--color-chart-9)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
