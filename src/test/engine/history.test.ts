import { describe, it, expect } from 'vitest';
import { snapshotFromState, addToHistory, type HandSnapshot } from '@/engine/history';
import type { GameState } from '@/engine/types';
import { createInitialState, applyAction, advanceStreet } from '@/engine/engine';
import { nanoid } from 'nanoid';

function makeMinimalState(): GameState {
  return createInitialState({
    sb_bb: 0.5,
    bb_bb: 1,
    hero_position: 'SB',
    hero_stack_bb: 50,
    villain_stack_bb: 50,
  });
}

describe('snapshotFromState', () => {
  it('produces a snapshot with correct defaults', () => {
    const state = makeMinimalState();
    const snap = snapshotFromState(state, 0);
    expect(snap.id).toBe(state.hand_number);
    expect(snap.heroPosition).toBe('SB');
    expect(snap.heroCards).toBeNull();
    expect(snap.board).toEqual([]);
    expect(snap.result_bb).toBe(0);
    expect(snap.endedBy).toBe('manual');
    expect(snap.pot_bb).toBeGreaterThan(0);
  });

  it('captures hero cards and board', () => {
    let state = makeMinimalState();
    state.hero_cards = ['Ah', 'Kd'];
    state = advanceStreet(state, 'flop', ['Ts', '9s', '2d']);
    state = advanceStreet(state, 'turn', ['Jh']);
    const snap = snapshotFromState(state, 5.5);
    expect(snap.heroCards).toEqual(['Ah', 'Kd']);
    expect(snap.board).toEqual(['Ts', '9s', '2d', 'Jh']);
    expect(snap.result_bb).toBe(5.5);
  });

  it('detects fold end', () => {
    let state = makeMinimalState();
    // Hero (SB) folds
    state = applyAction(state, {
      id: nanoid(), street: 'preflop', actor: 'hero', type: 'fold',
      amount_bb: null, is_all_in: false, timestamp: Date.now(),
    });
    const snap = snapshotFromState(state, -0.5);
    expect(snap.endedBy).toBe('fold');
  });

  it('counts only voluntary actions', () => {
    const state = makeMinimalState();
    // Initial state has 2 blind actions (post_sb, post_bb) which are not voluntary
    const snap = snapshotFromState(state, 0);
    expect(snap.actionsCount).toBe(0);
  });
});

describe('addToHistory', () => {
  const makeSnap = (id: number): HandSnapshot => ({
    id, ts: Date.now(), heroPosition: 'SB', heroCards: null,
    board: [], pot_bb: 1.5, actionsCount: 0, result_bb: 0, endedBy: 'manual',
  });

  it('prepends newest first', () => {
    const h = addToHistory([], makeSnap(1));
    const h2 = addToHistory(h, makeSnap(2));
    expect(h2[0].id).toBe(2);
    expect(h2[1].id).toBe(1);
  });

  it('caps at 200 entries', () => {
    let history: HandSnapshot[] = [];
    for (let i = 0; i < 210; i++) {
      history = addToHistory(history, makeSnap(i));
    }
    expect(history.length).toBe(200);
    expect(history[0].id).toBe(209); // most recent
  });

  it('preserves existing entries under cap', () => {
    let history: HandSnapshot[] = [];
    for (let i = 0; i < 5; i++) {
      history = addToHistory(history, makeSnap(i));
    }
    expect(history.length).toBe(5);
  });
});
