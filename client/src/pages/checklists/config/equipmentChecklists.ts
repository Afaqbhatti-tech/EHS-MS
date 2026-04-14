/**
 * Structured inspection checklist templates for all equipment categories.
 * Mirrors backend config/equipment_checklists.php.
 */

export interface ChecklistTemplateItem {
  id: string;
  section: string;
  item: string;
  type: 'pass_fail' | 'pass_fail_na';
}

const EQUIPMENT_CHECKLISTS: Record<string, ChecklistTemplateItem[]> = {

  // ── FULL BODY HARNESS — Weekly Inspection ────────────────
  full_body_harness: [
    { id: 'fbh_doc_1', section: 'Documentation', item: 'Harness has unique ID tag / serial number visible', type: 'pass_fail' },
    { id: 'fbh_doc_2', section: 'Documentation', item: 'Manufacture date within 10-year retirement limit', type: 'pass_fail' },
    { id: 'fbh_doc_3', section: 'Documentation', item: 'Inspection record logbook up to date', type: 'pass_fail' },
    { id: 'fbh_doc_4', section: 'Documentation', item: 'Has NOT been involved in a fall arrest event', type: 'pass_fail' },
    { id: 'fbh_web_1', section: 'Webbing & Stitching', item: 'Webbing has no cuts, fraying, or abrasion damage', type: 'pass_fail' },
    { id: 'fbh_web_2', section: 'Webbing & Stitching', item: 'No heat damage, burns, or chemical discolouration', type: 'pass_fail' },
    { id: 'fbh_web_3', section: 'Webbing & Stitching', item: 'Stitching intact — no broken or missing stitches', type: 'pass_fail' },
    { id: 'fbh_web_4', section: 'Webbing & Stitching', item: 'Webbing not excessively soiled or contaminated', type: 'pass_fail' },
    { id: 'fbh_hw_1', section: 'Hardware & Buckles', item: 'All buckles operate smoothly and lock correctly', type: 'pass_fail' },
    { id: 'fbh_hw_2', section: 'Hardware & Buckles', item: 'D-rings free from deformation, cracks or corrosion', type: 'pass_fail' },
    { id: 'fbh_hw_3', section: 'Hardware & Buckles', item: 'All snap hooks / carabiners latch and lock properly', type: 'pass_fail' },
    { id: 'fbh_hw_4', section: 'Hardware & Buckles', item: 'No sharp edges, burrs or corrosion on metal parts', type: 'pass_fail' },
    { id: 'fbh_lan_1', section: 'Lanyard & Energy Absorber', item: 'Lanyard webbing free from damage and contamination', type: 'pass_fail' },
    { id: 'fbh_lan_2', section: 'Lanyard & Energy Absorber', item: 'Energy absorber pack intact — not deployed', type: 'pass_fail' },
    { id: 'fbh_lan_3', section: 'Lanyard & Energy Absorber', item: 'Connectors at both ends of lanyard function correctly', type: 'pass_fail' },
    { id: 'fbh_lan_4', section: 'Lanyard & Energy Absorber', item: 'Lanyard length appropriate for working at height task', type: 'pass_fail' },
    { id: 'fbh_str_1', section: 'Storage & Condition', item: 'Harness stored away from UV, heat, and chemicals', type: 'pass_fail' },
    { id: 'fbh_str_2', section: 'Storage & Condition', item: 'Not stored in direct contact with sharp tools', type: 'pass_fail' },
    { id: 'fbh_str_3', section: 'Storage & Condition', item: 'Assigned to named individual or team only', type: 'pass_fail_na' },
  ],

  // ── FIRE EXTINGUISHER — Monthly Visual Inspection ────────
  fire_extinguisher: [
    { id: 'fe_loc_1', section: 'Location & Access', item: 'Extinguisher in designated location — not moved', type: 'pass_fail' },
    { id: 'fe_loc_2', section: 'Location & Access', item: 'Clearly visible and unobstructed access', type: 'pass_fail' },
    { id: 'fe_loc_3', section: 'Location & Access', item: 'Location sign / pictogram present above unit', type: 'pass_fail' },
    { id: 'fe_phy_1', section: 'Physical Condition', item: 'Cylinder undamaged — no dents, rust or corrosion', type: 'pass_fail' },
    { id: 'fe_phy_2', section: 'Physical Condition', item: 'Hose / horn intact and undamaged', type: 'pass_fail' },
    { id: 'fe_phy_3', section: 'Physical Condition', item: 'Handle and trigger mechanism intact', type: 'pass_fail' },
    { id: 'fe_phy_4', section: 'Physical Condition', item: 'Safety pin present and tamper-evident seal intact', type: 'pass_fail' },
    { id: 'fe_pre_1', section: 'Pressure & Contents', item: 'Pressure gauge needle in green (normal) zone', type: 'pass_fail' },
    { id: 'fe_pre_2', section: 'Pressure & Contents', item: 'Weight label matches expected full weight', type: 'pass_fail_na' },
    { id: 'fe_pre_3', section: 'Pressure & Contents', item: 'No signs of discharge or partial use', type: 'pass_fail' },
    { id: 'fe_doc_1', section: 'Documentation', item: 'Annual service label present and within date', type: 'pass_fail' },
    { id: 'fe_doc_2', section: 'Documentation', item: 'Inspection tag updated with today\'s date', type: 'pass_fail' },
    { id: 'fe_doc_3', section: 'Documentation', item: 'Type and rating label legible', type: 'pass_fail' },
    { id: 'fe_doc_4', section: 'Documentation', item: 'Correct extinguisher type for area/hazard', type: 'pass_fail' },
  ],

  // ── LADDER — Weekly Pre-Use Inspection ───────────────────
  ladder: [
    { id: 'lad_str_1', section: 'Structural Integrity', item: 'All rungs or steps present and undamaged', type: 'pass_fail' },
    { id: 'lad_str_2', section: 'Structural Integrity', item: 'Side rails straight — no bends or cracks', type: 'pass_fail' },
    { id: 'lad_str_3', section: 'Structural Integrity', item: 'No missing, loose or damaged rungs/steps', type: 'pass_fail' },
    { id: 'lad_str_4', section: 'Structural Integrity', item: 'No corrosion or damage to metal components', type: 'pass_fail' },
    { id: 'lad_ft_1', section: 'Feet & Anti-Slip', item: 'Rubber feet/shoes present and in good condition', type: 'pass_fail' },
    { id: 'lad_ft_2', section: 'Feet & Anti-Slip', item: 'Rung surfaces have adequate slip-resistant texture', type: 'pass_fail' },
    { id: 'lad_ft_3', section: 'Feet & Anti-Slip', item: 'No oil, grease or slippery substance on rungs', type: 'pass_fail' },
    { id: 'lad_mec_1', section: 'Locking Mechanisms', item: 'Locking hooks / spreader braces operate correctly', type: 'pass_fail_na' },
    { id: 'lad_mec_2', section: 'Locking Mechanisms', item: 'Rope and pulley (extension) in good condition', type: 'pass_fail_na' },
    { id: 'lad_mec_3', section: 'Locking Mechanisms', item: 'Platform/shelf intact and locks flat when folded', type: 'pass_fail_na' },
    { id: 'lad_lab_1', section: 'Labels & ID', item: 'SWL / maximum load rating label visible', type: 'pass_fail' },
    { id: 'lad_lab_2', section: 'Labels & ID', item: 'ID tag / inspection sticker present', type: 'pass_fail' },
    { id: 'lad_lab_3', section: 'Labels & ID', item: 'No defective/condemned tag attached', type: 'pass_fail' },
  ],

  // ── VENDING MACHINE — Monthly Inspection ─────────────────
  vending_machine: [
    { id: 'vm_phy_1', section: 'Physical Condition', item: 'Unit stable — no tilting, levelling feet set', type: 'pass_fail' },
    { id: 'vm_phy_2', section: 'Physical Condition', item: 'Door seals intact, door closes properly', type: 'pass_fail' },
    { id: 'vm_phy_3', section: 'Physical Condition', item: 'Exterior clean — no damage, dents or graffiti', type: 'pass_fail' },
    { id: 'vm_phy_4', section: 'Physical Condition', item: 'Ventilation grilles clear and unobstructed', type: 'pass_fail' },
    { id: 'vm_elec_1', section: 'Electrical', item: 'Power cable undamaged — no exposed wires', type: 'pass_fail' },
    { id: 'vm_elec_2', section: 'Electrical', item: 'Plugged into correct rated socket / RCD protected', type: 'pass_fail' },
    { id: 'vm_elec_3', section: 'Electrical', item: 'Electrical test tag current and within date', type: 'pass_fail' },
    { id: 'vm_elec_4', section: 'Electrical', item: 'No unusual noises, smells or tripped breakers', type: 'pass_fail' },
    { id: 'vm_hyg_1', section: 'Hygiene', item: 'Interior clean — no mould, spills or pest signs', type: 'pass_fail' },
    { id: 'vm_hyg_2', section: 'Hygiene', item: 'Products within expiry date', type: 'pass_fail_na' },
    { id: 'vm_hyg_3', section: 'Hygiene', item: 'Water dispenser nozzles clean (if applicable)', type: 'pass_fail_na' },
    { id: 'vm_fun_1', section: 'Functionality', item: 'Dispensing mechanism operates correctly', type: 'pass_fail' },
    { id: 'vm_fun_2', section: 'Functionality', item: 'Display/interface readable and functional', type: 'pass_fail' },
  ],

  // ── CUTTER — Weekly Pre-Use Inspection ───────────────────
  cutter: [
    { id: 'cut_bld_1', section: 'Blade & Cutting Element', item: 'Blade/disc undamaged — no cracks, chips or excessive wear', type: 'pass_fail' },
    { id: 'cut_bld_2', section: 'Blade & Cutting Element', item: 'Correct blade type/size for the task', type: 'pass_fail' },
    { id: 'cut_bld_3', section: 'Blade & Cutting Element', item: 'Blade/disc properly seated and guard covers blade', type: 'pass_fail' },
    { id: 'cut_bld_4', section: 'Blade & Cutting Element', item: 'Blade within rated RPM for the tool', type: 'pass_fail_na' },
    { id: 'cut_bod_1', section: 'Body & Handle', item: 'Tool body undamaged — no cracks or breaks', type: 'pass_fail' },
    { id: 'cut_bod_2', section: 'Body & Handle', item: 'Handle/grip secure and free from slipping', type: 'pass_fail' },
    { id: 'cut_bod_3', section: 'Body & Handle', item: 'All bolts and fasteners tight', type: 'pass_fail' },
    { id: 'cut_grd_1', section: 'Guards & Safety', item: 'Blade guard present, functional and properly adjusted', type: 'pass_fail' },
    { id: 'cut_grd_2', section: 'Guards & Safety', item: 'Safety latch / lock-off mechanism works', type: 'pass_fail_na' },
    { id: 'cut_grd_3', section: 'Guards & Safety', item: 'PPE requirements labelled / known by operator', type: 'pass_fail' },
    { id: 'cut_elec_1', section: 'Electrical (Power Tools)', item: 'Cable undamaged — no exposed wires or splices', type: 'pass_fail_na' },
    { id: 'cut_elec_2', section: 'Electrical (Power Tools)', item: 'Electrical test tag current and within date', type: 'pass_fail_na' },
    { id: 'cut_elec_3', section: 'Electrical (Power Tools)', item: 'Switch operates and returns to off correctly', type: 'pass_fail_na' },
  ],

  // ── GRINDER — Weekly Pre-Use Inspection ──────────────────
  grinder: [
    { id: 'grd_dsc_1', section: 'Disc / Grinding Wheel', item: 'Disc free from cracks, chips or damage — ring test passed', type: 'pass_fail' },
    { id: 'grd_dsc_2', section: 'Disc / Grinding Wheel', item: 'Correct disc type for the material being cut/ground', type: 'pass_fail' },
    { id: 'grd_dsc_3', section: 'Disc / Grinding Wheel', item: 'Disc max RPM matches or exceeds grinder RPM rating', type: 'pass_fail' },
    { id: 'grd_dsc_4', section: 'Disc / Grinding Wheel', item: 'Disc properly mounted — flanges and backing plate secure', type: 'pass_fail' },
    { id: 'grd_dsc_5', section: 'Disc / Grinding Wheel', item: 'Disc thickness not worn below minimum safe level', type: 'pass_fail' },
    { id: 'grd_grd_1', section: 'Guard', item: 'Guard present, secure and covers 180\u00b0 of disc', type: 'pass_fail' },
    { id: 'grd_grd_2', section: 'Guard', item: 'Guard undamaged and properly adjusted for task', type: 'pass_fail' },
    { id: 'grd_grd_3', section: 'Guard', item: 'Guard not removed or modified', type: 'pass_fail' },
    { id: 'grd_bod_1', section: 'Body & Controls', item: 'Tool body free from cracks or visible damage', type: 'pass_fail' },
    { id: 'grd_bod_2', section: 'Body & Controls', item: 'Side handle attached and secure', type: 'pass_fail' },
    { id: 'grd_bod_3', section: 'Body & Controls', item: 'On/off switch operates smoothly', type: 'pass_fail' },
    { id: 'grd_bod_4', section: 'Body & Controls', item: 'Spindle lock operates correctly', type: 'pass_fail' },
    { id: 'grd_elec_1', section: 'Electrical', item: 'Power cable undamaged — no cuts or exposed wires', type: 'pass_fail' },
    { id: 'grd_elec_2', section: 'Electrical', item: 'Electrical test tag current and within date', type: 'pass_fail' },
    { id: 'grd_elec_3', section: 'Electrical', item: 'Strain relief at plug and tool connection intact', type: 'pass_fail' },
  ],

  // ── LIFTING GEAR (HOOKS) — Weekly Inspection ─────────────
  lifting_gear: [
    { id: 'hk_doc_1', section: 'Documentation', item: 'SWL marking clearly visible and legible', type: 'pass_fail' },
    { id: 'hk_doc_2', section: 'Documentation', item: 'Identification number / batch mark present', type: 'pass_fail' },
    { id: 'hk_doc_3', section: 'Documentation', item: 'Third-party test certificate valid and available', type: 'pass_fail' },
    { id: 'hk_bod_1', section: 'Hook Body', item: 'No visible cracks, gouges or surface defects', type: 'pass_fail' },
    { id: 'hk_bod_2', section: 'Hook Body', item: 'Throat opening within 10% of original dimension', type: 'pass_fail' },
    { id: 'hk_bod_3', section: 'Hook Body', item: 'No deformation — shank, body and point straight', type: 'pass_fail' },
    { id: 'hk_bod_4', section: 'Hook Body', item: 'No corrosion, pitting or excessive wear', type: 'pass_fail' },
    { id: 'hk_bod_5', section: 'Hook Body', item: 'Saddle of hook free from gouging or wear marks', type: 'pass_fail' },
    { id: 'hk_lat_1', section: 'Safety Latch', item: 'Safety latch present and springs shut correctly', type: 'pass_fail' },
    { id: 'hk_lat_2', section: 'Safety Latch', item: 'Latch pin intact — not bent, seized or missing', type: 'pass_fail' },
    { id: 'hk_lat_3', section: 'Safety Latch', item: 'For swivel hooks: swivel turns freely, not seized', type: 'pass_fail_na' },
    { id: 'hk_lat_4', section: 'Safety Latch', item: 'Shackle pin fully threaded and moused if required', type: 'pass_fail_na' },
    { id: 'hk_att_1', section: 'Attachment & Thread', item: 'Nut fully threaded and secured (split pin / lock)', type: 'pass_fail_na' },
    { id: 'hk_att_2', section: 'Attachment & Thread', item: 'Load ring / eye free from distortion', type: 'pass_fail_na' },
  ],

  // ── GENERATOR — Weekly Inspection ────────────────────────
  generator: [
    { id: 'gen_flu_1', section: 'Fuel & Fluids', item: 'Fuel level adequate for planned operation', type: 'pass_fail' },
    { id: 'gen_flu_2', section: 'Fuel & Fluids', item: 'No fuel leaks from tank, lines or fittings', type: 'pass_fail' },
    { id: 'gen_flu_3', section: 'Fuel & Fluids', item: 'Engine oil at correct level — dipstick check done', type: 'pass_fail' },
    { id: 'gen_flu_4', section: 'Fuel & Fluids', item: 'Coolant level adequate (liquid-cooled units)', type: 'pass_fail_na' },
    { id: 'gen_elec_1', section: 'Electrical Output', item: 'All output sockets undamaged and weatherproofed', type: 'pass_fail' },
    { id: 'gen_elec_2', section: 'Electrical Output', item: 'Circuit breakers functional and not tripped', type: 'pass_fail' },
    { id: 'gen_elec_3', section: 'Electrical Output', item: 'Earthing connection properly made', type: 'pass_fail' },
    { id: 'gen_elec_4', section: 'Electrical Output', item: 'Voltage and frequency correct on output meter', type: 'pass_fail_na' },
    { id: 'gen_mec_1', section: 'Mechanical', item: 'No unusual noises, vibration or smoke when running', type: 'pass_fail' },
    { id: 'gen_mec_2', section: 'Mechanical', item: 'Hour meter reading recorded (service tracking)', type: 'pass_fail' },
    { id: 'gen_mec_3', section: 'Mechanical', item: 'Air filter clean — no excessive blockage', type: 'pass_fail' },
    { id: 'gen_mec_4', section: 'Mechanical', item: 'Exhaust clear and directing fumes away from workers', type: 'pass_fail' },
    { id: 'gen_saf_1', section: 'Safety & Environment', item: 'Spill containment / drip tray in place', type: 'pass_fail' },
    { id: 'gen_saf_2', section: 'Safety & Environment', item: 'Fire extinguisher available within 10m', type: 'pass_fail' },
    { id: 'gen_saf_3', section: 'Safety & Environment', item: 'Generator not operated in enclosed spaces', type: 'pass_fail' },
    { id: 'gen_saf_4', section: 'Safety & Environment', item: 'Minimum 1m clear space around all sides', type: 'pass_fail' },
  ],

  // ── SPILL KIT — Monthly Inspection ───────────────────────
  spill_kit: [
    { id: 'sk_con_1', section: 'Kit Contents', item: 'All absorbent pads present and unused', type: 'pass_fail' },
    { id: 'sk_con_2', section: 'Kit Contents', item: 'Absorbent socks / booms present and unused', type: 'pass_fail' },
    { id: 'sk_con_3', section: 'Kit Contents', item: 'Disposal bags present (minimum 2)', type: 'pass_fail' },
    { id: 'sk_con_4', section: 'Kit Contents', item: 'Chemical-resistant gloves present (minimum 1 pair)', type: 'pass_fail' },
    { id: 'sk_con_5', section: 'Kit Contents', item: 'Safety goggles / face shield present', type: 'pass_fail' },
    { id: 'sk_con_6', section: 'Kit Contents', item: 'Scoop / shovel and broom present', type: 'pass_fail' },
    { id: 'sk_con_7', section: 'Kit Contents', item: 'Instruction card / SDS references in kit', type: 'pass_fail' },
    { id: 'sk_cnd_1', section: 'Condition', item: 'Kit container undamaged and lid seals properly', type: 'pass_fail' },
    { id: 'sk_cnd_2', section: 'Condition', item: 'Absorbent materials dry and free from prior use', type: 'pass_fail' },
    { id: 'sk_cnd_3', section: 'Condition', item: 'PPE items undamaged and within use-by date', type: 'pass_fail' },
    { id: 'sk_cnd_4', section: 'Condition', item: 'No evidence of prior spill response use', type: 'pass_fail' },
    { id: 'sk_loc_1', section: 'Location & Access', item: 'Kit located in designated position', type: 'pass_fail' },
    { id: 'sk_loc_2', section: 'Location & Access', item: 'Location sign/label clearly visible', type: 'pass_fail' },
    { id: 'sk_loc_3', section: 'Location & Access', item: 'Kit appropriate for hazard type in area', type: 'pass_fail' },
    { id: 'sk_loc_4', section: 'Location & Access', item: 'Nearest workers aware of kit location', type: 'pass_fail' },
  ],

  // ── MEWP — Daily Pre-Use Inspection ──────────────────────
  mewp: [
    { id: 'mewp_doc_1', section: 'Documentation', item: 'Valid third-party inspection certificate on site', type: 'pass_fail' },
    { id: 'mewp_doc_2', section: 'Documentation', item: 'Operator holds valid licence / competency card', type: 'pass_fail' },
    { id: 'mewp_doc_3', section: 'Documentation', item: 'Logbook available and previous entry reviewed', type: 'pass_fail' },
    { id: 'mewp_str_1', section: 'Structural', item: 'Chassis and frame free from visible cracks or damage', type: 'pass_fail' },
    { id: 'mewp_str_2', section: 'Structural', item: 'Platform floor intact — no holes, excessive rust or warping', type: 'pass_fail' },
    { id: 'mewp_str_3', section: 'Structural', item: 'Guardrails, mid-rails and toe-boards secure', type: 'pass_fail' },
    { id: 'mewp_str_4', section: 'Structural', item: 'Platform gate / entry bar closes and latches properly', type: 'pass_fail' },
    { id: 'mewp_hyd_1', section: 'Hydraulics', item: 'Hydraulic oil level within normal range', type: 'pass_fail' },
    { id: 'mewp_hyd_2', section: 'Hydraulics', item: 'No visible hydraulic leaks on hoses, cylinders or fittings', type: 'pass_fail' },
    { id: 'mewp_hyd_3', section: 'Hydraulics', item: 'All boom / scissor movements smooth and controlled', type: 'pass_fail' },
    { id: 'mewp_hyd_4', section: 'Hydraulics', item: 'Outriggers / stabilisers extend and retract correctly', type: 'pass_fail_na' },
    { id: 'mewp_elec_1', section: 'Electrical', item: 'Battery charge adequate for planned work', type: 'pass_fail_na' },
    { id: 'mewp_elec_2', section: 'Electrical', item: 'All warning lights and indicators functioning', type: 'pass_fail' },
    { id: 'mewp_elec_3', section: 'Electrical', item: 'Horn / audible alarm operational', type: 'pass_fail' },
    { id: 'mewp_elec_4', section: 'Electrical', item: 'Wiring harness intact — no exposed or damaged cables', type: 'pass_fail' },
    { id: 'mewp_tyre_1', section: 'Tyres & Wheels', item: 'Tyre pressure adequate and treads above minimum', type: 'pass_fail' },
    { id: 'mewp_tyre_2', section: 'Tyres & Wheels', item: 'Wheel nuts tight — no missing studs', type: 'pass_fail' },
    { id: 'mewp_saf_1', section: 'Safety Devices', item: 'Emergency stop buttons operational (platform and ground)', type: 'pass_fail' },
    { id: 'mewp_saf_2', section: 'Safety Devices', item: 'Emergency lowering / descent system functional', type: 'pass_fail' },
    { id: 'mewp_saf_3', section: 'Safety Devices', item: 'SWL / capacity plate legible and correct', type: 'pass_fail' },
    { id: 'mewp_saf_4', section: 'Safety Devices', item: 'Tilt alarm / overload alarm operational', type: 'pass_fail_na' },
    { id: 'mewp_cln_1', section: 'Cleanliness', item: 'Platform and controls clean — no oil, grease or debris', type: 'pass_fail' },
  ],
};

export default EQUIPMENT_CHECKLISTS;

export function getChecklistTemplate(categoryKey: string): ChecklistTemplateItem[] | null {
  return EQUIPMENT_CHECKLISTS[categoryKey] ?? null;
}

export function getSectionNames(categoryKey: string): string[] {
  const items = EQUIPMENT_CHECKLISTS[categoryKey];
  if (!items) return [];
  const seen = new Set<string>();
  return items.reduce<string[]>((acc, item) => {
    if (!seen.has(item.section)) {
      seen.add(item.section);
      acc.push(item.section);
    }
    return acc;
  }, []);
}
