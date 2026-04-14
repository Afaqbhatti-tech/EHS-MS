/**
 * Inspection checklist configuration.
 * Mirrors backend config/equipment_checklists.php and maps
 * tracker category keys → their inspection checklist items.
 */

export interface ChecklistItem {
  id: string;
  section: string;
  item: string;
  type: 'pass_fail' | 'pass_fail_na';
}

export interface ChecklistResponse {
  id: string;
  item: string;
  section: string;
  answer: 'pass' | 'fail' | 'na' | null;
  note: string;
  required: boolean; // pass_fail items are mandatory
}

// ── Category → Checklist Items ────────────────────────────

const CATEGORY_CHECKLISTS: Record<string, ChecklistItem[]> = {

  forklift: [
    { id: 'fk_1', section: 'Structure & Body', item: 'No visible structural damage or cracks', type: 'pass_fail' },
    { id: 'fk_2', section: 'Structure & Body', item: 'Overhead guard intact and secure', type: 'pass_fail' },
    { id: 'fk_3', section: 'Structure & Body', item: 'Operator cabin clean and clear of obstructions', type: 'pass_fail' },
    { id: 'fk_4', section: 'Forks & Mast', item: 'Fork condition — no cracks, bends or excessive wear', type: 'pass_fail' },
    { id: 'fk_5', section: 'Forks & Mast', item: 'Mast operates smoothly — full up/down cycle', type: 'pass_fail' },
    { id: 'fk_6', section: 'Forks & Mast', item: 'Backrest extension present and secure', type: 'pass_fail_na' },
    { id: 'fk_7', section: 'Hydraulics & Engine', item: 'Hydraulic system — no leaks visible', type: 'pass_fail' },
    { id: 'fk_8', section: 'Hydraulics & Engine', item: 'Battery / fuel level adequate', type: 'pass_fail' },
    { id: 'fk_9', section: 'Hydraulics & Engine', item: 'Engine — no unusual noise or smoke', type: 'pass_fail' },
    { id: 'fk_10', section: 'Controls & Safety', item: 'Steering system responsive', type: 'pass_fail' },
    { id: 'fk_11', section: 'Controls & Safety', item: 'Brakes condition — service and parking', type: 'pass_fail' },
    { id: 'fk_12', section: 'Controls & Safety', item: 'Horn working', type: 'pass_fail' },
    { id: 'fk_13', section: 'Controls & Safety', item: 'Lights working (front and rear)', type: 'pass_fail' },
    { id: 'fk_14', section: 'Controls & Safety', item: 'Reverse alarm working', type: 'pass_fail' },
    { id: 'fk_15', section: 'Controls & Safety', item: 'Seat belt present and working', type: 'pass_fail' },
    { id: 'fk_16', section: 'Tyres & Wheels', item: 'Tyre condition (all wheels)', type: 'pass_fail' },
    { id: 'fk_17', section: 'Documentation', item: 'Load capacity label visible', type: 'pass_fail' },
    { id: 'fk_18', section: 'Documentation', item: 'Operating manual available', type: 'pass_fail_na' },
    { id: 'fk_19', section: 'Safety Equipment', item: 'Fire extinguisher available', type: 'pass_fail_na' },
  ],

  scissor_lift: [
    { id: 'sl_1', section: 'Platform', item: 'Platform condition — no damage or debris', type: 'pass_fail' },
    { id: 'sl_2', section: 'Platform', item: 'Guard rails and chain gates intact', type: 'pass_fail' },
    { id: 'sl_3', section: 'Platform', item: 'Platform floor — no holes or warping', type: 'pass_fail' },
    { id: 'sl_4', section: 'Controls', item: 'Emergency stop working (platform and ground)', type: 'pass_fail' },
    { id: 'sl_5', section: 'Controls', item: 'All controls respond smoothly', type: 'pass_fail' },
    { id: 'sl_6', section: 'Controls', item: 'Ground controls working', type: 'pass_fail' },
    { id: 'sl_7', section: 'Safety Devices', item: 'Tilt indicator / alarm operational', type: 'pass_fail' },
    { id: 'sl_8', section: 'Safety Devices', item: 'Horn working', type: 'pass_fail' },
    { id: 'sl_9', section: 'Safety Devices', item: 'SWL label visible', type: 'pass_fail' },
    { id: 'sl_10', section: 'Safety Devices', item: 'Lanyard anchor points intact', type: 'pass_fail' },
    { id: 'sl_11', section: 'Mechanical', item: 'Hydraulic system — no leaks', type: 'pass_fail' },
    { id: 'sl_12', section: 'Mechanical', item: 'Battery / fuel level adequate', type: 'pass_fail' },
    { id: 'sl_13', section: 'Mechanical', item: 'Brakes condition', type: 'pass_fail' },
    { id: 'sl_14', section: 'Mechanical', item: 'Tyre condition and pressure', type: 'pass_fail' },
    { id: 'sl_15', section: 'Mechanical', item: 'No visible structural damage', type: 'pass_fail' },
    { id: 'sl_16', section: 'Electrical', item: 'Lights working', type: 'pass_fail' },
    { id: 'sl_17', section: 'Documentation', item: 'Valid third-party certificate on site', type: 'pass_fail_na' },
  ],

  man_lift: [
    { id: 'ml_1', section: 'Platform', item: 'Platform condition and guardrails intact', type: 'pass_fail' },
    { id: 'ml_2', section: 'Platform', item: 'Platform gate / entry bar closes properly', type: 'pass_fail' },
    { id: 'ml_3', section: 'Controls', item: 'Emergency stop buttons operational', type: 'pass_fail' },
    { id: 'ml_4', section: 'Controls', item: 'All boom movements smooth and controlled', type: 'pass_fail' },
    { id: 'ml_5', section: 'Safety', item: 'SWL / capacity plate visible', type: 'pass_fail' },
    { id: 'ml_6', section: 'Safety', item: 'Emergency lowering system functional', type: 'pass_fail' },
    { id: 'ml_7', section: 'Safety', item: 'Horn and alarm operational', type: 'pass_fail' },
    { id: 'ml_8', section: 'Mechanical', item: 'Hydraulic system — no leaks', type: 'pass_fail' },
    { id: 'ml_9', section: 'Mechanical', item: 'Outriggers / stabilisers functional', type: 'pass_fail_na' },
    { id: 'ml_10', section: 'Mechanical', item: 'No visible structural damage', type: 'pass_fail' },
    { id: 'ml_11', section: 'Documentation', item: 'Valid inspection certificate on site', type: 'pass_fail_na' },
  ],

  boom_lift: [
    { id: 'bl_1', section: 'Boom', item: 'Boom arm condition — no cracks or damage', type: 'pass_fail' },
    { id: 'bl_2', section: 'Boom', item: 'All boom movements smooth and controlled', type: 'pass_fail' },
    { id: 'bl_3', section: 'Platform', item: 'Platform and guardrails intact', type: 'pass_fail' },
    { id: 'bl_4', section: 'Platform', item: 'Platform gate closes properly', type: 'pass_fail' },
    { id: 'bl_5', section: 'Controls', item: 'Emergency stop working (platform and ground)', type: 'pass_fail' },
    { id: 'bl_6', section: 'Controls', item: 'Emergency descent system functional', type: 'pass_fail' },
    { id: 'bl_7', section: 'Safety', item: 'Horn and lights working', type: 'pass_fail' },
    { id: 'bl_8', section: 'Safety', item: 'SWL / capacity plate visible', type: 'pass_fail' },
    { id: 'bl_9', section: 'Safety', item: 'Tilt alarm operational', type: 'pass_fail_na' },
    { id: 'bl_10', section: 'Mechanical', item: 'Hydraulic system — no leaks', type: 'pass_fail' },
    { id: 'bl_11', section: 'Mechanical', item: 'Outriggers / stabilisers', type: 'pass_fail_na' },
    { id: 'bl_12', section: 'Mechanical', item: 'Tyre condition and pressure', type: 'pass_fail' },
    { id: 'bl_13', section: 'Mechanical', item: 'Brakes condition', type: 'pass_fail' },
    { id: 'bl_14', section: 'Mechanical', item: 'Battery / fuel level adequate', type: 'pass_fail' },
    { id: 'bl_15', section: 'Documentation', item: 'Valid third-party certificate', type: 'pass_fail_na' },
  ],

  fire_extinguisher: [
    { id: 'fe_1', section: 'Location & Access', item: 'In designated location — not moved', type: 'pass_fail' },
    { id: 'fe_2', section: 'Location & Access', item: 'Clearly visible and unobstructed', type: 'pass_fail' },
    { id: 'fe_3', section: 'Location & Access', item: 'Location sign / pictogram present', type: 'pass_fail' },
    { id: 'fe_4', section: 'Physical Condition', item: 'Cylinder undamaged — no dents, rust or corrosion', type: 'pass_fail' },
    { id: 'fe_5', section: 'Physical Condition', item: 'Hose / horn intact and undamaged', type: 'pass_fail' },
    { id: 'fe_6', section: 'Physical Condition', item: 'Handle and trigger mechanism intact', type: 'pass_fail' },
    { id: 'fe_7', section: 'Physical Condition', item: 'Safety pin present and tamper seal intact', type: 'pass_fail' },
    { id: 'fe_8', section: 'Pressure & Contents', item: 'Pressure gauge in green (normal) zone', type: 'pass_fail' },
    { id: 'fe_9', section: 'Pressure & Contents', item: 'Weight matches expected full weight', type: 'pass_fail_na' },
    { id: 'fe_10', section: 'Pressure & Contents', item: 'No signs of discharge or partial use', type: 'pass_fail' },
    { id: 'fe_11', section: 'Documentation', item: 'Annual service label within date', type: 'pass_fail' },
    { id: 'fe_12', section: 'Documentation', item: 'Inspection tag updated', type: 'pass_fail' },
    { id: 'fe_13', section: 'Documentation', item: 'Type and rating label legible', type: 'pass_fail' },
    { id: 'fe_14', section: 'Documentation', item: 'Correct type for area / hazard', type: 'pass_fail' },
  ],

  full_body_harness: [
    { id: 'fbh_1', section: 'Documentation', item: 'Unique ID tag / serial number visible', type: 'pass_fail' },
    { id: 'fbh_2', section: 'Documentation', item: 'Manufacture date within retirement limit', type: 'pass_fail' },
    { id: 'fbh_3', section: 'Documentation', item: 'Inspection record logbook up to date', type: 'pass_fail' },
    { id: 'fbh_4', section: 'Documentation', item: 'NOT involved in a fall arrest event', type: 'pass_fail' },
    { id: 'fbh_5', section: 'Webbing & Stitching', item: 'No cuts, fraying, or abrasion damage', type: 'pass_fail' },
    { id: 'fbh_6', section: 'Webbing & Stitching', item: 'No heat damage, burns, or discolouration', type: 'pass_fail' },
    { id: 'fbh_7', section: 'Webbing & Stitching', item: 'Stitching intact — no broken stitches', type: 'pass_fail' },
    { id: 'fbh_8', section: 'Webbing & Stitching', item: 'Not excessively soiled or contaminated', type: 'pass_fail' },
    { id: 'fbh_9', section: 'Hardware & Buckles', item: 'All buckles operate and lock correctly', type: 'pass_fail' },
    { id: 'fbh_10', section: 'Hardware & Buckles', item: 'D-rings free from deformation or corrosion', type: 'pass_fail' },
    { id: 'fbh_11', section: 'Hardware & Buckles', item: 'Snap hooks / carabiners latch properly', type: 'pass_fail' },
    { id: 'fbh_12', section: 'Hardware & Buckles', item: 'No sharp edges or burrs on metal parts', type: 'pass_fail' },
    { id: 'fbh_13', section: 'Lanyard & Energy Absorber', item: 'Lanyard webbing free from damage', type: 'pass_fail' },
    { id: 'fbh_14', section: 'Lanyard & Energy Absorber', item: 'Energy absorber pack intact — not deployed', type: 'pass_fail' },
    { id: 'fbh_15', section: 'Lanyard & Energy Absorber', item: 'Connectors at both ends functional', type: 'pass_fail' },
    { id: 'fbh_16', section: 'Storage & Condition', item: 'Stored away from UV, heat, chemicals', type: 'pass_fail' },
    { id: 'fbh_17', section: 'Storage & Condition', item: 'Assigned to named individual or team', type: 'pass_fail_na' },
  ],

  ladder: [
    { id: 'lad_1', section: 'Structural Integrity', item: 'All rungs or steps present and undamaged', type: 'pass_fail' },
    { id: 'lad_2', section: 'Structural Integrity', item: 'Side rails straight — no bends or cracks', type: 'pass_fail' },
    { id: 'lad_3', section: 'Structural Integrity', item: 'No missing, loose or damaged rungs', type: 'pass_fail' },
    { id: 'lad_4', section: 'Structural Integrity', item: 'No corrosion on metal components', type: 'pass_fail' },
    { id: 'lad_5', section: 'Feet & Anti-Slip', item: 'Rubber feet present and in good condition', type: 'pass_fail' },
    { id: 'lad_6', section: 'Feet & Anti-Slip', item: 'Rung surfaces have adequate grip', type: 'pass_fail' },
    { id: 'lad_7', section: 'Feet & Anti-Slip', item: 'No oil or slippery substance on rungs', type: 'pass_fail' },
    { id: 'lad_8', section: 'Locking Mechanisms', item: 'Locking hooks / spreader braces work', type: 'pass_fail_na' },
    { id: 'lad_9', section: 'Locking Mechanisms', item: 'Rope and pulley (extension) in good condition', type: 'pass_fail_na' },
    { id: 'lad_10', section: 'Labels & ID', item: 'SWL / max load rating label visible', type: 'pass_fail' },
    { id: 'lad_11', section: 'Labels & ID', item: 'ID tag / inspection sticker present', type: 'pass_fail' },
    { id: 'lad_12', section: 'Labels & ID', item: 'No defective/condemned tag attached', type: 'pass_fail' },
  ],

  welding_machine: [
    { id: 'wm_1', section: 'Electrical', item: 'Power cable undamaged — no exposed wires', type: 'pass_fail' },
    { id: 'wm_2', section: 'Electrical', item: 'Plug and socket condition', type: 'pass_fail' },
    { id: 'wm_3', section: 'Electrical', item: 'Earth / ground clamp and cable intact', type: 'pass_fail' },
    { id: 'wm_4', section: 'Electrical', item: 'Electrical test tag current', type: 'pass_fail' },
    { id: 'wm_5', section: 'Body & Controls', item: 'Machine body — no damage or cracks', type: 'pass_fail' },
    { id: 'wm_6', section: 'Body & Controls', item: 'Controls and dials operate correctly', type: 'pass_fail' },
    { id: 'wm_7', section: 'Body & Controls', item: 'Fan / ventilation working', type: 'pass_fail' },
    { id: 'wm_8', section: 'Torch & Accessories', item: 'Welding torch / gun condition', type: 'pass_fail' },
    { id: 'wm_9', section: 'Torch & Accessories', item: 'Gas hose intact (MIG/TIG)', type: 'pass_fail_na' },
    { id: 'wm_10', section: 'Torch & Accessories', item: 'Regulator and flowmeter working', type: 'pass_fail_na' },
    { id: 'wm_11', section: 'Safety', item: 'Fire extinguisher within 10m', type: 'pass_fail' },
    { id: 'wm_12', section: 'Safety', item: 'Welding screen / curtain available', type: 'pass_fail' },
  ],

  power_tool: [
    { id: 'pt_1', section: 'Electrical', item: 'Cable / cord condition — no damage', type: 'pass_fail' },
    { id: 'pt_2', section: 'Electrical', item: 'Plug condition', type: 'pass_fail' },
    { id: 'pt_3', section: 'Electrical', item: 'PAT test sticker visible and current', type: 'pass_fail' },
    { id: 'pt_4', section: 'Electrical', item: 'RCD connected where required', type: 'pass_fail_na' },
    { id: 'pt_5', section: 'Body & Controls', item: 'No cracks or damage to tool body', type: 'pass_fail' },
    { id: 'pt_6', section: 'Body & Controls', item: 'Switch / trigger working correctly', type: 'pass_fail' },
    { id: 'pt_7', section: 'Guards & Safety', item: 'Guard intact and correctly fitted', type: 'pass_fail' },
    { id: 'pt_8', section: 'Blade / Bit', item: 'Blade / disc / bit condition', type: 'pass_fail_na' },
    { id: 'pt_9', section: 'Storage', item: 'Storage condition acceptable', type: 'pass_fail_na' },
  ],

  grinder: [
    { id: 'grd_1', section: 'Disc / Grinding Wheel', item: 'Disc free from cracks, chips or damage', type: 'pass_fail' },
    { id: 'grd_2', section: 'Disc / Grinding Wheel', item: 'Correct disc type for material', type: 'pass_fail' },
    { id: 'grd_3', section: 'Disc / Grinding Wheel', item: 'Disc RPM matches or exceeds grinder rating', type: 'pass_fail' },
    { id: 'grd_4', section: 'Disc / Grinding Wheel', item: 'Disc properly mounted — flanges secure', type: 'pass_fail' },
    { id: 'grd_5', section: 'Guard', item: 'Guard present, secure and covers 180°', type: 'pass_fail' },
    { id: 'grd_6', section: 'Guard', item: 'Guard undamaged and properly adjusted', type: 'pass_fail' },
    { id: 'grd_7', section: 'Guard', item: 'Guard not removed or modified', type: 'pass_fail' },
    { id: 'grd_8', section: 'Body & Controls', item: 'Tool body free from cracks or damage', type: 'pass_fail' },
    { id: 'grd_9', section: 'Body & Controls', item: 'Side handle attached and secure', type: 'pass_fail' },
    { id: 'grd_10', section: 'Body & Controls', item: 'On/off switch operates smoothly', type: 'pass_fail' },
    { id: 'grd_11', section: 'Electrical', item: 'Power cable undamaged', type: 'pass_fail' },
    { id: 'grd_12', section: 'Electrical', item: 'Electrical test tag current', type: 'pass_fail' },
  ],

  cutter: [
    { id: 'cut_1', section: 'Blade & Cutting Element', item: 'Blade/disc undamaged — no cracks or chips', type: 'pass_fail' },
    { id: 'cut_2', section: 'Blade & Cutting Element', item: 'Correct blade type/size for task', type: 'pass_fail' },
    { id: 'cut_3', section: 'Blade & Cutting Element', item: 'Blade properly seated, guard covers blade', type: 'pass_fail' },
    { id: 'cut_4', section: 'Body & Handle', item: 'Tool body undamaged', type: 'pass_fail' },
    { id: 'cut_5', section: 'Body & Handle', item: 'Handle/grip secure', type: 'pass_fail' },
    { id: 'cut_6', section: 'Body & Handle', item: 'All bolts and fasteners tight', type: 'pass_fail' },
    { id: 'cut_7', section: 'Guards & Safety', item: 'Blade guard present and functional', type: 'pass_fail' },
    { id: 'cut_8', section: 'Guards & Safety', item: 'Safety latch / lock-off works', type: 'pass_fail_na' },
    { id: 'cut_9', section: 'Electrical', item: 'Cable undamaged — no exposed wires', type: 'pass_fail_na' },
    { id: 'cut_10', section: 'Electrical', item: 'Electrical test tag current', type: 'pass_fail_na' },
    { id: 'cut_11', section: 'Electrical', item: 'Switch returns to off correctly', type: 'pass_fail_na' },
  ],
};

