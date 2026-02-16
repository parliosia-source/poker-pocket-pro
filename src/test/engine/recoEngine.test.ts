import { describe, it, expect } from 'vitest';
import { computeReco } from '@/engine/recoEngine';

describe('Recommendation Engine', () => {
  // ── to_call = 0 ──

  it('CHECK by default when nothing to call and equity <= 60%', () => {
    const r = computeReco({ equity: 0.4, potOddsPct: null, toCallBb: 0, potBb: 5, spr: 8, street: 'flop', hasBoardCards: true });
    expect(r.action).toBe('CHECK');
    expect(r.confidence).toBe('high');
  });

  it('BET when equity > 60% and hasBoardCards', () => {
    const r = computeReco({ equity: 0.65, potOddsPct: null, toCallBb: 0, potBb: 5, spr: 8, street: 'flop', hasBoardCards: true });
    expect(r.action).toBe('BET');
    expect(r.confidence).toBe('med');
    expect(r.rationale).toContain('65%');
  });

  it('BET sizing mentions ¾ pot when SPR > 6', () => {
    const r = computeReco({ equity: 0.7, potOddsPct: null, toCallBb: 0, potBb: 5, spr: 10, street: 'turn', hasBoardCards: true });
    expect(r.rationale).toContain('¾');
  });

  it('BET sizing mentions ½ pot when SPR <= 6', () => {
    const r = computeReco({ equity: 0.7, potOddsPct: null, toCallBb: 0, potBb: 5, spr: 4, street: 'turn', hasBoardCards: true });
    expect(r.rationale).toContain('½');
  });

  it('CHECK when equity > 60% but no board cards', () => {
    const r = computeReco({ equity: 0.65, potOddsPct: null, toCallBb: 0, potBb: 5, spr: 8, street: 'preflop', hasBoardCards: false });
    expect(r.action).toBe('CHECK');
  });

  // ── Equity vs pot odds ──

  it('FOLD when equity << pot odds', () => {
    const r = computeReco({ equity: 0.10, potOddsPct: 40, toCallBb: 8, potBb: 12, spr: 5, street: 'river', hasBoardCards: true });
    expect(r.action).toBe('FOLD');
    expect(r.confidence).toBe('high');
  });

  it('CALL when equity moderately above pot odds', () => {
    const r = computeReco({ equity: 0.45, potOddsPct: 30, toCallBb: 3, potBb: 7, spr: 6, street: 'flop', hasBoardCards: true });
    expect(r.action).toBe('CALL');
    expect(r.confidence).toBe('high');
  });

  it('RAISE when equity >> pot odds', () => {
    const r = computeReco({ equity: 0.75, potOddsPct: 20, toCallBb: 2, potBb: 8, spr: 5, street: 'flop', hasBoardCards: true });
    expect(r.action).toBe('RAISE');
    expect(r.confidence).toBe('high');
  });

  it('marginal CALL with low confidence near breakeven', () => {
    // edge ≈ 0 → marginal
    const r = computeReco({ equity: 0.30, potOddsPct: 28, toCallBb: 4, potBb: 10, spr: 6, street: 'turn', hasBoardCards: true });
    expect(r.action).toBe('CALL');
    expect(r.confidence).toBe('low');
  });

  // ── Null equity ──

  it('CALL with low confidence when equity is null and cost <= 1 BB', () => {
    const r = computeReco({ equity: null, potOddsPct: null, toCallBb: 1, potBb: 1.5, spr: 49, street: 'preflop', hasBoardCards: false });
    expect(r.action).toBe('CALL');
    expect(r.confidence).toBe('low');
  });

  it('CALL with low confidence when equity null and cost > 1 BB', () => {
    const r = computeReco({ equity: null, potOddsPct: null, toCallBb: 3, potBb: 5, spr: 10, street: 'preflop', hasBoardCards: false });
    expect(r.action).toBe('CALL');
    expect(r.confidence).toBe('low');
  });

  // ── SPR adjustments ──

  it('SPR < 3 pushes marginal equity toward fold', () => {
    // edge = 28-25 = 3, sprAdj = -5, adjusted = -2 → marginal CALL
    const r = computeReco({ equity: 0.28, potOddsPct: 25, toCallBb: 5, potBb: 15, spr: 2, street: 'turn', hasBoardCards: true });
    expect(r.rationale).toContain('SPR < 3');
  });

  it('SPR > 13 noted in rationale', () => {
    const r = computeReco({ equity: 0.50, potOddsPct: 30, toCallBb: 3, potBb: 7, spr: 15, street: 'flop', hasBoardCards: true });
    expect(r.rationale).toContain('SPR > 13');
  });
});
