import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { GameState, GameConfig, ActionType, Action, Street } from '@/engine/types';
import { createInitialState, validateAction, applyAction, advanceStreet } from '@/engine/engine';
import { undoAction } from '@/engine/undo';
import { computeQuickSizing, compute2_2xSizing } from '@/engine/sizing';
import { getPlayer } from '@/engine/utils';

interface SizingOptions {
  halfPot: number;
  threeFourthPot: number;
  pot: number;
  twoPointTwo: number | null;
  allIn: number;
}

interface GameStore {
  // State
  gameState: GameState | null;
  redoStack: Action[];
  error: string | null;

  // Actions
  startHand: (config: GameConfig) => void;
  dispatchAction: (type: ActionType, amount_bb?: number) => void;
  advanceStreet: (boardCards?: string[]) => void;
  endHand: (result_bb?: number) => void;
  undo: () => void;
  redo: () => void;
  setHeroCards: (cards: [string, string]) => void;
  setBoard: (street: Street, cards: string[]) => void;
  setBoardCard: (card: string) => void;
  clearError: () => void;

  // Selectors
  getSizingOptions: () => SizingOptions | null;
  getAvailableActions: () => ActionType[];
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  redoStack: [],
  error: null,

  startHand: (config: GameConfig) => {
    const currentState = get().gameState;
    const handNumber = currentState ? currentState.hand_number + 1 : 1;
    const state = createInitialState(config, handNumber);
    set({ gameState: state, redoStack: [], error: null });
  },

  dispatchAction: (type: ActionType, amount_bb?: number) => {
    const { gameState } = get();
    if (!gameState) return;

    const actor = gameState.expected_actor;
    const isAllIn = type === "all_in";

    const actionPayload = {
      actor,
      type,
      amount_bb: amount_bb ?? null,
      is_all_in: isAllIn,
    };

    const validation = validateAction(gameState, actionPayload);
    if (!validation.valid) {
      set({ error: validation.errors[0] });
      return;
    }

    const action: Action = {
      id: nanoid(),
      street: gameState.current_street,
      actor,
      type,
      amount_bb: amount_bb ?? null,
      is_all_in: isAllIn,
      timestamp: Date.now(),
    };

    const newState = applyAction(gameState, action);
    set({ gameState: newState, redoStack: [], error: null });
  },

  advanceStreet: (boardCards?: string[]) => {
    const { gameState } = get();
    if (!gameState) return;

    const streetOrder: Street[] = ["preflop", "flop", "turn", "river"];
    const currentIndex = streetOrder.indexOf(gameState.current_street);
    if (currentIndex >= streetOrder.length - 1) return;

    const nextStreet = streetOrder[currentIndex + 1];
    const newState = advanceStreet(gameState, nextStreet, boardCards);
    set({ gameState: newState, error: null });
  },

  endHand: (_result_bb?: number) => {
    const { gameState } = get();
    if (!gameState) return;
    // Start new hand with same config
    const newState = createInitialState(gameState.config, gameState.hand_number + 1);
    set({ gameState: newState, redoStack: [], error: null });
  },

  undo: () => {
    const { gameState } = get();
    if (!gameState) return;

    const { newState, undoneAction } = undoAction(gameState);
    if (undoneAction) {
      set((s) => ({
        gameState: newState,
        redoStack: [undoneAction, ...s.redoStack],
        error: null,
      }));
    }
  },

  redo: () => {
    const { gameState, redoStack } = get();
    if (!gameState || redoStack.length === 0) return;

    const [actionToRedo, ...rest] = redoStack;
    const newState = applyAction(gameState, actionToRedo);
    set({ gameState: newState, redoStack: rest, error: null });
  },

  setHeroCards: (cards: [string, string]) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: { ...gameState, hero_cards: cards } });
  },

  setBoard: (street: Street, cards: string[]) => {
    const { gameState } = get();
    if (!gameState) return;

    const newBoard = { ...gameState.board };
    if (street === "flop") {
      const newFlop: [string | null, string | null, string | null] = [...newBoard.flop];
      cards.forEach((c, i) => { if (i < 3) newFlop[i] = c; });
      newBoard.flop = newFlop;
    } else if (street === "turn" && cards.length >= 1) {
      newBoard.turn = cards[0];
    } else if (street === "river" && cards.length >= 1) {
      newBoard.river = cards[0];
    }

    set({ gameState: { ...gameState, board: newBoard } });
  },

  setBoardCard: (card: string) => {
    const { gameState } = get();
    if (!gameState) return;

    const street = gameState.current_street;
    const newBoard = { ...gameState.board };

    if (street === "preflop" || street === "flop") {
      // Only fill flop slots
      const flop = [...newBoard.flop] as [string | null, string | null, string | null];
      const emptyIdx = flop.findIndex(c => c === null);
      if (emptyIdx === -1) return; // Flop already complete
      flop[emptyIdx] = card;
      newBoard.flop = flop;
    } else if (street === "turn") {
      if (newBoard.turn !== null) return; // Turn already set
      newBoard.turn = card;
    } else if (street === "river") {
      if (newBoard.river !== null) return; // River already set
      newBoard.river = card;
    }

    set({ gameState: { ...gameState, board: newBoard } });
  },

  clearError: () => set({ error: null }),

  getSizingOptions: () => {
    const { gameState } = get();
    if (!gameState || gameState.hand_status !== "in_progress") return null;

    const actor = getPlayer(gameState, gameState.expected_actor);

    return {
      halfPot: computeQuickSizing(gameState, 0.5),
      threeFourthPot: computeQuickSizing(gameState, 0.75),
      pot: computeQuickSizing(gameState, 1.0),
      twoPointTwo: compute2_2xSizing(gameState),
      allIn: actor.invested_this_street_bb + actor.stack_remaining_bb,
    };
  },

  getAvailableActions: () => {
    const { gameState } = get();
    if (!gameState || gameState.hand_status !== "in_progress") return [];

    const actions: ActionType[] = [];
    const { to_call_bb } = gameState.derived;
    const actor = getPlayer(gameState, gameState.expected_actor);

    if (actor.is_all_in) return [];

    if (to_call_bb === 0) {
      actions.push("check");
      if (gameState.street_state.current_bet_bb === 0) {
        actions.push("bet");
      }
    } else {
      actions.push("fold");
      actions.push("call");
      if (gameState.street_state.current_bet_bb > 0) {
        actions.push("raise_to");
      }
    }

    if (actor.stack_remaining_bb > 0) {
      actions.push("all_in");
    }

    return actions;
  },
}));
