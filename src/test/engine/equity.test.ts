import { describe, it, expect } from 'vitest';
import {
  parseCard,
  evaluateBest5,
  compareRanks,
  runMonteCarlo,
  xorshift32,
  type HandRank,
} from '@/engine/handEvaluator';
import { computeReco } from '@/engine/recoEngine';
import { LRUCache, makeEquityKey } from '@/engine/lruCache';

// ═══════════════════════════════════════
// HAND EVALUATOR
// ═══════════════════════════════════════

describe('Hand Evaluator — 5-card rankings', () => {
  const parse = (cards: string[]) => cards.map(parseCard);

  it('detects a flush', () => {
    const rank = evaluateBest5(parse(['Ah', 'Kh', 'Th', '7h', '3h', '2s', '4d']));
    expect(rank[0]).toBe(6); // flush
  });

  it('detects a straight', () => {
    const rank = evaluateBest5(parse(['9s', '8h', '7d', '6c', '5s', 'Kh', '2d']));
    expect(rank[0]).toBe(5); // straight
    expect(rank[1]).toBe(9); // 9-high
  });

  it('detects a wheel (A-2-3-4-5)', () => {
    const rank = evaluateBest5(parse(['Ah', '2s', '3d', '4c', '5h', 'Ks', 'Qd']));
    expect(rank[0]).toBe(5); // straight
    expect(rank[1]).toBe(5); // 5-high
  });

  it('detects a full house', () => {
    const rank = evaluateBest5(parse(['Ks', 'Kh', 'Kd', '9c', '9s', '2h', '3d']));
    expect(rank[0]).toBe(7); // full house
  });

  it('detects quads', () => {
    const rank = evaluateBest5(parse(['Ts', 'Th', 'Td', 'Tc', '9s', '2h', '3d']));
    expect(rank[0]).toBe(8); // quads
  });

  it('detects a straight flush', () => {
    const rank = evaluateBest5(parse(['9h', '8h', '7h', '6h', '5h', 'Ks', '2d']));
    expect(rank[0]).toBe(9); // straight flush
  });

  it('pair beats high card', () => {
    const pair = evaluateBest5(parse(['As', 'Ah', 'Kd', 'Qc', 'Js', '3h', '2d']));
    const high = evaluateBest5(parse(['As', 'Kh', 'Qd', 'Jc', '9s', '3h', '2d']));
    expect(compareRanks(pair, high)).toBeGreaterThan(0);
  });

  it('higher pair wins', () => {
    const aa = evaluateBest5(parse(['As', 'Ah', 'Kd', 'Qc', 'Js', '3h', '2d']));
    const kk = evaluateBest5(parse(['Ks', 'Kh', 'Ad', 'Qc', 'Js', '3h', '2d']));
    expect(compareRanks(aa, kk)).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════
// MONTE CARLO — Determinism
// ═══════════════════════════════════════

describe('Monte Carlo — deterministic with seed', () => {
  it('same seed → same equity', () => {
    const r1 = runMonteCarlo({ heroCards: ['As', 'Ah'], boardCards: [], iterations: 1000, seed: 123 });
    const r2 = runMonteCarlo({ heroCards: ['As', 'Ah'], boardCards: [], iterations: 1000, seed: 123 });
    expect(r1.equity).toBe(r2.equity);
    expect(r1.wins).toBe(r2.wins);
  });

  it('different seed → possibly different (but both valid)', () => {
    const r1 = runMonteCarlo({ heroCards: ['As', 'Ah'], boardCards: [], iterations: 1000, seed: 111 });
    const r2 = runMonteCarlo({ heroCards: ['As', 'Ah'], boardCards: [], iterations: 1000, seed: 999 });
    // Both should be around 0.85 for AA
    expect(r1.equity).toBeGreaterThan(0.75);
    expect(r2.equity).toBeGreaterThan(0.75);
  });

  it('AA preflop ~0.80–0.90 equity vs random', () => {
    const r = runMonteCarlo({ heroCards: ['As', 'Ah'], boardCards: [], iterations: 3000, seed: 42 });
    expect(r.equity).toBeGreaterThan(0.78);
    expect(r.equity).toBeLessThan(0.92);
  });

  it('72o preflop < 0.45 equity vs random', () => {
    const r = runMonteCarlo({ heroCards: ['7s', '2d'], boardCards: [], iterations: 3000, seed: 42 });
    expect(r.equity).toBeLessThan(0.45);
  });

  it('nut flush on river → equity very high', () => {
    const r = runMonteCarlo({
      heroCards: ['Ah', 'Kh'],
      boardCards: ['Qh', '8h', '3h', '2s', '9c'],
      iterations: 3000,
      seed: 42,
    });
    expect(r.equity).toBeGreaterThan(0.85);
  });

  it('completes in reasonable time', () => {
    const r = runMonteCarlo({ heroCards: ['Ks', 'Qd'], boardCards: ['Ts', '9s', '2d'], iterations: 3000, seed: 1 });
    expect(r.ms).toBeLessThan(2000); // generous for CI
    expect(r.iterations).toBe(3000);
  });
});

// ═══════════════════════════════════════
// XORSHIFT RNG
// ═══════════════════════════════════════

describe('xorshift32 RNG', () => {
  it('produces values between 0 and 1', () => {
    const rng = xorshift32(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic', () => {
    const rng1 = xorshift32(42);
    const rng2 = xorshift32(42);
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBe(rng2());
    }
  });
});

// ═══════════════════════════════════════
// RECO ENGINE
// ═══════════════════════════════════════

describe('Recommendation Engine', () => {
  it('recommends CHECK when nothing to call', () => {
    const r = computeReco({ equity: 0.4, potOddsPct: 0, toCallBb: 0, potBb: 5, spr: 8, street: 'flop', hasBoardCards: true });
    expect(r.action).toBe('CHECK');
  });

  it('recommends BET when equity > 60% and nothing to call', () => {
    const r = computeReco({ equity: 0.65, potOddsPct: 0, toCallBb: 0, potBb: 5, spr: 8, street: 'flop', hasBoardCards: true });
    expect(r.action).toBe('BET');
  });

  it('recommends FOLD when equity << pot odds', () => {
    const r = computeReco({ equity: 0.12, potOddsPct: 40, toCallBb: 8, potBb: 12, spr: 2, street: 'river', hasBoardCards: true });
    expect(r.action).toBe('FOLD');
  });

  it('recommends CALL when equity > pot odds (moderate edge)', () => {
    const r = computeReco({ equity: 0.45, potOddsPct: 30, toCallBb: 3, potBb: 7, spr: 6, street: 'flop', hasBoardCards: true });
    expect(r.action).toBe('CALL');
  });

  it('recommends RAISE when equity >> pot odds', () => {
    const r = computeReco({ equity: 0.75, potOddsPct: 25, toCallBb: 3, potBb: 9, spr: 5, street: 'flop', hasBoardCards: true });
    expect(r.action).toBe('RAISE');
  });

  it('handles null equity gracefully', () => {
    const r = computeReco({ equity: null, potOddsPct: null, toCallBb: 1, potBb: 1.5, spr: 49, street: 'preflop', hasBoardCards: false });
    expect(r.action).toBe('CALL');
    expect(r.confidence).toBe('low');
  });

  it('SPR < 3 adjusts toward fold when equity is marginal', () => {
    const r = computeReco({ equity: 0.28, potOddsPct: 25, toCallBb: 5, potBb: 15, spr: 2, street: 'turn', hasBoardCards: true });
    // edge = 3, sprAdj = -5, adjusted = -2 → within ±5 margin → CALL low (marginal)
    expect(['CALL', 'FOLD']).toContain(r.action);
  });
});

// ═══════════════════════════════════════
// LRU CACHE
// ═══════════════════════════════════════

describe('LRU Cache', () => {
  it('stores and retrieves values', () => {
    const c = new LRUCache<number>(3);
    c.set('a', 1);
    expect(c.get('a')).toBe(1);
  });

  it('evicts oldest entry when full', () => {
    const c = new LRUCache<number>(2);
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    expect(c.get('a')).toBeUndefined();
    expect(c.get('b')).toBe(2);
    expect(c.get('c')).toBe(3);
  });

  it('accessing refreshes recency', () => {
    const c = new LRUCache<number>(2);
    c.set('a', 1);
    c.set('b', 2);
    c.get('a'); // refresh 'a'
    c.set('c', 3); // evicts 'b'
    expect(c.get('a')).toBe(1);
    expect(c.get('b')).toBeUndefined();
  });

  it('makeEquityKey is canonical (sorted)', () => {
    const k1 = makeEquityKey(['Ah', 'Ks'], ['Td', '9c', '2h'], 3000);
    const k2 = makeEquityKey(['Ks', 'Ah'], ['2h', 'Td', '9c'], 3000);
    expect(k1).toBe(k2);
  });
});
