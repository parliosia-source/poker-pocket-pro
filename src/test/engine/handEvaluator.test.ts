import { describe, it, expect } from 'vitest';
import {
  parseCard,
  evaluateBest5,
  compareRanks,
} from '@/engine/handEvaluator';

const parse = (cards: string[]) => cards.map(parseCard);

describe('Hand Evaluator — Category Detection', () => {
  it('high card', () => {
    const rank = evaluateBest5(parse(['As', 'Kh', 'Td', '7c', '3s', '2h', '4d']));
    expect(rank[0]).toBe(1);
  });

  it('one pair', () => {
    const rank = evaluateBest5(parse(['As', 'Ah', 'Kd', 'Qc', 'Js', '3h', '2d']));
    expect(rank[0]).toBe(2);
  });

  it('two pair', () => {
    const rank = evaluateBest5(parse(['As', 'Ah', 'Kd', 'Kc', 'Js', '3h', '2d']));
    expect(rank[0]).toBe(3);
  });

  it('three of a kind (trips)', () => {
    const rank = evaluateBest5(parse(['As', 'Ah', 'Ad', 'Kc', 'Js', '3h', '2d']));
    expect(rank[0]).toBe(4);
  });

  it('straight (9-high)', () => {
    const rank = evaluateBest5(parse(['9s', '8h', '7d', '6c', '5s', 'Kh', '2d']));
    expect(rank[0]).toBe(5);
    expect(rank[1]).toBe(9);
  });

  it('wheel straight (A-2-3-4-5)', () => {
    const rank = evaluateBest5(parse(['Ah', '2s', '3d', '4c', '5h', 'Ks', 'Qd']));
    expect(rank[0]).toBe(5);
    expect(rank[1]).toBe(5); // 5-high
  });

  it('flush', () => {
    const rank = evaluateBest5(parse(['Ah', 'Kh', 'Th', '7h', '3h', '2s', '4d']));
    expect(rank[0]).toBe(6);
  });

  it('full house', () => {
    const rank = evaluateBest5(parse(['Ks', 'Kh', 'Kd', '9c', '9s', '2h', '3d']));
    expect(rank[0]).toBe(7);
  });

  it('four of a kind (quads)', () => {
    const rank = evaluateBest5(parse(['Ts', 'Th', 'Td', 'Tc', '9s', '2h', '3d']));
    expect(rank[0]).toBe(8);
  });

  it('straight flush', () => {
    const rank = evaluateBest5(parse(['9h', '8h', '7h', '6h', '5h', 'Ks', '2d']));
    expect(rank[0]).toBe(9);
  });
});

describe('Hand Evaluator — Ranking Order', () => {
  const hands = {
    highCard:      parse(['As', 'Kh', 'Td', '7c', '3s', '2h', '4d']),
    pair:          parse(['As', 'Ah', 'Kd', 'Qc', 'Js', '3h', '2d']),
    twoPair:       parse(['As', 'Ah', 'Kd', 'Kc', 'Js', '3h', '2d']),
    trips:         parse(['As', 'Ah', 'Ad', 'Kc', 'Js', '3h', '2d']),
    straight:      parse(['9s', '8h', '7d', '6c', '5s', 'Kh', '2d']),
    flush:         parse(['Ah', 'Kh', 'Th', '7h', '3h', '2s', '4d']),
    fullHouse:     parse(['Ks', 'Kh', 'Kd', '9c', '9s', '2h', '3d']),
    quads:         parse(['Ts', 'Th', 'Td', 'Tc', '9s', '2h', '3d']),
    straightFlush: parse(['9h', '8h', '7h', '6h', '5h', 'Ks', '2d']),
  };

  const ranked = [
    hands.highCard, hands.pair, hands.twoPair, hands.trips,
    hands.straight, hands.flush, hands.fullHouse, hands.quads, hands.straightFlush,
  ].map(h => evaluateBest5(h));

  it('each category beats all lower categories', () => {
    for (let i = 1; i < ranked.length; i++) {
      expect(compareRanks(ranked[i], ranked[i - 1])).toBeGreaterThan(0);
    }
  });

  it('higher pair beats lower pair', () => {
    const aa = evaluateBest5(parse(['As', 'Ah', 'Kd', 'Qc', 'Js', '3h', '2d']));
    const kk = evaluateBest5(parse(['Ks', 'Kh', 'Ad', 'Qc', 'Js', '3h', '2d']));
    expect(compareRanks(aa, kk)).toBeGreaterThan(0);
  });

  it('higher flush wins by kicker', () => {
    const aceFlush = evaluateBest5(parse(['Ah', 'Kh', 'Th', '7h', '3h', '2s', '4d']));
    const kingFlush = evaluateBest5(parse(['Kh', 'Qh', 'Th', '7h', '3h', '2s', '4d']));
    expect(compareRanks(aceFlush, kingFlush)).toBeGreaterThan(0);
  });
});
