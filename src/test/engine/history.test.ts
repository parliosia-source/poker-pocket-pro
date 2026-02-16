import { describe, it, expect } from 'vitest';
import { addToHistory, snapshotFromState, type HandSnapshot } from '@/engine/history';
import { createInitialState } from '@/engine/engine';
import type { GameConfig } from '@/engine/types';

function makeSnapshot(id: number, overrides: Partial<HandSnapshot> = {}): HandSnapshot {
  return {
    id,
    ts: Date.now(),
    heroPosition: 'SB',
    heroCards: ['As', 'Kh'],
    board: [],
    pot_bb: 2,
    actionsCount: 0,
    result_bb: 0,
    endedBy: 'manual',
    playersCount: 2,
    ...overrides,
  };
}

describe('addToHistory', () => {
  it('prepends new snapshot', () => {
    const h = addToHistory([], makeSnapshot(1));
    expect(h).toHaveLength(1);
    expect(h[0].id).toBe(1);
  });

  it('caps at 200 entries (FIFO)', () => {
    let history: HandSnapshot[] = [];
    for (let i = 0; i < 210; i++) {
      history = addToHistory(history, makeSnapshot(i));
    }
    expect(history).toHaveLength(200);
    expect(history[0].id).toBe(209);
    expect(history[199].id).toBe(10);
  });
});

describe('snapshotFromState', () => {
  const config: GameConfig = {
    sb_bb: 0.5,
    bb_bb: 1,
    table_size: 2,
    btn_seat_index: 0,
    players_config: [
      { seat_index: 0, label: 'Hero', is_hero: true, stack_bb: 50 },
      { seat_index: 1, label: 'V1', is_hero: false, stack_bb: 50 },
    ],
  };

  it('produces a snapshot with correct basics', () => {
    const state = createInitialState(config, 7);
    state.hero_cards = ['Ah', 'Kd'];
    const snap = snapshotFromState(state, 5);

    expect(snap.id).toBe(7);
    expect(snap.heroCards).toEqual(['Ah', 'Kd']);
    expect(snap.result_bb).toBe(5);
    expect(snap.endedBy).toBe('manual');
    expect(snap.playersCount).toBe(2);
  });

  it('captures board cards', () => {
    const state = createInitialState(config);
    state.board.flop = ['Ts', '9h', '2d'];
    state.board.turn = 'Jc';
    const snap = snapshotFromState(state, 0);
    expect(snap.board).toEqual(['Ts', '9h', '2d', 'Jc']);
  });

  it('captures pot_bb from derived', () => {
    const state = createInitialState(config);
    const snap = snapshotFromState(state, 0);
    expect(snap.pot_bb).toBe(1.5);
  });
});
