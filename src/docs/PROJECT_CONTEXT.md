# Poker Live Decision Assistant — Project Context

## Vision
Application mobile-first (PWA) d'assistance décisionnelle pour le poker live.
Usage exclusif en parties sans argent réel. Supporte 2 à 9 joueurs (Heads-Up = cas particulier table_size=2).

## Parcours Live
1. **Session Setup** → Config table_size (2/6/9), blinds SB/BB, position Hero, stacks par joueur (BB)
2. **Hand Live Screen** → Écran unique : saisie actions + board, HUD temps réel, reco
3. **Hand Summary** → Récap + boutons suite / modifier / supprimer
4. Boucle : Main suivante → retour au Hand Live Screen

Objectif : < 30s par main, 0 navigation pendant la saisie.

## 8 Règles NON négociables

1. **Montants en BB** — Tous les montants affichés et saisis sont en Big Blinds
2. **raise_to = total** — Convention : raise_to = montant TOTAL investi par le joueur sur la street (pas le delta)
3. **Multiway obligatoire** — 2 à 9 joueurs. HU = table_size=2
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
- ActorRibbon : chips scrollables pour voir/override l'acteur courant

## Data Conventions
- Blinds : SB = 0.5 BB, BB = 1 BB. Pot initial = 1.5 BB après blinds postées
- Heads-up : BTN = SB (agit en premier preflop, en second postflop)
- Multiway preflop : premier à agir = siège après BB (UTG)
- Multiway postflop : premier à agir = premier actif après BTN (généralement SB)
- Positions 6-max : BTN / SB / BB / UTG / HJ / CO
- Positions 9-max : BTN / SB / BB / UTG / UTG+1 / MP / MP+1 / HJ / CO
- Cartes encodées en 2 caractères : rang + couleur (ex: "Ah", "Qs", "Td")
- Rangs : A K Q J T 9 8 7 6 5 4 3 2
- Couleurs : s (♠), h (♥), d (♦), c (♣)

## Architecture
- **State engine** : TypeScript pur, immutable (structuredClone). Queue-based multiway action resolution
- **Action queue** : `players_to_act_ids[]`. Bet/raise rebuilds queue, call/check/fold pops actor
- **Store** : Zustand (persist v3) avec timeline replay pour undo/redo
- **IDs stables** : playerIds stockés dans le store pour replay déterministe
- **Monte Carlo** : Web Worker dédié (3000 itérations, ~50-100ms)
- **Cache equity** : Map LRU 500 entrées, clé canonique (heroCards + board triés)
- **Side pots** : Non calculés V1 — warning affiché si détecté

## Métriques dérivées (Glossaire)
| Clé | Description |
|-----|-------------|
| pot_bb | Total du pot en BB |
| to_call_bb | Montant à payer pour l'acteur courant |
| hero_to_call_bb | Montant à payer pour Hero (même hors tour) |
| min_raise_to_bb | Raise minimum légal |
| SPR | Stack-to-Pot Ratio (hero effective_stack / pot) |
| pot_odds_pct | to_call / (pot + to_call) en % pour l'acteur courant |
| hero_pot_odds_pct | pot_odds pour Hero |
| side_pot_warning | true si side pot détecté |
| equity | Probabilité de gagner (Monte Carlo) |
| EV | Expected Value en BB |

## Phases de build
- Phase 0 : Setup projet (thème, routes, arborescence) ✅
- Phase 1 : UI Skeleton (composants visuels, mock data) ✅
- Phase 2 : State Engine HU (applyAction, recalc, undo, Zustand) ✅
- Phase 3 : QA chiffré (scénarios tests pot/to_call) ✅
- Phase 4 : Multiway Engine (players[], action queue, IDs stables) ✅
- Phase 5 : Multiway UI (SessionSetup, ActorRibbon, ActionList labels) ✅
- Phase 6 : Supabase (tables, RLS, persistance, auth)
- Phase 7 : Equity Monte Carlo (Worker, cache) + reco
