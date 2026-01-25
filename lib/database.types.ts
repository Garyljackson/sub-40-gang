export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          achieved_at: string;
          created_at: string;
          distance: number;
          id: string;
          member_id: string;
          milestone: Database['public']['Enums']['milestone_type'];
          season: number;
          strava_activity_id: string;
          time_seconds: number;
        };
        Insert: {
          achieved_at: string;
          created_at?: string;
          distance: number;
          id?: string;
          member_id: string;
          milestone: Database['public']['Enums']['milestone_type'];
          season: number;
          strava_activity_id: string;
          time_seconds: number;
        };
        Update: {
          achieved_at?: string;
          created_at?: string;
          distance?: number;
          id?: string;
          member_id?: string;
          milestone?: Database['public']['Enums']['milestone_type'];
          season?: number;
          strava_activity_id?: string;
          time_seconds?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'achievements_member_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
      members: {
        Row: {
          created_at: string;
          id: string;
          joined_at: string;
          name: string;
          profile_photo_url: string | null;
          strava_access_token: string;
          strava_athlete_id: string;
          strava_refresh_token: string;
          token_expires_at: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          joined_at?: string;
          name: string;
          profile_photo_url?: string | null;
          strava_access_token: string;
          strava_athlete_id: string;
          strava_refresh_token: string;
          token_expires_at: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          joined_at?: string;
          name?: string;
          profile_photo_url?: string | null;
          strava_access_token?: string;
          strava_athlete_id?: string;
          strava_refresh_token?: string;
          token_expires_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      processed_activities: {
        Row: {
          activity_date: string;
          activity_name: string;
          distance_meters: number;
          id: string;
          member_id: string;
          milestones_unlocked: string[] | null;
          moving_time_seconds: number;
          pace_seconds_per_km: number;
          processed_at: string;
          strava_activity_id: string;
        };
        Insert: {
          activity_date: string;
          activity_name: string;
          distance_meters: number;
          id?: string;
          member_id: string;
          milestones_unlocked?: string[] | null;
          moving_time_seconds: number;
          pace_seconds_per_km: number;
          processed_at?: string;
          strava_activity_id: string;
        };
        Update: {
          activity_date?: string;
          activity_name?: string;
          distance_meters?: number;
          id?: string;
          member_id?: string;
          milestones_unlocked?: string[] | null;
          moving_time_seconds?: number;
          pace_seconds_per_km?: number;
          processed_at?: string;
          strava_activity_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'processed_activities_member_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
      reactions: {
        Row: {
          achievement_id: string;
          created_at: string;
          emoji: string;
          id: string;
          member_id: string;
        };
        Insert: {
          achievement_id: string;
          created_at?: string;
          emoji: string;
          id?: string;
          member_id: string;
        };
        Update: {
          achievement_id?: string;
          created_at?: string;
          emoji?: string;
          id?: string;
          member_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reactions_achievement_id_fkey';
            columns: ['achievement_id'];
            isOneToOne: false;
            referencedRelation: 'achievements';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reactions_member_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
      webhook_queue: {
        Row: {
          attempts: number;
          created_at: string;
          error_message: string | null;
          event_type: string;
          id: string;
          max_attempts: number;
          processed_at: string | null;
          status: Database['public']['Enums']['queue_status'];
          strava_activity_id: string;
          strava_athlete_id: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          error_message?: string | null;
          event_type: string;
          id?: string;
          max_attempts?: number;
          processed_at?: string | null;
          status?: Database['public']['Enums']['queue_status'];
          strava_activity_id: string;
          strava_athlete_id: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          error_message?: string | null;
          event_type?: string;
          id?: string;
          max_attempts?: number;
          processed_at?: string | null;
          status?: Database['public']['Enums']['queue_status'];
          strava_activity_id?: string;
          strava_athlete_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      milestone_type: '1km' | '2km' | '5km' | '7.5km' | '10km';
      queue_status: 'pending' | 'processing' | 'completed' | 'failed';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      milestone_type: ['1km', '2km', '5km', '7.5km', '10km'],
      queue_status: ['pending', 'processing', 'completed', 'failed'],
    },
  },
} as const;
