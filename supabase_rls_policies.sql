-- ==========================================
-- SQL to Update Supabase RLS Policies for Hybrid Auth & Account Binding
-- ==========================================
-- Run this in your Supabase SQL Editor to allow both native Supabase Auth (for Email/Password)
-- and Firebase Auth (for Google Sign-In via 'x-firebase-auth' header).

-- 0. Add firebase_uid column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS firebase_uid text UNIQUE;

-- Self-contained PL/pgSQL function to decode Firebase JWT and extract the 'sub' (UID) claim
CREATE OR REPLACE FUNCTION public.firebase_uid()
RETURNS text AS $$
DECLARE
  headers json;
  auth_header text;
  jwt_parts text[];
  payload_json json;
  padding_len int;
  cleaned_payload text;
  extracted_uid text;
BEGIN
  -- Get request headers safely
  BEGIN
    headers := current_setting('request.headers', true)::json;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  
  IF headers IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Extract x-firebase-auth header
  auth_header := headers->>'x-firebase-auth';
  IF auth_header IS NULL OR auth_header = '' THEN
    auth_header := headers->>'X-Firebase-Auth';
    IF auth_header IS NULL OR auth_header = '' THEN
      RETURN NULL;
    END IF;
  END IF;

  -- Split JWT (header.payload.signature)
  jwt_parts := string_to_array(auth_header, '.');
  IF array_length(jwt_parts, 1) < 2 THEN
    RETURN NULL;
  END IF;

  -- Clean base64url characters (- to +, _ to /)
  cleaned_payload := translate(jwt_parts[2], '-_', '+/');
  
  -- Add base64 padding if required
  padding_len := 4 - (length(cleaned_payload) % 4);
  IF padding_len < 4 THEN
    cleaned_payload := cleaned_payload || repeat('=', padding_len);
  END IF;

  -- Decode base64 payload to JSON and extract 'sub'
  BEGIN
    payload_json := convert_from(decode(cleaned_payload, 'base64'), 'UTF8')::json;
    extracted_uid := payload_json->>'sub';
    RETURN extracted_uid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- RPC function to securely verify Google Sign-In account linking status (bypassing guest RLS constraints)
CREATE OR REPLACE FUNCTION public.check_google_auth_linking(email_to_check text, google_uid text)
RETURNS json AS $$
DECLARE
  profile_row public.profiles%ROWTYPE;
  result_data json;
BEGIN
  SELECT * FROM public.profiles WHERE email = email_to_check INTO profile_row;
  
  IF NOT FOUND THEN
    result_data := json_build_object('exists', false, 'can_proceed', true);
  ELSE
    -- Profile exists. Check if firebase_uid matches google_uid or id matches google_uid
    IF profile_row.firebase_uid = google_uid OR profile_row.id = google_uid THEN
      result_data := json_build_object('exists', true, 'can_proceed', true);
    ELSE
      -- Exists but linked to a different credentials (or native Supabase password only)
      result_data := json_build_object('exists', true, 'can_proceed', false);
    END IF;
  END IF;
  
  RETURN result_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC function to check if a specific Google UID is already linked to another profile
CREATE OR REPLACE FUNCTION public.check_google_uid_linked(uid_to_check text)
RETURNS json AS $$
DECLARE
  profile_row public.profiles%ROWTYPE;
  result_data json;
BEGIN
  SELECT * FROM public.profiles WHERE firebase_uid = uid_to_check INTO profile_row;
  
  IF NOT FOUND THEN
    result_data := json_build_object('exists', false);
  ELSE
    result_data := json_build_object('exists', true, 'profile_id', profile_row.id, 'email', profile_row.email);
  END IF;
  
  RETURN result_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. Profiles Table Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for owners" ON public.profiles;
CREATE POLICY "Allow select for owners" ON public.profiles
FOR SELECT TO authenticated, anon
USING (
  auth.uid()::text = id 
  OR 
  id = public.firebase_uid()
  OR
  firebase_uid = public.firebase_uid()
);

DROP POLICY IF EXISTS "Allow insert for owners" ON public.profiles;
CREATE POLICY "Allow insert for owners" ON public.profiles
FOR INSERT TO authenticated, anon
WITH CHECK (
  auth.uid()::text = id 
  OR 
  id = public.firebase_uid()
  OR
  firebase_uid = public.firebase_uid()
);

DROP POLICY IF EXISTS "Allow update for owners" ON public.profiles;
CREATE POLICY "Allow update for owners" ON public.profiles
FOR UPDATE TO authenticated, anon
USING (
  auth.uid()::text = id 
  OR 
  id = public.firebase_uid()
  OR
  firebase_uid = public.firebase_uid()
);


-- 2. Projects Table Policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for owner projects" ON public.projects;
CREATE POLICY "Allow select for owner projects" ON public.projects
FOR SELECT TO authenticated, anon
USING (
  profile_id = auth.uid()::text 
  OR 
  profile_id = public.firebase_uid()
  OR
  profile_id IN (SELECT id FROM public.profiles WHERE firebase_uid = public.firebase_uid())
);


