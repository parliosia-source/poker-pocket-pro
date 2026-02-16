import type { GameState } from './types';
import { findHero } from './utils';

export interface HandSnapshot {
  id: number;
  ts: number;
  heroPosition: string;
  heroCards: [string, string] | null;
  board: string[];
  pot_bb: number;
  actionsCount: number;
  result_bb: number;
  endedBy: 'fold' | 'showdown' | 'manual';
  playersCount: number;
}

export function snapshotFromState(state: GameState, result_bb: number): HandSnapshot {
  const board: string[] = [];
  state.board.flop.forEach(c => { if (c) board.push(c); });
  if (state.board.turn) board.push(state.board.turn);
  if (state.board.river) board.push(state.board.river);

  const voluntaryActions = state.actions.filter(
    a => a.type !== 'post_sb' && a.type !== 'post_bb'
  );

  let endedBy: HandSnapshot['endedBy'] = 'manual';
  if (state.hand_status === 'completed_fold') endedBy = 'fold';
  else if (state.hand_status === 'completed_showdown' || state.hand_status === 'completed_allin_runout') endedBy = 'showdown';

  const hero = findHero(state);

  return {
    id: state.hand_number,
    ts: Date.now(),
    heroPosition: hero?.position_label ?? '?',
    heroCards: state.hero_cards,
    board,
    pot_bb: state.derived.pot_bb,
    actionsCount: voluntaryActions.length,
    result_bb,
    endedBy,
    playersCount: state.config.table_size,
  };
}

const MAX_HISTORY = 200;

export function addToHistory(history: HandSnapshot[], snapshot: HandSnapshot): HandSnapshot[] {
  const next = [snapshot, ...history];
  if (next.length > MAX_HISTORY) next.length = MAX_HISTORY;
  return next;
}
