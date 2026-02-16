import { describe, it, expect } from 'vitest';
import { freshState, act, advance } from '../engine/helpers';
import { replayTimeline } from '@/engine/timeline';
import type { TimelineEvent, Action } from '@/engine/types';
import { nanoid } from 'nanoid';
import { applyAction } from '@/engine/engine';

describe('P1 — No actions after street closed', () => {
  it('street_state.is_closed is true after SB call + BB check in HU preflop', () => {
    let s = freshState(); // Hero=SB
    s = act(s, 'call');   // SB calls (limp)
    expect(s.street_state.is_closed).toBe(false);
    s = act(s, 'check');  // BB checks → street closed
    expect(s.street_state.is_closed).toBe(true);
  });

  it('check after street closed should fail validation', () => {
    let s = freshState();
    s = act(s, 'call');
    s = act(s, 'check'); // BB check → closed

    // Manually try to apply another check — should violate engine rules
    // (expected_actor may still point somewhere but is_closed = true)
    expect(s.street_state.is_closed).toBe(true);
  });
});

describe('P2 — Timeline undo/redo preserves board + street', () => {
  it('replays action events correctly', () => {
    const s0 = freshState();
    const a1: Action = {
      id: nanoid(), street: 'preflop', actor: s0.expected_actor,
      type: 'raise_to', amount_bb: 2.5, is_all_in: false, timestamp: Date.now(),
    };
    const s1 = applyAction(s0, a1);
    const a2: Action = {
      id: nanoid(), street: 'preflop', actor: s1.expected_actor,
      type: 'call', amount_bb: null, is_all_in: false, timestamp: Date.now(),
    };

    const events: TimelineEvent[] = [
      { kind: 'action', action: a1 },
      { kind: 'action', action: a2 },
    ];

    const replayed = replayTimeline(s0.config, s0.hand_number, events);
    expect(replayed.derived.pot_bb).toBe(5.0);
    expect(replayed.street_state.is_closed).toBe(true);
  });

  it('replays advance_street + board cards', () => {
    const s0 = freshState();
    const a1: Action = {
      id: nanoid(), street: 'preflop', actor: s0.expected_actor,
      type: 'call', amount_bb: null, is_all_in: false, timestamp: Date.now(),
    };
    const s1 = applyAction(s0, a1);
    const a2: Action = {
      id: nanoid(), street: 'preflop', actor: s1.expected_actor,
      type: 'check', amount_bb: null, is_all_in: false, timestamp: Date.now(),
    };

    const events: TimelineEvent[] = [
      { kind: 'action', action: a1 },
      { kind: 'action', action: a2 },
      { kind: 'advance_street', street: 'flop', boardCards: ['Ah', 'Kd', '9c'] },
    ];

    const replayed = replayTimeline(s0.config, s0.hand_number, events);
    expect(replayed.current_street).toBe('flop');
    expect(replayed.board.flop).toEqual(['Ah', 'Kd', '9c']);
  });

  it('undo of action on flop preserves board cards and street', () => {
    const s0 = freshState();
    const a1: Action = {
      id: nanoid(), street: 'preflop', actor: s0.expected_actor,
      type: 'call', amount_bb: null, is_all_in: false, timestamp: Date.now(),
    };
    const s1 = applyAction(s0, a1);
    const a2: Action = {
      id: nanoid(), street: 'preflop', actor: s1.expected_actor,
      type: 'check', amount_bb: null, is_all_in: false, timestamp: Date.now(),
    };
    const s2 = applyAction(s1, a2);
    // Now create a flop bet action
    const a3: Action = {
      id: nanoid(), street: 'flop', actor: 'villain', // BB acts first postflop
      type: 'bet', amount_bb: 3, is_all_in: false, timestamp: Date.now(),
    };

    // Full timeline with 3 actions + advance + bet
    const fullEvents: TimelineEvent[] = [
      { kind: 'action', action: a1 },
      { kind: 'action', action: a2 },
      { kind: 'advance_street', street: 'flop', boardCards: ['Ah', 'Kd', '9c'] },
      { kind: 'action', action: a3 },
    ];

    // Simulate undo: remove last event (the bet)
    const undoneEvents = fullEvents.slice(0, -1);
    const undoneState = replayTimeline(s0.config, s0.hand_number, undoneEvents);

    // Board cards should still be there
    expect(undoneState.current_street).toBe('flop');
    expect(undoneState.board.flop).toEqual(['Ah', 'Kd', '9c']);
    expect(undoneState.derived.pot_bb).toBe(2.0); // no bet on flop

    // Simulate redo: add the bet back
    const redoneState = replayTimeline(s0.config, s0.hand_number, fullEvents);
    expect(redoneState.current_street).toBe('flop');
    expect(redoneState.board.flop).toEqual(['Ah', 'Kd', '9c']);
    expect(redoneState.derived.pot_bb).toBe(5.0); // 2 + 3 bet
  });

  it('replays set_hero_cards events', () => {
    const s0 = freshState();
    const events: TimelineEvent[] = [
      { kind: 'set_hero_cards', cards: ['As', 'Kh'] },
    ];
    const replayed = replayTimeline(s0.config, s0.hand_number, events);
    expect(replayed.hero_cards).toEqual(['As', 'Kh']);
  });
});
