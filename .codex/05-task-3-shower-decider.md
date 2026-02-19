# Task 3 Dossier: Shower Decider

## Objective
Keep one shower chain step while selecting mode deterministically (`skip | regular | head`) from time slack, with persistent manual override.

## In Scope
- deterministic decision function
- metadata persistence for decision + manual override
- UI override control

## Out of Scope
- restructuring shower into multiple chain steps
- broad hygiene model changes

## Do Not Touch
- core chain generation ordering
- unrelated habits parser behavior

## Proposed Metadata Shape (Additive)
- `metadata.shower = { mode, reason, duration_min, duration_max, manual_override? }`

## Deterministic Rule
1. `slack = (chain_completion_deadline - now) - remaining_required_duration`
2. if slack < 0 -> `skip`
3. else if slack >= `HEAD_SHOWER_THRESHOLD` -> `head`
4. else if slack >= `REG_SHOWER_THRESHOLD` -> `regular`
5. else -> `skip`

## Defaults (Until Tuned)
- `HEAD_SHOWER_THRESHOLD = 40` minutes
- `REG_SHOWER_THRESHOLD = 20` minutes
- record thresholds as tunables in code comments/config

## Manual Override
- user-selected mode wins over auto mode
- persisted in step metadata
- reason should be `manual_override`

## Edge Cases
- late wake-up
- no upcoming anchor
- remaining required duration unknown
- no shower step present

## Tests (Targeted)
1. Deterministic output for fixed input scenarios.
2. Manual override persistence and precedence.
3. Late scenario auto-selects `skip`.
