import os

# Must be set before paddle/paddleocr is imported
os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

import logging
import threading

import pdfplumber
import cv2
import numpy as np

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# CONFIG & KEYWORDS MAP
# ------------------------------------------------------------------

DOCUMENT_TYPE_KEYWORDS = {
    'PASSPORT': ['passport', 'republic', 'nationality', 'date of birth', 'passport no'],
    'DRIVERS LICENSE': ['driving licence', 'driving license', 'driver', 'licence', 'license', 'dl no'],
    'DRIVER_LICENSE': ['driving licence', 'driving license', 'driver', 'licence', 'license', 'dl no'],
    'ID CARD': ['identity card', 'id card', 'government', 'identification', 'unique identification', 'aadhar', 'aadhaar'],
    'ID_CARD': ['identity card', 'id card', 'government', 'identification', 'unique identification', 'aadhar', 'aadhaar'],
    'INVOICE': ['invoice', 'invoice no', 'bill to', 'total amount', 'tax invoice'],
    'RECEIPT': ['receipt', 'paid', 'amount received', 'thank you', 'purchase'],
    'PAYSLIP': ['payslip', 'salary', 'net pay', 'gross pay', 'earnings'],
    'BANK STATEMENT': ['bank statement', 'account number', 'balance', 'transaction', 'ifsc'],
    'UTILITY BILL': ['utility', 'electricity', 'water bill', 'billing period', 'meter reading'],
    'CONTRACT': ['agreement', 'contract', 'party', 'terms and conditions', 'signed'],
    'TAX FORM': ['tax', 'income tax', 'pan', 'assessment year', 'form 16'],
}

CONFIDENCE_APPROVE_THRESHOLD = 60.0
CONFIDENCE_REJECT_THRESHOLD = 30.0

MAX_IMAGE_SIDE = 2000
MAX_SCANNED_PDF_PAGES = 10   # safety cap for CPU time
PDF_RENDER_SCALE = 2.0       # ~144 DPI, good balance of accuracy and speed


class OCRServiceError(Exception):
    """OCR engine failed to load or run (NOT a bad document)."""


# ------------------------------------------------------------------
# PADDLEOCR ENGINE (loaded once, shared, access serialized)
# ------------------------------------------------------------------

_ocr_engine = None
_ocr_lock = threading.Lock()


def _get_engine():
    global _ocr_engine
    if _ocr_engine is None:
        from paddleocr import PaddleOCR
        _ocr_engine = PaddleOCR(
            # mobile models: much lower RAM/CPU than the server models
            text_detection_model_name="PP-OCRv5_mobile_det",
            text_recognition_model_name="PP-OCRv5_mobile_rec",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            # avoids a known oneDNN/MKLDNN crash on some CPU builds
            enable_mkldnn=False,
        )
    return _ocr_engine


def _run_ocr(images):
    """
    images: list of BGR numpy arrays (one per page/image).
    Returns {"extracted_text": str, "confidence": float 0-100}.
    """
    lines, scores = [], []

    with _ocr_lock:  # one OCR job at a time -> predictable RAM
        try:
            engine = _get_engine()
            for img in images:
                for res in engine.predict(img):
                    texts = res.get("rec_texts", []) or []
                    confs = res.get("rec_scores", []) or []
                    for t, s in zip(texts, confs):
                        if t and t.strip():
                            lines.append(t.strip())
                            scores.append(float(s))
        except Exception as e:
            logger.error(f"PaddleOCR failure: {e!r}")
            raise OCRServiceError(f"PaddleOCR failed: {str(e)[:300]}")

    if not lines:
        return {"extracted_text": "", "confidence": 0.0}

    confidence = round(sum(scores) / len(scores) * 100, 2)
    return {"extracted_text": "\n".join(lines), "confidence": confidence}


# ------------------------------------------------------------------
# IMAGE / PDF HELPERS
# ------------------------------------------------------------------

