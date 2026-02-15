import { MOCK_HAND_HISTORY } from '@/mock/mockHand';
import HandSummaryCard from './HandSummaryCard';

const HandHistoryList = () => {
  return (
    <div className="space-y-2">
      {MOCK_HAND_HISTORY.map((hand) => (
        <HandSummaryCard key={hand.id} hand={hand} />
      ))}
    </div>
  );
};

export default HandHistoryList;
