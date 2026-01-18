-- Drop the overly permissive audit_logs insert policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a more restrictive policy - only allow inserts from authenticated users
-- The trigger function uses SECURITY DEFINER so it can insert regardless of this policy
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated 
  WITH CHECK (performed_by = auth.uid());