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

export type PlayerStatus = "active" | "folded" | "all_in";

export type PositionLabel =
  | "BTN" | "SB" | "BB"
  | "UTG" | "UTG1" | "UTG2"
  | "MP" | "MP1" | "MP2"
  | "HJ" | "CO";

export type HandStatus =
  | "in_progress"
  | "completed_fold"
  | "completed_showdown"
  | "completed_allin_runout";

// ═══════════════════════════════════════════════
// PLAYER
// ═══════════════════════════════════════════════

export interface Player {
  readonly id: string;
  readonly seat_index: number;
  readonly position_label: PositionLabel;
  readonly label: string;
  readonly is_hero: boolean;

  stack_start_bb: number;
  stack_remaining_bb: number;
  invested_this_street_bb: number;
  invested_total_bb: number;
  status: PlayerStatus;
  has_acted_at_current_bet: boolean;
}

// ═══════════════════════════════════════════════
// ACTION
// ═══════════════════════════════════════════════

export interface Action {
  readonly id: string;
  readonly street: Street;
  readonly player_id: string;
  readonly type: ActionType;
  readonly amount_bb: number | null;
  readonly is_all_in: boolean;
  readonly timestamp: number;
}

// ═══════════════════════════════════════════════
// STREET STATE & ACTION QUEUE
// ═══════════════════════════════════════════════

export interface StreetState {
  readonly street: Street;
  current_bet_bb: number;
  previous_bet_bb: number;
  last_aggressor_id: string | null;
  num_voluntary_actions: number;
  is_closed: boolean;
}

export interface ActionQueue {
  players_to_act: string[];
}

// ═══════════════════════════════════════════════
// DERIVED
// ═══════════════════════════════════════════════

export interface Derived {
  pot_bb: number;
  to_call_bb: number;
  hero_to_call_bb: number;
  pot_odds_pct: number | null;
  hero_pot_odds_pct: number | null;
  spr: number | null;
  effective_stack_bb: number;
  min_raise_to_bb: number | null;
  pot_for_sizing_bb: number;
  num_players_in_hand: number;
  num_players_active: number;
  side_pot_warning: boolean;
}

// ═══════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════

export interface PlayerConfig {
  readonly seat_index: number;
  readonly label: string;
  readonly is_hero: boolean;
  readonly stack_bb: number;
}

export interface GameConfig {
  readonly sb_bb: number;
  readonly bb_bb: number;
  readonly table_size: number;
  readonly btn_seat_index: number;
  readonly players_config: PlayerConfig[];
}

// ═══════════════════════════════════════════════
// BOARD & GAME STATE
// ═══════════════════════════════════════════════

export interface Board {
  flop: [string | null, string | null, string | null];
  turn: string | null;
  river: string | null;
}

export interface GameState {
  readonly config: GameConfig;
  players: Player[];
  current_street: Street;
  street_state: StreetState;
  action_queue: ActionQueue;
  expected_actor_id: string | null;
  actions: readonly Action[];
  derived: Derived;
  hand_status: HandStatus;
  board: Board;
  hero_cards: [string, string] | null;
  hand_number: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ═══════════════════════════════════════════════
// TIMELINE EVENTS (for unified undo/redo)
// ═══════════════════════════════════════════════

export type TimelineEvent =
  | { kind: 'action'; action: Action }
  | { kind: 'advance_street'; street: Street; boardCards?: string[] }
  | { kind: 'set_board_card'; card: string }
  | { kind: 'set_board'; street: Street; cards: string[] }
  | { kind: 'set_hero_cards'; cards: [string, string] };
