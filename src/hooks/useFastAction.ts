import { useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { getPlayerById, findHero } from '@/engine/utils';

export interface FastActionState {
  isHeroTurn: boolean;
  canAct: boolean;
  passiveLabel: string;
  passiveType: 'check' | 'call';
  showFold: boolean;
  showRaise: boolean;
  raiseLabel: string;
  raiseType: 'bet' | 'raise_to';
  toCall: number;
  isCallAllIn: boolean;
  actorLabel: string;
  actorStack: number;
  actorId: string | null;
  nextActorId: string | null;
}

export function useFastAction(overrideActorId: string | null): FastActionState {
  const gameState = useGameStore((s) => s.gameState);

  return useMemo(() => {
    const defaults: FastActionState = {
      isHeroTurn: false, canAct: false,
      passiveLabel: 'Passer & Next', passiveType: 'check',
      showFold: false, showRaise: true,
      raiseLabel: 'Miser ▸', raiseType: 'bet',
      toCall: 0, isCallAllIn: false,
      actorLabel: '', actorStack: 0, actorId: null,
      nextActorId: null,
    };

    if (!gameState || gameState.hand_status !== 'in_progress') return defaults;
    if (gameState.street_state.is_closed) return defaults;

    const activeId = overrideActorId ?? gameState.expected_actor_id;
    if (!activeId) return defaults;

    const actor = getPlayerById(gameState, activeId);
    if (!actor || actor.status !== 'active') return defaults;

    const isHeroTurn = actor.is_hero;
    const toCall = Math.max(0,
      gameState.street_state.current_bet_bb - actor.invested_this_street_bb
    );
    const isUnopened = gameState.street_state.current_bet_bb === 0;
    const isCallAllIn = toCall >= actor.stack_remaining_bb;
    const showFold = toCall > 0;
    const showRaise = !(toCall > 0 && isCallAllIn);

    let passiveLabel: string;
    let passiveType: 'check' | 'call';
    if (toCall === 0) {
      passiveLabel = isHeroTurn ? 'Passer' : 'Passer & Next';
      passiveType = 'check';
    } else if (isCallAllIn) {
      passiveLabel = isHeroTurn ? 'Suivre All-in' : 'Suivre All-in & Next';
      passiveType = 'call';
    } else {
      passiveLabel = isHeroTurn ? `Suivre ${toCall}` : `Suivre ${toCall} & Next`;
      passiveType = 'call';
    }

    const raiseLabel = isUnopened
      ? (isHeroTurn ? 'Miser' : 'Miser ▸')
      : (isHeroTurn ? 'Relancer' : 'Relancer ▸');
    const raiseType = isUnopened ? 'bet' : 'raise_to';

    // Next actor preview
    const queue = gameState.action_queue.players_to_act;
    const currentIdx = queue.indexOf(activeId);
    const nextId = currentIdx >= 0 && currentIdx < queue.length - 1 ? queue[currentIdx + 1] : null;

    return {
      isHeroTurn, canAct: true,
      passiveLabel, passiveType,
      showFold, showRaise,
      raiseLabel, raiseType,
      toCall, isCallAllIn,
      actorLabel: `${actor.position_label} (${actor.label})`,
      actorStack: actor.stack_remaining_bb,
      actorId: activeId,
      nextActorId: nextId,
    };
  }, [gameState, overrideActorId]);
}
