import { nanoid } from 'nanoid';
import type {
  GameState, GameConfig, Action, Street, ValidationResult, Derived, ActionType,
} from './types';
import { getPlayer, getPlayerMut, otherActor, getSBPlayer, getNextStreet } from './utils';

// ═══════════════════════════════════════════════
// createInitialState
// ═══════════════════════════════════════════════

export function createInitialState(config: GameConfig, handNumber = 1): GameState {
  const hero = {
    stack_start_bb: config.hero_stack_bb,
    stack_remaining_bb: config.hero_stack_bb,
    invested_this_street_bb: 0,
    invested_total_bb: 0,
    is_all_in: false,
    has_folded: false,
  };

  const villain = {
    stack_start_bb: config.villain_stack_bb,
    stack_remaining_bb: config.villain_stack_bb,
    invested_this_street_bb: 0,
    invested_total_bb: 0,
    is_all_in: false,
    has_folded: false,
  };

  const sbActor = getSBPlayerFromConfig(config);
  const bbActor = sbActor === "hero" ? "villain" : "hero";

  const sbState = sbActor === "hero" ? hero : villain;
  const bbState = bbActor === "hero" ? hero : villain;

  // Post blinds
  const sbAmount = Math.min(config.sb_bb, sbState.stack_remaining_bb);
  sbState.stack_remaining_bb -= sbAmount;
  sbState.invested_this_street_bb = sbAmount;
  sbState.invested_total_bb = sbAmount;
  if (sbState.stack_remaining_bb === 0) sbState.is_all_in = true;

  const bbAmount = Math.min(config.bb_bb, bbState.stack_remaining_bb);
  bbState.stack_remaining_bb -= bbAmount;
  bbState.invested_this_street_bb = bbAmount;
  bbState.invested_total_bb = bbAmount;
  if (bbState.stack_remaining_bb === 0) bbState.is_all_in = true;

  const now = Date.now();
  const actions: Action[] = [
    {
      id: nanoid(), street: "preflop", actor: sbActor, type: "post_sb",
      amount_bb: sbAmount, is_all_in: sbState.is_all_in, timestamp: now,
    },
    {
      id: nanoid(), street: "preflop", actor: bbActor, type: "post_bb",
      amount_bb: bbAmount, is_all_in: bbState.is_all_in, timestamp: now + 1,
    },
  ];

  // In HU preflop, SB acts first
  let expected_actor = sbActor;
  if (sbState.is_all_in) expected_actor = bbActor;

  const state: GameState = {
    config,
    hero,
    villain,
    current_street: "preflop",
    street_state: {
      street: "preflop",
      current_bet_bb: bbAmount,
      previous_bet_bb: sbAmount,
      num_actions: 0,
      is_closed: false,
    },
    actions,
    derived: {} as Derived,
    expected_actor,
    hand_status: "in_progress",
    board: { flop: [null, null, null], turn: null, river: null },
    hero_cards: null,
    hand_number: handNumber,
  };

  state.derived = recalcDerived(state);
  return state;
}

function getSBPlayerFromConfig(config: GameConfig): "hero" | "villain" {
  return config.hero_position === "SB" ? "hero" : "villain";
}

// ═══════════════════════════════════════════════
// validateAction
// ═══════════════════════════════════════════════

