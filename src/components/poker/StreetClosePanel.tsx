import { ChevronRight } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

interface StreetClosePanelProps {
  onAdvance: () => void;
}

const STREET_LABELS: Record<string, string> = {
  preflop: 'FLOP',
  flop: 'TURN',
  turn: 'RIVER',
};

const StreetClosePanel = ({ onAdvance }: StreetClosePanelProps) => {
  const gameState = useGameStore((s) => s.gameState);

  if (!gameState) return null;
  if (!gameState.street_state.is_closed) return null;
  if (gameState.current_street === 'river') return null;
  if (gameState.hand_status !== 'in_progress') return null;

  const label = STREET_LABELS[gameState.current_street] ?? 'NEXT';

  return (
    <div className="space-y-2">
      <p className="text-center text-xs text-muted-foreground">Street terminée</p>
      <button
        onClick={onAdvance}
        className="w-full py-4 rounded-lg bg-primary text-primary-foreground text-base font-bold min-h-[56px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        {label} <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default StreetClosePanel;
