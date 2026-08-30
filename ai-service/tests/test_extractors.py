"""
Unit tests for Cadastral Field Extraction.
"""
import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from extractors.field_extractor import FieldExtractor
from ocr.ocr_engine import OCREngine


class TestFieldExtractors(unittest.TestCase):

    def setUp(self):
        self.extractor = FieldExtractor()
        self.ocr_engine = OCREngine()
        self.mock_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mock_data")

    def test_extract_hindi_fields(self):
        with open(os.path.join(self.mock_dir, "sample_hindi_khasra.txt"), "r", encoding="utf-8") as f:
            text = f.read()

        ocr_res = self.ocr_engine.process_page(b"", embedded_text=text)
        fields, area, mut, reg = self.extractor.extract_fields([ocr_res], language_code="hi")

        self.assertEqual(fields["owner_name"].value, "रमेश कुमार शर्मा")
        self.assertEqual(fields["khasra_number"].value, "142/1")
        self.assertEqual(fields["khata_number"].value, "104")
        self.assertEqual(fields["district"].value, "सीहोर")
        self.assertEqual(fields["state"].value, "मध्य प्रदेश")
        self.assertIsNotNone(fields["owner_name"].source)
        self.assertFalse(fields["owner_name"].verification_required)

    def test_extract_bengali_fields(self):
        with open(os.path.join(self.mock_dir, "sample_bengali_porcha.txt"), "r", encoding="utf-8") as f:
            text = f.read()

        ocr_res = self.ocr_engine.process_page(b"", embedded_text=text)
        fields, area, mut, reg = self.extractor.extract_fields([ocr_res], language_code="bn")

        self.assertEqual(fields["owner_name"].value, "প্রণব কুমার মুখোপাধ্যায়")
        self.assertEqual(fields["khasra_number"].value, "328/1")
        self.assertEqual(fields["khata_number"].value, "472")
        self.assertEqual(fields["district"].value, "উত্তর ২৪ পরগণা")
        self.assertEqual(fields["state"].value, "পশ্চিমবঙ্গ")

    def test_extract_english_fields(self):
        with open(os.path.join(self.mock_dir, "sample_english_ror.txt"), "r", encoding="utf-8") as f:
            text = f.read()

        ocr_res = self.ocr_engine.process_page(b"", embedded_text=text)
        fields, area, mut, reg = self.extractor.extract_fields([ocr_res], language_code="en")

        self.assertEqual(fields["owner_name"].value, "Vikramaditya Rajesh Deshmukh")
        self.assertEqual(fields["khasra_number"].value, "184/2")
        self.assertEqual(fields["khata_number"].value, "849")
        self.assertEqual(fields["district"].value, "Pune")
        self.assertEqual(fields["state"].value, "Maharashtra")


if __name__ == "__main__":
    unittest.main()
