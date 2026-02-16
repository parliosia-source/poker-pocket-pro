import { describe, it, expect } from 'vitest';
import { freshState, act, advance, getHero, getVillain } from '../engine/helpers';

describe('Full Hand Integration — preflop to river', () => {
  it('plays a complete hand through all 4 streets', () => {
    let s = freshState();

    // PREFLOP
    expect(s.current_street).toBe('preflop');
    expect(s.derived.pot_bb).toBe(1.5);

    s = act(s, 'raise_to', 2.5);
    expect(s.derived.pot_bb).toBe(3.5);
    expect(getHero(s)!.stack_remaining_bb).toBe(47.5);

    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(5.0);
    expect(s.street_state.is_closed).toBe(true);
    expect(getHero(s)!.invested_total_bb).toBe(2.5);
    expect(getVillain(s)!.invested_total_bb).toBe(2.5);

    // FLOP
    s = advance(s, ['Ah', 'Kd', '9c']);
    expect(s.current_street).toBe('flop');
    expect(s.derived.pot_bb).toBe(5.0);
    expect(s.expected_actor_id).toBe(getVillain(s)!.id);

    s = act(s, 'bet', 3);
    expect(s.derived.pot_bb).toBe(8.0);

    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(11.0);
    expect(s.street_state.is_closed).toBe(true);

    // TURN
    s = advance(s, ['5s']);
    expect(s.current_street).toBe('turn');
    expect(getHero(s)!.invested_this_street_bb).toBe(0);
    expect(getVillain(s)!.invested_this_street_bb).toBe(0);

    s = act(s, 'check');
    s = act(s, 'check');
    expect(s.street_state.is_closed).toBe(true);

    // RIVER
    s = advance(s, ['2h']);
    s = act(s, 'bet', 8);
    expect(s.derived.pot_bb).toBe(19.0);

    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(27.0);

    // Verify invariants
    const hero = getHero(s)!;
    const villain = getVillain(s)!;
    expect(hero.invested_total_bb + hero.stack_remaining_bb).toBe(50);
    expect(villain.invested_total_bb + villain.stack_remaining_bb).toBe(50);
    expect(hero.invested_total_bb + villain.invested_total_bb).toBe(s.derived.pot_bb);
  });

  it('plays BB perspective: villain SB opens, hero BB defends', () => {
    // Hero is BB (seat 1), villain is BTN/SB (seat 0)
    let s = freshState({
      players_config: [
        { seat_index: 0, label: 'V1', is_hero: false, stack_bb: 50 },
        { seat_index: 1, label: 'Hero', is_hero: true, stack_bb: 50 },
      ],
    });

    // Villain=BTN/SB acts first preflop in HU
    expect(s.expected_actor_id).toBe(getVillain(s)!.id);

    s = act(s, 'raise_to', 3);
    expect(s.derived.pot_bb).toBe(4.0);
    expect(s.expected_actor_id).toBe(getHero(s)!.id);

    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(6.0);
    expect(s.street_state.is_closed).toBe(true);

    // Flop: hero (BB) acts first postflop
    s = advance(s, ['Th', '7c', '3d']);
    expect(s.expected_actor_id).toBe(getHero(s)!.id);

    s = act(s, 'check');
    s = act(s, 'check');
    expect(s.street_state.is_closed).toBe(true);
  });

  it('verifies pot_odds and SPR at key moments', () => {
    let s = freshState();
    s = act(s, 'raise_to', 2.5);
    expect(s.derived.to_call_bb).toBe(1.5);
    expect(s.derived.pot_odds_pct).toBe(30);

    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(5.0);
    // SPR = hero stack / pot = 47.5 / 5.0 = 9.5
    expect(s.derived.spr).toBe(9.5);
  });
});
