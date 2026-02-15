import { useState, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { CARD_RANKS, CARD_SUITS, SUIT_SYMBOLS } from '@/mock/mockHand';
import { useGameStore } from '@/store/useGameStore';
import { cn } from '@/lib/utils';
import type { Street } from '@/engine/types';

interface CardPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: 'hero' | 'board';
}

const CardPickerSheet = ({ open, onOpenChange, target }: CardPickerSheetProps) => {
  const gameState = useGameStore((s) => s.gameState);
  const setHeroCards = useGameStore((s) => s.setHeroCards);
  const setBoardCard = useGameStore((s) => s.setBoardCard);

  const [heroSelected, setHeroSelected] = useState<string[]>([]);

  // Compute used cards from current state
  const usedCards = new Set<string>();
  if (gameState) {
    if (gameState.hero_cards) {
      gameState.hero_cards.forEach(c => usedCards.add(c));
    }
    gameState.board.flop.forEach(c => { if (c) usedCards.add(c); });
    if (gameState.board.turn) usedCards.add(gameState.board.turn);
    if (gameState.board.river) usedCards.add(gameState.board.river);
  }

  // Board: count empty slots to show label
  const getBoardLabel = (): string => {
    if (!gameState) return 'Board';
    const emptyFlop = gameState.board.flop.filter(c => c === null).length;
    if (emptyFlop > 0) return `Flop (${3 - emptyFlop}/3)`;
    if (!gameState.board.turn) return 'Turn';
    if (!gameState.board.river) return 'River';
    return 'Board (complet)';
  };

  const isBoardFull = gameState
    ? gameState.board.flop.every(c => c !== null) && gameState.board.turn !== null && gameState.board.river !== null
    : false;

  const handleCardClick = useCallback((card: string) => {
    if (target === 'board') {
      // Commit immediately to store, one card at a time
      setBoardCard(card);
    } else {
      // Hero: need exactly 2 cards
      setHeroSelected((prev) => {
        if (prev.includes(card)) {
          return prev.filter(c => c !== card);
        }
        const next = [...prev, card];
        if (next.length >= 2) {
          setTimeout(() => {
            setHeroCards(next as [string, string]);
            setHeroSelected([]);
            onOpenChange(false);
          }, 100);
        }
        return next;
      });
    }
  }, [target, setBoardCard, setHeroCards, onOpenChange]);

  const handleOpenChange = (open: boolean) => {
    if (!open) setHeroSelected([]);
    onOpenChange(open);
  };

  const streetLabel = target === 'hero' ? 'Hero' : getBoardLabel();
  const requiredCount = target === 'hero' ? 2 : 1;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-sm">
            {target === 'hero' ? 'Sélectionner 2 cartes — Hero' : `Tap pour ajouter — ${streetLabel}`}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-3 pb-6 overflow-y-auto">
          <div className="grid grid-cols-[auto_repeat(4,1fr)] gap-1">
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

            {CARD_RANKS.map((rank) => (
              <>
                <div key={`label-${rank}`} className="flex items-center justify-center text-xs font-mono font-bold text-muted-foreground w-6">
                  {rank}
                </div>
                {CARD_SUITS.map((suit) => {
                  const card = `${rank}${suit}`;
                  const used = usedCards.has(card);
                  const isSelected = target === 'hero' ? heroSelected.includes(card) : false;
                  const isRed = suit === 'h' || suit === 'd';

                  return (
                    <button
                      key={card}
                      disabled={used}
                      onClick={() => handleCardClick(card)}
                      className={cn(
                        'rounded-md border font-mono text-xs font-bold py-2.5 transition-all min-h-[44px]',
                        used
                          ? 'opacity-20 cursor-not-allowed bg-muted border-border'
                          : isSelected
                            ? 'bg-primary text-primary-foreground border-primary scale-95'
                            : cn(
                                'bg-card hover:bg-primary/20 active:scale-95 cursor-pointer border-border',
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
