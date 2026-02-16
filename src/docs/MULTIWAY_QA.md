# Multiway QA Checklist

## Engine Tests (automated — `vitest run src/test`)

All 81 tests pass ✅

### Covered scenarios

| # | Scenario | Status |
|---|----------|--------|
| 1 | 6-max preflop: UTG open → folds → calls → street closes | ✅ |
| 2 | 6-max postflop: check → bet → fold → call → street closes | ✅ |
| 3 | HU backward compat: SB call → BB check → flop OK | ✅ |
| 4 | Undo/redo: timeline replay preserves board + street | ✅ |
| 5 | All-in caps raise, status changes to all_in | ✅ |
| 6 | Min-raise calculation correct in multiway | ✅ |
| 7 | Fold-to-one: last player standing wins | ✅ |
| 8 | Side pot warning detection | ✅ |
| 9 | Pot/to_call never NaN | ✅ |
| 10 | Stable player IDs across replay | ✅ |

## Manual QA (to verify in UI)

### Test 1 — 6-max full hand
1. Start session: 6 players, Hero = CO, default stacks 100 BB
2. Preflop: UTG raise 2.5 → HJ fold → CO (Hero) call → BTN fold → SB call → BB call
3. Verify: pot = 10 BB, street closed, expected actor = SB (first postflop)
4. Flop: pick 3 cards, SB check → BB bet 5 → UTG fold → CO call → SB fold
5. Verify: pot = 20 BB, street closed
6. Turn: pick 1 card, BB check → CO bet 10 → BB call
7. River: pick 1 card, BB check → CO bet 20 → BB fold
8. End hand → verify history entry

### Test 2 — HU regression
1. Start session: 2 players, Hero = BTN/SB
2. Preflop: Hero raise 2.5 → BB call
3. Flop: BB check → Hero bet 3 → BB call
4. Verify pot/stacks correct throughout

### Test 3 — Undo/Redo multiway
1. Start 6-max hand, play preflop through 4 actions
2. Undo 2x → verify state rolls back correctly
3. Redo 1x → verify state restored
4. Advance to flop, pick board → undo → verify board cleared

### Test 4 — All-in confirm
1. Select Max preset or drag slider to max
2. Verify confirmation dialog appears
3. Cancel → no action dispatched
4. Confirm → all-in dispatched, player status = all_in

### Test 5 — Fast input (<10 taps for fold sequence)
1. Start 6-max preflop
2. Tap fold for UTG, HJ, CO, BTN, SB → verify 5 taps = 5 folds
3. BB wins by default
