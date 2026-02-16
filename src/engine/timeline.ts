/**
 * Timeline replay: rebuilds GameState from a sequence of TimelineEvents.
 * Used by undo/redo to guarantee board + street consistency.
 */

import type { GameState, TimelineEvent, Street, GameConfig } from './types';
import { createInitialState, applyAction, advanceStreet } from './engine';

/**
 * Extract stable player IDs from the first state's players for deterministic replay.
 */
function extractPlayerIds(events: readonly TimelineEvent[]): string[] | undefined {
  // We can't extract from events alone - caller must provide config context
  return undefined;
}

/**
 * Replay a list of timeline events from a fresh initial state.
 * playerIds: stable IDs to ensure replay determinism.
 */
export function replayTimeline(
  config: GameConfig,
  handNumber: number,
  events: readonly TimelineEvent[],
  playerIds?: string[],
): GameState {
  let state = createInitialState(config, handNumber, playerIds);

  for (const event of events) {
    switch (event.kind) {
      case 'action':
        state = applyAction(state, event.action);
        break;
      case 'advance_street':
        state = advanceStreet(state, event.street, event.boardCards);
        break;
      case 'set_board_card':
        state = applySetBoardCard(state, event.card);
        break;
      case 'set_board':
        state = applySetBoard(state, event.street, event.cards);
        break;
      case 'set_hero_cards':
        state = { ...state, hero_cards: event.cards };
        break;
    }
  }

  return state;
}

function applySetBoardCard(state: GameState, card: string): GameState {
  const street = state.current_street;
  const newBoard = { ...state.board };

  if (street === 'preflop' || street === 'flop') {
    const flop = [...newBoard.flop] as [string | null, string | null, string | null];
    const emptyIdx = flop.findIndex(c => c === null);
    if (emptyIdx === -1) return state;
    flop[emptyIdx] = card;
    newBoard.flop = flop;
  } else if (street === 'turn') {
    if (newBoard.turn !== null) return state;
    newBoard.turn = card;
  } else if (street === 'river') {
    if (newBoard.river !== null) return state;
    newBoard.river = card;
  }

  return { ...state, board: newBoard };
}

function applySetBoard(state: GameState, street: Street, cards: string[]): GameState {
  const newBoard = { ...state.board };
  if (street === 'flop') {
    const newFlop: [string | null, string | null, string | null] = [...newBoard.flop];
    cards.forEach((c, i) => { if (i < 3) newFlop[i] = c; });
    newBoard.flop = newFlop;
  } else if (street === 'turn' && cards.length >= 1) {
    newBoard.turn = cards[0];
  } else if (street === 'river' && cards.length >= 1) {
    newBoard.river = cards[0];
  }
  return { ...state, board: newBoard };
}
