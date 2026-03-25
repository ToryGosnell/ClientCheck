-- First-party auth primitives required by backend auth-service/session-service.
-- Safe to run against partially-migrated databases.

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `emailNormalized` varchar(320) NULL AFTER `email`,
  ADD COLUMN IF NOT EXISTS `passwordHash` varchar(255) NULL AFTER `emailNormalized`,
  ADD COLUMN IF NOT EXISTS `emailVerifiedAt` timestamp NULL DEFAULT NULL AFTER `legalAcceptanceVersion`;

SET @users_email_norm_idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND index_name = 'users_email_normalized_unique'
);
SET @users_email_norm_idx_sql := IF(
  @users_email_norm_idx_exists = 0,
  'CREATE UNIQUE INDEX `users_email_normalized_unique` ON `users` (`emailNormalized`)',
  'SELECT 1'
);
PREPARE users_email_norm_idx_stmt FROM @users_email_norm_idx_sql;
EXECUTE users_email_norm_idx_stmt;
DEALLOCATE PREPARE users_email_norm_idx_stmt;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `tokenHash` varchar(255) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `revokedAt` timestamp NULL,
  `lastSeenAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ipAddress` varchar(64) NULL,
  `userAgent` varchar(255) NULL
);

SET @sessions_token_hash_idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'sessions'
    AND index_name = 'sessions_token_hash_unique'
);
SET @sessions_token_hash_idx_sql := IF(
  @sessions_token_hash_idx_exists = 0,
  'CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`tokenHash`)',
  'SELECT 1'
);
PREPARE sessions_token_hash_idx_stmt FROM @sessions_token_hash_idx_sql;
EXECUTE sessions_token_hash_idx_stmt;
DEALLOCATE PREPARE sessions_token_hash_idx_stmt;

SET @sessions_user_id_idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'sessions'
    AND index_name = 'sessions_user_id_idx'
);
SET @sessions_user_id_idx_sql := IF(
  @sessions_user_id_idx_exists = 0,
  'CREATE INDEX `sessions_user_id_idx` ON `sessions` (`userId`)',
  'SELECT 1'
);
PREPARE sessions_user_id_idx_stmt FROM @sessions_user_id_idx_sql;
EXECUTE sessions_user_id_idx_stmt;
DEALLOCATE PREPARE sessions_user_id_idx_stmt;

SET @sessions_expires_at_idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'sessions'
    AND index_name = 'sessions_expires_at_idx'
);
SET @sessions_expires_at_idx_sql := IF(
  @sessions_expires_at_idx_exists = 0,
  'CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expiresAt`)',
  'SELECT 1'
);
PREPARE sessions_expires_at_idx_stmt FROM @sessions_expires_at_idx_sql;
EXECUTE sessions_expires_at_idx_stmt;
DEALLOCATE PREPARE sessions_expires_at_idx_stmt;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `tokenHash` varchar(255) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

SET @prt_token_hash_idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'password_reset_tokens'
    AND index_name = 'password_reset_tokens_token_hash_unique'
);
SET @prt_token_hash_idx_sql := IF(
  @prt_token_hash_idx_exists = 0,
  'CREATE UNIQUE INDEX `password_reset_tokens_token_hash_unique` ON `password_reset_tokens` (`tokenHash`)',
  'SELECT 1'
);
PREPARE prt_token_hash_idx_stmt FROM @prt_token_hash_idx_sql;
EXECUTE prt_token_hash_idx_stmt;
DEALLOCATE PREPARE prt_token_hash_idx_stmt;

SET @prt_user_id_idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'password_reset_tokens'
    AND index_name = 'password_reset_tokens_user_id_idx'
);
SET @prt_user_id_idx_sql := IF(
  @prt_user_id_idx_exists = 0,
  'CREATE INDEX `password_reset_tokens_user_id_idx` ON `password_reset_tokens` (`userId`)',
  'SELECT 1'
);
PREPARE prt_user_id_idx_stmt FROM @prt_user_id_idx_sql;
EXECUTE prt_user_id_idx_stmt;
DEALLOCATE PREPARE prt_user_id_idx_stmt;

-- Ensure email verification support table exists for first-party flow.
CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `tokenHash` varchar(255) NOT NULL UNIQUE,
  `status` enum('pending','verified','expired','revoked') NOT NULL DEFAULT 'pending',
  `expiresAt` timestamp NOT NULL,
  `verifiedAt` timestamp NULL,
  `lastSentAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sendAttempts` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
