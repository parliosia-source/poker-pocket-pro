import type { GameState } from './types';
import { createInitialState, applyAction, advanceStreet } from './engine';
import { getNextStreet, getBoardCardsForStreet, reconstructBoard } from './utils';

export function undoAction(state: GameState): { newState: GameState; undoneAction: GameState['actions'][number] | null } {
  const voluntaryActions = state.actions.filter(a => a.type !== "post_sb" && a.type !== "post_bb");
  
  if (voluntaryActions.length === 0) {
    return { newState: state, undoneAction: null };
  }

  const lastVoluntary = voluntaryActions[voluntaryActions.length - 1];
  const lastVoluntaryIndex = state.actions.lastIndexOf(lastVoluntary);
  const remainingActions = state.actions.slice(0, lastVoluntaryIndex);
  const actionsToReplay = remainingActions.filter(a => a.type !== "post_sb" && a.type !== "post_bb");

  // Fresh state
  let current = createInitialState(state.config, state.hand_number);
  current.hero_cards = state.hero_cards;
  current.board = { flop: null, turn: null, river: null };

  // Replay
  for (const action of actionsToReplay) {
    while (action.street !== current.current_street) {
      const nextStreet = getNextStreet(current.current_street);
      if (!nextStreet) break;
      const boardCards = getBoardCardsForStreet(state, nextStreet);
      current = advanceStreet(current, nextStreet, boardCards);
    }
    current = applyAction(current, action);
  }

  // Restore board up to current street
  current.board = reconstructBoard(state, current.current_street);

  return { newState: current, undoneAction: lastVoluntary };
}
