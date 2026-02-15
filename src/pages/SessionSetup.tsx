import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SessionResumeCard from '@/components/poker/SessionResumeCard';
import BlindInput from '@/components/poker/BlindInput';
import StackInput from '@/components/poker/StackInput';
import PlayerCountSelector from '@/components/poker/PlayerCountSelector';
import { Spade } from 'lucide-react';

const SessionSetup = () => {
  const navigate = useNavigate();

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
            <StackInput label="Hero" defaultValue={100} />
            <StackInput label="Villain" defaultValue={100} />
          </div>

          <PlayerCountSelector />

          <Button
            onClick={() => navigate('/session/demo')}
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
