import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Spade, ChevronRight, Square, Undo2, Redo2 } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import type { ActionType } from '@/engine/types';

interface ActionBarProps {
  onOpenKeypad: () => void;
  onOpenCardPicker: (target: 'hero' | 'board') => void;
}

/* ─── Sub-components ─── */

const ActorIndicator = () => {
  const expected = useGameStore((s) => s.gameState?.expected_actor);
  const handStatus = useGameStore((s) => s.gameState?.hand_status);

  if (handStatus !== 'in_progress') {
    return (
      <div className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground min-h-[36px] flex items-center">
        Main terminée
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      {(['hero', 'villain'] as const).map((a) => (
        <div
          key={a}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium min-h-[36px] capitalize flex items-center',
            expected === a ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground opacity-50',
          )}
        >
          {a === 'hero' ? '● Hero' : '○ Villain'}
        </div>
      ))}
    </div>
  );
};

const ActionButtons = () => {
  const gameState = useGameStore((s) => s.gameState);
  const dispatchAction = useGameStore((s) => s.dispatchAction);
  const getAvailableActions = useGameStore((s) => s.getAvailableActions);
  const getSizingOptions = useGameStore((s) => s.getSizingOptions);

  if (!gameState || gameState.hand_status !== 'in_progress') return null;

  const available = getAvailableActions();
  const toCall = gameState.derived.to_call_bb;
  const sizing = getSizingOptions();

  const buttons: { label: string; type: ActionType; style: string; amount?: number }[] = [];

  if (toCall === 0) {
    // Check mode
    if (available.includes('check')) {
      buttons.push({ label: 'Check', type: 'check', style: 'bg-secondary text-secondary-foreground' });
    }
  } else {
    // Facing bet/raise
    if (available.includes('fold')) {
      buttons.push({ label: 'Fold', type: 'fold', style: 'bg-poker-red/20 text-poker-red' });
    }
    if (available.includes('call')) {
      const callLabel = toCall >= (gameState ? gameState[gameState.expected_actor].stack_remaining_bb : 0)
        ? `Call All-in`
        : `Call ${toCall}`;
      buttons.push({ label: callLabel, type: 'call', style: 'bg-poker-green/20 text-poker-green' });
    }
  }

  return (
    <div className="flex gap-1.5">
      {buttons.map((a) => (
        <button
          key={a.label}
          onClick={() => dispatchAction(a.type, a.amount)}
          className={cn('flex-1 py-2 rounded-md text-xs font-medium transition-colors min-h-[44px] active:scale-95', a.style)}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
};

const QuickSizing = () => {
  const gameState = useGameStore((s) => s.gameState);
  const getSizingOptions = useGameStore((s) => s.getSizingOptions);
  const dispatchAction = useGameStore((s) => s.dispatchAction);
  const getAvailableActions = useGameStore((s) => s.getAvailableActions);

  if (!gameState || gameState.hand_status !== 'in_progress') return null;

  const sizing = getSizingOptions();
  const available = getAvailableActions();
  if (!sizing) return null;

  const toCall = gameState.derived.to_call_bb;
  const isBetMode = toCall === 0;
  const actor = gameState[gameState.expected_actor];

  const handleSizing = (amount: number) => {
    if (isBetMode) {
      dispatchAction('bet', amount);
    } else {
      dispatchAction('raise_to', amount);
    }
  };

  const canBetOrRaise = isBetMode ? available.includes('bet') : available.includes('raise_to');

  const sizingButtons: { label: string; amount: number; visible: boolean }[] = [
    { label: isBetMode ? `½P ${sizing.halfPot}` : `R½P ${sizing.halfPot}`, amount: sizing.halfPot, visible: canBetOrRaise },
    { label: isBetMode ? `¾P ${sizing.threeFourthPot}` : `R¾P ${sizing.threeFourthPot}`, amount: sizing.threeFourthPot, visible: canBetOrRaise },
    { label: isBetMode ? `Pot ${sizing.pot}` : `RPot ${sizing.pot}`, amount: sizing.pot, visible: canBetOrRaise },
    { label: `2.2× ${sizing.twoPointTwo ?? ''}`, amount: sizing.twoPointTwo ?? 0, visible: sizing.twoPointTwo != null && canBetOrRaise },
    { label: `All-in ${sizing.allIn}`, amount: sizing.allIn, visible: available.includes('all_in') },
  ];

  return (
    <div className="flex gap-1">
      {sizingButtons.filter(s => s.visible).map((s) => (
        <button
          key={s.label}
          onClick={() => {
            if (s.label.startsWith('All-in')) {
              dispatchAction('all_in');
            } else {
              handleSizing(s.amount);
            }
          }}
          className="flex-1 py-1.5 rounded-md text-[10px] font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors min-h-[32px] active:scale-95"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
};

const CustomBetInput = ({ onOpenKeypad }: { onOpenKeypad: () => void }) => {
  const gameState = useGameStore((s) => s.gameState);
  if (!gameState || gameState.hand_status !== 'in_progress') return null;

  const toCall = gameState.derived.to_call_bb;
  const placeholder = toCall === 0
    ? `${gameState.config.bb_bb} BB`
    : `${gameState.derived.min_raise_to_bb ?? gameState.config.bb_bb} BB`;

  return (
    <button
      onClick={onOpenKeypad}
      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-md bg-input border border-border text-sm font-mono text-muted-foreground min-h-[44px] hover:border-primary/50 transition-colors"
    >
      <span>{placeholder}</span>
    </button>
  );
};

/* ─── Main ActionBar ─── */

const ActionBar = ({ onOpenKeypad, onOpenCardPicker }: ActionBarProps) => {
  const gameState = useGameStore((s) => s.gameState);
  const undo = useGameStore((s) => s.undo);
  const redo = useGameStore((s) => s.redo);
  const advanceStreet = useGameStore((s) => s.advanceStreet);
  const endHand = useGameStore((s) => s.endHand);
  const redoStack = useGameStore((s) => s.redoStack);
  const error = useGameStore((s) => s.error);
  const clearError = useGameStore((s) => s.clearError);

  // Auto-dismiss error after 3s
  useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 3000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  if (!gameState) return null;

  const canUndo = gameState.actions.filter(a => a.type !== 'post_sb' && a.type !== 'post_bb').length > 0;
  const canRedo = redoStack.length > 0;

  const showNextStreet =
    gameState.street_state.is_closed &&
    gameState.current_street !== 'river' &&
    gameState.hand_status === 'in_progress';

  const showEndHand =
    gameState.hand_status !== 'in_progress' ||
    (gameState.current_street === 'river' && gameState.street_state.is_closed);

  const handleNextStreet = () => {
    // Advance first (no board cards yet), then open picker
    advanceStreet();
    onOpenCardPicker('board');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {/* Error toast */}
      {error && (
        <div
          onClick={clearError}
          className="mb-2 px-3 py-2 rounded-md bg-destructive/20 border border-destructive/30 text-destructive text-xs font-medium cursor-pointer"
        >
          ⚠ {error}
        </div>
      )}

      {/* Row 1: Actor indicator + Card Pickers + Undo/Redo */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <ActorIndicator />
        <div className="flex gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={cn('p-1.5 rounded-md min-h-[36px] min-w-[36px] flex items-center justify-center', canUndo ? 'bg-secondary text-secondary-foreground' : 'opacity-30')}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={cn('p-1.5 rounded-md min-h-[36px] min-w-[36px] flex items-center justify-center', canRedo ? 'bg-secondary text-secondary-foreground' : 'opacity-30')}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onOpenCardPicker('board')}
            className="px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs min-h-[36px] flex items-center gap-1"
          >
            <Spade className="h-3 w-3" /> Board
          </button>
          <button
            onClick={() => onOpenCardPicker('hero')}
            className="px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs min-h-[36px] flex items-center gap-1"
          >
            <Spade className="h-3 w-3" /> Hero
          </button>
        </div>
      </div>

      {/* Row 2: Action buttons */}
      <div className="mb-2">
        <ActionButtons />
      </div>

      {/* Row 3: Quick sizing */}
      <div className="mb-2">
        <QuickSizing />
      </div>

      {/* Row 4: Bet input + Navigation */}
      <div className="flex items-center gap-2">
        <CustomBetInput onOpenKeypad={onOpenKeypad} />
        {showNextStreet && (
          <button
            onClick={handleNextStreet}
            className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium min-h-[44px] flex items-center gap-1 active:scale-95"
          >
            <ChevronRight className="h-3 w-3" /> Next
          </button>
        )}
        {showEndHand && (
          <button
            onClick={() => endHand()}
            className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-xs font-medium min-h-[44px] flex items-center gap-1 active:scale-95"
          >
            <Square className="h-3 w-3" /> Fin
          </button>
        )}
      </div>
    </div>
  );
};

export default ActionBar;
