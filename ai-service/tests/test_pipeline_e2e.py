"""
End-to-End Tests for the AI/OCR Land Record Pipeline.
"""
import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.pipeline import LandRecordPipeline
from schemas.models import ValidationReadyJSON, ConfidenceTier


class TestPipelineE2E(unittest.TestCase):

    def setUp(self):
        self.pipeline = LandRecordPipeline()
        self.mock_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mock_data")

    def test_e2e_hindi_pipeline(self):
        sample_path = os.path.join(self.mock_dir, "sample_hindi_khasra.txt")
        result = self.pipeline.process_document(sample_path, preferred_language="hi")

        self.assertIsInstance(result, ValidationReadyJSON)
        self.assertEqual(result.detected_language, "hi")
        self.assertEqual(result.script_type, "Devanagari")
        self.assertGreaterEqual(result.overall_confidence, 0.85)
        self.assertEqual(result.overall_confidence_tier, ConfidenceTier.HIGH)
        self.assertFalse(result.requires_human_verification)
        self.assertTrue(result.auto_approval_eligible)

        # Verify all 15 fields exist in output
        self.assertEqual(len(result.fields), 15)
        self.assertEqual(result.fields["owner_name"].value, "रमेश कुमार शर्मा")
        self.assertEqual(result.fields["khasra_number"].value, "142/1")
        self.assertEqual(result.fields["district"].value, "सीहोर")
        self.assertEqual(result.fields["state"].value, "मध्य प्रदेश")

    def test_e2e_bengali_pipeline(self):
        sample_path = os.path.join(self.mock_dir, "sample_bengali_porcha.txt")
        result = self.pipeline.process_document(sample_path, preferred_language="bn")

        self.assertIsInstance(result, ValidationReadyJSON)
        self.assertEqual(result.detected_language, "bn")
        self.assertGreaterEqual(result.overall_confidence, 0.85)
        self.assertEqual(result.fields["owner_name"].value, "প্রণব কুমার মুখোপাধ্যায়")
        self.assertEqual(result.fields["khasra_number"].value, "328/1")

    def test_e2e_english_pipeline(self):
        sample_path = os.path.join(self.mock_dir, "sample_english_ror.txt")
        result = self.pipeline.process_document(sample_path, preferred_language="en")

        self.assertIsInstance(result, ValidationReadyJSON)
        self.assertEqual(result.detected_language, "en")
        self.assertGreaterEqual(result.overall_confidence, 0.85)
        self.assertEqual(result.fields["owner_name"].value, "Vikramaditya Rajesh Deshmukh")
        self.assertEqual(result.fields["khasra_number"].value, "184/2")

    def test_e2e_missing_fields_behavior(self):
        sample_path = os.path.join(self.mock_dir, "sample_missing_fields.txt")
        result = self.pipeline.process_document(sample_path)

        self.assertTrue(result.requires_human_verification)
        self.assertFalse(result.auto_approval_eligible)
        self.assertIsNone(result.fields["owner_name"].value)
        self.assertTrue(result.fields["owner_name"].verification_required)
        self.assertEqual(result.fields["owner_name"].confidence, 0.0)


if __name__ == "__main__":
    unittest.main()
