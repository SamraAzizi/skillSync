-- Allow authenticated users to view reviews for any user (for public profiles)
DROP POLICY IF EXISTS "Users can view reviews they gave or received" ON public.reviews;

CREATE POLICY "Users can view reviews for public profiles"
ON public.reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = reviews.reviewee_id
    AND profiles.profile_completed = true
  )
  OR auth.uid() = reviewer_id
);