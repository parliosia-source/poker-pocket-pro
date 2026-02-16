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
    // Most recent first
    expect(history[0].id).toBe(209);
    // Oldest kept
    expect(history[199].id).toBe(10);
  });

  it('keeps most recent entries when capped', () => {
    let history: HandSnapshot[] = [];
    for (let i = 0; i < 205; i++) {
      history = addToHistory(history, makeSnapshot(i));
    }
    // id 0..4 should be evicted
    const ids = history.map(h => h.id);
    expect(ids).not.toContain(0);
    expect(ids).not.toContain(4);
    expect(ids).toContain(204);
  });
});

describe('snapshotFromState', () => {
  const config: GameConfig = {
    sb_bb: 0.5,
    bb_bb: 1,
    hero_position: 'SB',
    hero_stack_bb: 50,
    villain_stack_bb: 50,
  };

  it('produces a snapshot with correct basics', () => {
    const state = createInitialState(config, 7);
    state.hero_cards = ['Ah', 'Kd'];
    const snap = snapshotFromState(state, 5);

    expect(snap.id).toBe(7);
    expect(snap.heroPosition).toBe('SB');
    expect(snap.heroCards).toEqual(['Ah', 'Kd']);
    expect(snap.result_bb).toBe(5);
    expect(snap.endedBy).toBe('manual'); // in_progress → manual
    expect(snap.ts).toBeGreaterThan(0);
  });

  it('captures board cards', () => {
    const state = createInitialState(config);
    state.board.flop = ['Ts', '9h', '2d'];
    state.board.turn = 'Jc';
    state.board.river = null;
    const snap = snapshotFromState(state, 0);
    expect(snap.board).toEqual(['Ts', '9h', '2d', 'Jc']);
  });

  it('records endedBy fold', () => {
    const state = createInitialState(config);
    state.hand_status = 'completed_fold';
    const snap = snapshotFromState(state, -1);
    expect(snap.endedBy).toBe('fold');
  });

  it('records endedBy showdown', () => {
    const state = createInitialState(config);
    state.hand_status = 'completed_showdown';
    const snap = snapshotFromState(state, 10);
    expect(snap.endedBy).toBe('showdown');
  });

  it('counts only voluntary actions', () => {
    const state = createInitialState(config);
    // Initial state has 2 actions: post_sb and post_bb
    const snap = snapshotFromState(state, 0);
    expect(snap.actionsCount).toBe(0); // no voluntary actions
  });

  it('captures pot_bb from derived', () => {
    const state = createInitialState(config);
    // After blinds: pot = 0.5 + 1 = 1.5
    const snap = snapshotFromState(state, 0);
    expect(snap.pot_bb).toBe(1.5);
  });
});
