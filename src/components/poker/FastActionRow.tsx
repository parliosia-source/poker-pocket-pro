import { cn } from '@/lib/utils';
import type { FastActionState } from '@/hooks/useFastAction';

interface FastActionRowProps {
  state: FastActionState;
  onFold: () => void;
  onPassive: () => void;
  onRaise: () => void;
}

const FastActionRow = ({ state, onFold, onPassive, onRaise }: FastActionRowProps) => {
  if (!state.canAct || state.isHeroTurn) return null;

  return (
    <div className="flex gap-2">
      {state.showFold && (
        <button
          onClick={onFold}
          className="flex-1 py-3 rounded-lg text-sm font-bold transition-colors min-h-[52px] active:scale-95 bg-poker-red/20 text-poker-red"
        >
          Fold & Next
        </button>
      )}
      <button
        onClick={onPassive}
        className="flex-[2] py-3 rounded-lg text-sm font-bold transition-colors min-h-[52px] active:scale-95 bg-poker-green/20 text-poker-green"
      >
        {state.passiveLabel}
      </button>
      {state.showRaise && (
        <button
          onClick={onRaise}
          className="flex-1 py-3 rounded-lg text-sm font-bold transition-colors min-h-[52px] active:scale-95 bg-poker-blue/20 text-poker-blue"
        >
          {state.raiseLabel}
        </button>
      )}
    </div>
  );
};

export default FastActionRow;
