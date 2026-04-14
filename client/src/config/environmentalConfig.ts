export const ASPECT_CATEGORIES = [
  'Air Emission', 'Water Pollution',
  'Waste Generation', 'Noise', 'Vibration',
  'Soil Contamination', 'Resource Consumption',
  'Chemical Use', 'Spill Risk',
];

export const IMPACT_TYPES = [
  'Pollution', 'Resource Depletion',
  'Community Disturbance', 'Habitat Damage',
  'Health Impact', 'Legal Non-Compliance',
];

export const WASTE_TYPES = [
  'Hazardous Waste', 'Non-Hazardous Waste',
  'Recyclable Waste', 'Chemical Waste',
  'Biomedical Waste', 'Electronic Waste',
  'Construction Debris', 'Scrap Metal',
  'Oily Waste', 'General Waste',
];

export const WASTE_DISPOSAL_METHODS = [
  'Licensed Landfill', 'Recycling',
  'Incineration', 'Chemical Treatment',
  'Composting', 'Reuse', 'Licensed Contractor',
  'Return to Manufacturer',
];

export const WASTE_CATEGORIES = [
  'Hazardous', 'Non-Hazardous', 'Recyclable', 'Other',
] as const;

export const MONITORING_TYPES = [
  'Air Emission', 'Water Discharge',
  'Wastewater Quality', 'Noise Level',
  'Dust', 'Odor', 'Chemical Discharge',
  'Radiation', 'Temperature Discharge',
];

export const RESOURCE_TYPES = [
  'Electricity', 'Water', 'Diesel',
  'Petrol', 'Natural Gas', 'LPG',
  'Compressed Air',
];

export const INCIDENT_TYPES = [
  'Oil Spill', 'Chemical Leak',
  'Waste Mismanagement', 'Environmental Complaint',
  'Pollution Event', 'Sewage Overflow',
  'Discharge Violation', 'Noise Complaint',
  'Dust Complaint', 'Land Contamination',
];

export const INSPECTION_TYPES = [
  'Routine Environmental Inspection',
  'Environmental Audit',
  'Waste Area Inspection',
  'Spill Control Inspection',
  'Emission Monitoring Inspection',
  'Housekeeping Environmental Inspection',
  'Legal Compliance Audit',
  'Third-Party Environmental Audit',
];

export const COMPLIANCE_STATUSES = [
  'Compliant', 'Non-Compliant',
  'Pending Review', 'Expired', 'Under Action',
];

export const OBJECTIVE_CATEGORIES = [
  'Waste Reduction', 'Water Conservation',
  'Energy Efficiency', 'Emission Reduction',
  'Recycling Improvement', 'Spill Prevention',
  'Noise Reduction', 'Carbon Footprint',
  'Legal Compliance',
];

export const RISK_LEVELS: Record<string, string> = {
  '1': 'Low',
  '2': 'Medium',
  '3': 'High',
  '4': 'Critical',
};

export const ASPECT_STATUSES = ['Active', 'Under Review', 'Controlled', 'Closed'];
export const RISK_STATUSES = ['Open', 'Controlled', 'Closed', 'Under Review'];
export const WASTE_STATUSES = ['Pending Collection', 'In Storage', 'Collected', 'Disposed', 'Recycled'];
export const MONITORING_COMPLIANCE = ['Compliant', 'Non-Compliant', 'Warning', 'Pending'];
export const ENV_INCIDENT_STATUSES = ['Reported', 'Under Investigation', 'Action Assigned', 'In Progress', 'Closed', 'Reopened'];
export const ENV_INCIDENT_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
export const INSPECTION_COMPLIANCE = ['Compliant', 'Partially Compliant', 'Non-Compliant'];
export const INSPECTION_STATUSES = ['Open', 'Closed', 'Action Required'];
export const OBJECTIVE_STATUSES = ['Planned', 'In Progress', 'Achieved', 'Delayed', 'Closed'];
export const ACTION_STATUSES = ['Open', 'In Progress', 'Completed', 'Overdue', 'Closed'];
export const ACTION_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const LINKED_TYPES = ['aspect', 'risk', 'waste', 'monitoring', 'incident', 'inspection', 'compliance', 'objective', 'resource'];

export const RESOURCE_UNITS: Record<string, string> = {
  'Electricity': 'kWh',
  'Water': 'm\u00B3',
  'Diesel': 'litres',
  'Petrol': 'litres',
  'Natural Gas': 'm\u00B3',
  'LPG': 'kg',
  'Compressed Air': 'm\u00B3',
  'Other': 'units',
};

export function getRiskLevel(severity: number, likelihood: number): { level: string; score: number } {
  const score = severity * likelihood;
  let level = 'Low';
  if (score >= 15) level = 'Critical';
  else if (score >= 8) level = 'High';
  else if (score >= 4) level = 'Medium';
  return { level, score };
}
