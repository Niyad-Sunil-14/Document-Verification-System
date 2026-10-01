import os
import pdfplumber
import cv2
import numpy as np
import pytesseract

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


def extract_text_from_pdf(pdf_file_path):
    """Extracts digital text page by page from a PDF file."""
    full_text = ""
    try:
        with pdfplumber.open(pdf_file_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    full_text += extracted + "\n"
    except Exception as e:
        print(f"Error parsing PDF text: {str(e)}")
    return full_text.strip()


def preprocess_image_for_ocr(image_path_or_bytes):
    """
    Accepts either a file path string or raw image bytes.
    Returns a preprocessed binary image suitable for Tesseract.
    """
    if isinstance(image_path_or_bytes, str):
        img = cv2.imread(image_path_or_bytes)
    else:
        # Decode byte stream from API upload or memory buffer
        nparr = np.frombuffer(image_path_or_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Image reading failed. Check the file path or buffer validity.")

    # 1. Upscale image (3x) using Bicubic Interpolation for higher DPI
    height, width = img.shape[:2]
    img_resized = cv2.resize(img, (width * 3, height * 3), interpolation=cv2.INTER_CUBIC)

    # 2. Convert to Grayscale
    gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)

    # 3. Apply Bilateral Filtering (Edge-preserving noise removal)
    filtered = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)

    # 4. Otsu's Binarization (Adaptive black & white thresholding)
    _, thresh = cv2.threshold(filtered, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return thresh


def extract_ocr_text(image_input, psm=11, whitelist=None):
    """
    Runs preprocessed image through Tesseract OCR and returns extracted text 
    and average character confidence score.
    """
    # 1. Run image through OpenCV preprocessing pipeline
    processed_img = preprocess_image_for_ocr(image_input)

    # 2. Build Tesseract parameters
    config_params = [f'--oem 3 --psm {psm}']
    
    if whitelist:
        config_params.append(f'-c tessedit_char_whitelist="{whitelist}"')

    custom_config = " ".join(config_params)

    # 3. Extract word-level metadata for confidence calculation
    data = pytesseract.image_to_data(
        processed_img, 
        lang='eng', 
        config=custom_config, 
        output_type=pytesseract.Output.DICT
    )

    # 4. Calculate average confidence percentage
    confidences = [int(c) for c in data['conf'] if int(c) > 0]
    avg_confidence = float(np.mean(confidences)) if confidences else 0.0

    # 5. Extract raw text string
    raw_text = pytesseract.image_to_string(
        processed_img, 
        lang='eng', 
        config=custom_config
    )

    # 6. Filter out blank lines
    cleaned_lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
    final_text = "\n".join(cleaned_lines)

    return {
        "extracted_text": final_text,
        "confidence": round(avg_confidence, 2)
    }


def estimate_processing_time(is_pdf_file, file_size_bytes=0):
    """Calculates estimated execution time in seconds."""
    base_seconds = 8 if is_pdf_file else 4
    
    if file_size_bytes > 2 * 1024 * 1024:  # > 2MB
        base_seconds += 4
    elif file_size_bytes > 1024 * 1024:    # > 1MB
        base_seconds += 2

    return {
        "estimated_seconds": base_seconds,
        "estimated_time_formatted": f"~{base_seconds} seconds"
    }


def evaluate_document_verification(extracted_text, document_type, ocr_accuracy, pipeline_status):
    """
    Evaluates extracted text against document rules and determines final document status.
    Returns: (status: str, remarks: str, auto_verified: bool)
    """
    # 1. Condition: If OCR is failed -> REJECT the document automatically
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

    # 2. Condition: Low OCR confidence -> REJECT
    if ocr_accuracy < CONFIDENCE_REJECT_THRESHOLD:
        return (
            "REJECTED",
            f"Auto-rejected: Low OCR confidence score ({ocr_accuracy:.1f}%). Minimum required is {CONFIDENCE_REJECT_THRESHOLD}%.",
            True,
        )

    # 3. Condition: Missing expected keywords -> REJECT
    if expected_keywords and not keyword_match:
        return (
            "REJECTED",
            f"Auto-rejected: Extracted content does not contain mandatory keywords for document type '{document_type}'.",
            True,
        )

    # 4. Condition: OCR is PROCESSED + Keywords Found + Accuracy >= Required Threshold -> AUTOMATICALLY APPROVE
    if pipeline_status == "PROCESSED" and keyword_match and ocr_accuracy >= CONFIDENCE_APPROVE_THRESHOLD:
        matched_str = ", ".join(matched_keywords) if matched_keywords else "verified structure"
        return (
            "APPROVED",
            f"Auto-approved: OCR processed successfully with {ocr_accuracy:.1f}% accuracy and matched keywords: [{matched_str}].",
            True,
        )

    # 5. Fallback for moderate confidence (between reject & approve thresholds) -> PENDING manual review
    return (
        "PENDING",
        f"Flagged for manual review: OCR confidence ({ocr_accuracy:.1f}%) is below the auto-approval threshold ({CONFIDENCE_APPROVE_THRESHOLD}%).",
        False,
    )



