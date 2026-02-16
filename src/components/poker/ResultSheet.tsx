import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

interface ResultSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (result_bb: number) => void;
}

const PRESETS = [-10, -5, -2, -1, 0, 1, 2, 5, 10];

const ResultSheet = ({ open, onOpenChange, onConfirm }: ResultSheetProps) => {
  const [custom, setCustom] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  const handlePreset = (v: number) => {
    setSelected(v);
    setCustom('');
  };

  const handleConfirm = () => {
    const val = custom !== '' ? parseFloat(custom) : (selected ?? 0);
    onConfirm(isNaN(val) ? 0 : val);
    reset();
  };

  const handleClose = (o: boolean) => {
    if (!o) {
      onConfirm(0);
      reset();
    }
    onOpenChange(o);
  };

  const reset = () => { setCustom(''); setSelected(null); };

  const displayValue = custom !== '' ? custom : (selected !== null ? String(selected) : '0');

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-sm">Résultat de la main (BB)</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-3">
          <div className="bg-card border border-border rounded-lg py-3 px-4 text-center">
            <span className={cn(
              'font-mono text-2xl font-bold',
              parseFloat(displayValue) > 0 ? 'text-poker-green' : parseFloat(displayValue) < 0 ? 'text-poker-red' : 'text-foreground'
            )}>
              {parseFloat(displayValue) > 0 ? '+' : ''}{displayValue}
            </span>
            <span className="text-sm text-muted-foreground ml-1">BB</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {PRESETS.map(v => (
              <button
                key={v}
                onClick={() => handlePreset(v)}
                className={cn(
                  'py-2.5 rounded-md text-xs font-mono font-medium min-h-[44px] transition-colors',
                  selected === v && custom === ''
                    ? 'bg-primary text-primary-foreground'
                    : v < 0 ? 'bg-poker-red/15 text-poker-red' : v > 0 ? 'bg-poker-green/15 text-poker-green' : 'bg-secondary text-secondary-foreground'
                )}
              >
                {v > 0 ? '+' : ''}{v}
              </button>
            ))}
          </div>

          <input
            type="number"
            inputMode="decimal"
            value={custom}
            onChange={e => { setCustom(e.target.value); setSelected(null); }}
            placeholder="Montant custom"
            className="w-full py-3 px-4 rounded-lg bg-input border border-border text-foreground font-mono text-sm min-h-[48px] text-center"
          />

          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm min-h-[48px] hover:bg-primary/90 transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ResultSheet;
