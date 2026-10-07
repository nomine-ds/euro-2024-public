// supabase/functions/api/lib/types.ts
export type EventRow = {
  event_id: string;
  match_id: number;
  event_index: number;
  event_type: string | null;
  timestamp: string | null;
  period: number | null;
  player_id: number | null;
  player_name: string | null;
  team_id: number | null;
  team_name: string | null;
  location: unknown;
  pass_end_location: unknown;
  recipient_id: number | null;
  recipient_name: string | null;
  shot_outcome: string | null;
  shot_xg: number | null;
  pass_xg: number | null;
  goal_assist: boolean;
  card_type: string | null;
  has_360: boolean;
};

export type MatchRow = {
  match_id: number;
  match_date: string | null;
  home_team: string;
  away_team: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number;
  away_score: number;
  has_360: boolean;
};