import { nanoid } from 'nanoid';
import type {
  GameState, GameConfig, Action, Street, ValidationResult, Derived, ActionType, Player,
} from './types';
import {
  getPlayerById, getPlayerByIdMut, getPlayerBySeat, findByPosition, findHero,
  getActivePlayers, getPlayersInHand, assignPositions, nextActiveSeatAfter,
} from './utils';

// ═══════════════════════════════════════════════
// createInitialState
// ═══════════════════════════════════════════════

export function createInitialState(
  config: GameConfig,
  handNumber = 1,
  playerIds?: string[],
): GameState {
  const positions = assignPositions(config.table_size, config.btn_seat_index);

  const players: Player[] = config.players_config.map((pc, idx) => ({
    id: playerIds?.[idx] ?? nanoid(),
    seat_index: pc.seat_index,
    position_label: positions[pc.seat_index],
    label: pc.label,
    is_hero: pc.is_hero,
    stack_start_bb: pc.stack_bb,
    stack_remaining_bb: pc.stack_bb,
    invested_this_street_bb: 0,
    invested_total_bb: 0,
    status: "active" as const,
    has_acted_at_current_bet: false,
  }));

  players.sort((a, b) => a.seat_index - b.seat_index);

  // Find SB and BB
  // HU: BTN = SB
  const sbPlayer = findPlayerByPos(players, config.table_size === 2 ? "BTN" : "SB");
  const bbPlayer = findPlayerByPos(players, "BB");

  if (!sbPlayer || !bbPlayer) throw new Error("Cannot find SB/BB");

  // Post blinds
  const sbAmount = Math.min(config.sb_bb, sbPlayer.stack_remaining_bb);
  applyBlindToPlayer(sbPlayer, sbAmount);

  const bbAmount = Math.min(config.bb_bb, bbPlayer.stack_remaining_bb);
  applyBlindToPlayer(bbPlayer, bbAmount);

  const now = Date.now();
  const actions: Action[] = [
    {
      id: nanoid(), street: "preflop", player_id: sbPlayer.id, type: "post_sb",
      amount_bb: sbAmount, is_all_in: sbPlayer.status === "all_in", timestamp: now,
    },
    {
      id: nanoid(), street: "preflop", player_id: bbPlayer.id, type: "post_bb",
      amount_bb: bbAmount, is_all_in: bbPlayer.status === "all_in", timestamp: now + 1,
    },
  ];

  const streetState = {
    street: "preflop" as const,
    current_bet_bb: bbAmount,
    previous_bet_bb: sbAmount,
    last_aggressor_id: bbPlayer.id,
    num_voluntary_actions: 0,
    is_closed: false,
  };

  const state: GameState = {
    config,
    players,
    current_street: "preflop",
    street_state: streetState,
    action_queue: { players_to_act: [] },
    expected_actor_id: null,
    actions,
    derived: {} as Derived,
    hand_status: "in_progress",
    board: { flop: [null, null, null], turn: null, river: null },
    hero_cards: null,
    hand_number: handNumber,
  };

  // Build preflop queue
  const queue = buildInitialQueue(state, "preflop");
  state.action_queue.players_to_act = queue;
  state.expected_actor_id = queue[0] ?? null;
  state.derived = recalcDerived(state);

  return state;
}

function findPlayerByPos(players: Player[], pos: string): Player | undefined {
  return players.find(p => p.position_label === pos);
}

function applyBlindToPlayer(player: Player, amount: number): void {
  player.stack_remaining_bb -= amount;
  player.invested_this_street_bb = amount;
  player.invested_total_bb = amount;
  if (player.stack_remaining_bb <= 0) {
    player.stack_remaining_bb = 0;
    player.status = "all_in";
  }
}

// ═══════════════════════════════════════════════
// Queue building
// ═══════════════════════════════════════════════

function buildInitialQueue(state: GameState, street: Street): string[] {
  let firstSeat: number;

  if (street === "preflop") {
    if (state.config.table_size === 2) {
      // HU: BTN/SB acts first
      firstSeat = state.config.btn_seat_index;
    } else {
      // Multiway: UTG (seat after BB)
      const bb = findByPosition(state, "BB");
      if (!bb) return [];
      firstSeat = nextActiveSeatAfter(state, bb.seat_index);
    }
  } else {
    // Postflop: first active after BTN
    firstSeat = nextActiveSeatAfter(state, state.config.btn_seat_index);
  }

  if (firstSeat === -1) return [];

  const queue: string[] = [];
  for (let i = 0; i < state.config.table_size; i++) {
    const seat = (firstSeat + i) % state.config.table_size;
    const p = getPlayerBySeat(state, seat);
    if (p && p.status === "active") {
      queue.push(p.id);
    }
  }
  return queue;
}