// ── General fallback ──────────────────────────────────────

const GENERAL_CHECKLIST: ChecklistItem[] = [
  { id: 'gen_1', section: 'General', item: 'Visual condition — no damage', type: 'pass_fail' },
  { id: 'gen_2', section: 'General', item: 'Operational condition', type: 'pass_fail' },
  { id: 'gen_3', section: 'General', item: 'Structural integrity', type: 'pass_fail' },
  { id: 'gen_4', section: 'General', item: 'Safety devices working', type: 'pass_fail' },
  { id: 'gen_5', section: 'General', item: 'Labels / markings visible', type: 'pass_fail' },
  { id: 'gen_6', section: 'General', item: 'Documentation available', type: 'pass_fail_na' },
  { id: 'gen_7', section: 'General', item: 'Certificate / TUV valid', type: 'pass_fail_na' },
  { id: 'gen_8', section: 'General', item: 'Cleanliness / housekeeping', type: 'pass_fail_na' },
];

// ── Exports ───────────────────────────────────────────────

/**
 * Get checklist items for a given tracker category key.
 * Falls back to general checklist if category not found.
 */
export function getChecklistForCategory(categoryKey: string): ChecklistItem[] {
  return CATEGORY_CHECKLISTS[categoryKey] ?? GENERAL_CHECKLIST;
}

