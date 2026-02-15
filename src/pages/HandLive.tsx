import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SessionHeader from '@/components/poker/SessionHeader';
import AnalysisDashboard from '@/components/poker/AnalysisDashboard';
import RecommendationBanner from '@/components/poker/RecommendationBanner';
import HeroCardsDisplay from '@/components/poker/HeroCardsDisplay';
import BoardDisplay from '@/components/poker/BoardDisplay';
import StreetTabs from '@/components/poker/StreetTabs';
import ActionList from '@/components/poker/ActionList';
import ActionBar from '@/components/poker/ActionBar';
import CardPickerSheet from '@/components/poker/CardPickerSheet';
import NumericKeypadSheet from '@/components/poker/NumericKeypadSheet';
import { useGameStore } from '@/store/useGameStore';

const HandLive = () => {
  const [cardPickerOpen, setCardPickerOpen] = useState(false);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [cardPickerTarget, setCardPickerTarget] = useState<'hero' | 'board'>('hero');
  const gameState = useGameStore((s) => s.gameState);
  const navigate = useNavigate();

  // Redirect to setup if no game state
  useEffect(() => {
    if (!gameState) {
      navigate('/session/new');
    }
  }, [gameState, navigate]);

  const openCardPicker = (target: 'hero' | 'board') => {
    setCardPickerTarget(target);
    setCardPickerOpen(true);
  };

  if (!gameState) return null;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <SessionHeader />

      <main className="flex-1 overflow-y-auto px-3 pt-2 pb-[240px] space-y-3">
        <AnalysisDashboard />
        <RecommendationBanner />

        <div className="flex items-start gap-3">
          <HeroCardsDisplay onTap={() => openCardPicker('hero')} />
          <BoardDisplay onTap={() => openCardPicker('board')} />
        </div>

        <StreetTabs />
        <ActionList />
      </main>

      <ActionBar onOpenKeypad={() => setKeypadOpen(true)} onOpenCardPicker={openCardPicker} />

      <CardPickerSheet open={cardPickerOpen} onOpenChange={setCardPickerOpen} target={cardPickerTarget} />
      <NumericKeypadSheet open={keypadOpen} onOpenChange={setKeypadOpen} />
    </div>
  );
};

export default HandLive;
