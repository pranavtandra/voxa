export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      voxa_user_data: {
        Row: { user_id: string; key: string; value: Json; updated_at: string };
        Insert: { user_id: string; key: string; value: Json; updated_at?: string };
        Update: { user_id?: string; key?: string; value?: Json; updated_at?: string };
        Relationships: [];
      };
      voxa_history_entries: {
        Row: { id: string; user_id: string; spoken_text: string; category: string; display_time: string; activity_date: string; occurred_at: string; created_at: string };
        Insert: { id: string; user_id: string; spoken_text: string; category?: string; display_time: string; activity_date: string; occurred_at: string; created_at?: string };
        Update: { spoken_text?: string; category?: string; display_time?: string; activity_date?: string; occurred_at?: string };
        Relationships: [];
      };
      voxa_custom_buttons: {
        Row: { id: string; user_id: string; label: string; emoji: string; category: string; phrase: string | null; image_path: string | null; color: string | null; action: Json | null; position: number; created_at: string; updated_at: string };
        Insert: { id: string; user_id: string; label: string; emoji?: string; category: string; phrase?: string | null; image_path?: string | null; color?: string | null; action?: Json | null; position: number; created_at?: string; updated_at?: string };
        Update: { label?: string; emoji?: string; category?: string; phrase?: string | null; image_path?: string | null; color?: string | null; action?: Json | null; position?: number; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_generation_quota: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
