import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { TREATMENT_METHODS, COMPLIANCE_STATUSES } from '../../../config/wasteManifestConfig';
import SelectWithOther from '../../../components/ui/SelectWithOther';
import type { Manifest } from '../hooks/useManifests';

interface Props {
  open: boolean;
  onClose: () => void;
  manifest: Manifest;
  onConfirm: (id: number, formData: FormData) => Promise<unknown>;
}

export default function DisposalModal({ open, onClose, manifest, onConfirm }: Props) {
  const [form, setForm] = useState({
    treatment_method: manifest.treatment_method || '',
    disposal_certificate_no: '',
    final_destination_status: '',
    manifest_compliance_status: 'Compliant',
    final_notes: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.treatment_method) {
      setError('Treatment method is required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (file) fd.append('disposal_certificate', file);
      await onConfirm(manifest.id, fd);
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
      title={`Confirm Disposal — ${manifest.manifest_code}`}
      subtitle="Record final treatment and complete manifest"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-[12px] font-medium text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface-sunken transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-[12px] font-medium text-white bg-green-600 rounded-[var(--radius-sm)] hover:bg-green-700 transition-colors disabled:opacity-50">
            {saving ? 'Completing...' : 'Complete Manifest →'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="p-2.5 rounded bg-red-50 border border-red-200 text-[12px] text-red-700">{error}</div>}

        <div>
          <label className={labelClass}>Treatment Method *</label>
          <SelectWithOther
            options={TREATMENT_METHODS}
            value={form.treatment_method}
            onChange={v => set('treatment_method', v)}
            placeholder="Select treatment method..."
            selectClassName={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Disposal Certificate No.</label>
          <input type="text" value={form.disposal_certificate_no} onChange={e => set('disposal_certificate_no', e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Compliance Status</label>
          <div className="flex gap-2">
            {COMPLIANCE_STATUSES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => set('manifest_compliance_status', s)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-full border transition-all ${
                  form.manifest_compliance_status === s
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-surface border-border text-text-secondary hover:bg-surface-sunken'
                }`}
              >
                {s === 'Compliant' && '✓ '}{s === 'Non-Compliant' && '✗ '}{s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Upload Disposal Certificate</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="w-full text-[12px] text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-[var(--radius-sm)] file:border file:border-border file:text-[11px] file:font-medium file:bg-surface file:text-text-primary hover:file:bg-surface-sunken"
          />
          {file && <p className="text-[11px] text-text-tertiary mt-1">{file.name}</p>}
        </div>

        <div>
          <label className={labelClass}>Final Notes</label>
          <textarea value={form.final_notes} onChange={e => set('final_notes', e.target.value)} className="w-full px-2.5 py-2 text-[12px] border border-border rounded-[var(--radius-sm)] bg-white text-text-primary resize-none" rows={2} />
        </div>
      </div>
    </Modal>
  );
}
