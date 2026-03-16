CREATE TABLE IF NOT EXISTS collections_cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contractor_user_id INT NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  amount_cents INT NOT NULL,
  stage ENUM('reminder','demand_letter','payment_plan','collections_partner','resolved') NOT NULL DEFAULT 'reminder',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deposit_recommendations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_key VARCHAR(255) NOT NULL,
  risk_score INT,
  risk_level ENUM('low','medium','high') NOT NULL,
  recommended_deposit_percent INT NOT NULL,
  recommended_payment_plan ENUM('on_completion','50_50','deposit_plus_milestones') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contractor_benchmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contractor_user_id INT NOT NULL,
  city VARCHAR(128) NOT NULL,
  trade VARCHAR(128) NOT NULL,
  dispute_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  cancellation_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  late_pay_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  percentile_rank INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS smart_intake_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contractor_user_id INT NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  job_type VARCHAR(255) NOT NULL,
  notes TEXT,
  red_flags_json TEXT,
  recommended_terms_json TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reputation_passports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_key VARCHAR(255) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  strengths_json TEXT NOT NULL,
  visibility ENUM('private','shareable') NOT NULL DEFAULT 'private',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partnership_leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partner_type ENUM('supply_house','association','insurance','franchise','financing') NOT NULL,
  organization VARCHAR(255) NOT NULL,
  market VARCHAR(128) NOT NULL,
  status ENUM('prospect','active','paused') NOT NULL DEFAULT 'prospect',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enterprise_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  branch_count INT NOT NULL DEFAULT 1,
  seats INT NOT NULL DEFAULT 1,
  crm_integration VARCHAR(128),
  status ENUM('pilot','active') NOT NULL DEFAULT 'pilot',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_claim_workflows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  review_id INT NOT NULL,
  contractor_user_id INT NOT NULL,
  path ENUM('case','dispute','demand_notice','payment_protection_claim') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS territory_predictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zip_code VARCHAR(16) NOT NULL,
  city VARCHAR(128) NOT NULL,
  trade VARCHAR(128) NOT NULL,
  chargeback_risk DECIMAL(5,2) NOT NULL DEFAULT 0,
  cancellation_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  payment_strength VARCHAR(64) NOT NULL,
  trend ENUM('up','flat','down') NOT NULL DEFAULT 'flat',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_control_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contractor_user_id INT NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  deposit_link_issued BOOLEAN NOT NULL DEFAULT TRUE,
  milestone_billing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  signed_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  financing_offered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
