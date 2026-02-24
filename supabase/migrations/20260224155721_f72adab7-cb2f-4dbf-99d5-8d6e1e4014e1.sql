
CREATE OR REPLACE FUNCTION public.cleanup_expired_offers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
    v_now TIMESTAMP WITH TIME ZONE;
BEGIN
    v_now := NOW();

    -- Archive expired offers (more than 24 hours past their end time, using BRT)
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
        ((o.offer_date::timestamp + o.time_end::interval) AT TIME ZONE 'America/Sao_Paulo' + INTERVAL '24 hours') < v_now
    )
    AND o.id NOT IN (SELECT original_offer_id FROM public.expired_offers_archive);

    -- Delete expired offers (24h past end time in BRT)
    DELETE FROM public.offers
    WHERE (
        ((offer_date::timestamp + time_end::interval) AT TIME ZONE 'America/Sao_Paulo' + INTERVAL '24 hours') < v_now
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;
