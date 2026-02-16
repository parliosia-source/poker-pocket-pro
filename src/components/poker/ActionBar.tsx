import { useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Undo2, Redo2, Square, Spade, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useEquity } from '@/hooks/useEquity';
import { useFastAction } from '@/hooks/useFastAction';
import { computeReco } from '@/engine/recoEngine';
import { getPlayerById, findHero } from '@/engine/utils';
import type { ActionType } from '@/engine/types';
import BetSlider from './BetSlider';
import AllInConfirmDialog from './AllInConfirmDialog';
import FastActionRow from './FastActionRow';
import VillainRaisePanel from './VillainRaisePanel';
import StreetClosePanel from './StreetClosePanel';
import LastActionChip from './LastActionChip';
import TableMap from './TableMap';

interface ActionBarProps {
  onOpenKeypad: () => void;
  onOpenCardPicker: (target: 'hero' | 'board') => void;
  onEndHand: () => void;
}

/* ─── Reco hook ─── */

type RecoHint = 'fold' | 'call_check' | 'raise_bet' | null;

function useRecoHint(): { hint: RecoHint; label: string } {
  const gameState = useGameStore((s) => s.gameState);
  const { equity } = useEquity();

  return useMemo(() => {
    if (!gameState || gameState.hand_status !== 'in_progress') {
      return { hint: null, label: 'Reco : indisponible' };
    }

    const actor = gameState.expected_actor_id
      ? getPlayerById(gameState, gameState.expected_actor_id)
      : null;
    if (!actor?.is_hero) {
      return { hint: null, label: '' };
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
        return { hint: null, label: 'Reco : indisponible' };
    }
  }, [gameState, equity]);
}

/* ─── Actor Ribbon with LastActionChip ─── */

const ActorRibbon = ({ overrideActorId, setOverrideActorId }: {
  overrideActorId: string | null;
  setOverrideActorId: (id: string | null) => void;
}) => {
  const gameState = useGameStore((s) => s.gameState);
  const fastState = useFastAction(overrideActorId);

  if (!gameState) return null;

  const expectedId = gameState.expected_actor_id;
  const nextActorId = fastState.nextActorId;

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {gameState.players.map((p) => {
        const isExpected = p.id === expectedId;
        const isOverride = overrideActorId === p.id;
        const isCurrent = isOverride || (!overrideActorId && isExpected);
        const isNext = p.id === nextActorId && !isCurrent;
        const canTap = p.status === 'active';
        const isFolded = p.status === 'folded';
        const isAllIn = p.status === 'all_in';

        return (
          <button
            key={p.id}
            disabled={!canTap || isFolded || isAllIn}
            onClick={() => {
              if (isExpected) {
                setOverrideActorId(null);
              } else {
                setOverrideActorId(p.id);
              }
            }}
            className={cn(
              'flex flex-col items-center justify-center rounded-md text-[10px] font-bold transition-all min-h-[48px] min-w-[48px] px-1.5 shrink-0',
              isCurrent && 'bg-primary text-primary-foreground ring-2 ring-ring',
              !isCurrent && isExpected && 'bg-primary/30 text-primary',
              !isCurrent && !isExpected && canTap && 'bg-secondary text-secondary-foreground',
              isNext && 'border border-dashed border-muted-foreground/40',
              isFolded && 'opacity-30 line-through',
              isAllIn && 'opacity-70 bg-poker-red/20 text-poker-red',
              p.is_hero && !isCurrent && 'border border-primary/50',
            )}
          >
            <span>{p.position_label}</span>
            {p.is_hero && <span className="text-[8px]">★</span>}
            {isAllIn && <span className="text-[8px]">AI</span>}
            <LastActionChip playerId={p.id} />
          </button>
        );
      })}
    </div>
  );
};

/* ─── Reco Strip ─── */

const RecoStrip = ({ label }: { label: string }) => {
  if (!label) return null;
  return (
    <div className="px-3 py-1.5 rounded-md bg-card border border-border text-[10px] text-muted-foreground truncate">
      💡 {label}
    </div>
  );
};

/* ─── Hero Sizing Presets ─── */

