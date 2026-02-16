import type { GameState, Player, PositionLabel, Street } from './types';

// ═══════════════════════════════════════════════
// POSITION MAPS
// ═══════════════════════════════════════════════

const POSITION_MAPS: Record<number, PositionLabel[]> = {
  2: ["BTN", "BB"],
  3: ["BTN", "SB", "BB"],
  4: ["BTN", "SB", "BB", "CO"],
  5: ["BTN", "SB", "BB", "UTG", "CO"],
  6: ["BTN", "SB", "BB", "UTG", "HJ", "CO"],
  7: ["BTN", "SB", "BB", "UTG", "MP", "HJ", "CO"],
  8: ["BTN", "SB", "BB", "UTG", "UTG1", "MP", "HJ", "CO"],
  9: ["BTN", "SB", "BB", "UTG", "UTG1", "MP", "MP1", "HJ", "CO"],
};

export function assignPositions(tableSize: number, btnSeat: number): PositionLabel[] {
  const labels = POSITION_MAPS[tableSize];
  if (!labels) throw new Error(`Unsupported table size: ${tableSize}`);
  const result: PositionLabel[] = new Array(tableSize);
  for (let i = 0; i < tableSize; i++) {
    const seat = (btnSeat + i) % tableSize;
    result[seat] = labels[i];
  }
  return result;
}

// ═══════════════════════════════════════════════
// PLAYER LOOKUPS
// ═══════════════════════════════════════════════

export function getPlayerById(state: GameState, id: string): Player | undefined {
  return state.players.find(p => p.id === id);
}

export function getPlayerByIdMut(state: GameState, id: string): Player {
  const p = state.players.find(p => p.id === id);
  if (!p) throw new Error(`Player not found: ${id}`);
  return p;
}

export function getPlayerBySeat(state: GameState, seat: number): Player | undefined {
  return state.players.find(p => p.seat_index === seat);
}

export function findByPosition(state: GameState, pos: PositionLabel): Player | undefined {
  return state.players.find(p => p.position_label === pos);
}

export function findHero(state: GameState): Player | undefined {
  return state.players.find(p => p.is_hero);
}

export function getActivePlayers(state: GameState): Player[] {
  return state.players.filter(p => p.status === "active");
}

export function getPlayersInHand(state: GameState): Player[] {
  return state.players.filter(p => p.status !== "folded");
}

// ═══════════════════════════════════════════════
// STREET / BOARD HELPERS
// ═══════════════════════════════════════════════

export function getNextStreet(street: Street): Street | null {
  switch (street) {
    case "preflop": return "flop";
    case "flop": return "turn";
    case "turn": return "river";
    case "river": return null;
  }
}

export function getBoardCardsForStreet(state: GameState, street: Street): string[] | undefined {
  switch (street) {
    case "flop": {
      const flop = state.board.flop;
      const filled = flop.filter((c): c is string => c !== null);
      return filled.length > 0 ? filled : undefined;
    }
    case "turn": return state.board.turn ? [state.board.turn] : undefined;
    case "river": return state.board.river ? [state.board.river] : undefined;
    default: return undefined;
  }
}

export function reconstructBoard(originalState: GameState, upToStreet: Street): GameState["board"] {
  const board: GameState["board"] = { flop: [null, null, null], turn: null, river: null };
  if (upToStreet === "preflop") return board;
  board.flop = originalState.board.flop;
  if (upToStreet === "flop") return board;
  board.turn = originalState.board.turn;
  if (upToStreet === "turn") return board;
  board.river = originalState.board.river;
  return board;
}

// ═══════════════════════════════════════════════
// QUEUE HELPERS
// ═══════════════════════════════════════════════

export function nextActiveSeatAfter(state: GameState, afterSeat: number): number {
  for (let i = 1; i <= state.config.table_size; i++) {
    const seat = (afterSeat + i) % state.config.table_size;
    const p = getPlayerBySeat(state, seat);
    if (p && p.status === "active") return seat;
  }
  return -1;
}
