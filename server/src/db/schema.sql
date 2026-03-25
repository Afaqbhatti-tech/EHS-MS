-- ============================================
-- EHS·OS Database Schema (Supabase / PostgreSQL)
-- Version 1.0 — March 2026
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- ============================================
-- USERS & AUTH
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('EHS Manager','Safety Officer','Site Engineer','Contractor HSE Representative','Client / Consultant','System Administrator','Viewer / Management')),
  contractor TEXT CHECK (contractor IN ('CCCC','CCC Rail','Artal','FFT Direct')),
  avatar_url TEXT,
  permissions JSONB DEFAULT '[]'::JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- OBSERVATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observation_id TEXT UNIQUE NOT NULL, -- OBS-0001
  observation_date TIMESTAMPTZ DEFAULT NOW(),
  reporting_officer_id UUID REFERENCES users(id),
  area TEXT NOT NULL,
  contractor TEXT NOT NULL,
  category TEXT NOT NULL,
  observation_type TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('High','Medium','Low')),
  description TEXT NOT NULL,
  immediate_action TEXT,
  responsible_supervisor TEXT,
  proposed_rectification_date DATE,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open','In Progress','Closed','Verified','Overdue','Reopened')),
  escalation_required BOOLEAN DEFAULT false,
  linked_permit_id UUID,
  linked_incident_id UUID,
  verified_by TEXT,
  verified_date DATE,
  before_photos JSONB DEFAULT '[]'::JSONB,
  after_photos JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PERMITS TO WORK (PTW)
-- ============================================
CREATE TABLE IF NOT EXISTS permits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permit_id TEXT UNIQUE NOT NULL, -- PTW-0001
  permit_type TEXT NOT NULL,
  work_description TEXT NOT NULL,
  phase TEXT,
  zone TEXT NOT NULL,
  specific_area TEXT,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  shift TEXT CHECK (shift IN ('Day','Night','All day')),
  contractor TEXT NOT NULL,
  number_of_workers INTEGER,
  issuing_authority TEXT,
  reviewing_hse_officer_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft','Pending Review','Approved','Active','Suspended','Closed','Cancelled','Expired')),
  linked_mos_ra TEXT,
  linked_checklist TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PERMIT AMENDMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS permit_amendments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amendment_id TEXT UNIQUE NOT NULL, -- AMD-2026-001
  permit_id UUID REFERENCES permits(id),
  amendment_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  original_valid_from DATE,
  original_valid_to DATE,
  amended_valid_to DATE,
  extension_days INTEGER,
  requested_by TEXT,
  requested_date DATE,
  supporting_documents TEXT,
  approval_status TEXT DEFAULT 'Pending' CHECK (approval_status IN ('Pending','Approved','Rejected')),
  approved_by TEXT,
  approved_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MOCK-UP REGISTER
-- ============================================
CREATE TABLE IF NOT EXISTS mockups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mockup_id TEXT UNIQUE NOT NULL, -- MU-2026-001
  title TEXT NOT NULL,
  procedure_type TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  area TEXT NOT NULL,
  work_front TEXT,
  contractor TEXT NOT NULL,
  activity_description TEXT,
  conducted_by TEXT,
  attendance JSONB DEFAULT '[]'::JSONB,
  linked_mos TEXT,
  linked_ra TEXT,
  linked_permit_id UUID,
  other_linked_docs TEXT,
  fft_decision TEXT DEFAULT 'Pending',
  consultant_decision TEXT DEFAULT 'Pending',
  client_decision TEXT DEFAULT 'Pending',
  overall_status TEXT DEFAULT 'Pending',
  remarks JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WEEKLY MOM
-- ============================================
CREATE TABLE IF NOT EXISTS moms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mom_id TEXT UNIQUE NOT NULL, -- MOM-2026-001
  meeting_title TEXT NOT NULL,
  meeting_type TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  location TEXT,
  chaired_by TEXT,
  prepared_by TEXT,
  attendees JSONB DEFAULT '[]'::JSONB,
  discussion_summary TEXT,
  action_items JSONB DEFAULT '[]'::JSONB,
  previous_closeouts JSONB DEFAULT '[]'::JSONB,
  distributed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MANPOWER & MAN-HOURS
-- ============================================
CREATE TABLE IF NOT EXISTS manpower_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_date DATE NOT NULL,
  shift TEXT NOT NULL,
  area TEXT NOT NULL,
  contractor TEXT NOT NULL,
  team TEXT,
  supervisor TEXT,
  safety_officer_id UUID REFERENCES users(id),
  workfront TEXT,
  ramadan_mode BOOLEAN DEFAULT false,
  workers JSONB DEFAULT '[]'::JSONB,
  total_headcount INTEGER DEFAULT 0,
  present_count INTEGER DEFAULT 0,
  absent_count INTEGER DEFAULT 0,
  total_manhours DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INCIDENTS
