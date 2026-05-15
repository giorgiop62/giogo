export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      events: {
        Row: {
          age_max: number | null;
          age_min: number | null;
          created_at: string;
          event_kind: string;
          gender_filter: string[];
          host_id: string | null;
          host_name: string;
          id: string;
          invited_profile_ids: string[];
          invited_names: string[];
          latitude: number | null;
          longitude: number | null;
          max_players: number;
          min_players: number;
          mode: string;
          participant_count: number;
          play_mode: string;
          radius_km: number | null;
          room_id: string | null;
          scheduled_at: string | null;
          status: string;
          theme: string;
        };
        Insert: {
          age_max?: number | null;
          age_min?: number | null;
          created_at?: string;
          event_kind?: string;
          gender_filter?: string[];
          host_id?: string | null;
          host_name: string;
          id?: string;
          invited_profile_ids?: string[];
          invited_names?: string[];
          latitude?: number | null;
          longitude?: number | null;
          max_players?: number;
          min_players?: number;
          mode: string;
          participant_count?: number;
          play_mode?: string;
          radius_km?: number | null;
          room_id?: string | null;
          scheduled_at?: string | null;
          status?: string;
          theme: string;
        };
        Update: {
          age_max?: number | null;
          age_min?: number | null;
          created_at?: string;
          event_kind?: string;
          gender_filter?: string[];
          host_id?: string | null;
          host_name?: string;
          id?: string;
          invited_profile_ids?: string[];
          invited_names?: string[];
          latitude?: number | null;
          longitude?: number | null;
          max_players?: number;
          min_players?: number;
          mode?: string;
          participant_count?: number;
          play_mode?: string;
          radius_km?: number | null;
          room_id?: string | null;
          scheduled_at?: string | null;
          status?: string;
          theme?: string;
        };
        Relationships: [];
      };
      game_rooms: {
        Row: {
          created_at: string;
          created_by: string | null;
          ends_at: string | null;
          finish_reason: string | null;
          finished_at: string | null;
          id: string;
          language: string | null;
          latitude: number | null;
          longitude: number | null;
          max_participants: number;
          min_participants: number;
          mode: string;
          radius_km: number | null;
          room_type: string;
          started_at: string | null;
          status: string;
          theme: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ends_at?: string | null;
          finish_reason?: string | null;
          finished_at?: string | null;
          id?: string;
          language?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          max_participants?: number;
          min_participants?: number;
          mode: string;
          radius_km?: number | null;
          room_type: string;
          started_at?: string | null;
          status?: string;
          theme?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ends_at?: string | null;
          finish_reason?: string | null;
          finished_at?: string | null;
          id?: string;
          language?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          max_participants?: number;
          min_participants?: number;
          mode?: string;
          radius_km?: number | null;
          room_type?: string;
          started_at?: string | null;
          status?: string;
          theme?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "game_rooms_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      matchmaking_queue: {
        Row: {
          created_at: string;
          id: string;
          language: string | null;
          latitude: number | null;
          longitude: number | null;
          matched_at: string | null;
          mode: string;
          radius_km: number | null;
          room_id: string | null;
          room_type: string;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          language?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          matched_at?: string | null;
          mode: string;
          radius_km?: number | null;
          room_id?: string | null;
          room_type: string;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          language?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          matched_at?: string | null;
          mode?: string;
          radius_km?: number | null;
          room_id?: string | null;
          room_type?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matchmaking_queue_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "game_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matchmaking_queue_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          room_id: string;
          sender_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          room_id: string;
          sender_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          room_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "game_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      match_requests: {
        Row: {
          created_at: string;
          requested_id: string;
          requester_id: string;
          source: string;
        };
        Insert: {
          created_at?: string;
          requested_id: string;
          requester_id: string;
          source?: string;
        };
        Update: {
          created_at?: string;
          requested_id?: string;
          requester_id?: string;
          source?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          created_at: string;
          id: string;
          user_a: string;
          user_b: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          user_a: string;
          user_b: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          user_a?: string;
          user_b?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          match_id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          match_id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          match_id?: string;
          sender_id?: string;
        };
        Relationships: [];
      };
      room_messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          room_id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          room_id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          room_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "game_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      room_participants: {
        Row: {
          id: string;
          joined_at: string;
          left_at: string | null;
          room_id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          room_id: string;
          status?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          room_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "game_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_sessions: {
        Row: {
          caller_id: string;
          created_at: string;
          ended_at: string | null;
          id: string;
          match_id: string | null;
          receiver_id: string;
          started_at: string | null;
          status: string;
        };
        Insert: {
          caller_id: string;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          match_id?: string | null;
          receiver_id: string;
          started_at?: string | null;
          status?: string;
        };
        Update: {
          caller_id?: string;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          match_id?: string | null;
          receiver_id?: string;
          started_at?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      event_participants: {
        Row: {
          created_at: string;
          event_id: string;
          profile_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          profile_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          profile_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_participants_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          age: number | null;
          avatar_color: string;
          bio: string | null;
          city: string | null;
          display_name: string;
          gender: string | null;
          hobbies: string[];
          id: string;
          interests: string[];
          latitude: number | null;
          looking_for: string | null;
          longitude: number | null;
          matching_preferences: Json;
          nationality: string | null;
          preferred_language: string | null;
          preferred_mode: string | null;
          prompt_agree: string | null;
          prompt_green_flag: string | null;
          prompt_love: string | null;
          prompt_spontaneous: string | null;
          profile_photo_url: string | null;
          search_radius_km: number;
          spoken_languages: string[];
          updated_at: string;
        };
        Insert: {
          age?: number | null;
          avatar_color?: string;
          bio?: string | null;
          city?: string | null;
          display_name?: string;
          gender?: string | null;
          hobbies?: string[];
          id: string;
          interests?: string[];
          latitude?: number | null;
          looking_for?: string | null;
          longitude?: number | null;
          matching_preferences?: Json;
          nationality?: string | null;
          preferred_language?: string | null;
          preferred_mode?: string | null;
          prompt_agree?: string | null;
          prompt_green_flag?: string | null;
          prompt_love?: string | null;
          prompt_spontaneous?: string | null;
          profile_photo_url?: string | null;
          search_radius_km?: number;
          spoken_languages?: string[];
          updated_at?: string;
        };
        Update: {
          age?: number | null;
          avatar_color?: string;
          bio?: string | null;
          city?: string | null;
          display_name?: string;
          gender?: string | null;
          hobbies?: string[];
          id?: string;
          interests?: string[];
          latitude?: number | null;
          looking_for?: string | null;
          longitude?: number | null;
          matching_preferences?: Json;
          nationality?: string | null;
          preferred_language?: string | null;
          preferred_mode?: string | null;
          prompt_agree?: string | null;
          prompt_green_flag?: string | null;
          prompt_love?: string | null;
          prompt_spontaneous?: string | null;
          profile_photo_url?: string | null;
          search_radius_km?: number;
          spoken_languages?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cancel_matchmaking: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      finish_expired_room: {
        Args: {
          p_room_id: string;
        };
        Returns: undefined;
      };
      finish_round_without_disconnect: {
        Args: {
          p_room_id: string;
        };
        Returns: undefined;
      };
      server_now: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      join_matchmaking: {
        Args: {
          p_language?: string | null;
          p_latitude?: number | null;
          p_longitude?: number | null;
          p_mode: string;
          p_radius_km?: number | null;
          p_room_type: string;
          p_theme?: string | null;
        };
        Returns: {
          matched: boolean;
          participant_count: number;
          queue_id: string;
          room_id: string | null;
          room_status: string | null;
        }[];
      };
      leave_matchmaking: {
        Args: {
          p_room_id: string;
        };
        Returns: undefined;
      };
      maybe_start_event_room: {
        Args: {
          p_event_id: string;
        };
        Returns: {
          room_id: string | null;
          started: boolean;
          waiting_reason: string | null;
        }[];
      };
      nearby_profiles: {
        Args: {
          origin_lat: number;
          origin_lng: number;
          radius_km?: number;
        };
        Returns: {
          age: number | null;
          avatar_color: string;
          city: string | null;
          display_name: string;
          distance_km: number;
          gender: string | null;
          id: string;
          latitude: number | null;
          longitude: number | null;
          profile_photo_url: string | null;
        }[];
      };
      room_participant_count: {
        Args: {
          target_room_id: string;
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
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
    Enums: {},
  },
} as const;
