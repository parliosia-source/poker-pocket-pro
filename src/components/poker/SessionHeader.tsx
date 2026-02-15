import { MOCK_SESSION } from '@/mock/mockHand';
import { ArrowLeft, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SessionHeader = () => {
  const navigate = useNavigate();
  const s = MOCK_SESSION;

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-3 py-2 flex items-center gap-2 min-h-[48px]">
      <button onClick={() => navigate('/session/new')} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex items-center gap-2 flex-1 min-w-0 text-xs">
        <span className="text-muted-foreground font-mono">{s.blinds.sb}/{s.blinds.bb}</span>
        <span className="text-border">·</span>
        <span className="font-mono text-foreground">{s.heroStack} BB</span>
        <span className="text-border">·</span>
        <span className="text-muted-foreground">#{s.handNumber}</span>
        <span className="text-border">·</span>
        <span className="text-primary font-medium">{s.heroPosition}</span>
      </div>
      <button
        onClick={() => navigate('/session/demo/history')}
        className="p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <Clock className="h-4 w-4 text-muted-foreground" />
      </button>
    </header>
  );
};

export default SessionHeader;
