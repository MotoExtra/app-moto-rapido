export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accepted_offers: {
        Row: {
          accepted_at: string
          created_at: string
          id: string
          offer_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          id?: string
          offer_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          created_at?: string
          id?: string
          offer_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accepted_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          sort_order: number
          unlock_criteria: Json
          xp_reward: number
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          sort_order?: number
          unlock_criteria: Json
          xp_reward?: number
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
          unlock_criteria?: Json
          xp_reward?: number
        }
        Relationships: []
      }
      challenges: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          target_value: number
          title: string
          type: string
          valid_from: string
          valid_until: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          target_value: number
          title: string
          type: string
          valid_from: string
          valid_until: string
          xp_reward: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          target_value?: number
          title?: string
          type?: string
          valid_from?: string
          valid_until?: string
          xp_reward?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          offer_id: string
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          offer_id: string
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          offer_id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      expired_offers_archive: {
        Row: {
          accepted_by: string | null
          accepted_by_name: string | null
          archived_at: string
          city: string | null
          created_by: string | null
          created_by_name: string | null
          id: string
          offer_date: string | null
          offer_type: string | null
          original_offer_id: string
          payment: string | null
          restaurant_name: string
          time_end: string
          time_start: string
          was_accepted: boolean
        }
        Insert: {
          accepted_by?: string | null
          accepted_by_name?: string | null
          archived_at?: string
          city?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          offer_date?: string | null
          offer_type?: string | null
          original_offer_id: string
          payment?: string | null
          restaurant_name: string
          time_end: string
          time_start: string
          was_accepted?: boolean
        }
        Update: {
          accepted_by?: string | null
          accepted_by_name?: string | null
          archived_at?: string
          city?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          offer_date?: string | null
          offer_type?: string | null
          original_offer_id?: string
          payment?: string | null
          restaurant_name?: string
          time_end?: string
          time_start?: string
          was_accepted?: boolean
        }
        Relationships: []
      }
      external_restaurant_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          external_restaurant_id: string
          id: string
          motoboy_id: string
          offer_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          external_restaurant_id: string
          id?: string
          motoboy_id: string
          offer_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          external_restaurant_id?: string
          id?: string
          motoboy_id?: string
          offer_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "external_restaurant_ratings_external_restaurant_id_fkey"
            columns: ["external_restaurant_id"]
            isOneToOne: false
            referencedRelation: "external_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_restaurant_ratings_motoboy_id_fkey"
            columns: ["motoboy_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_restaurant_ratings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      external_restaurants: {
        Row: {
          address: string | null
          avg_rating: number | null
          city: string | null
          created_at: string | null
          id: string
          name: string
          normalized_name: string
          review_count: number | null
        }
        Insert: {
          address?: string | null
          avg_rating?: number | null
          city?: string | null
          created_at?: string | null
          id?: string
          name: string
          normalized_name: string
          review_count?: number | null
        }
        Update: {
          address?: string | null
          avg_rating?: number | null
          city?: string | null
          created_at?: string | null
          id?: string
          name?: string
          normalized_name?: string
          review_count?: number | null
        }
        Relationships: []
      }
      motoboy_achievements: {
        Row: {
          achievement_id: string
          id: string
          seen: boolean
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          seen?: boolean
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          seen?: boolean
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "motoboy_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motoboy_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      motoboy_challenges: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          id: string
          joined_at: string
          progress: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          joined_at?: string
          progress?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          joined_at?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "motoboy_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motoboy_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      motoboy_city_preferences: {
        Row: {
          city: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      motoboy_location_history: {
        Row: {
          accuracy: number | null
          id: string
          lat: number
          lng: number
          offer_id: string
          recorded_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          id?: string
          lat: number
          lng: number
          offer_id: string
          recorded_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          id?: string
          lat?: number
          lng?: number
          offer_id?: string
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "motoboy_location_history_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      motoboy_locations: {
        Row: {
          accuracy: number | null
          id: string
          lat: number
          lng: number
          offer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          id?: string
          lat: number
          lng: number
          offer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          id?: string
          lat?: number
          lng?: number
          offer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "motoboy_locations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      motoboy_stats: {
        Row: {
          best_streak: number
          completed_extras: number
          created_at: string
          current_level: number
          current_streak: number
          extras_without_cancel: number
          last_work_date: string | null
          total_cancellations: number
          total_xp: number
          updated_at: string
          user_id: string
          weekly_xp: number
        }
        Insert: {
          best_streak?: number
          completed_extras?: number
          created_at?: string
          current_level?: number
          current_streak?: number
          extras_without_cancel?: number
          last_work_date?: string | null
          total_cancellations?: number
          total_xp?: number
          updated_at?: string
          user_id: string
          weekly_xp?: number
        }
        Update: {
          best_streak?: number
          completed_extras?: number
          created_at?: string
          current_level?: number
          current_streak?: number
          extras_without_cancel?: number
          last_work_date?: string | null
          total_cancellations?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
          weekly_xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "motoboy_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          accepted_by: string | null
          address: string
          can_become_permanent: boolean | null
          city: string | null
          created_at: string
          created_by: string | null
          delivery_quantity: string | null
          delivery_range: string
          description: string
          experience: string | null
          external_restaurant_id: string | null
          id: string
          includes_meal: boolean | null
          is_accepted: boolean | null
          lat: number | null
          lng: number | null
          needs_bag: boolean | null
          observations: string | null
          offer_date: string | null
          offer_type: string | null
          payment: string | null
          phone: string | null
          radius: number
          rating: number | null
          restaurant_name: string
          review_count: number | null
          time_end: string
          time_start: string
          updated_at: string
        }
        Insert: {
          accepted_by?: string | null
          address: string
          can_become_permanent?: boolean | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          delivery_quantity?: string | null
          delivery_range: string
          description: string
          experience?: string | null
          external_restaurant_id?: string | null
          id?: string
          includes_meal?: boolean | null
          is_accepted?: boolean | null
          lat?: number | null
          lng?: number | null
          needs_bag?: boolean | null
          observations?: string | null
          offer_date?: string | null
          offer_type?: string | null
          payment?: string | null
          phone?: string | null
          radius: number
          rating?: number | null
          restaurant_name: string
          review_count?: number | null
          time_end: string
          time_start: string
          updated_at?: string
        }
        Update: {
          accepted_by?: string | null
          address?: string
          can_become_permanent?: boolean | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          delivery_quantity?: string | null
          delivery_range?: string
          description?: string
          experience?: string | null
          external_restaurant_id?: string | null
          id?: string
          includes_meal?: boolean | null
          is_accepted?: boolean | null
          lat?: number | null
          lng?: number | null
          needs_bag?: boolean | null
          observations?: string | null
          offer_date?: string | null
          offer_type?: string | null
          payment?: string | null
          phone?: string | null
          radius?: number
          rating?: number | null
          restaurant_name?: string
          review_count?: number | null
          time_end?: string
          time_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_external_restaurant_id_fkey"
            columns: ["external_restaurant_id"]
            isOneToOne: false
            referencedRelation: "external_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      penalty_history: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          offer_id: string | null
          penalty_type: string
          reason: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          offer_id?: string | null
          penalty_type: string
          reason: string
          user_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          offer_id?: string | null
          penalty_type?: string
          reason?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "penalty_history_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked_at: string | null
          blocked_reason: string | null
          city: string
          cnh: string | null
          cnh_status: string | null
          created_at: string
          experience_years: number | null
          has_thermal_bag: boolean | null
          id: string
          is_blocked: boolean | null
          name: string
          phone: string
          updated_at: string
          user_type: string
          vehicle_plate: string | null
        }
        Insert: {
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          city: string
          cnh?: string | null
          cnh_status?: string | null
          created_at?: string
          experience_years?: number | null
          has_thermal_bag?: boolean | null
          id: string
          is_blocked?: boolean | null
          name: string
          phone: string
          updated_at?: string
          user_type: string
          vehicle_plate?: string | null
        }
        Update: {
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          city?: string
          cnh?: string | null
          cnh_status?: string | null
          created_at?: string
          experience_years?: number | null
          has_thermal_bag?: boolean | null
          id?: string
          is_blocked?: boolean | null
          name?: string
          phone?: string
          updated_at?: string
          user_type?: string
          vehicle_plate?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      ranking_rewards: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          period_type: string
          rank_position: number
          reward_description: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          period_type: string
          rank_position: number
          reward_description: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          period_type?: string
          rank_position?: number
          reward_description?: string
        }
        Relationships: []
      }
      rating_notifications_sent: {
        Row: {
          id: string
          offer_id: string
          sent_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          id?: string
          offer_id: string
          sent_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          id?: string
          offer_id?: string
          sent_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          motoboy_id: string | null
          offer_id: string
          rating: number
          rating_type: string
          restaurant_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          motoboy_id?: string | null
          offer_id: string
          rating: number
          rating_type?: string
          restaurant_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          motoboy_id?: string | null
          offer_id?: string
          rating?: number
          rating_type?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_motoboy_id_fkey"
            columns: ["motoboy_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string
          city: string
          close_time: string | null
          cnpj: string | null
          created_at: string
          fantasy_name: string
          id: string
          logo_url: string | null
          open_time: string | null
          phone: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address: string
          city: string
          close_time?: string | null
          cnpj?: string | null
          created_at?: string
          fantasy_name: string
          id: string
          logo_url?: string | null
          open_time?: string | null
          phone: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string
          city?: string
          close_time?: string | null
          cnpj?: string | null
          created_at?: string
          fantasy_name?: string
          id?: string
          logo_url?: string | null
          open_time?: string | null
          phone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      snack_chat_messages: {
        Row: {
          created_at: string
          exchange_id: string
          id: string
          message: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          created_at?: string
          exchange_id: string
          id?: string
          message: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          created_at?: string
          exchange_id?: string
          id?: string
          message?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snack_chat_messages_exchange_id_fkey"
            columns: ["exchange_id"]
            isOneToOne: false
            referencedRelation: "snack_exchanges"
            referencedColumns: ["id"]
          },
        ]
      }
      snack_exchanges: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          city: string
          confirmed_at: string | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          matched_at: string | null
          matched_by: string | null
          offering: string
          phone: string
          status: string | null
          user_id: string
          wanting: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          city: string
          confirmed_at?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          matched_at?: string | null
          matched_by?: string | null
          offering: string
          phone: string
          status?: string | null
          user_id: string
          wanting: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          city?: string
          confirmed_at?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          matched_at?: string | null
          matched_by?: string | null
          offering?: string
          phone?: string
          status?: string | null
          user_id?: string
          wanting?: string
        }
        Relationships: [
          {
            foreignKeyName: "snack_exchanges_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_motoboy_xp: {
        Args: {
          p_update_streak?: boolean
          p_user_id: string
          p_xp_amount: number
        }
        Returns: {
          best_streak: number
          completed_extras: number
          created_at: string
          current_level: number
          current_streak: number
          extras_without_cancel: number
          last_work_date: string | null
          total_cancellations: number
          total_xp: number
          updated_at: string
          user_id: string
          weekly_xp: number
        }
        SetofOptions: {
          from: "*"
          to: "motoboy_stats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_arrival_delay_penalty: {
        Args: { p_offer_date: string; p_time_start: string; p_user_id: string }
        Returns: {
          applied: boolean
          delay_minutes: number
          penalty_xp: number
        }[]
      }
      apply_arrival_delay_penalty_v2: {
        Args: {
          p_offer_date: string
          p_offer_id: string
          p_time_start: string
          p_user_id: string
        }
        Returns: {
          applied: boolean
          delay_minutes: number
          penalty_reason: string
          penalty_xp: number
        }[]
      }
      calculate_level: { Args: { xp: number }; Returns: number }
      cleanup_expired_offers: { Args: never; Returns: number }
      find_or_create_external_restaurant: {
        Args: { p_address?: string; p_city: string; p_name: string }
        Returns: string
      }
      get_weekly_ranking: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          completed_extras: number
          current_level: number
          current_streak: number
          name: string
          rank_position: number
          score: number
          total_xp: number
          user_id: string
          weekly_xp: number
        }[]
      }
      grant_admin_role: { Args: { target_user_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_cancellation: {
        Args: { p_user_id: string }
        Returns: {
          best_streak: number
          completed_extras: number
          created_at: string
          current_level: number
          current_streak: number
          extras_without_cancel: number
          last_work_date: string | null
          total_cancellations: number
          total_xp: number
          updated_at: string
          user_id: string
          weekly_xp: number
        }
        SetofOptions: {
          from: "*"
          to: "motoboy_stats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_cancellation_progressive: {
        Args: {
          p_minutes_until_start: number
          p_offer_id: string
          p_user_id: string
        }
        Returns: {
          new_total_xp: number
          penalty_reason: string
          penalty_xp: number
        }[]
      }
      record_completed_extra: {
        Args: { p_user_id: string }
        Returns: {
          best_streak: number
          completed_extras: number
          created_at: string
          current_level: number
          current_streak: number
          extras_without_cancel: number
          last_work_date: string | null
          total_cancellations: number
          total_xp: number
          updated_at: string
          user_id: string
          weekly_xp: number
        }
        SetofOptions: {
          from: "*"
          to: "motoboy_stats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_rating_xp: {
        Args: { p_rating: number; p_user_id: string }
        Returns: {
          best_streak: number
          completed_extras: number
          created_at: string
          current_level: number
          current_streak: number
          extras_without_cancel: number
          last_work_date: string | null
          total_cancellations: number
          total_xp: number
          updated_at: string
          user_id: string
          weekly_xp: number
        }
        SetofOptions: {
          from: "*"
          to: "motoboy_stats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
