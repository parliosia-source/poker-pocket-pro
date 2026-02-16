import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SessionResumeCard from '@/components/poker/SessionResumeCard';
import StackInput from '@/components/poker/StackInput';
import { Spade } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import type { PositionLabel, PlayerConfig, GameConfig } from '@/engine/types';
import { assignPositions } from '@/engine/utils';
import { cn } from '@/lib/utils';

const TABLE_SIZES = [2, 6, 9];

const SessionSetup = () => {
  const navigate = useNavigate();
  const startHand = useGameStore((s) => s.startHand);

  const [tableSize, setTableSize] = useState(2);
  const [defaultStack, setDefaultStack] = useState(100);
  const [heroSeatIndex, setHeroSeatIndex] = useState(0); // BTN by default

  const positions = assignPositions(tableSize, 0); // BTN always seat 0

  const handleStart = () => {
    const playersConfig: PlayerConfig[] = [];
    for (let i = 0; i < tableSize; i++) {
      const isHero = i === heroSeatIndex;
      playersConfig.push({
        seat_index: i,
        label: isHero ? 'Hero' : `V${i + 1}`,
        is_hero: isHero,
        stack_bb: defaultStack,
      });
    }

    const config: GameConfig = {
      sb_bb: 0.5,
      bb_bb: 1,
      table_size: tableSize,
      btn_seat_index: 0,
      players_config: playersConfig,
    };

    startHand(config);
    navigate('/session/live');
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="px-4 pt-8 pb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Spade className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Poker Assistant</h1>
        </div>
        <p className="text-xs text-muted-foreground">Live decision helper · Multi-way</p>
      </header>

      <main className="flex-1 px-4 pb-8 space-y-6">
        <SessionResumeCard />

        <div className="space-y-5">
          <h2 className="text-sm font-medium text-foreground">Nouvelle session</h2>

          {/* Table size */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Joueurs</label>
            <div className="flex gap-2">
              {TABLE_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setTableSize(s);
                    setHeroSeatIndex(0);
                  }}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium transition-colors min-h-[48px]',
                    tableSize === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  )}
                >
                  {s === 2 ? 'HU' : `${s}-max`}
                </button>
              ))}
            </div>
          </div>

          {/* Stack */}
          <StackInput label="Stack (tous)" defaultValue={100} onValueChange={setDefaultStack} />

          {/* Hero position */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Position Hero</label>
            <div className="flex gap-1.5 flex-wrap">
              {positions.map((pos, idx) => (
                <button
                  key={idx}
                  onClick={() => setHeroSeatIndex(idx)}
                  className={cn(
                    'py-2 px-3 rounded-md text-xs font-medium transition-colors min-h-[44px]',
                    heroSeatIndex === idx
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  )}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleStart}
            className="w-full min-h-[52px] text-base font-medium"
          >
            Démarrer Session
          </Button>
        </div>
      </main>
    </div>
  );
};

export default SessionSetup;
