import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const CONTRACTORS = ['CCCC', 'CCC Rail', 'Artal', 'FFT Direct'];
const ZONES = [
  'Zone A', 'Zone B', 'Zone C',
  'Station 1', 'Station 2', 'Station 3', 'Station 4', 'Station 5',
  'Chassis Line', 'Door Line', 'Trim Line',
  'Outwork Area', 'Logistics Gate', 'Workshop',
];

const inputCls = 'w-full h-[42px] px-3 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100';
const labelCls = 'block text-[13px] font-medium text-text-secondary mb-1.5';

interface Props {
  workLineId: string;
  workLineName: string;
  workLineSlug: string;
  onClose: () => void;
}

export default function NewDocumentModal({ workLineId, workLineName, workLineSlug, onClose }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contractor, setContractor] = useState('');
  const [zone, setZone] = useState('');
  const [dueDate, setDueDate] = useState('');

  const createMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('work_line_id', workLineId);
      fd.append('title', title);
      if (description) fd.append('description', description);
      if (contractor) fd.append('contractor', contractor);
      if (zone) fd.append('zone', zone);
      if (dueDate) fd.append('due_date', dueDate);
      const file = fileRef.current?.files?.[0];
      if (file) fd.append('file', file);

      return fetch(`${API_BASE}/rams/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('ehs_token')}`, 'ngrok-skip-browser-warning': '1' },
        body: fd,
      }).then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: res.statusText }));
          throw new Error(err.message || 'Failed to create document');
        }
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rams-work-lines'] });
      queryClient.invalidateQueries({ queryKey: ['rams-work-line', workLineSlug] });
      queryClient.invalidateQueries({ queryKey: ['rams-stats'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate();
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="New Document"
      subtitle={workLineName}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon={<Upload size={14} />}
            loading={createMutation.isPending}
            disabled={!title.trim()}
            onClick={() => { const form = document.getElementById('new-doc-form') as HTMLFormElement; form?.requestSubmit(); }}
          >
            Create Document
          </Button>
        </>
      }
    >
      <form id="new-doc-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="e.g. Scaffolding Erection Method Statement"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="Brief description..."
            className="w-full px-3 py-2.5 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Contractor</label>
            <select value={contractor} onChange={e => setContractor(e.target.value)} className={inputCls}>
              <option value="">Select...</option>
              {CONTRACTORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Zone</label>
            <select value={zone} onChange={e => setZone(e.target.value)} className={inputCls}>
              <option value="">Select...</option>
              {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Due Date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>
            Attach File <span className="text-text-disabled">(optional, max 50MB)</span>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.zip"
            className="w-full text-[13px] text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-[var(--radius-sm)] file:border-0 file:text-[11px] file:font-medium file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
          />
        </div>

        {createMutation.isError && (
          <p className="text-[11px] text-danger-600">{(createMutation.error as Error).message}</p>
        )}
      </form>
    </Modal>
  );
}
