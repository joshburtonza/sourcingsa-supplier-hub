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
      orders: {
        Row: {
          amount: number
          category: string | null
          courier: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          email: string
          id: string
          notes: string | null
          ordered_at: string
          paid: boolean
          product_id: string | null
          product_name: string
          quantity: number
          shipping_address: string | null
          shipping_city: string | null
          shipping_postal_code: string | null
          shipping_province: string | null
          shopify_order_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          tracking_number: string | null
          unit_cost: number
          updated_at: string
          variant_selection: Json
        }
        Insert: {
          amount?: number
          category?: string | null
          courier?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          email: string
          id?: string
          notes?: string | null
          ordered_at?: string
          paid?: boolean
          product_id?: string | null
          product_name: string
          quantity?: number
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_postal_code?: string | null
          shipping_province?: string | null
          shopify_order_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tracking_number?: string | null
          unit_cost?: number
          updated_at?: string
          variant_selection?: Json
        }
        Update: {
          amount?: number
          category?: string | null
          courier?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          email?: string
          id?: string
          notes?: string | null
          ordered_at?: string
          paid?: boolean
          product_id?: string | null
          product_name?: string
          quantity?: number
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_postal_code?: string | null
          shipping_province?: string | null
          shopify_order_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tracking_number?: string | null
          unit_cost?: number
          updated_at?: string
          variant_selection?: Json
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string
          checkout_url: string | null
          cost_price: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          images: Json
          name: string
          sales_count: number
          sell_price: number
          shopify_url: string | null
          source_id: string | null
          stock_status: string
          supplier_note: string | null
          trending: boolean
          updated_at: string
          variant_map: Json
          variant_options: Json
        }
        Insert: {
          active?: boolean
          category: string
          checkout_url?: string | null
          cost_price: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json
          name: string
          sales_count?: number
          sell_price: number
          shopify_url?: string | null
          source_id?: string | null
          stock_status?: string
          supplier_note?: string | null
          trending?: boolean
          updated_at?: string
          variant_map?: Json
          variant_options?: Json
        }
        Update: {
          active?: boolean
          category?: string
          checkout_url?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json
          name?: string
          sales_count?: number
          sell_price?: number
          shopify_url?: string | null
          source_id?: string | null
          stock_status?: string
          supplier_note?: string | null
          trending?: boolean
          updated_at?: string
          variant_map?: Json
          variant_options?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          dropstore_account_id: string | null
          dropstore_email: string | null
          dropstore_linked_at: string | null
          dropstore_tier: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          store_name: string | null
          store_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dropstore_account_id?: string | null
          dropstore_email?: string | null
          dropstore_linked_at?: string | null
          dropstore_tier?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          store_name?: string | null
          store_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dropstore_account_id?: string | null
          dropstore_email?: string | null
          dropstore_linked_at?: string | null
          dropstore_tier?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          store_name?: string | null
          store_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_requests: {
        Row: {
          admin_reply: string | null
          created_at: string
          id: string
          image_url: string | null
          notes: string | null
          product_name: string
          product_url: string | null
          quote_cost: number | null
          quote_sell: number | null
          requester_email: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          notes?: string | null
          product_name: string
          product_url?: string | null
          quote_cost?: number | null
          quote_sell?: number | null
          requester_email: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          notes?: string | null
          product_name?: string
          product_url?: string | null
          quote_cost?: number | null
          quote_sell?: number | null
          requester_email?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          created_at: string
          email: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          status?: string
          subject?: string
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
        Args: { _user_id: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      place_order: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_customer_name: string
          p_customer_phone: string
          p_customer_email: string
          p_shipping_address: string
          p_shipping_city: string
          p_shipping_province: string
          p_shipping_postal_code: string
          p_notes: string
          p_variant_selection?: Json
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "approved"
      order_status:
        | "unfulfilled"
        | "processing"
        | "in_transit"
        | "delivered"
        | "cancelled"
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
      app_role: ["admin", "approved"],
      order_status: [
        "unfulfilled",
        "processing",
        "in_transit",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
