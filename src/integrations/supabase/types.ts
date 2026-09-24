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
      orders: {
        Row: {
          admin_note: string
          amount: number
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          coupon_code: string
          created_at: string
          delivered_at: string | null
          discount: number
          id: string
          note: string
          payment_reference: string
          reference: string
          status: string
          template_id: string
          template_title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string
          amount?: number
          buyer_email: string
          buyer_name: string
          buyer_phone?: string
          coupon_code?: string
          created_at?: string
          delivered_at?: string | null
          discount?: number
          id?: string
          note?: string
          payment_reference?: string
          reference: string
          status?: string
          template_id: string
          template_title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string
          amount?: number
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string
          coupon_code?: string
          created_at?: string
          delivered_at?: string | null
          discount?: number
          id?: string
          note?: string
          payment_reference?: string
          reference?: string
          status?: string
          template_id?: string
          template_title?: string
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
      template_deliverables: {
        Row: {
          duplicate_url: string
          guide_url: string
          notes: string
          template_id: string
          updated_at: string
        }
        Insert: {
          duplicate_url?: string
          guide_url?: string
          notes?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          duplicate_url?: string
          guide_url?: string
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
          compare_at_price: number | null
          cover_image_url: string | null
          created_at: string
          description: string
          faq: Json
          gallery_urls: string[]
          highlights: string[]
          id: string
          includes: string[]
          is_featured: boolean
          is_published: boolean
          preview_url: string | null
          price: number
          rating: number
          sales_count: number
          slug: string
          sort_order: number
          tagline: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          compare_at_price?: number | null
          cover_image_url?: string | null
          created_at?: string
          description?: string
          faq?: Json
          gallery_urls?: string[]
          highlights?: string[]
          id?: string
          includes?: string[]
          is_featured?: boolean
          is_published?: boolean
          preview_url?: string | null
          price?: number
          rating?: number
          sales_count?: number
          slug: string
          sort_order?: number
          tagline?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          compare_at_price?: number | null
          cover_image_url?: string | null
          created_at?: string
          description?: string
          faq?: Json
          gallery_urls?: string[]
          highlights?: string[]
          id?: string
          includes?: string[]
          is_featured?: boolean
          is_published?: boolean
          preview_url?: string | null
          price?: number
          rating?: number
          sales_count?: number
          slug?: string
          sort_order?: number
          tagline?: string
          title?: string
          updated_at?: string
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
