# Poker Live Decision Assistant — Project Context

## Vision
Application mobile-first (PWA) d'assistance décisionnelle pour le poker live.
Usage exclusif en parties sans argent réel. V1 = Heads-Up uniquement.

## Parcours Live
1. **Session Setup** → Config blinds SB/BB, stacks Hero/Villain (BB), nb joueurs
2. **Hand Live Screen** → Écran unique : saisie actions + board, HUD temps réel, reco
3. **Hand Summary** → Récap + boutons suite / modifier / supprimer
4. Boucle : Main suivante → retour au Hand Live Screen

Objectif : < 30s par main, 0 navigation pendant la saisie.

## 8 Règles NON négociables

1. **Montants en BB** — Tous les montants affichés et saisis sont en Big Blinds
2. **raise_to = total** — Convention : raise_to = montant TOTAL investi par le joueur sur la street (pas le delta)
3. **V1 Heads-Up** — 2 joueurs uniquement (Hero vs Villain). Multiway = extension future
4. **Live-first, 1 main = 1 écran** — Tout accessible au pouce, pas de navigation pendant une main
5. **Action chips contextuels** — Check/Bet si to_call=0, Call/Raise/Fold sinon
6. **Quick sizing** — Presets : ½ Pot, ¾ Pot, Pot, 2.2x, All-in (1-2 taps max)
7. **Undo par replay** — Undo = rejeu complet depuis l'état initial (jamais de patch inversé)
8. **Dark mode + touch ≥ 48px** — Mobile-first 375px, cibles tactiles minimum 48px

## UX Rules
- Action simple ≤ 1 tap, sizing rapide ≤ 2 taps, feedback < 150ms
- All-in requiert confirmation (2 taps)
- Street lock (cadenas) pour éviter les changements accidentels
- Typo mono (JetBrains Mono) pour tous les montants BB
- Indicateurs street : ● active, ✓ complétée

## Data Conventions
- Blinds : SB = 0.5 BB, BB = 1 BB. Pot initial = 1.5 BB après blinds postées
- Heads-up : BTN = SB (agit en premier preflop, en second postflop)
- Cartes encodées en 2 caractères : rang + couleur (ex: "Ah", "Qs", "Td")
- Rangs : A K Q J T 9 8 7 6 5 4 3 2
- Couleurs : s (♠), h (♥), d (♦), c (♣)

## Architecture (cible)
- **State engine** : TypeScript pur (applyAction, recalcDerived, undoAction) — immutable, structuredClone
- **Store** : Zustand pour le state management React
- **Monte Carlo** : Web Worker dédié (3000 itérations, ~50-100ms)
- **Cache equity** : Map LRU 500 entrées, clé canonique (heroCards + board triés)
- **Persistance** : Supabase (sessions, hands, actions) + auth email/password

## Métriques dérivées (Glossaire)
| Clé | Description |
|-----|-------------|
| pot_bb | Total du pot en BB |
| to_call_bb | Montant à payer pour Hero en BB |
| committed_bb | Total investi par un joueur dans la main |
| committed_street_bb | Investi par un joueur sur la street en cours |
| SPR | Stack-to-Pot Ratio (effective_stack / pot) |
| pot_odds | to_call / (pot + to_call) en % |
| effective_stack | min(hero_stack, villain_stack) restant |
| equity | Probabilité de gagner (Monte Carlo) |
| EV | Expected Value en BB |

## Phases de build
- Phase 0 : Setup projet (thème, routes, arborescence)
- Phase 1 : UI Skeleton (composants visuels, mock data)
- Phase 2 : State Engine (applyAction, recalc, undo, Zustand)
- Phase 3 : QA chiffré (scénarios tests pot/to_call)
- Phase 4 : Supabase (tables, RLS, persistance, auth)
- Phase 5 : Equity Monte Carlo (Worker, cache) + reco
