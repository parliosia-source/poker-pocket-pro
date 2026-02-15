import { MOCK_ACTIONS } from '@/mock/mockHand';
import { cn } from '@/lib/utils';

const ActionList = () => {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Actions</p>
      <div className="space-y-1">
        {MOCK_ACTIONS.map((a, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm',
              a.actor === 'Hero' ? 'bg-primary/10' : 'bg-secondary',
            )}
          >
            <span
              className={cn(
                'text-[10px] font-bold uppercase w-5 shrink-0',
                a.actor === 'Hero' ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {a.actor === 'Hero' ? 'H' : 'V'}
            </span>
            <span className="capitalize text-foreground">{a.type}</span>
            <span className="font-mono text-foreground ml-auto">{a.amount} BB</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActionList;
