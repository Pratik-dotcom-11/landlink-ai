"""
Unit tests for Confidence Scoring and Verification Triage.
"""
import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scoring.confidence_scorer import ConfidenceScorer
from schemas.models import ExtractedField, ConfidenceTier, AreaExtraction


class TestConfidenceScoring(unittest.TestCase):

    def setUp(self):
        self.scorer = ConfidenceScorer()

    def test_high_confidence_record(self):
        fields = {
            "owner_name": ExtractedField("owner_name", "Owner Name", value="Ramesh Sharma", confidence=0.95),
            "khasra_number": ExtractedField("khasra_number", "Khasra", value="142/1", confidence=0.96),
            "khata_number": ExtractedField("khata_number", "Khata", value="104", confidence=0.95),
            "area": ExtractedField("area", "Area", value="2.45 Ha", confidence=0.95),
            "district": ExtractedField("district", "District", value="Sehore", confidence=0.95),
            "village": ExtractedField("village", "Village", value="Shyampur", confidence=0.95),
            "state": ExtractedField("state", "State", value="Madhya Pradesh", confidence=0.95),
        }
        area_details = AreaExtraction(value=2.45, unit="Hectares", standardized_hectares=2.45)
        conf, tier, req_verif, reasons, auto_app, alerts = self.scorer.evaluate_record(fields, area_details, 0.95)

        self.assertGreaterEqual(conf, 0.85)
        self.assertEqual(tier, ConfidenceTier.HIGH)
        self.assertFalse(req_verif)
        self.assertTrue(auto_app)

    def test_missing_critical_field_triggers_verification(self):
        fields = {
            "owner_name": ExtractedField("owner_name", "Owner Name", value=None, confidence=0.0),
            "khasra_number": ExtractedField("khasra_number", "Khasra", value="142/1", confidence=0.95),
        }
        area_details = AreaExtraction(value=2.45, unit="Hectares")
        conf, tier, req_verif, reasons, auto_app, alerts = self.scorer.evaluate_record(fields, area_details, 0.80)

        self.assertTrue(req_verif)
        self.assertFalse(auto_app)
        self.assertTrue(any("owner_name" in r for r in reasons))


if __name__ == "__main__":
    unittest.main()
