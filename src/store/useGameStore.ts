import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { GameState, GameConfig, ActionType, Action, Street, TimelineEvent } from '@/engine/types';
import { createInitialState, validateAction, applyAction, advanceStreet, recalcDerived } from '@/engine/engine';
import { replayTimeline } from '@/engine/timeline';
import { computeQuickSizing, compute2_2xSizing } from '@/engine/sizing';
import { getPlayer } from '@/engine/utils';
import type { HandSnapshot } from '@/engine/history';
import { snapshotFromState, addToHistory } from '@/engine/history';

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
  timeline: TimelineEvent[];
  redoStack: TimelineEvent[];
  error: string | null;
  handHistory: HandSnapshot[];

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
  clearHistory: () => void;
  exportHistory: () => void;

  // Selectors
  getSizingOptions: () => SizingOptions | null;
  getAvailableActions: () => ActionType[];
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gameState: null,
      timeline: [],
      redoStack: [],
      error: null,
      handHistory: [],

      startHand: (config: GameConfig) => {
        const currentState = get().gameState;
        const handNumber = currentState ? currentState.hand_number + 1 : 1;
        const state = createInitialState(config, handNumber);
        set({ gameState: state, timeline: [], redoStack: [], error: null });
      },

      dispatchAction: (type: ActionType, amount_bb?: number) => {
        const { gameState, timeline } = get();
        if (!gameState) return;

        // P1 guard: no actions when street is closed
        if (gameState.street_state.is_closed) {
          set({ error: 'Street fermée — avancez à la street suivante' });
          return;
        }

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
        const event: TimelineEvent = { kind: 'action', action };
        set({ gameState: newState, timeline: [...timeline, event], redoStack: [], error: null });
      },

      advanceStreet: (boardCards?: string[]) => {
        const { gameState, timeline } = get();
        if (!gameState) return;

        const streetOrder: Street[] = ["preflop", "flop", "turn", "river"];
        const currentIndex = streetOrder.indexOf(gameState.current_street);
        if (currentIndex >= streetOrder.length - 1) return;

        const nextStreet = streetOrder[currentIndex + 1];
        const newState = advanceStreet(gameState, nextStreet, boardCards);
        const event: TimelineEvent = { kind: 'advance_street', street: nextStreet, boardCards };
        set({ gameState: newState, timeline: [...timeline, event], error: null });
      },

      endHand: (result_bb?: number) => {
        const { gameState, handHistory } = get();
        if (!gameState) return;

        const voluntary = gameState.actions.filter(a => a.type !== 'post_sb' && a.type !== 'post_bb');
        const hasMeaningful = voluntary.length > 0 || gameState.hero_cards !== null || gameState.board.flop.some(c => c !== null);
        let newHistory = handHistory;
        if (hasMeaningful) {
          const snapshot = snapshotFromState(gameState, result_bb ?? 0);
          newHistory = addToHistory(handHistory, snapshot);
        }

        const newState = createInitialState(gameState.config, gameState.hand_number + 1);
        set({ gameState: newState, timeline: [], redoStack: [], error: null, handHistory: newHistory });
      },

      undo: () => {
        const { gameState, timeline } = get();
        if (!gameState || timeline.length === 0) return;

        const lastEvent = timeline[timeline.length - 1];
        const remaining = timeline.slice(0, -1);
        const newState = replayTimeline(gameState.config, gameState.hand_number, remaining);

        set({
          gameState: newState,
          timeline: remaining,
          redoStack: [lastEvent, ...get().redoStack],
          error: null,
        });
      },

      redo: () => {
        const { gameState, timeline, redoStack } = get();
        if (!gameState || redoStack.length === 0) return;

        const [eventToRedo, ...rest] = redoStack;
        const newTimeline = [...timeline, eventToRedo];
        const newState = replayTimeline(gameState.config, gameState.hand_number, newTimeline);

        set({ gameState: newState, timeline: newTimeline, redoStack: rest, error: null });
      },

      setHeroCards: (cards: [string, string]) => {
        const { gameState, timeline } = get();
        if (!gameState) return;
        const event: TimelineEvent = { kind: 'set_hero_cards', cards };
        const newTimeline = [...timeline, event];
        set({
          gameState: { ...gameState, hero_cards: cards },
          timeline: newTimeline,
          redoStack: [],
        });
      },

      setBoard: (street: Street, cards: string[]) => {
        const { gameState, timeline } = get();
        if (!gameState) return;

        const event: TimelineEvent = { kind: 'set_board', street, cards };
        const newTimeline = [...timeline, event];

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

        set({
          gameState: { ...gameState, board: newBoard },
          timeline: newTimeline,
          redoStack: [],
        });
      },

      setBoardCard: (card: string) => {
        const { gameState, timeline } = get();
        if (!gameState) return;

        const event: TimelineEvent = { kind: 'set_board_card', card };
        const newTimeline = [...timeline, event];

        const street = gameState.current_street;
        const newBoard = { ...gameState.board };

        if (street === "preflop" || street === "flop") {
          const flop = [...newBoard.flop] as [string | null, string | null, string | null];
          const emptyIdx = flop.findIndex(c => c === null);
          if (emptyIdx === -1) return;
          flop[emptyIdx] = card;
          newBoard.flop = flop;
        } else if (street === "turn") {
          if (newBoard.turn !== null) return;
          newBoard.turn = card;
        } else if (street === "river") {
          if (newBoard.river !== null) return;
          newBoard.river = card;
        }

        set({
          gameState: { ...gameState, board: newBoard },
          timeline: newTimeline,
          redoStack: [],
        });
      },

      clearError: () => set({ error: null }),

      clearHistory: () => set({ handHistory: [] }),

      exportHistory: () => {
        const { handHistory } = get();
        const blob = new Blob([JSON.stringify(handHistory, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `poker-history-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },

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

        // P1 guard: no actions when street is closed
        if (gameState.street_state.is_closed) return [];

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
    }),
    {
      name: 'poker-game-store',
      version: 2,
      partialize: (state) => ({
        gameState: state.gameState,
        timeline: state.timeline,
        redoStack: state.redoStack,
        handHistory: state.handHistory,
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<GameStore>) };
        if (merged.gameState) {
          merged.gameState = {
            ...merged.gameState,
            derived: recalcDerived(merged.gameState),
          };
        }
        // Ensure timeline/redoStack exist (migration from v1)
        if (!merged.timeline) merged.timeline = [];
        if (!merged.redoStack) merged.redoStack = [];
        return merged;
      },
    },
  ),
);
