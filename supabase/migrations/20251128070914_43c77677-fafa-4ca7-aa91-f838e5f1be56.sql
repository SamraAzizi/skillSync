-- Allow users to view all profiles for matching purposes
CREATE POLICY "Users can view all completed profiles" 
ON public.profiles 
FOR SELECT 
USING (profile_completed = true AND auth.uid() IS NOT NULL);