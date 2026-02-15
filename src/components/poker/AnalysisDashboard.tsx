import { useGameStore } from '@/store/useGameStore';
import { cn } from '@/lib/utils';

const AnalysisDashboard = () => {
  const gameState = useGameStore((s) => s.gameState);
  const d = gameState?.derived;

  const metrics = [
    { label: 'Pot', value: d ? `${d.pot_bb}` : '—', unit: 'BB', color: 'text-foreground' },
    { label: 'À payer', value: d ? `${d.to_call_bb}` : '—', unit: 'BB', color: 'text-poker-gold' },
    { label: 'Pot Odds', value: d?.pot_odds_pct != null ? `${d.pot_odds_pct}` : '—', unit: '%', color: 'text-foreground' },
    { label: 'SPR', value: d?.spr != null ? `${d.spr}` : '—', unit: '', color: 'text-foreground' },
    { label: 'Equity', value: '—', unit: '%', color: 'text-poker-green' },
    { label: 'EV', value: '—', unit: 'BB', color: 'text-poker-green' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {metrics.map((m) => (
        <div key={m.label} className="bg-card rounded-lg border border-border px-2.5 py-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{m.label}</p>
          <p className={cn('font-mono font-bold text-sm', m.color)}>
            {m.value}
            {m.unit && m.value !== '—' && <span className="text-[10px] text-muted-foreground ml-0.5">{m.unit}</span>}
          </p>
        </div>
      ))}
    </div>
  );
};

export default AnalysisDashboard;
