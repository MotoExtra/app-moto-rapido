-- ============================================
-- MIGRAÇÃO LOVABLE CLOUD -> SUPABASE PRÓPRIO
-- Script 2: RLS Policies
-- ============================================

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accepted_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_restaurant_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoboy_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoboy_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoboy_city_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_notifications_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expired_offers_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snack_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snack_chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- ============================================
-- RESTAURANTS POLICIES
-- ============================================
CREATE POLICY "Restaurants can view their own data" 
ON public.restaurants FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Restaurants can insert their own data" 
ON public.restaurants FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Restaurants can update their own data" 
ON public.restaurants FOR UPDATE 
USING (auth.uid() = id);

-- ============================================
-- EXTERNAL RESTAURANTS POLICIES
-- ============================================
CREATE POLICY "Anyone can view external restaurants" 
ON public.external_restaurants FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert external restaurants" 
ON public.external_restaurants FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- OFFERS POLICIES
-- ============================================
CREATE POLICY "Ofertas públicas são visíveis para todos" 
ON public.offers FOR SELECT 
USING ((is_accepted = false) OR (auth.uid() = accepted_by) OR (auth.uid() = created_by));

CREATE POLICY "Authenticated users can insert offers" 
ON public.offers FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update offers" 
ON public.offers FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete their own offers" 
ON public.offers FOR DELETE 
USING (auth.uid() = created_by);

-- ============================================
-- ACCEPTED OFFERS POLICIES
-- ============================================
CREATE POLICY "Usuários podem ver seus próprios extras aceitos" 
ON public.accepted_offers FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Restaurants can view accepted offers for their offers" 
ON public.accepted_offers FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = accepted_offers.offer_id AND o.created_by = auth.uid()
));

CREATE POLICY "Usuários podem aceitar extras" 
ON public.accepted_offers FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus extras" 
ON public.accepted_offers FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can cancel their own pending offers" 
ON public.accepted_offers FOR DELETE 
USING ((auth.uid() = user_id) AND (status = 'pending'));

-- ============================================
-- CHAT MESSAGES POLICIES
-- ============================================
CREATE POLICY "Motoboys can view chat messages for accepted offers" 
ON public.chat_messages FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM accepted_offers ao
    WHERE ao.offer_id = chat_messages.offer_id AND ao.user_id = auth.uid()
));

CREATE POLICY "Restaurants can view chat messages for their offers" 
ON public.chat_messages FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = chat_messages.offer_id AND o.created_by = auth.uid()
));

CREATE POLICY "Motoboys can insert chat messages for accepted offers" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
    (sender_type = 'motoboy') AND 
    (sender_id = auth.uid()) AND 
    (EXISTS (
        SELECT 1 FROM accepted_offers ao
        WHERE ao.offer_id = chat_messages.offer_id AND ao.user_id = auth.uid()
    ))
);

CREATE POLICY "Restaurants can insert chat messages for their offers" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
    (sender_type = 'restaurant') AND 
    (sender_id = auth.uid()) AND 
    (EXISTS (
        SELECT 1 FROM offers o
        WHERE o.id = chat_messages.offer_id AND o.created_by = auth.uid()
    ))
);

CREATE POLICY "Users can update read_at for received messages" 
ON public.chat_messages FOR UPDATE 
USING (
    (sender_id <> auth.uid()) AND 
    (
        (EXISTS (SELECT 1 FROM offers o WHERE o.id = chat_messages.offer_id AND o.created_by = auth.uid())) OR 
        (EXISTS (SELECT 1 FROM accepted_offers ao WHERE ao.offer_id = chat_messages.offer_id AND ao.user_id = auth.uid()))
    )
);

-- ============================================
-- RATINGS POLICIES
-- ============================================
CREATE POLICY "Restaurants can rate motoboys" 
ON public.ratings FOR INSERT 
WITH CHECK ((auth.uid() = restaurant_id) AND (rating_type = 'restaurant_to_motoboy'));

CREATE POLICY "Motoboys can rate restaurants" 
ON public.ratings FOR INSERT 
WITH CHECK (
    (auth.uid() IS NOT NULL) AND 
    (rating_type = 'motoboy_to_restaurant') AND 
    (motoboy_id = auth.uid())
);

CREATE POLICY "Restaurants can view motoboy ratings from others" 
ON public.ratings FOR SELECT 
USING (
    (rating_type = 'restaurant_to_motoboy') AND 
    (EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = auth.uid()))
);

