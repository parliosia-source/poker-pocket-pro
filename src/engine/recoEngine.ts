/**
 * Recommendation Engine MVP
 * Deterministic rules based on equity, pot odds, SPR.
 */

export interface RecoInput {
  equity: number | null;     // 0..1 (null = unavailable)
  potOddsPct: number | null; // 0..100
  toCallBb: number;
  potBb: number;
  spr: number | null;
  street: string;
  hasBoardCards: boolean;
}

export interface RecoOutput {
  action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK' | 'BET';
  rationale: string;
  confidence: 'low' | 'med' | 'high';
}

const RISK_MARGIN = 5; // percentage points

export function computeReco(input: RecoInput): RecoOutput {
  const { equity, potOddsPct, toCallBb, potBb, spr, hasBoardCards } = input;
  const eqPct = equity != null ? Math.round(equity * 100) : null;

  // ── Nothing to call ──
  if (toCallBb === 0) {
    if (eqPct != null && eqPct > 60 && hasBoardCards) {
      const sizing = spr != null && spr > 6 ? '¾ pot' : '½ pot';
      return {
        action: 'BET',
        rationale: `Equity ${eqPct}% favorable — value bet ${sizing}`,
        confidence: 'med',
      };
    }
    return {
      action: 'CHECK',
      rationale: 'Rien à payer — check',
      confidence: 'high',
    };
  }

  // ── No equity available (preflop, no hero cards) ──
  if (eqPct == null || potOddsPct == null) {
    if (toCallBb <= 1) {
      return {
        action: 'CALL',
        rationale: `Coût faible (${toCallBb} BB) — call`,
        confidence: 'low',
      };
    }
    return {
      action: 'CALL',
      rationale: 'Equity non calculée — décision manuelle',
      confidence: 'low',
    };
  }

  // ── Main logic: equity vs pot odds ──
  const edge = eqPct - potOddsPct;

  // SPR adjustment
  let sprAdj = 0;
  let sprNote = '';
  if (spr != null) {
    if (spr < 3) {
      sprNote = ' | SPR < 3 : commit-or-fold';
      sprAdj = edge > 0 ? 5 : -5;
    } else if (spr > 13) {
      sprNote = ' | SPR > 13 : jeu profond';
      sprAdj = -3;
    }
  }

  const adjustedEdge = edge + sprAdj;

  if (adjustedEdge > RISK_MARGIN + 15) {
    return {
      action: 'RAISE',
      rationale: `Equity ${eqPct}% >> Pot odds ${potOddsPct}% (+${Math.round(edge)}%)${sprNote} → raise value`,
      confidence: 'high',
    };
  }

  if (adjustedEdge > RISK_MARGIN) {
    return {
      action: 'CALL',
      rationale: `Equity ${eqPct}% > Pot odds ${potOddsPct}% (+${Math.round(edge)}%)${sprNote} → call profitable`,
      confidence: 'high',
    };
  }

  if (adjustedEdge > -RISK_MARGIN) {
    return {
      action: 'CALL',
      rationale: `Equity ${eqPct}% ≈ Pot odds ${potOddsPct}% (marginal, ${edge > 0 ? '+' : ''}${Math.round(edge)}%)${sprNote}`,
      confidence: 'low',
    };
  }

  return {
    action: 'FOLD',
    rationale: `Equity ${eqPct}% < Pot odds ${potOddsPct}% (${Math.round(edge)}%)${sprNote} → fold`,
    confidence: 'high',
  };
}
