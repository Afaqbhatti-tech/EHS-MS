import React, { useState, useEffect, useRef } from 'react';
import { DOCUMENT_TYPES, DOCUMENT_CATEGORIES, CONFIDENTIALITY_LEVELS, PRIORITIES, LANGUAGES } from '../../../config/documentControlConfig';
import type { DcDocument } from '../hooks/useDocuments';

interface Props {
  open: boolean;
  onClose: () => void;
  editDoc: DcDocument | null;
  onSubmit: (formData: FormData) => Promise<void>;
  onUpdate: (id: number, data: Record<string, unknown>) => Promise<void>;
}

const emptyForm = {
  document_title: '', document_number: '', short_title: '',
  document_type: '', document_category: '', description: '',
  owner: '', owner_id: '', prepared_by: '', responsible_person: '', department: '',
  site: '', project: '', area: '', zone: '', contractor_id: '',
  confidentiality_level: 'Internal', priority: 'Medium', language: 'English', tags: '',
  revision_number: 'Rev 00', issue_date: '', effective_date: '',
  next_review_date: '', expiry_date: '', change_summary: '',
};

export default function DocumentForm({ open, onClose, editDoc, onSubmit, onUpdate }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sections, setSections] = useState({ a: true, b: true, c: false, d: true, e: true });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editDoc) {
      setForm({
        document_title: editDoc.document_title || '',
        document_number: editDoc.document_number || '',
        short_title: editDoc.short_title || '',
        document_type: editDoc.document_type || '',
        document_category: editDoc.document_category || '',
        description: editDoc.description || '',
        owner: editDoc.owner || '',
        owner_id: editDoc.owner_id || '',
        prepared_by: editDoc.prepared_by || '',
        responsible_person: editDoc.responsible_person || '',
        department: editDoc.department || '',
        site: editDoc.site || '',
        project: editDoc.project || '',
        area: editDoc.area || '',
        zone: editDoc.zone || '',
        contractor_id: editDoc.contractor_id ? String(editDoc.contractor_id) : '',
        confidentiality_level: editDoc.confidentiality_level || 'Internal',
        priority: editDoc.priority || 'Medium',
        language: editDoc.language || 'English',
        tags: (editDoc.tags || []).join(', '),
        revision_number: 'Rev 00', issue_date: '', effective_date: '',
        next_review_date: '', expiry_date: '', change_summary: '',
      });
    } else {
      setForm(emptyForm);
    }
    setFile(null);
    setError('');
  }, [editDoc, open]);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const toggle = (s: keyof typeof sections) => setSections(prev => ({ ...prev, [s]: !prev[s] }));

  const handleSubmit = async () => {
    if (!form.document_title.trim()) { setError('Title is required'); return; }
    if (!form.document_type) { setError('Document type is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editDoc) {
        const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        await onUpdate(editDoc.id, { ...form, tags, contractor_id: form.contractor_id || null });
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
          if (k === 'tags') {
            const tags = v ? v.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
            tags.forEach((tag: string) => fd.append('tags[]', tag));
          } else if (v) {
            fd.append(k, v);
          }
        });
        if (file) fd.append('document_file', file);
        await onSubmit(fd);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  if (!open) return null;

  return (
    <>
      <div className="dc-drawer-overlay" onClick={onClose} />
      <div className="dc-drawer">
        <div className="dc-drawer-header">
          <h2>{editDoc ? 'Edit Document' : 'New Document'}</h2>
          <button onClick={onClose} className="dc-drawer-close">✕</button>
        </div>

        <div className="dc-drawer-body">
          {error && <div className="dc-form-error">{error}</div>}

          {/* Section A */}
          <div className="dc-form-section">
            <div className="dc-form-section-header" onClick={() => toggle('a')}>
              <span>Document Identity</span><span>{sections.a ? '▾' : '▸'}</span>
            </div>
            {sections.a && (
              <div className="dc-form-fields">
                <div className="dc-field-full">
                  <label>Document Title *</label>
                  <input value={form.document_title} onChange={e => set('document_title', e.target.value)} placeholder="Enter document title" />
                </div>
                <div className="dc-field-row">
                  <div className="dc-field">
                    <label>Document Number</label>
                    <input value={form.document_number} onChange={e => set('document_number', e.target.value)} placeholder="e.g. RAMS-WAH-2025-018" />
                  </div>
                  <div className="dc-field">
                    <label>Short Title</label>
                    <input value={form.short_title} onChange={e => set('short_title', e.target.value)} />
                  </div>
                </div>
                <div className="dc-field-row">
                  <div className="dc-field">
                    <label>Document Type *</label>
                    <select value={form.document_type} onChange={e => set('document_type', e.target.value)}>
                      <option value="">Select type</option>
                      {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="dc-field">
                    <label>Category</label>
                    <select value={form.document_category} onChange={e => set('document_category', e.target.value)}>
                      <option value="">Select category</option>
                      {DOCUMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="dc-field-full">
                  <label>Description</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
                </div>
              </div>
            )}
          </div>

          {/* Section B */}
          <div className="dc-form-section">
            <div className="dc-form-section-header" onClick={() => toggle('b')}>
              <span>Ownership</span><span>{sections.b ? '▾' : '▸'}</span>
            </div>
            {sections.b && (
              <div className="dc-form-fields">
                <div className="dc-field-row">
                  <div className="dc-field"><label>Owner</label><input value={form.owner} onChange={e => set('owner', e.target.value)} /></div>
                  <div className="dc-field"><label>Prepared By</label><input value={form.prepared_by} onChange={e => set('prepared_by', e.target.value)} /></div>
                </div>
                <div className="dc-field-row">
                  <div className="dc-field"><label>Responsible Person</label><input value={form.responsible_person} onChange={e => set('responsible_person', e.target.value)} /></div>
                  <div className="dc-field"><label>Department</label><input value={form.department} onChange={e => set('department', e.target.value)} /></div>
                </div>
              </div>
            )}
          </div>

          {/* Section C */}
          <div className="dc-form-section">
            <div className="dc-form-section-header" onClick={() => toggle('c')}>
              <span>Scope & Control</span><span>{sections.c ? '▾' : '▸'}</span>
            </div>
            {sections.c && (
              <div className="dc-form-fields">
                <div className="dc-field-row">
                  <div className="dc-field"><label>Site</label><input value={form.site} onChange={e => set('site', e.target.value)} /></div>
                  <div className="dc-field"><label>Project</label><input value={form.project} onChange={e => set('project', e.target.value)} /></div>
                </div>
                <div className="dc-field-row">
                  <div className="dc-field"><label>Area</label><input value={form.area} onChange={e => set('area', e.target.value)} /></div>
                  <div className="dc-field"><label>Zone</label><input value={form.zone} onChange={e => set('zone', e.target.value)} /></div>
                </div>
                <div className="dc-field-row">
                  <div className="dc-field">
                    <label>Confidentiality</label>
                    <select value={form.confidentiality_level} onChange={e => set('confidentiality_level', e.target.value)}>
                      {CONFIDENTIALITY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="dc-field">
                    <label>Priority</label>
                    <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="dc-field-row">
                  <div className="dc-field">
                    <label>Language</label>
                    <select value={form.language} onChange={e => set('language', e.target.value)}>
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="dc-field">
                    <label>Tags (comma-separated)</label>
                    <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="WAH, Lifting, RAMS" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section D - only on create */}
          {!editDoc && (
            <div className="dc-form-section">
              <div className="dc-form-section-header" onClick={() => toggle('d')}>
                <span>First Revision (Rev 00)</span><span>{sections.d ? '▾' : '▸'}</span>
              </div>
              {sections.d && (
                <div className="dc-form-fields">
                  <div className="dc-field-row">
                    <div className="dc-field"><label>Revision Number</label><input value={form.revision_number} onChange={e => set('revision_number', e.target.value)} /></div>
                    <div className="dc-field"><label>Issue Date</label><input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} /></div>
                  </div>
                  <div className="dc-field-row">
                    <div className="dc-field"><label>Effective Date</label><input type="date" value={form.effective_date} onChange={e => set('effective_date', e.target.value)} /></div>
                    <div className="dc-field"><label>Next Review Date</label><input type="date" value={form.next_review_date} onChange={e => set('next_review_date', e.target.value)} /></div>
                  </div>
                  <div className="dc-field-row">
                    <div className="dc-field"><label>Expiry Date</label><input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} /></div>
                    <div className="dc-field" />
                  </div>
                  <div className="dc-field-full">
                    <label>Change Summary</label>
                    <textarea value={form.change_summary} onChange={e => set('change_summary', e.target.value)} rows={2} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section E - File upload, only on create */}
          {!editDoc && (
            <div className="dc-form-section">
              <div className="dc-form-section-header" onClick={() => toggle('e')}>
                <span>File Upload</span><span>{sections.e ? '▾' : '▸'}</span>
              </div>
              {sections.e && (
                <div className="dc-form-fields">
                  <div className="dc-upload-zone"
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => fileRef.current?.click()}>
                    <input ref={fileRef} type="file" style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.dwg"
                      onChange={e => setFile(e.target.files?.[0] || null)} />
                    {file ? (
                      <div className="dc-upload-file">
                        <span>{file.name}</span>
                        <span className="dc-upload-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    ) : (
                      <div className="dc-upload-placeholder">
                        <span>Drop file here or click to browse</span>
                        <span className="dc-upload-hint">PDF, DOC, XLS, PPT, JPG, PNG, ZIP, DWG (max 50MB)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="dc-drawer-footer">
          <button className="dc-btn dc-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="dc-btn dc-btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : editDoc ? 'Update Document' : 'Save as Draft'}
          </button>
        </div>
      </div>
    </>
  );
}
