import os
import pdfplumber
import cv2  
import numpy as np 
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
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return None

        img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        img = cv2.fastNlMeansDenoising(img, h=10, templateWindowSize=7, searchWindowSize=21)
        img = cv2.adaptiveThreshold(
            img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        return Image.fromarray(img)
    except Exception as e:
        print(f"Error during CV2 image preprocessing: {str(e)}")
        return None