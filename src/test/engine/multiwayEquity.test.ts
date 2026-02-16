import { describe, it, expect } from 'vitest';
import { runMonteCarlo } from '@/engine/handEvaluator';

describe('Multiway Monte Carlo Equity', () => {
  const heroCards = ['As', 'Kh'];
  const boardCards = ['Ts', '7d', '2c'];
  const iterations = 3000;
  const seed = 42;

  it('returns equity for heads-up (opponentCount=1)', () => {
    const result = runMonteCarlo({ heroCards, boardCards, iterations, seed, opponentCount: 1 });
    expect(result.equity).toBeGreaterThan(0);
    expect(result.equity).toBeLessThan(1);
    expect(result.iterations).toBe(iterations);
    expect(result.wins + result.ties + result.losses).toBe(iterations);
  });

  it('returns lower equity with more opponents', () => {
    const hu = runMonteCarlo({ heroCards, boardCards, iterations, seed, opponentCount: 1 });
    const threeWay = runMonteCarlo({ heroCards, boardCards, iterations, seed, opponentCount: 2 });
    const sixWay = runMonteCarlo({ heroCards, boardCards, iterations, seed, opponentCount: 5 });

    // More opponents → lower equity
    expect(threeWay.equity).toBeLessThan(hu.equity);
    expect(sixWay.equity).toBeLessThan(threeWay.equity);
  });

  it('9-max (8 opponents) produces significantly lower equity than HU', () => {
    const hu = runMonteCarlo({ heroCards, boardCards, iterations, seed, opponentCount: 1 });
    const nineMax = runMonteCarlo({ heroCards, boardCards, iterations, seed, opponentCount: 8 });

    expect(nineMax.equity).toBeLessThan(hu.equity * 0.7);
  });

  it('defaults to 1 opponent when opponentCount is omitted', () => {
    const withDefault = runMonteCarlo({ heroCards, boardCards, iterations, seed });
    const withOne = runMonteCarlo({ heroCards, boardCards, iterations, seed, opponentCount: 1 });

    expect(withDefault.equity).toBeCloseTo(withOne.equity, 5);
  });

  it('does not freeze with large opponent count (performance)', () => {
    const t0 = performance.now();
    const result = runMonteCarlo({ heroCards, boardCards, iterations: 1000, seed, opponentCount: 8 });
    const elapsed = performance.now() - t0;

    expect(result.equity).toBeGreaterThan(0);
    // Should complete in reasonable time (< 5s for 1000 iters)
    expect(elapsed).toBeLessThan(5000);
  });
});
