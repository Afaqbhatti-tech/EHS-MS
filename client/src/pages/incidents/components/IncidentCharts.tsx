import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import type { IncidentStats } from '../useIncidents';

interface Props {
  stats: IncidentStats | undefined;
  isLoading: boolean;
}

const COLORS = [
  'var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)',
  'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)',
  'var(--color-chart-7)', 'var(--color-chart-8)', 'var(--color-chart-9)',
  'var(--color-chart-10)',
];
const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#EF4444',
  High: '#F59E0B',
  Medium: '#3B82F6',
  Low: '#10B981',
};
const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const tooltipStyle = { fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' };

export default function IncidentCharts({ stats, isLoading }: Props) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-72 rounded-xl bg-surface border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  const monthlyData = stats.monthly.map(m => ({
    ...m,
    name: MONTH_NAMES[m.month],
  }));

  return (
    <div className="space-y-4">
      {/* Row 1: Monthly Trend + By Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trend */}
        <ChartCard title="Monthly Incident Trend">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="total" stroke="var(--color-chart-1)" strokeWidth={2} name="Total" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="closed" stroke="var(--color-chart-3)" strokeWidth={2} name="Closed" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="high_severity" stroke="var(--color-chart-5)" strokeWidth={2} name="High Severity" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="near_misses" stroke="var(--color-chart-4)" strokeWidth={1.5} name="Near Misses" dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* By Type */}
        <ChartCard title="Incidents by Type">
          {stats.byType.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.byType}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={38}
                    paddingAngle={3}
                  >
                    {stats.byType.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {stats.byType.map((s, i) => (
                  <span key={s.label} className="flex items-center gap-1 text-[10px] text-text-secondary">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {s.label} ({s.total})
                  </span>
                ))}
              </div>
            </>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Row 2: By Severity + By Category + By Root Cause */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By Severity */}
        <ChartCard title="Incidents by Severity">
          {stats.bySeverity.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.bySeverity}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={35}
                    paddingAngle={3}
                  >
                    {stats.bySeverity.map((entry, i) => (
                      <Cell key={i} fill={SEVERITY_COLORS[entry.label] || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {stats.bySeverity.map((s, i) => (
                  <span key={s.label} className="flex items-center gap-1 text-[10px] text-text-secondary">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SEVERITY_COLORS[s.label] || COLORS[i % COLORS.length] }} />
                    {s.label} ({s.total})
                  </span>
                ))}
              </div>
            </>
          ) : <EmptyChart />}
        </ChartCard>

        {/* By Category */}
        <ChartCard title="Incidents by Category">
          {stats.byCategory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.byCategory}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={35}
                    paddingAngle={3}
                  >
                    {stats.byCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {stats.byCategory.map((s, i) => (
                  <span key={s.label} className="flex items-center gap-1 text-[10px] text-text-secondary">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[(i + 3) % COLORS.length] }} />
                    {s.label} ({s.total})
                  </span>
                ))}
              </div>
            </>
          ) : <EmptyChart />}
        </ChartCard>

        {/* By Root Cause */}
        <ChartCard title="Root Cause Analysis">
          {stats.byRootCause.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.byRootCause}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={35}
                    paddingAngle={3}
                  >
                    {stats.byRootCause.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + 6) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {stats.byRootCause.map((s, i) => (
                  <span key={s.label} className="flex items-center gap-1 text-[10px] text-text-secondary">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[(i + 6) % COLORS.length] }} />
                    {s.label} ({s.total})
                  </span>
                ))}
              </div>
            </>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Row 3: By Location + By Contractor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Location */}
        <ChartCard title="Incidents by Location">
          {stats.byLocation.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(240, stats.byLocation.length * 36)}>
              <BarChart data={stats.byLocation.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} allowDecimals={false} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} width={110} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill="var(--color-chart-7)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* By Contractor */}
        <ChartCard title="Incidents by Contractor">
          {stats.byContractor.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.byContractor.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Row 4: By Injury Type + By Body Part */}
      {(stats.byInjuryType.length > 0 || stats.byBodyPart.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stats.byInjuryType.length > 0 && (
            <ChartCard title="Incidents by Injury Type">
              <ResponsiveContainer width="100%" height={Math.max(240, stats.byInjuryType.length * 36)}>
                <BarChart data={stats.byInjuryType.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} allowDecimals={false} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} width={120} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="total" fill="var(--color-chart-5)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {stats.byBodyPart.length > 0 && (
            <ChartCard title="Incidents by Body Part Affected">
              <ResponsiveContainer width="100%" height={Math.max(240, stats.byBodyPart.length * 36)}>
                <BarChart data={stats.byBodyPart.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} allowDecimals={false} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} width={100} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="total" fill="var(--color-chart-9)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] shadow-sm p-5 chart-container">
      <h3 className="text-[13px] font-semibold text-text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[200px] flex items-center justify-center text-text-tertiary text-xs">
      No data available
    </div>
  );
}
