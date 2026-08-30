"""
Unit tests for Document Ingestion & Page Processor.
"""
import unittest
import os
import sys

# Ensure ai-service root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from processors.document_processor import DocumentProcessor, IngestedDocument


class TestDocumentIngestion(unittest.TestCase):

    def setUp(self):
        self.processor = DocumentProcessor()
        self.mock_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mock_data")

    def test_ingest_mock_file(self):
        sample_path = os.path.join(self.mock_dir, "sample_hindi_khasra.txt")
        doc = self.processor.ingest_file(sample_path)
        self.assertIsInstance(doc, IngestedDocument)
        self.assertEqual(doc.filename, "sample_hindi_khasra.txt")
        self.assertEqual(doc.total_pages, 1)
        self.assertIsNotNone(doc.file_hash_sha256)
        self.assertTrue(len(doc.file_hash_sha256) == 64)

    def test_ingest_raw_bytes(self):
        raw_data = b"Sample document bytes for testing"
        doc = self.processor.ingest_file(raw_data, original_filename="test.png")
        self.assertEqual(doc.filename, "test.png")
        self.assertEqual(doc.mime_type, "image/png")
        self.assertEqual(doc.total_pages, 1)

    def test_unsupported_format_rejection(self):
        with self.assertRaises(ValueError):
            self.processor.ingest_file(b"test data", original_filename="document.exe")


if __name__ == "__main__":
    unittest.main()
