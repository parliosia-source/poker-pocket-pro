import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { CARD_RANKS, CARD_SUITS, SUIT_SYMBOLS, USED_CARDS_MOCK } from '@/mock/mockHand';
import { cn } from '@/lib/utils';

interface CardPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: 'hero' | 'board';
}

const CardPickerSheet = ({ open, onOpenChange, target }: CardPickerSheetProps) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-sm">
            Sélectionner — {target === 'hero' ? 'Cartes Hero' : 'Board'}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-3 pb-6 overflow-y-auto">
          {/* Suit headers */}
          <div className="grid grid-cols-[auto_repeat(4,1fr)] gap-1">
            {/* Top-left empty cell */}
            <div />
            {CARD_SUITS.map((suit) => (
              <div
                key={suit}
                className={cn(
                  'text-center text-lg font-bold py-1',
                  (suit === 'h' || suit === 'd') ? 'text-poker-red' : 'text-foreground',
                )}
              >
                {SUIT_SYMBOLS[suit]}
              </div>
            ))}

            {/* Card grid: ranks × suits */}
            {CARD_RANKS.map((rank) => (
              <>
                <div key={`label-${rank}`} className="flex items-center justify-center text-xs font-mono font-bold text-muted-foreground w-6">
                  {rank}
                </div>
                {CARD_SUITS.map((suit) => {
                  const card = `${rank}${suit}`;
                  const used = USED_CARDS_MOCK.has(card);
                  const isRed = suit === 'h' || suit === 'd';

                  return (
                    <button
                      key={card}
                      disabled={used}
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        'rounded-md border border-border font-mono text-xs font-bold py-2.5 transition-all min-h-[44px]',
                        used
                          ? 'opacity-20 cursor-not-allowed bg-muted'
                          : cn(
                              'bg-card hover:bg-primary/20 active:scale-95 cursor-pointer',
                              isRed ? 'text-poker-red' : 'text-foreground',
                            ),
                      )}
                    >
                      {rank}{SUIT_SYMBOLS[suit]}
                    </button>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CardPickerSheet;
