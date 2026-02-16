import { describe, it, expect } from 'vitest';
import { nanoid } from 'nanoid';
import { freshState, act, advance, makeConfig, getHero, getVillain } from './helpers';
import { createInitialState, validateAction, applyAction } from '@/engine/engine';
import { undoAction } from '@/engine/undo';
import type { Action } from '@/engine/types';

describe('Edge Cases', () => {

  it('EC-1: rejects raise_to below min_raise', () => {
    let s = freshState();
    s = act(s, 'raise_to', 2.5);
    expect(s.derived.min_raise_to_bb).toBe(4.0);

    const villain = getVillain(s)!;
    const result = validateAction(s, { player_id: villain.id, type: 'raise_to', amount_bb: 3.0 });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('EC-2: bet exceeding stack becomes all-in', () => {
    let s = freshState({
      players_config: [
        { seat_index: 0, label: 'Hero', is_hero: true, stack_bb: 5 },
        { seat_index: 1, label: 'V1', is_hero: false, stack_bb: 5 },
      ],
    });
    s = act(s, 'raise_to', 2.5);
    s = act(s, 'call');
    s = advance(s, ['Ah', 'Kd', '9c']);

    // BB bets 3, but only has 2.5 remaining → should become all-in
    s = act(s, 'bet', 3); // capped to 2.5
    const villain = getVillain(s)!;
    expect(villain.stack_remaining_bb).toBe(0);
    expect(villain.status).toBe('all_in');
  });

  it('EC-3: short-stack all-in for less than a full call', () => {
    let s = freshState({
      players_config: [
        { seat_index: 0, label: 'Hero', is_hero: true, stack_bb: 2 },
        { seat_index: 1, label: 'V1', is_hero: false, stack_bb: 50 },
      ],
    });
    s = act(s, 'all_in');
    const hero = getHero(s)!;
    expect(hero.stack_remaining_bb).toBe(0);
    expect(hero.status).toBe('all_in');
    expect(s.derived.pot_bb).toBe(3.0); // 2 (hero total) + 1 (villain BB)
    // Villain can call or fold
    const villain = getVillain(s)!;
    expect(s.expected_actor_id).toBe(villain.id);
  });

  it('EC-4: limp gives BB the option, pot=2.0 after limp', () => {
    let s = freshState();
    s = act(s, 'call'); // SB limp
    expect(s.derived.pot_bb).toBe(2.0);
    expect(s.derived.to_call_bb).toBe(0);
    expect(s.street_state.is_closed).toBe(false);
    const villain = getVillain(s)!;
    expect(s.expected_actor_id).toBe(villain.id);
  });

  it('EC-5: undo reverts all-in correctly', () => {
    let s = freshState();
    s = act(s, 'all_in');
    const hero = getHero(s)!;
    expect(hero.status).toBe('all_in');

    const { newState } = undoAction(s);
    const heroAfter = getHero(newState)!;
    expect(heroAfter.status).toBe('active');
    expect(heroAfter.stack_remaining_bb).toBe(49.5);
    expect(newState.derived.pot_bb).toBe(1.5);
  });

  it('EC-7: advanceStreet resets invested_this_street to 0', () => {
    let s = freshState();
    s = act(s, 'raise_to', 2.5);
    s = act(s, 'call');
    const hero1 = getHero(s)!;
    const villain1 = getVillain(s)!;
    expect(hero1.invested_this_street_bb).toBe(2.5);
    expect(villain1.invested_this_street_bb).toBe(2.5);

    s = advance(s, ['Ah', 'Kd', '9c']);
    const hero2 = getHero(s)!;
    const villain2 = getVillain(s)!;
    expect(hero2.invested_this_street_bb).toBe(0);
    expect(villain2.invested_this_street_bb).toBe(0);
  });

  it('EC-8: to_call_bb is never negative', () => {
    let s = freshState();
    expect(s.derived.to_call_bb).toBeGreaterThanOrEqual(0);
    s = act(s, 'raise_to', 2.5);
    expect(s.derived.to_call_bb).toBeGreaterThanOrEqual(0);
    s = act(s, 'call');
    expect(s.derived.to_call_bb).toBeGreaterThanOrEqual(0);
    s = advance(s, ['Ah', 'Kd', '9c']);
    expect(s.derived.to_call_bb).toBe(0);
  });

  it('EC-11: cannot check when there is an amount to call', () => {
    let s = freshState();
    s = act(s, 'raise_to', 2.5);
    const villain = getVillain(s)!;
    const result = validateAction(s, { player_id: villain.id, type: 'check' });
    expect(result.valid).toBe(false);
  });
});
