-- Add new columns for extra options
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS can_become_permanent boolean DEFAULT false;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS includes_meal boolean DEFAULT false;