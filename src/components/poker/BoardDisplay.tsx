import { useGameStore } from '@/store/useGameStore';
import CardDisplay from './CardDisplay';

interface BoardDisplayProps {
  onTap?: () => void;
}

const BoardDisplay = ({ onTap }: BoardDisplayProps) => {
  const board = useGameStore((s) => s.gameState?.board);

  const flopCards = board?.flop ?? [null, null, null] as const;
  const turnCard = board?.turn ?? null;
  const riverCard = board?.river ?? null;

  return (
    <div className="flex-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Board</p>
      <div className="flex items-center gap-1">
        {/* Flop */}
        {flopCards.map((c, i) => (
          <CardDisplay key={`f${i}`} card={c} size="md" onClick={onTap} />
        ))}
        {/* Turn */}
        <div className="w-px h-6 bg-border mx-0.5" />
        <CardDisplay card={turnCard} size="md" onClick={onTap} />
        {/* River */}
        <div className="w-px h-6 bg-border mx-0.5" />
        <CardDisplay card={riverCard} size="md" onClick={onTap} />
      </div>
    </div>
  );
};

export default BoardDisplay;
