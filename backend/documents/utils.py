import pdfplumber

def extract_text_from_pdf(pdf_file):
    """
    Accepts an uploaded file object or path, opens it via pdfplumber,
    and extracts digital text page by page.
    """
    full_text = ""
    try:
        # pdfplumber can read directly from Django's memory/temp files
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    full_text += extracted + "\n"
    except Exception as e:
        print(f"Error parsing PDF text: {str(e)}")
        
    return full_text.strip()