import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { FolderKanban, Plus, FileText, ChevronRight, Search, GripVertical, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge, { statusVariant } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  const { hasPermission, hasRole } = useAuth();
  const canUpload = hasPermission('can_upload_rams');
  const canReorder = hasRole('master');
  const canManageCards = hasRole('master');
  const [search, setSearch] = useState('');
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ name: '', description: '', color: '#3b82f6' });
  const [editingCard, setEditingCard] = useState<WorkLine | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', color: '#3b82f6' });
  const [deletingCard, setDeletingCard] = useState<WorkLine | null>(null);
  const queryClient = useQueryClient();

  const createCardMutation = useMutation({
    mutationFn: (data: { name: string; description: string; color: string }) =>
      api.post('/rams/work-lines', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rams-work-lines'] });
      queryClient.invalidateQueries({ queryKey: ['rams-stats'] });
      setShowAddCard(false);
      setNewCard({ name: '', description: '', color: '#3b82f6' });
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: (data: { slug: string; name: string; description: string; color: string }) =>
      api.put(`/rams/work-lines/${data.slug}`, { name: data.name, description: data.description, color: data.color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rams-work-lines'] });
      queryClient.invalidateQueries({ queryKey: ['rams-stats'] });
      setEditingCard(null);
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: (slug: string) => api.delete(`/rams/work-lines/${slug}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rams-work-lines'] });
      queryClient.invalidateQueries({ queryKey: ['rams-stats'] });
      setDeletingCard(null);
    },
  });

  const handleEditCard = (wl: WorkLine) => {
    setEditForm({ name: wl.name, description: wl.description || '', color: wl.color });
    setEditingCard(wl);
  };

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

  // ─── Drag & Drop ───────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !workLines) return;

    const oldIndex = workLines.findIndex(wl => wl.id === active.id);
    const newIndex = workLines.findIndex(wl => wl.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(workLines, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData<WorkLine[]>(['rams-work-lines'], reordered);

    // Persist to backend
    try {
      await api.post('/rams/work-lines/reorder', { ids: reordered.map(wl => wl.id) });
    } catch {
      // Revert on failure
      queryClient.invalidateQueries({ queryKey: ['rams-work-lines'] });
    }
  };

  // ─── Render ────────────────────────────────────
  const boardContent = filtered && filtered.length > 0 ? (
    canReorder && !search ? (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filtered.map(wl => wl.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(wl => (
              <SortableWorkLineCard key={wl.id} workLine={wl} canManage={canManageCards} onClick={() => navigate(`/rams-board/${wl.slug}`)} onEdit={handleEditCard} onDelete={setDeletingCard} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(wl => (
          <WorkLineCard key={wl.id} workLine={wl} canManage={canManageCards} onClick={() => navigate(`/rams-board/${wl.slug}`)} onEdit={handleEditCard} onDelete={setDeletingCard} />
        ))}
      </div>
    )
  ) : null;

  return (
    <div className="space-y-6 max-w-[1440px]">
      <PageHeader
        title="RAMs Board"
        subtitle="Risk Assessment & Method Statement documents by work line"
        icon={<FolderKanban />}
        actions={
          canManageCards ? (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowAddCard(true)}>
              Add Card
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

      {/* Search + Drag hint */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search work lines..."
            className="w-full h-[38px] pl-9 pr-3 text-[13px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all duration-150"
          />
        </div>
        {canReorder && !search && (
          <span className="text-[11px] text-text-tertiary flex items-center gap-1">
            <GripVertical size={13} /> Drag cards to reorder
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && <PageSpinner label="Loading work lines..." />}

      {/* Board Grid */}
      {boardContent}

      {filtered && filtered.length === 0 && !isLoading && (
        <EmptyState icon={FolderKanban} title="No work lines found" description="Try a different search term." />
      )}

      {/* Add Card Modal */}
      <Modal
        open={showAddCard}
        onClose={() => { setShowAddCard(false); setNewCard({ name: '', description: '', color: '#3b82f6' }); }}
        title="Add New Card"
        subtitle="Create a new work line card for the RAMs Board"
        size="sm"
        footer={
          <>
            <button
              onClick={() => { setShowAddCard(false); setNewCard({ name: '', description: '', color: '#3b82f6' }); }}
              className="btn-secondary px-4 py-2 text-sm rounded-lg"
            >
              Cancel
            </button>
            <Button
              variant="primary"
              disabled={!newCard.name.trim() || createCardMutation.isPending}
              onClick={() => createCardMutation.mutate({ name: newCard.name.trim(), description: newCard.description.trim(), color: newCard.color })}
            >
              {createCardMutation.isPending ? 'Creating...' : 'Create Card'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">Card Name <span className="text-danger-500">*</span></label>
            <input
              type="text"
              value={newCard.name}
              onChange={e => setNewCard(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Electrical Works"
              className="w-full h-[38px] px-3 text-[13px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all duration-150"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">Description</label>
            <textarea
              value={newCard.description}
              onChange={e => setNewCard(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this work line..."
              rows={3}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all duration-150 resize-none"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newCard.color}
                onChange={e => setNewCard(prev => ({ ...prev, color: e.target.value }))}
                className="w-9 h-9 rounded-[var(--radius-sm)] border border-border cursor-pointer p-0.5"
              />
              <span className="text-[12px] text-text-tertiary">{newCard.color}</span>
            </div>
          </div>
          {createCardMutation.isError && (
            <p className="text-[12px] text-danger-600">
              {(createCardMutation.error as any)?.message || 'Failed to create card. Please try again.'}
            </p>
          )}
        </div>
      </Modal>

      {/* Edit Card Modal */}
      <Modal
        open={!!editingCard}
        onClose={() => { setEditingCard(null); updateCardMutation.reset(); }}
        title="Edit Card"
        subtitle="Update work line card details"
        size="sm"
        footer={
          <>
            <button
              onClick={() => { setEditingCard(null); updateCardMutation.reset(); }}
              className="btn-secondary px-4 py-2 text-sm rounded-lg"
            >
              Cancel
            </button>
            <Button
              variant="primary"
              disabled={!editForm.name.trim() || updateCardMutation.isPending}
              onClick={() => editingCard && updateCardMutation.mutate({ slug: editingCard.slug, name: editForm.name.trim(), description: editForm.description.trim(), color: editForm.color })}
            >
              {updateCardMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">Card Name <span className="text-danger-500">*</span></label>
            <input
              type="text"
              value={editForm.name}
              onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Electrical Works"
              className="w-full h-[38px] px-3 text-[13px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all duration-150"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">Description</label>
            <textarea
              value={editForm.description}
              onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this work line..."
              rows={3}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all duration-150 resize-none"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1.5">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={editForm.color}
                onChange={e => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                className="w-9 h-9 rounded-[var(--radius-sm)] border border-border cursor-pointer p-0.5"
              />
              <span className="text-[12px] text-text-tertiary">{editForm.color}</span>
            </div>
          </div>
          {updateCardMutation.isError && (
            <p className="text-[12px] text-danger-600">
              {(updateCardMutation.error as any)?.message || 'Failed to update card. Please try again.'}
            </p>
          )}
        </div>
      </Modal>

      {/* Delete Card Confirmation Modal */}
      <Modal
        open={!!deletingCard}
        onClose={() => { setDeletingCard(null); deleteCardMutation.reset(); }}
        title="Delete Card"
        size="sm"
        footer={
          <>
            <button
              onClick={() => { setDeletingCard(null); deleteCardMutation.reset(); }}
              className="btn-secondary px-4 py-2 text-sm rounded-lg"
            >
              Cancel
            </button>
            <button
              disabled={deleteCardMutation.isPending}
              onClick={() => deletingCard && deleteCardMutation.mutate(deletingCard.slug)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-danger-600 rounded-lg hover:bg-danger-700 transition-colors disabled:opacity-50"
            >
              {deleteCardMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-[13px] text-text-secondary">
          Are you sure you want to delete <strong>{deletingCard?.name}</strong>?
          {deletingCard && deletingCard.total_documents > 0 && (
            <span className="block mt-2 text-danger-600 font-medium">
              This card has {deletingCard.total_documents} document(s). Remove all documents first.
            </span>
          )}
        </p>
        {deleteCardMutation.isError && (
          <p className="text-[12px] text-danger-600 mt-3">
            {(deleteCardMutation.error as any)?.message || 'Failed to delete card. Please try again.'}
          </p>
        )}
      </Modal>
    </div>
  );
}

// ─── Sortable Card (with drag handle) ───────────

function SortableWorkLineCard({ workLine, canManage, onClick, onEdit, onDelete }: { workLine: WorkLine; canManage: boolean; onClick: () => void; onEdit: (wl: WorkLine) => void; onDelete: (wl: WorkLine) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workLine.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 p-1 rounded-[var(--radius-sm)] text-text-disabled hover:text-text-secondary hover:bg-surface-sunken transition-colors cursor-grab active:cursor-grabbing z-10"
        title="Drag to reorder"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={16} />
      </button>
      <WorkLineCard workLine={workLine} canManage={canManage} onClick={onClick} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

// ─── Base Card ──────────────────────────────────

function WorkLineCard({ workLine, canManage, onClick, onEdit, onDelete }: { workLine: WorkLine; canManage: boolean; onClick: () => void; onEdit: (wl: WorkLine) => void; onDelete: (wl: WorkLine) => void }) {
  const statusEntries = Object.entries(workLine.status_counts);
  const hasDocuments = workLine.total_documents > 0;

  return (
    <div
      onClick={onClick}
      className="w-full text-left bg-surface rounded-[var(--radius-lg)] border border-border p-4 hover:shadow-md hover:border-primary-200 transition-all duration-150 group cursor-pointer"
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

      {canManage && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
          <button
            onClick={e => { e.stopPropagation(); onEdit(workLine); }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary bg-surface-sunken border border-border rounded-[var(--radius-sm)] hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-colors"
          >
            <Pencil size={12} />
            Edit
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(workLine); }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary bg-surface-sunken border border-border rounded-[var(--radius-sm)] hover:bg-danger-50 hover:text-danger-600 hover:border-danger-200 transition-colors"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