-- 3. Orders Table Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for owner orders" ON public.orders;
CREATE POLICY "Allow select for owner orders" ON public.orders
FOR SELECT TO authenticated, anon
USING (
  profile_id = auth.uid()::text 
  OR 
  profile_id = public.firebase_uid()
  OR
  profile_id IN (SELECT id FROM public.profiles WHERE firebase_uid = public.firebase_uid())
);

DROP POLICY IF EXISTS "Allow insert for owner orders" ON public.orders;
CREATE POLICY "Allow insert for owner orders" ON public.orders
FOR INSERT TO authenticated, anon
WITH CHECK (
  profile_id = auth.uid()::text 
  OR 
  profile_id = public.firebase_uid()
  OR
  profile_id IN (SELECT id FROM public.profiles WHERE firebase_uid = public.firebase_uid())
);


-- 4. Vault Documents Table Policies
ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for owner docs" ON public.vault_documents;
CREATE POLICY "Allow select for owner docs" ON public.vault_documents
FOR SELECT TO authenticated, anon
USING (
  profile_id = auth.uid()::text 
  OR 
  profile_id = public.firebase_uid()
  OR
  profile_id IN (SELECT id FROM public.profiles WHERE firebase_uid = public.firebase_uid())
);

DROP POLICY IF EXISTS "Allow insert for owner docs" ON public.vault_documents;
CREATE POLICY "Allow insert for owner docs" ON public.vault_documents
FOR INSERT TO authenticated, anon
WITH CHECK (
  profile_id = auth.uid()::text 
  OR 
  profile_id = public.firebase_uid()
  OR
  profile_id IN (SELECT id FROM public.profiles WHERE firebase_uid = public.firebase_uid())
);

DROP POLICY IF EXISTS "Allow delete for owner docs" ON public.vault_documents;
CREATE POLICY "Allow delete for owner docs" ON public.vault_documents
FOR DELETE TO authenticated, anon
USING (
  profile_id = auth.uid()::text 
  OR 
  profile_id = public.firebase_uid()
  OR
  profile_id IN (SELECT id FROM public.profiles WHERE firebase_uid = public.firebase_uid())
);

DROP POLICY IF EXISTS "Allow update for owner docs" ON public.vault_documents;
CREATE POLICY "Allow update for owner docs" ON public.vault_documents
FOR UPDATE TO authenticated, anon
USING (
  profile_id = auth.uid()::text 
  OR 
  profile_id = public.firebase_uid()
  OR
  profile_id IN (SELECT id FROM public.profiles WHERE firebase_uid = public.firebase_uid())
);


-- 5. Payments Table Policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for owner payments" ON public.payments;
CREATE POLICY "Allow select for owner payments" ON public.payments
FOR SELECT TO authenticated, anon
USING (
  profile_id = auth.uid()::text 
  OR 
  profile_id = public.firebase_uid()
  OR
  profile_id IN (SELECT id FROM public.profiles WHERE firebase_uid = public.firebase_uid())
);


-- 6. Notifications Table Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for owner notifications" ON public.notifications;
CREATE POLICY "Allow select for owner notifications" ON public.notifications
FOR SELECT TO authenticated, anon
USING (
  profile_id = auth.uid()::text 
  OR 
  profile_id = public.firebase_uid()
  OR
  profile_id IN (SELECT id FROM public.profiles WHERE firebase_uid = public.firebase_uid())
);

DROP POLICY IF EXISTS "Allow update for owner notifications" ON public.notifications;
CREATE POLICY "Allow update for owner notifications" ON public.notifications
FOR UPDATE TO authenticated, anon
USING (
  profile_id = auth.uid()::text 
  OR 
  profile_id = public.firebase_uid()
  OR
  profile_id IN (SELECT id FROM public.profiles WHERE firebase_uid = public.firebase_uid())
);


-- 7. Support Tickets Table Policies
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for owner tickets" ON public.support_tickets;
CREATE POLICY "Allow select for owner tickets" ON public.support_tickets
FOR SELECT TO authenticated, anon
USING (
  profile_id = auth.uid()::text 
  OR 
  profile_id = public.firebase_uid()
  OR
  profile_id IN (SELECT id FROM public.profiles WHERE firebase_uid = public.firebase_uid())
);

DROP POLICY IF EXISTS "Allow insert for owner tickets" ON public.support_tickets;
CREATE POLICY "Allow insert for owner tickets" ON public.support_tickets
FOR INSERT TO authenticated, anon
WITH CHECK (
  profile_id = auth.uid()::text 
  OR 
  profile_id = public.firebase_uid()
  OR
  profile_id IN (SELECT id FROM public.profiles WHERE firebase_uid = public.firebase_uid())
);
