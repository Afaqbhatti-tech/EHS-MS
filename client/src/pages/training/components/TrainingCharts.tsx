import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertTriangle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { TrainingStats } from '../hooks/useTraining';
import { getTopicByKey } from '../../../config/trainingTopics';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_COLORS = [
  'var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)',
  'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)',
  'var(--color-chart-7)', 'var(--color-chart-8)', 'var(--color-chart-9)',
  'var(--color-chart-10)',
];

interface Props {
  stats: TrainingStats | null;
  loading: boolean;
}

export function TrainingCharts({ stats, loading }: Props) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-[var(--radius-md)] p-5 shadow-xs">
            <div className="skeleton h-5 w-40 mb-4" />
            <div className="skeleton h-[250px] w-full rounded-[var(--radius-md)]" />
          </div>
        ))}
      </div>
    );
  }

  const monthlyData = MONTH_NAMES.map((name, i) => {
    const found = stats.monthly.find(m => m.month === i + 1);
    return { name, total: found?.total || 0 };
  });

  const topicData = stats.byTopic.map(t => ({
    name: t.topic_label,
    valid: t.valid,
    expired: t.expired,
    expiring: t.expiring,
    fill: t.topic_color || 'var(--color-chart-1)',
  }));

  const professionData = stats.byProfession.slice(0, 10).map(p => ({
    name: p.profession,
    total: p.total,
  }));

  const statusData = [
    { name: 'Valid', value: stats.kpis.valid, color: 'var(--color-health-good-text)' },
    { name: 'Expired', value: stats.kpis.expired, color: 'var(--color-health-poor-text)' },
    { name: 'Expiring Soon', value: stats.kpis.expiring_soon, color: 'var(--color-health-fair-text)' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="bg-surface border border-border rounded-[var(--radius-md)] p-5 shadow-xs">
          <h3 className="text-[14px] font-semibold text-text-primary mb-4">Monthly Training Records</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
              <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-surface border border-border rounded-[var(--radius-md)] p-5 shadow-xs">
          <h3 className="text-[14px] font-semibold text-text-primary mb-4">Status Distribution</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
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
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-[13px] text-text-tertiary">No data available</div>
          )}
        </div>

        {/* By Topic */}
        {topicData.length > 0 && (
          <div className="bg-surface border border-border rounded-[var(--radius-md)] p-5 shadow-xs">
            <h3 className="text-[14px] font-semibold text-text-primary mb-4">Records by Topic</h3>
            <ResponsiveContainer width="100%" height={Math.max(260, topicData.length * 36)}>
              <BarChart data={topicData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
                <Bar dataKey="valid" stackId="a" fill="var(--color-health-good-text)" name="Valid" radius={[0, 0, 0, 0]} />
                <Bar dataKey="expired" stackId="a" fill="var(--color-health-poor-text)" name="Expired" />
                <Bar dataKey="expiring" stackId="a" fill="var(--color-health-fair-text)" name="Expiring" radius={[0, 4, 4, 0]} />
                <Legend formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By Profession */}
        {professionData.length > 0 && (
          <div className="bg-surface border border-border rounded-[var(--radius-md)] p-5 shadow-xs">
            <h3 className="text-[14px] font-semibold text-text-primary mb-4">Training by Profession</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={professionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
                <Bar dataKey="total" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Expiring Soon Table */}
      {stats.expiringSoon.length > 0 && (
        <div className="bg-surface border border-border rounded-[var(--radius-md)] p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-warning-600" />
            <h3 className="text-[14px] font-semibold text-text-primary">Expiring Within 30 Days</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Worker</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Topic</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Expiry Date</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Days Left</th>
                </tr>
              </thead>
              <tbody>
                {stats.expiringSoon.map(r => {
                  const topicConfig = getTopicByKey(r.topic);
                  return (
                    <tr key={r.id} className="border-b border-border hover:bg-canvas transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="text-[13px] font-semibold text-text-primary">{r.worker_name}</p>
                        <p className="text-[11px] text-text-tertiary">{r.worker_id_no}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border"
                          style={{
                            backgroundColor: topicConfig?.light_color || '#F3F4F6',
                            color: topicConfig?.color || '#374151',
                            borderColor: topicConfig ? `${topicConfig.color}33` : '#D1D5DB',
                          }}
                        >
                          {topicConfig?.label || r.topic}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-text-secondary">
                        {r.expiry_date ? format(new Date(r.expiry_date), 'dd MMM yyyy') : '\u2014'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[13px] font-semibold ${r.days_left <= 7 ? 'text-danger-600' : 'text-warning-600'}`}>
                          {r.days_left}d
                        </span>
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
}
