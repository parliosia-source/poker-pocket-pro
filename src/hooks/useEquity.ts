import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { LRUCache, makeEquityKey } from '@/engine/lruCache';
import type { WorkerRequest, WorkerResponse } from '@/workers/equityWorker';
import type { MonteCarloResult } from '@/engine/handEvaluator';

const DEFAULT_ITERATIONS = 3000;
const DEFAULT_SEED = 42;

const cache = new LRUCache<MonteCarloResult>(500);

export interface EquityState {
  equity: number | null;   // 0..1
  loading: boolean;
  ms: number | null;
  iterations: number | null;
}

export function useEquity(): EquityState {
  const heroCards = useGameStore((s) => s.gameState?.hero_cards);
  const board = useGameStore((s) => s.gameState?.board);

  const [state, setState] = useState<EquityState>({
    equity: null,
    loading: false,
    ms: null,
    iterations: null,
  });

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/equityWorker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { requestId, result } = e.data;
      // Ignore stale responses
      if (requestId !== String(requestIdRef.current)) return;

      setState({
        equity: result.equity,
        loading: false,
        ms: result.ms,
        iterations: result.iterations,
      });

      // Cache the result — reconstruct key
      const gs = useGameStore.getState().gameState;
      if (gs?.hero_cards) {
        const boardCards = getBoardCards(gs.board);
        const key = makeEquityKey(gs.hero_cards, boardCards, DEFAULT_ITERATIONS);
        cache.set(key, result);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Trigger computation when cards change
  useEffect(() => {
    if (!heroCards || heroCards.length !== 2) {
      setState({ equity: null, loading: false, ms: null, iterations: null });
      return;
    }

    const boardCards = board ? getBoardCards(board) : [];
    const key = makeEquityKey(heroCards, boardCards, DEFAULT_ITERATIONS);

    // Check cache
    const cached = cache.get(key);
    if (cached) {
      setState({
        equity: cached.equity,
        loading: false,
        ms: cached.ms,
        iterations: cached.iterations,
      });
      return;
    }

    // Send to worker
    requestIdRef.current++;
    const reqId = String(requestIdRef.current);

    setState(prev => ({ ...prev, loading: true }));

    const req: WorkerRequest = {
      requestId: reqId,
      heroCards: [...heroCards],
      boardCards,
      iterations: DEFAULT_ITERATIONS,
      seed: DEFAULT_SEED,
    };

    workerRef.current?.postMessage(req);
  }, [heroCards?.[0], heroCards?.[1], board?.flop[0], board?.flop[1], board?.flop[2], board?.turn, board?.river]);

  return state;
}

function getBoardCards(board: { flop: (string | null)[]; turn: string | null; river: string | null }): string[] {
  const cards: string[] = [];
  board.flop.forEach(c => { if (c) cards.push(c); });
  if (board.turn) cards.push(board.turn);
  if (board.river) cards.push(board.river);
  return cards;
}
