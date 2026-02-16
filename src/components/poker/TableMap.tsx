import { cn } from '@/lib/utils';
import { useGameStore } from '@/store/useGameStore';
import { useFastAction } from '@/hooks/useFastAction';
import LastActionChip from './LastActionChip';

interface TableMapProps {
  overrideActorId: string | null;
  setOverrideActorId: (id: string | null) => void;
}

// Seat positions on an ellipse for different table sizes (% based, origin center)
const SEAT_COORDS: Record<number, { x: number; y: number }[]> = {
  2: [
    { x: 50, y: 90 },
    { x: 50, y: 10 },
  ],
  6: [
    { x: 50, y: 90 },
    { x: 12, y: 70 },
    { x: 12, y: 30 },
    { x: 50, y: 10 },
    { x: 88, y: 30 },
    { x: 88, y: 70 },
  ],
  9: [
    { x: 50, y: 90 },
    { x: 15, y: 80 },
    { x: 5,  y: 55 },
    { x: 12, y: 28 },
    { x: 32, y: 10 },
    { x: 55, y: 8  },
    { x: 78, y: 15 },
    { x: 92, y: 40 },
    { x: 88, y: 70 },
  ],
};

function getSeatPositions(tableSize: number) {
  if (tableSize <= 2) return SEAT_COORDS[2];
  if (tableSize <= 6) return SEAT_COORDS[6].slice(0, tableSize);
  return SEAT_COORDS[9].slice(0, tableSize);
}

/** Compute chip position offset toward table center */
function chipOffset(pos: { x: number; y: number }): { dx: number; dy: number } {
  const cx = 50, cy = 50;
  const angle = Math.atan2(cy - pos.y, cx - pos.x);
  const dist = 14; // px-equivalent in %
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist };
}

const TableMap = ({ overrideActorId, setOverrideActorId }: TableMapProps) => {
  const gameState = useGameStore((s) => s.gameState);
  const fastState = useFastAction(overrideActorId);

  if (!gameState || gameState.hand_status !== 'in_progress') return null;

  const players = gameState.players;
  const coords = getSeatPositions(players.length);
  const expectedId = gameState.expected_actor_id;
  const nextActorId = fastState.nextActorId;

  const heroIdx = players.findIndex(p => p.is_hero);
  const rotateOffset = heroIdx >= 0 ? heroIdx : 0;

  return (
    <div className="relative w-full" style={{ aspectRatio: '2.2 / 1' }}>
      {/* Table felt oval */}
      <div className="absolute inset-[12%] rounded-[50%] bg-poker-green/8 border border-poker-green/20" />

      {/* Pot display */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="text-[10px] text-muted-foreground font-mono">
          Pot {gameState.derived.pot_bb} BB
        </span>
      </div>

      {/* Seats + invested chips */}
      {players.map((p, idx) => {
        const rotatedIdx = (idx - rotateOffset + players.length) % players.length;
        const pos = coords[rotatedIdx];
        if (!pos) return null;

        const isExpected = p.id === expectedId;
        const isOverride = overrideActorId === p.id;
        const isCurrent = isOverride || (!overrideActorId && isExpected);
        const isNext = p.id === nextActorId && !isCurrent;
        const isFolded = p.status === 'folded';
        const isAllIn = p.status === 'all_in';
        const canTap = p.status === 'active';

        const invested = p.invested_this_street_bb;
        const chip = chipOffset(pos);

        return (
          <div key={p.id}>
            {/* Invested chips badge — toward center */}
            {invested > 0 && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 z-[5]"
                style={{
                  left: `${pos.x + chip.dx}%`,
                  top: `${pos.y + chip.dy}%`,
                }}
              >
                <span className={cn(
                  'inline-block text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full',
                  'bg-primary/20 text-primary border border-primary/30',
                  isFolded && 'opacity-30',
                )}>
                  {invested % 1 === 0 ? invested : invested.toFixed(1)}
                </span>
              </div>
            )}

            {/* Seat button */}
            <button
              disabled={!canTap || isFolded || isAllIn}
              onClick={() => {
                if (isExpected) {
                  setOverrideActorId(null);
                } else {
                  setOverrideActorId(p.id);
                }
              }}
              className={cn(
                'absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2',
                'rounded-lg text-[9px] font-bold transition-all duration-300 ease-out',
                'min-h-[44px] min-w-[44px] w-[52px] px-1',
                isCurrent && 'bg-primary text-primary-foreground ring-2 ring-ring scale-110 z-10',
                isCurrent && 'shadow-[0_0_12px_hsl(var(--primary)/0.4)]',
                !isCurrent && isExpected && 'bg-primary/30 text-primary',
                !isCurrent && !isExpected && canTap && 'bg-card text-card-foreground border border-border',
                isNext && 'border border-dashed border-muted-foreground/50',
                isFolded && 'opacity-25',
                isAllIn && 'opacity-70 bg-poker-red/15 text-poker-red border-poker-red/30',
                p.is_hero && !isCurrent && 'border-primary/50',
              )}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <span className="leading-none">{p.position_label}</span>
              {p.is_hero && <span className="text-[7px] leading-none">★</span>}
              <span className={cn(
                'text-[8px] font-mono leading-none mt-0.5',
                isFolded ? 'text-muted-foreground/50' : 'text-muted-foreground',
              )}>
                {isFolded ? '—' : `${p.stack_remaining_bb}`}
              </span>
              <LastActionChip playerId={p.id} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default TableMap;
