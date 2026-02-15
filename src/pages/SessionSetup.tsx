import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SessionResumeCard from '@/components/poker/SessionResumeCard';
import BlindInput from '@/components/poker/BlindInput';
import StackInput from '@/components/poker/StackInput';
import PlayerCountSelector from '@/components/poker/PlayerCountSelector';
import { Spade } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import type { HeroPosition } from '@/engine/types';
import { cn } from '@/lib/utils';

const SessionSetup = () => {
  const navigate = useNavigate();
  const startHand = useGameStore((s) => s.startHand);

  const [heroStack, setHeroStack] = useState(100);
  const [villainStack, setVillainStack] = useState(100);
  const [heroPosition, setHeroPosition] = useState<HeroPosition>('SB');

  const handleStart = () => {
    startHand({
      sb_bb: 0.5,
      bb_bb: 1,
      hero_position: heroPosition,
      hero_stack_bb: heroStack,
      villain_stack_bb: villainStack,
    });
    navigate('/session/live');
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 pt-8 pb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Spade className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Poker Assistant</h1>
        </div>
        <p className="text-xs text-muted-foreground">Live decision helper · Heads-Up V1</p>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-8 space-y-6">
        {/* Resume card */}
        <SessionResumeCard />

        {/* New session form */}
        <div className="space-y-5">
          <h2 className="text-sm font-medium text-foreground">Nouvelle session</h2>

          <BlindInput />

          <div className="grid grid-cols-2 gap-3">
            <StackInput label="Hero" defaultValue={100} onValueChange={setHeroStack} />
            <StackInput label="Villain" defaultValue={100} onValueChange={setVillainStack} />
          </div>

          {/* Position selector */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Position Hero</label>
            <div className="flex gap-2">
              {(['SB', 'BB'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setHeroPosition(pos)}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium transition-colors min-h-[48px]',
                    heroPosition === pos
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  )}
                >
                  {pos} {pos === 'SB' ? '(BTN)' : ''}
                </button>
              ))}
            </div>
          </div>

          <PlayerCountSelector />

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
