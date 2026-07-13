# 🚀 FIXED: Upgraded base image to Python 3.12 to support Django 6.x requirements
FROM python:3.12-slim

# Force apt-get to run completely unattended without looking for prompts
ENV DEBIAN_FRONTEND=noninteractive

# Clean up package targets and pull modern Debian dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    poppler-utils \
    libgl1 \
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