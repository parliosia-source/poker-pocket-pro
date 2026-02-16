import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Undo2, Redo2, Square, ChevronRight, Spade } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useEquity } from '@/hooks/useEquity';
import { computeReco } from '@/engine/recoEngine';
import type { ActionType } from '@/engine/types';

interface ActionBarProps {
  onOpenKeypad: () => void;
  onOpenCardPicker: (target: 'hero' | 'board') => void;
  onEndHand: () => void;
}

/* ─── Reco hook (derives highlight from existing engine) ─── */

type RecoHint = 'fold' | 'call_check' | 'raise_bet' | null;

function useRecoHint(): { hint: RecoHint; label: string } {
  const gameState = useGameStore((s) => s.gameState);
  const { equity } = useEquity();

  return useMemo(() => {
    if (!gameState || gameState.hand_status !== 'in_progress') {
      return { hint: null, label: 'Reco : indisponible' };
    }

    const d = gameState.derived;
    const boardCards: string[] = [];
    gameState.board.flop.forEach(c => { if (c) boardCards.push(c); });
    if (gameState.board.turn) boardCards.push(gameState.board.turn);
    if (gameState.board.river) boardCards.push(gameState.board.river);

    const reco = computeReco({
      equity,
      potOddsPct: d.pot_odds_pct,
      toCallBb: d.to_call_bb,
      potBb: d.pot_bb,
      spr: d.spr,
      street: gameState.current_street,
      hasBoardCards: boardCards.length >= 3,
    });

    switch (reco.action) {
      case 'FOLD':
        return { hint: 'fold' as const, label: `ABANDONNER — ${reco.rationale}` };
      case 'CHECK':
      case 'CALL':
        return { hint: 'call_check' as const, label: `${reco.action} — ${reco.rationale}` };
      case 'BET':
      case 'RAISE':
        return { hint: 'raise_bet' as const, label: `${reco.action} — ${reco.rationale}` };
      default:
        return { hint: null, label: 'Reco : indisponible (Phase equity)' };
    }
  }, [gameState, equity]);
}

/* ─── Reco Strip ─── */

const RecoStrip = ({ label }: { label: string }) => (
  <div className="px-3 py-1.5 rounded-md bg-card border border-border text-[10px] text-muted-foreground truncate">
    💡 {label}
  </div>
);

/* ─── Sizing Presets Row ─── */

