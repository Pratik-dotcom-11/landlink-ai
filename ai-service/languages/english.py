"""
English language handler for Indian Land Records, RoR Extracts, and Title Deeds.
"""
from typing import Dict, List, Tuple
from .base import BaseLanguageHandler


class EnglishLanguageHandler(BaseLanguageHandler):

    @property
    def language_code(self) -> str:
        return "en"

    @property
    def language_name(self) -> str:
        return "English"

    @property
    def script_name(self) -> str:
        return "Latin"

    @property
    def unicode_range(self) -> Tuple[int, int]:
        return (0x0020, 0x007E)

    @property
    def numeral_map(self) -> Dict[str, str]:
        return {str(i): str(i) for i in range(10)}

    @property
    def keyword_lexicon(self) -> Dict[str, List[str]]:
        return {
            "owner_name": [
                "Owner Name", "Landowner Name", "Name of Owner", "Holder Name",
                "Pattadar Name", "Khatedar Name", "Name of Occupant", "Primary Holder",
                "Name of the Cultivator", "Name of Khatedar", "Owner", "Khatedar",
                "Khatiyan Holder", "Landlord Name"
            ],
            "father_guardian_name": [
                "Father Name", "Father's Name", "Guardian Name", "Husband Name",
                "Husband's Name", "Father / Husband Name", "S/o", "W/o", "D/o",
                "Care of", "Parentage", "Father", "Husband"
            ],
            "survey_number": [
                "Survey Number", "Survey No", "Sy No", "Survey No.", "Cadastral Survey No",
                "Revenue Survey No", "R.S. No", "C.S. No"
            ],
            "khasra_number": [
                "Khasra Number", "Khasra No", "Khasra", "Khasra No.", "Gat No",
                "Gat Number", "Survey / Khasra No"
            ],
            "khata_number": [
                "Khata Number", "Khata No", "Khatauni Number", "Khatauni No", "Khata",
                "Patta Number", "Patta No", "Account No", "Ledger Folio No", "Jamabandi No"
            ],
            "plot_number": [
                "Plot Number", "Plot No", "Plot", "Parcel Number", "Parcel No", "Sub-division No"
            ],
            "area": [
                "Total Area", "Area", "Plot Area", "Extent", "Land Extent",
                "Area in Hectares", "Area in Acres", "Measurement", "Rakba", "Gross Area"
            ],
            "village": [
                "Village", "Village Name", "Mouza", "Mauza", "Revenue Village", "Gram"
            ],
            "tehsil": [
                "Tehsil", "Taluka", "Taluk", "Anchal", "Circle", "Sub-District", "Block"
            ],
            "district": [
                "District", "Dist", "Zila", "District Name"
            ],
            "state": [
                "State", "Province", "State / UT"
            ],
            "land_classification": [
                "Land Classification", "Classification", "Land Use", "Nature of Land",
                "Type of Land", "Category of Land", "Land Type", "Agricultural",
                "Non-Agricultural", "Dry Crop", "Wet Crop", "Barren", "Residential"
            ],
            "ownership_type": [
                "Ownership Type", "Tenure Type", "Type of Rights", "Rights Type",
                "Tenure", "Bhumiswami", "Ryotwari", "Freehold", "Leasehold", "Occupancy Tenant"
            ],
            "mutation_info": [
                "Mutation Number", "Mutation No", "Mutation Entry", "Mutation Date",
                "Namantaran", "Mutation Case No", "Varas Entry", "Mutation"
            ],
            "registration_info": [
                "Registration Number", "Registration No", "Deed Number", "Deed No",
                "Document Number", "Book No", "Volume No", "Registration Date",
                "Sub-Registrar Office", "SRO"
            ]
        }

    @property
    def area_unit_conversions(self) -> Dict[str, float]:
        return {
            "hectare": 1.0,
            "hectares": 1.0,
            "ha": 1.0,
            "acre": 0.404686,
            "acres": 0.404686,
            "sq.mt": 0.0001,
            "sqm": 0.0001,
            "sq.ft": 0.0000092903,
            "sqft": 0.0000092903,
            "bigha": 0.2529,     # Standardized central India baseline
            "biswa": 0.012645,
            "guntha": 0.010117,
            "katha": 0.006689,
            "cent": 0.00404686
        }
