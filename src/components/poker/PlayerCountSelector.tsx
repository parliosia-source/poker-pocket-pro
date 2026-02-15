import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const COUNTS = [2, 4, 6, 8, 9];

const PlayerCountSelector = () => {
  const [count, setCount] = useState(2);

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Joueurs</Label>
      <div className="flex gap-2">
        {COUNTS.map((c) => (
          <button
            key={c}
            onClick={() => setCount(c)}
            className={cn(
              'flex-1 py-2 rounded-md text-sm font-medium transition-colors min-h-[48px]',
              count === c
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            )}
          >
            {c}
          </button>
        ))}
      </div>
      {count === 2 && (
        <p className="text-xs text-primary">V1 — Heads-Up</p>
      )}
    </div>
  );
};

export default PlayerCountSelector;
