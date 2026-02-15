import { useGameStore } from '@/store/useGameStore';
import { cn } from '@/lib/utils';

const ActionList = () => {
  const gameState = useGameStore((s) => s.gameState);
  if (!gameState) return null;

  // Show actions for the current street
  const streetActions = gameState.actions.filter(a => a.street === gameState.current_street);

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Actions</p>
      <div className="space-y-1">
        {streetActions.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-3 py-1.5">Aucune action</p>
        )}
        {streetActions.map((a) => (
          <div
            key={a.id}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm',
              a.actor === 'hero' ? 'bg-primary/10' : 'bg-secondary',
            )}
          >
            <span
              className={cn(
                'text-[10px] font-bold uppercase w-5 shrink-0',
                a.actor === 'hero' ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {a.actor === 'hero' ? 'H' : 'V'}
            </span>
            <span className="capitalize text-foreground">{a.type.replace('_', ' ')}</span>
            {a.amount_bb != null && (
              <span className="font-mono text-foreground ml-auto">{a.amount_bb} BB</span>
            )}
            {a.is_all_in && (
              <span className="text-[10px] text-poker-red font-bold ml-1">AI</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActionList;
