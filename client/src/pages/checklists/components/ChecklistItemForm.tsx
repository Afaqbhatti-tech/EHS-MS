import { useState, useEffect } from 'react';
import { X as XIcon } from 'lucide-react';
import type { ChecklistItem, ChecklistCategory } from '../hooks/useChecklists';
import { HEALTH_CONDITIONS, ITEM_STATUSES, CATEGORY_SUBTYPES } from '../config/checklistCategories';

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-text-secondary mb-1">
        {label} {required && <span className="text-danger-500">*</span>}
      </label>
      {children}
    </div>
  );
}

interface Props {
  item: ChecklistItem | null;
  categories: ChecklistCategory[];
  preselectedCategory?: string;
  onSubmit: (data: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
}

export function ChecklistItemForm({ item, categories, preselectedCategory, onSubmit, onClose }: Props) {
  const [form, setForm] = useState({
    category_id: '',
    category_key: '',
    name: '',
    item_type: '',
    plate_number: '',
    serial_number: '',
    make_model: '',
    swl: '',
    certificate_number: '',
    certificate_expiry: '',
    onboarding_date: '',
    last_internal_inspection_date: '',
    next_internal_inspection_date: '',
    health_condition: 'Good',
    visual_condition: '',
    status: 'Active',
    location_area: '',
    assigned_to: '',
    notes: '',
    // Category-specific fields
    manufacture_date: '',
    retirement_date: '',
    extinguisher_type: '',
    capacity_litres: '',
    last_service_date: '',
    next_service_date: '',
    pressure_status: 'Normal',
    fuel_type: '',
    kva_rating: '',
    engine_hours: '',
    // MEWP fields
    mewp_type: '',
    // Custom "Other" fields
    extinguisher_type_custom: '',
    fuel_type_custom: '',
    mewp_type_custom: '',
    ladder_material_custom: '',
    health_condition_custom: '',
    third_party_cert_number: '',
    third_party_cert_expiry: '',
    third_party_inspector: '',
    third_party_company: '',
    service_interval_hours: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setForm({
        category_id: String(item.category_id),
        category_key: item.category_key,
        name: item.name,
        item_type: item.item_type || '',
        plate_number: item.plate_number || '',
        serial_number: item.serial_number || '',
        make_model: item.make_model || '',
        swl: item.swl || '',
        certificate_number: item.certificate_number || '',
        certificate_expiry: item.certificate_expiry || '',
        onboarding_date: item.onboarding_date || '',
        last_internal_inspection_date: item.last_internal_inspection_date || '',
        next_internal_inspection_date: item.next_internal_inspection_date || '',
        health_condition: item.health_condition,
        visual_condition: item.visual_condition || '',
        status: item.status,
        location_area: item.location_area || '',
        assigned_to: item.assigned_to || '',
        notes: item.notes || '',
        manufacture_date: (item as any).manufacture_date || '',
        retirement_date: (item as any).retirement_date || '',
        extinguisher_type: (item as any).extinguisher_type || '',
        capacity_litres: (item as any).capacity_litres ? String((item as any).capacity_litres) : '',
        last_service_date: (item as any).last_service_date || '',
        next_service_date: (item as any).next_service_date || '',
        pressure_status: (item as any).pressure_status || 'Normal',
        fuel_type: (item as any).fuel_type || '',
        kva_rating: (item as any).kva_rating ? String((item as any).kva_rating) : '',
        engine_hours: (item as any).engine_hours ? String((item as any).engine_hours) : '',
        mewp_type: item.mewp_type || '',
        third_party_cert_number: item.third_party_cert_number || '',
        third_party_cert_expiry: item.third_party_cert_expiry || '',
        third_party_inspector: item.third_party_inspector || '',
        third_party_company: item.third_party_company || '',
        service_interval_hours: item.service_interval_hours ? String(item.service_interval_hours) : '',
      });
    } else if (preselectedCategory) {
      const cat = categories.find(c => c.key === preselectedCategory);
      if (cat) {
        setForm(prev => ({ ...prev, category_id: String(cat.id), category_key: cat.key }));
      }
    }
  }, [item, preselectedCategory, categories]);

  const selectedCategory = categories.find(c => String(c.id) === form.category_id);

