import { cn } from '@/lib/utils';
import CardDisplay from './CardDisplay';

interface HandSummaryCardProps {
  hand: {
    id: number;
    heroCards: string[];
    board: string[];
    result: number;
    position: string;
    actions: number;
  };
}

const HandSummaryCard = ({ hand }: HandSummaryCardProps) => {
  const isPositive = hand.result > 0;

  return (
    <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
      <div className="text-xs text-muted-foreground font-mono w-6 shrink-0 text-center">
        #{hand.id}
      </div>
      <div className="flex gap-0.5">
        {hand.heroCards.map((c, i) => (
          <CardDisplay key={i} card={c} size="sm" />
        ))}
      </div>
      {hand.board.length > 0 && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="flex gap-0.5 flex-1 min-w-0 overflow-hidden">
            {hand.board.map((c, i) => (
              <CardDisplay key={i} card={c} size="sm" />
            ))}
          </div>
        </>
      )}
      <div className="ml-auto flex flex-col items-end shrink-0">
        <span
          className={cn(
            'font-mono font-bold text-sm',
            isPositive ? 'text-poker-green' : 'text-poker-red',
          )}
        >
          {isPositive ? '+' : ''}{hand.result} BB
        </span>
        <span className="text-[10px] text-muted-foreground">
          {hand.position} · {hand.actions} actions
        </span>
      </div>
    </div>
  );
};

export default HandSummaryCard;
