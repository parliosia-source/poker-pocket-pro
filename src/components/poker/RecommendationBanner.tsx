import { useGameStore } from '@/store/useGameStore';
import { cn } from '@/lib/utils';
import { MinusCircle } from 'lucide-react';

const RecommendationBanner = () => {
  const gameState = useGameStore((s) => s.gameState);

  if (!gameState) return null;

  // Phase 2: no reco engine, show placeholder
  return (
    <div className={cn('rounded-lg border px-3 py-2 flex items-center gap-2 bg-secondary/50 border-border text-muted-foreground')}>
      <MinusCircle className="h-4 w-4 shrink-0" />
      <p className="text-sm font-medium">
        Reco <span className="font-normal opacity-80">— disponible en Phase 3 (equity + Monte Carlo)</span>
      </p>
    </div>
  );
};

export default RecommendationBanner;
