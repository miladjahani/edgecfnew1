/*
# miliconfig Pro — Multi-Tenant User Management Schema

## Overview
Adds multi-tenant support with admin profiles, sub-users with limits (data/time/daily),
and user configurations for different protocols (gRPC, WS, XHTTPS).

## New Tables

1. **admin_profiles** — Admin profile for each authenticated user
   - `id` (uuid PK, references auth.users)
   - `email` (text)
   - `is_super_admin` (boolean, default false)
   - `created_at` (timestamptz)

2. **sub_users** — Sub-users managed by admins
   - `id` (uuid PK)
   - `admin_id` (uuid, FK to admin_profiles)
   - `username` (text)
   - `password` (text)
   - `uuid` (uuid, unique VLESS UUID)
   - `data_limit_gb` (integer, total data limit in GB, 0 = unlimited)
   - `time_limit_days` (integer, subscription validity in days)
   - `daily_limit_gb` (integer, daily data limit in GB, 0 = unlimited)
   - `expiration_date` (timestamptz)
   - `is_active` (boolean)
   - `created_at` (timestamptz)
   - `usage_gb` (real, current usage)
   - `last_reset` (timestamptz, for daily limit reset)

3. **user_configs** — User configurations for different protocols
   - `id` (uuid PK)
   - `user_id` (uuid, FK to sub_users)
   - `protocol` (text: 'grpc', 'ws', 'xhttps', 'h2')
   - `config_json` (jsonb, protocol-specific config)
   - `subscription_link` (text, subscription URL)
   - `last_used` (timestamptz)
   - `created_at` (timestamptz)

## Security
- RLS enabled on ALL tables.
- Admins can only manage their own sub-users (admin_id = auth.uid()).
- Super admins can see and manage all users.

## Seed Data
- Creates admin_profile for milad201400@gmail.com as super_admin.
*/

-- admin_profiles table
CREATE TABLE IF NOT EXISTS admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_super_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_admin_profile" ON admin_profiles;
CREATE POLICY "select_own_admin_profile" ON admin_profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_super_admin = true
  ));

DROP POLICY IF EXISTS "insert_own_admin_profile" ON admin_profiles;
CREATE POLICY "insert_own_admin_profile" ON admin_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_admin_profile" ON admin_profiles;
CREATE POLICY "update_own_admin_profile" ON admin_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_admin_profile" ON admin_profiles;
CREATE POLICY "delete_own_admin_profile" ON admin_profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Trigger to create admin profile on user signup
CREATE OR REPLACE FUNCTION create_admin_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_profiles (id, email, is_super_admin)
  VALUES (NEW.id, NEW.email, false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_admin_profile ON auth.users;
CREATE TRIGGER trigger_create_admin_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_admin_profile();

-- Insert super admin for milad201400@gmail.com
INSERT INTO admin_profiles (id, email, is_super_admin)
SELECT id, email, true FROM auth.users WHERE email = 'milad201400@gmail.com'
ON CONFLICT (id) DO UPDATE SET is_super_admin = true;

-- sub_users table
CREATE TABLE IF NOT EXISTS sub_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin_profiles(id) ON DELETE CASCADE,
  username text NOT NULL,
  password text NOT NULL,
  uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  data_limit_gb integer NOT NULL DEFAULT 0,
  time_limit_days integer NOT NULL DEFAULT 0,
  daily_limit_gb integer NOT NULL DEFAULT 0,
  expiration_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  usage_gb real NOT NULL DEFAULT 0,
  last_reset timestamptz DEFAULT now(),
  UNIQUE (admin_id, username)
);

ALTER TABLE sub_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subusers" ON sub_users;
CREATE POLICY "select_own_subusers" ON sub_users FOR SELECT
  TO authenticated USING (
    admin_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

DROP POLICY IF EXISTS "insert_own_subusers" ON sub_users;
CREATE POLICY "insert_own_subusers" ON sub_users FOR INSERT
  TO authenticated WITH CHECK (
    admin_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

DROP POLICY IF EXISTS "update_own_subusers" ON sub_users;
CREATE POLICY "update_own_subusers" ON sub_users FOR UPDATE
  TO authenticated USING (
    admin_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

DROP POLICY IF EXISTS "delete_own_subusers" ON sub_users;
CREATE POLICY "delete_own_subusers" ON sub_users FOR DELETE
  TO authenticated USING (
    admin_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- user_configs table
CREATE TABLE IF NOT EXISTS user_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES sub_users(id) ON DELETE CASCADE,
  protocol text NOT NULL CHECK (protocol IN ('grpc', 'ws', 'xhttps', 'h2')),
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  subscription_link text,
  last_used timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_userconfigs" ON user_configs;
CREATE POLICY "select_own_userconfigs" ON user_configs FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM sub_users su 
      WHERE su.id = user_configs.user_id 
      AND (su.admin_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_super_admin = true))
    )
  );

DROP POLICY IF EXISTS "insert_own_userconfigs" ON user_configs;
CREATE POLICY "insert_own_userconfigs" ON user_configs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM sub_users su 
      WHERE su.id = user_configs.user_id 
      AND (su.admin_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_super_admin = true))
    )
  );

