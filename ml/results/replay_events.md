# Replay Events Register & Scientific Evaluation (ml/results/replay_events.md)

Generated automatically by `ml/src/build_replay_events.py` adhering to SIH26074 Hindcast Protocol.

## Verified Event Manifest

| Event ID | Title | Status | Observation Class | Outcome | Peak Date | Peak Obs | Forecast (80% CI) |
|---|---|---|---|---|---|---|---|
| `event-monsoon-deep-depression-2024` | Central Monsoon Deep Depression Torrential Surge | **IN_SAMPLE** | `IN_SITU_STATION` | **HIT** | 2024-09-16 | 142.4 mm | 139.9 mm (104.9–181.9) |
| `event-orographic-surge-2024` | Orographic Monsoon Surge (Under-Warning Miss Case) | **IN_SAMPLE** | `IN_SITU_STATION` | **MISS** | 2024-08-02 | 108.6 mm | 68.5 mm (47.9–85.6) |
| `event-post2024-monsoon-surge-2026` | Post-2024 Verified Kharif Surge | **OUT_OF_SAMPLE** | `IN_SITU_STATION` | **HIT** | 2026-09-25 | 74.9 mm | 76.8 mm (61.4–92.2) |


## Scientific Honesty Integrity Rules Applied

1. **Zero Synthetic Series:** Observations are strictly verified physical station or satellite records.
2. **Inclusion of Misses:** `event-orographic-surge-2024` documents an under-warning miss case (+40mm gap).
3. **Explicit Partitioning:** `event-post2024-monsoon-surge-2026` is verified strictly `OUT_OF_SAMPLE`.
