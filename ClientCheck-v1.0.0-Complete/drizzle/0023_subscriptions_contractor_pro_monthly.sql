-- Add contractor Pro monthly plan type (run on MySQL before using $19/mo Stripe subscriptions).
ALTER TABLE `subscriptions`
  MODIFY COLUMN `planType` ENUM(
    'verified_contractor_free_year',
    'contractor_annual',
    'contractor_pro_monthly',
    'customer_monthly',
    'annual_paid',
    'none'
  ) NOT NULL DEFAULT 'none';
