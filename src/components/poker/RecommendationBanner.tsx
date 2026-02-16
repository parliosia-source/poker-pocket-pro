import { useGameStore } from '@/store/useGameStore';
import { useEquity } from '@/hooks/useEquity';
import { computeReco, type RecoOutput } from '@/engine/recoEngine';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, MinusCircle, ArrowRight, Loader2 } from 'lucide-react';

const RECO_STYLES: Record<string, { icon: typeof TrendingUp; bg: string; text: string }> = {
  RAISE: { icon: TrendingUp, bg: 'bg-poker-green/15 border-poker-green/30', text: 'text-poker-green' },
  BET: { icon: TrendingUp, bg: 'bg-poker-green/15 border-poker-green/30', text: 'text-poker-green' },
  CALL: { icon: ArrowRight, bg: 'bg-blue-500/15 border-blue-500/30', text: 'text-blue-400' },
  CHECK: { icon: MinusCircle, bg: 'bg-secondary/50 border-border', text: 'text-muted-foreground' },
  FOLD: { icon: TrendingDown, bg: 'bg-poker-red/15 border-poker-red/30', text: 'text-poker-red' },
};

const RecommendationBanner = () => {
  const gameState = useGameStore((s) => s.gameState);
  const { equity, loading } = useEquity();

  if (!gameState) return null;

  const d = gameState.derived;
  const boardCards: string[] = [];
  gameState.board.flop.forEach(c => { if (c) boardCards.push(c); });
  if (gameState.board.turn) boardCards.push(gameState.board.turn);
  if (gameState.board.river) boardCards.push(gameState.board.river);

  const reco: RecoOutput = computeReco({
    equity,
    potOddsPct: d.pot_odds_pct,
    toCallBb: d.to_call_bb,
    potBb: d.pot_bb,
    spr: d.spr,
    street: gameState.current_street,
    hasBoardCards: boardCards.length >= 3,
  });

  const style = RECO_STYLES[reco.action] ?? RECO_STYLES.CHECK;
  const Icon = style.icon;

  const confidenceDot = reco.confidence === 'high' ? '●' : reco.confidence === 'med' ? '◐' : '○';

  return (
    <div className={cn('rounded-lg border px-3 py-2 flex items-center gap-2', style.bg)}>
      {loading ? (
        <Loader2 className={cn('h-4 w-4 shrink-0 animate-spin', style.text)} />
      ) : (
        <Icon className={cn('h-4 w-4 shrink-0', style.text)} />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', style.text)}>
          {confidenceDot} {reco.action}
        </p>
        <p className="text-xs text-muted-foreground truncate">{reco.rationale}</p>
      </div>
    </div>
  );
};

export default RecommendationBanner;
