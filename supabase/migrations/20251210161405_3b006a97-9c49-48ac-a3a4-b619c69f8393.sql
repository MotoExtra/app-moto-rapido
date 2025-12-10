-- Create restaurants table
CREATE TABLE public.restaurants (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  fantasy_name TEXT NOT NULL,
  cnpj TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  open_time TIME,
  close_time TIME,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Restaurants can view their own data"
ON public.restaurants
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Restaurants can insert their own data"
ON public.restaurants
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Restaurants can update their own data"
ON public.restaurants
FOR UPDATE
USING (auth.uid() = id);

-- Trigger for updated_at
CREATE TRIGGER update_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();