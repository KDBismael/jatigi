-- ============================================================
-- Jatigi/Warko — Migration 009: phone number on profiles
-- ============================================================
-- Collected at signup (the account owner's phone) and shown in the platform
-- (super-admin) users view.

ALTER TABLE profiles ADD COLUMN phone TEXT;
