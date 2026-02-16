import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { LRUCache, makeEquityKey } from '@/engine/lruCache';
import type { WorkerRequest, WorkerResponse } from '@/workers/equityWorker';
import type { MonteCarloResult } from '@/engine/handEvaluator';

/** Scale iterations down for multiway to keep computation fast */
function getIterations(opponentCount: number): number {
  if (opponentCount <= 1) return 3000;
  if (opponentCount <= 2) return 1500;
  if (opponentCount <= 4) return 800;
  return 500; // 5+ opponents — 6 hands × 500 = 63k eval calls
}
const DEFAULT_SEED = 42;

const cache = new LRUCache<MonteCarloResult>(500);

export interface EquityState {
  equity: number | null;   // 0..1
  loading: boolean;
  ms: number | null;
  iterations: number | null;
  opponentCount: number;
}

export function useEquity(): EquityState {
  const heroCards = useGameStore((s) => s.gameState?.hero_cards);
  const board = useGameStore((s) => s.gameState?.board);
  const players = useGameStore((s) => s.gameState?.players);
  const heroId = useGameStore((s) => {
    const gs = s.gameState;
    if (!gs) return null;
    const hero = gs.players.find(p => p.is_hero);
    return hero?.id ?? null;
  });

  // Compute opponent count: active non-hero players
  const opponentCount = (() => {
    if (!players) return 1;
    const activeNonHero = players.filter(p => p.status === 'active' && !p.is_hero).length;
    return Math.max(1, activeNonHero);
  })();

  const [state, setState] = useState<EquityState>({
    equity: null,
    loading: false,
    ms: null,
    iterations: null,
    opponentCount: 1,
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
      if (requestId !== String(requestIdRef.current)) return;

      const gs = useGameStore.getState().gameState;
      const oc = gs ? Math.max(1, gs.players.filter(p => p.status === 'active' && !p.is_hero).length) : 1;

      setState({
        equity: result.equity,
        loading: false,
        ms: result.ms,
        iterations: result.iterations,
        opponentCount: oc,
      });

      // Cache
      if (gs?.hero_cards) {
        const boardCards = getBoardCards(gs.board);
        const iters = getIterations(oc);
        const key = makeEquityKey(gs.hero_cards, boardCards, iters, oc);
        cache.set(key, result);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Trigger computation when cards or opponent count change
  useEffect(() => {
    if (!heroCards || heroCards.length !== 2) {
      setState({ equity: null, loading: false, ms: null, iterations: null, opponentCount });
      return;
    }

    const boardCards = board ? getBoardCards(board) : [];
    const iters = getIterations(opponentCount);
    const key = makeEquityKey(heroCards, boardCards, iters, opponentCount);

    const cached = cache.get(key);
    if (cached) {
      setState({
        equity: cached.equity,
        loading: false,
        ms: cached.ms,
        iterations: cached.iterations,
        opponentCount,
      });
      return;
    }

    requestIdRef.current++;
    const reqId = String(requestIdRef.current);

    setState(prev => ({ ...prev, loading: true, opponentCount }));

    const req: WorkerRequest = {
      requestId: reqId,
      heroCards: [...heroCards],
      boardCards,
      iterations: iters,
      seed: DEFAULT_SEED,
      opponentCount,
    };

    workerRef.current?.postMessage(req);
  }, [heroCards?.[0], heroCards?.[1], board?.flop[0], board?.flop[1], board?.flop[2], board?.turn, board?.river, opponentCount]);

  return state;
}

function getBoardCards(board: { flop: (string | null)[]; turn: string | null; river: string | null }): string[] {
  const cards: string[] = [];
  board.flop.forEach(c => { if (c) cards.push(c); });
  if (board.turn) cards.push(board.turn);
  if (board.river) cards.push(board.river);
  return cards;
}
