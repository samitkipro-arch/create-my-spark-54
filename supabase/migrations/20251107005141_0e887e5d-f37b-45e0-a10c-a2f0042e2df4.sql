-- Add owner_id column to orgs table
ALTER TABLE public.orgs
ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_orgs_owner_id ON public.orgs(owner_id);

-- Add RLS policy for users to see orgs they own
CREATE POLICY "Users can view orgs they own"
ON public.orgs
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());