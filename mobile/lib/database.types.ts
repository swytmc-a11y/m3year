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
      accountants: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          is_active: boolean
          rating_avg: number
          socpa_number: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id: string
          is_active?: boolean
          rating_avg?: number
          socpa_number?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          rating_avg?: number
          socpa_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountants_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_reports: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          model_version: string | null
          published: boolean
          published_at: string | null
          requested_by: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          model_version?: string | null
          published?: boolean
          published_at?: string | null
          requested_by: string
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          model_version?: string | null
          published?: boolean
          published_at?: string | null
          requested_by?: string
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_reports_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          id?: never
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: never
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
      conversations: {
        Row: {
          created_at: string
          franchise_id: string | null
          id: string
          investor_id: string
          listing_id: string | null
          owner_id: string
        }
        Insert: {
          created_at?: string
          franchise_id?: string | null
          id?: string
          investor_id: string
          listing_id?: string | null
          owner_id: string
        }
        Update: {
          created_at?: string
          franchise_id?: string | null
          id?: string
          investor_id?: string
          listing_id?: string | null
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          franchise_id: string | null
          id: string
          listing_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          franchise_id?: string | null
          id?: string
          listing_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          franchise_id?: string | null
          id?: string
          listing_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
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
      franchise_confidential: {
        Row: {
          commercial_registration_number: string | null
          created_at: string
          entity_type: string
          franchise_id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          commercial_registration_number?: string | null
          created_at?: string
          entity_type: string
          franchise_id: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          commercial_registration_number?: string | null
          created_at?: string
          entity_type?: string
          franchise_id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "franchise_confidential_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: true
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franchise_confidential_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      franchises: {
        Row: {
          brand_name: string
          cities_available: string[]
          city: string
          contract_duration_years: number | null
          countries_available: string[]
          created_at: string
          current_branches_count: number | null
          description: string | null
          expected_payback_months: number | null
          featured_until: string | null
          founding_year: number | null
          franchise_fee: number
          franchise_type: string
          id: string
          initial_investment_max: number | null
          initial_investment_min: number | null
          is_featured: boolean
          logo_url: string | null
          marketing_support: string | null
          miyar_completeness_pct: number | null
          miyar_computed_at: string | null
          miyar_confidence_score: number | null
          miyar_formula_version: number | null
          miyar_grade: string | null
          miyar_quality_score: number | null
          operational_support: string | null
          owner_id: string
          photo_urls: string[]
          rejection_reason: string | null
          required_employees_count: number | null
          required_space_sqm: number | null
          reviewed_at: string | null
          royalty_percentage: number | null
          sector: Database["public"]["Enums"]["business_sector"]
          status: Database["public"]["Enums"]["listing_status"]
          training_provided: boolean
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
        }
        Insert: {
          brand_name: string
          cities_available?: string[]
          city: string
          contract_duration_years?: number | null
          countries_available?: string[]
          created_at?: string
          current_branches_count?: number | null
          description?: string | null
          expected_payback_months?: number | null
          featured_until?: string | null
          founding_year?: number | null
          franchise_fee: number
          franchise_type?: string
          id?: string
          initial_investment_max?: number | null
          initial_investment_min?: number | null
          is_featured?: boolean
          logo_url?: string | null
          marketing_support?: string | null
          miyar_completeness_pct?: number | null
          miyar_computed_at?: string | null
          miyar_confidence_score?: number | null
          miyar_formula_version?: number | null
          miyar_grade?: string | null
          miyar_quality_score?: number | null
          operational_support?: string | null
          owner_id: string
          photo_urls?: string[]
          rejection_reason?: string | null
          required_employees_count?: number | null
          required_space_sqm?: number | null
          reviewed_at?: string | null
          royalty_percentage?: number | null
          sector: Database["public"]["Enums"]["business_sector"]
          status?: Database["public"]["Enums"]["listing_status"]
          training_provided?: boolean
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Update: {
          brand_name?: string
          cities_available?: string[]
          city?: string
          contract_duration_years?: number | null
          countries_available?: string[]
          created_at?: string
          current_branches_count?: number | null
          description?: string | null
          expected_payback_months?: number | null
          featured_until?: string | null
          founding_year?: number | null
          franchise_fee?: number
          franchise_type?: string
          id?: string
          initial_investment_max?: number | null
          initial_investment_min?: number | null
          is_featured?: boolean
          logo_url?: string | null
          marketing_support?: string | null
          miyar_completeness_pct?: number | null
          miyar_computed_at?: string | null
          miyar_confidence_score?: number | null
          miyar_formula_version?: number | null
          miyar_grade?: string | null
          miyar_quality_score?: number | null
          operational_support?: string | null
          owner_id?: string
          photo_urls?: string[]
          rejection_reason?: string | null
          required_employees_count?: number | null
          required_space_sqm?: number | null
          reviewed_at?: string | null
          royalty_percentage?: number | null
          sector?: Database["public"]["Enums"]["business_sector"]
          status?: Database["public"]["Enums"]["listing_status"]
          training_provided?: boolean
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "franchises_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_confidential: {
        Row: {
          commercial_registration_number: string | null
          created_at: string
          entity_type: string
          listing_id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          commercial_registration_number?: string | null
          created_at?: string
          entity_type: string
          listing_id: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          commercial_registration_number?: string | null
          created_at?: string
          entity_type?: string
          listing_id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_confidential_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_confidential_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          asking_price: number | null
          city: string
          created_at: string
          description: string | null
          employee_count: number | null
          featured_until: string | null
          financial_data_sharing: string
          founding_year: number | null
          has_legal_obligations: boolean
          id: string
          is_featured: boolean
          miyar_completeness_pct: number | null
          miyar_computed_at: string | null
          miyar_confidence_score: number | null
          miyar_formula_version: number | null
          miyar_grade: string | null
          miyar_quality_score: number | null
          monthly_profit: number | null
          monthly_revenue: number
          offered_percentage: number
          owner_id: string
          photo_urls: string[]
          price_negotiable: boolean
          reason_for_selling: string | null
          reason_for_selling_other: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          sector: Database["public"]["Enums"]["business_sector"]
          show_profit: boolean
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
        }
        Insert: {
          asking_price?: number | null
          city: string
          created_at?: string
          description?: string | null
          employee_count?: number | null
          featured_until?: string | null
          financial_data_sharing?: string
          founding_year?: number | null
          has_legal_obligations?: boolean
          id?: string
          is_featured?: boolean
          miyar_completeness_pct?: number | null
          miyar_computed_at?: string | null
          miyar_confidence_score?: number | null
          miyar_formula_version?: number | null
          miyar_grade?: string | null
          miyar_quality_score?: number | null
          monthly_profit?: number | null
          monthly_revenue: number
          offered_percentage: number
          owner_id: string
          photo_urls?: string[]
          price_negotiable?: boolean
          reason_for_selling?: string | null
          reason_for_selling_other?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          sector: Database["public"]["Enums"]["business_sector"]
          show_profit?: boolean
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Update: {
          asking_price?: number | null
          city?: string
          created_at?: string
          description?: string | null
          employee_count?: number | null
          featured_until?: string | null
          financial_data_sharing?: string
          founding_year?: number | null
          has_legal_obligations?: boolean
          id?: string
          is_featured?: boolean
          miyar_completeness_pct?: number | null
          miyar_computed_at?: string | null
          miyar_confidence_score?: number | null
          miyar_formula_version?: number | null
          miyar_grade?: string | null
          miyar_quality_score?: number | null
          monthly_profit?: number | null
          monthly_revenue?: number
          offered_percentage?: number
          owner_id?: string
          photo_urls?: string[]
          price_negotiable?: boolean
          reason_for_selling?: string | null
          reason_for_selling_other?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          sector?: Database["public"]["Enums"]["business_sector"]
          show_profit?: boolean
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_type: string | null
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          related_id?: string | null
          title?: string
          type?: string
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
      profile_contact: {
        Row: {
          email: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          email?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_contact_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          is_blocked: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_blocked?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      promotion_orders: {
        Row: {
          amount_halalas: number
          created_at: string
          currency: string
          failure_reason: string | null
          featured_from: string | null
          featured_until: string | null
          id: string
          paid_at: string | null
          plan_code: string
          provider: string
          provider_invoice_id: string | null
          provider_payment_id: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_halalas: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          featured_from?: string | null
          featured_until?: string | null
          id?: string
          paid_at?: string | null
          plan_code: string
          provider?: string
          provider_invoice_id?: string | null
          provider_payment_id?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_halalas?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          featured_from?: string | null
          featured_until?: string | null
          id?: string
          paid_at?: string | null
          plan_code?: string
          provider?: string
          provider_invoice_id?: string | null
          provider_payment_id?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_orders_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "promotion_plans"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "promotion_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_plans: {
        Row: {
          code: string
          created_at: string
          description_ar: string | null
          duration_days: number
          is_active: boolean
          name_ar: string
          price_halalas: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description_ar?: string | null
          duration_days: number
          is_active?: boolean
          name_ar: string
          price_halalas: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description_ar?: string | null
          duration_days?: number
          is_active?: boolean
          name_ar?: string
          price_halalas?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          expo_push_token: string
          id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expo_push_token: string
          id?: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expo_push_token?: string
          id?: string
          platform?: string
          updated_at?: string
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
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          listing_id: string | null
          rated_id: string
          rater_id: string
          score: number
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rated_id: string
          rater_id: string
          score: number
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rated_id?: string
          rater_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          accountant_id: string | null
          completed_at: string | null
          created_at: string
          fee_amount: number | null
          financial_statement_path: string | null
          franchise_id: string | null
          id: string
          listing_id: string | null
          notes: string | null
          owner_id: string
          report_path: string | null
          status: Database["public"]["Enums"]["verification_request_status"]
          updated_at: string
          verified_revenue: number | null
        }
        Insert: {
          accountant_id?: string | null
          completed_at?: string | null
          created_at?: string
          fee_amount?: number | null
          financial_statement_path?: string | null
          franchise_id?: string | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          owner_id: string
          report_path?: string | null
          status?: Database["public"]["Enums"]["verification_request_status"]
          updated_at?: string
          verified_revenue?: number | null
        }
        Update: {
          accountant_id?: string | null
          completed_at?: string | null
          created_at?: string
          fee_amount?: number | null
          financial_statement_path?: string | null
          franchise_id?: string | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          owner_id?: string
          report_path?: string | null
          status?: Database["public"]["Enums"]["verification_request_status"]
          updated_at?: string
          verified_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_accountant_id_fkey"
            columns: ["accountant_id"]
            isOneToOne: false
            referencedRelation: "accountants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: {
          p_body: string
          p_related_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      expire_featured_promotions: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_blocked: { Args: { uid: string }; Returns: boolean }
      log_audit: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      owns_ai_report_target: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: boolean
      }
      recompute_all_miyar_index: { Args: never; Returns: undefined }
      recompute_miyar_index_franchise: {
        Args: { p_franchise_id: string }
        Returns: undefined
      }
      recompute_miyar_index_listing: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
    }
    Enums: {
      business_sector: "cafe" | "restaurant" | "retail" | "services" | "other"
      listing_status:
        | "draft"
        | "published"
        | "archived"
        | "pending_review"
        | "rejected"
      user_role: "project_owner" | "investor" | "accountant" | "admin"
      verification_request_status:
        | "requested"
        | "assigned"
        | "in_review"
        | "completed"
        | "rejected"
      verification_status: "none" | "pending" | "verified" | "rejected"
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
      business_sector: ["cafe", "restaurant", "retail", "services", "other"],
      listing_status: [
        "draft",
        "published",
        "archived",
        "pending_review",
        "rejected",
      ],
      user_role: ["project_owner", "investor", "accountant", "admin"],
      verification_request_status: [
        "requested",
        "assigned",
        "in_review",
        "completed",
        "rejected",
      ],
      verification_status: ["none", "pending", "verified", "rejected"],
    },
  },
} as const