const SizingPresets = ({ onSelectAmount, actorId }: { onSelectAmount: (bb: number) => void; actorId: string | null }) => {
  const gameState = useGameStore((s) => s.gameState);
  if (!gameState || gameState.hand_status !== 'in_progress') return null;
  if (gameState.street_state.is_closed) return null;
  if (!actorId) return null;

  const actor = getPlayerById(gameState, actorId);
  if (!actor) return null;

  const { current_bet_bb } = gameState.street_state;
  const { min_raise_to_bb } = gameState.derived;
  const toCall = Math.max(0, current_bet_bb - actor.invested_this_street_bb);
  const isPreflop = gameState.current_street === 'preflop';
  const bb = gameState.config.bb_bb;

  const isUnopened = current_bet_bb === 0;
  const minAmount = isUnopened ? bb : (min_raise_to_bb ?? current_bet_bb + bb);
  const maxAmount = actor.invested_this_street_bb + actor.stack_remaining_bb;

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

/* ─── Hero Bet Input Row ─── */

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
  if (gameState.street_state.is_closed) return null;

  const isUnopened = gameState.street_state.current_bet_bb === 0;
  const placeholder = isUnopened
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

/* ─── Hero Main 3-Button Row ─── */

const HeroActionRow = ({
  recoHint,
  onOpenKeypad,
  actorId,
}: {
  recoHint: RecoHint;
  onOpenKeypad: () => void;
  actorId: string | null;
}) => {
  const gameState = useGameStore((s) => s.gameState);
  const dispatchAction = useGameStore((s) => s.dispatchAction);

  if (!gameState || gameState.hand_status !== 'in_progress') return null;
  if (gameState.street_state.is_closed) return null;
  if (!actorId) return null;

  const actor = getPlayerById(gameState, actorId);
  if (!actor || actor.status !== 'active') return null;

  const toCall = Math.max(0, gameState.street_state.current_bet_bb - actor.invested_this_street_bb);

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

  if (toCall > 0) {
    buttons.push({
      id: 'fold',
      label: 'Abandonner',
      action: () => dispatchAction('fold', undefined, actorId),
      bg: 'bg-poker-red/20',
      textColor: 'text-poker-red',
    });
  }

  const isUnopened = gameState.street_state.current_bet_bb === 0;

  if (toCall === 0) {
    buttons.push({
      id: 'call_check',
      label: 'Passer',
      action: () => dispatchAction('check', undefined, actorId),
      bg: 'bg-poker-green/20',
      textColor: 'text-poker-green',
    });
  } else {
    const isCallAllIn = toCall >= actor.stack_remaining_bb;
    buttons.push({
      id: 'call_check',
      label: isCallAllIn ? 'Suivre All-in' : `Suivre ${toCall}`,
      action: () => dispatchAction('call', undefined, actorId),
      bg: 'bg-poker-green/20',
      textColor: 'text-poker-green',
    });
  }

  buttons.push({
    id: 'raise_bet',
    label: isUnopened ? 'Miser' : 'Relancer',
    action: onOpenKeypad,
    bg: 'bg-poker-blue/20',
    textColor: 'text-poker-blue',
  });

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

/* ─── Toolbar Row ─── */

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
  const timeline = useGameStore((s) => s.timeline);
  const redoStack = useGameStore((s) => s.redoStack);

  if (!gameState) return null;

  const canUndo = timeline.length > 0;
  const canRedo = redoStack.length > 0;

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
      <button onClick={onEndHand} className="px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium min-h-[36px] flex items-center gap-1 active:scale-95">
        <Square className="h-3 w-3" /> Fin
      </button>
    </div>
  );
};

/* ─── Main ActionBar ─── */

