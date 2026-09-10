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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          pricing_type: Database["public"]["Enums"]["addon_pricing"]
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          pricing_type: Database["public"]["Enums"]["addon_pricing"]
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          pricing_type?: Database["public"]["Enums"]["addon_pricing"]
          sort_order?: number
        }
        Relationships: []
      }
      admin_emails: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      admin_otp_verifications: {
        Row: {
          expires_at: string
          user_id: string
          verified_at: string
        }
        Insert: {
          expires_at: string
          user_id: string
          verified_at?: string
        }
        Update: {
          expires_at?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_otp_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: number
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_addons: {
        Row: {
          addon_id: string
          booking_id: string
          name: string
          pricing_type: Database["public"]["Enums"]["addon_pricing"]
          total: number
          unit_price: number
        }
        Insert: {
          addon_id: string
          booking_id: string
          name: string
          pricing_type: Database["public"]["Enums"]["addon_pricing"]
          total: number
          unit_price: number
        }
        Update: {
          addon_id?: string
          booking_id?: string
          name?: string
          pricing_type?: Database["public"]["Enums"]["addon_pricing"]
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_addons_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          addons_total: number
          admin_note: string | null
          branch_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          car_id: string
          confirmed_at: string | null
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          customer_id: string
          customer_note: string | null
          daily_rate: number
          days: number
          delivery_address: string | null
          delivery_fee: number
          delivery_latitude: number | null
          delivery_longitude: number | null
          delivery_mode: string
          delivery_zone_id: string | null
          discount_amount: number
          end_date: string
          id: string
          paid_at: string | null
          payment_ref: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_reminded_at: string | null
          pickup_time: string
          rate_tier: string
          reference: string
          refund_amount: number | null
          refunded_at: string | null
          rental_total: number
          return_mode: string
          return_reminded_at: string | null
          return_time: string
          start_date: string
          status: Database["public"]["Enums"]["booking_status"]
          total: number
          extensions_total: number
          updated_at: string
          vat_amount: number
          vat_rate: number
          wallet_amount: number
          wallet_requested: boolean
        }
        Insert: {
          addons_total?: number
          admin_note?: string | null
          branch_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          car_id: string
          confirmed_at?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_id: string
          customer_note?: string | null
          daily_rate: number
          days: number
          delivery_address?: string | null
          delivery_fee?: number
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_mode?: string
          delivery_zone_id?: string | null
          discount_amount?: number
          end_date: string
          id?: string
          paid_at?: string | null
          payment_ref?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_reminded_at?: string | null
          pickup_time?: string
          rate_tier: string
          reference: string
          refund_amount?: number | null
          refunded_at?: string | null
          rental_total: number
          return_mode?: string
          return_reminded_at?: string | null
          return_time?: string
          start_date: string
          status?: Database["public"]["Enums"]["booking_status"]
          total: number
          extensions_total?: number
          updated_at?: string
          vat_amount: number
          vat_rate: number
          wallet_amount?: number
          wallet_requested?: boolean
        }
        Update: {
          addons_total?: number
          admin_note?: string | null
          branch_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          car_id?: string
          confirmed_at?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_id?: string
          customer_note?: string | null
          daily_rate?: number
          days?: number
          delivery_address?: string | null
          delivery_fee?: number
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_mode?: string
          delivery_zone_id?: string | null
          discount_amount?: number
          end_date?: string
          id?: string
          paid_at?: string | null
          payment_ref?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_reminded_at?: string | null
          pickup_time?: string
          rate_tier?: string
          reference?: string
          refund_amount?: number | null
          refunded_at?: string | null
          rental_total?: number
          return_mode?: string
          return_reminded_at?: string | null
          return_time?: string
          start_date?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total?: number
          extensions_total?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          wallet_amount?: number
          wallet_requested?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string
          created_at: string
          default_confirmation_mode: Database["public"]["Enums"]["confirmation_mode"]
          deposit_note: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          rating_avg: number | null
          rating_count: number
          sort_order: number
          updated_at: string
          whatsapp: string | null
          working_hours: string | null
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          default_confirmation_mode?: Database["public"]["Enums"]["confirmation_mode"]
          deposit_note?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          rating_avg?: number | null
          rating_count?: number
          sort_order?: number
          updated_at?: string
          whatsapp?: string | null
          working_hours?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          default_confirmation_mode?: Database["public"]["Enums"]["confirmation_mode"]
          deposit_note?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          rating_avg?: number | null
          rating_count?: number
          sort_order?: number
          updated_at?: string
          whatsapp?: string | null
          working_hours?: string | null
        }
        Relationships: []
      }
      car_addons: {
        Row: {
          addon_id: string
          car_id: string
          is_available: boolean
          price: number
        }
        Insert: {
          addon_id: string
          car_id: string
          is_available?: boolean
          price: number
        }
        Update: {
          addon_id?: string
          car_id?: string
          is_available?: boolean
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "car_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_addons_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_blocks: {
        Row: {
          car_id: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          reason: string | null
          start_date: string
        }
        Insert: {
          car_id: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
        }
        Update: {
          car_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_blocks_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      car_private: {
        Row: {
          car_id: string
          insurance_expiry: string | null
          insurance_policy_no: string | null
          notes: string | null
          odometer_km: number | null
          plate_number: string | null
          purchase_date: string | null
          registration_expiry: string | null
          updated_at: string
          vin: string | null
        }
        Insert: {
          car_id: string
          insurance_expiry?: string | null
          insurance_policy_no?: string | null
          notes?: string | null
          odometer_km?: number | null
          plate_number?: string | null
          purchase_date?: string | null
          registration_expiry?: string | null
          updated_at?: string
          vin?: string | null
        }
        Update: {
          car_id?: string
          insurance_expiry?: string | null
          insurance_policy_no?: string | null
          notes?: string | null
          odometer_km?: number | null
          plate_number?: string | null
          purchase_date?: string | null
          registration_expiry?: string | null
          updated_at?: string
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "car_private_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: true
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      cars: {
        Row: {
          branch_id: string
          category: Database["public"]["Enums"]["car_category"]
          color: string | null
          confirmation_mode: Database["public"]["Enums"]["confirmation_mode"]
          cover_image: string | null
          created_at: string
          daily_km_limit: number | null
          daily_price: number
          description: string | null
          doors: number | null
          extra_km_fee: number | null
          features: string[]
          fuel: Database["public"]["Enums"]["fuel_type"]
          id: string
          images: string[]
          make: string
          make_latin: string | null
          max_rental_days: number | null
          min_rental_days: number
          model: string
          monthly_price: number | null
          rating_avg: number | null
          rating_count: number
          seats: number
          sort_order: number
          status: Database["public"]["Enums"]["car_status"]
          transmission: Database["public"]["Enums"]["transmission_type"]
          updated_at: string
          view_count: number
          weekly_price: number | null
          year: number
        }
        Insert: {
          branch_id: string
          category: Database["public"]["Enums"]["car_category"]
          color?: string | null
          confirmation_mode?: Database["public"]["Enums"]["confirmation_mode"]
          cover_image?: string | null
          created_at?: string
          daily_km_limit?: number | null
          daily_price: number
          description?: string | null
          doors?: number | null
          extra_km_fee?: number | null
          features?: string[]
          fuel: Database["public"]["Enums"]["fuel_type"]
          id?: string
          images?: string[]
          make: string
          make_latin?: string | null
          max_rental_days?: number | null
          min_rental_days?: number
          model: string
          monthly_price?: number | null
          rating_avg?: number | null
          rating_count?: number
          seats: number
          sort_order?: number
          status?: Database["public"]["Enums"]["car_status"]
          transmission: Database["public"]["Enums"]["transmission_type"]
          updated_at?: string
          view_count?: number
          weekly_price?: number | null
          year: number
        }
        Update: {
          branch_id?: string
          category?: Database["public"]["Enums"]["car_category"]
          color?: string | null
          confirmation_mode?: Database["public"]["Enums"]["confirmation_mode"]
          cover_image?: string | null
          created_at?: string
          daily_km_limit?: number | null
          daily_price?: number
          description?: string | null
          doors?: number | null
          extra_km_fee?: number | null
          features?: string[]
          fuel?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          images?: string[]
          make?: string
          make_latin?: string | null
          max_rental_days?: number | null
          min_rental_days?: number
          model?: string
          monthly_price?: number | null
          rating_avg?: number | null
          rating_count?: number
          seats?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["car_status"]
          transmission?: Database["public"]["Enums"]["transmission_type"]
          updated_at?: string
          view_count?: number
          weekly_price?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cars_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      client_errors: {
        Row: {
          app_version: string | null
          context: string | null
          created_at: string
          id: string
          message: string
          platform: string | null
          stack: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          context?: string | null
          created_at?: string
          id?: string
          message: string
          platform?: string | null
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          context?: string | null
          created_at?: string
          id?: string
          message?: string
          platform?: string | null
          stack?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_blocks: {
        Row: {
          slug: string
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          slug: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          slug?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          max_per_customer: number
          max_redemptions: number | null
          min_total: number | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          max_per_customer?: number
          max_redemptions?: number | null
          min_total?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          max_per_customer?: number
          max_redemptions?: number | null
          min_total?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          car_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          car_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          car_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          booking_updates: boolean
          offers: boolean
          reminders: boolean
          saved_search_alerts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_updates?: boolean
          offers?: boolean
          reminders?: boolean
          saved_search_alerts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_updates?: boolean
          offers?: boolean
          reminders?: boolean
          saved_search_alerts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category: string
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otp_throttle: {
        Row: {
          last_sent_at: string | null
          phone: string
          send_count: number
          verify_count: number
          verify_window_start: string | null
          window_start: string
        }
        Insert: {
          last_sent_at?: string | null
          phone: string
          send_count?: number
          verify_count?: number
          verify_window_start?: string | null
          window_start?: string
        }
        Update: {
          last_sent_at?: string | null
          phone?: string
          send_count?: number
          verify_count?: number
          verify_window_start?: string | null
          window_start?: string
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          otp: string
          phone: string
          verified_at: string
        }
        Insert: {
          otp: string
          phone: string
          verified_at?: string
        }
        Update: {
          otp?: string
          phone?: string
          verified_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          documents_approved_at: string | null
          documents_approved_by: string | null
          documents_check: Database["public"]["Enums"]["document_check"] | null
          documents_check_note: string | null
          documents_checked_at: string | null
          email: string | null
          full_name: string | null
          id: string
          id_document_path: string | null
          is_blocked: boolean
          license_document_path: string | null
          license_number: string | null
          national_id: string | null
          phone: string | null
          referral_code: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          documents_approved_at?: string | null
          documents_approved_by?: string | null
          documents_check?: Database["public"]["Enums"]["document_check"] | null
          documents_check_note?: string | null
          documents_checked_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          id_document_path?: string | null
          is_blocked?: boolean
          license_document_path?: string | null
          license_number?: string | null
          national_id?: string | null
          phone?: string | null
          referral_code?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          documents_approved_at?: string | null
          documents_approved_by?: string | null
          documents_check?: Database["public"]["Enums"]["document_check"] | null
          documents_check_note?: string | null
          documents_checked_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          id_document_path?: string | null
          is_blocked?: boolean
          license_document_path?: string | null
          license_number?: string | null
          national_id?: string | null
          phone?: string | null
          referral_code?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          created_at: string
          cta_label: string | null
          ends_at: string | null
          figure: string | null
          id: string
          image_url: string | null
          is_active: boolean
          render: Database["public"]["Enums"]["banner_render"]
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          target_branch_id: string | null
          target_car_id: string | null
          target_category: Database["public"]["Enums"]["car_category"] | null
          target_coupon_code: string | null
          target_kind: Database["public"]["Enums"]["banner_target"]
          target_url: string | null
          template: Database["public"]["Enums"]["banner_template"] | null
          title: string | null
          tone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          ends_at?: string | null
          figure?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          render?: Database["public"]["Enums"]["banner_render"]
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          target_branch_id?: string | null
          target_car_id?: string | null
          target_category?: Database["public"]["Enums"]["car_category"] | null
          target_coupon_code?: string | null
          target_kind?: Database["public"]["Enums"]["banner_target"]
          target_url?: string | null
          template?: Database["public"]["Enums"]["banner_template"] | null
          title?: string | null
          tone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          ends_at?: string | null
          figure?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          render?: Database["public"]["Enums"]["banner_render"]
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          target_branch_id?: string | null
          target_car_id?: string | null
          target_category?: Database["public"]["Enums"]["car_category"] | null
          target_coupon_code?: string | null
          target_kind?: Database["public"]["Enums"]["banner_target"]
          target_url?: string | null
          template?: Database["public"]["Enums"]["banner_template"] | null
          title?: string | null
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_banners_target_branch_id_fkey"
            columns: ["target_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_banners_target_car_id_fkey"
            columns: ["target_car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          platform: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          platform?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          platform?: string | null
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string
          id: number
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          author_name: string | null
          booking_id: string
          branch_id: string
          car_id: string
          comment: string | null
          created_at: string
          id: string
          is_hidden: boolean
          rating: number
        }
        Insert: {
          author_id: string
          author_name?: string | null
          booking_id: string
          branch_id: string
          car_id: string
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          rating: number
        }
        Update: {
          author_id?: string
          author_name?: string | null
          booking_id?: string
          branch_id?: string
          car_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          last_notified_at: string | null
          name: string
          notify: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          last_notified_at?: string | null
          name: string
          notify?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          last_notified_at?: string | null
          name?: string
          notify?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_contracts: {
        Row: {
          booking_id: string
          content_type: string | null
          file_name: string
          id: string
          note: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          booking_id: string
          content_type?: string | null
          file_name: string
          id?: string
          note?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          booking_id?: string
          content_type?: string | null
          file_name?: string
          id?: string
          note?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      booking_extensions: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          daily_rate: number
          days_added: number
          id: string
          new_end_date: string
          paid_at: string | null
          payment_ref: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          previous_end_date: string
          rate_tier: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          daily_rate: number
          days_added: number
          id?: string
          new_end_date: string
          paid_at?: string | null
          payment_ref?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          previous_end_date: string
          rate_tier: string
          vat_amount: number
          vat_rate: number
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          daily_rate?: number
          days_added?: number
          id?: string
          new_end_date?: string
          paid_at?: string | null
          payment_ref?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          previous_end_date?: string
          rate_tier?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          branch_id: string | null
          city: string
          created_at: string
          fee: number
          id: string
          is_active: boolean
          name: string
          note: string | null
          sort_order: number
        }
        Insert: {
          branch_id?: string | null
          city: string
          created_at?: string
          fee: number
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          sort_order?: number
        }
        Update: {
          branch_id?: string | null
          city?: string
          created_at?: string
          fee?: number
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          addons_total: number
          booking_id: string
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string
          delivery_fee: number
          discount_amount: number
          extension_id: string | null
          id: string
          issued_at: string
          lines: Json
          number: string
          qr_base64: string
          rental_total: number
          seller_address: string
          seller_cr_number: string
          seller_name: string
          seller_vat_number: string
          total: number
          vat_amount: number
          vat_rate: number
          wallet_amount: number
        }
        Insert: never
        Update: never
        Relationships: []
      }
      org_settings: {
        Row: {
          address: string
          city: string
          cr_number: string
          email: string
          id: boolean
          phone: string
          postal_code: string
          seller_name: string
          updated_at: string
          vat_number: string
        }
        Insert: {
          address?: string
          city?: string
          cr_number?: string
          email?: string
          id?: boolean
          phone?: string
          postal_code?: string
          seller_name?: string
          updated_at?: string
          vat_number?: string
        }
        Update: {
          address?: string
          city?: string
          cr_number?: string
          email?: string
          id?: boolean
          phone?: string
          postal_code?: string
          seller_name?: string
          updated_at?: string
          vat_number?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referred_bonus: number
          referred_id: string
          referrer_bonus: number
          referrer_id: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      wallet_settings: {
        Row: {
          id: boolean
          max_redeem_percent: number
          min_booking_total_to_redeem: number
          referral_bonus: number
          referral_enabled: boolean
          require_phone_for_welcome: boolean
          updated_at: string
          welcome_bonus: number
          welcome_enabled: boolean
        }
        Insert: {
          id?: boolean
          max_redeem_percent?: number
          min_booking_total_to_redeem?: number
          referral_bonus?: number
          referral_enabled?: boolean
          require_phone_for_welcome?: boolean
          updated_at?: string
          welcome_bonus?: number
          welcome_enabled?: boolean
        }
        Update: {
          id?: boolean
          max_redeem_percent?: number
          min_booking_total_to_redeem?: number
          referral_bonus?: number
          referral_enabled?: boolean
          require_phone_for_welcome?: boolean
          updated_at?: string
          welcome_bonus?: number
          welcome_enabled?: boolean
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["wallet_entry_kind"]
          note: string | null
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["wallet_entry_kind"]
          note?: string | null
          user_id: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      audit_client_executable_functions: {
        Args: never
        Returns: {
          anon_can_execute: boolean
          authenticated_can_execute: boolean
          needed_by: string
          problem: string
          routine: string
        }[]
      }
      car_unavailable_ranges: {
        Args: { p_car_id: string }
        Returns: {
          end_date: string
          start_date: string
        }[]
      }
      cars_unavailable_between: {
        Args: { p_end: string; p_start: string }
        Returns: string[]
      }
      car_badges: {
        Args: never
        Returns: {
          badge: string
          car_id: string
        }[]
      }
      coupon_redemptions: {
        Args: { p_coupon_id: string; p_customer_id?: string }
        Returns: number
      }
      expire_stale_bookings: { Args: never; Returns: number }
      home_feed: {
        Args: { p_end?: string; p_start?: string }
        Returns: Json
      }
      generate_booking_reference: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_blocked: { Args: never; Returns: boolean }
      is_documents_ready: { Args: never; Returns: boolean }
      log_audit: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type?: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      quote_booking: {
        Args: {
          p_addon_ids?: string[]
          p_car_id: string
          p_coupon_code?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: Json
      }
      send_booking_reminders: { Args: never; Returns: number }
      validate_coupon: {
        Args: { p_code: string; p_customer_id?: string; p_total: number }
        Returns: Json
      }
      activate_signup_credit: {
        Args: { p_code?: string | null }
        Returns: Json
      }
      my_referral_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      quote_extension: {
        Args: { p_booking: string; p_new_end: string }
        Returns: Json
      }
      request_extension: {
        Args: { p_booking: string; p_new_end: string }
        Returns: Json
      }
      wallet_balance: {
        Args: { p_user?: string | null }
        Returns: number
      }
      maybe_nudge_phone_verification: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      wallet_entry_kind:
        | "welcome_bonus"
        | "referral_bonus"
        | "booking_redeem"
        | "booking_refund"
        | "admin_credit"
        | "admin_debit"
        | "expiry"
      addon_pricing: "per_day" | "one_time"
      banner_render: "image" | "template"
      banner_target: "none" | "car" | "branch" | "category" | "coupon" | "url"
      banner_template: "giant_number" | "discount" | "category"
      booking_status:
        | "pending_payment"
        | "pending_confirmation"
        | "confirmed"
        | "active"
        | "completed"
        | "cancelled"
        | "rejected"
        | "expired"
      car_category: "economy" | "family" | "luxury" | "suv" | "commercial"
      car_status: "draft" | "available" | "maintenance" | "hidden"
      confirmation_mode: "instant" | "manual"
      discount_type: "percent" | "fixed"
      document_check: "pending" | "accepted" | "rejected"
      fuel_type: "petrol" | "diesel" | "hybrid" | "electric"
      payment_status:
        | "unpaid"
        | "paid"
        | "refunded"
        | "partially_refunded"
        | "failed"
      transmission_type: "automatic" | "manual"
      user_role: "customer" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      addon_pricing: ["per_day", "one_time"],
      banner_render: ["image", "template"],
      banner_target: ["none", "car", "branch", "category", "coupon", "url"],
      banner_template: ["giant_number", "discount", "category"],
      booking_status: [
        "pending_payment",
        "pending_confirmation",
        "confirmed",
        "active",
        "completed",
        "cancelled",
        "rejected",
        "expired",
      ],
      car_category: ["economy", "family", "luxury", "suv", "commercial"],
      car_status: ["draft", "available", "maintenance", "hidden"],
      confirmation_mode: ["instant", "manual"],
      discount_type: ["percent", "fixed"],
      document_check: ["pending", "accepted", "rejected"],
      fuel_type: ["petrol", "diesel", "hybrid", "electric"],
      payment_status: [
        "unpaid",
        "paid",
        "refunded",
        "partially_refunded",
        "failed",
      ],
      transmission_type: ["automatic", "manual"],
      user_role: ["customer", "admin"],
    },
  },
} as const
