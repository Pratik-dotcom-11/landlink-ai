"""
Unit tests for Image Preprocessing and Quality Assessment.
"""
import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from preprocessing.image_preprocessor import ImagePreprocessor, PreprocessingResult


class TestImagePreprocessing(unittest.TestCase):

    def setUp(self):
        self.preprocessor = ImagePreprocessor(target_dpi=300, auto_deskew=True)

    def test_preprocess_page(self):
        sample_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 500
        res = self.preprocessor.preprocess_page(sample_bytes, width=1200, height=1600)
        self.assertIsInstance(res, PreprocessingResult)
        self.assertEqual(res.estimated_dpi, 300)
        self.assertGreaterEqual(res.contrast_score, 0.0)
        self.assertLessEqual(res.contrast_score, 1.0)
        self.assertIsInstance(res.enhancements_applied, list)


if __name__ == "__main__":
    unittest.main()
