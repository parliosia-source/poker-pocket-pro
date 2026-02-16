import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { getPlayerById } from '@/engine/utils';

interface VillainRaisePanelProps {
  actorId: string;
  onConfirm: (amount: number) => void;
  onBack: () => void;
}

const VillainRaisePanel = ({ actorId, onConfirm, onBack }: VillainRaisePanelProps) => {
  const [betAmount, setBetAmount] = useState('');
  const gameState = useGameStore((s) => s.gameState);

  if (!gameState) return null;

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

  const handlePreset = (amount: number) => {
    setBetAmount(String(Math.min(amount, maxAmount)));
  };

  const handleConfirm = () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return;
    onConfirm(Math.min(amount, maxAmount));
  };

  const placeholder = minAmount;

  return (
    <div className="space-y-1.5">
      {/* Presets */}
      <div className="flex gap-1">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => handlePreset(p.amount)}
            className="flex-1 py-1.5 rounded-md text-[10px] font-semibold bg-secondary text-secondary-foreground hover:bg-accent transition-colors min-h-[32px] active:scale-95"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input + OK */}
      <div className="flex gap-1.5 items-center">
        <div className="flex-1 flex items-center justify-center gap-1 py-2 rounded-md bg-input border border-border text-sm font-mono text-foreground min-h-[44px]">
          {betAmount ? `${betAmount} BB` : `${placeholder} BB`}
        </div>
        {betAmount && (
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-md bg-poker-blue text-foreground text-sm font-semibold min-h-[44px] active:scale-95"
          >
            OK
          </button>
        )}
      </div>

      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        <ArrowLeft className="h-3 w-3" /> Retour
      </button>
    </div>
  );
};

export default VillainRaisePanel;
