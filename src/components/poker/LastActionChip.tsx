import { cn } from '@/lib/utils';
import { useGameStore } from '@/store/useGameStore';
import type { Action } from '@/engine/types';

interface LastActionChipProps {
  playerId: string;
}

const LastActionChip = ({ playerId }: LastActionChipProps) => {
  const gameState = useGameStore((s) => s.gameState);

  if (!gameState) return null;

  const currentStreet = gameState.current_street;
  const streetActions = gameState.actions.filter(
    (a: Action) => a.player_id === playerId && a.street === currentStreet && a.type !== 'post_sb' && a.type !== 'post_bb'
  );

  if (streetActions.length === 0) return null;

  const last = streetActions[streetActions.length - 1];

  let label: string;
  let colorClass: string;

  switch (last.type) {
    case 'fold':
      label = 'F';
      colorClass = 'bg-poker-red/30 text-poker-red';
      break;
    case 'check':
    case 'call':
      label = 'C';
      colorClass = 'bg-poker-green/30 text-poker-green';
      break;
    case 'bet':
    case 'raise_to':
      label = last.amount_bb ? `R${Math.round(last.amount_bb)}` : 'R';
      colorClass = 'bg-poker-blue/30 text-poker-blue';
      break;
    case 'all_in':
      label = 'AI';
      colorClass = 'bg-poker-red/30 text-poker-red';
      break;
    default:
      return null;
  }

  return (
    <span className={cn(
      'text-[7px] font-bold px-1 py-px rounded leading-none',
      colorClass,
    )}>
      {label}
    </span>
  );
};

export default LastActionChip;
