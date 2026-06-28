/*
# Fix Function Search Path Security Issue

## Overview
This migration fixes the mutable search_path security issue on the 
`update_updated_at_column()` function by setting a fixed search_path.

## Security Change
- Set `search_path = ''` on `update_updated_at_column()` function
- This prevents search path attacks where a malicious user could create 
  objects that shadow intended function references

## Details
The search_path determines the order in which PostgreSQL searches for 
database objects. A mutable search_path in security-definer functions can 
allow attackers to manipulate object resolution. Setting it to an empty 
string forces explicit schema qualification, making the function behavior 
predictable and secure.
*/

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;