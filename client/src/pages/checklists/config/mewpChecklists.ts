export interface MewpChecklistItem {
  id: string;
  section: string;
  item: string;
  type: 'pass_fail' | 'pass_fail_na';
}

export const MEWP_PREUSE_CHECKLIST: MewpChecklistItem[] = [
  // Documentation
  { id: 'mewp_doc_1', section: 'Documentation', item: 'Valid third-party inspection certificate on site', type: 'pass_fail' },
  { id: 'mewp_doc_2', section: 'Documentation', item: 'Operator holds valid licence / competency card', type: 'pass_fail' },
  { id: 'mewp_doc_3', section: 'Documentation', item: 'Logbook available and previous entry reviewed', type: 'pass_fail' },

  // Structural
  { id: 'mewp_str_1', section: 'Structural', item: 'Chassis and frame free from visible cracks or damage', type: 'pass_fail' },
  { id: 'mewp_str_2', section: 'Structural', item: 'Platform floor intact — no holes, excessive rust or warping', type: 'pass_fail' },
  { id: 'mewp_str_3', section: 'Structural', item: 'Guardrails, mid-rails and toe-boards secure', type: 'pass_fail' },
  { id: 'mewp_str_4', section: 'Structural', item: 'Platform gate / entry bar closes and latches properly', type: 'pass_fail' },

  // Hydraulics
  { id: 'mewp_hyd_1', section: 'Hydraulics', item: 'Hydraulic oil level within normal range', type: 'pass_fail' },
  { id: 'mewp_hyd_2', section: 'Hydraulics', item: 'No visible hydraulic leaks on hoses, cylinders or fittings', type: 'pass_fail' },
  { id: 'mewp_hyd_3', section: 'Hydraulics', item: 'All boom / scissor movements smooth and controlled', type: 'pass_fail' },
  { id: 'mewp_hyd_4', section: 'Hydraulics', item: 'Outriggers / stabilisers extend and retract correctly', type: 'pass_fail_na' },

  // Electrical
  { id: 'mewp_elec_1', section: 'Electrical', item: 'Battery charge adequate for planned work', type: 'pass_fail_na' },
  { id: 'mewp_elec_2', section: 'Electrical', item: 'All warning lights and indicators functioning', type: 'pass_fail' },
  { id: 'mewp_elec_3', section: 'Electrical', item: 'Horn / audible alarm operational', type: 'pass_fail' },
  { id: 'mewp_elec_4', section: 'Electrical', item: 'Wiring harness intact — no exposed or damaged cables', type: 'pass_fail' },

  // Tyres & Wheels
  { id: 'mewp_tyre_1', section: 'Tyres & Wheels', item: 'Tyre pressure adequate and treads above minimum', type: 'pass_fail' },
  { id: 'mewp_tyre_2', section: 'Tyres & Wheels', item: 'Wheel nuts tight — no missing studs', type: 'pass_fail' },

  // Safety Devices
  { id: 'mewp_saf_1', section: 'Safety Devices', item: 'Emergency stop buttons operational (platform and ground)', type: 'pass_fail' },
  { id: 'mewp_saf_2', section: 'Safety Devices', item: 'Emergency lowering / descent system functional', type: 'pass_fail' },
  { id: 'mewp_saf_3', section: 'Safety Devices', item: 'SWL / capacity plate legible and correct', type: 'pass_fail' },
  { id: 'mewp_saf_4', section: 'Safety Devices', item: 'Tilt alarm / overload alarm operational', type: 'pass_fail_na' },

  // Cleanliness
  { id: 'mewp_cln_1', section: 'Cleanliness', item: 'Platform and controls clean — no oil, grease or debris', type: 'pass_fail' },
];
