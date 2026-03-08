export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          message: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message?: string
          title?: string
        }
        Relationships: []
      }
      arena_battle_queue: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_hours: number
          id: string
          is_used: boolean | null
          priority: number | null
          side_a_color: string | null
          side_a_name: string
          side_b_color: string | null
          side_b_name: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_hours: number
          id?: string
          is_used?: boolean | null
          priority?: number | null
          side_a_color?: string | null
          side_a_name: string
          side_b_color?: string | null
          side_b_name: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_hours?: number
          id?: string
          is_used?: boolean | null
          priority?: number | null
          side_a_color?: string | null
          side_a_name?: string
          side_b_color?: string | null
          side_b_name?: string
          title?: string
        }
        Relationships: []
      }
      arena_battles: {
        Row: {
          ai_confidence: string | null
          ai_last_updated: string | null
          ai_prediction_text: string | null
          ai_side_a_probability: number | null
          ai_side_b_probability: number | null
          bonus_percentage: number | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_hours: number | null
          ends_at: string
          id: string
          is_active: boolean
          last_duration_hours: number | null
          losing_pool_distributed: boolean | null
          outcome_type: string | null
          outcome_verified: boolean | null
          outcome_verified_at: string | null
          outcome_verified_by: string | null
          prize_pool: number | null
          resolution_source: string | null
          side_a_color: string
          side_a_image: string | null
          side_a_name: string
          side_a_power: number
          side_b_color: string
          side_b_image: string | null
          side_b_name: string
          side_b_power: number
          side_c_color: string | null
          side_c_image: string | null
          side_c_name: string | null
          side_c_power: number | null
          starts_at: string
          title: string
          total_participants: number | null
          total_rewards_distributed: number | null
          winner_boost_percentage: number
          winner_side: string | null
        }
        Insert: {
          ai_confidence?: string | null
          ai_last_updated?: string | null
          ai_prediction_text?: string | null
          ai_side_a_probability?: number | null
          ai_side_b_probability?: number | null
          bonus_percentage?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_hours?: number | null
          ends_at?: string
          id?: string
          is_active?: boolean
          last_duration_hours?: number | null
          losing_pool_distributed?: boolean | null
          outcome_type?: string | null
          outcome_verified?: boolean | null
          outcome_verified_at?: string | null
          outcome_verified_by?: string | null
          prize_pool?: number | null
          resolution_source?: string | null
          side_a_color?: string
          side_a_image?: string | null
          side_a_name: string
          side_a_power?: number
          side_b_color?: string
          side_b_image?: string | null
          side_b_name: string
          side_b_power?: number
          side_c_color?: string | null
          side_c_image?: string | null
          side_c_name?: string | null
          side_c_power?: number | null
          starts_at?: string
          title: string
          total_participants?: number | null
          total_rewards_distributed?: number | null
          winner_boost_percentage?: number
          winner_side?: string | null
        }
        Update: {
          ai_confidence?: string | null
          ai_last_updated?: string | null
          ai_prediction_text?: string | null
          ai_side_a_probability?: number | null
          ai_side_b_probability?: number | null
          bonus_percentage?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_hours?: number | null
          ends_at?: string
          id?: string
          is_active?: boolean
          last_duration_hours?: number | null
          losing_pool_distributed?: boolean | null
          outcome_type?: string | null
          outcome_verified?: boolean | null
          outcome_verified_at?: string | null
          outcome_verified_by?: string | null
          prize_pool?: number | null
          resolution_source?: string | null
          side_a_color?: string
          side_a_image?: string | null
          side_a_name?: string
          side_a_power?: number
          side_b_color?: string
          side_b_image?: string | null
          side_b_name?: string
          side_b_power?: number
          side_c_color?: string | null
          side_c_image?: string | null
          side_c_name?: string | null
          side_c_power?: number | null
          starts_at?: string
          title?: string
          total_participants?: number | null
          total_rewards_distributed?: number | null
          winner_boost_percentage?: number
          winner_side?: string | null
        }
        Relationships: []
      }
      arena_boosts: {
        Row: {
          battle_id: string
          boost_percentage: number
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          battle_id: string
          boost_percentage: number
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          battle_id?: string
          boost_percentage?: number
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_boosts_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "arena_battles"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_earnings: {
        Row: {
          battle_id: string
          bonus_earned: number
          created_at: string
          id: string
          is_winner: boolean
          pool_share_earned: number
          stake_amount: number
          streak_bonus: number
          total_earned: number
          user_id: string
        }
        Insert: {
          battle_id: string
          bonus_earned?: number
          created_at?: string
          id?: string
          is_winner?: boolean
          pool_share_earned?: number
          stake_amount?: number
          streak_bonus?: number
          total_earned?: number
          user_id: string
        }
        Update: {
          battle_id?: string
          bonus_earned?: number
          created_at?: string
          id?: string
          is_winner?: boolean
          pool_share_earned?: number
          stake_amount?: number
          streak_bonus?: number
          total_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_earnings_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "arena_battles"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_email_whitelist: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      arena_members: {
        Row: {
          best_win_streak: number
          club: string
          current_win_streak: number
          fingerprint_hash: string | null
          fingerprint_verified: boolean
          id: string
          joined_at: string
          total_votes: number
          total_wins: number
          user_id: string
        }
        Insert: {
          best_win_streak?: number
          club: string
          current_win_streak?: number
          fingerprint_hash?: string | null
          fingerprint_verified?: boolean
          id?: string
          joined_at?: string
          total_votes?: number
          total_wins?: number
          user_id: string
        }
        Update: {
          best_win_streak?: number
          club?: string
          current_win_streak?: number
          fingerprint_hash?: string | null
          fingerprint_verified?: boolean
          id?: string
          joined_at?: string
          total_votes?: number
          total_wins?: number
          user_id?: string
        }
        Relationships: []
      }
      arena_staking_rewards: {
        Row: {
          battle_id: string
          created_at: string | null
          id: string
          is_winner: boolean | null
          loser_pool_share: number | null
          multiplier: number | null
          original_stake: number
          stake_return: number | null
          total_reward: number | null
          user_id: string
        }
        Insert: {
          battle_id: string
          created_at?: string | null
          id?: string
          is_winner?: boolean | null
          loser_pool_share?: number | null
          multiplier?: number | null
          original_stake: number
          stake_return?: number | null
          total_reward?: number | null
          user_id: string
        }
        Update: {
          battle_id?: string
          created_at?: string | null
          id?: string
          is_winner?: boolean | null
          loser_pool_share?: number | null
          multiplier?: number | null
          original_stake?: number
          stake_return?: number | null
          total_reward?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_staking_rewards_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "arena_battles"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_votes: {
        Row: {
          battle_id: string
          created_at: string
          early_stake_multiplier: number | null
          id: string
          locked_until: string
          power_spent: number
          side: string
          user_id: string
          verified_with_fingerprint: boolean | null
        }
        Insert: {
          battle_id: string
          created_at?: string
          early_stake_multiplier?: number | null
          id?: string
          locked_until?: string
          power_spent: number
          side: string
          user_id: string
          verified_with_fingerprint?: boolean | null
        }
        Update: {
          battle_id?: string
          created_at?: string
          early_stake_multiplier?: number | null
          id?: string
          locked_until?: string
          power_spent?: number
          side?: string
          user_id?: string
          verified_with_fingerprint?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_votes_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "arena_battles"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          claimed_amount: number
          created_at: string
          eligible_amount: number
          id: string
          last_active: string
          proof_status: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          claimed_amount?: number
          created_at?: string
          eligible_amount?: number
          id?: string
          last_active?: string
          proof_status?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          claimed_amount?: number
          created_at?: string
          eligible_amount?: number
          id?: string
          last_active?: string
          proof_status?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          id: string
          points_awarded: number
          streak_day: number
          user_id: string
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          id?: string
          points_awarded?: number
          streak_day?: number
          user_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          id?: string
          points_awarded?: number
          streak_day?: number
          user_id?: string
        }
        Relationships: []
      }
      founder_allocations: {
        Row: {
          allocation_percentage: number
          claimed_amount: number
          created_at: string
          id: string
          name: string
          next_unlock_date: string | null
          notes: string | null
          total_allocation: number
          vesting_type: string
          wallet_address: string
        }
        Insert: {
          allocation_percentage: number
          claimed_amount?: number
          created_at?: string
          id?: string
          name: string
          next_unlock_date?: string | null
          notes?: string | null
          total_allocation: number
          vesting_type?: string
          wallet_address: string
        }
        Update: {
          allocation_percentage?: number
          claimed_amount?: number
          created_at?: string
          id?: string
          name?: string
          next_unlock_date?: string | null
          notes?: string | null
          total_allocation?: number
          vesting_type?: string
          wallet_address?: string
        }
        Relationships: []
      }
      mining_sessions: {
        Row: {
          arx_mined: number
          credited_at: string | null
          ended_at: string | null
          id: string
          is_active: boolean
          started_at: string
          user_id: string
        }
        Insert: {
          arx_mined?: number
          credited_at?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          started_at?: string
          user_id: string
        }
        Update: {
          arx_mined?: number
          credited_at?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mining_settings: {
        Row: {
          arena_public_access: boolean
          block_reward: number
          claiming_enabled: boolean
          consensus_mode: string
          id: string
          public_mining_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          arena_public_access?: boolean
          block_reward?: number
          claiming_enabled?: boolean
          consensus_mode?: string
          id?: string
          public_mining_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          arena_public_access?: boolean
          block_reward?: number
          claiming_enabled?: boolean
          consensus_mode?: string
          id?: string
          public_mining_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      nexus_boosts: {
        Row: {
          boost_percentage: number
          claimed: boolean
          created_at: string
          expires_at: string
          id: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          boost_percentage?: number
          claimed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          boost_percentage?: number
          claimed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexus_boosts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "nexus_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_members: {
        Row: {
          fingerprint_hash: string | null
          fingerprint_verified: boolean
          fully_verified: boolean
          id: string
          joined_at: string
          updated_at: string
          user_id: string
          x_connected: boolean
          x_following: boolean
        }
        Insert: {
          fingerprint_hash?: string | null
          fingerprint_verified?: boolean
          fully_verified?: boolean
          id?: string
          joined_at?: string
          updated_at?: string
          user_id: string
          x_connected?: boolean
          x_following?: boolean
        }
        Update: {
          fingerprint_hash?: string | null
          fingerprint_verified?: boolean
          fully_verified?: boolean
          id?: string
          joined_at?: string
          updated_at?: string
          user_id?: string
          x_connected?: boolean
          x_following?: boolean
        }
        Relationships: []
      }
      nexus_privacy_settings: {
        Row: {
          hide_amount: boolean
          hide_usernames: boolean
          id: string
          private_mode: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          hide_amount?: boolean
          hide_usernames?: boolean
          id?: string
          private_mode?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          hide_amount?: boolean
          hide_usernames?: boolean
          id?: string
          private_mode?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nexus_transactions: {
        Row: {
          amount: number
          created_at: string
          hide_amount: boolean
          hide_usernames: boolean
          id: string
          private_mode: boolean
          receiver_address: string
          receiver_id: string
          sender_address: string
          sender_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          hide_amount?: boolean
          hide_usernames?: boolean
          id?: string
          private_mode?: boolean
          receiver_address: string
          receiver_id: string
          sender_address: string
          sender_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          hide_amount?: boolean
          hide_usernames?: boolean
          id?: string
          private_mode?: boolean
          receiver_address?: string
          receiver_id?: string
          sender_address?: string
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      points_audit_log: {
        Row: {
          action_taken: string
          audit_type: string
          computed_checkin_points: number
          computed_mining_points: number
          computed_referral_points: number
          computed_social_points: number
          computed_task_points: number
          computed_total_points: number
          created_at: string
          created_by: string | null
          id: string
          mining_diff: number
          notes: string | null
          points_restored: number
          referral_diff: number
          social_diff: number
          stored_mining_points: number
          stored_referral_points: number
          stored_social_points: number
          stored_task_points: number
          stored_total_points: number
          task_diff: number
          total_diff: number
          user_id: string
        }
        Insert: {
          action_taken?: string
          audit_type?: string
          computed_checkin_points?: number
          computed_mining_points?: number
          computed_referral_points?: number
          computed_social_points?: number
          computed_task_points?: number
          computed_total_points?: number
          created_at?: string
          created_by?: string | null
          id?: string
          mining_diff?: number
          notes?: string | null
          points_restored?: number
          referral_diff?: number
          social_diff?: number
          stored_mining_points?: number
          stored_referral_points?: number
          stored_social_points?: number
          stored_task_points?: number
          stored_total_points?: number
          task_diff?: number
          total_diff?: number
          user_id: string
        }
        Update: {
          action_taken?: string
          audit_type?: string
          computed_checkin_points?: number
          computed_mining_points?: number
          computed_referral_points?: number
          computed_social_points?: number
          computed_task_points?: number
          computed_total_points?: number
          created_at?: string
          created_by?: string | null
          id?: string
          mining_diff?: number
          notes?: string | null
          points_restored?: number
          referral_diff?: number
          social_diff?: number
          stored_mining_points?: number
          stored_referral_points?: number
          stored_social_points?: number
          stored_task_points?: number
          stored_total_points?: number
          task_diff?: number
          total_diff?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          country_code: string | null
          created_at: string
          id: string
          nexus_address: string | null
          referral_code: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          nexus_address?: string | null
          referral_code?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          nexus_address?: string | null
          referral_code?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          points_awarded: number
          referral_code_used: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_awarded?: number
          referral_code_used: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points_awarded?: number
          referral_code_used?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      social_submissions: {
        Row: {
          created_at: string
          id: string
          platform: string
          points_awarded: number
          post_url: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          points_awarded?: number
          post_url: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          points_awarded?: number
          post_url?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          is_active: boolean
          max_completions: number | null
          points_reward: number
          requires_screenshot: boolean
          task_type: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          is_active?: boolean
          max_completions?: number | null
          points_reward?: number
          requires_screenshot?: boolean
          task_type?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          is_active?: boolean
          max_completions?: number | null
          points_reward?: number
          requires_screenshot?: boolean
          task_type?: string
          title?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_name: string
          badge_type: string
          battle_id: string | null
          description: string | null
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_name: string
          badge_type: string
          battle_id?: string | null
          description?: string | null
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_name?: string
          badge_type?: string
          battle_id?: string | null
          description?: string | null
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "arena_battles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          amount: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          message: string
          notification_type: string
          read: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message: string
          notification_type?: string
          read?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          notification_type?: string
          read?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          created_at: string
          daily_streak: number
          id: string
          last_checkin_date: string | null
          mining_points: number
          referral_bonus_percentage: number
          referral_points: number
          social_points: number
          task_points: number
          total_points: number
          updated_at: string
          user_id: string
          x_post_boost_percentage: number
        }
        Insert: {
          created_at?: string
          daily_streak?: number
          id?: string
          last_checkin_date?: string | null
          mining_points?: number
          referral_bonus_percentage?: number
          referral_points?: number
          social_points?: number
          task_points?: number
          total_points?: number
          updated_at?: string
          user_id: string
          x_post_boost_percentage?: number
        }
        Update: {
          created_at?: string
          daily_streak?: number
          id?: string
          last_checkin_date?: string | null
          mining_points?: number
          referral_bonus_percentage?: number
          referral_points?: number
          social_points?: number
          task_points?: number
          total_points?: number
          updated_at?: string
          user_id?: string
          x_post_boost_percentage?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          points_awarded: number
          proof_url: string | null
          screenshot_url: string | null
          status: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: number
          proof_url?: string | null
          screenshot_url?: string | null
          status?: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: number
          proof_url?: string | null
          screenshot_url?: string | null
          status?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          connected_at: string
          id: string
          is_primary: boolean
          user_id: string
          wallet_address: string
          wallet_type: string
        }
        Insert: {
          connected_at?: string
          id?: string
          is_primary?: boolean
          user_id: string
          wallet_address: string
          wallet_type?: string
        }
        Update: {
          connected_at?: string
          id?: string
          is_primary?: boolean
          user_id?: string
          wallet_address?: string
          wallet_type?: string
        }
        Relationships: []
      }
      whitelist: {
        Row: {
          added_at: string
          eligible: boolean
          id: string
          merkle_proof: string | null
          wallet_address: string
        }
        Insert: {
          added_at?: string
          eligible?: boolean
          id?: string
          merkle_proof?: string | null
          wallet_address: string
        }
        Update: {
          added_at?: string
          eligible?: boolean
          id?: string
          merkle_proof?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      x_post_rewards: {
        Row: {
          arx_p_reward: number
          boost_reward: number
          created_at: string
          id: string
          like_count: number
          quote_count: number
          reply_count: number
          retweet_count: number
          total_engagement: number
          tweet_created_at: string | null
          tweet_id: string
          tweet_text: string
          user_id: string
          x_profile_id: string
        }
        Insert: {
          arx_p_reward?: number
          boost_reward?: number
          created_at?: string
          id?: string
          like_count?: number
          quote_count?: number
          reply_count?: number
          retweet_count?: number
          total_engagement?: number
          tweet_created_at?: string | null
          tweet_id: string
          tweet_text: string
          user_id: string
          x_profile_id: string
        }
        Update: {
          arx_p_reward?: number
          boost_reward?: number
          created_at?: string
          id?: string
          like_count?: number
          quote_count?: number
          reply_count?: number
          retweet_count?: number
          total_engagement?: number
          tweet_created_at?: string | null
          tweet_id?: string
          tweet_text?: string
          user_id?: string
          x_profile_id?: string
        }
        Relationships: []
      }
      x_profiles: {
        Row: {
          average_engagement: number
          boost_percentage: number
          created_at: string
          historical_arx_p_total: number
          historical_boost_total: number
          historical_posts_count: number
          historical_scanned: boolean
          id: string
          last_scanned_at: string | null
          profile_url: string
          qualified_posts_today: number
          updated_at: string
          user_id: string
          username: string
          viral_bonus: boolean
        }
        Insert: {
          average_engagement?: number
          boost_percentage?: number
          created_at?: string
          historical_arx_p_total?: number
          historical_boost_total?: number
          historical_posts_count?: number
          historical_scanned?: boolean
          id?: string
          last_scanned_at?: string | null
          profile_url: string
          qualified_posts_today?: number
          updated_at?: string
          user_id: string
          username: string
          viral_bonus?: boolean
        }
        Update: {
          average_engagement?: number
          boost_percentage?: number
          created_at?: string
          historical_arx_p_total?: number
          historical_boost_total?: number
          historical_posts_count?: number
          historical_scanned?: boolean
          id?: string
          last_scanned_at?: string | null
          profile_url?: string
          qualified_posts_today?: number
          updated_at?: string
          user_id?: string
          username?: string
          viral_bonus?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      arena_earnings_leaderboard: {
        Row: {
          avatar_url: string | null
          best_win_streak: number | null
          club: string | null
          current_win_streak: number | null
          net_profit: number | null
          total_battles: number | null
          total_bonus_earned: number | null
          total_earned: number | null
          total_pool_share_earned: number | null
          total_staked: number | null
          total_streak_bonus: number | null
          total_wins: number | null
          user_id: string | null
          username: string | null
          win_rate: number | null
        }
        Relationships: []
      }
      arena_team_leaderboard: {
        Row: {
          avatar_url: string | null
          best_win_streak: number | null
          club: string | null
          current_win_streak: number | null
          member_total_wins: number | null
          net_profit: number | null
          total_battles: number | null
          total_bonus_earned: number | null
          total_earned: number | null
          total_pool_share_earned: number | null
          total_staked: number | null
          total_streak_bonus: number | null
          total_votes: number | null
          total_wins: number | null
          user_id: string | null
          username: string | null
          win_rate: number | null
        }
        Relationships: []
      }
      leaderboard_view: {
        Row: {
          avatar_url: string | null
          daily_streak: number | null
          total_points: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      yapper_leaderboard_view: {
        Row: {
          avatar_url: string | null
          average_engagement: number | null
          boost_percentage: number | null
          qualified_posts_today: number | null
          social_points: number | null
          user_id: string | null
          username: string | null
          viral_bonus: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_early_stake_multiplier: {
        Args: { p_battle_id: string; p_vote_time: string }
        Returns: number
      }
      calculate_streak_bonus: { Args: { win_streak: number }; Returns: number }
      claim_nexus_reward: { Args: { p_transaction_id: string }; Returns: Json }
      generate_nexus_address: { Args: { p_username: string }; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_arena_participation: {
        Args: { p_battle_id: string }
        Returns: {
          avatar_url: string
          battle_id: string
          created_at: string
          power_spent: number
          side: string
          user_id: string
          username: string
        }[]
      }
      get_daily_send_count: { Args: { p_user_id: string }; Returns: number }
      get_user_rank: { Args: { p_user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_user_points: {
        Args: { p_amount: number; p_type: string; p_user_id: string }
        Returns: {
          created_at: string
          daily_streak: number
          id: string
          last_checkin_date: string | null
          mining_points: number
          referral_bonus_percentage: number
          referral_points: number
          social_points: number
          task_points: number
          total_points: number
          updated_at: string
          user_id: string
          x_post_boost_percentage: number
        }
        SetofOptions: {
          from: "*"
          to: "user_points"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      perform_daily_checkin: {
        Args: { p_user_id: string }
        Returns: {
          message: string
          points_awarded: number
          streak_boost: number
          streak_day: number
          success: boolean
        }[]
      }
      send_nexus_transfer: {
        Args: {
          p_amount: number
          p_hide_amount?: boolean
          p_hide_usernames?: boolean
          p_private_mode?: boolean
          p_receiver_address: string
          p_sender_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
