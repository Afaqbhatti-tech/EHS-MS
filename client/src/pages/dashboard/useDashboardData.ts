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

export interface DashboardData {
  greeting: string;
  stats: DashboardStat[];
  monthlyTrend: MonthlyTrend[];
  recentActivity: ActivityItem[];
  complianceScores: ComplianceScore[];
}

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
