import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SessionResumeCard = () => {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-primary font-medium mb-0.5">Session active</p>
          <p className="text-sm text-foreground">
            Main #3 · BTN · <span className="font-mono">98.5 BB</span>
          </p>
        </div>
        <Button size="sm" onClick={() => navigate('/session/demo')} className="min-h-[44px] min-w-[44px]">
          <Play className="h-4 w-4" />
          Reprendre
        </Button>
      </CardContent>
    </Card>
  );
};

export default SessionResumeCard;
