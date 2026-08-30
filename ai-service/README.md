# Land Record AI/OCR Digitization & Extraction Pipeline

A modular, production-grade AI/OCR processing pipeline for Indian land records (Khasra, Khatauni, RoR 7/12, Porcha, Mutation Deeds). Built in Python with an extensible multi-lingual architecture supporting English, Hindi, Bengali, and ready for all 22 official Indian languages.

---

## 🏗️ End-to-End Pipeline Architecture

```
                       ┌─────────────────────────┐
                       │     INPUT DOCUMENT      │
                       │ (PDF, JPG, JPEG, PNG)   │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  PDF / Image Processor  │
                       │ Ingestion, Page Parsing │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │   Image Preprocessor    │
                       │ Deskew, DPI Estimation, │
                       │    Contrast Quality     │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │       OCR Engine        │
                       │ Line & Bounding Box Ext │
                       │  Character Confidences  │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │    Text Normalizer      │
                       │ Indic Numeral Mapping,  │
                       │ Unicode, Area Unit Conv │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  Land Field Extractor   │
                       │ 15 Cadastral Attributes │
                       │   Source Bounding Box   │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │    Confidence Scorer    │
                       │ Multi-factor Assessment │
                       │ HITL Verification Triage│
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  Validation-Ready JSON  │
                       │ Matches Postgres Schema │
                       └─────────────────────────┘
```

---

## 📋 15 Extracted Cadastral Fields

For every field, the pipeline returns structured metadata:
- `value`: Normalized scalar value or `null` if missing
- `confidence`: Confidence score (0.00 – 1.00)
- `source`: Page number, bounding box (`x`, `y`, `width`, `height`), line number, raw snippet, matched keyword
- `verification_required`: `true` if field is missing, low confidence (<0.85), or has syntactic anomalies

| # | Field Key | Field Label | Data Type | Critical Check |
|---|---|---|---|---|
| 1 | `owner_name` | Primary Landowner Name | STRING | Mandatory / Non-corrupt |
| 2 | `father_guardian_name` | Father / Guardian / Spouse Name | STRING | Person Name validation |
| 3 | `survey_number` | Survey Number | STRING | Cadastral survey syntax |
| 4 | `khasra_number` | Khasra / Plot Number | STRING | Standard survey syntax (e.g. `142/1`) |
| 5 | `khata_number` | Khata / Khatauni / Khatian Number | STRING | Numeric / alphanumeric |
| 6 | `plot_number` | Sub-Plot / Parcel Number | STRING | Survey parcel check |
| 7 | `area` | Total Land Area | NUMERIC | Standardized to Hectares & Acres |
| 8 | `village` | Village / Mouza | STRING | Geo-hierarchy check |
| 9 | `tehsil` | Tehsil / Taluka / Circle | STRING | Geo-hierarchy check |
| 10 | `district` | District | STRING | Mandatory Geo Check |
| 11 | `state` | State / Province | STRING | Mandatory State Check |
| 12 | `land_classification` | Land Use Classification | STRING | Agricultural / Non-Agri / Residential |
| 13 | `ownership_type` | Tenure / Ownership Rights Type | STRING | Bhumiswami / Rayat / Freehold |
| 14 | `mutation_info` | Mutation Order / Transfer History | OBJECT | Mutation No., Date, Order details |
| 15 | `registration_info` | Deed Registration Details | OBJECT | Deed No., Date, Sub-Registrar Office |

---

## 🌐 Extensible Language Support

The pipeline leverages a registry pattern (`LanguageRegistry`) where each language implements `BaseLanguageHandler`:

- **English (`en`)**: Handles standard Roman Record of Rights (Maharashtra 7/12, Karnataka Bhoomi, etc.)
- **Hindi (`hi`)**: Handles Devanagari numerals (`०-९`), MP Bhulekh, UP Revenue terms (खसरा, खतौनी, रकबा, हेक्टेयर, बीघा, आदि)
- **Bengali (`bn`)**: Handles Bengali numerals (`০-৯`), West Bengal BanglarBhumi terms (খতিয়ান, দাগ, পর্চা, শতক, কাঠা, রায়ত)

### Adding a New Indian Language
To add a new language (e.g. Marathi, Tamil, Telugu, Gujarati, Odia):
1. Inherit from `BaseLanguageHandler` in `languages/<lang_name>.py`.
2. Define `numeral_map`, `area_unit_conversions`, and `lexicon` for all 15 cadastral field keywords.
3. Register using `@LanguageRegistry.register` or `LanguageRegistry.register_handler()`.

---

## 🚀 Usage & CLI

### 1. Run Automated Demo
```bash
python3 ai-service/main.py --demo
```

### 2. Process a Custom Document
```bash
python3 ai-service/main.py --input path/to/document.pdf --lang hi --output result.json
```

### 3. Run Test Suite
```bash
python3 ai-service/tests/run_tests.py
```

---

## 📂 Directory Structure

```
/ai-service/
├── config.py                 # Configuration thresholds & pipeline settings
├── main.py                   # CLI entry point
├── schemas/
│   ├── __init__.py
│   └── models.py             # Data models & validation schemas
├── processors/
│   ├── __init__.py
│   └── document_processor.py # PDF & raster image ingestion
├── preprocessing/
│   ├── __init__.py
│   └── image_preprocessor.py # Contrast assessment & deskew
├── languages/
│   ├── __init__.py
│   ├── base.py               # Base class & language registry
│   ├── english.py            # English cadastral handler
│   ├── hindi.py              # Hindi / Devanagari handler
│   └── bengali.py            # Bengali handler
├── normalization/
│   ├── __init__.py
│   └── text_normalizer.py    # Indic numeral & area unit normalizer
├── ocr/
│   ├── __init__.py
│   └── ocr_engine.py         # Multi-script OCR & bounding box extraction
├── extractors/
│   ├── __init__.py
│   └── field_extractor.py    # 15-field semantic extractor
├── scoring/
│   ├── __init__.py
│   └── confidence_scorer.py  # Cadastral confidence & HITL triage engine
├── pipeline/
│   ├── __init__.py
│   └── pipeline.py           # Pipeline orchestrator
├── mock_data/                # Multi-lingual mock cadastral records
└── tests/                    # 22 Unit & E2E integration tests
```
