import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { Delete } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

interface NumericKeypadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorId?: string | null;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'];

const NumericKeypadSheet = ({ open, onOpenChange, actorId }: NumericKeypadSheetProps) => {
  const [value, setValue] = useState('');
  const gameState = useGameStore((s) => s.gameState);
  const dispatchAction = useGameStore((s) => s.dispatchAction);

  const handleKey = (key: string) => {
    if (key === 'DEL') {
      setValue((v) => v.slice(0, -1));
    } else if (key === '.' && value.includes('.')) {
      return;
    } else {
      setValue((v) => v + key);
    }
  };

  const handleConfirm = () => {
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0 && gameState) {
      const pid = actorId ?? gameState.expected_actor_id ?? undefined;
      const isUnopened = gameState.street_state.current_bet_bb === 0;
      if (isUnopened) {
        dispatchAction('bet', amount, pid);
      } else {
        dispatchAction('raise_to', amount, pid);
      }
    }
    setValue('');
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) setValue('');
    onOpenChange(open);
  };

  // Pre-fill hint
  const placeholder = gameState
    ? gameState.street_state.current_bet_bb === 0
      ? gameState.config.bb_bb
      : gameState.derived.min_raise_to_bb ?? gameState.config.bb_bb
    : 0;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-sm">
            {gameState?.street_state.current_bet_bb === 0 ? 'Bet' : 'Raise to'} (BB) — min {placeholder}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-3">
          {/* Display */}
          <div className="bg-card border border-border rounded-lg py-3 px-4 text-center">
            <span className="font-mono text-2xl font-bold text-foreground">
              {value || String(placeholder)}
            </span>
            <span className="text-sm text-muted-foreground ml-1">BB</span>
          </div>

          {/* Keypad grid */}
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className={cn(
                  'rounded-lg font-mono text-lg font-medium transition-colors min-h-[52px] flex items-center justify-center',
                  key === 'DEL'
                    ? 'bg-destructive/20 text-destructive'
                    : 'bg-secondary text-foreground hover:bg-secondary/80 active:scale-95',
                )}
              >
                {key === 'DEL' ? <Delete className="h-5 w-5" /> : key}
              </button>
            ))}
          </div>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm min-h-[48px] hover:bg-primary/90 transition-colors"
          >
            Confirmer {value && <span className="font-mono">{value} BB</span>}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default NumericKeypadSheet;
