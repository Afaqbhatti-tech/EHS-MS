import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { FolderKanban, Plus, FileText, ChevronRight, Search } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge, { statusVariant } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

// ─── Types ──────────────────────────────────────
interface WorkLine {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  sort_order: number;
  total_documents: number;
  status_counts: Record<string, number>;
}

interface RamsStats {
  total: number;
  by_status: Record<string, number>;
  by_contractor: Record<string, number>;
}

// ─── Component ──────────────────────────────────
export default function RamsBoardPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canUpload = hasPermission('can_upload_rams');
  const [search, setSearch] = useState('');

  const { data: workLines, isLoading } = useQuery<WorkLine[]>({
    queryKey: ['rams-work-lines'],
    queryFn: () => api.get('/rams/work-lines'),
  });

  const { data: stats } = useQuery<RamsStats>({
    queryKey: ['rams-stats'],
    queryFn: () => api.get('/rams/stats'),
    staleTime: 60_000,
  });

  const filtered = workLines?.filter(wl =>
    !search || wl.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1440px]">
      <PageHeader
        title="RAMs Board"
        subtitle="Risk Assessment & Method Statement documents by work line"
        icon={<FolderKanban />}
        actions={
          canUpload ? (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/rams-board/new')}>
              New Document
            </Button>
          ) : undefined
        }
      />

      {/* Stats Bar */}
      {stats && (
        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge variant="neutral"><span className="font-bold mr-1">{stats.total}</span> Total</Badge>
          {Object.entries(stats.by_status).map(([status, count]) => (
            <Badge key={status} variant={statusVariant(status)}>
              <span className="font-bold mr-1">{count}</span> {status}
            </Badge>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search work lines..."
          className="w-full h-[38px] pl-9 pr-3 text-[13px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all duration-150"
        />
      </div>

      {/* Loading */}
      {isLoading && <PageSpinner label="Loading work lines..." />}

      {/* Board Grid */}
      {filtered && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(wl => (
            <WorkLineCard key={wl.id} workLine={wl} onClick={() => navigate(`/rams-board/${wl.slug}`)} />
          ))}
          {filtered.length === 0 && !isLoading && (
            <div className="col-span-full">
              <EmptyState icon={FolderKanban} title="No work lines found" description="Try a different search term." />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────

function WorkLineCard({ workLine, onClick }: { workLine: WorkLine; onClick: () => void }) {
  const statusEntries = Object.entries(workLine.status_counts);
  const hasDocuments = workLine.total_documents > 0;

  return (
    <button
      onClick={onClick}
      className="text-left bg-surface rounded-[var(--radius-lg)] border border-border p-4 hover:shadow-md hover:border-primary-200 transition-all duration-150 group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: workLine.color }} />
          <h3 className="text-[13px] font-semibold text-text-primary group-hover:text-primary-600 transition-colors duration-150">
            {workLine.name}
          </h3>
        </div>
        <ChevronRight size={16} className="text-text-disabled group-hover:text-primary-600 transition-colors duration-150 mt-0.5" />
      </div>

      {workLine.description && (
        <p className="text-[11px] text-text-tertiary mb-3 line-clamp-2">{workLine.description}</p>
      )}

      <div className="flex items-center gap-1.5 mb-2">
        <FileText size={13} className="text-text-tertiary" />
        <span className="text-[11px] text-text-secondary font-medium">
          {workLine.total_documents} document{workLine.total_documents !== 1 ? 's' : ''}
        </span>
      </div>

      {hasDocuments && statusEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {statusEntries.map(([status, count]) => (
            <Badge key={status} variant={statusVariant(status)}>
              {count} {status}
            </Badge>
          ))}
        </div>
      )}
    </button>
  );
}
