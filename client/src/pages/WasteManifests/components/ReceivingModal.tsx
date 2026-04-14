import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import type { Manifest } from '../hooks/useManifests';

interface Props {
  open: boolean;
  onClose: () => void;
  manifest: Manifest;
  onConfirm: (id: number, data: Record<string, unknown>) => Promise<unknown>;
}

export default function ReceivingModal({ open, onClose, manifest, onConfirm }: Props) {
  const [form, setForm] = useState({
    facility_name: manifest.facility_name || '',
    facility_license_no: manifest.facility_license_no || '',
    receiving_person: '',
    receiving_date: new Date().toISOString().split('T')[0],
    receiving_time: '',
    final_notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.facility_name || !form.receiving_person || !form.receiving_date) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onConfirm(manifest.id, form);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const labelClass = 'block text-[11px] font-medium text-text-secondary mb-1';
  const inputClass = 'w-full h-[34px] px-2.5 text-[12px] border border-border rounded-[var(--radius-sm)] bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-300';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Confirm Receiving — ${manifest.manifest_code}`}
      subtitle="Record facility receipt of waste"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-[12px] font-medium text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-[12px] font-medium text-white bg-teal-600 rounded-[var(--radius-sm)] hover:bg-teal-700 transition-colors disabled:opacity-50">
            {saving ? 'Confirming...' : 'Confirm Receiving →'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="p-2.5 rounded bg-red-50 border border-red-200 text-[12px] text-red-700">{error}</div>}
        <div>
          <label className={labelClass}>Facility Name *</label>
          <input type="text" value={form.facility_name} onChange={e => set('facility_name', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Facility License No.</label>
          <input type="text" value={form.facility_license_no} onChange={e => set('facility_license_no', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Receiving Person *</label>
          <input type="text" value={form.receiving_person} onChange={e => set('receiving_person', e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Receiving Date *</label>
            <input type="date" value={form.receiving_date} onChange={e => set('receiving_date', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Receiving Time</label>
            <input type="time" value={form.receiving_time} onChange={e => set('receiving_time', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea value={form.final_notes} onChange={e => set('final_notes', e.target.value)} className="w-full px-2.5 py-2 text-[12px] border border-border rounded-[var(--radius-sm)] bg-white text-text-primary resize-none" rows={2} />
        </div>
      </div>
    </Modal>
  );
}
