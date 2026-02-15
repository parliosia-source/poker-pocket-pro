// ═══════════════════════════════════════════════
// ENUMS & LITERALS
// ═══════════════════════════════════════════════

export type Street = "preflop" | "flop" | "turn" | "river";

export type ActionType =
  | "post_sb"
  | "post_bb"
  | "check"
  | "fold"
  | "bet"
  | "call"
  | "raise_to"
  | "all_in";

export type Actor = "hero" | "villain";

export type HeroPosition = "SB" | "BB";

export type HandStatus =
  | "in_progress"
  | "completed_fold"
  | "completed_showdown"
  | "completed_allin_runout";

// ═══════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════

export interface Action {
  readonly id: string;
  readonly street: Street;
  readonly actor: Actor;
  readonly type: ActionType;
  readonly amount_bb: number | null;
  readonly is_all_in: boolean;
  readonly timestamp: number;
}

export interface PlayerState {
  readonly stack_start_bb: number;
  stack_remaining_bb: number;
  invested_this_street_bb: number;
  invested_total_bb: number;
  is_all_in: boolean;
  has_folded: boolean;
}

export interface StreetState {
  readonly street: Street;
  current_bet_bb: number;
  previous_bet_bb: number;
  num_actions: number;
  is_closed: boolean;
}

export interface Derived {
  pot_bb: number;
  to_call_bb: number;
  pot_odds_pct: number | null;
  spr: number | null;
  effective_stack_bb: number;
  min_raise_to_bb: number | null;
  pot_for_sizing_bb: number;
}

export interface GameConfig {
  readonly sb_bb: number;
  readonly bb_bb: number;
  readonly hero_position: HeroPosition;
  readonly hero_stack_bb: number;
  readonly villain_stack_bb: number;
}

export interface Board {
  flop: [string, string, string] | null;
  turn: string | null;
  river: string | null;
}

export interface GameState {
  readonly config: GameConfig;
  hero: PlayerState;
  villain: PlayerState;
  current_street: Street;
  street_state: StreetState;
  actions: readonly Action[];
  derived: Derived;
  expected_actor: Actor;
  hand_status: HandStatus;
  board: Board;
  hero_cards: [string, string] | null;
  hand_number: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
