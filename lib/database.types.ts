export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_path: string | null
          banner_path: string | null
          banner_position: string
          bio: string
          created_at: string
          display_name: string
          follower_count: number
          handle: string
          id: string
          wallet_address: string | null
        }
        Insert: {
          avatar_path?: string | null
          banner_path?: string | null
          banner_position?: string
          bio?: string
          created_at?: string
          display_name: string
          follower_count?: number
          handle: string
          id: string
          wallet_address?: string | null
        }
        Update: {
          avatar_path?: string | null
          banner_path?: string | null
          banner_position?: string
          bio?: string
          created_at?: string
          display_name?: string
          follower_count?: number
          handle?: string
          id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      profile_follows: {
        Row: {
          created_at: string
          creator_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          follower_id?: string
        }
        Relationships: []
      }
      project_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          like_count: number
          parent_id: string | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          like_count?: number
          updated_at?: string | null
          parent_id?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "project_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string
          external_url: string | null
          file_name: string
          id: string
          project_id: string
          size_bytes: number | null
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          external_url?: string | null
          file_name: string
          id?: string
          project_id: string
          size_bytes?: number | null
          storage_path?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["project_files"]["Insert"]>
        Relationships: []
      }
      project_likes: {
        Row: {
          created_at: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      project_screenshots: {
        Row: {
          id: string
          project_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          id?: string
          project_id: string
          sort_order?: number
          storage_path: string
        }
        Update: Partial<Database["public"]["Tables"]["project_screenshots"]["Insert"]>
        Relationships: []
      }
      project_stat_days: {
        Row: { day: string; plays: number; project_id: string; views: number }
        Insert: { day: string; plays?: number; project_id: string; views?: number }
        Update: { day?: string; plays?: number; project_id?: string; views?: number }
        Relationships: []
      }
      project_store_links: {
        Row: { project_id: string; store: string; url: string }
        Insert: { project_id: string; store: string; url: string }
        Update: { project_id?: string; store?: string; url?: string }
        Relationships: []
      }
      project_tags: {
        Row: { project_id: string; tag: string }
        Insert: { project_id: string; tag: string }
        Update: { project_id?: string; tag?: string }
        Relationships: []
      }
      projects: {
        Row: {
          classification: string
          community: string
          contains_ai: boolean | null
          cover_path: string | null
          created_at: string
          custom_noun: string
          description: string
          embeddable: boolean
          genre: string | null
          id: string
          kind: string
          like_count: number
          min_price: number | null
          owner_id: string
          play_count: number
          play_url: string
          view_count: number
          pricing_type: string
          published: boolean
          release_status: string
          slug: string
          suggested_donation: number | null
          tagline: string
          title: string
          trailer_url: string | null
          updated_at: string
        }
        Insert: {
          classification?: string
          community?: string
          contains_ai?: boolean | null
          cover_path?: string | null
          created_at?: string
          custom_noun?: string
          description?: string
          embeddable?: boolean
          genre?: string | null
          id?: string
          kind?: string
          like_count?: number
          min_price?: number | null
          owner_id: string
          play_count?: number
          play_url?: string
          view_count?: number
          pricing_type?: string
          published?: boolean
          release_status?: string
          slug: string
          suggested_donation?: number | null
          tagline?: string
          title: string
          trailer_url?: string | null
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          commission_pct: number
          created_at: string
          creator_handle: string | null
          creator_name: string | null
          donor_email: string | null
          donor_handle: string | null
          game_slug: string | null
          game_title: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          amount: number
          commission_pct?: number
          created_at?: string
          creator_handle?: string | null
          creator_name?: string | null
          donor_email?: string | null
          donor_handle?: string | null
          game_slug?: string | null
          game_title?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: Partial<Database["public"]["Tables"]["donations"]["Insert"]>
        Relationships: []
      }
      tips: {
        Row: {
          amount: number
          created_at: string
          donor_email: string | null
          donor_handle: string | null
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          donor_email?: string | null
          donor_handle?: string | null
          id?: string
          user_id: string
        }
        Update: Partial<Database["public"]["Tables"]["tips"]["Insert"]>
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          creator_email: string | null
          creator_handle: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          creator_email?: string | null
          creator_handle?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: Partial<Database["public"]["Tables"]["payouts"]["Insert"]>
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          value: number
        }
        Insert: {
          id: string
          value: number
        }
        Update: {
          id?: string
          value?: number
        }
        Relationships: []
      }
      issue_reports: {
        Row: {
          created_at: string
          details: string
          email: string
          id: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details: string
          email: string
          id?: string
          subject: string
          user_id: string
        }
        Update: Partial<Database["public"]["Tables"]["issue_reports"]["Insert"]>
        Relationships: []
      }
      site_features: {
        Row: {
          description: string
          hidden: boolean
          href: string
          id: string
          label: string
          soon: boolean
          sort_order: number
        }
        Insert: {
          description?: string
          hidden?: boolean
          href: string
          id: string
          label: string
          soon?: boolean
          sort_order?: number
        }
        Update: Partial<Database["public"]["Tables"]["site_features"]["Insert"]>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: Record<string, never>
        Returns: {
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          handle: string | null
          id: string
          last_sign_in_at: string | null
        }[]
      }
      admin_set_feature: {
        Args: { fid: string; hide: boolean; is_soon: boolean }
        Returns: undefined
      }
      admin_overview: {
        Args: Record<string, never>
        Returns: {
          games: number
          plays: number
          published: number
          users: number
          users_today: number
          users_week: number
          views: number
        }
      }
      bump_play_count: { Args: { pid: string }; Returns: undefined }
      bump_view_count: { Args: { pid: string }; Returns: undefined }
      is_admin: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
