import { describe, it, expect } from 'vitest';
import { nanoid } from 'nanoid';
import { freshState, act, advance, makeConfig } from './helpers';
import { createInitialState, validateAction, applyAction } from '@/engine/engine';
import { undoAction } from '@/engine/undo';
import type { Action } from '@/engine/types';

describe('Edge Cases', () => {

  // ─── EC-1: Min-raise validation — refuses raise below minimum ───
  it('EC-1: rejects raise_to below min_raise', () => {
    let s = freshState();
    // Hero raise_to 2.5 → current_bet=2.5, previous=0.5
    s = act(s, 'raise_to', 2.5);
    // previous_bet was 1.0 (BB), current_bet now 2.5
    // min_raise = 2.5 + max(2.5-1.0, 1) = 2.5 + 1.5 = 4.0
    expect(s.derived.min_raise_to_bb).toBe(4.0);

    const result = validateAction(s, { actor: 'villain', type: 'raise_to', amount_bb: 3.0 });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // ─── EC-2: Bet > stack caps to all-in ───
  it('EC-2: bet exceeding stack becomes all-in', () => {
    let s = freshState({ hero_stack_bb: 5, villain_stack_bb: 5 });
    // Hero raise_to 2.5, villain call → pot=5, flop
    s = act(s, 'raise_to', 2.5);
    s = act(s, 'call');
    s = advance(s, ['Ah', 'Kd', '9c']);

    // Villain (BB) bets 3, but only has 2.5 remaining → should become all-in
    const heroRemaining = s.villain.stack_remaining_bb; // 2.5
    s = act(s, 'bet', 3); // capped to 2.5
    expect(s.villain.stack_remaining_bb).toBe(0);
    expect(s.villain.is_all_in).toBe(true);
  });

  // ─── EC-3: Shove partiel (short stack all-in, less than a call) ───
  it('EC-3: short-stack all-in for less than a full call', () => {
    // Hero has 2bb, villain has 50bb
    let s = freshState({ hero_stack_bb: 2, villain_stack_bb: 50 });
    // Hero posted 0.5, has 1.5 left. Hero goes all-in
    s = act(s, 'all_in');
    expect(s.hero.stack_remaining_bb).toBe(0);
    expect(s.hero.is_all_in).toBe(true);
    expect(s.derived.pot_bb).toBe(3.0); // 2 (hero total) + 1 (villain BB)
    // Villain can call or fold
    expect(s.expected_actor).toBe('villain');
  });

  // ─── EC-4: Limp recalculation ───
  it('EC-4: limp gives BB the option, pot=2.0 after limp', () => {
    let s = freshState();
    s = act(s, 'call'); // SB limp
    expect(s.derived.pot_bb).toBe(2.0);
    expect(s.derived.to_call_bb).toBe(0); // BB has no amount to call
    expect(s.street_state.is_closed).toBe(false);
    expect(s.expected_actor).toBe('villain'); // BB option
  });

  // ─── EC-5: Undo after all-in ───
  it('EC-5: undo reverts all-in correctly', () => {
    let s = freshState();
    s = act(s, 'all_in'); // Hero shoves
    expect(s.hero.is_all_in).toBe(true);

    const { newState } = undoAction(s);
    expect(newState.hero.is_all_in).toBe(false);
    expect(newState.hero.stack_remaining_bb).toBe(49.5); // 50 - 0.5 SB
    expect(newState.derived.pot_bb).toBe(1.5);
  });

  // ─── EC-6: Undo multi-steps across street change ───
  it('EC-6: undo across streets replays correctly', () => {
    let s = freshState();
    // Preflop: raise, call
    s = act(s, 'raise_to', 2.5);
    s = act(s, 'call');
    s = advance(s, ['Ah', 'Kd', '9c']);
    // Flop: villain bet 3
    s = act(s, 'bet', 3);
    expect(s.derived.pot_bb).toBe(8.0);

    // Undo the flop bet → replays only preflop actions (raise+call), lands on preflop closed
    const { newState: s2 } = undoAction(s);
    expect(s2.derived.pot_bb).toBe(5.0);
    // Undo replays voluntary actions; since advance isn't an action, we're back at preflop end
    expect(s2.current_street).toBe('preflop');
    expect(s2.street_state.is_closed).toBe(true);

    // Undo the call (back to hero raise only)
    const { newState: s3 } = undoAction(s2);
    expect(s3.derived.pot_bb).toBe(3.5);
    expect(s3.current_street).toBe('preflop');
  });

  // ─── EC-7: Reset contributions per street ───
  it('EC-7: advanceStreet resets invested_this_street to 0', () => {
    let s = freshState();
    s = act(s, 'raise_to', 2.5);
    s = act(s, 'call');
    expect(s.hero.invested_this_street_bb).toBe(2.5);
    expect(s.villain.invested_this_street_bb).toBe(2.5);

    s = advance(s, ['Ah', 'Kd', '9c']);
    expect(s.hero.invested_this_street_bb).toBe(0);
    expect(s.villain.invested_this_street_bb).toBe(0);
    expect(s.street_state.current_bet_bb).toBe(0);
  });

  // ─── EC-8: to_call never negative ───
  it('EC-8: to_call_bb is never negative', () => {
    let s = freshState();
    expect(s.derived.to_call_bb).toBeGreaterThanOrEqual(0);

    s = act(s, 'raise_to', 2.5);
    expect(s.derived.to_call_bb).toBeGreaterThanOrEqual(0);

    s = act(s, 'call');
    expect(s.derived.to_call_bb).toBeGreaterThanOrEqual(0);

    s = advance(s, ['Ah', 'Kd', '9c']);
    expect(s.derived.to_call_bb).toBe(0);

    s = act(s, 'check');
    expect(s.derived.to_call_bb).toBeGreaterThanOrEqual(0);
  });

  // ─── EC-9: Board does not influence pot/to_call ───
  it('EC-9: board cards have no effect on pot or to_call', () => {
    let s = freshState();
    s = act(s, 'raise_to', 2.5);
    s = act(s, 'call');
    const potBefore = s.derived.pot_bb;

    s = advance(s, ['Ah', 'Kd', '9c']);
    expect(s.derived.pot_bb).toBe(potBefore);

    s = act(s, 'check');
    s = act(s, 'check');
    s = advance(s, ['5s']);
    expect(s.derived.pot_bb).toBe(potBefore);
  });

  // ─── EC-10: Redo stack cleared on new action ───
  it('EC-10: redo stack cleared after new action', () => {
    let s = freshState();
    s = act(s, 'raise_to', 2.5);
    s = act(s, 'call');

    // Undo
    const { newState: undone, undoneAction } = undoAction(s);
    expect(undoneAction).not.toBeNull();
    // The redo stack is managed by the store, but we can verify undo gives us the action back
    expect(undoneAction!.type).toBe('call');

    // New action on the undone state (fold instead of call)
    const s2 = act(undone, 'fold');
    expect(s2.hand_status).toBe('completed_fold');
    // If we undo and redo was managed by store, verifying engine-level:
    // the old "call" action is gone from the action log
    const voluntaryActions = s2.actions.filter(a => a.type !== 'post_sb' && a.type !== 'post_bb');
    expect(voluntaryActions.map(a => a.type)).toEqual(['raise_to', 'fold']);
  });

  // ─── EC-11: Validate rejects check when to_call > 0 ───
  it('EC-11: cannot check when there is an amount to call', () => {
    let s = freshState();
    s = act(s, 'raise_to', 2.5);
    // Villain must call/fold/raise, not check
    const result = validateAction(s, { actor: 'villain', type: 'check' });
    expect(result.valid).toBe(false);
  });

  // ─── EC-12: Validate rejects action from wrong actor ───
  it('EC-12: rejects action from wrong actor', () => {
    const s = freshState(); // hero's turn
    const result = validateAction(s, { actor: 'villain', type: 'check' });
    expect(result.valid).toBe(false);
  });
});
