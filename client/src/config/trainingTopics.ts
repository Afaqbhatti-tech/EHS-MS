export interface TrainingTopicConfig {
  key: string;
  label: string;
  category: string;
  validity_days: number | null;
  is_mandatory: boolean;
  description: string;
  color: string;
  light_color: string;
}

export const TRAINING_TOPICS: TrainingTopicConfig[] = [
  // Safety Core
  { key: 'site_induction', label: 'Site Induction', category: 'Safety Core', validity_days: null, is_mandatory: true, description: 'Mandatory site safety induction', color: '#065F46', light_color: '#D1FAE5' },
  { key: 'work_at_height', label: 'Work at Height', category: 'Safety Core', validity_days: 365, is_mandatory: false, description: 'Working safely at elevated locations', color: '#7C3AED', light_color: '#EDE9FE' },
  { key: 'fire_safety', label: 'Fire Safety', category: 'Safety Core', validity_days: 365, is_mandatory: true, description: 'Fire prevention, response, evacuation', color: '#DC2626', light_color: '#FEE2E2' },
  { key: 'first_aid', label: 'First Aid', category: 'Safety Core', validity_days: 730, is_mandatory: false, description: 'Basic first aid and emergency response', color: '#BE185D', light_color: '#FCE7F3' },
  { key: 'manual_handling', label: 'Manual Handling', category: 'Safety Core', validity_days: 365, is_mandatory: false, description: 'Safe manual handling techniques', color: '#0369A1', light_color: '#E0F2FE' },
  // Equipment
  { key: 'mewp_operation', label: 'MEWP Operation', category: 'Equipment', validity_days: 365, is_mandatory: false, description: 'Mobile Elevating Work Platform', color: '#B45309', light_color: '#FEF3C7' },
  { key: 'lifting_rigging', label: 'Lifting & Rigging', category: 'Equipment', validity_days: 365, is_mandatory: false, description: 'Crane operations, rigging, slinging', color: '#1D4ED8', light_color: '#DBEAFE' },
  { key: 'forklift_operation', label: 'Forklift Operation', category: 'Equipment', validity_days: 730, is_mandatory: false, description: 'Forklift / reach truck operation', color: '#4F46E5', light_color: '#EEF2FF' },
  { key: 'hot_work', label: 'Hot Work Safety', category: 'Equipment', validity_days: 365, is_mandatory: false, description: 'Welding, cutting, grinding safely', color: '#EA580C', light_color: '#FFF7ED' },
  // Driving
  { key: 'defensive_driving', label: 'Defensive Driving', category: 'Driving', validity_days: 730, is_mandatory: false, description: 'Safe driving techniques', color: '#0F766E', light_color: '#CCFBF1' },
  { key: 'heavy_vehicle', label: 'Heavy Vehicle Operation', category: 'Driving', validity_days: 730, is_mandatory: false, description: 'HGV / heavy equipment driving', color: '#92400E', light_color: '#FEF3C7' },
  // Behavioural
  { key: 'behavioral_safety', label: 'Behavioural Safety (BBS)', category: 'Behavioural', validity_days: 365, is_mandatory: false, description: 'Behaviour-based safety principles', color: '#374151', light_color: '#F3F4F6' },
  { key: 'supervisor_safety', label: 'Supervisor Safety Leadership', category: 'Behavioural', validity_days: 730, is_mandatory: false, description: 'Safety leadership for supervisors', color: '#065F46', light_color: '#D1FAE5' },
  // Environmental
  { key: 'environmental_awareness', label: 'Environmental Awareness', category: 'Environmental', validity_days: 365, is_mandatory: false, description: 'Environmental controls, waste, spills', color: '#166534', light_color: '#F0FDF4' },
  // Emergency
  { key: 'emergency_response', label: 'Emergency Response', category: 'Emergency', validity_days: 365, is_mandatory: true, description: 'Emergency evacuation and response', color: '#9F1239', light_color: '#FFF1F2' },
  { key: 'confined_space', label: 'Confined Space Entry', category: 'Emergency', validity_days: 365, is_mandatory: false, description: 'Safe working in confined spaces', color: '#78350F', light_color: '#FFFBEB' },
  // Electrical
  { key: 'electrical_safety', label: 'Electrical Safety / LOTO', category: 'Electrical', validity_days: 365, is_mandatory: false, description: 'Electrical hazard awareness and LOTO', color: '#1D4ED8', light_color: '#DBEAFE' },
  // Chemical
  { key: 'coshh', label: 'COSHH / Hazardous Substances', category: 'Chemical', validity_days: 365, is_mandatory: false, description: 'Control of hazardous substances', color: '#7C3AED', light_color: '#EDE9FE' },
];

export const TRAINING_CATEGORIES = [...new Set(TRAINING_TOPICS.map(t => t.category))];

export const getTopicByKey = (key: string): TrainingTopicConfig | undefined =>
  TRAINING_TOPICS.find(t => t.key === key);

export const getTopicsByCategory = (category: string): TrainingTopicConfig[] =>
  TRAINING_TOPICS.filter(t => t.category === category);

export const getTopicOptions = (): { value: string; label: string; category: string }[] =>
  TRAINING_TOPICS.map(t => ({ value: t.key, label: t.label, category: t.category }));

export const getMandatoryTopics = (): TrainingTopicConfig[] =>
  TRAINING_TOPICS.filter(t => t.is_mandatory);
