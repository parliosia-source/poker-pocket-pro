import { MOCK_BOARD } from '@/mock/mockHand';
import CardDisplay from './CardDisplay';

interface BoardDisplayProps {
  onTap?: () => void;
}

const BoardDisplay = ({ onTap }: BoardDisplayProps) => {
  const flopCards = MOCK_BOARD.slice(0, 3);
  const turnCard = MOCK_BOARD[3];
  const riverCard = MOCK_BOARD[4];

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
