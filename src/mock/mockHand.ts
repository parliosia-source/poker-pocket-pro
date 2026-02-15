// Mock data for Phase 1 UI skeleton — all amounts in BB

export const MOCK_SESSION = {
  id: 'demo',
  blinds: { sb: 0.5, bb: 1 },
  heroStack: 98.5,
  villainStack: 87.0,
  handNumber: 3,
  heroPosition: 'BTN' as const,
};

export const MOCK_HERO_CARDS: (string | null)[] = ['As', 'Kh'];
export const MOCK_BOARD: (string | null)[] = ['Qd', 'Jc', 'Ts', null, null];

export const MOCK_METRICS = {
  pot: 12.5,
  toCall: 4.0,
  potOdds: 24,
  spr: 3.2,
  equity: 54,
  ev: 2.1,
};

export const MOCK_RECO = {
  action: 'CALL' as const,
  reasoning: 'Equity 54% > Pot Odds 24%',
  confidence: 'high' as const,
};

export const MOCK_ACTIONS = [
  { actor: 'Hero' as const, type: 'raise', amount: 2.5, street: 'preflop' },
  { actor: 'Villain' as const, type: 'call', amount: 2.5, street: 'preflop' },
  { actor: 'Hero' as const, type: 'bet', amount: 3.5, street: 'flop' },
  { actor: 'Villain' as const, type: 'call', amount: 3.5, street: 'flop' },
];

export const MOCK_STREETS = [
  { name: 'Preflop', status: 'completed' as const },
  { name: 'Flop', status: 'active' as const },
  { name: 'Turn', status: 'upcoming' as const },
  { name: 'River', status: 'upcoming' as const },
];

export const MOCK_HAND_HISTORY = [
  { id: 1, heroCards: ['As', 'Kh'], board: ['Qd', 'Jc', 'Ts', '2h', '7s'], result: 12.5, position: 'BTN', actions: 8 },
  { id: 2, heroCards: ['9s', '9c'], board: ['Ah', '5d', '3c'], result: -4.0, position: 'BB', actions: 5 },
  { id: 3, heroCards: ['7h', '6h'], board: [], result: -1.0, position: 'BTN', actions: 2 },
  { id: 4, heroCards: ['Ac', 'Qd'], board: ['Kh', '9s', '3d', '7c'], result: 8.0, position: 'BB', actions: 6 },
  { id: 5, heroCards: ['Td', 'Tc'], board: ['As', '8h', '4d', 'Tc', '2s'], result: 22.0, position: 'BTN', actions: 10 },
];

export const CARD_RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export const CARD_SUITS = ['s', 'h', 'd', 'c'] as const;
export const SUIT_SYMBOLS: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };

export const USED_CARDS_MOCK = new Set(['As', 'Kh', 'Qd', 'Jc', 'Ts']);
