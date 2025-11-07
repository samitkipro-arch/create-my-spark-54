-- Enable RLS on org_members table
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view org_members in their organization
CREATE POLICY "Users can view org_members in their org"
ON public.org_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = org_members.org_id
    AND om.user_id = auth.uid()
  )
);

-- Policy: Users can insert themselves into org_members
CREATE POLICY "Users can insert themselves into org_members"
ON public.org_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own org_member record
CREATE POLICY "Users can update their own org_member record"
ON public.org_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());