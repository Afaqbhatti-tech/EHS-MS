import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { ArrowLeft, Plus, FileText, Search, Calendar, User, Tag } from 'lucide-react';
import Badge, { StatusBadge, statusVariant } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import DocumentDetailDrawer from './DocumentDetailDrawer';
import NewDocumentModal from './NewDocumentModal';

// ─── Types ──────────────────────────────────────
interface WorkLineData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
}

interface RamsDocSummary {
  id: string;
  ref_number: string;
  title: string;
  description: string | null;
  contractor: string | null;
  zone: string | null;
  status: string;
  current_version: number;
  due_date: string | null;
  tags: string[] | null;
  submitted_by: { id: string; name: string } | null;
  approved_by: { id: string; name: string } | null;
  approved_at: string | null;
  latest_version: { id: string; version_number: number; file_name: string; file_size: number; uploaded_at: string } | null;
  created_at: string;
  updated_at: string;
}

interface WorkLineResponse {
  work_line: WorkLineData;
  documents: RamsDocSummary[];
}

const ALL_STATUSES = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Superseded'];

// ─── Component ──────────────────────────────────
export default function WorkLineDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canUpload = hasPermission('can_upload_rams');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const { data, isLoading, error } = useQuery<WorkLineResponse>({
    queryKey: ['rams-work-line', slug],
    queryFn: () => api.get(`/rams/work-lines/${slug}`),
    enabled: !!slug,
  });

  const filteredDocs = data?.documents.filter(doc => {
    if (statusFilter && doc.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        doc.title.toLowerCase().includes(s) ||
        doc.ref_number.toLowerCase().includes(s) ||
        (doc.contractor?.toLowerCase().includes(s) ?? false)
      );
    }
    return true;
  });

  const statusCounts = data?.documents.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.status] = (acc[doc.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5 max-w-[1440px]">
      {/* Back + Header */}
      <div className="flex items-center justify-between pb-5 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/rams-board')}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-sunken text-text-secondary transition-colors duration-150"
          >
            <ArrowLeft size={18} />
          </button>
          {data && (
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: data.work_line.color }} />
              <div>
                <h1 className="text-[20px] font-bold text-text-primary">{data.work_line.name}</h1>
                {data.work_line.description && (
                  <p className="text-[11px] text-text-tertiary">{data.work_line.description}</p>
                )}
              </div>
            </div>
          )}
        </div>
        {canUpload && data && (
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowNewModal(true)}>
            New Document
          </Button>
        )}
      </div>

      {/* Status tabs */}
      {statusCounts && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors duration-150 ${
              !statusFilter ? 'bg-primary-600 text-white' : 'bg-surface-sunken text-text-secondary hover:bg-[#E2E6ED]'
            }`}
          >
            All ({data?.documents.length || 0})
          </button>
          {ALL_STATUSES.map(s => {
            const count = statusCounts[s] || 0;
            if (count === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors duration-150 ${
                  statusFilter === s ? 'bg-primary-600 text-white' : ''
                }`}
              >
                {statusFilter !== s && <Badge variant={statusVariant(s)}>{s} ({count})</Badge>}
                {statusFilter === s && <>{s} ({count})</>}
              </button>
            );
          })}
        </div>
      )}

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="w-full h-[38px] pl-9 pr-3 text-[13px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all duration-150"
        />
      </div>

      {/* Loading / Error */}
      {isLoading && <PageSpinner label="Loading documents..." />}
      {error && (
        <div className="bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] p-4 text-danger-700 text-[13px]">
          Failed to load work line. It may not exist.
        </div>
      )}

      {/* Document cards */}
      {filteredDocs && (
        <div className="space-y-2">
          {filteredDocs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents found"
              description={canUpload ? 'Create the first document to get started.' : undefined}
              action={canUpload ? { label: 'Create Document', onClick: () => setShowNewModal(true) } : undefined}
            />
          ) : (
            filteredDocs.map(doc => (
              <DocumentRow key={doc.id} doc={doc} onClick={() => setSelectedDocId(doc.id)} />
            ))
          )}
        </div>
      )}

      {/* Detail drawer */}
      {selectedDocId && (
        <DocumentDetailDrawer
          documentId={selectedDocId}
          onClose={() => setSelectedDocId(null)}
          workLineSlug={slug!}
        />
      )}

      {/* New document modal */}
      {showNewModal && data && (
        <NewDocumentModal
          workLineId={data.work_line.id}
          workLineName={data.work_line.name}
          workLineSlug={slug!}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  );
}

// ─── Document Row ───────────────────────────────
function DocumentRow({ doc, onClick }: { doc: RamsDocSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface rounded-[var(--radius-lg)] border border-border p-4 hover:shadow-sm hover:border-primary-200 transition-all duration-150 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-text-tertiary">{doc.ref_number}</span>
            <StatusBadge status={doc.status} />
            {doc.current_version > 0 && (
              <span className="text-[10px] text-text-disabled">v{doc.current_version}</span>
            )}
          </div>
          <h4 className="text-[13px] font-medium text-text-primary truncate">{doc.title}</h4>
          {doc.description && (
            <p className="text-[11px] text-text-tertiary mt-0.5 line-clamp-1">{doc.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-[11px] text-text-disabled">
            {doc.contractor && (
              <span className="flex items-center gap-1">
                <Tag size={11} /> {doc.contractor}
              </span>
            )}
            {doc.submitted_by && (
              <span className="flex items-center gap-1">
                <User size={11} /> {doc.submitted_by.name}
              </span>
            )}
            {doc.due_date && (
              <span className="flex items-center gap-1">
                <Calendar size={11} /> {doc.due_date}
              </span>
            )}
            {doc.latest_version && (
              <span className="flex items-center gap-1">
                <FileText size={11} /> {doc.latest_version.file_name}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
