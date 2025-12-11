-- Add email digest preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN email_digest_enabled boolean NOT NULL DEFAULT true;