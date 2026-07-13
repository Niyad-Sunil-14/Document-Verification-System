# Use a lightweight, stable Python runtime image
FROM python:3.10-slim

# Install Tesseract, PDF converters, OpenCV system dependencies, and clean up cache to minimize space
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    poppler-utils \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set up the operational workspace container path
WORKDIR /app

# Install dependencies directly into the Docker environment
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files over
COPY . .

# Run database migrations and collect static files automatically on container startup
# Then hand off request traffic handling to Gunicorn
CMD python manage.py migrate && python manage.py collectstatic --noinput && gunicorn DVS.wsgi:application --bind 0.0.0.0:$PORT