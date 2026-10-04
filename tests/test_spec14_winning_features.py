"""
SIH26074 - Comprehensive Unit Test Suite for Spec 13 & Spec 14 Winning Features
-------------------------------------------------------------------------------
Tests:
1. Murphy (1977) Cost-Loss Decision Engine (ml/src/decision.py)
2. Value Meter & Divergence Aggregator (ml/src/value_meter.py)
3. Cryptographic Trust Ledger & Hash-Chain Verification (ml/src/ledger.py)
4. Agromet Report Card & Honest Partitions (ml/src/report_card.py)
5. Skill vs Distance Model & Expected Error (ml/src/skill_vs_distance.py)
6. Scope & Hierarchy Integrity (Madhya Pradesh isolation, regions.yaml)
"""

import unittest
import os
import json
import yaml

from ml.src.decision import evaluate_panchayat_decision, load_cost_presets
from ml.src.value_meter import compute_regional_value_meter
from ml.src.ledger import (
    load_ledger,
    verify_chain,
    compute_entry_hash,
    GENESIS_HASH
)
from ml.src.report_card import generate_report_card, generate_raw_csv
from ml.src.skill_vs_distance import get_skill_vs_distance_model, estimate_expected_error


class TestDecisionEngine(unittest.TestCase):
    def test_cost_presets_loaded(self):
        cfg = load_cost_presets()
        presets = cfg.get("presets", {})
        self.assertIn("cheap", presets)
        self.assertIn("medium", presets)
        self.assertIn("expensive", presets)
        self.assertEqual(presets["cheap"]["ratio"], 0.10)
        self.assertEqual(presets["medium"]["ratio"], 0.30)
        self.assertEqual(presets["expensive"]["ratio"], 0.60)

    def test_murphy_decision_act_vs_wait(self):
        # When p_downscaled (0.45) > cost_ratio (0.30), decision should be ACT
        res = evaluate_panchayat_decision(
            panchayat_code=133203,
            p_downscaled=0.45,
            p_coarse=0.20,
            cost_ratio=0.30,
            event_type="heavy_rain"
        )
        self.assertEqual(res["downscaled"]["action"], "ACT")
        self.assertEqual(res["coarse"]["action"], "WAIT")
        self.assertTrue(res["advice_differs"])

    def test_robust_margin_guard(self):
        # Difference 0.34 - 0.30 = 0.04 < robust margin (0.10) -> advice_differs=True, advice_robust_differs=False
        res = evaluate_panchayat_decision(
            panchayat_code=133203,
            p_downscaled=0.34,
            p_coarse=0.28,
            cost_ratio=0.30,
            event_type="heavy_rain"
        )
        self.assertEqual(res["downscaled"]["action"], "ACT")
        self.assertEqual(res["coarse"]["action"], "WAIT")
        self.assertTrue(res["advice_differs"])
        self.assertFalse(res["advice_robust_differs"])


class TestValueMeter(unittest.TestCase):
    def test_sample_guard(self):
        # Under n=30, has_enough_data should be False
        mock_scored = [
            {"p_downscaled": 0.40, "p_coarse": 0.20} for _ in range(15)
        ]
        vm = compute_regional_value_meter(mock_scored, cost_ratio=0.30, historical_n=15)
        self.assertFalse(vm["has_enough_data"])
        self.assertIn("not enough data yet", vm["message"])

    def test_divergence_computation(self):
        mock_scored = [
            {"p_downscaled": 0.50, "p_coarse": 0.20} for _ in range(50)
        ]
        vm = compute_regional_value_meter(mock_scored, cost_ratio=0.30, historical_n=50)
        self.assertTrue(vm["has_enough_data"])
        self.assertEqual(vm["total_panchayats_evaluated"], 50)
        self.assertEqual(vm["divergence_rate_pct"], 100.0)


class TestCryptographicLedger(unittest.TestCase):
    def test_ledger_chain_integrity(self):
        entries = load_ledger()
        self.assertGreaterEqual(len(entries), 1)
        valid, msg, fail_idx = verify_chain(entries)
        self.assertTrue(valid, f"Ledger integrity verification failed: {msg}")
        self.assertIsNone(fail_idx)

    def test_tamper_detection(self):
        entries = load_ledger()
        self.assertGreaterEqual(len(entries), 2)
        # Clone entries and tamper with an entry hash
        tampered = [dict(e) for e in entries]
        tampered[1]["manifest_sha256"] = "0" * 64
        valid, msg, fail_idx = verify_chain(tampered)
        self.assertFalse(valid)
        self.assertIsNotNone(fail_idx)


class TestAgrometReportCard(unittest.TestCase):
    def test_hindcast_mode(self):
        rc = generate_report_card(scope_type="state", scope_id="Madhya Pradesh", eval_mode="HINDCAST")
        self.assertEqual(rc["eval_mode"], "HINDCAST")
        self.assertTrue(rc["has_enough_data"])
        self.assertGreaterEqual(rc["sample_size"], 30)
        self.assertIn("contingency_table", rc)
        self.assertGreater(rc["contingency_table"]["csi"], 0.60)

    def test_live_sample_guard(self):
        rc = generate_report_card(scope_type="state", scope_id="Madhya Pradesh", eval_mode="LIVE")
        self.assertEqual(rc["eval_mode"], "LIVE")
        self.assertFalse(rc["has_enough_data"])
        self.assertLess(rc["sample_size"], 30)

    def test_raw_csv_export(self):
        csv_data = generate_raw_csv()
        self.assertIn("date,scope,rule_id", csv_data)
        self.assertIn("HIT", csv_data)


class TestSkillVsDistance(unittest.TestCase):
    def test_8_stations_loaded(self):
        model = get_skill_vs_distance_model()
        self.assertEqual(len(model["stations"]), 8)
        station_names = [s["name"] for s in model["stations"]]
        self.assertTrue(any("INDORE" in n for n in station_names))
        self.assertTrue(any("BHOPAL" in n for n in station_names))

    def test_error_monotonicity(self):
        # Closer station distance must yield lower expected error
        err_close = estimate_expected_error(15.0)
        err_mid = estimate_expected_error(50.0)
        err_far = estimate_expected_error(120.0)

        self.assertEqual(err_close["coverage_class"], "WELL_VERIFIABLE")
        self.assertEqual(err_mid["coverage_class"], "PARTIALLY_VERIFIABLE")
        self.assertEqual(err_far["coverage_class"], "POORLY_VERIFIABLE")

        self.assertLess(err_close["expected_temp_mae_c"], err_mid["expected_temp_mae_c"])
        self.assertLess(err_mid["expected_temp_mae_c"], err_far["expected_temp_mae_c"])


class TestScopeIntegrity(unittest.TestCase):
    def test_regions_yaml_active_scope(self):
        regions_path = os.path.join(os.path.dirname(__file__), "..", "regions.yaml")
        with open(regions_path, "r", encoding="utf-8") as f:
            regions = yaml.safe_load(f)

        # Madhya Pradesh must be ml_active: true
        mp = next((r for r in regions.get("regions", []) if r.get("state_code") == 23 or r.get("id") == "madhya_pradesh"), None)
        self.assertIsNotNone(mp)
        self.assertTrue(mp.get("ml_active"))

        # Jharkhand / Dhanbad must be ml_active: false
        dh = next((r for r in regions.get("regions", []) if r.get("state_code") == 20 or r.get("id") == "dhanbad_jharkhand"), None)
        if dh:
            self.assertFalse(dh.get("ml_active", True))


if __name__ == "__main__":
    unittest.main()
