import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { ArrowLeft, Upload } from 'lucide-react';
import Button from '../../components/ui/Button';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface WorkLineOption {
  id: string;
  name: string;
  slug: string;
  color: string;
}

const CONTRACTORS = ['CCCC', 'CCC Rail', 'Artal', 'FFT Direct'];
const ZONES = [
  'Zone A', 'Zone B', 'Zone C',
  'Station 1', 'Station 2', 'Station 3', 'Station 4', 'Station 5',
  'Chassis Line', 'Door Line', 'Trim Line',
  'Outwork Area', 'Logistics Gate', 'Workshop',
];

const inputCls = 'w-full h-[42px] px-3 bg-surface border border-border rounded-[var(--radius-sm)] text-[14px] text-text-primary placeholder:text-text-tertiary outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-100';
const labelCls = 'block text-[13px] font-medium text-text-secondary mb-1.5';

export default function NewRamsDocumentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [workLineId, setWorkLineId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contractor, setContractor] = useState('');
  const [zone, setZone] = useState('');
  const [dueDate, setDueDate] = useState('');

  const { data: workLines } = useQuery<WorkLineOption[]>({
    queryKey: ['rams-work-lines'],
    queryFn: () => api.get('/rams/work-lines'),
  });

  const selectedLine = workLines?.find(wl => wl.id === workLineId);

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
      queryClient.invalidateQueries({ queryKey: ['rams-stats'] });
      if (selectedLine) {
        queryClient.invalidateQueries({ queryKey: ['rams-work-line', selectedLine.slug] });
        navigate(`/rams-board/${selectedLine.slug}`);
      } else {
        navigate('/rams-board');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workLineId || !title.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3 pb-5 border-b border-border">
        <button
          onClick={() => navigate('/rams-board')}
          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface-sunken text-text-secondary transition-colors duration-150"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-[20px] font-bold text-text-primary">New RAMS Document</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface rounded-[var(--radius-lg)] border border-border p-6 space-y-4">
        <div>
          <label className={labelCls}>Work Line *</label>
          <select value={workLineId} onChange={e => setWorkLineId(e.target.value)} required className={inputCls}>
            <option value="">Select work line...</option>
            {workLines?.map(wl => (
              <option key={wl.id} value={wl.id}>{wl.name}</option>
            ))}
          </select>
        </div>

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

        <div className="grid grid-cols-2 gap-3">
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

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => navigate('/rams-board')}>Cancel</Button>
          <Button
            variant="primary"
            icon={<Upload size={14} />}
            loading={createMutation.isPending}
            disabled={!workLineId || !title.trim()}
            type="submit"
          >
            Create Document
          </Button>
        </div>
      </form>
    </div>
  );
}
