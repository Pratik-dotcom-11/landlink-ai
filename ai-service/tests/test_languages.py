"""
Unit tests for Language Registry and Indic Lexicons.
"""
import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from languages.base import LanguageRegistry
from languages.english import EnglishLanguageHandler
from languages.hindi import HindiLanguageHandler
from languages.bengali import BengaliLanguageHandler


class TestLanguages(unittest.TestCase):

    def test_registered_languages(self):
        langs = LanguageRegistry.list_supported_languages()
        self.assertIn("en", langs)
        self.assertIn("hi", langs)
        self.assertIn("bn", langs)

    def test_hindi_language_detection(self):
        hindi_text = "मध्य प्रदेश शासन - राजस्व विभाग खसरा खतौनी"
        detected = LanguageRegistry.detect_language(hindi_text)
        self.assertEqual(detected.language_code, "hi")

    def test_bengali_language_detection(self):
        bengali_text = "পশ্চিমবঙ্গ সরকার - ভূমি ও ভূমি সংস্কার দপ্তর খতিয়ান ও পর্চা"
        detected = LanguageRegistry.detect_language(bengali_text)
        self.assertEqual(detected.language_code, "bn")

    def test_english_language_detection(self):
        english_text = "Government of Maharashtra Revenue Department Record of Rights"
        detected = LanguageRegistry.detect_language(english_text)
        self.assertEqual(detected.language_code, "en")


if __name__ == "__main__":
    unittest.main()
