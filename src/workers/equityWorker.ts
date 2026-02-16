import { runMonteCarlo, type MonteCarloInput, type MonteCarloResult } from '@/engine/handEvaluator';

export interface WorkerRequest {
  requestId: string;
  heroCards: string[];
  boardCards: string[];
  iterations: number;
  seed: number;
  opponentCount: number;
}

export interface WorkerResponse {
  requestId: string;
  result: MonteCarloResult;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { requestId, heroCards, boardCards, iterations, seed, opponentCount } = e.data;

  const input: MonteCarloInput = { heroCards, boardCards, iterations, seed, opponentCount };
  const result = runMonteCarlo(input);

  const response: WorkerResponse = { requestId, result };
  self.postMessage(response);
};
