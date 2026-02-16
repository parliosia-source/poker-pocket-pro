import { cn } from '@/lib/utils';
import { useGameStore } from '@/store/useGameStore';
import { useFastAction } from '@/hooks/useFastAction';
import LastActionChip from './LastActionChip';

interface TableMapProps {
  overrideActorId: string | null;
  setOverrideActorId: (id: string | null) => void;
}

// Seat positions on an ellipse for different table sizes (% based, origin center)
// Positions go clockwise from bottom-center (hero usually sits bottom)
const SEAT_COORDS: Record<number, { x: number; y: number }[]> = {
  2: [
    { x: 50, y: 90 },  // seat 0 (bottom)
    { x: 50, y: 10 },  // seat 1 (top)
  ],
  6: [
    { x: 50, y: 90 },  // seat 0 (bottom center)
    { x: 12, y: 70 },  // seat 1 (bottom left)
    { x: 12, y: 30 },  // seat 2 (top left)
    { x: 50, y: 10 },  // seat 3 (top center)
    { x: 88, y: 30 },  // seat 4 (top right)
    { x: 88, y: 70 },  // seat 5 (bottom right)
  ],
  9: [
    { x: 50, y: 90 },  // seat 0
    { x: 15, y: 80 },  // seat 1
    { x: 5,  y: 55 },  // seat 2
    { x: 12, y: 28 },  // seat 3
    { x: 32, y: 10 },  // seat 4
    { x: 55, y: 8  },  // seat 5
    { x: 78, y: 15 },  // seat 6
    { x: 92, y: 40 },  // seat 7
    { x: 88, y: 70 },  // seat 8
  ],
};

function getSeatPositions(tableSize: number) {
  if (tableSize <= 2) return SEAT_COORDS[2];
  if (tableSize <= 6) return SEAT_COORDS[6].slice(0, tableSize);
  return SEAT_COORDS[9].slice(0, tableSize);
}

const TableMap = ({ overrideActorId, setOverrideActorId }: TableMapProps) => {
  const gameState = useGameStore((s) => s.gameState);
  const fastState = useFastAction(overrideActorId);

  if (!gameState || gameState.hand_status !== 'in_progress') return null;

  const players = gameState.players;
  const coords = getSeatPositions(players.length);
  const expectedId = gameState.expected_actor_id;
  const nextActorId = fastState.nextActorId;

  // Find hero seat to rotate layout so hero is at bottom
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

      {/* Seats */}
      {players.map((p, idx) => {
        // Rotate so hero is at bottom (seat 0 position)
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

        return (
          <button
            key={p.id}
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
        );
      })}
    </div>
  );
};

export default TableMap;