-- ============================================
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id TEXT UNIQUE NOT NULL, -- INC-0001
  record_type TEXT NOT NULL,
  incident_date TIMESTAMPTZ NOT NULL,
  area TEXT NOT NULL,
  contractor TEXT NOT NULL,
  classification TEXT,
  severity TEXT CHECK (severity IN ('Minor','Major','Critical')),
  description TEXT NOT NULL,
  injury_type TEXT,
  body_part TEXT,
  medical_treatment TEXT,
  lost_time BOOLEAN DEFAULT false,
  restricted_work BOOLEAN DEFAULT false,
  first_aid BOOLEAN DEFAULT false,
  property_damage BOOLEAN DEFAULT false,
  environmental_impact BOOLEAN DEFAULT false,
  involved_person TEXT,
  command_number TEXT,
  witnesses JSONB DEFAULT '[]'::JSONB,
  root_cause TEXT,
  contributing_factors JSONB DEFAULT '[]'::JSONB,
  corrective_actions JSONB DEFAULT '[]'::JSONB,
  preventive_actions JSONB DEFAULT '[]'::JSONB,
  investigation_team JSONB DEFAULT '[]'::JSONB,
  status TEXT DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VIOLATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  violation_id TEXT UNIQUE NOT NULL, -- VIO-0001
  date TIMESTAMPTZ NOT NULL,
  area TEXT NOT NULL,
  contractor TEXT NOT NULL,
  employee_name TEXT,
  employee_id TEXT,
  severity TEXT CHECK (severity IN ('Minor','Major','Critical')),
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  related_golden_rule TEXT,
  evidence JSONB DEFAULT '[]'::JSONB,
  penalty_amount DECIMAL,
  retraining_required BOOLEAN DEFAULT false,
  retraining_due_date DATE,
  access_suspended BOOLEAN DEFAULT false,
  appeal_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EQUIPMENT & ASSETS
-- ============================================
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id TEXT UNIQUE NOT NULL, -- EQ-0001
  category TEXT NOT NULL,
  asset_type TEXT,
  name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  serial_number TEXT,
  plate_number TEXT,
  owner_contractor TEXT,
  assigned_area TEXT,
  assigned_operator TEXT,
  first_arrival DATE,
  inspection_frequency TEXT,
  next_inspection_due DATE,
  certificate_number TEXT,
  certificate_expiry DATE,
  certificate_upload TEXT,
  swl TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRAINING MATRIX
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  company TEXT NOT NULL,
  designation TEXT,
  department TEXT,
  team TEXT,
  supervisor TEXT,
  nationality TEXT,
  worker_category TEXT CHECK (worker_category IN ('Chinese','Local','Muslim','Other')),
  contact TEXT,
  email TEXT,
  badge_number TEXT,
  joining_date DATE,
  mobilization_date DATE,
  demobilization_date DATE,
  status TEXT DEFAULT 'Active',
  medical_fitness_status TEXT,
  medical_fitness_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_id TEXT UNIQUE NOT NULL,
  employee_id UUID REFERENCES employees(id),
  category TEXT,
  topic TEXT NOT NULL,
  role_based_requirement BOOLEAN DEFAULT false,
  training_date DATE,
  trainer TEXT,
  validity_period TEXT,
  expiry_date DATE,
  next_refresh_due DATE,
  result TEXT CHECK (result IN ('Attended','Passed','Failed','Refresher Required')),
  certificate_number TEXT,
  certificate_upload TEXT,
  attendance_sheet TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WASTE MANIFESTS (Environmental)
-- ============================================
CREATE TABLE IF NOT EXISTS waste_manifests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manifest_id TEXT UNIQUE NOT NULL, -- MNF-2026-001
  waste_type TEXT NOT NULL,
  waste_description TEXT,
  quantity DECIMAL,
  quantity_unit TEXT,
  number_of_containers INTEGER,
  contractor TEXT NOT NULL,
  area TEXT,
  collection_date DATE,
  un_classification TEXT,
  temp_storage TEXT,
  disposal_vendor TEXT,
  disposal_site TEXT,
  transport_company TEXT,
  vehicle_plate TEXT,
  driver_name TEXT,
  scheduled_pickup DATE,
  disposal_licence TEXT,
  manifest_status TEXT DEFAULT 'Pending' CHECK (manifest_status IN ('Pending','Submitted','Verified')),
  generator_signed BOOLEAN DEFAULT false,
  fft_hse_signed BOOLEAN DEFAULT false,
  transporter_signed BOOLEAN DEFAULT false,
  facility_signed BOOLEAN DEFAULT false,
  signed_copy TEXT,
  photo_evidence JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DOCUMENT CONTROL
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  revision TEXT DEFAULT 'A',
  file_url TEXT,
  ai_generated BOOLEAN DEFAULT false,
  final_approved BOOLEAN DEFAULT false,
  proof_of_communication TEXT,
  client_review_status TEXT DEFAULT 'Pending',
  lucid_review_status TEXT DEFAULT 'Pending',
  pmcm_review_status TEXT DEFAULT 'Pending',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MOCK DRILLS / ERP
-- ============================================
CREATE TABLE IF NOT EXISTS mock_drills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drill_id TEXT UNIQUE NOT NULL,
  topic TEXT NOT NULL,
  drill_type TEXT,
  planned_date DATE,
  actual_date DATE,
  area TEXT,
  scenario TEXT,
  objective TEXT,
  participants_count INTEGER,
  alarm_method TEXT,
  response_time TEXT,
  evacuation_time TEXT,
  outcome TEXT,
  findings TEXT,
  gaps TEXT,
  lessons_learned TEXT,
  corrective_actions JSONB DEFAULT '[]'::JSONB,
  kpi_score DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CAMPAIGNS
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  theme TEXT,
  category TEXT,
  start_date DATE,
  end_date DATE,
  area TEXT,
  objective TEXT,
  target_audience TEXT,
  campaign_lead TEXT,
  materials JSONB DEFAULT '[]'::JSONB,
  participants_count INTEGER,
  kpi_target TEXT,
  kpi_actual TEXT,
  outcome_summary TEXT,
  lessons_learned TEXT,
  management_review_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI DOCUMENT VECTORS (for RAG)
-- ============================================
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id),
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector
  ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================
-- AUDIT TRAIL (soft deletes + change log)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by UUID REFERENCES users(id),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
