import { cn } from '@/lib/utils';
import { SUIT_SYMBOLS } from '@/mock/mockHand';

interface CardDisplayProps {
  card: string | null;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}

const CardDisplay = ({ card, size = 'md', disabled = false, onClick }: CardDisplayProps) => {
  if (!card) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center transition-colors',
          size === 'sm' && 'h-9 w-7 text-xs',
          size === 'md' && 'h-12 w-9 text-sm',
          size === 'lg' && 'h-14 w-11 text-base',
          onClick && 'cursor-pointer hover:border-primary/50 active:bg-muted/50',
        )}
      >
        <span className="text-muted-foreground">?</span>
      </button>
    );
  }

  const rank = card[0];
  const suit = card[1];
  const isRed = suit === 'h' || suit === 'd';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-lg border border-border bg-card font-mono font-bold flex items-center justify-center gap-0.5 transition-all',
        isRed ? 'text-poker-red' : 'text-foreground',
        disabled && 'opacity-30 cursor-not-allowed',
        size === 'sm' && 'h-9 w-7 text-xs',
        size === 'md' && 'h-12 w-9 text-sm',
        size === 'lg' && 'h-14 w-11 text-base',
        onClick && !disabled && 'cursor-pointer hover:border-primary/50 active:scale-95',
      )}
    >
      {rank}<span className="text-[0.7em]">{SUIT_SYMBOLS[suit]}</span>
    </button>
  );
};

export default CardDisplay;
