"""
Document ingestion and file format processor.
Handles PDF, JPG, JPEG, and PNG document parsing, page extraction, format validation, and image metadata analysis.
"""
import os
import hashlib
import struct
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class DocumentPageData:
    page_number: int
    raw_bytes: bytes
    width_px: int = 1200
    height_px: int = 1600
    mime_type: str = "image/png"
    dpi: int = 300
    is_scanned_image: bool = True
    embedded_text: Optional[str] = None


@dataclass
class IngestedDocument:
    filename: str
    file_type: str
    mime_type: str
    file_size_bytes: int
    file_hash_sha256: str
    total_pages: int
    pages: List[DocumentPageData] = field(default_factory=list)
    raw_metadata: Dict[str, Any] = field(default_factory=dict)


class DocumentProcessor:
    """
    Modular Document Ingestion & Page Processor.
    Supports PDF, JPG, JPEG, PNG formats with native parsing and robust error handling.
    """

    SUPPORTED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".txt", ".svg"}

    def __init__(self):
        pass

    def ingest_file(self, file_path_or_bytes: Any, original_filename: str = "document.png") -> IngestedDocument:
        """
        Ingest a file from a filesystem path, bytes, or buffer.
        """
        if isinstance(file_path_or_bytes, (str, bytes, bytearray)):
            if isinstance(file_path_or_bytes, str) and os.path.exists(file_path_or_bytes):
                with open(file_path_or_bytes, "rb") as f:
                    file_bytes = f.read()
                filename = os.path.basename(file_path_or_bytes)
            elif isinstance(file_path_or_bytes, (bytes, bytearray)):
                file_bytes = bytes(file_path_or_bytes)
                filename = original_filename
            else:
                raise FileNotFoundError(f"File not found: {file_path_or_bytes}")
        else:
            raise ValueError("Input must be a valid file path or raw bytes.")

        file_size = len(file_bytes)
        file_hash = hashlib.sha256(file_bytes).hexdigest()
        ext = os.path.splitext(filename)[1].lower()

        if not ext:
            # Infer from signature
            ext = self._infer_extension(file_bytes)

        if ext not in self.SUPPORTED_EXTENSIONS:
            raise ValueError(f"Unsupported file format '{ext}'. Supported formats: {', '.join(self.SUPPORTED_EXTENSIONS)}")

        mime_type = self._get_mime_type(ext)
        pages = self._extract_pages(file_bytes, ext)

        return IngestedDocument(
            filename=filename,
            file_type=ext.lstrip("."),
            mime_type=mime_type,
            file_size_bytes=file_size,
            file_hash_sha256=file_hash,
            total_pages=len(pages),
            pages=pages,
            raw_metadata={
                "inferred_extension": ext,
                "file_size_kb": round(file_size / 1024, 2),
                "has_embedded_text": any(p.embedded_text for p in pages),
            }
        )

    def _infer_extension(self, data: bytes) -> str:
        if data.startswith(b"%PDF"):
            return ".pdf"
        elif data.startswith(b"\x89PNG\r\n\x1a\n"):
            return ".png"
        elif data.startswith(b"\xff\xd8\xff"):
            return ".jpg"
        return ".png"

    def _get_mime_type(self, ext: str) -> str:
        mapping = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".txt": "text/plain",
            ".svg": "image/svg+xml",
        }
        return mapping.get(ext.lower(), "application/octet-stream")

    def _extract_pages(self, data: bytes, ext: str) -> List[DocumentPageData]:
        """
        Extracts individual pages from PDF or single image raster.
        """
        if ext == ".pdf":
            return self._process_pdf(data)
        elif ext == ".txt":
            text_str = data.decode("utf-8", errors="ignore")
            return [
                DocumentPageData(
                    page_number=1,
                    raw_bytes=data,
                    width_px=1200,
                    height_px=1600,
                    mime_type="text/plain",
                    dpi=300,
                    is_scanned_image=False,
                    embedded_text=text_str
                )
            ]
        else:
            return self._process_raster_image(data, ext)

    def _process_raster_image(self, data: bytes, ext: str) -> List[DocumentPageData]:
        """
        Inspect dimensions and wrap single page image.
        """
        w, h = self._inspect_image_dimensions(data, ext)
        mime = self._get_mime_type(ext)
        return [
            DocumentPageData(
                page_number=1,
                raw_bytes=data,
                width_px=w,
                height_px=h,
                mime_type=mime,
                dpi=300,
                is_scanned_image=True
            )
        ]

    def _process_pdf(self, data: bytes) -> List[DocumentPageData]:
        """
        Parse PDF structure, extract page objects and text stream markers.
        """
        pages: List[DocumentPageData] = []
        # Attempt basic text extraction from PDF stream objects
        page_texts = self._extract_text_from_pdf_stream(data)
        
        num_pages = max(1, len(page_texts))
        for page_idx in range(1, num_pages + 1):
            text_content = page_texts[page_idx - 1] if page_idx - 1 < len(page_texts) else None
            pages.append(
                DocumentPageData(
                    page_number=page_idx,
                    raw_bytes=data,  # Contains PDF bundle
                    width_px=1240,
                    height_px=1754,  # Standard A4 @ 150 DPI
                    mime_type="application/pdf",
                    dpi=300,
                    is_scanned_image=text_content is None or len(text_content.strip()) < 50,
                    embedded_text=text_content
                )
            )
        return pages

    def _extract_text_from_pdf_stream(self, data: bytes) -> List[str]:
        """
        Extract text chunks from uncompressed PDF streams or BT...ET operators.
        """
        import re
        pages_text: List[str] = []
        try:
            content_str = data.decode("latin1", errors="ignore")
            # Look for Text blocks: BT ... ET
            text_blocks = re.findall(r"BT\s*(.*?)\s*ET", content_str, re.DOTALL)
            if text_blocks:
                extracted_lines = []
                for block in text_blocks:
                    # Find strings in parentheses: (text) Tj or [(text)] TJ
                    strings = re.findall(r"\((.*?)\)\s*(?:Tj|'|\")", block)
                    if strings:
                        extracted_lines.extend(strings)
                if extracted_lines:
                    pages_text.append("\n".join(extracted_lines))
        except Exception:
            pass

        if not pages_text:
            pages_text.append("")
        return pages_text

    def _inspect_image_dimensions(self, data: bytes, ext: str) -> Tuple[int, int]:
        """
        Pure Python image dimension reader without external C-extension requirements.
        """
        try:
            if ext == ".png" and len(data) >= 24:
                # IHDR chunk starts at byte 16
                w, h = struct.unpack(">II", data[16:24])
                return w, h
            elif ext in (".jpg", ".jpeg"):
                # Parse SOF0 / SOF2 markers
                idx = 2
                while idx < len(data) - 8:
                    if data[idx] == 0xFF:
                        marker = data[idx + 1]
                        if marker in (0xC0, 0xC1, 0xC2, 0xC3):  # SOF markers
                            h, w = struct.unpack(">HH", data[idx + 5:idx + 9])
                            return w, h
                        length = struct.unpack(">H", data[idx + 2:idx + 4])[0]
                        idx += 2 + length
                    else:
                        idx += 1
        except Exception:
            pass
        return 1200, 1600
