import { useGameStore } from '@/store/useGameStore';
import CardDisplay from './CardDisplay';

interface HeroCardsDisplayProps {
  onTap?: () => void;
}

const HeroCardsDisplay = ({ onTap }: HeroCardsDisplayProps) => {
  const heroCards = useGameStore((s) => s.gameState?.hero_cards);

  const cards = heroCards ?? [null, null];

  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hero</p>
      <div className="flex items-center gap-1">
        {cards.map((c, i) => (
          <CardDisplay key={i} card={c} size="lg" onClick={onTap} />
        ))}
      </div>
    </div>
  );
};

export default HeroCardsDisplay;
