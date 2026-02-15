import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Spade, ChevronRight, Square } from 'lucide-react';

interface ActionBarProps {
  onOpenKeypad: () => void;
  onOpenCardPicker: (target: 'hero' | 'board') => void;
}

/* ─── Sub-components ─── */

const ActorToggle = () => {
  const [actor, setActor] = useState<'hero' | 'villain'>('hero');
  return (
    <div className="flex gap-1">
      {(['hero', 'villain'] as const).map((a) => (
        <button
          key={a}
          onClick={() => setActor(a)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[36px] capitalize',
            actor === a ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
          )}
        >
          {a === 'hero' ? '● Hero' : '○ Villain'}
        </button>
      ))}
    </div>
  );
};

const ActionButtons = () => {
  const actions = [
    { label: 'Check', style: 'bg-secondary text-secondary-foreground' },
    { label: 'Fold', style: 'bg-poker-red/20 text-poker-red' },
    { label: 'Call', style: 'bg-poker-green/20 text-poker-green' },
    { label: 'Raise', style: 'bg-poker-gold/20 text-poker-gold' },
  ];

  return (
    <div className="flex gap-1.5">
      {actions.map((a) => (
        <button
          key={a.label}
          className={cn('flex-1 py-2 rounded-md text-xs font-medium transition-colors min-h-[44px]', a.style)}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
};

const QuickSizing = () => {
  const sizes = ['½ Pot', '¾ Pot', 'Pot', '2.2x', 'All-in'];
  return (
    <div className="flex gap-1">
      {sizes.map((s) => (
        <button
          key={s}
          className="flex-1 py-1.5 rounded-md text-[10px] font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors min-h-[32px]"
        >
          {s}
        </button>
      ))}
    </div>
  );
};

const CustomBetInput = ({ onOpenKeypad }: { onOpenKeypad: () => void }) => (
  <button
    onClick={onOpenKeypad}
    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-md bg-input border border-border text-sm font-mono text-muted-foreground min-h-[44px] hover:border-primary/50 transition-colors"
  >
    <span>___ BB</span>
  </button>
);

/* ─── Main ActionBar ─── */

const ActionBar = ({ onOpenKeypad, onOpenCardPicker }: ActionBarProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {/* Row 1: Actor + Card Pickers */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <ActorToggle />
        <div className="flex gap-1">
          <button
            onClick={() => onOpenCardPicker('board')}
            className="px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs min-h-[36px] flex items-center gap-1"
          >
            <Spade className="h-3 w-3" /> Board
          </button>
          <button
            onClick={() => onOpenCardPicker('hero')}
            className="px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs min-h-[36px] flex items-center gap-1"
          >
            <Spade className="h-3 w-3" /> Hero
          </button>
        </div>
      </div>

      {/* Row 2: Action buttons */}
      <div className="mb-2">
        <ActionButtons />
      </div>

      {/* Row 3: Quick sizing */}
      <div className="mb-2">
        <QuickSizing />
      </div>

      {/* Row 4: Bet input + Navigation */}
      <div className="flex items-center gap-2">
        <CustomBetInput onOpenKeypad={onOpenKeypad} />
        <button className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium min-h-[44px] flex items-center gap-1">
          <ChevronRight className="h-3 w-3" /> Next
        </button>
        <button className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-xs font-medium min-h-[44px] flex items-center gap-1">
          <Square className="h-3 w-3" /> Fin
        </button>
      </div>
    </div>
  );
};

export default ActionBar;
