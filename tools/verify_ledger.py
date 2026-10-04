#!/usr/bin/env python3
"""
Pragyan Independent Public Ledger Verifier (tools/verify_ledger.py)
------------------------------------------------------------------
Audits the tamper-evident forecast archive by recalculating SHA-256 hashes
from genesis to head. Exits with 0 if valid, 1 if tampered.

Usage:
    python tools/verify_ledger.py
"""

import sys
import os

# Add repo root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.src.ledger import load_ledger, verify_chain

def main():
    print("=" * 70)
    print(" PRAGYAN TRUST LEDGER: INDEPENDENT VERIFICATION AUDIT")
    print("=" * 70)

    entries = load_ledger()
    print(f"Loaded {len(entries)} chained forecast blocks from data/forecast_archive/forecast_ledger.json")

    is_valid, msg, fail_idx = verify_chain(entries)

    if is_valid:
        print("\n [PASS] Cryptographic Integrity Verified!")
        print(f" Details: {msg}")
        print("-" * 70)
        for e in entries:
            print(f" Block #{e['sequence']:03d} | {e['timestamp']} | {e['run_type']:<8} | Hash: {e['entry_hash'][:16]}... | Prev: {e['prev_hash'][:16]}...")
        print("-" * 70)
        print("Verdict: The forecast ledger is strictly tamper-evident and authentic.")
        sys.exit(0)
    else:
        print(f"\n [FAIL] TAMPERING OR CORRUPTION DETECTED at sequence #{fail_idx}!")
        print(f" Error: {msg}")
        sys.exit(1)

if __name__ == "__main__":
    main()
