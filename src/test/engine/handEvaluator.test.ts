import { describe, it, expect } from 'vitest';
import { parseCard, evaluateBest5, compareRanks } from '@/engine/handEvaluator';

const parse = (cards: string[]) => cards.map(parseCard);

describe('Hand Evaluator — full ranking hierarchy', () => {
  // Category constants
  const HIGH_CARD = 1, PAIR = 2, TWO_PAIR = 3, TRIPS = 4, STRAIGHT = 5;
  const FLUSH = 6, FULL_HOUSE = 7, QUADS = 8, STRAIGHT_FLUSH = 9;

  const hands = {
    highCard:      parse(['As', 'Kh', 'Td', '7c', '3s', '2h', '4d']),
    pair:          parse(['As', 'Ah', 'Kd', 'Qc', '9s', '3h', '2d']),
    twoPair:       parse(['As', 'Ah', 'Kd', 'Kc', '9s', '3h', '2d']),
    trips:         parse(['Ks', 'Kh', 'Kd', 'Qc', '9s', '3h', '2d']),
    wheel:         parse(['Ah', '2s', '3d', '4c', '5h', '9s', 'Td']),
    straight:      parse(['9s', '8h', '7d', '6c', '5s', 'Kh', '2d']),
    flush:         parse(['Ah', 'Kh', 'Th', '7h', '3h', '2s', '4d']),
    fullHouse:     parse(['Ks', 'Kh', 'Kd', '9c', '9s', '2h', '3d']),
    quads:         parse(['Ts', 'Th', 'Td', 'Tc', '9s', '2h', '3d']),
    straightFlush: parse(['9h', '8h', '7h', '6h', '5h', 'Ks', '2d']),
  };

  it('classifies high card', () => {
    expect(evaluateBest5(hands.highCard)[0]).toBe(HIGH_CARD);
  });

  it('classifies pair', () => {
    expect(evaluateBest5(hands.pair)[0]).toBe(PAIR);
  });

  it('classifies two pair', () => {
    expect(evaluateBest5(hands.twoPair)[0]).toBe(TWO_PAIR);
  });

  it('classifies trips', () => {
    expect(evaluateBest5(hands.trips)[0]).toBe(TRIPS);
  });

  it('classifies wheel as straight (5-high)', () => {
    const r = evaluateBest5(hands.wheel);
    expect(r[0]).toBe(STRAIGHT);
    expect(r[1]).toBe(5);
  });

  it('classifies straight', () => {
    const r = evaluateBest5(hands.straight);
    expect(r[0]).toBe(STRAIGHT);
    expect(r[1]).toBe(9);
  });

  it('classifies flush', () => {
    expect(evaluateBest5(hands.flush)[0]).toBe(FLUSH);
  });

  it('classifies full house', () => {
    expect(evaluateBest5(hands.fullHouse)[0]).toBe(FULL_HOUSE);
  });

  it('classifies quads', () => {
    expect(evaluateBest5(hands.quads)[0]).toBe(QUADS);
  });

  it('classifies straight flush', () => {
    expect(evaluateBest5(hands.straightFlush)[0]).toBe(STRAIGHT_FLUSH);
  });

  // ── Ranking order ──

  it('straight flush > quads > full house > flush > straight > trips > two pair > pair > high card', () => {
    const ranked = [
      hands.highCard, hands.pair, hands.twoPair, hands.trips,
      hands.straight, hands.flush, hands.fullHouse, hands.quads, hands.straightFlush,
    ].map(h => evaluateBest5(h));

    for (let i = 1; i < ranked.length; i++) {
      expect(compareRanks(ranked[i], ranked[i - 1])).toBeGreaterThan(0);
    }
  });

  it('higher flush beats lower flush', () => {
    const nutFlush = evaluateBest5(parse(['Ah', 'Kh', 'Qh', '8h', '3h', '2s', '4d']));
    const lowFlush = evaluateBest5(parse(['9h', '8h', '7h', '5h', '3h', 'As', 'Kd']));
    expect(compareRanks(nutFlush, lowFlush)).toBeGreaterThan(0);
  });

  it('broadway straight beats wheel', () => {
    const broadway = evaluateBest5(parse(['As', 'Kh', 'Qd', 'Jc', 'Ts', '3h', '2d']));
    const wheel = evaluateBest5(hands.wheel);
    expect(compareRanks(broadway, wheel)).toBeGreaterThan(0);
  });
});
