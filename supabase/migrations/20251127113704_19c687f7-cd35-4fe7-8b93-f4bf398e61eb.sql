-- Add profile fields for skills and availability
ALTER TABLE public.profiles 
ADD COLUMN bio TEXT,
ADD COLUMN skills_to_teach TEXT[] DEFAULT '{}',
ADD COLUMN skills_to_learn TEXT[] DEFAULT '{}',
ADD COLUMN availability JSONB DEFAULT '{}',
ADD COLUMN profile_completed BOOLEAN DEFAULT false;

-- Update RLS policies to allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);