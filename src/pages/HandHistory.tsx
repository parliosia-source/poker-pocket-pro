import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HandHistoryList from '@/components/poker/HandHistoryList';

const HandHistory = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-3 py-2 flex items-center gap-2 min-h-[48px]">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <h1 className="text-sm font-medium text-foreground">Historique des mains</h1>
      </header>

      <main className="flex-1 px-3 py-3">
        <HandHistoryList />
      </main>
    </div>
  );
};

export default HandHistory;
