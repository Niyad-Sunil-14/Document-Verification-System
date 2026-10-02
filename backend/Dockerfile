FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download models at build time so the first upload isn't slow
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(text_detection_model_name='PP-OCRv5_mobile_det', text_recognition_model_name='PP-OCRv5_mobile_rec', use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False)"

COPY . .

# 1 worker + threads: the model is loaded once, not once per worker
CMD python manage.py migrate && python manage.py collectstatic --noinput && \
    gunicorn DVS.wsgi:application --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120