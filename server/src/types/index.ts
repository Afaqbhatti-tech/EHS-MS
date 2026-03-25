// ============================================
// EHS-OS Shared Type Definitions
// ============================================

// --- Enums / Constants ---

export const CONTRACTORS = ['CCCC', 'CCC Rail', 'Artal', 'FFT Direct'] as const;
export type Contractor = typeof CONTRACTORS[number];

export const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Station 1', 'Station 2', 'Station 3', 'Station 4', 'Station 5', 'Chassis Line', 'Door Line', 'Trim Line', 'Outwork Area', 'Logistics Gate', 'Workshop'] as const;
export type Zone = typeof ZONES[number];

export const PHASES = ['Phase 1 — Civil', 'Phase 2 — MEP', 'Phase 3 — Fit-Out'] as const;
export type Phase = typeof PHASES[number];

export const WORKER_CATEGORIES = ['Chinese', 'Local', 'Muslim', 'Other'] as const;
export type WorkerCategory = typeof WORKER_CATEGORIES[number];

// --- User & Roles ---

export const ROLES = [
  'EHS Manager',
  'Safety Officer',
  'Site Engineer',
  'Contractor HSE Representative',
  'Client / Consultant',
  'System Administrator',
  'Viewer / Management',
] as const;
export type Role = typeof ROLES[number];

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  contractor?: Contractor;
  permissions: string[];
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Observations ---

export const OBSERVATION_CATEGORIES = [
  'Outwork', 'Work at Height', 'Lifting', 'Housekeeping',
  'Behaviour', 'Muke Activity', 'Vehicle Movement', 'Others',
] as const;

export const OBSERVATION_TYPES = [
  'Unsafe Act', 'Unsafe Condition', 'Positive Observation',
  'Environmental Observation', 'Housekeeping Observation', 'Behavioural Observation',
] as const;

export const OBSERVATION_STATUSES = [
  'Open', 'In Progress', 'Closed', 'Verified', 'Overdue', 'Reopened',
] as const;

export const PRIORITIES = ['High', 'Medium', 'Low'] as const;

// --- Permits ---

export const PERMIT_TYPES = [
  'General Access / General Work', 'Work at Height', 'Lifting', 'Hot Work',
  'Confined Space Entry', 'Excavation', 'Electrical', 'LOTO / Isolation',
  'Overhead Power Line Proximity', 'Radiation Source Movement',
  'SIMOPS / Coordination', 'Commissioning / Energization', 'Chemical Work', 'Other',
] as const;

export const PERMIT_STATUSES = [
  'Draft', 'Pending Review', 'Approved', 'Active',
  'Suspended', 'Closed', 'Cancelled', 'Expired',
] as const;

// --- Incidents ---

export const INCIDENT_TYPES = [
  'Incident', 'Accident', 'Near Miss', 'Dangerous Occurrence',
  'Property Damage', 'Environmental Incident',
] as const;

export const SEVERITY_LEVELS = ['Minor', 'Major', 'Critical'] as const;

// --- Waste ---

export const WASTE_TYPES = [
  'C&D Waste', 'Hazardous / Chemical', 'Liquid / Wastewater',
  'Scrap Metal / Recyclables', 'Wood / Paper', 'Plastic Waste',
] as const;

export const MANIFEST_STATUSES = ['Pending', 'Submitted', 'Verified'] as const;

// --- Review Workflow ---

export const REVIEW_STATUSES = [
  'Pending', 'In Review', 'Accepted', 'Rejected', 'Approved',
] as const;

export const REVIEW_PARTIES = ['FFT', 'Lucid', 'SRC', 'PMCM'] as const;