CREATE POLICY "Motoboys can view restaurant ratings from others" 
ON public.ratings FOR SELECT 
USING (
    (rating_type = 'motoboy_to_restaurant') AND 
    (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'motoboy'))
);

-- ============================================
-- EXTERNAL RESTAURANT RATINGS POLICIES
-- ============================================
CREATE POLICY "Motoboys can rate external restaurants" 
ON public.external_restaurant_ratings FOR INSERT 
WITH CHECK (
    (auth.uid() = motoboy_id) AND 
    (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'motoboy'))
);

CREATE POLICY "Motoboys can view all external restaurant ratings" 
ON public.external_restaurant_ratings FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'motoboy'));

-- ============================================
-- MOTOBOY LOCATIONS POLICIES
-- ============================================
CREATE POLICY "Motoboys can upsert their own location" 
ON public.motoboy_locations FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Restaurants can view motoboy locations for their offers" 
ON public.motoboy_locations FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = motoboy_locations.offer_id AND o.created_by = auth.uid() AND o.is_accepted = true
));

-- ============================================
-- MOTOBOY LOCATION HISTORY POLICIES
-- ============================================
CREATE POLICY "Motoboys can insert their own location history" 
ON public.motoboy_location_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Motoboys can view their own location history" 
ON public.motoboy_location_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Restaurants can view motoboy location history for their offers" 
ON public.motoboy_location_history FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = motoboy_location_history.offer_id AND o.created_by = auth.uid() AND o.is_accepted = true
));

-- ============================================
-- MOTOBOY CITY PREFERENCES POLICIES
-- ============================================
CREATE POLICY "Users can view their own city preferences" 
ON public.motoboy_city_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own city preferences" 
ON public.motoboy_city_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own city preferences" 
ON public.motoboy_city_preferences FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- PUSH SUBSCRIPTIONS POLICIES
-- ============================================
CREATE POLICY "Users can view their own subscriptions" 
ON public.push_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" 
ON public.push_subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" 
ON public.push_subscriptions FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- RATING NOTIFICATIONS SENT POLICIES
-- ============================================
CREATE POLICY "Service role can manage rating notifications" 
ON public.rating_notifications_sent FOR ALL 
USING (true)
WITH CHECK (true);

-- ============================================
-- USER ROLES POLICIES
-- ============================================
CREATE POLICY "Admins can view all roles" 
ON public.user_roles FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- EXPIRED OFFERS ARCHIVE POLICIES
-- ============================================
CREATE POLICY "Admins can view expired offers archive" 
ON public.expired_offers_archive FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Restaurants can view their own expired offers archive" 
ON public.expired_offers_archive FOR SELECT 
USING (auth.uid() = created_by);

-- ============================================
-- SNACK EXCHANGES POLICIES
-- ============================================
CREATE POLICY "Users can view their own exchanges" 
ON public.snack_exchanges FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Motoboys can view available or accepted exchanges" 
ON public.snack_exchanges FOR SELECT 
USING (
    ((status = 'available') AND (expires_at > now()) AND 
     (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'motoboy'))) OR 
    (auth.uid() = user_id) OR 
    (auth.uid() = accepted_by)
);

CREATE POLICY "Users can create their own exchanges" 
ON public.snack_exchanges FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update exchanges for accept/confirm flow" 
ON public.snack_exchanges FOR UPDATE 
USING (
    (auth.uid() = user_id) OR 
    ((status = 'available') AND (auth.uid() IS NOT NULL)) OR 
    (auth.uid() = accepted_by)
);

CREATE POLICY "Users can delete their own exchanges" 
ON public.snack_exchanges FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- SNACK CHAT MESSAGES POLICIES
-- ============================================
CREATE POLICY "Users can view messages for their exchanges" 
ON public.snack_chat_messages FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM snack_exchanges se
    WHERE se.id = snack_chat_messages.exchange_id AND 
          (se.user_id = auth.uid() OR se.accepted_by = auth.uid())
));

CREATE POLICY "Users can send messages to their exchanges" 
ON public.snack_chat_messages FOR INSERT 
WITH CHECK (
    (auth.uid() = sender_id) AND 
    (EXISTS (
        SELECT 1 FROM snack_exchanges se
        WHERE se.id = snack_chat_messages.exchange_id AND 
              (se.user_id = auth.uid() OR se.accepted_by = auth.uid())
    ))
);
