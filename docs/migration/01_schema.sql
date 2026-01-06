-- ============================================
-- MIGRAÇÃO LOVABLE CLOUD -> SUPABASE PRÓPRIO
-- Script 1: Schema Completo
-- ============================================

-- ============================================
-- EXTENSÕES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA extensions;

-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- ============================================
-- TABELAS
-- ============================================

-- Profiles (motoboys)
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    cnh TEXT,
    vehicle_plate TEXT,
    avatar_url TEXT,
    user_type TEXT NOT NULL,
    experience_years INTEGER DEFAULT 0,
    has_thermal_bag BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Restaurants
CREATE TABLE public.restaurants (
    id UUID NOT NULL PRIMARY KEY,
    fantasy_name TEXT NOT NULL,
    cnpj TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    logo_url TEXT,
    open_time TIME WITHOUT TIME ZONE,
    close_time TIME WITHOUT TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- External Restaurants (for motoboy-created offers)
CREATE TABLE public.external_restaurants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    city TEXT,
    address TEXT,
    avg_rating NUMERIC DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Offers
CREATE TABLE public.offers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_name TEXT NOT NULL,
    description TEXT NOT NULL,
    address TEXT NOT NULL,
    delivery_range TEXT NOT NULL,
    time_start TIME WITHOUT TIME ZONE NOT NULL,
    time_end TIME WITHOUT TIME ZONE NOT NULL,
    radius INTEGER NOT NULL,
    needs_bag BOOLEAN DEFAULT false,
    rating NUMERIC DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    lat NUMERIC,
    lng NUMERIC,
    is_accepted BOOLEAN DEFAULT false,
    accepted_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    offer_date DATE DEFAULT CURRENT_DATE,
    can_become_permanent BOOLEAN DEFAULT false,
    includes_meal BOOLEAN DEFAULT false,
    external_restaurant_id UUID REFERENCES public.external_restaurants(id),
    payment TEXT,
    observations TEXT,
    phone TEXT,
    offer_type TEXT DEFAULT 'restaurant',
    delivery_quantity TEXT,
    city TEXT,
    experience TEXT
);

-- Accepted Offers
CREATE TABLE public.accepted_offers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    offer_id UUID NOT NULL REFERENCES public.offers(id),
    accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT DEFAULT 'pending'
);

