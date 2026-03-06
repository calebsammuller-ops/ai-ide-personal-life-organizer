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
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          wake_time: string
          sleep_time: string
          work_start_time: string
          work_end_time: string
          preferred_meal_times: Json
          notification_preferences: Json
          theme: string
          language: string
          learned_patterns: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wake_time?: string
          sleep_time?: string
          work_start_time?: string
          work_end_time?: string
          preferred_meal_times?: Json
          notification_preferences?: Json
          theme?: string
          language?: string
          learned_patterns?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          wake_time?: string
          sleep_time?: string
          work_start_time?: string
          work_end_time?: string
          preferred_meal_times?: Json
          notification_preferences?: Json
          theme?: string
          language?: string
          learned_patterns?: Json
          created_at?: string
          updated_at?: string
        }
      }
      calendars: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          is_primary: boolean
          is_visible: boolean
          external_source: string | null
          external_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          is_primary?: boolean
          is_visible?: boolean
          external_source?: string | null
          external_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          is_primary?: boolean
          is_visible?: boolean
          external_source?: string | null
          external_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      calendar_events: {
        Row: {
          id: string
          calendar_id: string
          user_id: string
          title: string
          description: string | null
          location: string | null
          start_time: string
          end_time: string
          all_day: boolean
          recurrence_rule: string | null
          recurrence_id: string | null
          status: string
          priority: number
          category: string | null
          reminders: Json
          is_auto_scheduled: boolean
          external_id: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          calendar_id: string
          user_id: string
          title: string
          description?: string | null
          location?: string | null
          start_time: string
          end_time: string
          all_day?: boolean
          recurrence_rule?: string | null
          recurrence_id?: string | null
          status?: string
          priority?: number
          category?: string | null
          reminders?: Json
          is_auto_scheduled?: boolean
          external_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          calendar_id?: string
          user_id?: string
          title?: string
          description?: string | null
          location?: string | null
          start_time?: string
          end_time?: string
          all_day?: boolean
          recurrence_rule?: string | null
          recurrence_id?: string | null
          status?: string
          priority?: number
          category?: string | null
          reminders?: Json
          is_auto_scheduled?: boolean
          external_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      habits: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          icon: string
          color: string
          frequency: string
          frequency_config: Json
          target_count: number
          reminder_time: string | null
          reminder_enabled: boolean
          start_date: string
          end_date: string | null
          is_active: boolean
          category: string | null
          plan: Json | null
          duration_minutes: number | null
          energy_level: string | null
          auto_schedule: boolean
          preferred_time_of_day: string | null
          scheduling_priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          icon?: string
          color?: string
          frequency: string
          frequency_config?: Json
          target_count?: number
          reminder_time?: string | null
          reminder_enabled?: boolean
          start_date: string
          end_date?: string | null
          is_active?: boolean
          category?: string | null
          plan?: Json | null
          duration_minutes?: number | null
          energy_level?: string | null
          auto_schedule?: boolean
          preferred_time_of_day?: string | null
          scheduling_priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          icon?: string
          color?: string
          frequency?: string
          frequency_config?: Json
          target_count?: number
          reminder_time?: string | null
          reminder_enabled?: boolean
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          category?: string | null
          plan?: Json | null
          duration_minutes?: number | null
          energy_level?: string | null
          auto_schedule?: boolean
          preferred_time_of_day?: string | null
          scheduling_priority?: number
          created_at?: string
          updated_at?: string
        }
      }
      habit_completions: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          completed_date: string
          completed_count: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          habit_id: string
          user_id: string
          completed_date: string
          completed_count?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          habit_id?: string
          user_id?: string
          completed_date?: string
          completed_count?: number
          notes?: string | null
          created_at?: string
        }
      }
      meal_plans: {
        Row: {
          id: string
          user_id: string
          date: string
          meal_type: string
          name: string
          description: string | null
          recipe_url: string | null
          calories: number | null
          prep_time_minutes: number | null
          cook_time_minutes: number | null
          servings: number
          ingredients: Json
          instructions: Json
          nutritional_info: Json
          image_url: string | null
          tags: Json
          is_favorite: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          meal_type: string
          name: string
          description?: string | null
          recipe_url?: string | null
          calories?: number | null
          prep_time_minutes?: number | null
          cook_time_minutes?: number | null
          servings?: number
          ingredients?: Json
          instructions?: Json
          nutritional_info?: Json
          image_url?: string | null
          tags?: Json
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          meal_type?: string
          name?: string
          description?: string | null
          recipe_url?: string | null
          calories?: number | null
          prep_time_minutes?: number | null
          cook_time_minutes?: number | null
          servings?: number
          ingredients?: Json
          instructions?: Json
          nutritional_info?: Json
          image_url?: string | null
          tags?: Json
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      thoughts: {
        Row: {
          id: string
          user_id: string
          raw_content: string
          processed_content: string | null
          extracted_tasks: Json
          extracted_events: Json
          priority: number
          category: string | null
          tags: Json
          sentiment: string | null
          is_processed: boolean
          is_archived: boolean
          linked_calendar_event_id: string | null
          linked_habit_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          raw_content: string
          processed_content?: string | null
          extracted_tasks?: Json
          extracted_events?: Json
          priority?: number
          category?: string | null
          tags?: Json
          sentiment?: string | null
          is_processed?: boolean
          is_archived?: boolean
          linked_calendar_event_id?: string | null
          linked_habit_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          raw_content?: string
          processed_content?: string | null
          extracted_tasks?: Json
          extracted_events?: Json
          priority?: number
          category?: string | null
          tags?: Json
          sentiment?: string | null
          is_processed?: boolean
          is_archived?: boolean
          linked_calendar_event_id?: string | null
          linked_habit_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      assistant_messages: {
        Row: {
          id: string
          user_id: string
          conversation_id: string
          role: string
          content: string
          context: Json
          intent: string | null
          entities: Json
          action_taken: Json | null
          feedback: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id: string
          role: string
          content: string
          context?: Json
          intent?: string | null
          entities?: Json
          action_taken?: Json | null
          feedback?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string
          role?: string
          content?: string
          context?: Json
          intent?: string | null
          entities?: Json
          action_taken?: Json | null
          feedback?: string | null
          created_at?: string
        }
      }
      daily_plans: {
        Row: {
          id: string
          user_id: string
          date: string
          plan_data: Json
          generated_at: string
          is_locked: boolean
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          plan_data: Json
          generated_at?: string
          is_locked?: boolean
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          plan_data?: Json
          generated_at?: string
          is_locked?: boolean
          notes?: string | null
        }
      }
      food_scans: {
        Row: {
          id: string
          user_id: string
          items: Json
          total_calories: number
          total_protein: number
          total_carbs: number
          total_fat: number
          total_fiber: number
          meal_name: string | null
          health_score: number
          dietary_notes: Json
          recipe_suggestions: Json
          matched_dietary_goals: Json
          missing_nutrients: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          items?: Json
          total_calories?: number
          total_protein?: number
          total_carbs?: number
          total_fat?: number
          total_fiber?: number
          meal_name?: string | null
          health_score?: number
          dietary_notes?: Json
          recipe_suggestions?: Json
          matched_dietary_goals?: Json
          missing_nutrients?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          items?: Json
          total_calories?: number
          total_protein?: number
          total_carbs?: number
          total_fat?: number
          total_fiber?: number
          meal_name?: string | null
          health_score?: number
          dietary_notes?: Json
          recipe_suggestions?: Json
          matched_dietary_goals?: Json
          missing_nutrients?: Json
          created_at?: string
        }
      }
      analytics_snapshots: {
        Row: {
          id: string
          user_id: string
          snapshot_date: string
          patterns: Json
          habit_completion_rate: number | null
          total_events: number | null
          total_meals: number | null
          total_thoughts: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          snapshot_date: string
          patterns: Json
          habit_completion_rate?: number | null
          total_events?: number | null
          total_meals?: number | null
          total_thoughts?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          snapshot_date?: string
          patterns?: Json
          habit_completion_rate?: number | null
          total_events?: number | null
          total_meals?: number | null
          total_thoughts?: number | null
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          deadline: string | null
          duration_minutes: number
          scheduled_start: string | null
          scheduled_end: string | null
          priority: number
          energy_level: string | null
          category: string | null
          tags: Json
          status: string
          is_auto_scheduled: boolean
          linked_calendar_event_id: string | null
          reschedule_count: number
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          deadline?: string | null
          duration_minutes?: number
          scheduled_start?: string | null
          scheduled_end?: string | null
          priority?: number
          energy_level?: string | null
          category?: string | null
          tags?: Json
          status?: string
          is_auto_scheduled?: boolean
          linked_calendar_event_id?: string | null
          reschedule_count?: number
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          deadline?: string | null
          duration_minutes?: number
          scheduled_start?: string | null
          scheduled_end?: string | null
          priority?: number
          energy_level?: string | null
          category?: string | null
          tags?: Json
          status?: string
          is_auto_scheduled?: boolean
          linked_calendar_event_id?: string | null
          reschedule_count?: number
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      focus_blocks: {
        Row: {
          id: string
          user_id: string
          title: string
          start_time: string
          end_time: string
          days_of_week: number[]
          is_protected: boolean
          allow_high_priority_override: boolean
          buffer_minutes: number
          is_active: boolean
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          start_time: string
          end_time: string
          days_of_week?: number[]
          is_protected?: boolean
          allow_high_priority_override?: boolean
          buffer_minutes?: number
          is_active?: boolean
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          start_time?: string
          end_time?: string
          days_of_week?: number[]
          is_protected?: boolean
          allow_high_priority_override?: boolean
          buffer_minutes?: number
          is_active?: boolean
          color?: string
          created_at?: string
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
  }
}