def _load_image(image_path_or_bytes):
    if isinstance(image_path_or_bytes, str):
        img = cv2.imread(image_path_or_bytes)
    else:
        img = cv2.imdecode(np.frombuffer(image_path_or_bytes, np.uint8), cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Image reading failed. Check the file path or buffer validity.")

    h, w = img.shape[:2]
    longest = max(h, w)
    if longest > MAX_IMAGE_SIDE:
        scale = MAX_IMAGE_SIDE / longest
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    return img


def _render_pdf_pages(pdf_path):
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument(pdf_path)
    pages = []
    try:
        for i in range(min(len(pdf), MAX_SCANNED_PDF_PAGES)):
            pil_img = pdf[i].render(scale=PDF_RENDER_SCALE).to_pil().convert("RGB")
            pages.append(cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR))
    finally:
        pdf.close()
    return pages


# ------------------------------------------------------------------
# PUBLIC OCR FUNCTIONS
# ------------------------------------------------------------------

def extract_text_from_pdf(pdf_file_path):
    """Extracts digital (embedded) text page by page from a PDF. Free and instant."""
    full_text = ""
    try:
        with pdfplumber.open(pdf_file_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    full_text += extracted + "\n"
    except Exception as e:
        logger.warning(f"Error parsing PDF text: {str(e)}")
    return full_text.strip()


def extract_ocr_text(image_input, **kwargs):
    """
    OCR for an image (path or bytes) via PaddleOCR.
    Returns {"extracted_text": str, "confidence": float (0-100)}.
    Raises OCRServiceError if the engine fails, ValueError if the image is unreadable.
    """
    img = _load_image(image_input)
    return _run_ocr([img])


def extract_ocr_text_from_scanned_pdf(pdf_path):
    """OCR for scanned PDFs: renders pages with pypdfium2, then runs PaddleOCR."""
    try:
        pages = _render_pdf_pages(pdf_path)
    except Exception as e:
        raise ValueError(f"Could not render PDF: {str(e)[:200]}")
    if not pages:
        raise ValueError("PDF has no pages.")
    return _run_ocr(pages)


def estimate_processing_time(is_pdf_file, file_size_bytes=0):
    """Calculates estimated execution time in seconds (CPU PaddleOCR is slower than the API was)."""
    base_seconds = 15 if is_pdf_file else 8

    if file_size_bytes > 2 * 1024 * 1024:  # > 2MB
        base_seconds += 6
    elif file_size_bytes > 1024 * 1024:    # > 1MB
        base_seconds += 3

    return {
        "estimated_seconds": base_seconds,
        "estimated_time_formatted": f"~{base_seconds} seconds"
    }


def evaluate_document_verification(extracted_text, document_type, ocr_accuracy, pipeline_status):
    """
    Evaluates extracted text against document rules and determines final document status.
    Returns: (status: str, remarks: str, auto_verified: bool)
    """
    if pipeline_status != "PROCESSED":
        return (
            "REJECTED",
            "Auto-rejected: OCR text extraction failed. Document image unreadable or corrupted.",
            True,
        )

    normalized_text = (extracted_text or "").lower()
    raw_type = (document_type or "").strip().upper()
    normalized_type = raw_type.replace('_', ' ')

    expected_keywords = DOCUMENT_TYPE_KEYWORDS.get(
        raw_type,
        DOCUMENT_TYPE_KEYWORDS.get(normalized_type, [])
    )

    matched_keywords = [kw for kw in expected_keywords if kw in normalized_text]
    keyword_match = len(matched_keywords) > 0 if expected_keywords else True

    if ocr_accuracy < CONFIDENCE_REJECT_THRESHOLD:
        return (
            "REJECTED",
            f"Auto-rejected: Low OCR confidence score ({ocr_accuracy:.1f}%). Minimum required is {CONFIDENCE_REJECT_THRESHOLD}%.",
            True,
        )

    if expected_keywords and not keyword_match:
        return (
            "REJECTED",
            f"Auto-rejected: Extracted content does not contain mandatory keywords for document type '{document_type}'.",
            True,
        )

    if pipeline_status == "PROCESSED" and keyword_match and ocr_accuracy >= CONFIDENCE_APPROVE_THRESHOLD:
        matched_str = ", ".join(matched_keywords) if matched_keywords else "verified structure"
        return (
            "APPROVED",
            f"Auto-approved: OCR processed successfully with {ocr_accuracy:.1f}% accuracy and matched keywords: [{matched_str}].",
            True,
        )

    return (
        "PENDING",
        f"Flagged for manual review: OCR confidence ({ocr_accuracy:.1f}%) is below the auto-approval threshold ({CONFIDENCE_APPROVE_THRESHOLD}%).",
        False,
    )