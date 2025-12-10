-- Add notification preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN session_reminder_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN session_notification_enabled boolean NOT NULL DEFAULT true;