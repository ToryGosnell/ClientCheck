-- Track contractor opens of directory customer profiles (verification paywall + product signals).
ALTER TABLE `customers`
  ADD COLUMN `contractorProfileViewCount` INT NOT NULL DEFAULT 0 AFTER `riskLevel`;
