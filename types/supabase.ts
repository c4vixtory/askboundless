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
          id: number
          title: string
          details: string
          created_at: string
          user_id: string
        }
        Insert: {
          id?: number
          title: string
          details: string
          created_at?: string
          user_id: string
        }
        Update: {
          id?: number
          title?: string
          details?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      // Add more tables here as needed
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}