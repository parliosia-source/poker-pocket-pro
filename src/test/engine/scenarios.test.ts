import { describe, it, expect } from 'vitest';
import { freshState, act, advance, makeConfig } from './helpers';
import { createInitialState } from '@/engine/engine';

describe('Engine Scenarios — exact pot values', () => {

  // ─── Scenario 1: Open 2.5 / call → pot=5.0 ─────────────────
  it('S1: Hero SB raise_to 2.5, Villain call → pot=5.0', () => {
    let s = freshState(); // Hero=SB, 50bb
    // Initial: hero posted 0.5, villain posted 1.0, pot=1.5
    expect(s.derived.pot_bb).toBe(1.5);
    expect(s.expected_actor).toBe('hero');

    // Hero raise_to 2.5
    s = act(s, 'raise_to', 2.5);
    expect(s.derived.pot_bb).toBe(3.5); // 2.5 + 1.0
    expect(s.expected_actor).toBe('villain');

    // Villain call
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(5.0);
    expect(s.street_state.is_closed).toBe(true);
  });

  // ─── Scenario 2: Open / 3bet / fold → pot=10.5 ─────────────
  it('S2: Hero raise 2.5, Villain 3bet to 8, Hero fold → pot=10.5', () => {
    let s = freshState();

    s = act(s, 'raise_to', 2.5);
    expect(s.derived.pot_bb).toBe(3.5);

    s = act(s, 'raise_to', 8);
    expect(s.derived.pot_bb).toBe(10.5); // 2.5 + 8
    expect(s.expected_actor).toBe('hero');

    s = act(s, 'fold');
    expect(s.derived.pot_bb).toBe(10.5);
    expect(s.hand_status).toBe('completed_fold');
  });

  // ─── Scenario 3: Open / 3bet / call + flop cbet / call → pot=22.0 ──
  it('S3: Preflop raise/3bet/call=16, flop bet 3/call → pot=22.0', () => {
    let s = freshState();

    // Preflop
    s = act(s, 'raise_to', 2.5);
    s = act(s, 'raise_to', 8);
    s = act(s, 'call'); // hero calls 8
    expect(s.derived.pot_bb).toBe(16.0);
    expect(s.street_state.is_closed).toBe(true);

    // Advance to flop
    s = advance(s, ['Ah', 'Kd', '9c']);
    expect(s.derived.pot_bb).toBe(16.0);
    expect(s.current_street).toBe('flop');
    // BB acts first postflop (villain is BB when hero=SB)
    expect(s.expected_actor).toBe('villain');

    // Villain bet 3
    s = act(s, 'bet', 3);
    expect(s.derived.pot_bb).toBe(19.0);

    // Hero call
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(22.0);
    expect(s.street_state.is_closed).toBe(true);
  });

  // ─── Scenario 4: Limp / raise-to 4 / call → pot=8.0 ───────
  it('S4: Hero SB limp, Villain raise to 4, Hero call → pot=8.0', () => {
    let s = freshState();
    expect(s.expected_actor).toBe('hero');

    // Hero limps (call the BB)
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(2.0);
    // BB still has option
    expect(s.street_state.is_closed).toBe(false);
    expect(s.expected_actor).toBe('villain');

    // Villain raises to 4
    s = act(s, 'raise_to', 4);
    expect(s.derived.pot_bb).toBe(5.0); // 1.0 (hero) + 4.0 (villain)
    expect(s.expected_actor).toBe('hero');

    // Hero calls
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(8.0);
    expect(s.street_state.is_closed).toBe(true);
  });

  // ─── Scenario 5: Flop bet / raise-to / call → pot=17.0 ────
  it('S5: Preflop 2.5/call=5; Flop V bet 2, H raise 6, V call → pot=17.0', () => {
    let s = freshState();

    // Preflop: open 2.5, call
    s = act(s, 'raise_to', 2.5);
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(5.0);

    // Flop
    s = advance(s, ['Jh', '7d', '2c']);
    expect(s.expected_actor).toBe('villain'); // BB = OOP

    // Villain bet 2
    s = act(s, 'bet', 2);
    expect(s.derived.pot_bb).toBe(7.0);

    // Hero raise_to 6: pot = (2.5+6) + (2.5+2) = 13
    s = act(s, 'raise_to', 6);
    expect(s.derived.pot_bb).toBe(13.0);

    // Villain call (to_call = 6-2 = 4)
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(17.0); // (2.5+6) + (2.5+6) = 17
    expect(s.street_state.is_closed).toBe(true);
  });

  // ─── Scenario 6: All-in on turn → pot=45.0 ────────────────
  it('S6: 22.5bb stacks, preflop 2.5/call=5, flop check/check, turn all-in/call → pot=45.0', () => {
    let s = freshState({ hero_stack_bb: 22.5, villain_stack_bb: 22.5 });
    expect(s.derived.pot_bb).toBe(1.5);

    // Preflop
    s = act(s, 'raise_to', 2.5);
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(5.0);

    // Flop: check/check
    s = advance(s, ['Ah', 'Kd', '9c']);
    s = act(s, 'check'); // villain (BB, OOP)
    s = act(s, 'check'); // hero
    expect(s.derived.pot_bb).toBe(5.0);
    expect(s.street_state.is_closed).toBe(true);

    // Turn: hero all-in (remaining = 22.5 - 2.5 = 20)
    s = advance(s, ['5s']);
    // Postflop BB acts first
    expect(s.expected_actor).toBe('villain');

    // Villain all-in (20 remaining)
    s = act(s, 'all_in');
    expect(s.derived.pot_bb).toBe(25.0); // 5 + 20

    // Hero call
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(45.0); // 5 + 20 + 20
    expect(s.street_state.is_closed).toBe(true);
  });
});
