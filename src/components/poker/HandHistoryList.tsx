import { useGameStore } from '@/store/useGameStore';
import { Download, Trash2 } from 'lucide-react';
import HandSummaryCard from './HandSummaryCard';

const HandHistoryList = () => {
  const handHistory = useGameStore((s) => s.handHistory);
  const clearHistory = useGameStore((s) => s.clearHistory);
  const exportHistory = useGameStore((s) => s.exportHistory);

  const handleClear = () => {
    if (window.confirm('Supprimer tout l\'historique ?')) {
      clearHistory();
    }
  };

  return (
    <div className="space-y-3">
      {handHistory.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={exportHistory}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium min-h-[44px]"
          >
            <Download className="h-3.5 w-3.5" /> Exporter JSON
          </button>
          <button
            onClick={handleClear}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md bg-destructive/15 text-destructive text-xs font-medium min-h-[44px]"
          >
            <Trash2 className="h-3.5 w-3.5" /> Vider l'historique
          </button>
        </div>
      )}

      {handHistory.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Aucune main enregistrée
        </div>
      ) : (
        <div className="space-y-2">
          {handHistory.map((hand) => (
            <HandSummaryCard
              key={`${hand.id}-${hand.ts}`}
              hand={{
                id: hand.id,
                heroCards: hand.heroCards ?? [],
                board: hand.board,
                result: hand.result_bb,
                position: hand.heroPosition,
                actions: hand.actionsCount,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HandHistoryList;
