DocVerify – Automated Document Verification & Processing PlatformDocVerify is a full-stack document processing and verification application built with React, Django REST Framework, and PostgreSQL. It features an asynchronous Optical Character Recognition (OCR) pipeline, integrated payments, role-based compliance workflows, and an AI-powered customer support assistant.Key FeaturesReal-Time Processing & Status Lifecycle Tracking: Dynamic frontend dashboard featuring dark/light modes and real-time document processing lifecycle state tracking.Asynchronous OCR Pipeline: Offloads heavy image preprocessing and text extraction (using Tesseract OCR, OpenCV, and pdf2image) to background threads to maintain sub-second REST API response times.Payment Integration & Wallet Tokens: Integrates Razorpay API and Webhooks to handle Pay-As-You-Verify transactions (₹49/scan), subscription tiers (Starter & Premium passes), auto-renewals, and token balance management.Admin & Compliance Workflow: Dedicated admin view enabling compliance officers to review documents, issue pass/fail verifications, append audit notes, and track system analytics.Security & Role-Based Access Control (RBAC): Enforces strict permission checks ensuring standard users can only access their own records or replace rejected documents, while administrators retain full review clearance.AI Support Assistant ("DocVerify Bot"): An inline customer support chatbot powered by the Groq Cloud API running Meta's Llama 3.1 8B Instant model (llama-3.1-8b-instant).Cloud Asset Management: Direct file upload streaming and asset delivery managed via Cloudinary CDN.Tech StackFrontendFramework: React.js (Hooks, Context API)Routing: React Router v6HTTP Client: Axios (Custom Instance with Interceptors)  Styling: Tailwind CSS (Responsive Design, Dark/Light Themes)BackendFramework: Python, Django, Django REST Framework (DRF)  Database & ORM: PostgreSQL, Django ORM  Asynchronous Execution: Python threading (Multithreading)OCR & Vision Engine: Tesseract OCR (pytesseract), OpenCV (cv2), pdf2image, NumPy  AI / LLM Service: Groq Cloud API (llama-3.1-8b-instant)Payment Gateway: Razorpay API & Webhook Service  Media Management: Cloudinary SDK  System Architecture Overview[ React.js Frontend ] ──▶ [ Django REST API ] ──▶ [ PostgreSQL Database ]
         │                        │
         ▼                        ├──▶ [ Background Thread (Tesseract / OpenCV OCR) ]
  [ Cloudinary CDN ] ◀────────────┼──▶ [ Groq Cloud API (Llama 3.1 8B) ]
                                  └──▶ [ Razorpay Payment Gateway & Webhooks ]
Getting StartedPrerequisitesEnsure you have the following installed locally:Node.js (v16+) & npmPython (v3.10+)PostgreSQLTesseract OCR Engine installed on your OS environment (sudo apt install tesseract-ocr on Ubuntu)Poppler Utilities (required for pdf2image conversion)Installation & Setup1. Clone the RepositoryBashgit clone https://github.com/your-username/docverify.git
cd docverify
2. Backend Setup (Django)Bash# Navigate to backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure Environment Variables (.env)
cp .env.example .env
Define the following environment variables in your .env file:Code snippetSECRET_KEY=your_django_secret_key
DEBUG=True
DATABASE_URL=postgres://user:password@localhost:5432/docverify_db

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

GROQ_API_KEY=your_groq_api_key
Run database migrations and start the server:Bashpython manage.py migrate
python manage.py createsuperuser
python manage.py runserver
3. Frontend Setup (React)Bash# Open a new terminal tab and navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite/React development server
npm run dev
API Endpoints OverviewMethodEndpointDescriptionPOST/api/documents/upload/Ingest new document and launch background OCR threadGET/api/documents/Fetch user document records (with server-side pagination)GET/PATCH/api/documents/detail/<id>/View details or replace/re-upload rejected filePOST/api/ai-assistant/Execute AI customer assistant query using Llama 3.1POST/api/payments/razorpay-order/Create Razorpay order instancePOST/api/payments/webhook/Process Razorpay payment status callbacksGET/api/admin/metrics/Fetch platform-wide analytics (Staff/Admin only)LicenseThis project is open-source and available under the MIT License.
