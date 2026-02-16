import { describe, it, expect } from 'vitest';
import { computeReco } from '@/engine/recoEngine';

describe('Recommendation Engine — extended', () => {
  // ── to_call = 0 scenarios ──

  it('CHECK when to_call=0 and equity <= 60%', () => {
    const r = computeReco({ equity: 0.55, potOddsPct: 0, toCallBb: 0, potBb: 4, spr: 10, street: 'flop', hasBoardCards: true });
    expect(r.action).toBe('CHECK');
  });

  it('BET when to_call=0, equity > 60%, hasBoardCards', () => {
    const r = computeReco({ equity: 0.70, potOddsPct: 0, toCallBb: 0, potBb: 6, spr: 8, street: 'turn', hasBoardCards: true });
    expect(r.action).toBe('BET');
    expect(r.confidence).toBe('med');
  });

  it('CHECK when to_call=0, equity > 60% but no board cards', () => {
    const r = computeReco({ equity: 0.80, potOddsPct: 0, toCallBb: 0, potBb: 1.5, spr: 30, street: 'preflop', hasBoardCards: false });
    expect(r.action).toBe('CHECK');
  });

  it('BET rationale mentions ¾ pot when SPR > 6', () => {
    const r = computeReco({ equity: 0.65, potOddsPct: 0, toCallBb: 0, potBb: 4, spr: 10, street: 'flop', hasBoardCards: true });
    expect(r.rationale).toContain('¾');
  });

  it('BET rationale mentions ½ pot when SPR <= 6', () => {
    const r = computeReco({ equity: 0.65, potOddsPct: 0, toCallBb: 0, potBb: 10, spr: 3, street: 'turn', hasBoardCards: true });
    expect(r.rationale).toContain('½');
  });

  // ── equity vs pot odds scenarios ──

  it('FOLD when equity well below pot odds', () => {
    const r = computeReco({ equity: 0.10, potOddsPct: 33, toCallBb: 5, potBb: 10, spr: 5, street: 'turn', hasBoardCards: true });
    expect(r.action).toBe('FOLD');
    expect(r.confidence).toBe('high');
  });

  it('CALL when equity moderately above pot odds', () => {
    const r = computeReco({ equity: 0.40, potOddsPct: 25, toCallBb: 3, potBb: 9, spr: 8, street: 'flop', hasBoardCards: true });
    expect(r.action).toBe('CALL');
  });

  it('RAISE when equity massively above pot odds', () => {
    const r = computeReco({ equity: 0.80, potOddsPct: 20, toCallBb: 2, potBb: 8, spr: 6, street: 'flop', hasBoardCards: true });
    expect(r.action).toBe('RAISE');
    expect(r.confidence).toBe('high');
  });

  it('marginal CALL has low confidence', () => {
    // edge near 0: equity ~= potOdds
    const r = computeReco({ equity: 0.30, potOddsPct: 28, toCallBb: 4, potBb: 10, spr: 6, street: 'river', hasBoardCards: true });
    expect(r.action).toBe('CALL');
    expect(r.confidence).toBe('low');
  });

  // ── null equity ──

  it('CALL with low confidence when equity null and toCall small', () => {
    const r = computeReco({ equity: null, potOddsPct: null, toCallBb: 0.5, potBb: 1, spr: 50, street: 'preflop', hasBoardCards: false });
    expect(r.action).toBe('CALL');
    expect(r.confidence).toBe('low');
  });

  // ── SPR effects ──

  it('SPR > 13 adds caution note', () => {
    const r = computeReco({ equity: 0.45, potOddsPct: 30, toCallBb: 3, potBb: 7, spr: 15, street: 'flop', hasBoardCards: true });
    expect(r.rationale).toContain('SPR > 13');
  });

  it('SPR < 3 pushes positive edge to commit', () => {
    const r = computeReco({ equity: 0.55, potOddsPct: 30, toCallBb: 5, potBb: 15, spr: 2, street: 'turn', hasBoardCards: true });
    // edge=25, sprAdj=+5 => 30 > 20 => RAISE
    expect(r.action).toBe('RAISE');
  });
});