export function validateAction(
  state: GameState,
  action: { actor: string; type: ActionType; amount_bb?: number | null; is_all_in?: boolean },
): ValidationResult {
  const errors: string[] = [];

  // VAL-01
  if (state.hand_status !== "in_progress") {
    return { valid: false, errors: ["Main terminée, aucune action possible"] };
  }

  // VAL-02
  if (action.actor !== state.expected_actor) {
    errors.push(`Ce n'est pas au tour de ${action.actor}`);
  }

  const actorState = getPlayer(state, action.actor as "hero" | "villain");

  switch (action.type) {
    case "check":
      if (state.derived.to_call_bb > 0) {
        errors.push(`Check impossible, to_call = ${state.derived.to_call_bb}`);
      }
      break;

    case "fold":
      // Allowed even if to_call == 0 (not blocking)
      break;

    case "bet":
      if (state.street_state.current_bet_bb > 0) {
        errors.push("Bet impossible, il y a déjà un bet/raise en cours");
      } else if (action.amount_bb == null || action.amount_bb < state.config.bb_bb) {
        errors.push(`Bet minimum = ${state.config.bb_bb} BB`);
      } else if (action.amount_bb > actorState.stack_remaining_bb) {
        errors.push("Bet > stack restant");
      }
      break;

    case "raise_to": {
      if (state.street_state.current_bet_bb === 0) {
        errors.push("Raise impossible, personne n'a misé (utilisez bet)");
      } else {
        const minRaise = state.derived.min_raise_to_bb;
        const maxRaise = actorState.invested_this_street_bb + actorState.stack_remaining_bb;
        if (action.amount_bb == null) {
          errors.push("Montant requis pour raise_to");
        } else if (action.amount_bb < (minRaise ?? 0) && action.amount_bb < maxRaise) {
          errors.push(`Raise minimum = ${minRaise} BB`);
        } else if (action.amount_bb > maxRaise) {
          errors.push("Raise > stack total");
        }
      }
      break;
    }

    case "call":
      if (state.derived.to_call_bb === 0) {
        errors.push("Rien à caller (utilisez check)");
      }
      break;

    case "all_in":
      if (actorState.stack_remaining_bb === 0) {
        errors.push("Déjà all-in");
      }
      break;
  }

  if (action.amount_bb != null && action.amount_bb <= 0 && action.type !== "check" && action.type !== "fold") {
    errors.push("Montant invalide");
  }

  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════
// applyAction
// ═══════════════════════════════════════════════

export function applyAction(state: GameState, action: Action): GameState {
  const next = structuredClone(state) as GameState;
  const actor = getPlayerMut(next, action.actor);
  let appliedAction = { ...action };

  switch (action.type) {
    case "check":
      next.street_state.num_actions += 1;
      break;

    case "fold":
      actor.has_folded = true;
      next.hand_status = "completed_fold";
      next.street_state.num_actions += 1;
      break;

    case "bet": {
      let amount = action.amount_bb!;
      if (amount >= actor.stack_remaining_bb) {
        amount = actor.stack_remaining_bb;
        appliedAction = { ...appliedAction, amount_bb: amount, is_all_in: true };
        actor.is_all_in = true;
      }
      actor.stack_remaining_bb -= amount;
      actor.invested_this_street_bb += amount;
      actor.invested_total_bb += amount;
      next.street_state.previous_bet_bb = next.street_state.current_bet_bb;
      next.street_state.current_bet_bb = actor.invested_this_street_bb;
      next.street_state.num_actions += 1;
      break;
    }

    case "call": {
      let callAmount = Math.min(
        next.street_state.current_bet_bb - actor.invested_this_street_bb,
        actor.stack_remaining_bb,
      );
      callAmount = Math.max(0, callAmount);
      if (callAmount >= actor.stack_remaining_bb) {
        actor.is_all_in = true;
        appliedAction = { ...appliedAction, is_all_in: true };
      }
      actor.stack_remaining_bb -= callAmount;
      actor.invested_this_street_bb += callAmount;
      actor.invested_total_bb += callAmount;
      next.street_state.num_actions += 1;
      break;
    }

    case "raise_to": {
      let raiseToTotal = action.amount_bb!;
      let cost = raiseToTotal - actor.invested_this_street_bb;
      if (cost >= actor.stack_remaining_bb) {
        cost = actor.stack_remaining_bb;
        raiseToTotal = actor.invested_this_street_bb + cost;
        actor.is_all_in = true;
        appliedAction = { ...appliedAction, amount_bb: raiseToTotal, is_all_in: true };
      }
      actor.stack_remaining_bb -= cost;
      actor.invested_this_street_bb = raiseToTotal;
      actor.invested_total_bb += cost;
      next.street_state.previous_bet_bb = next.street_state.current_bet_bb;
      next.street_state.current_bet_bb = raiseToTotal;
      next.street_state.num_actions += 1;
      break;
    }

    case "all_in": {
      const remaining = actor.stack_remaining_bb;
      actor.invested_this_street_bb += remaining;
      actor.invested_total_bb += remaining;
      actor.stack_remaining_bb = 0;
      actor.is_all_in = true;
      if (actor.invested_this_street_bb > next.street_state.current_bet_bb) {
        next.street_state.previous_bet_bb = next.street_state.current_bet_bb;
        next.street_state.current_bet_bb = actor.invested_this_street_bb;
      }
      next.street_state.num_actions += 1;
      appliedAction = { ...appliedAction, amount_bb: actor.invested_this_street_bb, is_all_in: true };
      break;
    }
  }

  // Add action to log
  next.actions = [...next.actions, appliedAction];

  // Resolve next actor
  if (next.hand_status !== "completed_fold") {
    resolveNextActor(next, appliedAction);
  }

  next.derived = recalcDerived(next);
  assertInvariants(next);
  return next;
}

function resolveNextActor(state: GameState, lastAction: Action): void {
  const opponent = otherActor(lastAction.actor);
  const opponentState = getPlayerMut(state, opponent);
  const actorState = getPlayerMut(state, lastAction.actor);

  // Opponent folded or all-in
  if (opponentState.has_folded) {
    state.street_state.is_closed = true;
    state.hand_status = "completed_fold";
    return;
  }

  if (opponentState.is_all_in) {
    state.street_state.is_closed = true;
    if (actorState.is_all_in) {
      state.hand_status = "completed_allin_runout";
    }
    return;
  }

  // Actor is all-in → opponent must respond
  if (actorState.is_all_in) {
    state.expected_actor = opponent;
    return;
  }

  switch (lastAction.type) {
    case "check":
      if (state.current_street === "preflop") {
        // BB check closes preflop (option)
        if (lastAction.actor === getBBPlayer(state)) {
          state.street_state.is_closed = true;
          return;
        }
      } else {
        // Postflop: check-check (2 actions) closes
        if (state.street_state.num_actions >= 2) {
          state.street_state.is_closed = true;
          return;
        }
      }
      state.expected_actor = opponent;
      break;

    case "call":
      // Preflop SB limp: BB still has option (first voluntary action on this street)
      if (
        state.current_street === "preflop" &&
        state.street_state.num_actions === 1 &&
        lastAction.actor === getSBPlayer(state)
      ) {
        state.expected_actor = opponent;
        break;
      }
      // Otherwise, a call always closes the street
      state.street_state.is_closed = true;
      // Check if both all-in after call
      if (actorState.is_all_in && opponentState.is_all_in) {
        state.hand_status = "completed_allin_runout";
      }
      break;

    case "bet":
    case "raise_to":
    case "all_in":
      state.expected_actor = opponent;
      break;

    case "fold":
      // Already handled above
      break;
  }
}

// ═══════════════════════════════════════════════
// recalcDerived
// ═══════════════════════════════════════════════

export function recalcDerived(state: GameState): Derived {
  const pot_bb = state.hero.invested_total_bb + state.villain.invested_total_bb;

  let to_call_bb = 0;
  if (state.hand_status === "in_progress") {
    const actor = getPlayer(state, state.expected_actor);
    to_call_bb = Math.max(0, state.street_state.current_bet_bb - actor.invested_this_street_bb);
    to_call_bb = Math.min(to_call_bb, actor.stack_remaining_bb);
  }

  const pot_odds_pct = to_call_bb > 0
    ? Math.round((to_call_bb / (pot_bb + to_call_bb)) * 1000) / 10
    : null;

  const effective_stack_bb = Math.min(state.hero.stack_remaining_bb, state.villain.stack_remaining_bb);
  const spr = pot_bb > 0
    ? Math.round((effective_stack_bb / pot_bb) * 10) / 10
    : null;

  let min_raise_to_bb: number | null = null;
  if (state.hand_status === "in_progress" && state.street_state.current_bet_bb > 0) {
    const lastIncrement = state.street_state.current_bet_bb - state.street_state.previous_bet_bb;
    const minIncrement = Math.max(lastIncrement, state.config.bb_bb);
    min_raise_to_bb = state.street_state.current_bet_bb + minIncrement;

    const actor = getPlayer(state, state.expected_actor);
    const maxRaiseTo = actor.invested_this_street_bb + actor.stack_remaining_bb;
    if (min_raise_to_bb > maxRaiseTo) {
      min_raise_to_bb = maxRaiseTo;
    }
  }

  const pot_for_sizing_bb = pot_bb + to_call_bb;

  return { pot_bb, to_call_bb, pot_odds_pct, spr, effective_stack_bb, min_raise_to_bb, pot_for_sizing_bb };
}

// ═══════════════════════════════════════════════
// advanceStreet
// ═══════════════════════════════════════════════

export function advanceStreet(state: GameState, newStreet: Street, boardCards?: string[]): GameState {
  const next = structuredClone(state) as GameState;

  // Reset invested_this_street
  next.hero.invested_this_street_bb = 0;
  next.villain.invested_this_street_bb = 0;

  next.current_street = newStreet;
  next.street_state = {
    street: newStreet,
    current_bet_bb: 0,
    previous_bet_bb: 0,
    num_actions: 0,
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

  // Both all-in → auto-close
  if (next.hero.is_all_in && next.villain.is_all_in) {
    next.street_state.is_closed = true;
    next.hand_status = "completed_allin_runout";
  } else {
    // Postflop: BB (OOP) acts first
    const bbActor = getBBPlayer(next);
    const sbActor = otherActor(bbActor);

    if (getPlayer(next, bbActor).is_all_in) {
      next.expected_actor = sbActor;
    } else {
      next.expected_actor = bbActor;
    }
  }

  next.derived = recalcDerived(next);
  return next;
}

// ═══════════════════════════════════════════════
// Invariant checks (dev only)
// ═══════════════════════════════════════════════

function assertInvariants(state: GameState): void {
  if (import.meta.env.DEV) {
    const heroTotal = state.hero.invested_total_bb + state.hero.stack_remaining_bb;
    const villainTotal = state.villain.invested_total_bb + state.villain.stack_remaining_bb;
    const pot = state.hero.invested_total_bb + state.villain.invested_total_bb;

    console.assert(
      Math.abs(heroTotal - state.config.hero_stack_bb) < 0.001,
      `INV-03: hero total ${heroTotal} != ${state.config.hero_stack_bb}`,
    );
    console.assert(
      Math.abs(villainTotal - state.config.villain_stack_bb) < 0.001,
      `INV-04: villain total ${villainTotal} != ${state.config.villain_stack_bb}`,
    );
    console.assert(
      Math.abs(pot - state.derived.pot_bb) < 0.001,
      `INV-05: pot ${pot} != derived ${state.derived.pot_bb}`,
    );
    console.assert(state.hero.stack_remaining_bb >= 0, "INV-01: hero stack < 0");
    console.assert(state.villain.stack_remaining_bb >= 0, "INV-02: villain stack < 0");
    console.assert(state.derived.to_call_bb >= 0, "INV-06: to_call < 0");
  }
}

function getBBPlayer(state: GameState): "hero" | "villain" {
  return state.config.hero_position === "BB" ? "hero" : "villain";
}
