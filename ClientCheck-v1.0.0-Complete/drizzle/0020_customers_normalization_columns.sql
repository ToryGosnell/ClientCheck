-- Align `customers` with drizzle/schema.ts: normalized search + dedup columns (nullable).
ALTER TABLE `customers`
  ADD COLUMN `normalizedName` varchar(255) NULL AFTER `zip`,
  ADD COLUMN `normalizedPhone` varchar(32) NULL AFTER `normalizedName`,
  ADD COLUMN `normalizedEmail` varchar(320) NULL AFTER `normalizedPhone`,
  ADD COLUMN `normalizedAddressKey` varchar(512) NULL AFTER `normalizedEmail`,
  ADD COLUMN `searchText` text NULL AFTER `normalizedAddressKey`;--> statement-breakpoint
