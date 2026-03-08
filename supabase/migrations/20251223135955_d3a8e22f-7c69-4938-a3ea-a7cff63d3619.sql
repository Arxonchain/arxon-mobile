-- Create x_profiles table for storing X/Twitter profile data and boost calculations
CREATE TABLE public.x_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  username TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  boost_percentage INTEGER NOT NULL DEFAULT 0,
  qualified_posts_today INTEGER NOT NULL DEFAULT 0,
  average_engagement INTEGER NOT NULL DEFAULT 0,
  viral_bonus BOOLEAN NOT NULL DEFAULT false,
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.x_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own X profile" 
ON public.x_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own X profile" 
ON public.x_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own X profile" 
ON public.x_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own X profile" 
ON public.x_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_x_profiles_updated_at
BEFORE UPDATE ON public.x_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();