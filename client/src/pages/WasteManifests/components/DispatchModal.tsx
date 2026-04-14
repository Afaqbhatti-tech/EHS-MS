import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { VEHICLE_TYPES } from '../../../config/wasteManifestConfig';
import SelectWithOther from '../../../components/ui/SelectWithOther';
import type { Manifest } from '../hooks/useManifests';

interface Props {
  open: boolean;
  onClose: () => void;
  manifest: Manifest;
  onConfirm: (id: number, data: Record<string, unknown>) => Promise<unknown>;
}

export default function DispatchModal({ open, onClose, manifest, onConfirm }: Props) {
  const [form, setForm] = useState({
    transporter_name: manifest.transporter_name || '',
    transporter_license_no: manifest.transporter_license_no || '',
    driver_name: manifest.driver_name || '',
    driver_contact: manifest.driver_contact || '',
    vehicle_number: manifest.vehicle_number || '',
    vehicle_type: manifest.vehicle_type || '',
    handover_by: manifest.responsible_person || '',
    handover_date: new Date().toISOString().split('T')[0],
    dispatch_date: new Date().toISOString().split('T')[0],
    transport_start_date: '',
    expected_delivery_date: '',
    handover_note: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.transporter_name || !form.driver_name || !form.vehicle_number || !form.handover_by || !form.handover_date) {
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
      title={`Confirm Dispatch — ${manifest.manifest_code}`}
      subtitle="Record transporter handover details"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-[12px] font-medium text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-[12px] font-medium text-white bg-amber-600 rounded-[var(--radius-sm)] hover:bg-amber-700 transition-colors disabled:opacity-50">
            {saving ? 'Confirming...' : 'Confirm Dispatch →'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Waste summary */}
        <div className="p-3 rounded-[var(--radius-sm)] bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
          <strong>{manifest.waste_type}</strong> · {manifest.waste_category} · {Number(manifest.quantity).toLocaleString()} {manifest.unit}
          <p className="text-[11px] mt-1 opacity-75">Once dispatched, this cannot be undone without raising a status change.</p>
        </div>

        {error && <div className="p-2.5 rounded bg-red-50 border border-red-200 text-[12px] text-red-700">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Transporter Name *</label>
            <input type="text" value={form.transporter_name} onChange={e => set('transporter_name', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>License No.</label>
            <input type="text" value={form.transporter_license_no} onChange={e => set('transporter_license_no', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Driver Name *</label>
            <input type="text" value={form.driver_name} onChange={e => set('driver_name', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Vehicle Number *</label>
            <input type="text" value={form.vehicle_number} onChange={e => set('vehicle_number', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Vehicle Type</label>
            <SelectWithOther
              options={VEHICLE_TYPES}
              value={form.vehicle_type}
              onChange={v => set('vehicle_type', v)}
              placeholder="Select..."
              selectClassName={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Handover By *</label>
            <input type="text" value={form.handover_by} onChange={e => set('handover_by', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Handover Date *</label>
            <input type="date" value={form.handover_date} onChange={e => set('handover_date', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Expected Delivery</label>
            <input type="date" value={form.expected_delivery_date} onChange={e => set('expected_delivery_date', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Handover Note</label>
          <textarea value={form.handover_note} onChange={e => set('handover_note', e.target.value)} className="w-full px-2.5 py-2 text-[12px] border border-border rounded-[var(--radius-sm)] bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-300 resize-none" rows={2} />
        </div>
      </div>
    </Modal>
  );
}
