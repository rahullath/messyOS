export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          settings: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      habits: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          category: string
          type: "build" | "break"
          target_value: number | null
          target_unit: string | null
          color: string | null
          streak_count: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          category?: string
          type?: "build" | "break"
          target_value?: number | null
          target_unit?: string | null
          color?: string | null
          streak_count?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          category?: string
          type?: "build" | "break"
          target_value?: number | null
          target_unit?: string | null
          color?: string | null
          streak_count?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      habit_entries: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          value: number | null
          notes: string | null
          logged_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          habit_id: string
          user_id: string
          value?: number | null
          notes?: string | null
          logged_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          habit_id?: string
          user_id?: string
          value?: number | null
          notes?: string | null
          logged_at?: string | null
          created_at?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          category: string
          priority: "low" | "medium" | "high" | "urgent"
          status: "todo" | "in_progress" | "completed" | "cancelled"
          due_date: string | null
          completed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          category?: string
          priority?: "low" | "medium" | "high" | "urgent"
          status?: "todo" | "in_progress" | "completed" | "cancelled"
          due_date?: string | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          category?: string
          priority?: "low" | "medium" | "high" | "urgent"
          status?: "todo" | "in_progress" | "completed" | "cancelled"
          due_date?: string | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      metrics: {
        Row: {
          id: string
          user_id: string
          type: string
          value: number
          unit: string | null
          category: string | null
          metadata: Json | null
          recorded_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          value: number
          unit?: string | null
          category?: string | null
          metadata?: Json | null
          recorded_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          value?: number
          unit?: string | null
          category?: string | null
          metadata?: Json | null
          recorded_at?: string | null
          created_at?: string | null
        }
      }
      content_entries: {
        Row: {
          id: string
          user_id: string
          title: string
          type: string
          status: string
          rating: number | null
          progress: string | null
          genre: string[] | null
          source: string | null
          metadata: Json | null
          started_at: string | null
          completed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          type: string
          status?: string
          rating?: number | null
          progress?: string | null
          genre?: string[] | null
          source?: string | null
          metadata?: Json | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          type?: string
          status?: string
          rating?: number | null
          progress?: string | null
          genre?: string[] | null
          source?: string | null
          metadata?: Json | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"])[TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"])[PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"])[TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"])[PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof (Database["public"]["Enums"])
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicEnumNameOrOptions["schema"]]["Enums"])
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicEnumNameOrOptions["schema"]]["Enums"])[EnumName]
  : PublicEnumNameOrOptions extends keyof (Database["public"]["Enums"])
  ? (Database["public"]["Enums"])[PublicEnumNameOrOptions]
  : never
