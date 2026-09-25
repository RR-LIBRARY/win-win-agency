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
      bookings: {
        Row: {
          add_on_ids: string[]
          add_ons_total: number
          admin_note: string
          company: string
          created_at: string
          deadline: string
          details: string
          email: string
          id: string
          name: string
          package_id: string
          package_name: string
          package_price: number
          phone: string
          reference: string
          service_name: string
          service_slug: string
          setup_fee: number
          status: string
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          add_on_ids?: string[]
          add_ons_total?: number
          admin_note?: string
          company?: string
          created_at?: string
          deadline?: string
          details?: string
          email: string
          id?: string
          name: string
          package_id: string
          package_name: string
          package_price?: number
          phone: string
          reference: string
          service_name: string
          service_slug: string
          setup_fee?: number
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          add_on_ids?: string[]
          add_ons_total?: number
          admin_note?: string
          company?: string
          created_at?: string
          deadline?: string
          details?: string
          email?: string
          id?: string
          name?: string
          package_id?: string
          package_name?: string
          package_price?: number
          phone?: string
          reference?: string
          service_name?: string
          service_slug?: string
          setup_fee?: number
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          kind: string
          max_uses: number | null
          updated_at: string
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          max_uses?: number | null
          updated_at?: string
          used_count?: number
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          max_uses?: number | null
          updated_at?: string
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      license_keys: {
        Row: {
          activations: number
          buyer_email: string
          created_at: string
          id: string
          key: string
          last_activated_at: string | null
          max_activations: number
          order_id: string
          status: string
          template_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activations?: number
          buyer_email: string
          created_at?: string
          id?: string
          key: string
          last_activated_at?: string | null
          max_activations?: number
          order_id: string
          status?: string
          template_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activations?: number
          buyer_email?: string
          created_at?: string
          id?: string
          key?: string
          last_activated_at?: string | null
          max_activations?: number
          order_id?: string
          status?: string
          template_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_keys_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_keys_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_token: string
          admin_note: string
          amount: number
          amount_paid: number
          buyer_company: string
          buyer_email: string
          buyer_gstin: string
          buyer_name: string
          buyer_phone: string
          coupon_code: string
          created_at: string
          currency: string
          delivered_at: string | null
          discount: number
          failure_reason: string
          id: string
          invoice_number: string | null
          note: string
          paid_at: string | null
          payment_method: string
          payment_provider: string
          payment_reference: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          reference: string
          refund_id: string | null
          refunded_at: string | null
          status: string
          template_id: string
          template_title: string
          tier_id: string
          tier_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string
          admin_note?: string
          amount?: number
          amount_paid?: number
          buyer_company?: string
          buyer_email: string
          buyer_gstin?: string
          buyer_name: string
          buyer_phone?: string
          coupon_code?: string
          created_at?: string
          currency?: string
          delivered_at?: string | null
          discount?: number
          failure_reason?: string
          id?: string
          invoice_number?: string | null
          note?: string
          paid_at?: string | null
          payment_method?: string
          payment_provider?: string
          payment_reference?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          reference: string
          refund_id?: string | null
          refunded_at?: string | null
          status?: string
          template_id: string
          template_title: string
          tier_id?: string
          tier_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          admin_note?: string
          amount?: number
          amount_paid?: number
          buyer_company?: string
          buyer_email?: string
          buyer_gstin?: string
          buyer_name?: string
          buyer_phone?: string
          coupon_code?: string
          created_at?: string
          currency?: string
          delivered_at?: string | null
          discount?: number
          failure_reason?: string
          id?: string
          invoice_number?: string | null
          note?: string
          paid_at?: string | null
          payment_method?: string
          payment_provider?: string
          payment_reference?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          reference?: string
          refund_id?: string | null
          refunded_at?: string | null
          status?: string
          template_id?: string
          template_title?: string
          tier_id?: string
          tier_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          amount: number | null
          created_at: string
          error: string
          event_id: string | null
          event_type: string
          id: string
          order_id: string | null
          payload: Json
          provider: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          error?: string
          event_id?: string | null
          event_type: string
          id?: string
          order_id?: string | null
          payload?: Json
          provider?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          error?: string
          event_id?: string | null
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json
          provider?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_docs: {
        Row: {
          content_md: string
          created_at: string
          id: string
          kind: string
          provider: string
          sort_order: number
          template_id: string
          title: string
          updated_at: string
          url: string
          visibility: string
        }
        Insert: {
          content_md?: string
          created_at?: string
          id?: string
          kind?: string
          provider?: string
          sort_order?: number
          template_id: string
          title: string
          updated_at?: string
          url?: string
          visibility?: string
        }
        Update: {
          content_md?: string
          created_at?: string
          id?: string
          kind?: string
          provider?: string
          sort_order?: number
          template_id?: string
          title?: string
          updated_at?: string
          url?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_docs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          accepted_terms: boolean
          admin_reply: string
          author_name: string
          body: string
          created_at: string
          id: string
          order_id: string
          rating: number
          replied_at: string | null
          status: string
          template_id: string
          title: string
          updated_at: string
          user_id: string | null
          verified_purchase: boolean
        }
        Insert: {
          accepted_terms?: boolean
          admin_reply?: string
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          order_id: string
          rating: number
          replied_at?: string | null
          status?: string
          template_id: string
          title?: string
          updated_at?: string
          user_id?: string | null
          verified_purchase?: boolean
        }
        Update: {
          accepted_terms?: boolean
          admin_reply?: string
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          replied_at?: string | null
          status?: string
          template_id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          verified_purchase?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          phone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          label?: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          label?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      site_videos: {
        Row: {
          caption: string
          created_at: string
          id: string
          is_published: boolean
          placement: string
          provider: string
          sort_order: number
          title: string
          transcript: string
          updated_at: string
          url: string
          video_id: string
        }
        Insert: {
          caption?: string
          created_at?: string
          id?: string
          is_published?: boolean
          placement?: string
          provider: string
          sort_order?: number
          title: string
          transcript?: string
          updated_at?: string
          url: string
          video_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          is_published?: boolean
          placement?: string
          provider?: string
          sort_order?: number
          title?: string
          transcript?: string
          updated_at?: string
          url?: string
          video_id?: string
        }
        Relationships: []
      }
      template_deliverables: {
        Row: {
          access_url: string
          download_path: string
          download_url: string
          duplicate_url: string
          guide_url: string
          issue_license: boolean
          license_max_activations: number
          notes: string
          template_id: string
          updated_at: string
        }
        Insert: {
          access_url?: string
          download_path?: string
          download_url?: string
          duplicate_url?: string
          guide_url?: string
          issue_license?: boolean
          license_max_activations?: number
          notes?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          access_url?: string
          download_path?: string
          download_url?: string
          duplicate_url?: string
          guide_url?: string
          issue_license?: boolean
          license_max_activations?: number
          notes?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_deliverables_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: true
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category: string
          changelog: Json
          compare_at_price: number | null
          cover_image_url: string | null
          created_at: string
          delivery_type: string
          demo_url: string | null
          description: string
          docs_url: string | null
          external_platform: string
          external_url: string | null
          faq: Json
          file_size: string
          gallery_urls: string[]
          highlights: string[]
          id: string
          includes: string[]
          is_featured: boolean
          is_published: boolean
          license_terms: string
          platforms: string[]
          preview_url: string | null
          price: number
          product_type: string
          rating: number
          requirements: string[]
          review_avg: number
          review_count: number
          sales_count: number
          slug: string
          sort_order: number
          tagline: string
          tech_stack: string[]
          tiers: Json
          title: string
          updated_at: string
          version: string
          video_url: string | null
        }
        Insert: {
          category?: string
          changelog?: Json
          compare_at_price?: number | null
          cover_image_url?: string | null
          created_at?: string
          delivery_type?: string
          demo_url?: string | null
          description?: string
          docs_url?: string | null
          external_platform?: string
          external_url?: string | null
          faq?: Json
          file_size?: string
          gallery_urls?: string[]
          highlights?: string[]
          id?: string
          includes?: string[]
          is_featured?: boolean
          is_published?: boolean
          license_terms?: string
          platforms?: string[]
          preview_url?: string | null
          price?: number
          product_type?: string
          rating?: number
          requirements?: string[]
          review_avg?: number
          review_count?: number
          sales_count?: number
          slug: string
          sort_order?: number
          tagline?: string
          tech_stack?: string[]
          tiers?: Json
          title: string
          updated_at?: string
          version?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          changelog?: Json
          compare_at_price?: number | null
          cover_image_url?: string | null
          created_at?: string
          delivery_type?: string
          demo_url?: string | null
          description?: string
          docs_url?: string | null
          external_platform?: string
          external_url?: string | null
          faq?: Json
          file_size?: string
          gallery_urls?: string[]
          highlights?: string[]
          id?: string
          includes?: string[]
          is_featured?: boolean
          is_published?: boolean
          license_terms?: string
          platforms?: string[]
          preview_url?: string | null
          price?: number
          product_type?: string
          rating?: number
          requirements?: string[]
          review_avg?: number
          review_count?: number
          sales_count?: number
          slug?: string
          sort_order?: number
          tagline?: string
          tech_stack?: string[]
          tiers?: Json
          title?: string
          updated_at?: string
          version?: string
          video_url?: string | null
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_invoice_number: { Args: never; Returns: string }
      refresh_template_review_stats: {
        Args: { _template_id: string }
        Returns: undefined
      }
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
      app_role: ["admin", "user"],
    },
  },
} as const
