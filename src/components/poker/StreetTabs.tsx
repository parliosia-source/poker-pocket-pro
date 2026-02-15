import { useGameStore } from '@/store/useGameStore';
import { cn } from '@/lib/utils';
import type { Street } from '@/engine/types';

const STREETS: { name: string; key: Street }[] = [
  { name: 'Preflop', key: 'preflop' },
  { name: 'Flop', key: 'flop' },
  { name: 'Turn', key: 'turn' },
  { name: 'River', key: 'river' },
];

const STREET_ORDER: Street[] = ['preflop', 'flop', 'turn', 'river'];

const StreetTabs = () => {
  const gameState = useGameStore((s) => s.gameState);
  if (!gameState) return null;

  const currentIndex = STREET_ORDER.indexOf(gameState.current_street);

  return (
    <div className="flex gap-1 bg-card rounded-lg border border-border p-1">
      {STREETS.map((s, i) => {
        const isActive = s.key === gameState.current_street;
        const isCompleted = i < currentIndex;
        const isUpcoming = i > currentIndex;

        return (
          <button
            key={s.key}
            className={cn(
              'flex-1 py-2 rounded-md text-xs font-medium transition-colors min-h-[40px] flex items-center justify-center gap-1',
              isActive && 'bg-primary text-primary-foreground',
              isCompleted && 'bg-secondary text-secondary-foreground',
              isUpcoming && 'text-muted-foreground',
            )}
          >
            {isActive && <span className="text-[8px]">●</span>}
            {isCompleted && <span className="text-[10px]">✓</span>}
            {s.name}
          </button>
        );
      })}
    </div>
  );
};

export default StreetTabs;