function buildResponseQueue(state: GameState, exceptId: string): string[] {
  const actor = getPlayerByIdMut(state, exceptId);
  const queue: string[] = [];
  for (let i = 1; i < state.config.table_size; i++) {
    const seat = (actor.seat_index + i) % state.config.table_size;
    const p = getPlayerBySeat(state, seat);
    if (p && p.status === "active" && p.id !== exceptId) {
      queue.push(p.id);
    }
  }
  return queue;
}

function buildIncompleteResponseQueue(state: GameState, exceptId: string): string[] {
  const actor = getPlayerByIdMut(state, exceptId);
  const queue: string[] = [];
  for (let i = 1; i < state.config.table_size; i++) {
    const seat = (actor.seat_index + i) % state.config.table_size;
    const p = getPlayerBySeat(state, seat);
    if (p && p.status === "active" && p.id !== exceptId && !p.has_acted_at_current_bet) {
      queue.push(p.id);
    }
  }
  return queue;
}

function resetActedFlags(state: GameState, exceptId: string): void {
  for (const p of state.players) {
    if (p.id !== exceptId) {
      p.has_acted_at_current_bet = false;
    }
  }
}

// ═══════════════════════════════════════════════
// validateAction
// ═══════════════════════════════════════════════

export function validateAction(
  state: GameState,
  action: { player_id: string; type: ActionType; amount_bb?: number | null; is_all_in?: boolean },
): ValidationResult {
  const errors: string[] = [];

  if (state.hand_status !== "in_progress") {
    return { valid: false, errors: ["Main terminée, aucune action possible"] };
  }

  if (state.street_state.is_closed) {
    return { valid: false, errors: ["Street fermée — avancez à la suivante"] };
  }

  const player = getPlayerById(state, action.player_id);
  if (!player) {
    return { valid: false, errors: ["Joueur inconnu"] };
  }

  if (player.status === "folded") {
    errors.push("Ce joueur a déjà abandonné");
    return { valid: false, errors };
  }
  if (player.status === "all_in") {
    errors.push("Ce joueur est all-in");
    return { valid: false, errors };
  }

  const to_call = Math.min(
    Math.max(0, state.street_state.current_bet_bb - player.invested_this_street_bb),
    player.stack_remaining_bb,
  );

  switch (action.type) {
    case "check":
      if (to_call > 0) {
        errors.push(`Check impossible — to_call = ${to_call} BB`);
      }
      break;

    case "fold":
      // Always allowed for active player
      break;

    case "bet":
      if (state.street_state.current_bet_bb > 0) {
        errors.push("Bet impossible — il y a déjà une mise en cours");
      } else if (action.amount_bb == null || action.amount_bb <= 0) {
        errors.push("Montant de bet requis");
      } else if (action.amount_bb < state.config.bb_bb && action.amount_bb < player.stack_remaining_bb) {
        errors.push(`Bet minimum = ${state.config.bb_bb} BB`);
      } else if (action.amount_bb > player.stack_remaining_bb) {
        errors.push("Bet > stack restant");
      }
      break;

    case "call":
      if (to_call <= 0) {
        errors.push("Rien à caller");
      }
      break;

    case "raise_to": {
      if (state.street_state.current_bet_bb <= 0) {
        errors.push("Raise impossible — pas de mise (utilisez bet)");
      } else if (action.amount_bb == null) {
        errors.push("Montant requis pour raise_to");
      } else {
        const maxTotal = player.invested_this_street_bb + player.stack_remaining_bb;
        if (action.amount_bb > maxTotal) {
          errors.push("Raise > stack total");
        } else if (action.amount_bb <= state.street_state.current_bet_bb) {
          errors.push(`Raise to doit être > current bet (${state.street_state.current_bet_bb})`);
        } else {
          const minRaise = state.derived.min_raise_to_bb;
          if (minRaise != null && action.amount_bb < minRaise && action.amount_bb < maxTotal) {
            errors.push(`Raise minimum = ${minRaise} BB (ou all-in)`);
          }
        }
      }
      break;
    }

    case "all_in":
      if (player.stack_remaining_bb <= 0) {
        errors.push("Déjà all-in");
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════
// applyAction
// ═══════════════════════════════════════════════

export function applyAction(state: GameState, action: Action): GameState {
  const next = structuredClone(state) as GameState;
  const actor = getPlayerByIdMut(next, action.player_id);
  let appliedAction = { ...action };

  switch (action.type) {
    case "check":
      next.street_state.num_voluntary_actions += 1;
      actor.has_acted_at_current_bet = true;
      break;

    case "fold":
      actor.status = "folded";
      next.street_state.num_voluntary_actions += 1;
      break;

    case "bet": {
      let amount = action.amount_bb!;
      if (amount >= actor.stack_remaining_bb) {
        amount = actor.stack_remaining_bb;
        appliedAction = { ...appliedAction, amount_bb: amount, is_all_in: true };
        actor.status = "all_in";
      }
      actor.stack_remaining_bb -= amount;
      actor.invested_this_street_bb += amount;
      actor.invested_total_bb += amount;
      next.street_state.previous_bet_bb = next.street_state.current_bet_bb;
      next.street_state.current_bet_bb = actor.invested_this_street_bb;
      next.street_state.last_aggressor_id = actor.id;
      next.street_state.num_voluntary_actions += 1;
      actor.has_acted_at_current_bet = true;
      break;
    }

    case "call": {
      let callAmount = Math.min(
        next.street_state.current_bet_bb - actor.invested_this_street_bb,
        actor.stack_remaining_bb,
      );
      callAmount = Math.max(0, callAmount);
      if (callAmount >= actor.stack_remaining_bb) {
        actor.status = "all_in";
        appliedAction = { ...appliedAction, is_all_in: true };
      }
      actor.stack_remaining_bb -= callAmount;
      actor.invested_this_street_bb += callAmount;
      actor.invested_total_bb += callAmount;
      next.street_state.num_voluntary_actions += 1;
      actor.has_acted_at_current_bet = true;
      break;
    }

    case "raise_to": {
      let raiseToTotal = action.amount_bb!;
      let cost = raiseToTotal - actor.invested_this_street_bb;
      if (cost >= actor.stack_remaining_bb) {
        cost = actor.stack_remaining_bb;
        raiseToTotal = actor.invested_this_street_bb + cost;
        actor.status = "all_in";
        appliedAction = { ...appliedAction, amount_bb: raiseToTotal, is_all_in: true };
      }
      actor.stack_remaining_bb -= cost;
      actor.invested_this_street_bb = raiseToTotal;
      actor.invested_total_bb += cost;
      next.street_state.previous_bet_bb = next.street_state.current_bet_bb;
      next.street_state.current_bet_bb = raiseToTotal;
      next.street_state.last_aggressor_id = actor.id;
      next.street_state.num_voluntary_actions += 1;
      actor.has_acted_at_current_bet = true;
      break;
    }

    case "all_in": {
      const remaining = actor.stack_remaining_bb;
      actor.invested_this_street_bb += remaining;
      actor.invested_total_bb += remaining;
      actor.stack_remaining_bb = 0;
      actor.status = "all_in";
      if (actor.invested_this_street_bb > next.street_state.current_bet_bb) {
        next.street_state.previous_bet_bb = next.street_state.current_bet_bb;
        next.street_state.current_bet_bb = actor.invested_this_street_bb;
        next.street_state.last_aggressor_id = actor.id;
      }
      next.street_state.num_voluntary_actions += 1;
      actor.has_acted_at_current_bet = true;
      appliedAction = { ...appliedAction, amount_bb: actor.invested_this_street_bb, is_all_in: true };
      break;
    }
  }

  // Add action to log
  next.actions = [...next.actions, appliedAction];

  // Update queue
  updateQueueAfterAction(next, appliedAction);

  next.derived = recalcDerived(next);
  assertInvariants(next);
  return next;
}

function updateQueueAfterAction(state: GameState, action: Action): void {
  let queue = state.action_queue.players_to_act.filter(id => id !== action.player_id);

  switch (action.type) {
    case "fold": {
      const inHand = state.players.filter(p => p.status !== "folded");
      if (inHand.length <= 1) {
        state.hand_status = "completed_fold";
        queue = [];
      }
      break;
    }

    case "check":
    case "call":
      // Passive: actor removed, no reopen
      break;

    case "bet": {
      queue = buildResponseQueue(state, action.player_id);
      resetActedFlags(state, action.player_id);
      break;
    }

    case "raise_to":
    case "all_in": {
      // Determine if full raise or incomplete
      const newBet = state.street_state.current_bet_bb;
      const oldBet = state.street_state.previous_bet_bb;
      const lastIncrement = oldBet > 0 ? newBet - oldBet : newBet;
      // For all_in that didn't raise (invested <= old current_bet), don't reopen
      if (action.type === "all_in" && (action.amount_bb ?? 0) <= state.street_state.previous_bet_bb) {
        // All-in that doesn't raise — no reopen, just remove from queue
        break;
      }
      const minFullIncrement = Math.max(
        state.street_state.previous_bet_bb > 0
          ? state.street_state.current_bet_bb - state.street_state.previous_bet_bb
          : state.config.bb_bb,
        state.config.bb_bb,
      );
      // Recalculate: the previous_bet was already updated in applyAction, so we need to check
      // if the actual increment is >= min
      // Actually, previous_bet_bb is the OLD current_bet before this action,
      // and current_bet_bb is the NEW current_bet after this action
      // So increment = current_bet_bb - previous_bet_bb
      const actualIncrement = state.street_state.current_bet_bb - state.street_state.previous_bet_bb;
      // Min full increment: use the increment before this one
      // This is tricky - let's simplify: just reopen for everyone in most cases
      // For incomplete raise (all-in short), only those who haven't acted
      const isFullRaise = actualIncrement >= state.config.bb_bb;

      if (isFullRaise) {
        queue = buildResponseQueue(state, action.player_id);
        resetActedFlags(state, action.player_id);
      } else {
        queue = buildIncompleteResponseQueue(state, action.player_id);
      }
      break;
    }
  }

  state.action_queue.players_to_act = queue;

  // Check street closure
  if (queue.length === 0 && state.hand_status === "in_progress") {
    state.street_state.is_closed = true;
    checkAllinRunout(state);
  }

  state.expected_actor_id = queue[0] ?? null;
}

function checkAllinRunout(state: GameState): void {
  const active = state.players.filter(p => p.status === "active");
  const inHand = state.players.filter(p => p.status !== "folded");
  if (active.length <= 1 && inHand.length >= 2) {
    if (active.length === 0) {
      state.hand_status = "completed_allin_runout";
    }
    // If 1 active: streets will auto-close (queue will be empty or just 1 player)
  }
}

// ═══════════════════════════════════════════════
// recalcDerived
// ═══════════════════════════════════════════════

export function recalcDerived(state: GameState): Derived {
  let pot_bb = 0;
  for (const p of state.players) {
    pot_bb += p.invested_total_bb;
  }

  // To_call for expected actor
  let to_call_bb = 0;
  if (state.expected_actor_id && state.hand_status === "in_progress") {
    const actor = getPlayerById(state, state.expected_actor_id);
    if (actor) {
      to_call_bb = Math.max(0, state.street_state.current_bet_bb - actor.invested_this_street_bb);
      to_call_bb = Math.min(to_call_bb, actor.stack_remaining_bb);
    }
  }

  // Hero to_call (even when not their turn)
  const hero = findHero(state);
  let hero_to_call_bb = 0;
  if (hero && hero.status === "active") {
    hero_to_call_bb = Math.max(0, state.street_state.current_bet_bb - hero.invested_this_street_bb);
    hero_to_call_bb = Math.min(hero_to_call_bb, hero.stack_remaining_bb);
  }

  // Pot odds
  const pot_odds_pct = to_call_bb > 0
    ? Math.round((to_call_bb / (pot_bb + to_call_bb)) * 1000) / 10
    : null;

  const hero_pot_odds_pct = hero_to_call_bb > 0
    ? Math.round((hero_to_call_bb / (pot_bb + hero_to_call_bb)) * 1000) / 10
    : null;

  // Effective stack
  const activeStacks = state.players
    .filter(p => p.status === "active")
    .map(p => p.stack_remaining_bb);
  const effective_stack_bb = activeStacks.length > 0 ? Math.min(...activeStacks) : 0;

  // SPR (Hero-centric)
  let spr: number | null = null;
  if (hero && pot_bb > 0) {
    spr = Math.round((hero.stack_remaining_bb / pot_bb) * 10) / 10;
  }

  // Min raise
  let min_raise_to_bb: number | null = null;
  if (state.hand_status === "in_progress" && state.street_state.current_bet_bb > 0) {
    const lastIncrement = state.street_state.current_bet_bb - state.street_state.previous_bet_bb;
    const minIncrement = Math.max(lastIncrement, state.config.bb_bb);
    min_raise_to_bb = state.street_state.current_bet_bb + minIncrement;

    if (state.expected_actor_id) {
      const actor = getPlayerById(state, state.expected_actor_id);
      if (actor) {
        const maxRaiseTo = actor.invested_this_street_bb + actor.stack_remaining_bb;
        if (min_raise_to_bb > maxRaiseTo) {
          min_raise_to_bb = maxRaiseTo;
        }
      }
    }
  }

  // Players counts
  const inHand = state.players.filter(p => p.status !== "folded");
  const active = state.players.filter(p => p.status === "active");

  // Side pot detection
  const side_pot_warning = detectSidePotNeeded(state);

  const pot_for_sizing_bb = pot_bb + to_call_bb;

  return {
    pot_bb,
    to_call_bb,
    hero_to_call_bb,
    pot_odds_pct,
    hero_pot_odds_pct,
    spr,
    effective_stack_bb,
    min_raise_to_bb,
    pot_for_sizing_bb,
    num_players_in_hand: inHand.length,
    num_players_active: active.length,
    side_pot_warning,
  };
}

function detectSidePotNeeded(state: GameState): boolean {
  const allinPlayers = state.players.filter(p => p.status === "all_in");
  if (allinPlayers.length === 0) return false;

  const maxInvested = Math.max(...state.players.map(p => p.invested_total_bb));

  return allinPlayers.some(p => p.invested_total_bb < maxInvested);
}

// ═══════════════════════════════════════════════
// advanceStreet
// ═══════════════════════════════════════════════

export function advanceStreet(state: GameState, newStreet: Street, boardCards?: string[]): GameState {
  const next = structuredClone(state) as GameState;

  // Reset invested_this_street for ALL players
  for (const p of next.players) {
    p.invested_this_street_bb = 0;
    p.has_acted_at_current_bet = false;
  }

  next.current_street = newStreet;
  next.street_state = {
    street: newStreet,
    current_bet_bb: 0,
    previous_bet_bb: 0,
    last_aggressor_id: null,
    num_voluntary_actions: 0,
    is_closed: false,
  };

  // Board cards
  if (boardCards) {
    if (newStreet === "flop" && boardCards.length === 3) {
      next.board.flop = [boardCards[0], boardCards[1], boardCards[2]];
    } else if (newStreet === "turn" && boardCards.length >= 1) {
      next.board.turn = boardCards[0];
    } else if (newStreet === "river" && boardCards.length >= 1) {
      next.board.river = boardCards[0];
    }
  }

  // Build postflop queue
  const queue = buildInitialQueue(next, newStreet);

  if (queue.length <= 1) {
    next.street_state.is_closed = true;
    if (queue.length === 0) {
      next.hand_status = "completed_allin_runout";
    }
    next.action_queue.players_to_act = [];
    next.expected_actor_id = null;
  } else {
    next.action_queue.players_to_act = queue;
    next.expected_actor_id = queue[0];
  }

  next.derived = recalcDerived(next);
  return next;
}

// ═══════════════════════════════════════════════
// Invariant checks (dev only)
// ═══════════════════════════════════════════════

function assertInvariants(state: GameState): void {
  if (import.meta.env.DEV) {
    for (const p of state.players) {
      const total = p.invested_total_bb + p.stack_remaining_bb;
      console.assert(
        Math.abs(total - p.stack_start_bb) < 0.001,
        `INV: ${p.label} total ${total} != ${p.stack_start_bb}`,
      );
      console.assert(p.stack_remaining_bb >= 0, `INV: ${p.label} stack < 0`);
    }

    let pot = 0;
    for (const p of state.players) pot += p.invested_total_bb;
    console.assert(
      Math.abs(pot - state.derived.pot_bb) < 0.001,
      `INV: pot ${pot} != derived ${state.derived.pot_bb}`,
    );
    console.assert(state.derived.to_call_bb >= 0, "INV: to_call < 0");
  }
}
