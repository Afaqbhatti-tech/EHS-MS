import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

export interface DashboardStat {
  key: string;
  label: string;
  value: string | number;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: { value: string; up: boolean };
  sub?: string;
}

export interface MonthlyTrend {
  month: string;
  observations: number;
  permits: number;
}

export interface ActivityItem {
  type: 'observation' | 'permit' | 'incident' | 'violation';
  text: string;
  status: string;
  time: string;
}

export interface ComplianceScore {
  label: string;
  value: number;
  target: number;
}

export interface AiInsight {
  text: string;
  severity: 'warning' | 'danger' | 'success';
}

export interface VisibleSections {
  incident_free_days: boolean;
  man_hours: boolean;
  active_permits: boolean;
  open_observations: boolean;
  pending_amendments: boolean;
  mom_open_actions: boolean;
  mockup_pending: boolean;
  open_violations: boolean;
  env_manifests: boolean;
  safety_chart: boolean;
  quick_operations: boolean;
  recent_activity: boolean;
  ai_insights: boolean;
  compliance_scorecard: boolean;
}

export interface DashboardData {
  greeting: string;
  stats: DashboardStat[];
  monthlyTrend: MonthlyTrend[];
  recentActivity: ActivityItem[];
  complianceScores: ComplianceScore[];
  aiInsights: AiInsight[];
  sparkTrends: Record<string, number[]>;
  visibleSections?: VisibleSections;
}

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
