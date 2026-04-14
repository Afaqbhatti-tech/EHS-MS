import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import type { ViolationStats } from '../useViolations';

interface Props { stats: ViolationStats | undefined; isLoading: boolean }

const COLORS = ['#1F8034', '#2563EB', '#F59E0B', '#DC2626', '#8B5CF6', '#06B6D4', '#F97316', '#6366F1', '#EC4899', '#84CC16'];
const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ViolationCharts({ stats, isLoading }: Props) {
  if (isLoading || !stats) {
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-72 rounded-xl bg-surface border border-border animate-pulse" />
      ))}
    </div>;
  }

  const monthlyData = stats.monthly.map(m => ({ ...m, name: MONTH_NAMES[m.month] }));

  return (
    <div className="space-y-4">
      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trend */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="total" stroke="#1F8034" strokeWidth={2} name="Total" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="closed" stroke="#2563EB" strokeWidth={2} name="Closed" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="high_severity" stroke="#DC2626" strokeWidth={2} name="High/Critical" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* By Category */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-4">By Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.byCategory.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="label" type="category" width={100} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }} />
              <Bar dataKey="total" fill="#1F8034" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By Severity */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-4">By Severity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.bySeverity} dataKey="total" nameKey="label" cx="50%" cy="50%"
                outerRadius={70} innerRadius={35} paddingAngle={3}>
                {stats.bySeverity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {stats.bySeverity.map((s, i) => (
              <span key={s.label} className="flex items-center gap-1 text-[10px] text-text-secondary">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {s.label} ({s.total})
              </span>
            ))}
          </div>
        </div>

        {/* By Type */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-4">By Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.byType} dataKey="total" nameKey="label" cx="50%" cy="50%"
                outerRadius={70} innerRadius={35} paddingAngle={3}>
                {stats.byType.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {stats.byType.map((s, i) => (
              <span key={s.label} className="flex items-center gap-1 text-[10px] text-text-secondary">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(i + 3) % COLORS.length] }} />
                {s.label} ({s.total})
              </span>
            ))}
          </div>
        </div>

        {/* By Root Cause */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-4">By Root Cause</h3>
          {stats.byRootCause.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.byRootCause} dataKey="total" nameKey="label" cx="50%" cy="50%"
                  outerRadius={70} innerRadius={35} paddingAngle={3}>
                  {stats.byRootCause.map((_, i) => <Cell key={i} fill={COLORS[(i + 6) % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-text-tertiary text-xs">No root cause data yet</div>
          )}
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {stats.byRootCause.map((s, i) => (
              <span key={s.label} className="flex items-center gap-1 text-[10px] text-text-secondary">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(i + 6) % COLORS.length] }} />
                {s.label} ({s.total})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Contractor */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-4">By Contractor</h3>
          {stats.byContractor.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byContractor.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="total" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-text-tertiary text-xs">No contractor data yet</div>
          )}
        </div>

        {/* Repeat Violators */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Repeat Violators</h3>
          {stats.repeatViolators.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-text-secondary py-2">Name</th>
                    <th className="text-left text-xs font-medium text-text-secondary py-2">Contractor</th>
                    <th className="text-right text-xs font-medium text-text-secondary py-2">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {stats.repeatViolators.map((rv, i) => (
                    <tr key={i}>
                      <td className="py-2 text-xs font-medium text-text-primary">{rv.violator_name}</td>
                      <td className="py-2 text-xs text-text-secondary">{rv.contractor_name || '—'}</td>
                      <td className="py-2 text-xs text-right font-semibold text-danger-600">{rv.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-text-tertiary text-xs">No repeat violators found</div>
          )}
        </div>
      </div>

      {/* Row 4: Location */}
      {stats.byLocation.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-4">By Location</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.byLocation.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="total" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