const SizingPresets = ({ onSelectAmount }: { onSelectAmount: (bb: number) => void }) => {
  const gameState = useGameStore((s) => s.gameState);
  if (!gameState || gameState.hand_status !== 'in_progress') return null;

  const actor = gameState[gameState.expected_actor];
  const { current_bet_bb } = gameState.street_state;
  const { min_raise_to_bb } = gameState.derived;
  const toCall = gameState.derived.to_call_bb;
  const isPreflop = gameState.current_street === 'preflop';
  const bb = gameState.config.bb_bb;

  // Min = min legal bet/raise
  const minAmount = toCall === 0
    ? bb // min bet = 1 BB
    : (min_raise_to_bb ?? current_bet_bb + bb);

  // Max = all-in (total invested + remaining)
  const maxAmount = actor.invested_this_street_bb + actor.stack_remaining_bb;

  // Multiplier presets
  // Preflop: 2.5x/3x/3.5x = raise_to = x * BB
  // Postflop: x * to_call (or x * BB if to_call=0)
  const base = isPreflop ? bb : (toCall > 0 ? toCall : bb);
  const presets = [
    { label: 'Min', amount: minAmount },
    { label: '2.5×', amount: Math.round(2.5 * base * 2) / 2 },
    { label: '3×', amount: Math.round(3 * base * 2) / 2 },
    { label: '3.5×', amount: Math.round(3.5 * base * 2) / 2 },
    { label: 'Max', amount: maxAmount },
  ];

  return (
    <div className="flex gap-1">
      {presets.map((p) => (
        <button
          key={p.label}
          onClick={() => onSelectAmount(Math.min(p.amount, maxAmount))}
          className="flex-1 py-1.5 rounded-md text-[10px] font-semibold bg-secondary text-secondary-foreground hover:bg-accent transition-colors min-h-[32px] active:scale-95"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
};

/* ─── Bet Input Row ─── */

const BetInputRow = ({
  betAmount,
  setBetAmount,
  onConfirm,
  onOpenKeypad,
}: {
  betAmount: string;
  setBetAmount: (v: string) => void;
  onConfirm: () => void;
  onOpenKeypad: () => void;
}) => {
  const gameState = useGameStore((s) => s.gameState);
  if (!gameState || gameState.hand_status !== 'in_progress') return null;

  const toCall = gameState.derived.to_call_bb;
  const placeholder = toCall === 0
    ? `${gameState.config.bb_bb} BB`
    : `${gameState.derived.min_raise_to_bb ?? gameState.config.bb_bb} BB`;

  return (
    <div className="flex gap-1.5 items-center">
      <button
        onClick={onOpenKeypad}
        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-md bg-input border border-border text-sm font-mono text-foreground min-h-[44px] hover:border-ring/50 transition-colors"
      >
        {betAmount ? `${betAmount} BB` : placeholder}
      </button>
      {betAmount && (
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-md bg-poker-blue text-foreground text-sm font-semibold min-h-[44px] active:scale-95"
        >
          OK
        </button>
      )}
    </div>
  );
};

/* ─── Main 3-Button Row ─── */

const MainActionRow = ({
  recoHint,
  onOpenKeypad,
}: {
  recoHint: RecoHint;
  onOpenKeypad: () => void;
}) => {
  const gameState = useGameStore((s) => s.gameState);
  const dispatchAction = useGameStore((s) => s.dispatchAction);

  if (!gameState || gameState.hand_status !== 'in_progress') return null;

  const toCall = gameState.derived.to_call_bb;
  const actor = gameState[gameState.expected_actor];

  // Reduce motion check
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pulseClass = prefersReduced ? 'ring-2 ring-ring' : 'animate-reco-pulse ring-2 ring-ring';

  const buttons: {
    id: RecoHint;
    label: string;
    action: () => void;
    bg: string;
    textColor: string;
  }[] = [];

  // 1. Fold button (only if there's something to call)
  if (toCall > 0) {
    buttons.push({
      id: 'fold',
      label: 'Abandonner',
      action: () => dispatchAction('fold'),
      bg: 'bg-poker-red/20',
      textColor: 'text-poker-red',
    });
  }

  // 2. Check / Call
  if (toCall === 0) {
    buttons.push({
      id: 'call_check',
      label: 'Passer',
      action: () => dispatchAction('check'),
      bg: 'bg-poker-green/20',
      textColor: 'text-poker-green',
    });
  } else {
    const isCallAllIn = toCall >= actor.stack_remaining_bb;
    buttons.push({
      id: 'call_check',
      label: isCallAllIn ? 'Suivre All-in' : `Suivre ${toCall}`,
      action: () => dispatchAction('call'),
      bg: 'bg-poker-green/20',
      textColor: 'text-poker-green',
    });
  }

  // 3. Bet / Raise
  if (toCall === 0) {
    buttons.push({
      id: 'raise_bet',
      label: 'Miser',
      action: onOpenKeypad,
      bg: 'bg-poker-blue/20',
      textColor: 'text-poker-blue',
    });
  } else {
    buttons.push({
      id: 'raise_bet',
      label: 'Relancer',
      action: onOpenKeypad,
      bg: 'bg-poker-blue/20',
      textColor: 'text-poker-blue',
    });
  }

  return (
    <div className="flex gap-2">
      {buttons.map((b) => (
        <button
          key={b.id}
          onClick={b.action}
          className={cn(
            'flex-1 py-3 rounded-lg text-sm font-bold transition-colors min-h-[52px] active:scale-95',
            b.bg,
            b.textColor,
            recoHint === b.id && pulseClass,
          )}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
};

/* ─── Toolbar Row (undo/redo/board/hero/next street/end) ─── */

const ToolbarRow = ({
  onOpenCardPicker,
  onEndHand,
}: {
  onOpenCardPicker: (t: 'hero' | 'board') => void;
  onEndHand: () => void;
}) => {
  const gameState = useGameStore((s) => s.gameState);
  const undo = useGameStore((s) => s.undo);
  const redo = useGameStore((s) => s.redo);
  const advanceStreet = useGameStore((s) => s.advanceStreet);
  const redoStack = useGameStore((s) => s.redoStack);

  if (!gameState) return null;

  const canUndo = gameState.actions.filter(a => a.type !== 'post_sb' && a.type !== 'post_bb').length > 0;
  const canRedo = redoStack.length > 0;

  const showNextStreet =
    gameState.street_state.is_closed &&
    gameState.current_street !== 'river' &&
    gameState.hand_status === 'in_progress';

  const streetOrder: Record<string, string> = {
    preflop: 'FLOP',
    flop: 'TURN',
    turn: 'RIVER',
  };
  const nextStreetLabel = streetOrder[gameState.current_street] ?? 'Next';

  const handleNextStreet = () => {
    advanceStreet();
    onOpenCardPicker('board');
  };

  return (
    <div className="flex items-center gap-1">
      <button onClick={undo} disabled={!canUndo} className={cn('p-1.5 rounded-md min-h-[36px] min-w-[36px] flex items-center justify-center', canUndo ? 'bg-secondary text-secondary-foreground' : 'opacity-30')}>
        <Undo2 className="h-3.5 w-3.5" />
      </button>
      <button onClick={redo} disabled={!canRedo} className={cn('p-1.5 rounded-md min-h-[36px] min-w-[36px] flex items-center justify-center', canRedo ? 'bg-secondary text-secondary-foreground' : 'opacity-30')}>
        <Redo2 className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => onOpenCardPicker('board')} className="px-2 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs min-h-[36px] flex items-center gap-1">
        <Spade className="h-3 w-3" /> Board
      </button>
      <button onClick={() => onOpenCardPicker('hero')} className="px-2 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs min-h-[36px] flex items-center gap-1">
        <Spade className="h-3 w-3" /> Hero
      </button>
      <div className="flex-1" />
      {showNextStreet && (
        <button onClick={handleNextStreet} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold min-h-[36px] flex items-center gap-1 active:scale-95">
          {nextStreetLabel} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
      <button onClick={onEndHand} className="px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium min-h-[36px] flex items-center gap-1 active:scale-95">
        <Square className="h-3 w-3" /> Fin
      </button>
    </div>
  );
};

/* ─── Main ActionBar ─── */

const ActionBar = ({ onOpenKeypad, onOpenCardPicker, onEndHand }: ActionBarProps) => {
  const [betAmount, setBetAmount] = useState('');
  const gameState = useGameStore((s) => s.gameState);
  const dispatchAction = useGameStore((s) => s.dispatchAction);
  const error = useGameStore((s) => s.error);
  const clearError = useGameStore((s) => s.clearError);
  const { hint, label } = useRecoHint();

  useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 3000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  if (!gameState) return null;

  const handlePresetAmount = (bb: number) => {
    setBetAmount(String(bb));
  };

  const handleConfirmBet = () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return;
    const toCall = gameState.derived.to_call_bb;
    if (toCall === 0) {
      dispatchAction('bet', amount);
    } else {
      dispatchAction('raise_to', amount);
    }
    setBetAmount('');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] space-y-1.5">
      {/* Error toast */}
      {error && (
        <div onClick={clearError} className="px-3 py-2 rounded-md bg-destructive/20 border border-destructive/30 text-destructive text-xs font-medium cursor-pointer">
          ⚠ {error}
        </div>
      )}

      {/* Reco strip */}
      <RecoStrip label={label} />

      {/* Main 3-button row */}
      <MainActionRow recoHint={hint} onOpenKeypad={onOpenKeypad} />

      {/* Sizing presets */}
      <SizingPresets onSelectAmount={handlePresetAmount} />

      {/* Bet input + confirm */}
      <BetInputRow
        betAmount={betAmount}
        setBetAmount={setBetAmount}
        onConfirm={handleConfirmBet}
        onOpenKeypad={onOpenKeypad}
      />

      {/* Toolbar: undo/redo/board/hero/next/end */}
      <ToolbarRow onOpenCardPicker={onOpenCardPicker} onEndHand={onEndHand} />
    </div>
  );
};

export default ActionBar;
