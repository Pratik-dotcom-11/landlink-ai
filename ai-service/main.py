#!/usr/bin/env python3
"""
CLI and Entry Point for the Land Record AI/OCR Digitization Pipeline.
"""
import argparse
import json
import sys
import os

# Add local package directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pipeline.pipeline import LandRecordPipeline
from config import PipelineConfig


def run_pipeline(input_path: str, lang: str = None, output_path: str = None) -> None:
    pipeline = LandRecordPipeline()
    print(f"[*] Processing document: {input_path}")
    if lang:
        print(f"[*] Preferred language: {lang}")

    result = pipeline.process_document(
        file_input=input_path,
        filename=os.path.basename(input_path),
        preferred_language=lang
    )

    result_dict = result.to_dict()
    output_json = json.dumps(result_dict, indent=2, ensure_ascii=False)

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(output_json)
        print(f"[+] Output written to: {output_path}")
    else:
        print(output_json)

    print("\n--- Pipeline Summary ---")
    print(f"Document ID: {result.document_id}")
    print(f"Language: {result.detected_language} ({result.script_type})")
    print(f"Overall Confidence: {result.overall_confidence:.2%} ({result.overall_confidence_tier.value})")
    print(f"Requires Human Verification: {result.requires_human_verification}")
    print(f"Auto-Approval Eligible: {result.auto_approval_eligible}")
    print(f"Extracted Fields Count: {len(result.fields)}")
    print(f"Processing Time: {result.metrics.total_processing_time_ms:.2f} ms")


def run_demo() -> None:
    """
    Runs demo processing on mock documents for Hindi, Bengali, and English.
    """
    mock_dir = os.path.join(os.path.dirname(__file__), "mock_data")
    demo_files = [
        ("sample_hindi_khasra.txt", "hi"),
        ("sample_bengali_porcha.txt", "bn"),
        ("sample_english_ror.txt", "en"),
    ]

    pipeline = LandRecordPipeline()

    print("=" * 70)
    print("DEMO: INTELLIGENT LAND RECORD DIGITIZATION & VALIDATION PIPELINE")
    print("=" * 70)

    for filename, lang in demo_files:
        filepath = os.path.join(mock_dir, filename)
        if not os.path.exists(filepath):
            print(f"[-] Mock file not found: {filepath}")
            continue

        print(f"\n>>> Running Pipeline on: {filename} (Language: {lang})")
        result = pipeline.process_document(
            file_input=filepath,
            filename=filename,
            preferred_language=lang
        )

        print(f"  • Overall Confidence: {result.overall_confidence:.2%} ({result.overall_confidence_tier.value})")
        print(f"  • Requires Human Verification: {result.requires_human_verification}")
        print(f"  • Auto-Approval Eligible: {result.auto_approval_eligible}")
        
        # Display key extracted fields
        print("  • Extracted Fields:")
        for k in ["owner_name", "khasra_number", "khata_number", "area", "village", "district", "state", "land_classification", "ownership_type"]:
            f_obj = result.fields.get(k)
            if f_obj:
                val = f_obj.value if f_obj.value is not None else "[NULL / NOT FOUND]"
                print(f"    - {f_obj.field_label:32s}: {str(val):25s} | Conf: {f_obj.confidence:.2f} | Verify: {f_obj.verification_required}")


def main():
    parser = argparse.ArgumentParser(description="AI/OCR Land Record Digitization Pipeline")
    parser.add_argument("--input", "-i", type=str, help="Path to input document (PDF, JPG, JPEG, PNG, TXT)")
    parser.add_argument("--lang", "-l", type=str, choices=["en", "hi", "bn"], help="Preferred language code")
    parser.add_argument("--output", "-o", type=str, help="Path to write JSON output")
    parser.add_argument("--demo", action="store_true", help="Run automated demo on mock cadastral documents")

    args = parser.parse_args()

    if args.demo:
        run_demo()
    elif args.input:
        run_pipeline(args.input, args.lang, args.output)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
