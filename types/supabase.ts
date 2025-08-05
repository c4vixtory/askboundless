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
      questions: {
        Row: {
          created_at: string
          details: string | null
          id: number
          title: string | null
          upvotes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: number
          title?: string | null
          upvotes?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: number
          title?: string | null
          upvotes?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          username: string | null
        }
        Insert: {
          id?: string
          username?: string | null
        }
        Update: {
          id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