const ActionBar = ({ onOpenKeypad, onOpenCardPicker, onEndHand }: ActionBarProps) => {
  const [betAmount, setBetAmount] = useState('');
  const [allInConfirm, setAllInConfirm] = useState<{ amount: number } | null>(null);
  const [overrideActorId, setOverrideActorId] = useState<string | null>(null);
  const [raisePanelOpen, setRaisePanelOpen] = useState(false);
  const [viewForce, setViewForce] = useState<'ribbon' | 'table' | null>(null);
  const gameState = useGameStore((s) => s.gameState);
  const dispatchAction = useGameStore((s) => s.dispatchAction);
  const advanceStreetFn = useGameStore((s) => s.advanceStreet);
  const error = useGameStore((s) => s.error);
  const clearError = useGameStore((s) => s.clearError);
  const { hint, label } = useRecoHint();
  const fastState = useFastAction(overrideActorId);

  // Reset override when expected_actor changes
  useEffect(() => {
    setOverrideActorId(null);
    setRaisePanelOpen(false);
  }, [gameState?.expected_actor_id]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 3000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  // ─── Fast dispatch for villain ───
  const dispatchFast = useCallback((type: 'fold' | 'check' | 'call') => {
    const actorId = overrideActorId ?? gameState?.expected_actor_id;
    if (!actorId) return;
    dispatchAction(type, undefined, actorId);
    if (navigator.vibrate) navigator.vibrate(16);
    setOverrideActorId(null);
    setBetAmount('');
    setRaisePanelOpen(false);
  }, [overrideActorId, gameState?.expected_actor_id, dispatchAction]);

  if (!gameState) return null;

  const activeActorId = overrideActorId ?? gameState.expected_actor_id;
  const actor = activeActorId ? getPlayerById(gameState, activeActorId) : null;
  const isHeroActing = actor?.is_hero ?? false;
  const allInAmount = actor ? actor.invested_this_street_bb + actor.stack_remaining_bb : 0;
  const isClosed = gameState.street_state.is_closed;

  // ─── Hero bet/raise confirm ───
  const handlePresetAmount = (bb: number) => {
    setBetAmount(String(bb));
  };

  const isAllIn = (amount: number) => Math.abs(amount - allInAmount) < 0.01;

  const doDispatchBet = (amount: number, actorId?: string) => {
    const pid = actorId ?? activeActorId ?? undefined;
    const isUnopened = gameState.street_state.current_bet_bb === 0;
    if (isUnopened) {
      dispatchAction('bet', amount, pid);
    } else {
      dispatchAction('raise_to', amount, pid);
    }
    setBetAmount('');
    setRaisePanelOpen(false);
  };

  const handleConfirmBet = () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (isAllIn(amount) && isHeroActing) {
      setAllInConfirm({ amount });
      return;
    }

    doDispatchBet(amount);
  };

  const handleAllInConfirmed = () => {
    if (allInConfirm) {
      doDispatchBet(allInConfirm.amount);
    }
    setAllInConfirm(null);
  };

  // ─── Villain raise confirm ───
  const handleVillainRaise = (amount: number) => {
    const pid = activeActorId ?? undefined;
    const isUnopened = gameState.street_state.current_bet_bb === 0;
    const timelineBefore = useGameStore.getState().timeline.length;
    if (isUnopened) {
      dispatchAction('bet', amount, pid);
    } else {
      dispatchAction('raise_to', amount, pid);
    }
    const timelineAfter = useGameStore.getState().timeline.length;
    if (timelineAfter === timelineBefore) {
      // Action was rejected — keep panel open
      return;
    }
    if (navigator.vibrate) navigator.vibrate(16);
    setRaisePanelOpen(false);
    setBetAmount('');
  };

  // ─── Street advance ───
  const handleAdvanceStreet = () => {
    advanceStreetFn();
    onOpenCardPicker('board');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] space-y-1.5">
      {/* Error toast */}
      {error && (
        <div onClick={clearError} className="px-3 py-2 rounded-md bg-destructive/20 border border-destructive/30 text-destructive text-xs font-medium cursor-pointer">
          ⚠ {error}
        </div>
      )}

      {/* Side pot warning */}
      {gameState.derived.side_pot_warning && (
        <div className="px-3 py-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Side pot détecté — pot affiché = pot total
        </div>
      )}

      {/* Actor view: auto Table for villain, Ribbon for hero — with toggle */}
      {(() => {
        const autoMode = isHeroActing ? 'ribbon' : 'table';
        const viewMode = viewForce ?? autoMode;
        return (
          <>
            <div className="flex items-center justify-between">
              {viewMode === 'table' ? (
                <TableMap overrideActorId={overrideActorId} setOverrideActorId={setOverrideActorId} />
              ) : (
                <div className="flex-1 overflow-hidden">
                  <ActorRibbon overrideActorId={overrideActorId} setOverrideActorId={setOverrideActorId} />
                </div>
              )}
              <button
                onClick={() => setViewForce(viewMode === 'table' ? 'ribbon' : 'table')}
                className="ml-1.5 p-1.5 rounded-md bg-secondary text-secondary-foreground min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
                title={viewMode === 'table' ? 'Vue ruban' : 'Vue table'}
              >
                {viewMode === 'table' ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
              </button>
            </div>
          </>
        );
      })()}

      {/* ═══ MODE: Street Closed ═══ */}
      {isClosed && (
        <StreetClosePanel onAdvance={handleAdvanceStreet} />
      )}

      {/* ═══ MODE: Villain (fast) ═══ */}
      {!isClosed && fastState.canAct && !isHeroActing && (
        <>
          {/* Villain info bar */}
          <div className="px-3 py-1 rounded-md bg-secondary text-secondary-foreground text-[10px]">
            {fastState.actorLabel} — Stack {fastState.actorStack} BB
          </div>

          {raisePanelOpen && activeActorId ? (
            <VillainRaisePanel
              actorId={activeActorId}
              onConfirm={handleVillainRaise}
              onBack={() => setRaisePanelOpen(false)}
            />
          ) : (
            <FastActionRow
              state={fastState}
              onFold={() => dispatchFast('fold')}
              onPassive={() => dispatchFast(fastState.passiveType)}
              onRaise={() => setRaisePanelOpen(true)}
            />
          )}
        </>
      )}

      {/* ═══ MODE: Hero (complete) ═══ */}
      {!isClosed && fastState.canAct && isHeroActing && (
        <>
          <RecoStrip label={label} />
          <HeroActionRow recoHint={hint} onOpenKeypad={onOpenKeypad} actorId={activeActorId} />
          <SizingPresets onSelectAmount={handlePresetAmount} actorId={activeActorId} />
          <BetSlider betAmount={betAmount} setBetAmount={setBetAmount} />
          <BetInputRow
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            onConfirm={handleConfirmBet}
            onOpenKeypad={onOpenKeypad}
          />
        </>
      )}

      {/* Toolbar (always visible) */}
      <ToolbarRow onOpenCardPicker={onOpenCardPicker} onEndHand={onEndHand} />

      {/* All-in confirmation (hero only) */}
      <AllInConfirmDialog
        open={allInConfirm !== null}
        amount={allInConfirm?.amount ?? 0}
        onConfirm={handleAllInConfirmed}
        onCancel={() => setAllInConfirm(null)}
      />
    </div>
  );
};

export default ActionBar;
