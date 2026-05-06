export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          created_at: string;
          detail: string | null;
          id: string;
          ip_address: string | null;
          module: string;
          user_id: string | null;
          username: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          detail?: string | null;
          id?: string;
          ip_address?: string | null;
          module: string;
          user_id?: string | null;
          username?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          detail?: string | null;
          id?: string;
          ip_address?: string | null;
          module?: string;
          user_id?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      backup_history: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          filename: string;
          id: string;
          size: number;
          type: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          filename: string;
          id?: string;
          size: number;
          type: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          filename?: string;
          id?: string;
          size?: number;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "backup_history_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          advance_paid: number;
          agreed_total: number;
          booking_date: string;
          created_at: string;
          created_by: string | null;
          customer_name: string;
          deleted_at: string | null;
          discount: number;
          guests: number;
          id: string;
          id_proof_number: string | null;
          id_proof_type: Database["public"]["Enums"]["id_proof_type"] | null;
          mobile: string;
          notes: string | null;
          order_id: string;
          slot_id: string;
          status: Database["public"]["Enums"]["booking_status"];
          updated_at: string;
        };
        Insert: {
          advance_paid?: number;
          agreed_total?: number;
          booking_date: string;
          created_at?: string;
          created_by?: string | null;
          customer_name: string;
          deleted_at?: string | null;
          discount?: number;
          guests?: number;
          id?: string;
          id_proof_number?: string | null;
          id_proof_type?: Database["public"]["Enums"]["id_proof_type"] | null;
          mobile: string;
          notes?: string | null;
          order_id?: string;
          slot_id: string;
          status?: Database["public"]["Enums"]["booking_status"];
          updated_at?: string;
        };
        Update: {
          advance_paid?: number;
          agreed_total?: number;
          booking_date?: string;
          created_at?: string;
          created_by?: string | null;
          customer_name?: string;
          deleted_at?: string | null;
          discount?: number;
          guests?: number;
          id?: string;
          id_proof_number?: string | null;
          id_proof_type?: Database["public"]["Enums"]["id_proof_type"] | null;
          mobile?: string;
          notes?: string | null;
          order_id?: string;
          slot_id?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey";
            columns: ["slot_id"];
            isOneToOne: false;
            referencedRelation: "time_slots";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_types: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          date: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          payment_mode: Database["public"]["Enums"]["payment_mode"];
          reference: string | null;
          type_id: string;
          updated_at: string;
          vendor: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          date?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          payment_mode?: Database["public"]["Enums"]["payment_mode"];
          reference?: string | null;
          type_id: string;
          updated_at?: string;
          vendor?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          date?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          payment_mode?: Database["public"]["Enums"]["payment_mode"];
          reference?: string | null;
          type_id?: string;
          updated_at?: string;
          vendor?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_type_id_fkey";
            columns: ["type_id"];
            isOneToOne: false;
            referencedRelation: "expense_types";
            referencedColumns: ["id"];
          },
        ];
      };
      income_types: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      incomes: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          date: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          payment_mode: Database["public"]["Enums"]["payment_mode"];
          reference: string | null;
          type_id: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          date?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          payment_mode?: Database["public"]["Enums"]["payment_mode"];
          reference?: string | null;
          type_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          date?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          payment_mode?: Database["public"]["Enums"]["payment_mode"];
          reference?: string | null;
          type_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incomes_type_id_fkey";
            columns: ["type_id"];
            isOneToOne: false;
            referencedRelation: "income_types";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          last_login_at: string | null;
          status: Database["public"]["Enums"]["user_status"];
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          id: string;
          last_login_at?: string | null;
          status?: Database["public"]["Enums"]["user_status"];
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          last_login_at?: string | null;
          status?: Database["public"]["Enums"]["user_status"];
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          address: string | null;
          business_address: string | null;
          business_email: string | null;
          business_name: string | null;
          business_phone: string | null;
          default_booking_notes: string | null;
          default_slot_id: string | null;
          email: string | null;
          farmhouse_name: string;
          gst_number: string | null;
          id: number;
          logo_url: string | null;
          notify_bookings: boolean | null;
          notify_daily_summary: boolean | null;
          notify_payments: boolean | null;
          phone: string | null;
          tax_percent: number | null;
          updated_at: string;
          tagline: string | null;
          owner_name: string | null;
          alternate_phone: string | null;
          website_url: string | null;
          maps_link: string | null;
          dark_logo_url: string | null;
          favicon_url: string | null;
          watermark_url: string | null;
          login_bg_url: string | null;
          min_advance_percent: number | null;
          allow_partial_payment: boolean | null;
          enable_discounts: boolean | null;
          max_guests: number | null;
          whatsapp_template_booking: string | null;
          whatsapp_template_payment: string | null;
          whatsapp_template_cancel: string | null;
          currency_symbol: string | null;
          currency_position: string | null;
          financial_year_start: string | null;
          accent_color: string | null;
        };
        Insert: {
          address?: string | null;
          business_address?: string | null;
          business_email?: string | null;
          business_name?: string | null;
          business_phone?: string | null;
          default_booking_notes?: string | null;
          default_slot_id?: string | null;
          email?: string | null;
          farmhouse_name?: string;
          gst_number?: string | null;
          id?: number;
          logo_url?: string | null;
          notify_bookings?: boolean | null;
          notify_daily_summary?: boolean | null;
          notify_payments?: boolean | null;
          phone?: string | null;
          tax_percent?: number | null;
          updated_at?: string;
          tagline?: string | null;
          owner_name?: string | null;
          alternate_phone?: string | null;
          website_url?: string | null;
          maps_link?: string | null;
          dark_logo_url?: string | null;
          favicon_url?: string | null;
          watermark_url?: string | null;
          login_bg_url?: string | null;
          min_advance_percent?: number | null;
          allow_partial_payment?: boolean | null;
          enable_discounts?: boolean | null;
          max_guests?: number | null;
          whatsapp_template_booking?: string | null;
          whatsapp_template_payment?: string | null;
          whatsapp_template_cancel?: string | null;
          currency_symbol?: string | null;
          currency_position?: string | null;
          financial_year_start?: string | null;
          accent_color?: string | null;
        };
        Update: {
          address?: string | null;
          business_address?: string | null;
          business_email?: string | null;
          business_name?: string | null;
          business_phone?: string | null;
          default_booking_notes?: string | null;
          default_slot_id?: string | null;
          email?: string | null;
          farmhouse_name?: string;
          gst_number?: string | null;
          id?: number;
          logo_url?: string | null;
          notify_bookings?: boolean | null;
          notify_daily_summary?: boolean | null;
          notify_payments?: boolean | null;
          phone?: string | null;
          tax_percent?: number | null;
          updated_at?: string;
          tagline?: string | null;
          owner_name?: string | null;
          alternate_phone?: string | null;
          website_url?: string | null;
          maps_link?: string | null;
          dark_logo_url?: string | null;
          favicon_url?: string | null;
          watermark_url?: string | null;
          login_bg_url?: string | null;
          min_advance_percent?: number | null;
          allow_partial_payment?: boolean | null;
          enable_discounts?: boolean | null;
          max_guests?: number | null;
          whatsapp_template_booking?: string | null;
          whatsapp_template_payment?: string | null;
          whatsapp_template_cancel?: string | null;
          currency_symbol?: string | null;
          currency_position?: string | null;
          financial_year_start?: string | null;
          accent_color?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "settings_default_slot_id_fkey";
            columns: ["default_slot_id"];
            isOneToOne: false;
            referencedRelation: "time_slots";
            referencedColumns: ["id"];
          },
        ];
      };
      time_slots: {
        Row: {
          color: string;
          created_at: string;
          end_time: string;
          id: string;
          is_default: boolean;
          is_overnight: boolean;
          name: string;
          start_time: string;
        };
        Insert: {
          color: string;
          created_at?: string;
          end_time: string;
          id?: string;
          is_default?: boolean;
          is_overnight?: boolean;
          name: string;
          start_time: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          end_time?: string;
          id?: string;
          is_default?: boolean;
          is_overnight?: boolean;
          name?: string;
          start_time?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          permissions: Json;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          permissions?: Json;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          permissions?: Json;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_any_admin_role: { Args: { _user_id: string }; Returns: boolean };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_authenticated: { Args: never; Returns: boolean };
    };
    Enums: {
      app_role: "SuperAdmin" | "Admin" | "Staff";
      booking_status: "Confirmed" | "Pending" | "Cancelled";
      id_proof_type: "Aadhaar" | "PAN" | "Passport" | "DL" | "VoterID";
      payment_mode: "UPI" | "Cash" | "Cheque" | "BankTransfer" | "Other";
      user_status: "Active" | "Inactive" | "Suspended";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["SuperAdmin", "Admin", "Staff"],
      booking_status: ["Confirmed", "Pending", "Cancelled"],
      id_proof_type: ["Aadhaar", "PAN", "Passport", "DL", "VoterID"],
      payment_mode: ["UPI", "Cash", "Cheque", "BankTransfer", "Other"],
      user_status: ["Active", "Inactive", "Suspended"],
    },
  },
} as const;
