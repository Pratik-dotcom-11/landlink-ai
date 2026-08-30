"""
Unit tests for Text Normalization and Indic Numeral mapping.
"""
import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from normalization.text_normalizer import TextNormalizer
from languages.hindi import HindiLanguageHandler
from languages.bengali import BengaliLanguageHandler


class TestTextNormalization(unittest.TestCase):

    def setUp(self):
        self.normalizer = TextNormalizer()

    def test_devanagari_numeral_conversion(self):
        self.normalizer.set_language_handler(HindiLanguageHandler())
        raw_text = "खसरा नंबर १४२/१ और खाता १०४"
        converted = self.normalizer.normalize_numerals(raw_text)
        self.assertEqual(converted, "खसरा नंबर 142/1 और खाता 104")

    def test_bengali_numeral_conversion(self):
        self.normalizer.set_language_handler(BengaliLanguageHandler())
        raw_text = "দাগ নম্বর ৩২৮/১ এবং খতিয়ান ৪৭২"
        converted = self.normalizer.normalize_numerals(raw_text)
        self.assertEqual(converted, "দাগ নম্বর 328/1 এবং খতিয়ান 472")

    def test_area_standardization_hectares(self):
        self.normalizer.set_language_handler(HindiLanguageHandler())
        val, unit, ha, ac = self.normalizer.normalize_area("२.४५०० हेक्टेयर")
        self.assertEqual(val, 2.45)
        self.assertEqual(ha, 2.45)
        self.assertAlmostEqual(ac, 6.0541, places=3)

    def test_area_standardization_bengali_shatak(self):
        self.normalizer.set_language_handler(BengaliLanguageHandler())
        val, unit, ha, ac = self.normalizer.normalize_area("৫০ শতক")
        self.assertEqual(val, 50.0)
        self.assertAlmostEqual(ha, 0.2023, places=3)

    def test_khasra_normalization(self):
        res = self.normalizer.normalize_khasra_or_survey("१४२ / १")
        self.assertEqual(res, "142/1")


if __name__ == "__main__":
    unittest.main()
