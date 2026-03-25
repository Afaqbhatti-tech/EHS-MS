-- ============================================
-- EHS·OS Database Schema (MySQL 8.x)
-- Converted from PostgreSQL — March 2026
-- ============================================

USE EHS;

-- ============================================
-- USERS & AUTH
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('EHS Manager','Safety Officer','Site Engineer','Contractor HSE Representative','Client / Consultant','System Administrator','Viewer / Management')),
  contractor VARCHAR(50) CHECK (contractor IN ('CCCC','CCC Rail','Artal','FFT Direct')),
  avatar_url TEXT,
  permissions JSON DEFAULT ('[]'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- OBSERVATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS observations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  observation_id VARCHAR(50) UNIQUE NOT NULL,
  observation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reporting_officer_id CHAR(36),
  area VARCHAR(255) NOT NULL,
  contractor VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  observation_type VARCHAR(255) NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('High','Medium','Low')),
  description TEXT NOT NULL,
  immediate_action TEXT,
  responsible_supervisor VARCHAR(255),
  proposed_rectification_date DATE,
  status VARCHAR(30) DEFAULT 'Open' CHECK (status IN ('Open','In Progress','Closed','Verified','Overdue','Reopened')),
  escalation_required BOOLEAN DEFAULT false,
  linked_permit_id CHAR(36),
  linked_incident_id CHAR(36),
  verified_by VARCHAR(255),
  verified_date DATE,
  before_photos JSON DEFAULT ('[]'),
  after_photos JSON DEFAULT ('[]'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reporting_officer_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================
-- PERMITS TO WORK (PTW)
-- ============================================
CREATE TABLE IF NOT EXISTS permits (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  permit_id VARCHAR(50) UNIQUE NOT NULL,
  permit_type VARCHAR(255) NOT NULL,
  work_description TEXT NOT NULL,
  phase VARCHAR(255),
  zone VARCHAR(255) NOT NULL,
  specific_area VARCHAR(255),
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  shift VARCHAR(20) CHECK (shift IN ('Day','Night','All day')),
  contractor VARCHAR(255) NOT NULL,
  number_of_workers INT,
  issuing_authority VARCHAR(255),
  reviewing_hse_officer_id CHAR(36),
  status VARCHAR(30) DEFAULT 'Draft' CHECK (status IN ('Draft','Pending Review','Approved','Active','Suspended','Closed','Cancelled','Expired')),
  linked_mos_ra TEXT,
  linked_checklist TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewing_hse_officer_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================
-- PERMIT AMENDMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS permit_amendments (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  amendment_id VARCHAR(50) UNIQUE NOT NULL,
  permit_id CHAR(36),
  amendment_type VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  original_valid_from DATE,
  original_valid_to DATE,
  amended_valid_to DATE,
  extension_days INT,
  requested_by VARCHAR(255),
  requested_date DATE,
  supporting_documents TEXT,
  approval_status VARCHAR(20) DEFAULT 'Pending' CHECK (approval_status IN ('Pending','Approved','Rejected')),
  approved_by VARCHAR(255),
  approved_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (permit_id) REFERENCES permits(id)
) ENGINE=InnoDB;

-- ============================================
-- MOCK-UP REGISTER
-- ============================================
CREATE TABLE IF NOT EXISTS mockups (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  mockup_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  procedure_type VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  area VARCHAR(255) NOT NULL,
  work_front VARCHAR(255),
  contractor VARCHAR(255) NOT NULL,
  activity_description TEXT,
  conducted_by VARCHAR(255),
  attendance JSON DEFAULT ('[]'),
  linked_mos VARCHAR(255),
  linked_ra VARCHAR(255),
  linked_permit_id CHAR(36),
  other_linked_docs TEXT,
  fft_decision VARCHAR(50) DEFAULT 'Pending',
  consultant_decision VARCHAR(50) DEFAULT 'Pending',
  client_decision VARCHAR(50) DEFAULT 'Pending',
  overall_status VARCHAR(50) DEFAULT 'Pending',
  remarks JSON DEFAULT ('[]'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- WEEKLY MOM
-- ============================================
CREATE TABLE IF NOT EXISTS moms (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  mom_id VARCHAR(50) UNIQUE NOT NULL,
  meeting_title VARCHAR(255) NOT NULL,
  meeting_type VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  location VARCHAR(255),
  chaired_by VARCHAR(255),
  prepared_by VARCHAR(255),
  attendees JSON DEFAULT ('[]'),
  discussion_summary TEXT,
  action_items JSON DEFAULT ('[]'),
  previous_closeouts JSON DEFAULT ('[]'),
  distributed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- MANPOWER & MAN-HOURS
-- ============================================
CREATE TABLE IF NOT EXISTS manpower_records (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  record_date DATE NOT NULL,
  shift VARCHAR(50) NOT NULL,
  area VARCHAR(255) NOT NULL,
  contractor VARCHAR(255) NOT NULL,
  team VARCHAR(255),
  supervisor VARCHAR(255),
  safety_officer_id CHAR(36),
  workfront VARCHAR(255),
  ramadan_mode BOOLEAN DEFAULT false,
  workers JSON DEFAULT ('[]'),
  total_headcount INT DEFAULT 0,
  present_count INT DEFAULT 0,
  absent_count INT DEFAULT 0,
  total_manhours DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (safety_officer_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================
-- INCIDENTS
-- ============================================
CREATE TABLE IF NOT EXISTS incidents (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  incident_id VARCHAR(50) UNIQUE NOT NULL,
  record_type VARCHAR(255) NOT NULL,
  incident_date TIMESTAMP NOT NULL,
  area VARCHAR(255) NOT NULL,
  contractor VARCHAR(255) NOT NULL,
  classification VARCHAR(255),
  severity VARCHAR(20) CHECK (severity IN ('Minor','Major','Critical')),
  description TEXT NOT NULL,
  injury_type VARCHAR(255),
  body_part VARCHAR(255),
  medical_treatment TEXT,
  lost_time BOOLEAN DEFAULT false,
  restricted_work BOOLEAN DEFAULT false,
  first_aid BOOLEAN DEFAULT false,
  property_damage BOOLEAN DEFAULT false,
  environmental_impact BOOLEAN DEFAULT false,
  involved_person VARCHAR(255),
  command_number VARCHAR(100),
  witnesses JSON DEFAULT ('[]'),
  root_cause TEXT,
  contributing_factors JSON DEFAULT ('[]'),
  corrective_actions JSON DEFAULT ('[]'),
  preventive_actions JSON DEFAULT ('[]'),
  investigation_team JSON DEFAULT ('[]'),
  status VARCHAR(30) DEFAULT 'Open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- VIOLATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS violations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  violation_id VARCHAR(50) UNIQUE NOT NULL,
  date TIMESTAMP NOT NULL,
  area VARCHAR(255) NOT NULL,
  contractor VARCHAR(255) NOT NULL,
  employee_name VARCHAR(255),
  employee_id VARCHAR(100),
  severity VARCHAR(20) CHECK (severity IN ('Minor','Major','Critical')),
  action_type VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  related_golden_rule VARCHAR(255),
  evidence JSON DEFAULT ('[]'),
  penalty_amount DECIMAL(10,2),
  retraining_required BOOLEAN DEFAULT false,
  retraining_due_date DATE,
  access_suspended BOOLEAN DEFAULT false,
  appeal_status VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- EQUIPMENT & ASSETS
-- ============================================
CREATE TABLE IF NOT EXISTS equipment (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  asset_id VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(255) NOT NULL,
  asset_type VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  make VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(255),
  plate_number VARCHAR(100),
  owner_contractor VARCHAR(255),
  assigned_area VARCHAR(255),
  assigned_operator VARCHAR(255),
  first_arrival DATE,
  inspection_frequency VARCHAR(100),
  next_inspection_due DATE,
  certificate_number VARCHAR(255),
  certificate_expiry DATE,
  certificate_upload TEXT,
  swl VARCHAR(100),
  status VARCHAR(30) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- TRAINING MATRIX
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  designation VARCHAR(255),
  department VARCHAR(255),
  team VARCHAR(255),
  supervisor VARCHAR(255),
  nationality VARCHAR(100),
  worker_category VARCHAR(20) CHECK (worker_category IN ('Chinese','Local','Muslim','Other')),
  contact VARCHAR(100),
  email VARCHAR(255),
  badge_number VARCHAR(100),
  joining_date DATE,
  mobilization_date DATE,
  demobilization_date DATE,
  status VARCHAR(30) DEFAULT 'Active',
  medical_fitness_status VARCHAR(100),
  medical_fitness_expiry DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS training_records (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  training_id VARCHAR(50) UNIQUE NOT NULL,
  employee_id CHAR(36),
  category VARCHAR(255),
  topic VARCHAR(255) NOT NULL,
  role_based_requirement BOOLEAN DEFAULT false,
  training_date DATE,
  trainer VARCHAR(255),
  validity_period VARCHAR(100),
  expiry_date DATE,
  next_refresh_due DATE,
  result VARCHAR(30) CHECK (result IN ('Attended','Passed','Failed','Refresher Required')),
  certificate_number VARCHAR(255),
  certificate_upload TEXT,
  attendance_sheet TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB;

-- ============================================
-- WASTE MANIFESTS (Environmental)
-- ============================================
CREATE TABLE IF NOT EXISTS waste_manifests (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  manifest_id VARCHAR(50) UNIQUE NOT NULL,
  waste_type VARCHAR(255) NOT NULL,
  waste_description TEXT,
  quantity DECIMAL(10,2),
  quantity_unit VARCHAR(50),
  number_of_containers INT,
  contractor VARCHAR(255) NOT NULL,
  area VARCHAR(255),
  collection_date DATE,
  un_classification VARCHAR(100),
  temp_storage VARCHAR(255),
  disposal_vendor VARCHAR(255),
  disposal_site VARCHAR(255),
  transport_company VARCHAR(255),
  vehicle_plate VARCHAR(100),
  driver_name VARCHAR(255),
  scheduled_pickup DATE,
  disposal_licence VARCHAR(255),
  manifest_status VARCHAR(20) DEFAULT 'Pending' CHECK (manifest_status IN ('Pending','Submitted','Verified')),
  generator_signed BOOLEAN DEFAULT false,
  fft_hse_signed BOOLEAN DEFAULT false,
  transporter_signed BOOLEAN DEFAULT false,
  facility_signed BOOLEAN DEFAULT false,
  signed_copy TEXT,
  photo_evidence JSON DEFAULT ('[]'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- DOCUMENT CONTROL
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  document_number VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  document_type VARCHAR(255) NOT NULL,
  revision VARCHAR(20) DEFAULT 'A',
  file_url TEXT,
  ai_generated BOOLEAN DEFAULT false,
  final_approved BOOLEAN DEFAULT false,
  proof_of_communication TEXT,
  client_review_status VARCHAR(30) DEFAULT 'Pending',
  lucid_review_status VARCHAR(30) DEFAULT 'Pending',
  pmcm_review_status VARCHAR(30) DEFAULT 'Pending',
  created_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================
-- MOCK DRILLS / ERP
-- ============================================
CREATE TABLE IF NOT EXISTS mock_drills (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  drill_id VARCHAR(50) UNIQUE NOT NULL,
  topic VARCHAR(255) NOT NULL,
  drill_type VARCHAR(255),
  planned_date DATE,
  actual_date DATE,
  area VARCHAR(255),
  scenario TEXT,
  objective TEXT,
  participants_count INT,
  alarm_method VARCHAR(255),
  response_time VARCHAR(100),
  evacuation_time VARCHAR(100),
  outcome TEXT,
  findings TEXT,
  gaps TEXT,
  lessons_learned TEXT,
  corrective_actions JSON DEFAULT ('[]'),
  kpi_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- CAMPAIGNS
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  campaign_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  theme VARCHAR(255),
  category VARCHAR(255),
  start_date DATE,
  end_date DATE,
  area VARCHAR(255),
  objective TEXT,
  target_audience VARCHAR(255),
  campaign_lead VARCHAR(255),
  materials JSON DEFAULT ('[]'),
  participants_count INT,
  kpi_target VARCHAR(255),
  kpi_actual VARCHAR(255),
  outcome_summary TEXT,
  lessons_learned TEXT,
  management_review_done BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- AI DOCUMENT EMBEDDINGS (simplified for MySQL)
-- ============================================
CREATE TABLE IF NOT EXISTS document_embeddings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  document_id CHAR(36),
  chunk_text TEXT NOT NULL,
  embedding JSON,
  metadata JSON DEFAULT ('{}'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id)
) ENGINE=InnoDB;

-- ============================================
-- AUDIT TRAIL
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  table_name VARCHAR(255) NOT NULL,
  record_id CHAR(36) NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by CHAR(36),
  old_data JSON,
  new_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (changed_by) REFERENCES users(id)
) ENGINE=InnoDB;
