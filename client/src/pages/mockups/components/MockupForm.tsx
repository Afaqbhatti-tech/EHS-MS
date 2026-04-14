import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, UserPlus, ShieldCheck } from 'lucide-react';
import type { Mockup, FilterOptions, MockupPersonnelItem, MockupApproverItem } from '../hooks/useMockups';

interface Props {
  mockup?: Mockup | null;
  filterOptions: FilterOptions | null;
  onSubmit: (data: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
}

const MOCKUP_TYPES = ['Physical Mock-Up', 'Procedural Mock-Up', 'Quality Mock-Up', 'Safety Mock-Up', 'Combined'];
const APPROVER_TYPES = ['Client Representative', 'Consultant Representative', 'Contractor Supervisor', 'Internal Safety Officer', 'Other'];

export default function MockupForm({ mockup, filterOptions, onSubmit, onClose }: Props) {
  const isEdit = !!mockup;

  const [title, setTitle] = useState(mockup?.title || '');
  const [description, setDescription] = useState(mockup?.description || '');
  const [mockupType, setMockupType] = useState(mockup?.mockup_type || '');
  const [area, setArea] = useState(mockup?.area || '');
  const [zone, setZone] = useState(mockup?.zone || '');
  const [phase, setPhase] = useState('');
  const [customPhase, setCustomPhase] = useState('');
  const [trimLine, setTrimLine] = useState(mockup?.trim_line || '');
  const [site, setSite] = useState(mockup?.site || '');
  const [project, setProject] = useState(mockup?.project || '');
  const [contractor, setContractor] = useState(mockup?.contractor || '');
  const [supervisorName, setSupervisorName] = useState(mockup?.supervisor_name || '');
  const [priority, setPriority] = useState(mockup?.priority || 'Medium');
  const [mockupDate, setMockupDate] = useState(mockup?.mockup_date || '');
  const [plannedStart, setPlannedStart] = useState(mockup?.planned_start_date || '');
  const [plannedEnd, setPlannedEnd] = useState(mockup?.planned_end_date || '');
  const [notes, setNotes] = useState('');
  const [generalRemarks, setGeneralRemarks] = useState('');
  const [ramsDocId, setRamsDocId] = useState(mockup?.rams_document?.id || '');
  const [ramsVersionId, setRamsVersionId] = useState(mockup?.rams_version?.id || '');
  const [personnel, setPersonnel] = useState<MockupPersonnelItem[]>([]);
  const [approvers, setApprovers] = useState<MockupApproverItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mockup) {
      const phaseVal = mockup.phase || '';
      const knownPhases = filterOptions?.phases || [];
      if (phaseVal && !knownPhases.includes(phaseVal)) {
        setPhase('__other__');
        setCustomPhase(phaseVal);
      } else {
        setPhase(phaseVal);
      }
      setPersonnel(mockup.personnel?.length ? mockup.personnel : []);
      setApprovers(mockup.approvers?.length ? mockup.approvers : []);
    }
  }, [mockup, filterOptions]);

  const selectedRamsDoc = useMemo(() => filterOptions?.rams_documents?.find(d => d.id === ramsDocId), [ramsDocId, filterOptions]);
  const ramsVersions = selectedRamsDoc?.versions || [];

  const addPersonnel = () => setPersonnel(prev => [...prev, { person_name: '', designation: '', company: '', user_id: null, source_type: 'manual' }]);
  const removePersonnel = (idx: number) => setPersonnel(prev => prev.filter((_, i) => i !== idx));
  const updatePersonnel = (idx: number, field: keyof MockupPersonnelItem, value: string) => {
    setPersonnel(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const addApprover = () => setApprovers(prev => [...prev, { name: '', designation: '', approver_type: '', approval_status: 'Pending', approval_date: null }]);
  const removeApprover = (idx: number) => setApprovers(prev => prev.filter((_, i) => i !== idx));
  const updateApprover = (idx: number, field: keyof MockupApproverItem, value: string) => {
    setApprovers(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!ramsDocId) { setError('Linked RAMS document is required'); return; }

    setSaving(true);
    setError(null);
    try {
      const finalPhase = phase === '__other__' ? customPhase : phase;
      await onSubmit({
        title: title.trim(),
        description: description || null,
        mockup_type: mockupType || null,
        area: area || null,
        zone: zone || null,
        phase: finalPhase || null,
        trim_line: trimLine || null,
        site: site || null,
        project: project || null,
        contractor: contractor || null,
        supervisor_name: supervisorName || null,
        rams_document_id: ramsDocId || null,
        rams_version_id: ramsVersionId || null,
        priority,
        mockup_date: mockupDate || null,
        planned_start_date: plannedStart || null,
        planned_end_date: plannedEnd || null,
        notes: notes || null,
        general_remarks: generalRemarks || null,
        personnel: personnel.filter(p => p.person_name.trim()),
        approvers_list: approvers.filter(a => a.name.trim()),
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const labelCls = 'block text-[12px] font-medium text-text-secondary mb-1';
  const inputCls = 'w-full h-9 px-3 text-[13px] bg-surface border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 transition-all';
  const selectCls = inputCls + ' appearance-none cursor-pointer';
  const textareaCls = 'w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-[var(--radius-md)] text-text-primary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 resize-none';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-surface shadow-xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface-sunken shrink-0">
          <h2 className="text-[15px] font-bold text-text-primary">{isEdit ? 'Edit Mock-Up' : 'New Mock-Up'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surface transition-colors text-text-tertiary"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">
          {error && <div className="p-3 text-[12px] bg-danger-50 border border-danger-200 text-danger-700 rounded-[var(--radius-md)]">{error}</div>}

          {/* Section A: Basic Information */}
          <fieldset className="space-y-3">
            <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider pb-1 border-b border-border">Basic Mock-Up Information</legend>
            {isEdit && (
              <div>
                <label className={labelCls}>Mock-Up ID</label>
                <input value={mockup?.ref_number || ''} readOnly className={inputCls + ' bg-surface-sunken cursor-default'} />
              </div>
            )}
            <div>
              <label className={labelCls}>Mock-Up Title / Name *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required minLength={5} placeholder="e.g. Foundation Waterproofing Mock-Up" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Mock-Up Type</label>
                <select value={mockupType} onChange={e => setMockupType(e.target.value)} className={selectCls}>
                  <option value="">Select type...</option>
                  {MOCKUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className={selectCls}>
                  {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Description / Activity Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe the mock-up activity..." className={textareaCls} />
            </div>
          </fieldset>

          {/* Linked RAMS (mandatory) */}
          <fieldset className="space-y-3">
            <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider pb-1 border-b border-border">Linked RAMS Document *</legend>
            <div>
              <label className={labelCls}>RAMS Document *</label>
              <select value={ramsDocId} onChange={e => { setRamsDocId(e.target.value); setRamsVersionId(''); }} required className={selectCls + (!ramsDocId ? ' border-amber-300' : '')}>
                <option value="">Select RAMS document...</option>
                {(filterOptions?.rams_documents || []).map(d => (
                  <option key={d.id} value={d.id}>{d.ref_number} — {d.title}</option>
                ))}
              </select>
              {!ramsDocId && <p className="text-[11px] text-amber-600 mt-1">Every mock-up must be linked to a RAMS document</p>}
            </div>
            {ramsDocId && ramsVersions.length > 0 && (
              <div>
                <label className={labelCls}>RAMS Version / Revision</label>
                <select value={ramsVersionId} onChange={e => setRamsVersionId(e.target.value)} className={selectCls}>
                  <option value="">Select version...</option>
                  {ramsVersions.map(v => <option key={v.id} value={v.id}>v{v.version_number} — {v.file_name}</option>)}
                </select>
              </div>
            )}
          </fieldset>

          {/* Location / Tagging */}
          <fieldset className="space-y-3">
            <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider pb-1 border-b border-border">Trim Line / Zone / Phase</legend>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Trim Line</label>
                <input value={trimLine} onChange={e => setTrimLine(e.target.value)} placeholder="e.g. TL-4" className={inputCls} list="trimlines-list" />
                <datalist id="trimlines-list">{(filterOptions?.trim_lines || []).map(t => <option key={t} value={t} />)}</datalist>
              </div>
              <div>
                <label className={labelCls}>Zone</label>
                <input value={zone} onChange={e => setZone(e.target.value)} placeholder="Zone" className={inputCls} list="zones-list" />
                <datalist id="zones-list">{(filterOptions?.zones || []).map(z => <option key={z} value={z} />)}</datalist>
              </div>
              <div>
                <label className={labelCls}>Phase</label>
                <select value={phase} onChange={e => setPhase(e.target.value)} className={selectCls}>
                  <option value="">Select...</option>
                  {(filterOptions?.phases || []).map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="__other__">Other...</option>
                </select>
                {phase === '__other__' && <input value={customPhase} onChange={e => setCustomPhase(e.target.value)} placeholder="Custom phase..." className={inputCls + ' mt-1.5'} />}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Area</label>
                <input value={area} onChange={e => setArea(e.target.value)} placeholder="Area / Location" className={inputCls} list="areas-list" />
                <datalist id="areas-list">{(filterOptions?.areas || []).map(a => <option key={a} value={a} />)}</datalist>
              </div>
              <div>
                <label className={labelCls}>Site</label>
                <input value={site} onChange={e => setSite(e.target.value)} placeholder="Site name" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Project</label>
              <input value={project} onChange={e => setProject(e.target.value)} placeholder="Project name" className={inputCls} />
            </div>
          </fieldset>

          {/* Responsibility */}
          <fieldset className="space-y-3">
            <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider pb-1 border-b border-border">Responsibility / Site Info</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Supervisor Name</label>
                <input value={supervisorName} onChange={e => setSupervisorName(e.target.value)} placeholder="Supervisor" className={inputCls} list="supervisors-list" />
                <datalist id="supervisors-list">{(filterOptions?.supervisors || []).map(s => <option key={s} value={s} />)}</datalist>
              </div>
              <div>
                <label className={labelCls}>Contractor Name</label>
                <input value={contractor} onChange={e => setContractor(e.target.value)} placeholder="Contractor" className={inputCls} list="contractors-list" />
                <datalist id="contractors-list">{(filterOptions?.contractors || []).map(c => <option key={c} value={c} />)}</datalist>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Date of Mock-Up</label>
                <input type="date" value={mockupDate} onChange={e => setMockupDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Planned Start</label>
                <input type="date" value={plannedStart} onChange={e => setPlannedStart(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Planned End</label>
                <input type="date" value={plannedEnd} onChange={e => setPlannedEnd(e.target.value)} className={inputCls} />
              </div>
            </div>
          </fieldset>

          {/* Personnel */}
          <fieldset className="space-y-3">
            <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider pb-1 border-b border-border flex items-center gap-2">
              Personnel Involved / Attendance
              <button type="button" onClick={addPersonnel} className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100 transition-colors">
                <UserPlus size={12} /> Add Person
              </button>
            </legend>
            {personnel.length === 0 && <p className="text-[12px] text-text-tertiary italic">No personnel added yet.</p>}
            {personnel.map((p, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2.5 bg-surface-sunken rounded-[var(--radius-md)] border border-border">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <input value={p.person_name} onChange={e => updatePersonnel(idx, 'person_name', e.target.value)} placeholder="Name *" className={inputCls + ' text-[12px] h-8'} />
                  <input value={p.designation || ''} onChange={e => updatePersonnel(idx, 'designation', e.target.value)} placeholder="Designation" className={inputCls + ' text-[12px] h-8'} />
                  <input value={p.company || ''} onChange={e => updatePersonnel(idx, 'company', e.target.value)} placeholder="Company" className={inputCls + ' text-[12px] h-8'} />
                </div>
                <button type="button" onClick={() => removePersonnel(idx)} className="p-1.5 text-danger-500 hover:bg-danger-50 rounded transition-colors mt-0.5"><Trash2 size={14} /></button>
              </div>
            ))}
          </fieldset>

          {/* Approvers */}
          <fieldset className="space-y-3">
            <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider pb-1 border-b border-border flex items-center gap-2">
              Approvers / Signatories
              <button type="button" onClick={addApprover} className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100 transition-colors">
                <ShieldCheck size={12} /> Add Approver
              </button>
            </legend>
            {approvers.length === 0 && <p className="text-[12px] text-text-tertiary italic">No approvers added yet.</p>}
            {approvers.map((a, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2.5 bg-surface-sunken rounded-[var(--radius-md)] border border-border">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input value={a.name} onChange={e => updateApprover(idx, 'name', e.target.value)} placeholder="Name *" className={inputCls + ' text-[12px] h-8'} />
                  <input value={a.designation || ''} onChange={e => updateApprover(idx, 'designation', e.target.value)} placeholder="Designation" className={inputCls + ' text-[12px] h-8'} />
                  {!a.approver_type || (APPROVER_TYPES.includes(a.approver_type) && a.approver_type !== 'Other') ? (
                    <select value={a.approver_type || ''} onChange={e => { if (e.target.value === 'Other') updateApprover(idx, 'approver_type', 'Other'); else updateApprover(idx, 'approver_type', e.target.value); }} className={selectCls + ' text-[12px] h-8'}>
                      <option value="">Approver Type...</option>
                      {APPROVER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <div className="relative">
                      <input value={a.approver_type === 'Other' ? '' : a.approver_type} onChange={e => updateApprover(idx, 'approver_type', e.target.value || 'Other')} placeholder="Type custom role..." className={inputCls + ' text-[12px] h-8 pr-7'} autoFocus />
                      <button type="button" onClick={() => updateApprover(idx, 'approver_type', '')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-danger-500 transition-colors" title="Back to list"><X size={13} /></button>
                    </div>
                  )}
                  <input type="date" value={a.approval_date || ''} onChange={e => updateApprover(idx, 'approval_date', e.target.value)} className={inputCls + ' text-[12px] h-8'} />
                </div>
                <button type="button" onClick={() => removeApprover(idx)} className="p-1.5 text-danger-500 hover:bg-danger-50 rounded transition-colors mt-0.5"><Trash2 size={14} /></button>
              </div>
            ))}
          </fieldset>

          {/* Remarks */}
          <fieldset className="space-y-3">
            <legend className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider pb-1 border-b border-border">Remarks</legend>
            <div>
              <label className={labelCls}>General Remarks</label>
              <textarea value={generalRemarks} onChange={e => setGeneralRemarks(e.target.value)} rows={3} placeholder="General remarks about this mock-up..." className={textareaCls} />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Additional notes..." className={textareaCls} />
            </div>
          </fieldset>
        </form>

        <div className="px-5 py-3.5 border-t border-border bg-surface-sunken flex items-center justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !title.trim() || !ramsDocId} className="px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-xs">
            {saving ? 'Saving...' : isEdit ? 'Update Mock-Up' : 'Create Mock-Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