  const handleCategoryChange = (catId: string) => {
    const cat = categories.find(c => String(c.id) === catId);
    setForm(prev => ({ ...prev, category_id: catId, category_key: cat?.key || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data: Record<string, unknown> = { ...form };
      // Resolve "Other" custom values
      if (form.extinguisher_type === '__other__') data.extinguisher_type = form.extinguisher_type_custom?.trim() || null;
      if (form.fuel_type === '__other__') data.fuel_type = form.fuel_type_custom?.trim() || null;
      if (form.mewp_type === '__other__') data.mewp_type = form.mewp_type_custom?.trim() || null;
      if (form.visual_condition === '__other__') data.visual_condition = form.ladder_material_custom?.trim() || null;
      if (form.health_condition === '__other__') data.health_condition = form.health_condition_custom?.trim() || 'Good';
      delete data.extinguisher_type_custom; delete data.fuel_type_custom;
      delete data.mewp_type_custom; delete data.ladder_material_custom; delete data.health_condition_custom;
      // Convert numeric string fields
      if (data.capacity_litres) data.capacity_litres = parseFloat(form.capacity_litres);
      if (data.kva_rating) data.kva_rating = parseFloat(form.kva_rating);
      if (data.engine_hours) data.engine_hours = parseFloat(form.engine_hours);
      data.category_id = Number(form.category_id);
      // Remove empty strings
      Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
      data.category_id = Number(form.category_id);
      data.category_key = form.category_key;
      data.name = form.name;
      data.health_condition = data.health_condition || form.health_condition;
      data.status = form.status;
      await onSubmit(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-md)] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all";

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel right-0 w-[520px] max-w-full animate-slideInRight">
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border" style={{ borderTop: '4px solid var(--color-primary-500)' }}>
          <h2 className="text-[16px] font-bold text-text-primary">
            {item ? 'Edit Item' : 'Add New Item'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 overscroll-contain p-6 space-y-5">
          {error && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-[var(--radius-md)] text-[13px] text-danger-700">{error}</div>
          )}

          {/* Category & Identity */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Category & Identity</p>
            {!item && (
              <Field label="Category" required>
                <select value={form.category_id} onChange={e => handleCategoryChange(e.target.value)} className={inputCls} required>
                  <option value="">Select category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.label} — {c.full_label}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Item Name" required>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} required placeholder="e.g. Scissor Lift #3" />
            </Field>
            <Field label="Type / Sub-type">
              {CATEGORY_SUBTYPES[form.category_key] ? (
                <select value={form.item_type} onChange={e => setForm(p => ({ ...p, item_type: e.target.value }))} className={inputCls}>
                  <option value="">Select type...</option>
                  {CATEGORY_SUBTYPES[form.category_key].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : (
                <input value={form.item_type} onChange={e => setForm(p => ({ ...p, item_type: e.target.value }))} className={inputCls} placeholder="e.g. Scissor Lift, Boom Lift" />
              )}
            </Field>
          </div>

          {/* Conditional fields based on category */}
          {selectedCategory && (selectedCategory.has_plate || selectedCategory.has_swl || selectedCategory.has_cert) && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Equipment Details</p>
              {selectedCategory.has_plate && (
                <Field label="Plate Number">
                  <input value={form.plate_number} onChange={e => setForm(p => ({ ...p, plate_number: e.target.value }))} className={inputCls} />
                </Field>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Serial Number">
                  <input value={form.serial_number} onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Make / Model">
                  <input value={form.make_model} onChange={e => setForm(p => ({ ...p, make_model: e.target.value }))} className={inputCls} />
                </Field>
              </div>
              {selectedCategory.has_swl && (
                <Field label="Safe Working Load (SWL)">
                  <input value={form.swl} onChange={e => setForm(p => ({ ...p, swl: e.target.value }))} className={inputCls} placeholder="e.g. 500 kg" />
                </Field>
              )}
              {selectedCategory.has_cert && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Certificate Number">
                    <input value={form.certificate_number} onChange={e => setForm(p => ({ ...p, certificate_number: e.target.value }))} className={inputCls} />
                  </Field>
                  <Field label="Certificate Expiry">
                    <input type="date" value={form.certificate_expiry} onChange={e => setForm(p => ({ ...p, certificate_expiry: e.target.value }))} className={inputCls} />
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* For categories without special fields, still show serial/make */}
          {selectedCategory && !selectedCategory.has_plate && !selectedCategory.has_swl && !selectedCategory.has_cert && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Equipment Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Serial Number">
                  <input value={form.serial_number} onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Make / Model">
                  <input value={form.make_model} onChange={e => setForm(p => ({ ...p, make_model: e.target.value }))} className={inputCls} />
                </Field>
              </div>
            </div>
          )}

          {/* Category-specific fields */}
          {selectedCategory && form.category_key === 'full_body_harness' && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Harness Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Manufacture Date">
                  <input type="date" value={form.manufacture_date} onChange={e => {
                    const mfg = e.target.value;
                    let ret = form.retirement_date;
                    if (mfg) {
                      const d = new Date(mfg);
                      d.setFullYear(d.getFullYear() + 10);
                      ret = d.toISOString().split('T')[0];
                    }
                    setForm(p => ({ ...p, manufacture_date: mfg, retirement_date: ret }));
                  }} className={inputCls} />
                </Field>
                <Field label="Retirement Date">
                  <input type="date" value={form.retirement_date} onChange={e => setForm(p => ({ ...p, retirement_date: e.target.value }))} className={inputCls} />
                  <p className="text-[10px] text-text-tertiary mt-1">Standard 10-year retirement from manufacture date</p>
                </Field>
              </div>
            </div>
          )}

          {selectedCategory && form.category_key === 'fire_extinguisher' && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Extinguisher Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Extinguisher Type">
                  <select value={form.extinguisher_type} onChange={e => { setForm(p => ({ ...p, extinguisher_type: e.target.value })); if (e.target.value !== '__other__') setForm(p => ({ ...p, extinguisher_type_custom: '' })); }} className={inputCls}>
                    <option value="">Select type...</option>
                    {['CO2', 'Dry Powder', 'Foam', 'Water', 'Wet Chemical'].map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="__other__">Other</option>
                  </select>
                  {form.extinguisher_type === '__other__' && (
                    <input type="text" value={form.extinguisher_type_custom} onChange={e => setForm(p => ({ ...p, extinguisher_type_custom: e.target.value }))} placeholder="Enter extinguisher type..." className={`${inputCls} mt-1.5`} autoFocus />
                  )}
                </Field>
                <Field label="Capacity (Litres)">
                  <input type="number" step="0.1" value={form.capacity_litres} onChange={e => setForm(p => ({ ...p, capacity_litres: e.target.value }))} className={inputCls} placeholder="e.g. 6.0" />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Last Annual Service">
                  <input type="date" value={form.last_service_date} onChange={e => setForm(p => ({ ...p, last_service_date: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Next Service Date">
                  <input type="date" value={form.next_service_date} onChange={e => setForm(p => ({ ...p, next_service_date: e.target.value }))} className={inputCls} />
                </Field>
              </div>
            </div>
          )}

          {selectedCategory && form.category_key === 'generator' && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Generator Details</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Fuel Type">
                  <select value={form.fuel_type} onChange={e => { setForm(p => ({ ...p, fuel_type: e.target.value })); if (e.target.value !== '__other__') setForm(p => ({ ...p, fuel_type_custom: '' })); }} className={inputCls}>
                    <option value="">Select...</option>
                    {['Diesel', 'Petrol', 'LPG'].map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="__other__">Other</option>
                  </select>
                  {form.fuel_type === '__other__' && (
                    <input type="text" value={form.fuel_type_custom} onChange={e => setForm(p => ({ ...p, fuel_type_custom: e.target.value }))} placeholder="Enter fuel type..." className={`${inputCls} mt-1.5`} autoFocus />
                  )}
                </Field>
                <Field label="kVA Rating">
                  <input type="number" step="0.1" value={form.kva_rating} onChange={e => setForm(p => ({ ...p, kva_rating: e.target.value }))} className={inputCls} placeholder="e.g. 50" />
                </Field>
                <Field label="Engine Hours">
                  <input type="number" step="0.1" value={form.engine_hours} onChange={e => setForm(p => ({ ...p, engine_hours: e.target.value }))} className={inputCls} placeholder="e.g. 1250" />
                </Field>
              </div>
            </div>
          )}

          {selectedCategory && form.category_key === 'mewp' && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">MEWP Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Equipment Type" required>
                  <select value={form.mewp_type} onChange={e => { setForm(p => ({ ...p, mewp_type: e.target.value })); if (e.target.value !== '__other__') setForm(p => ({ ...p, mewp_type_custom: '' })); }} className={inputCls}>
                    <option value="">Select type...</option>
                    {['forklift', 'scissor_lift', 'telehandler', 'man_lift', 'boom_lift'].map(t => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                    <option value="__other__">Other</option>
                  </select>
                  {form.mewp_type === '__other__' && (
                    <input type="text" value={form.mewp_type_custom} onChange={e => setForm(p => ({ ...p, mewp_type_custom: e.target.value }))} placeholder="Enter equipment type..." className={`${inputCls} mt-1.5`} autoFocus />
                  )}
                </Field>
                <Field label="Engine Hours">
                  <input type="number" step="0.5" value={form.engine_hours} onChange={e => setForm(p => ({ ...p, engine_hours: e.target.value }))} className={inputCls} placeholder="e.g. 1250" />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="3rd Party Cert Number">
                  <input type="text" value={form.third_party_cert_number} onChange={e => setForm(p => ({ ...p, third_party_cert_number: e.target.value }))} className={inputCls} placeholder="Certificate no." />
                </Field>
                <Field label="3rd Party Cert Expiry">
                  <input type="date" value={form.third_party_cert_expiry} onChange={e => setForm(p => ({ ...p, third_party_cert_expiry: e.target.value }))} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="3rd Party Inspector">
                  <input type="text" value={form.third_party_inspector} onChange={e => setForm(p => ({ ...p, third_party_inspector: e.target.value }))} className={inputCls} placeholder="Inspector name" />
                </Field>
                <Field label="Inspector Company">
                  <input type="text" value={form.third_party_company} onChange={e => setForm(p => ({ ...p, third_party_company: e.target.value }))} className={inputCls} placeholder="Company" />
                </Field>
              </div>
              <Field label="Next Service Date">
                <input type="date" value={form.next_service_date} onChange={e => setForm(p => ({ ...p, next_service_date: e.target.value }))} className={inputCls} />
              </Field>
            </div>
          )}

          {selectedCategory && form.category_key === 'ladder' && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Ladder Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Material">
                  <select value={form.visual_condition} onChange={e => { setForm(p => ({ ...p, visual_condition: e.target.value })); if (e.target.value !== '__other__') setForm(p => ({ ...p, ladder_material_custom: '' })); }} className={inputCls}>
                    <option value="">Select...</option>
                    {['Aluminium', 'Fibreglass', 'Timber'].map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="__other__">Other</option>
                  </select>
                  {form.visual_condition === '__other__' && (
                    <input type="text" value={form.ladder_material_custom} onChange={e => setForm(p => ({ ...p, ladder_material_custom: e.target.value }))} placeholder="Enter material..." className={`${inputCls} mt-1.5`} autoFocus />
                  )}
                </Field>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Dates & Inspection</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Onboarding Date">
                <input type="date" value={form.onboarding_date} onChange={e => setForm(p => ({ ...p, onboarding_date: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Last Inspection Date">
                <input type="date" value={form.last_internal_inspection_date} onChange={e => setForm(p => ({ ...p, last_internal_inspection_date: e.target.value }))} className={inputCls} />
              </Field>
            </div>
            <Field label="Next Inspection Date">
              <input type="date" value={form.next_internal_inspection_date} onChange={e => setForm(p => ({ ...p, next_internal_inspection_date: e.target.value }))} className={inputCls} />
              <p className="text-[10px] text-text-tertiary mt-1">Auto-calculated if left empty</p>
            </Field>
          </div>

          {/* Condition & Status */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Condition & Status</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Health Condition">
                <select value={form.health_condition} onChange={e => { setForm(p => ({ ...p, health_condition: e.target.value })); if (e.target.value !== '__other__') setForm(p => ({ ...p, health_condition_custom: '' })); }} className={inputCls}>
                  {HEALTH_CONDITIONS.map(h => <option key={h} value={h}>{h}</option>)}
                  <option value="__other__">Other</option>
                </select>
                {form.health_condition === '__other__' && (
                  <input type="text" value={form.health_condition_custom} onChange={e => setForm(p => ({ ...p, health_condition_custom: e.target.value }))} placeholder="Enter health condition..." className={`${inputCls} mt-1.5`} autoFocus />
                )}
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inputCls}>
                  {ITEM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Visual Condition Notes">
              <textarea value={form.visual_condition} onChange={e => setForm(p => ({ ...p, visual_condition: e.target.value }))} className={inputCls} rows={2} placeholder="Any visual observations..." />
            </Field>
          </div>

          {/* Location & Assignment */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Location & Assignment</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Location / Area">
                <input value={form.location_area} onChange={e => setForm(p => ({ ...p, location_area: e.target.value }))} className={inputCls} placeholder="e.g. Zone A, Workshop" />
              </Field>
              <Field label="Assigned To">
                <input value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} className={inputCls} placeholder="Person or team" />
              </Field>
            </div>
          </div>

          {/* Notes */}
          <Field label="Notes">
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputCls} rows={3} placeholder="Additional remarks..." />
          </Field>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !form.category_id || !form.name}
              className="px-5 py-2 text-[13px] font-semibold text-white bg-primary-600 rounded-[var(--radius-md)] hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-xs">
              {submitting ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
