-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create expired_offers_archive table to keep records
CREATE TABLE public.expired_offers_archive (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    original_offer_id uuid NOT NULL,
    restaurant_name text NOT NULL,
    offer_date date,
    time_start time NOT NULL,
    time_end time NOT NULL,
    city text,
    payment text,
    was_accepted boolean NOT NULL DEFAULT false,
    accepted_by uuid,
    accepted_by_name text,
    created_by uuid,
    created_by_name text,
    offer_type text,
    archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expired_offers_archive ENABLE ROW LEVEL SECURITY;

-- Only admins can view archive
CREATE POLICY "Admins can view expired offers archive"
ON public.expired_offers_archive
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Function to archive and cleanup expired offers
CREATE OR REPLACE FUNCTION public.cleanup_expired_offers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Archive expired offers (more than 24 hours past their end time)
    INSERT INTO public.expired_offers_archive (
        original_offer_id,
        restaurant_name,
        offer_date,
        time_start,
        time_end,
        city,
        payment,
        was_accepted,
        accepted_by,
        accepted_by_name,
        created_by,
        created_by_name,
        offer_type
    )
    SELECT 
        o.id,
        o.restaurant_name,
        o.offer_date,
        o.time_start,
        o.time_end,
        o.city,
        o.payment,
        o.is_accepted,
        o.accepted_by,
        COALESCE(p.name, r.fantasy_name),
        o.created_by,
        CASE 
            WHEN o.offer_type = 'restaurant' THEN r2.fantasy_name
            ELSE p2.name
        END,
        o.offer_type
    FROM public.offers o
    LEFT JOIN public.profiles p ON o.accepted_by = p.id
    LEFT JOIN public.restaurants r ON o.accepted_by = r.id
    LEFT JOIN public.restaurants r2 ON o.created_by = r2.id
    LEFT JOIN public.profiles p2 ON o.created_by = p2.id
    WHERE (
        o.offer_date + o.time_end + INTERVAL '24 hours' < now()
        OR (
            o.offer_date + o.time_end < now() - INTERVAL '24 hours'
        )
    )
    AND o.id NOT IN (SELECT original_offer_id FROM public.expired_offers_archive);

    -- Delete expired offers
    DELETE FROM public.offers
    WHERE (
        offer_date::timestamp + time_end + INTERVAL '24 hours' < now()
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;