DROP POLICY IF EXISTS "update_own_userconfigs" ON user_configs;
CREATE POLICY "update_own_userconfigs" ON user_configs FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM sub_users su 
      WHERE su.id = user_configs.user_id 
      AND (su.admin_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_super_admin = true))
    )
  );

DROP POLICY IF EXISTS "delete_own_userconfigs" ON user_configs;
CREATE POLICY "delete_own_userconfigs" ON user_configs FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM sub_users su 
      WHERE su.id = user_configs.user_id 
      AND (su.admin_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND is_super_admin = true))
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_profiles_email ON admin_profiles(email);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_super ON admin_profiles(is_super_admin);
CREATE INDEX IF NOT EXISTS idx_sub_users_admin ON sub_users(admin_id);
CREATE INDEX IF NOT EXISTS idx_sub_users_active ON sub_users(is_active);
CREATE INDEX IF NOT EXISTS idx_sub_users_expiration ON sub_users(expiration_date);
CREATE INDEX IF NOT EXISTS idx_user_configs_user ON user_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_configs_protocol ON user_configs(protocol);

-- Function to calculate expiration date
CREATE OR REPLACE FUNCTION calculate_expiration(days integer)
RETURNS timestamptz AS $$
BEGIN
  IF days <= 0 THEN
    RETURN NULL;
  END IF;
  RETURN now() + (days || ' days')::interval;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has exceeded limits
CREATE OR REPLACE FUNCTION check_user_limits(p_user_id uuid)
RETURNS TABLE (
  is_expired boolean,
  is_over_data_limit boolean,
  is_over_daily_limit boolean,
  remaining_days integer,
  remaining_data_gb real,
  remaining_daily_gb real
) AS $$
DECLARE
  user_rec RECORD;
  days_left integer;
  data_left real;
  daily_left real;
  last_reset_date timestamptz;
BEGIN
  SELECT * INTO user_rec FROM sub_users WHERE id = p_user_id;
  
  IF user_rec IS NULL THEN
    RETURN QUERY SELECT true, true, true, 0, 0::real, 0::real;
    RETURN;
  END IF;
  
  -- Check expiration
  IF user_rec.expiration_date IS NOT NULL THEN
    days_left := EXTRACT(DAY FROM (user_rec.expiration_date - now()));
    IF days_left < 0 THEN
      RETURN QUERY SELECT true, false, false, days_left, 0::real, 0::real;
      RETURN;
    END IF;
  ELSE
    days_left := -1; -- unlimited
  END IF;
  
  -- Check total data limit
  IF user_rec.data_limit_gb > 0 THEN
    data_left := user_rec.data_limit_gb - user_rec.usage_gb;
    IF data_left <= 0 THEN
      RETURN QUERY SELECT false, true, false, days_left, data_left, 0::real;
      RETURN;
    END IF;
  ELSE
    data_left := -1; -- unlimited
  END IF;
  
  -- Check daily limit (reset at midnight UTC or custom reset time)
  last_reset_date := DATE_TRUNC('day', now());
  IF user_rec.last_reset < last_reset_date THEN
    -- Reset daily usage
    UPDATE sub_users SET usage_gb = 0, last_reset = last_reset_date WHERE id = p_user_id;
    user_rec.usage_gb := 0;
  END IF;
  
  IF user_rec.daily_limit_gb > 0 THEN
    -- Assuming usage_gb includes daily usage (in real implementation, track separately)
    daily_left := user_rec.daily_limit_gb - (user_rec.usage_gb - GREATEST(0, user_rec.usage_gb - user_rec.daily_limit_gb));
    IF daily_left <= 0 THEN
      RETURN QUERY SELECT false, false, true, days_left, data_left, daily_left;
      RETURN;
    END IF;
  ELSE
    daily_left := -1; -- unlimited
  END IF;
  
  RETURN QUERY SELECT false, false, false, days_left, data_left, daily_left;
END;
$$ LANGUAGE plpgsql;
