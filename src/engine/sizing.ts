import type { GameState } from './types';
import { getPlayerById, findHero } from './utils';

export function roundToHalfBB(value: number): number {
  return Math.ceil(value * 2) / 2;
}

export function computeQuickSizing(state: GameState, fraction: number): number {
  if (!state.expected_actor_id) return 0;
  const actor = getPlayerById(state, state.expected_actor_id);
  if (!actor) return 0;

  const { pot_for_sizing_bb, to_call_bb, min_raise_to_bb } = state.derived;
  const maxTotal = actor.invested_this_street_bb + actor.stack_remaining_bb;

  let result: number;
  if (to_call_bb === 0) {
    result = roundToHalfBB(pot_for_sizing_bb * fraction);
    result = Math.max(result, state.config.bb_bb);
  } else {
    result = actor.invested_this_street_bb + to_call_bb + roundToHalfBB(pot_for_sizing_bb * fraction);
    result = roundToHalfBB(result);
    if (min_raise_to_bb !== null) {
      result = Math.max(result, min_raise_to_bb);
    }
  }

  result = Math.min(result, maxTotal);
  return result;
}

export function compute2_2xSizing(state: GameState): number | null {
  if (state.street_state.current_bet_bb === 0 || !state.expected_actor_id) return null;
  const actor = getPlayerById(state, state.expected_actor_id);
  if (!actor) return null;
  const maxTotal = actor.invested_this_street_bb + actor.stack_remaining_bb;
  let result = roundToHalfBB(state.street_state.current_bet_bb * 2.2);
  const min = state.derived.min_raise_to_bb;
  if (min !== null) result = Math.max(result, min);
  return Math.min(result, maxTotal);
}
