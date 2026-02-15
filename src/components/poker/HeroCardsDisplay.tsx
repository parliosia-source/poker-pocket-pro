import { MOCK_HERO_CARDS } from '@/mock/mockHand';
import CardDisplay from './CardDisplay';

interface HeroCardsDisplayProps {
  onTap?: () => void;
}

const HeroCardsDisplay = ({ onTap }: HeroCardsDisplayProps) => {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hero</p>
      <div className="flex items-center gap-1">
        {MOCK_HERO_CARDS.map((c, i) => (
          <CardDisplay key={i} card={c} size="lg" onClick={onTap} />
        ))}
      </div>
    </div>
  );
};

export default HeroCardsDisplay;
