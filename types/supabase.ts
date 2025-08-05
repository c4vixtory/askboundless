export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      comments: {
        Row: {
          content: string;
          created_at: string;
          id: string; // UUID
          is_admin_comment: boolean;
          question_id: number;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string; // UUID
          is_admin_comment?: boolean;
          question_id: number;
          user_id?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string; // UUID
          is_admin_comment?: boolean;
          question_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_question_id_fkey";
            columns: ["question_id"];
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          created_at: string;
          details: string | null;
          id: number;
          title: string | null;
          upvotes: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: number;
          title?: string | null;
          upvotes?: number;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: number;
          title?: string | null;
          upvotes?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
        };
        Insert: {
          id?: string;
          username?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_upvotes: {
        Row: {
          user_id: string;
          question_id: number;
          created_at: string;
        };
        Insert: {
          user_id?: string;
          question_id: number;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          question_id?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_upvotes_question_id_fkey";
            columns: ["question_id"];
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_upvotes_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}

export type Tables<
  T extends keyof Database['public']['Tables']
> = Database['public']['Tables'][T]['Row']
export type Enums<
  T extends keyof Database['public']['Enums']
> = Database['public']['Enums'][T]
