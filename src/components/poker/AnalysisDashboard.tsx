import { useGameStore } from '@/store/useGameStore';
import { useEquity } from '@/hooks/useEquity';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const AnalysisDashboard = () => {
  const gameState = useGameStore((s) => s.gameState);
  const d = gameState?.derived;
  const useEquityResult = useEquity();
  const { equity, loading } = useEquityResult;

  const opponentCount = useEquityResult.opponentCount ?? 1;
  const eqDisplay = loading ? '…' : equity != null ? `${Math.round(equity * 100)}` : '—';
  const eqLabel = opponentCount > 1 ? `Equity (vs ${opponentCount})` : 'Equity';
  // Simple EV: (equity * pot) - ((1-equity) * to_call)  when applicable
  let evDisplay = '—';
  if (equity != null && d && d.to_call_bb > 0) {
    const ev = equity * d.pot_bb - (1 - equity) * d.to_call_bb;
    evDisplay = ev >= 0 ? `+${ev.toFixed(1)}` : ev.toFixed(1);
  }

  const metrics = [
    { label: 'Pot', value: d ? `${d.pot_bb}` : '—', unit: 'BB', color: 'text-foreground' },
    { label: 'À payer', value: d ? `${d.to_call_bb}` : '—', unit: 'BB', color: 'text-poker-gold' },
    { label: 'Pot Odds', value: d?.pot_odds_pct != null ? `${d.pot_odds_pct}` : '—', unit: '%', color: 'text-foreground' },
    { label: 'SPR', value: d?.spr != null ? `${d.spr}` : '—', unit: '', color: 'text-foreground' },
    { label: eqLabel, value: eqDisplay, unit: '%', color: 'text-poker-green', loading },
    { label: 'EV', value: evDisplay, unit: 'BB', color: 'text-poker-green' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {metrics.map((m) => (
        <div key={m.label} className="bg-card rounded-lg border border-border px-2.5 py-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{m.label}</p>
          <p className={cn('font-mono font-bold text-sm', m.color)}>
            {'loading' in m && m.loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin inline-block" />
            ) : (
              <>
                {m.value}
                {m.unit && m.value !== '—' && m.value !== '…' && <span className="text-[10px] text-muted-foreground ml-0.5">{m.unit}</span>}
              </>
            )}
          </p>
        </div>
      ))}
    </div>
  );
};

export default AnalysisDashboard;
