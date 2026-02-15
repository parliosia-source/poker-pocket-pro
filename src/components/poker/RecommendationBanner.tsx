import { MOCK_RECO } from '@/mock/mockHand';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

const colorMap = {
  high: 'bg-poker-green/15 border-poker-green/30 text-poker-green',
  medium: 'bg-poker-gold/15 border-poker-gold/30 text-poker-gold',
  low: 'bg-poker-red/15 border-poker-red/30 text-poker-red',
};

const RecommendationBanner = () => {
  const r = MOCK_RECO;

  return (
    <div className={cn('rounded-lg border px-3 py-2 flex items-center gap-2', colorMap[r.confidence])}>
      <CheckCircle className="h-4 w-4 shrink-0" />
      <p className="text-sm font-medium">
        {r.action} <span className="font-normal opacity-80">— {r.reasoning}</span>
      </p>
    </div>
  );
};

export default RecommendationBanner;
