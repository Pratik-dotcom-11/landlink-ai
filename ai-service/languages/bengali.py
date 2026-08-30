"""
Bengali (Bangla) language handler for Eastern Indian Land Records (West Bengal, Tripura, Assam).
Includes Bengali numerals, revenue terms (খতিয়ান, দাগ, মৌজা, রায়ত, ধানী), and local area metrics (কাঠা, শতক, বিঘা).
"""
from typing import Dict, List, Tuple
from .base import BaseLanguageHandler


class BengaliLanguageHandler(BaseLanguageHandler):

    @property
    def language_code(self) -> str:
        return "bn"

    @property
    def language_name(self) -> str:
        return "Bengali"

    @property
    def script_name(self) -> str:
        return "Bengali"

    @property
    def unicode_range(self) -> Tuple[int, int]:
        # Bengali Unicode Block: U+0980 to U+09FF
        return (0x0980, 0x09FF)

    @property
    def numeral_map(self) -> Dict[str, str]:
        return {
            "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
            "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
        }

    @property
    def keyword_lexicon(self) -> Dict[str, List[str]]:
        return {
            "owner_name": [
                "রায়তের নাম", "মালিকের নাম", "খতিয়ানধারীর নাম", "দখলদারের নাম",
                "অংশীদারের নাম", "স্বত্বাধিকারীর নাম", "রায়ত", "মালিক", "প্রজার নাম"
            ],
            "father_guardian_name": [
                "পিতার নাম", "পিতা/স্বামীর নাম", "অভিভাবকের নাম", "স্বামীর নাম",
                "পিতা", "স্বামী", "পিং", "জং"
            ],
            "survey_number": [
                "সার্ভে নম্বর", "জরিপ নম্বর", "সি.এস. নং", "আর.এস. নং", "এল.আর. নং"
            ],
            "khasra_number": [
                "দাগ নম্বর", "দাগ নং", "খসড়া নম্বর", "প্লট দাগ নং", "দাগ সং"
            ],
            "khata_number": [
                "খতিয়ান নম্বর", "খতিয়ান নং", "খতিয়ান", "জমা নং", "জোত নং", "তৌজি নং"
            ],
            "plot_number": [
                "প্লট নম্বর", "প্লট নং", "ভূমি খণ্ড নং", "দাগ"
            ],
            "area": [
                "জমির পরিমাণ", "মোট পরিমাণ", "কালি", "জমির কালি", "পরিমাণ (একরে)",
                "পরিমাণ (শতকে)", "মোট জমি", "ক্ষেত্রফল"
            ],
            "village": [
                "মৌজা", "মৌজার নাম", "গ্রাম", "জে.এল. নং", "জে.এল. নম্বর"
            ],
            "tehsil": [
                "থানা", "উপজেলা", "ব্লক", "অঞ্চল", "সার্কেল", "রাজস্ব দপ্তর"
            ],
            "district": [
                "জেলা", "জেলার নাম"
            ],
            "state": [
                "রাজ্য", "প্রদেশ"
            ],
            "land_classification": [
                "জমির শ্রেণী", "জমির প্রকার", "ধানী", "বাস্তু", "ডাঙা", "ডোবা",
                "পতিত", "বাগান", "পুকুর", "কৃষি", "অকৃষি"
            ],
            "ownership_type": [
                "স্বত্বের প্রকৃতি", "মালিকানা প্রকার", "রায়ত", "দখলিকার", "চিরস্থায়ী বন্দোবস্ত",
                "কৃষি প্রজা", "বর্গা প্রজা"
            ],
            "mutation_info": [
                "নামজারি কেস নং", "হস্তান্তর আদেশ", "মিউটেশন নম্বর", "নামজারি তারিখ",
                "ওয়ারিশান আদেশ", "নামজারি"
            ],
            "registration_info": [
                "দলিল নম্বর", "দলিল নং", "রেজিস্ট্রি নম্বর", "নিবন্ধন তারিখ",
                "সাব-রেজিস্ট্রি অফিস", "ভলিউম নং", "পৃষ্ঠা নং"
            ]
        }

    @property
    def area_unit_conversions(self) -> Dict[str, float]:
        return {
            "একর": 0.404686,
            "শতক": 0.00404686,   # 1 Shatak / Decimal = 1/100 acre
            "ডেসিমেল": 0.00404686,
            "বিঘা": 0.13378,     # Standard Bengal Bigha (20 Kathas)
            "কাঠা": 0.006689,
            "ছটাক": 0.000418,
            "হেক্টর": 1.0,
            "বর্গফুট": 0.0000092903
        }
