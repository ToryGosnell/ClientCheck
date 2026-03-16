
CREATE TABLE customer_risk_scores (
 id VARCHAR(36) PRIMARY KEY,
 customer_id VARCHAR(36),
 risk_score INT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disputes (
 id VARCHAR(36) PRIMARY KEY,
 review_id VARCHAR(36),
 customer_id VARCHAR(36),
 contractor_id VARCHAR(36),
 status VARCHAR(20),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fraud_signals (
 id VARCHAR(36) PRIMARY KEY,
 user_id VARCHAR(36),
 ip_address VARCHAR(45),
 device_id VARCHAR(100),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
