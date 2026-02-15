import { useState, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { CARD_RANKS, CARD_SUITS, SUIT_SYMBOLS } from '@/mock/mockHand';
import { useGameStore } from '@/store/useGameStore';
import { cn } from '@/lib/utils';

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

  // Street-scoped: how many slots remain for the current street
  const getStreetSlotsRemaining = (): number => {
    if (!gameState) return 0;
    const street = gameState.current_street;
    if (street === 'preflop' || street === 'flop') {
      return gameState.board.flop.filter(c => c === null).length;
    }
    if (street === 'turn') return gameState.board.turn === null ? 1 : 0;
    if (street === 'river') return gameState.board.river === null ? 1 : 0;
    return 0;
  };

  const slotsRemaining = getStreetSlotsRemaining();
  const isStreetComplete = target === 'board' && slotsRemaining === 0;

  // Board label scoped to current street
  const getBoardLabel = (): string => {
    if (!gameState) return 'Board';
    const street = gameState.current_street;
    if (street === 'preflop' || street === 'flop') {
      const filled = 3 - gameState.board.flop.filter(c => c === null).length;
      return `Flop (${filled}/3)`;
    }
    if (street === 'turn') return 'Turn';
    if (street === 'river') return 'River';
    return 'Board';
  };

  const handleCardClick = useCallback((card: string) => {
    if (target === 'board') {
      setBoardCard(card);
      // Auto-close: after committing, check if street will be complete
      // slotsRemaining was computed before this click, so 1 means this was the last slot
      const currentState = useGameStore.getState().gameState;
      if (currentState) {
        const street = currentState.current_street;
        let complete = false;
        if (street === 'preflop' || street === 'flop') {
          complete = currentState.board.flop.filter(c => c === null).length === 0;
        } else if (street === 'turn') {
          complete = currentState.board.turn !== null;
        } else if (street === 'river') {
          complete = currentState.board.river !== null;
        }
        if (complete) {
          setTimeout(() => onOpenChange(false), 150);
        }
      }
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
                  const disabled = used || (target === 'board' && isStreetComplete);

                  return (
                    <button
                      key={card}
                      disabled={disabled}
                      onClick={() => handleCardClick(card)}
                      className={cn(
                        'rounded-md border font-mono text-xs font-bold py-2.5 transition-all min-h-[44px]',
                        disabled
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
