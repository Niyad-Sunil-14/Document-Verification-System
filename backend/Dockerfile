# Use a stable, lightweight Python runtime image
FROM python:3.10-slim

# 🚀 FIX A: Force apt-get to run completely unattended without looking for prompts
ENV DEBIAN_FRONTEND=noninteractive

# 🚀 FIX B: Clean up package targets and remove unnecessary dev libraries that fail on slim images
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
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