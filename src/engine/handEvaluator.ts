/**
 * Texas Hold'em Hand Evaluator — Pure TypeScript
 * Evaluates best 5 of 7 cards. No external dependencies.
 *
 * Card encoding: "Ah", "Ks", "Td", "9c" etc.
 * Ranks: 2=2 .. 9=9, T=10, J=11, Q=12, K=13, A=14
 * Suits: s=0, h=1, d=2, c=3
 *
 * HandRank: number[] — [category, ...tiebreakers]
 *   category: 1=High Card, 2=Pair, 3=Two Pair, 4=Trips, 5=Straight,
 *             6=Flush, 7=Full House, 8=Quads, 9=Straight Flush
 */

// ═══════════════════════════════════════
// PARSING
// ═══════════════════════════════════════

const RANK_MAP: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

const SUIT_MAP: Record<string, number> = { 's': 0, 'h': 1, 'd': 2, 'c': 3 };

export interface ParsedCard {
  rank: number;
  suit: number;
}

export function parseCard(s: string): ParsedCard {
  return { rank: RANK_MAP[s[0]], suit: SUIT_MAP[s[1]] };
}

// ═══════════════════════════════════════
// HAND RANK (5-card evaluation)
// ═══════════════════════════════════════

export type HandRank = number[]; // [category, ...tiebreakers]

/** Compare two HandRank arrays. Returns >0 if a wins, <0 if b wins, 0 tie. */
export function compareRanks(a: HandRank, b: HandRank): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function evaluate5(cards: ParsedCard[]): HandRank {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a); // desc
  const suits = cards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHigh = 0;

  // Normal straight
  if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
    isStraight = true;
    straightHigh = ranks[0];
  }
  // Wheel: A-2-3-4-5
  if (!isStraight && ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
    isStraight = true;
    straightHigh = 5; // 5-high straight
  }

  if (isStraight && isFlush) return [9, straightHigh];
  if (isFlush) {
    // flush: tiebreak by all ranks desc
    return [6, ...ranks];
  }

  // Count rank frequencies
  const freq: Record<number, number> = {};
  for (const r of ranks) freq[r] = (freq[r] ?? 0) + 1;
  const groups = Object.entries(freq)
    .map(([r, c]) => ({ rank: Number(r), count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  if (isStraight) return [5, straightHigh];

  const counts = groups.map(g => g.count);

  if (counts[0] === 4) {
    // Quads
    const quadRank = groups[0].rank;
    const kicker = groups[1].rank;
    return [8, quadRank, kicker];
  }

  if (counts[0] === 3 && counts[1] === 2) {
    // Full house
    return [7, groups[0].rank, groups[1].rank];
  }

  if (counts[0] === 3) {
    // Trips
    const kickers = groups.filter(g => g.count === 1).map(g => g.rank).sort((a, b) => b - a);
    return [4, groups[0].rank, ...kickers];
  }

  if (counts[0] === 2 && counts[1] === 2) {
    // Two pair
    const pairs = groups.filter(g => g.count === 2).map(g => g.rank).sort((a, b) => b - a);
    const kicker = groups.find(g => g.count === 1)!.rank;
    return [3, pairs[0], pairs[1], kicker];
  }

  if (counts[0] === 2) {
    // One pair
    const pairRank = groups[0].rank;
    const kickers = groups.filter(g => g.count === 1).map(g => g.rank).sort((a, b) => b - a);
    return [2, pairRank, ...kickers];
  }

  // High card
  return [1, ...ranks];
}

// ═══════════════════════════════════════
// BEST 5 OF 7
// ═══════════════════════════════════════

/** All C(7,5)=21 combinations */
function combinations5of7(cards: ParsedCard[]): ParsedCard[][] {
  const result: ParsedCard[][] = [];
  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 7; j++) {
      // exclude i, j
      const combo: ParsedCard[] = [];
      for (let k = 0; k < 7; k++) {
        if (k !== i && k !== j) combo.push(cards[k]);
      }
      result.push(combo);
    }
  }
  return result;
}

export function evaluateBest5(sevenCards: ParsedCard[]): HandRank {
  const combos = combinations5of7(sevenCards);
  let best = evaluate5(combos[0]);
  for (let i = 1; i < combos.length; i++) {
    const rank = evaluate5(combos[i]);
    if (compareRanks(rank, best) > 0) best = rank;
  }
  return best;
}

// ═══════════════════════════════════════
// DECK
// ═══════════════════════════════════════

const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const SUITS = [0, 1, 2, 3];

export function fullDeck(): ParsedCard[] {
  const deck: ParsedCard[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function removeCards(deck: ParsedCard[], toRemove: ParsedCard[]): ParsedCard[] {
  return deck.filter(c => !toRemove.some(r => r.rank === c.rank && r.suit === c.suit));
}

// ═══════════════════════════════════════
// SEEDED RNG (xorshift32)
// ═══════════════════════════════════════

export function xorshift32(seed: number): () => number {
  let state = seed | 0 || 1; // ensure non-zero
  return () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xFFFFFFFF; // 0..1
  };
}

/** Fisher-Yates shuffle with custom RNG */
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ═══════════════════════════════════════
// MONTE CARLO
// ═══════════════════════════════════════

export interface MonteCarloInput {
  heroCards: string[];     // 2 cards
  boardCards: string[];    // 0-5 cards
  iterations: number;
  seed: number;
  opponentCount?: number;  // default 1 (heads-up)
}

export interface MonteCarloResult {
  equity: number;          // 0..1
  iterations: number;
  ms: number;
  wins: number;
  ties: number;
  losses: number;
}

export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult {
  const t0 = performance.now();
  const hero = input.heroCards.map(parseCard);
  const board = input.boardCards.map(parseCard);
  const remaining = removeCards(fullDeck(), [...hero, ...board]);
  const boardNeeded = 5 - board.length;
  const rng = xorshift32(input.seed);
  const numOpponents = Math.max(1, input.opponentCount ?? 1);

  let wins = 0, ties = 0, losses = 0;

  for (let i = 0; i < input.iterations; i++) {
    const shuffled = shuffle(remaining, rng);

    // Deal board completion + N villain hands from shuffled deck
    const simBoard = [...board, ...shuffled.slice(0, boardNeeded)];
    let offset = boardNeeded;

    const heroRank = evaluateBest5([...hero, ...simBoard]);

    // Compare hero vs all opponents — hero must beat ALL to win
    let heroBeatAll = true;
    let heroTiedAll = true;

    for (let v = 0; v < numOpponents; v++) {
      const villainHand = [shuffled[offset], shuffled[offset + 1]];
      offset += 2;
      const villainRank = evaluateBest5([...villainHand, ...simBoard]);
      const cmp = compareRanks(heroRank, villainRank);

      if (cmp < 0) {
        heroBeatAll = false;
        heroTiedAll = false;
        break;
      }
      if (cmp > 0) {
        heroTiedAll = false;
      }
    }

    if (!heroBeatAll) {
      losses++;
    } else if (heroTiedAll) {
      ties++;
    } else {
      wins++;
    }
  }

  const total = wins + ties + losses;
  return {
    equity: (wins + ties * 0.5) / total,
    iterations: total,
    ms: performance.now() - t0,
    wins,
    ties,
    losses,
  };
}