/**
 * Initialise blank checklist responses from checklist items.
 */
export function initChecklistResponses(categoryKey: string): ChecklistResponse[] {
  const items = getChecklistForCategory(categoryKey);
  return items.map(item => ({
    id: item.id,
    item: item.item,
    section: item.section,
    answer: null,
    note: '',
    required: item.type === 'pass_fail',
  }));
}

/**
 * Merge saved responses with the current checklist definition.
 * Handles items added or removed since the inspection was saved.
 */
export function mergeChecklistResponses(
  categoryKey: string,
  saved: ChecklistResponse[] | null | undefined,
): ChecklistResponse[] {
  if (!saved || saved.length === 0) return initChecklistResponses(categoryKey);

  const items = getChecklistForCategory(categoryKey);
  const savedMap = new Map(saved.map(r => [r.id, r]));

  return items.map(item => {
    const existing = savedMap.get(item.id);
    return {
      id: item.id,
      item: item.item,
      section: item.section,
      answer: existing?.answer ?? null,
      note: existing?.note ?? '',
      required: item.type === 'pass_fail',
    };
  });
}

/**
 * Compute checklist summary stats.
 */
export function getChecklistStats(responses: ChecklistResponse[]) {
  const total = responses.length;
  const pass = responses.filter(r => r.answer === 'pass').length;
  const fail = responses.filter(r => r.answer === 'fail').length;
  const na = responses.filter(r => r.answer === 'na').length;
  const pending = total - pass - fail - na;
  const answered = pass + fail + na;
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return { total, pass, fail, na, pending, answered, pct };
}

export { CATEGORY_CHECKLISTS, GENERAL_CHECKLIST };
