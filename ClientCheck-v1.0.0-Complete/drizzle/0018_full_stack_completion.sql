-- 0018_full_stack_completion.sql
CREATE TABLE IF NOT EXISTS payment_protection_claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contractor_user_id INT NOT NULL,
  customer_id INT NULL,
  customer_name VARCHAR(255) NULL,
  amount_cents INT NOT NULL,
  reason ENUM('non_payment', 'chargeback', 'fraud', 'cancellation') NOT NULL,
  status ENUM('submitted', 'under_review', 'approved', 'denied') NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS software_integration_connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contractor_user_id INT NOT NULL,
  provider ENUM('ServiceTitan', 'Housecall Pro', 'Jobber', 'Zapier', 'Custom API') NOT NULL,
  status ENUM('connected', 'pending', 'disconnected') NOT NULL DEFAULT 'pending',
  external_account_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trust_network_badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  badge ENUM('verified_identity', 'verified_license', 'insured', 'background_checked', 'top_responder') NOT NULL,
  awarded_by_user_id INT NULL,
  awarded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS industry_insight_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  city VARCHAR(128) NOT NULL,
  trade VARCHAR(128) NOT NULL,
  metric VARCHAR(255) NOT NULL,
  value VARCHAR(255) NOT NULL,
  period_label VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integration_webhook_receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(128) NOT NULL,
  external_event_id VARCHAR(255) NOT NULL UNIQUE,
  signature_hash VARCHAR(255) NULL,
  payload_hash VARCHAR(255) NULL,
  status ENUM('received', 'processed', 'replayed', 'failed') NOT NULL DEFAULT 'received',
  payload_json TEXT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(128) NOT NULL,
  status ENUM('received', 'processed', 'failed') NOT NULL DEFAULT 'received',
  payload_json TEXT NULL,
  error_message TEXT NULL,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
