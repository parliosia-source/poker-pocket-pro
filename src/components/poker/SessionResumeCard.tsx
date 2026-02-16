import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { findHero } from '@/engine/utils';

const SessionResumeCard = () => {
  const navigate = useNavigate();
  const gameState = useGameStore((s) => s.gameState);

  if (!gameState) return null;

  const handNumber = gameState.hand_number;
  const hero = findHero(gameState);
  const position = hero?.position_label ?? '?';
  const stack = hero?.stack_remaining_bb ?? 0;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-primary font-medium mb-0.5">Session active</p>
          <p className="text-sm text-foreground">
            Main #{handNumber} · {position} · <span className="font-mono">{stack} BB</span>
          </p>
        </div>
        <Button size="sm" onClick={() => navigate('/session/live')} className="min-h-[44px] min-w-[44px]">
          <Play className="h-4 w-4" />
          Reprendre
        </Button>
      </CardContent>
    </Card>
  );
};

export default SessionResumeCard;
