import type { GameState, Actor, Street, PlayerState } from './types';

export function getPlayer(state: GameState, actor: Actor): PlayerState {
  return actor === "hero" ? state.hero : state.villain;
}

export function getPlayerMut(state: GameState, actor: Actor): PlayerState {
  return actor === "hero" ? state.hero : state.villain;
}

export function otherActor(actor: Actor): Actor {
  return actor === "hero" ? "villain" : "hero";
}

export function getBBPlayer(state: GameState): Actor {
  return state.config.hero_position === "BB" ? "hero" : "villain";
}

export function getSBPlayer(state: GameState): Actor {
  return state.config.hero_position === "SB" ? "hero" : "villain";
}

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
