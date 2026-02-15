import { MOCK_STREETS } from '@/mock/mockHand';
import { cn } from '@/lib/utils';

const StreetTabs = () => {
  return (
    <div className="flex gap-1 bg-card rounded-lg border border-border p-1">
      {MOCK_STREETS.map((s) => (
        <button
          key={s.name}
          className={cn(
            'flex-1 py-2 rounded-md text-xs font-medium transition-colors min-h-[40px] flex items-center justify-center gap-1',
            s.status === 'active' && 'bg-primary text-primary-foreground',
            s.status === 'completed' && 'bg-secondary text-secondary-foreground',
            s.status === 'upcoming' && 'text-muted-foreground',
          )}
        >
          {s.status === 'active' && <span className="text-[8px]">●</span>}
          {s.status === 'completed' && <span className="text-[10px]">✓</span>}
          {s.name}
        </button>
      ))}
    </div>
  );
};

export default StreetTabs;
