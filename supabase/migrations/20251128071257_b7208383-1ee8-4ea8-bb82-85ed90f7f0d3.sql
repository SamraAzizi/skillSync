-- Create sessions table for booking learning sessions
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  teacher_id UUID NOT NULL,
  learner_id UUID NOT NULL,
  skill TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  meeting_link TEXT,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'))
);

-- Enable Row Level Security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for sessions
CREATE POLICY "Users can view their own sessions" 
ON public.sessions 
FOR SELECT 
USING (auth.uid() = teacher_id OR auth.uid() = learner_id);

CREATE POLICY "Users can create sessions as learner" 
ON public.sessions 
FOR INSERT 
WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Users can update their own sessions" 
ON public.sessions 
FOR UPDATE 
USING (auth.uid() = teacher_id OR auth.uid() = learner_id);

CREATE POLICY "Users can delete their own sessions" 
ON public.sessions 
FOR DELETE 
USING (auth.uid() = teacher_id OR auth.uid() = learner_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster queries
CREATE INDEX idx_sessions_teacher_id ON public.sessions(teacher_id);
CREATE INDEX idx_sessions_learner_id ON public.sessions(learner_id);
CREATE INDEX idx_sessions_scheduled_at ON public.sessions(scheduled_at);