"""
Hindi (Devanagari) language handler for North/Central Indian Land Records (MP, UP, RJ, BR, CG, HR).
Includes full Devanagari numerals, revenue terminology, and regional tenure semantics.
"""
from typing import Dict, List, Tuple
from .base import BaseLanguageHandler


class HindiLanguageHandler(BaseLanguageHandler):

    @property
    def language_code(self) -> str:
        return "hi"

    @property
    def language_name(self) -> str:
        return "Hindi"

    @property
    def script_name(self) -> str:
        return "Devanagari"

    @property
    def unicode_range(self) -> Tuple[int, int]:
        # Devanagari Unicode Block: U+0900 to U+097F
        return (0x0900, 0x097F)

    @property
    def numeral_map(self) -> Dict[str, str]:
        return {
            "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
            "५": "5", "६": "6", "७": "7", "८": "8", "९": "9"
        }

    @property
    def keyword_lexicon(self) -> Dict[str, List[str]]:
        return {
            "owner_name": [
                "खातेदार का नाम", "भूस्वामी का नाम", "मालिक का नाम", "काश्तकार का नाम",
                "कृषक का नाम", "खातेदार", "भूस्वामी", "मालिक", "पट्टेदार का नाम",
                "जमीन धारक", "काश्तकार", "रैयत का नाम", "हिस्सेदार"
            ],
            "father_guardian_name": [
                "पिता का नाम", "पिता/पति का नाम", "संरक्षक का नाम", "पति का नाम",
                "पिता / पति", "पिता", "पति", "आत्मज", "वलद", "पुत्र", "पत्नी"
            ],
            "survey_number": [
                "सर्वे नंबर", "सर्वे क्र.", "सर्वे क्रमांक", "भूमापन क्रमांक", "सर्वे संख्या"
            ],
            "khasra_number": [
                "खसरा नंबर", "खसरा नं.", "खसरा संख्या", "खसरा क्रमांक", "खसरा", "गाटा संख्या", "गाटा सं."
            ],
            "khata_number": [
                "खाता नंबर", "खाता संख्या", "खाता सं.", "खाता क्रमांक", "खतौनी संख्या",
                "खतौनी खाता संख्या", "जमाबंदी संख्या", "पट्टा संख्या", "खाता", "खतौनी"
            ],
            "plot_number": [
                "प्लॉट नंबर", "भूखंड क्रमांक", "भूखंड संख्या", "प्लॉट नं.", "प्लाट नंबर"
            ],
            "area": [
                "कुल रकबा", "रकबा", "क्षेत्रफल", "कुल क्षेत्रफल", "रकबा (हेक्टेयर में)",
                "क्षेत्रफल (हेक्टेयर)", "रकबा हे.", "रकबा (बीघा)"
            ],
            "village": [
                "ग्राम", "गाँव", "गांव", "मौजा", "ग्राम का नाम", "मौजे", "राजस्व ग्राम"
            ],
            "tehsil": [
                "तहसील", "तालुका", "अंचल", "प्रखंड", "तहसील का नाम"
            ],
            "district": [
                "जिला", "ज़िला", "मण्डल", "जिले का नाम"
            ],
            "state": [
                "राज्य", "प्रदेश", "राज्य का नाम"
            ],
            "land_classification": [
                "भूमि का प्रकार", "भूमि वर्गीकरण", "भूमि की श्रेणी", "कृषि भूमि", "अकृषि भूमि",
                "सिंचित", "असिंचित", "बंजर", "आबादी", "चारागाह", "तालाब"
            ],
            "ownership_type": [
                "स्वामित्व प्रकार", "भूमिधारी अधिकार", "हकदारी", "भूमिस्वामी", "पट्टेदार",
                "गैर-हकदार", "सक्रमणीय भूमिधर", "असंक्रमणीय भूमिधर", "सीरदार"
            ],
            "mutation_info": [
                "नामांतरण पंजी", "नामांतरण क्रमांक", "नामांतरण आदेश", "नामांतरण दिनांक",
                "दाखिल खारिज", "दाखिल-खारिज संख्या", "वारिसाना आदेश", "नामांतरण"
            ],
            "registration_info": [
                "रजिस्ट्री क्रमांक", "दस्तावेज क्रमांक", "पंजीयन संख्या", "पंजीयन दिनांक",
                "उप-पंजीयक कार्यालय", "खंड संख्या", "पृष्ठ संख्या", "रजिस्ट्री"
            ]
        }

    @property
    def area_unit_conversions(self) -> Dict[str, float]:
        return {
            "हेक्टेयर": 1.0,
            "हे.": 1.0,
            "hectare": 1.0,
            "एकड़": 0.404686,
            "बीघा": 0.2529,     # Standardized MP/UP bigha baseline
            "बिस्वा": 0.012645,
            "वर्ग मीटर": 0.0001,
            "वर्ग फीट": 0.0000092903,
            "कनाल": 0.050585,
            "मरला": 0.002529
        }