-- Chat Messages
CREATE TABLE public.chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    offer_id UUID NOT NULL REFERENCES public.offers(id),
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ratings (restaurant <-> motoboy)
CREATE TABLE public.ratings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    offer_id UUID NOT NULL REFERENCES public.offers(id),
    restaurant_id UUID NOT NULL,
    motoboy_id UUID REFERENCES public.profiles(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    rating_type TEXT NOT NULL DEFAULT 'restaurant_to_motoboy',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- External Restaurant Ratings
CREATE TABLE public.external_restaurant_ratings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    external_restaurant_id UUID NOT NULL REFERENCES public.external_restaurants(id),
    offer_id UUID NOT NULL REFERENCES public.offers(id),
    motoboy_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Motoboy Locations (current)
CREATE TABLE public.motoboy_locations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    offer_id UUID NOT NULL REFERENCES public.offers(id),
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    accuracy NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Motoboy Location History
CREATE TABLE public.motoboy_location_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    offer_id UUID NOT NULL REFERENCES public.offers(id),
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    accuracy NUMERIC,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Motoboy City Preferences
CREATE TABLE public.motoboy_city_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    city TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Push Subscriptions
CREATE TABLE public.push_subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rating Notifications Sent
CREATE TABLE public.rating_notifications_sent (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    offer_id UUID NOT NULL,
    user_id UUID NOT NULL,
    user_type TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Expired Offers Archive
CREATE TABLE public.expired_offers_archive (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    original_offer_id UUID NOT NULL,
    restaurant_name TEXT NOT NULL,
    offer_date DATE,
    time_start TIME WITHOUT TIME ZONE NOT NULL,
    time_end TIME WITHOUT TIME ZONE NOT NULL,
    city TEXT,
    payment TEXT,
    was_accepted BOOLEAN NOT NULL DEFAULT false,
    accepted_by UUID,
    accepted_by_name TEXT,
    created_by UUID,
    created_by_name TEXT,
    offer_type TEXT,
    archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Snack Exchanges
CREATE TABLE public.snack_exchanges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    offering TEXT NOT NULL,
    wanting TEXT NOT NULL,
    description TEXT,
    city TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT DEFAULT 'available',
    matched_by UUID,
    matched_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES public.profiles(id),
    accepted_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '8 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Snack Chat Messages
CREATE TABLE public.snack_chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    exchange_id UUID NOT NULL REFERENCES public.snack_exchanges(id),
    sender_id UUID NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- ENABLE REALTIME (se necessário)
-- ============================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.motoboy_locations;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
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

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function: find_or_create_external_restaurant
CREATE OR REPLACE FUNCTION public.find_or_create_external_restaurant(
    p_name TEXT, 
    p_city TEXT, 
    p_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized TEXT;
  v_restaurant_id UUID;
BEGIN
  v_normalized := lower(unaccent(trim(p_name)));
  
  SELECT id INTO v_restaurant_id
  FROM external_restaurants
  WHERE normalized_name = v_normalized 
    AND (city = p_city OR (city IS NULL AND p_city IS NULL));
  
  IF v_restaurant_id IS NULL THEN
    INSERT INTO external_restaurants (name, normalized_name, city, address)
    VALUES (trim(p_name), v_normalized, p_city, p_address)
    RETURNING id INTO v_restaurant_id;
  END IF;
  
  RETURN v_restaurant_id;
END;
$$;

-- Function: cleanup_expired_offers
CREATE OR REPLACE FUNCTION public.cleanup_expired_offers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
BEGIN
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

    DELETE FROM public.offers
    WHERE (
        offer_date::timestamp + time_end + INTERVAL '24 hours' < now()
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Function: update_external_restaurant_rating
CREATE OR REPLACE FUNCTION public.update_external_restaurant_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE external_restaurants
  SET 
    avg_rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM external_restaurant_ratings
      WHERE external_restaurant_id = NEW.external_restaurant_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM external_restaurant_ratings
      WHERE external_restaurant_id = NEW.external_restaurant_id
    )
  WHERE id = NEW.external_restaurant_id;
  
  RETURN NEW;
END;
$$;

-- Function: validate_accepted_offer_no_conflict
CREATE OR REPLACE FUNCTION public.validate_accepted_offer_no_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_offer RECORD;
  has_conflict BOOLEAN;
BEGIN
  SELECT offer_date, time_start, time_end 
  INTO new_offer
  FROM public.offers 
  WHERE id = NEW.offer_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.accepted_offers ao
    JOIN public.offers o ON ao.offer_id = o.id
    WHERE ao.user_id = NEW.user_id
      AND ao.status IN ('pending', 'arrived', 'in_progress')
      AND o.offer_date = new_offer.offer_date
      AND o.time_start < new_offer.time_end
      AND o.time_end > new_offer.time_start
  ) INTO has_conflict;

  IF has_conflict THEN
    RAISE EXCEPTION 'Conflito de horário: você já tem um extra aceito que coincide com este período.';
  END IF;

  RETURN NEW;
END;
$$;

-- Function: grant_admin_role
CREATE OR REPLACE FUNCTION public.grant_admin_role(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: update profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update restaurants updated_at
CREATE TRIGGER update_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update offers updated_at
CREATE TRIGGER update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update external restaurant rating
CREATE TRIGGER trigger_update_external_restaurant_rating
AFTER INSERT ON public.external_restaurant_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_external_restaurant_rating();

-- Trigger: validate accepted offer no conflict
CREATE TRIGGER trigger_validate_accepted_offer_no_conflict
BEFORE INSERT ON public.accepted_offers
FOR EACH ROW
EXECUTE FUNCTION public.validate_accepted_offer_no_conflict();
