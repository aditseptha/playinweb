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
      award_grants: {
        Row: {
          award_slug: string
          awarded_at: string
          awarded_by: string | null
          citation: string
          id: string
          project_id: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          seen_at: string | null
        }
        Insert: {
          award_slug: string
          awarded_at?: string
          awarded_by?: string | null
          citation: string
          id?: string
          project_id: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          seen_at?: string | null
        }
        Update: {
          award_slug?: string
          awarded_at?: string
          awarded_by?: string | null
          citation?: string
          id?: string
          project_id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "award_grants_award_slug_fkey"
            columns: ["award_slug"]
            isOneToOne: false
            referencedRelation: "award_types"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "award_grants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_grants_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      award_types: {
        Row: {
          active: boolean
          created_at: string
          description: string
          how_chosen: string
          medal: Json
          name: string
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          how_chosen: string
          medal?: Json
          name: string
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          how_chosen?: string
          medal?: Json
          name?: string
          slug?: string
        }
        Relationships: []
      }
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
      profile_badges: {
        Row: {
          badge: string
          earned_at: string
          level: number
          leveled_at: string
          profile_id: string
          revoked_at: string | null
          seen_level: number
        }
        Insert: {
          badge: string
          earned_at?: string
          level: number
          leveled_at?: string
          profile_id: string
          revoked_at?: string | null
          seen_level?: number
        }
        Update: {
          badge?: string
          earned_at?: string
          level?: number
          leveled_at?: string
          profile_id?: string
          revoked_at?: string | null
          seen_level?: number
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
      profile_plays: {
        Row: {
          first_played_at: string
          last_played_at: string
          profile_id: string
          project_id: string
        }
        Insert: {
          first_played_at?: string
          last_played_at?: string
          profile_id: string
          project_id: string
        }
        Update: {
          first_played_at?: string
          last_played_at?: string
          profile_id?: string
          project_id?: string
        }
        Relationships: []
      }
      project_claims: {
        Row: {
          claimant_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          email: string
          evidence: string
          id: string
          project_id: string
          status: string
        }
        Insert: {
          claimant_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          email?: string
          evidence: string
          id?: string
          project_id: string
          status?: string
        }
        Update: {
          claimant_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          email?: string
          evidence?: string
          id?: string
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_claims_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_claims_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      project_curation: {
        Row: {
          claimed_at: string | null
          creator_name: string
          creator_url: string | null
          frame_height: number | null
          frame_width: number | null
          license: string
          license_url: string | null
          listed_at: string
          listed_by: string | null
          modified: boolean
          play_mode: string
          project_id: string
          source_code_url: string | null
          source_url: string | null
          status: string
        }
        Insert: {
          claimed_at?: string | null
          creator_name: string
          creator_url?: string | null
          frame_height?: number | null
          frame_width?: number | null
          license: string
          license_url?: string | null
          listed_at?: string
          listed_by?: string | null
          modified?: boolean
          play_mode?: string
          project_id: string
          source_code_url?: string | null
          source_url?: string | null
          status?: string
        }
        Update: {
          claimed_at?: string | null
          creator_name?: string
          creator_url?: string | null
          frame_height?: number | null
          frame_width?: number | null
          license?: string
          license_url?: string | null
          listed_at?: string
          listed_by?: string | null
          modified?: boolean
          play_mode?: string
          project_id?: string
          source_code_url?: string | null
          source_url?: string | null
          status?: string
        }
        Relationships: []
      }
      project_screenshots: {
        Row: {
          height: number | null
          id: string
          kind: string
          project_id: string
          sort_order: number
          storage_path: string
          width: number | null
        }
        Insert: {
          height?: number | null
          id?: string
          kind?: string
          project_id: string
          sort_order?: number
          storage_path: string
          width?: number | null
        }
        Update: Partial<Database["public"]["Tables"]["project_screenshots"]["Insert"]>
        Relationships: []
      }
      project_slug_redirects: {
        Row: { created_at: string; owner_id: string; project_id: string; slug: string }
        Insert: { created_at?: string; owner_id: string; project_id: string; slug: string }
        Update: { created_at?: string; owner_id?: string; project_id?: string; slug?: string }
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
      library_items: {
        Row: { user_id: string; project_id: string; created_at: string }
        Insert: { user_id: string; project_id: string; created_at?: string }
        Update: { user_id?: string; project_id?: string; created_at?: string }
        Relationships: []
      }
      projects: {
        Row: {
          classification: string
          community: string
          controls: string[]
          contains_ai: boolean | null
          cover_focal_x: number
          cover_focal_y: number
          cover_original_path: string | null
          cover_path: string | null
          cover_portrait_path: string | null
          created_at: string
          custom_noun: string
          description: string
          embeddable: boolean
          genre: string | null
          html_build_name: string | null
          id: string
          kind: string
          like_count: number
          min_price: number | null
          mobile_ready: boolean
          orientation: string | null
          owner_id: string
          play_count: number
          play_url: string
          preview_clip_path: string | null
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
          controls?: string[]
          contains_ai?: boolean | null
          cover_focal_x?: number
          cover_focal_y?: number
          cover_original_path?: string | null
          cover_path?: string | null
          cover_portrait_path?: string | null
          created_at?: string
          custom_noun?: string
          description?: string
          embeddable?: boolean
          genre?: string | null
          html_build_name?: string | null
          id?: string
          kind?: string
          like_count?: number
          min_price?: number | null
          mobile_ready?: boolean
          orientation?: string | null
          owner_id: string
          play_count?: number
          play_url?: string
          preview_clip_path?: string | null
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
      showcase_bids: {
        Row: {
          amount: number
          bidder_email: string | null
          bidder_handle: string | null
          created_at: string
          game_slug: string | null
          game_title: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          amount: number
          bidder_email?: string | null
          bidder_handle?: string | null
          created_at?: string
          game_slug?: string | null
          game_title?: string | null
          id: string
          project_id: string
          user_id: string
        }
        Update: Partial<Database["public"]["Tables"]["showcase_bids"]["Insert"]>
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
      home_hero_spotlights: {
        Row: {
          project_id: string
          sort_order: number
        }
        Insert: {
          project_id: string
          sort_order?: number
        }
        Update: {
          project_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      home_featured_games: {
        Row: {
          project_id: string
          sort_order: number
        }
        Insert: {
          project_id: string
          sort_order?: number
        }
        Update: {
          project_id?: string
          sort_order?: number
        }
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
      admin_list_wallets: {
        Args: Record<string, never>
        Returns: {
          commission_total: number
          display_name: string | null
          donation_count: number
          earned_total: number
          email: string | null
          gross_total: number
          handle: string | null
          outstanding: number
          paid_out: number
          user_id: string
          wallet_address: string | null
        }[]
      }
      admin_set_feature: {
        Args: { fid: string; hide: boolean; is_soon: boolean }
        Returns: undefined
      }
      admin_set_home_hero_spotlights: {
        Args: { p_project_ids: string[] }
        Returns: undefined
      }
      admin_set_home_featured_games: {
        Args: { p_project_ids: string[] }
        Returns: undefined
      }
      admin_upsert_site_settings: {
        Args: { settings: Json }
        Returns: undefined
      }
      admin_record_payout: {
        Args: {
          p_amount: number
          p_creator_email: string
          p_creator_handle: string
          p_status: string
          p_user_id: string
        }
        Returns: string
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
      admin_trends_7d: {
        Args: Record<string, never>
        Returns: {
          day: string
          new_users: number
          new_games: number
          total_users: number
          total_games: number
          plays: number
          views: number
        }[]
      }
      bump_play_count: { Args: { pid: string }; Returns: undefined }
      bump_view_count: { Args: { pid: string }; Returns: undefined }
      can_manage_curated: { Args: { owner: string }; Returns: boolean }
      curated_owner_id: { Args: Record<string, never>; Returns: string }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      mark_badges_seen: { Args: { p_badges: string[] }; Returns: undefined }
      my_badges: {
        Args: Record<string, never>
        Returns: {
          badge: string
          level: number
          leveled_at: string
          seen_level: number
        }[]
      }
      profile_badge_board: {
        Args: { p_profile: string }
        Returns: {
          badge: string
          earned_at: string | null
          level: number
          progress: number | null
        }[]
      }
      record_play: { Args: { pid: string }; Returns: undefined }
      submit_claim: { Args: { pid: string; p_evidence: string }; Returns: string }
      admin_grant_award: { Args: { p_project: string; p_award: string; p_citation: string }; Returns: string }
      admin_revoke_award: { Args: { p_grant: string; p_reason: string }; Returns: undefined }
      my_awards: {
        Args: Record<string, never>
        Returns: {
          id: string
          award_slug: string
          award_name: string
          project_id: string
          title: string
          slug: string
          owner_handle: string
          citation: string
          awarded_at: string
        }[]
      }
      mark_awards_seen: { Args: { p_grants: string[] }; Returns: undefined }
      admin_decide_claim: {
        Args: { p_claim: string; p_approve: boolean; p_note?: string | null }
        Returns: { owner_handle: string; slug: string }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
