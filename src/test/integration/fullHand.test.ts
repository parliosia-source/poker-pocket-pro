import { describe, it, expect } from 'vitest';
import { freshState, act, advance } from '../engine/helpers';

describe('Full Hand Integration — preflop to river', () => {
  it('plays a complete hand through all 4 streets', () => {
    // Hero = SB, 50bb stacks
    let s = freshState();

    // ── PREFLOP ──
    expect(s.current_street).toBe('preflop');
    expect(s.derived.pot_bb).toBe(1.5);

    // Hero open 2.5
    s = act(s, 'raise_to', 2.5);
    expect(s.derived.pot_bb).toBe(3.5);
    expect(s.hero.stack_remaining_bb).toBe(47.5);

    // Villain call
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(5.0);
    expect(s.street_state.is_closed).toBe(true);
    expect(s.hero.invested_total_bb).toBe(2.5);
    expect(s.villain.invested_total_bb).toBe(2.5);

    // ── FLOP ──
    s = advance(s, ['Ah', 'Kd', '9c']);
    expect(s.current_street).toBe('flop');
    expect(s.derived.pot_bb).toBe(5.0);
    expect(s.derived.to_call_bb).toBe(0);
    expect(s.expected_actor).toBe('villain'); // BB = OOP

    // Villain bet 3
    s = act(s, 'bet', 3);
    expect(s.derived.pot_bb).toBe(8.0);
    expect(s.derived.to_call_bb).toBe(3);

    // Hero call
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(11.0);
    expect(s.street_state.is_closed).toBe(true);

    // ── TURN ──
    s = advance(s, ['5s']);
    expect(s.current_street).toBe('turn');
    expect(s.derived.pot_bb).toBe(11.0);
    expect(s.hero.invested_this_street_bb).toBe(0);
    expect(s.villain.invested_this_street_bb).toBe(0);

    // Check-check
    s = act(s, 'check'); // villain
    s = act(s, 'check'); // hero
    expect(s.derived.pot_bb).toBe(11.0);
    expect(s.street_state.is_closed).toBe(true);

    // ── RIVER ──
    s = advance(s, ['2h']);
    expect(s.current_street).toBe('river');
    expect(s.derived.pot_bb).toBe(11.0);

    // Villain bet 8
    s = act(s, 'bet', 8);
    expect(s.derived.pot_bb).toBe(19.0);

    // Hero call
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(27.0);
    expect(s.street_state.is_closed).toBe(true);

    // Verify final invariants
    expect(s.hero.invested_total_bb + s.hero.stack_remaining_bb).toBe(50);
    expect(s.villain.invested_total_bb + s.villain.stack_remaining_bb).toBe(50);
    expect(s.hero.invested_total_bb + s.villain.invested_total_bb).toBe(s.derived.pot_bb);
  });

  it('plays BB perspective: villain SB opens, hero BB defends', () => {
    let s = freshState({ hero_position: 'BB' });

    // Hero=BB, villain=SB. Villain acts first preflop.
    expect(s.expected_actor).toBe('villain');
    expect(s.derived.pot_bb).toBe(1.5);

    // Villain raise_to 3
    s = act(s, 'raise_to', 3);
    expect(s.derived.pot_bb).toBe(4.0); // 3 + 1
    expect(s.expected_actor).toBe('hero');

    // Hero call
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(6.0);
    expect(s.street_state.is_closed).toBe(true);

    // Flop: hero (BB) acts first postflop
    s = advance(s, ['Th', '7c', '3d']);
    expect(s.expected_actor).toBe('hero');

    // Hero check, villain check
    s = act(s, 'check');
    s = act(s, 'check');
    expect(s.street_state.is_closed).toBe(true);
    expect(s.derived.pot_bb).toBe(6.0);
  });

  it('verifies pot_odds and SPR at key moments', () => {
    let s = freshState();

    // Preflop: hero raise 2.5
    s = act(s, 'raise_to', 2.5);
    // Villain faces: pot=3.5, to_call=1.5
    expect(s.derived.to_call_bb).toBe(1.5);
    // pot_odds = 1.5 / (3.5 + 1.5) * 100 = 30.0
    expect(s.derived.pot_odds_pct).toBe(30);

    s = act(s, 'call');
    // pot=5.0, effective_stack = min(47.5, 47.5) = 47.5
    expect(s.derived.pot_bb).toBe(5.0);
    // SPR = 47.5 / 5.0 = 9.5
    expect(s.derived.spr).toBe(9.5);
  });
});
