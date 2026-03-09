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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      email_subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
          monthly_reports: boolean
          updated_at: string
          weekly_reports: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          monthly_reports?: boolean
          updated_at?: string
          weekly_reports?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          monthly_reports?: boolean
          updated_at?: string
          weekly_reports?: boolean
        }
        Relationships: []
      }
      food_entries: {
        Row: {
          ai_analysis: string | null
          calories: number
          carbs: number | null
          created_at: string
          device_id: string | null
          fats: number | null
          food_name: string
          id: string
          meal_type: string | null
          notes: string | null
          photo_url: string
          portion_size: string | null
          protein: number | null
        }
        Insert: {
          ai_analysis?: string | null
          calories: number
          carbs?: number | null
          created_at?: string
          device_id?: string | null
          fats?: number | null
          food_name: string
          id?: string
          meal_type?: string | null
          notes?: string | null
          photo_url: string
          portion_size?: string | null
          protein?: number | null
        }
        Update: {
          ai_analysis?: string | null
          calories?: number
          carbs?: number | null
          created_at?: string
          device_id?: string | null
          fats?: number | null
          food_name?: string
          id?: string
          meal_type?: string | null
          notes?: string | null
          photo_url?: string
          portion_size?: string | null
          protein?: number | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          bedtime: string
          bedtime_sound: string
          breakfast_sound: string
          breakfast_time: string
          created_at: string
          dinner_sound: string
          dinner_time: string
          exercise_sound: string
          id: string
          lunch_sound: string
          lunch_time: string
          movement_enabled: boolean
          movement_interval: number
          movement_sound: string
          notifications_enabled: boolean
          subscription_id: string | null
          timezone_offset: number
          updated_at: string
          wakeup_sound: string
          wakeup_time: string
        }
        Insert: {
          bedtime?: string
          bedtime_sound?: string
          breakfast_sound?: string
          breakfast_time?: string
          created_at?: string
          dinner_sound?: string
          dinner_time?: string
          exercise_sound?: string
          id?: string
          lunch_sound?: string
          lunch_time?: string
          movement_enabled?: boolean
          movement_interval?: number
          movement_sound?: string
          notifications_enabled?: boolean
          subscription_id?: string | null
          timezone_offset?: number
          updated_at?: string
          wakeup_sound?: string
          wakeup_time?: string
        }
        Update: {
          bedtime?: string
          bedtime_sound?: string
          breakfast_sound?: string
          breakfast_time?: string
          created_at?: string
          dinner_sound?: string
          dinner_time?: string
          exercise_sound?: string
          id?: string
          lunch_sound?: string
          lunch_time?: string
          movement_enabled?: boolean
          movement_interval?: number
          movement_sound?: string
          notifications_enabled?: boolean
          subscription_id?: string | null
          timezone_offset?: number
          updated_at?: string
          wakeup_sound?: string
          wakeup_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: true
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
