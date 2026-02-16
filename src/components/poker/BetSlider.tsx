import { useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { useGameStore } from '@/store/useGameStore';

interface BetSliderProps {
  betAmount: string;
  setBetAmount: (v: string) => void;
}

const BetSlider = ({ betAmount, setBetAmount }: BetSliderProps) => {
  const gameState = useGameStore((s) => s.gameState);

  const range = useMemo(() => {
    if (!gameState || gameState.hand_status !== 'in_progress' || gameState.street_state.is_closed) {
      return null;
    }

    const actor = gameState[gameState.expected_actor];
    const toCall = gameState.derived.to_call_bb;
    const { current_bet_bb } = gameState.street_state;
    const { min_raise_to_bb } = gameState.derived;
    const bb = gameState.config.bb_bb;

    const min = toCall === 0
      ? bb
      : (min_raise_to_bb ?? current_bet_bb + bb);

    const max = actor.invested_this_street_bb + actor.stack_remaining_bb;

    return { min, max };
  }, [gameState]);

  if (!range || range.min >= range.max) return null;

  const current = betAmount ? parseFloat(betAmount) : range.min;
  const clamped = Math.min(Math.max(current, range.min), range.max);

  const handleChange = (values: number[]) => {
    const val = values[0];
    // Round to 0.5 BB
    const rounded = Math.round(val * 2) / 2;
    const final = Math.min(Math.max(rounded, range.min), range.max);
    setBetAmount(String(final));
  };

  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-[10px] text-muted-foreground font-mono w-8 text-right shrink-0">
        {range.min}
      </span>
      <Slider
        value={[clamped]}
        min={range.min}
        max={range.max}
        step={0.5}
        onValueChange={handleChange}
        className="flex-1"
      />
      <span className="text-[10px] text-muted-foreground font-mono w-8 shrink-0">
        {range.max}
      </span>
    </div>
  );
};

export default BetSlider;
