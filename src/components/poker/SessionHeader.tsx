import { useGameStore } from '@/store/useGameStore';
import { ArrowLeft, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SessionHeader = () => {
  const navigate = useNavigate();
  const gameState = useGameStore((s) => s.gameState);

  const blinds = gameState ? `${gameState.config.sb_bb}/${gameState.config.bb_bb}` : '—';
  const heroStack = gameState ? gameState.hero.stack_remaining_bb : '—';
  const handNumber = gameState?.hand_number ?? '—';
  const heroPosition = gameState?.config.hero_position ?? '—';

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-3 py-2 flex items-center gap-2 min-h-[48px]">
      <button onClick={() => navigate(-1)} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex items-center gap-2 flex-1 min-w-0 text-xs">
        <span className="text-muted-foreground font-mono">{blinds}</span>
        <span className="text-border">·</span>
        <span className="font-mono text-foreground">{heroStack} BB</span>
        <span className="text-border">·</span>
        <span className="text-muted-foreground">#{handNumber}</span>
        <span className="text-border">·</span>
        <span className="text-primary font-medium">{heroPosition}</span>
      </div>
      <button
        onClick={() => navigate('/session/live/history')}
        className="p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <Clock className="h-4 w-4 text-muted-foreground" />
      </button>
    </header>
  );
};

export default SessionHeader;
