import os
import pdfplumber
import cv2  # 🔥 PASTE THE FIRST CV2 IMPORT HERE
import numpy as np  # Required for OpenCV kernel operations
from PIL import Image

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


def preprocess_image_for_ocr(image_path):
    """
    Applies computer vision filters to clean up blurry, dark, 
    or shadowed images, significantly boosting Tesseract accuracy.
    """
    try:
        # 1. Read image in Grayscale mode
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return None

        # 2. Upscale image by 2x (Tesseract performs significantly better on larger fonts)
        img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

        # 3. Denoise image (Removes background digital camera grain from low-light shots)
        img = cv2.fastNlMeansDenoising(img, h=10, templateWindowSize=7, searchWindowSize=21)

        # 4. Adaptive Thresholding (Converts image to absolute stark black and white pixels,
        # completely wiping away harsh document shadows and lighting gradients)
        img = cv2.adaptiveThreshold(
            img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )

        # Convert the processed OpenCV array back into a PIL Image format for Tesseract
        return Image.fromarray(img)
    except Exception as e:
        print(f"Error during CV2 image preprocessing: {str(e)}")
        return None