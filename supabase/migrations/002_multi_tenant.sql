-- ============================================================
-- Jatigi — Migration 002: Multi-tenant organizations
-- ============================================================

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add organization_id to profiles
ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to products
ALTER TABLE products ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to orders
ALTER TABLE orders ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Enable RLS on organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: current user's organization id
-- ============================================================
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Organizations RLS
-- ============================================================
CREATE POLICY "Users see own organization"
  ON organizations FOR SELECT USING (id = current_org_id());

CREATE POLICY "Service role can insert organizations"
  ON organizations FOR INSERT WITH CHECK (true);

-- ============================================================
-- Profiles RLS — replace flat policies with org-scoped ones
-- ============================================================
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

CREATE POLICY "Users see own org profiles"
  ON profiles FOR SELECT USING (
    organization_id = current_org_id() OR id = auth.uid()
  );

-- ============================================================
-- Products RLS — replace flat policies with org-scoped ones
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read products" ON products;
DROP POLICY IF EXISTS "Only admins can insert products" ON products;
DROP POLICY IF EXISTS "Only admins can update products" ON products;
DROP POLICY IF EXISTS "Only admins can delete products" ON products;

CREATE POLICY "Users see own org products"
  ON products FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "Admins insert own org products"
  ON products FOR INSERT WITH CHECK (
    organization_id = current_org_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins update own org products"
  ON products FOR UPDATE USING (
    organization_id = current_org_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins delete own org products"
  ON products FOR DELETE USING (
    organization_id = current_org_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Orders RLS — replace flat policies with org-scoped ones
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;

CREATE POLICY "Users see own org orders"
  ON orders FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "Users insert own org orders"
  ON orders FOR INSERT WITH CHECK (organization_id = current_org_id());

CREATE POLICY "Users update own org orders"
  ON orders FOR UPDATE USING (organization_id = current_org_id());

-- ============================================================
-- Update products_public view to include organization_id
-- ============================================================
DROP VIEW IF EXISTS products_public;
CREATE VIEW products_public AS
  SELECT id, name, sale_price, stock_quantity, organization_id, created_at
  FROM products;
