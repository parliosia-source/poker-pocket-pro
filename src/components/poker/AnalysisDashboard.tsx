import { MOCK_METRICS } from '@/mock/mockHand';
import { cn } from '@/lib/utils';

const metrics = [
  { label: 'Pot', value: `${MOCK_METRICS.pot}`, unit: 'BB', color: 'text-foreground' },
  { label: 'À payer', value: `${MOCK_METRICS.toCall}`, unit: 'BB', color: 'text-poker-gold' },
  { label: 'Pot Odds', value: `${MOCK_METRICS.potOdds}`, unit: '%', color: 'text-foreground' },
  { label: 'SPR', value: `${MOCK_METRICS.spr}`, unit: '', color: 'text-foreground' },
  { label: 'Equity', value: `${MOCK_METRICS.equity}`, unit: '%', color: 'text-poker-green' },
  { label: 'EV', value: `+${MOCK_METRICS.ev}`, unit: 'BB', color: 'text-poker-green' },
];

const AnalysisDashboard = () => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {metrics.map((m) => (
        <div key={m.label} className="bg-card rounded-lg border border-border px-2.5 py-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{m.label}</p>
          <p className={cn('font-mono font-bold text-sm', m.color)}>
            {m.value}
            {m.unit && <span className="text-[10px] text-muted-foreground ml-0.5">{m.unit}</span>}
          </p>
        </div>
      ))}
    </div>
  );
};

export default AnalysisDashboard;
