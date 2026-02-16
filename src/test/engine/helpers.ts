import { nanoid } from 'nanoid';
import type { GameState, GameConfig, Action, ActionType, Street, PlayerConfig } from '@/engine/types';
import { createInitialState, applyAction, advanceStreet } from '@/engine/engine';

/** Standard HU config: Hero=BTN(SB), 50bb stacks */
export const DEFAULT_CONFIG: GameConfig = {
  sb_bb: 0.5,
  bb_bb: 1,
  table_size: 2,
  btn_seat_index: 0,
  players_config: [
    { seat_index: 0, label: 'Hero', is_hero: true, stack_bb: 50 },
    { seat_index: 1, label: 'V1', is_hero: false, stack_bb: 50 },
  ],
};

export function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

export function make6MaxConfig(heroSeat = 5, stacks = 100): GameConfig {
  const players: PlayerConfig[] = [];
  for (let i = 0; i < 6; i++) {
    players.push({
      seat_index: i,
      label: i === heroSeat ? 'Hero' : `V${i + 1}`,
      is_hero: i === heroSeat,
      stack_bb: stacks,
    });
  }
  return {
    sb_bb: 0.5,
    bb_bb: 1,
    table_size: 6,
    btn_seat_index: 0,
    players_config: players,
  };
}

export function act(state: GameState, type: ActionType, amount_bb?: number): GameState {
  const action: Action = {
    id: nanoid(),
    street: state.current_street,
    player_id: state.expected_actor_id!,
    type,
    amount_bb: amount_bb ?? null,
    is_all_in: type === "all_in",
    timestamp: Date.now(),
  };
  return applyAction(state, action);
}

export function actFor(state: GameState, playerId: string, type: ActionType, amount_bb?: number): GameState {
  const action: Action = {
    id: nanoid(),
    street: state.current_street,
    player_id: playerId,
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

export function fresh6Max(heroSeat = 5, stacks = 100): GameState {
  return createInitialState(make6MaxConfig(heroSeat, stacks));
}

/** Get player by position label from state */
export function getPlayerByPos(state: GameState, pos: string) {
  return state.players.find(p => p.position_label === pos);
}

/** Get hero player from state */
export function getHero(state: GameState) {
  return state.players.find(p => p.is_hero);
}

/** Get villain (first non-hero) from state — for HU tests */
export function getVillain(state: GameState) {
  return state.players.find(p => !p.is_hero);
}
