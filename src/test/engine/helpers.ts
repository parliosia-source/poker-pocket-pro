import { nanoid } from 'nanoid';
import type { GameState, GameConfig, Action, ActionType, Street } from '@/engine/types';
import { createInitialState, applyAction, advanceStreet } from '@/engine/engine';

/** Standard HU config: Hero=SB, 50bb stacks */
export const DEFAULT_CONFIG: GameConfig = {
  sb_bb: 0.5,
  bb_bb: 1,
  hero_position: "SB",
  hero_stack_bb: 50,
  villain_stack_bb: 50,
};

export function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

export function act(state: GameState, type: ActionType, amount_bb?: number): GameState {
  const action: Action = {
    id: nanoid(),
    street: state.current_street,
    actor: state.expected_actor,
    type,
    amount_bb: amount_bb ?? null,
    is_all_in: type === "all_in",
    timestamp: Date.now(),
  };
  return applyAction(state, action);
}

export function advance(state: GameState, boardCards?: string[]): GameState {
  const streetOrder: Street[] = ["preflop", "flop", "turn", "river"];
  const idx = streetOrder.indexOf(state.current_street);
  if (idx >= streetOrder.length - 1) throw new Error("Cannot advance past river");
  return advanceStreet(state, streetOrder[idx + 1], boardCards);
}

export function freshState(overrides: Partial<GameConfig> = {}): GameState {
  return createInitialState(makeConfig(overrides));
}
