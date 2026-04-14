export const POSTER_CATEGORIES = [
  'Safety Awareness',
  'Campaign',
  'Training',
  'Incident Learning',
  'Violation Reminder',
  'Emergency / ERP',
  'Permit Awareness',
  'RAMS Awareness',
  'General Notice',
  'Instructional',
  'Compliance Reminder',
  'Motivation / Engagement',
  'Other',
];

export const POSTER_TYPES = [
  'Warning Poster',
  'Instruction Poster',
  'Awareness Poster',
  'Event Poster',
  'Reminder Poster',
  'Emergency Poster',
  'Motivational Poster',
  'Lessons Learned Poster',
  'Compliance Poster',
  'Announcement Poster',
  'Other',
];

export const POSTER_TOPICS = [
  'Work at Height', 'PPE', 'Fire Safety',
  'Heat Stress', 'Confined Space',
  'Electrical Safety', 'Manual Handling',
  'Lifting Operations', 'Housekeeping',
  'Traffic Safety', 'Emergency Response',
  'RAMS Compliance', 'Permit Compliance',
  'Incident Prevention', 'Near Miss Reporting',
  'Ergonomics', 'Mental Health / Wellbeing',
  'First Aid', 'Chemical Safety', 'Other',
];

export const POSTER_AUDIENCES = [
  'All Workers', 'Supervisors', 'Contractors',
  'Operators', 'Drivers', 'Electricians',
  'Welders', 'Visitors', 'Emergency Team',
  'Management', 'Other',
];

export const POSTER_ORIENTATIONS = ['Portrait', 'Landscape'] as const;

export const POSTER_STATUSES = [
  'Draft', 'Under Review', 'Approved', 'Published', 'Archived',
] as const;

export const POSTER_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export const POSTER_FONT_SIZES = ['Small', 'Medium', 'Large', 'Extra Large'] as const;

export const POSTER_TEXT_ALIGNMENTS = ['Left', 'Center', 'Right'] as const;

export const POSTER_PRINT_SIZES = ['A4', 'A3', 'Letter', 'Custom'] as const;

export const POSTER_LAYOUT_TYPES = [
  'hero', 'two-column', 'emergency', 'minimal', 'bold',
] as const;

export interface PosterTheme {
  key: string;
  label: string;
  primary: string;
  accent: string;
  background: string;
  text: string;
  header_bg: string;
  header_text: string;
}

export const POSTER_THEMES: PosterTheme[] = [
  {
    key: 'safety_green',
    label: 'Safety Green',
    primary: '#065F46',
    accent: '#2E9E45',
    background: '#F0FDF4',
    text: '#1A1A1A',
    header_bg: '#065F46',
    header_text: '#FFFFFF',
  },
  {
    key: 'warning_red',
    label: 'Warning Red',
    primary: '#991B1B',
    accent: '#DC2626',
    background: '#FFF5F5',
    text: '#1A1A1A',
    header_bg: '#991B1B',
    header_text: '#FFFFFF',
  },
  {
    key: 'caution_amber',
    label: 'Caution Amber',
    primary: '#92400E',
    accent: '#D97706',
    background: '#FFFBEB',
    text: '#1A1A1A',
    header_bg: '#B45309',
    header_text: '#FFFFFF',
  },
  {
    key: 'trust_blue',
    label: 'Trust Blue',
    primary: '#1E3A5F',
    accent: '#2563EB',
    background: '#EFF6FF',
    text: '#1A1A1A',
    header_bg: '#1E3A5F',
    header_text: '#FFFFFF',
  },
  {
    key: 'professional_dark',
    label: 'Professional Dark',
    primary: '#111827',
    accent: '#4B5563',
    background: '#F9FAFB',
    text: '#111827',
    header_bg: '#111827',
    header_text: '#FFFFFF',
  },
  {
    key: 'clean_white',
    label: 'Clean White',
    primary: '#374151',
    accent: '#6B7280',
    background: '#FFFFFF',
    text: '#111827',
    header_bg: '#F3F4F6',
    header_text: '#111827',
  },
];

export function getThemeByKey(key: string): PosterTheme {
  return POSTER_THEMES.find(t => t.key === key) || POSTER_THEMES[0];
}

export function getThemeOptions() {
  return POSTER_THEMES.map(t => ({ value: t.key, label: t.label, theme: t }));
}
