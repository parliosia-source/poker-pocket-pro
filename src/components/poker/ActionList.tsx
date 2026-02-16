import { useGameStore } from '@/store/useGameStore';
import { getPlayerById } from '@/engine/utils';
import { cn } from '@/lib/utils';

const ActionList = () => {
  const gameState = useGameStore((s) => s.gameState);
  if (!gameState) return null;

  const streetActions = gameState.actions.filter(a => a.street === gameState.current_street);

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Actions</p>
      <div className="space-y-1">
        {streetActions.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-3 py-1.5">Aucune action</p>
        )}
        {streetActions.map((a) => {
          const player = getPlayerById(gameState, a.player_id);
          const isHero = player?.is_hero ?? false;
          const label = player?.position_label ?? player?.label ?? '?';

          return (
            <div
              key={a.id}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm',
                isHero ? 'bg-primary/10' : 'bg-secondary',
              )}
            >
              <span
                className={cn(
                  'text-[10px] font-bold uppercase shrink-0',
                  isHero ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
              <span className="capitalize text-foreground">{a.type.replace('_', ' ')}</span>
              {a.amount_bb != null && (
                <span className="font-mono text-foreground ml-auto">{a.amount_bb} BB</span>
              )}
              {a.is_all_in && (
                <span className="text-[10px] text-poker-red font-bold ml-1">AI</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActionList;
