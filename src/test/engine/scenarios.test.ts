import { describe, it, expect } from 'vitest';
import { freshState, act, advance, getHero, getVillain } from './helpers';

describe('Engine Scenarios — exact pot values', () => {

  it('S1: Hero SB raise_to 2.5, Villain call → pot=5.0', () => {
    let s = freshState();
    expect(s.derived.pot_bb).toBe(1.5);
    const hero = getHero(s)!;
    expect(s.expected_actor_id).toBe(hero.id);

    s = act(s, 'raise_to', 2.5);
    expect(s.derived.pot_bb).toBe(3.5);
    const villain = getVillain(s)!;
    expect(s.expected_actor_id).toBe(villain.id);

    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(5.0);
    expect(s.street_state.is_closed).toBe(true);
  });

  it('S2: Hero raise 2.5, Villain 3bet to 8, Hero fold → pot=10.5', () => {
    let s = freshState();
    s = act(s, 'raise_to', 2.5);
    expect(s.derived.pot_bb).toBe(3.5);

    s = act(s, 'raise_to', 8);
    expect(s.derived.pot_bb).toBe(10.5);
    const hero = getHero(s)!;
    expect(s.expected_actor_id).toBe(hero.id);

    s = act(s, 'fold');
    expect(s.derived.pot_bb).toBe(10.5);
    expect(s.hand_status).toBe('completed_fold');
  });

  it('S3: Preflop raise/3bet/call=16, flop bet 3/call → pot=22.0', () => {
    let s = freshState();
    s = act(s, 'raise_to', 2.5);
    s = act(s, 'raise_to', 8);
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(16.0);
    expect(s.street_state.is_closed).toBe(true);

    s = advance(s, ['Ah', 'Kd', '9c']);
    expect(s.derived.pot_bb).toBe(16.0);
    const villain = getVillain(s)!;
    expect(s.expected_actor_id).toBe(villain.id);

    s = act(s, 'bet', 3);
    expect(s.derived.pot_bb).toBe(19.0);

    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(22.0);
  });

  it('S4: Hero SB limp, Villain raise to 4, Hero call → pot=8.0', () => {
    let s = freshState();
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(2.0);
    expect(s.street_state.is_closed).toBe(false);
    const villain = getVillain(s)!;
    expect(s.expected_actor_id).toBe(villain.id);

    s = act(s, 'raise_to', 4);
    expect(s.derived.pot_bb).toBe(5.0);
    const hero = getHero(s)!;
    expect(s.expected_actor_id).toBe(hero.id);

    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(8.0);
    expect(s.street_state.is_closed).toBe(true);
  });

  it('S5: Preflop 2.5/call=5; Flop V bet 2, H raise 6, V call → pot=17.0', () => {
    let s = freshState();
    s = act(s, 'raise_to', 2.5);
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(5.0);

    s = advance(s, ['Jh', '7d', '2c']);
    const villain = getVillain(s)!;
    expect(s.expected_actor_id).toBe(villain.id);

    s = act(s, 'bet', 2);
    expect(s.derived.pot_bb).toBe(7.0);

    s = act(s, 'raise_to', 6);
    expect(s.derived.pot_bb).toBe(13.0);

    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(17.0);
  });

  it('S6: 22.5bb stacks, turn all-in/call → pot=45.0', () => {
    let s = freshState({
      players_config: [
        { seat_index: 0, label: 'Hero', is_hero: true, stack_bb: 22.5 },
        { seat_index: 1, label: 'V1', is_hero: false, stack_bb: 22.5 },
      ],
    });

    s = act(s, 'raise_to', 2.5);
    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(5.0);

    s = advance(s, ['Ah', 'Kd', '9c']);
    s = act(s, 'check');
    s = act(s, 'check');
    expect(s.street_state.is_closed).toBe(true);

    s = advance(s, ['5s']);
    const villain = getVillain(s)!;
    expect(s.expected_actor_id).toBe(villain.id);

    s = act(s, 'all_in');
    expect(s.derived.pot_bb).toBe(25.0);

    s = act(s, 'call');
    expect(s.derived.pot_bb).toBe(45.0);
  });
});
