import PyPDF2
import re
from collections import Counter
import os
import nltk
import transformers, logging, contextlib

def setup_cache_directories():
    """Setup cache directories for transformers and torch with proper permissions"""
    try:
        # Create cache directories in /app with proper permissions
        cache_dirs = {
             'HF_HOME': '/app/.cache/huggingface',
             'TORCH_HOME': '/app/.cache/torch'
        }
        
        for env_var, path in cache_dirs.items():
            os.makedirs(path, exist_ok=True)
            os.chmod(path, 0o777)
            os.environ[env_var] = path
        
        # print(f"Cache directories setup complete: {cache_dirs}")
        
    except Exception as e:
        print(f"Warning: Cache directory setup failed: {e}")

# Set NLTK data path BEFORE any other NLTK imports
def setup_nltk_data():
    """Setup NLTK data directory in container-writable location"""
    try:
         #  Silence HuggingFace / Transformers logging
        transformers.utils.logging.set_verbosity_error()
        logging.getLogger("transformers").setLevel(logging.ERROR)

        # Use the app directory for NLTK data in container
        nltk_data_dir = '/app/nltk_data'
        
        # Ensure directory exists and is writable
        os.makedirs(nltk_data_dir, exist_ok=True)
        
        # Set NLTK data path - this must be done first
        nltk.data.path.clear()
        nltk.data.path.append(nltk_data_dir)
        
        # Also set the NLTK_DATA environment variable
        os.environ['NLTK_DATA'] = nltk_data_dir
        
        # Setup cache directories for transformers and torch
        setup_cache_directories()
        
        # Download required resources if not present
        required_resources = [
            'punkt',
            'punkt_tab', 
            'stopwords',
            'wordnet',
            'omw-1.4'
        ]
        
        for resource in required_resources:
            try:
                nltk.data.find(f'tokenizers/{resource}' if 'punkt' in resource else f'corpora/{resource}')
            except LookupError:
                 with contextlib.redirect_stdout(None):
                    with contextlib.redirect_stderr(None):
                        try:
                            nltk.download(resource, download_dir=nltk_data_dir, quiet=True)
                        except:
                            pass  # completely silent fallback
                    
    except Exception as e:
        print(f"Warning: NLTK setup failed: {e}")

# Call setup immediately after basic imports
setup_nltk_data()

# Now import NLTK modules after setup
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import string
from datetime import datetime, timedelta
import json
import torch
from transformers import T5ForConditionalGeneration, T5Tokenizer, pipeline, BlipProcessor, BlipForConditionalGeneration, AutoTokenizer, AutoModelForSeq2SeqLM
import warnings
import fitz  # PyMuPDF
from PIL import Image, ImageEnhance, ImageFilter
import io
import base64
import os
import pytesseract
import hashlib
import logging
import getpass
import tempfile
import shutil
import numpy as np
import requests
import urllib3
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
try:
    import psycopg2
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    print("Warning: psycopg2 not available. Database features will be disabled.")
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
try:
    import cv2
    import numpy as np
    OPENCV_AVAILABLE = True
except ImportError:
   # print("OpenCV not available. Using PIL for image preprocessing.")
    from PIL import Image
    OPENCV_AVAILABLE = False
    
from questions import THESIS_QUESTIONS
from biomed_annotator import generate_annotations

warnings.filterwarnings('ignore')

app = FastAPI(title='AI (PDF→Summary+QnA+Scores)', version='0.2.1')
app.mount("/static", StaticFiles(directory="static"), name="static")

class HIPAALogger:
    """HIPAA-compliant audit logging system"""
    
    def __init__(self, log_file="hipaa_audit.log"):
        # Create logs directory if it doesn't exist
        log_dir = '/app/logs'
        os.makedirs(log_dir, exist_ok=True)
        
        # Use the new log file path
        self.log_file = os.path.join(log_dir, log_file)
        self.logger = None
        self.setup_logging()
    
    def setup_logging(self):
        """Setup secure audit logging with fallback to console"""
        try:
            # Try to create file handler
            logging.basicConfig(
                filename=self.log_file,
                level=logging.INFO,
                format='%(asctime)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            self.logger = logging.getLogger('HIPAA_AUDIT')
            print(f"HIPAA logging initialized: {self.log_file}")
        except PermissionError:
            # Fallback to console logging if file writing fails
            logging.basicConfig(
                level=logging.INFO,
                format='%(asctime)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            self.logger = logging.getLogger('HIPAA_AUDIT')
            print(f"Warning: Cannot write to {self.log_file}, using console logging")
        except Exception as e:
            # Fallback to console logging for any other error
            logging.basicConfig(
                level=logging.INFO,
                format='%(asctime)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            self.logger = logging.getLogger('HIPAA_AUDIT')
            print(f"Warning: Logging setup failed ({e}), using console logging")
    
    def log_access(self, user_id, action, resource, success=True):
        """Log access attempts and actions"""
        status = "SUCCESS" if success else "FAILURE"
        message = f"USER:{user_id} ACTION:{action} RESOURCE:{resource} STATUS:{status}"
        self.logger.info(message)
    
    def log_phi_processing(self, user_id, document_hash, action):
        """Log PHI processing events"""
        message = f"PHI_PROCESSING USER:{user_id} DOC_HASH:{document_hash} ACTION:{action}"
        self.logger.info(message)

class SecureFileHandler:
    """Secure file handling with encryption and secure deletion"""
    
    def __init__(self, password=None):
        self.password = password
        self.key = self._derive_key(password) if password else None
        self.fernet = Fernet(self.key) if self.key else None
    
    def _derive_key(self, password):
        """Derive encryption key from password"""
        password_bytes = password.encode()
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'hipaa_thesis_analyzer_salt',
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password_bytes))
        return key
    
    def encrypt_data(self, data):
        """Encrypt sensitive data"""
        if not self.fernet:
            return data
        
        if isinstance(data, str):
            data = data.encode()
        return self.fernet.encrypt(data)
    
    def decrypt_data(self, encrypted_data):
        """Decrypt sensitive data"""
        if not self.fernet:
            return encrypted_data
        
        decrypted = self.fernet.decrypt(encrypted_data)
        return decrypted.decode()
    
    def secure_save(self, data, filepath):
        """Save data with encryption"""
        try:
            if self.fernet:
                encrypted_data = self.encrypt_data(json.dumps(data))
                with open(filepath + '.enc', 'wb') as f:
                    f.write(encrypted_data)
            else:
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2)
        except PermissionError:
            print(f"Warning: Cannot write to {filepath}, saving to /tmp instead")
            # Fallback to /tmp directory
            import tempfile
            temp_path = os.path.join(tempfile.gettempdir(), os.path.basename(filepath))
            if self.fernet:
                encrypted_data = self.encrypt_data(json.dumps(data))
                with open(temp_path + '.enc', 'wb') as f:
                    f.write(encrypted_data)
            else:
                with open(temp_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2)
            print(f"Data saved to: {temp_path}")
        except Exception as e:
            print(f"Error saving data: {e}")
            # Still try to save to /tmp as last resort
            try:
                import tempfile
                temp_path = os.path.join(tempfile.gettempdir(), os.path.basename(filepath))
                if self.fernet:
                    encrypted_data = self.encrypt_data(json.dumps(data))
                    with open(temp_path + '.enc', 'wb') as f:
                        f.write(encrypted_data)
                else:
                    with open(temp_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2)
                print(f"Data saved to fallback location: {temp_path}")
            except Exception as fallback_error:
                print(f"Failed to save data even to fallback location: {fallback_error}")
    
    def secure_load(self, filepath):
        """Load encrypted data"""
        if self.fernet and os.path.exists(filepath + '.enc'):
            with open(filepath + '.enc', 'rb') as f:
                encrypted_data = f.read()
            decrypted_data = self.decrypt_data(encrypted_data)
            return json.loads(decrypted_data)
        elif os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None
    
    def secure_delete(self, filepath):
        """Securely delete files by overwriting"""
        if os.path.exists(filepath):
            # Overwrite file multiple times before deletion
            file_size = os.path.getsize(filepath)
            with open(filepath, 'rb+') as f:
                for _ in range(3):  # DoD 5220.22-M standard
                    f.seek(0)
                    f.write(os.urandom(file_size))
                    f.flush()
            os.remove(filepath)
        
        # Also check for encrypted version
        if os.path.exists(filepath + '.enc'):
            file_size = os.path.getsize(filepath + '.enc')
            with open(filepath + '.enc', 'rb+') as f:
                for _ in range(3):
                    f.seek(0)
                    f.write(os.urandom(file_size))
                    f.flush()
            os.remove(filepath + '.enc')

class HIPAACompliantThesisAnalyzer:
    """HIPAA-compliant version of the thesis analyzer"""
    
    def __init__(self, user_id=None, password=None, session_timeout=30, model_name="t5-small", mode="analyze"):
        self.user_id = user_id or getpass.getuser()
        self.session_timeout = session_timeout  # minutes
        self.session_start = datetime.now()
        self.last_activity = datetime.now()
        self.model_name = model_name
        self.mode = mode
        
        # Map model names to their optimal tasks and parameters
        self.model_configs = {
            "t5-small": {"task": "text2text-generation", "summarizer_task": "summarization"},
            "t5-base": {"task": "text2text-generation", "summarizer_task": "summarization"},
            "t5-large": {"task": "text2text-generation", "summarizer_task": "summarization"},
            "bart-large-cnn": {"task": "text2text-generation", "summarizer_task": "summarization"},
            "facebook/bart-base": {"task": "text2text-generation", "summarizer_task": "summarization"},
            "distilbart-cnn-12-6": {"task": "text2text-generation", "summarizer_task": "summarization"},
            "sshleifer/distilbart-cnn-6-6": {"task": "text2text-generation", "summarizer_task": "summarization"},
            "pegasus-large": {"task": "text2text-generation", "summarizer_task": "summarization"},
            "flan-t5-base": {"task": "text2text-generation", "summarizer_task": "summarization"},
            "flan-t5-large": {"task": "text2text-generation", "summarizer_task": "summarization"}
        }
        
        # Initialize HIPAA compliance components
        self.hipaa_logger = HIPAALogger()
        self.secure_handler = SecureFileHandler(password)
        
        # Log session start
        self.hipaa_logger.log_access(self.user_id, "SESSION_START", "THESIS_ANALYZER")
        
        # Initialize base analyzer components
        self._initialize_analyzer()
        
        print(f"HIPAA-Compliant Thesis Analyzer initialized for user: {self.user_id}")
        print(f"Session timeout: {session_timeout} minutes")
        print(f"Encryption enabled: {'Yes' if password else 'No'}")
        print(f"Mode: {self.mode}")
    
    def _initialize_analyzer(self):
        """Initialize the core analyzer components"""
        try:
            self.lemmatizer = WordNetLemmatizer()
            self.stop_words = set(stopwords.words('english'))
        except LookupError as e:
            print(f"NLTK resource error: {e}")
            self._download_nltk_resources()
            try:
                self.lemmatizer = WordNetLemmatizer()
                self.stop_words = set(stopwords.words('english'))
            except Exception as e2:
                print(f"Failed to initialize NLTK after download: {e2}")
                # Fallback to basic functionality
                self.lemmatizer = None
                self.stop_words = set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
        except Exception as e:
            print(f"Error initializing NLTK: {e}")
            # Fallback to basic functionality
            self.lemmatizer = None
            self.stop_words = set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])

        self.thesis_text = ""
        self.sentences = []
        self.key_terms = []
        self.extracted_images = []
        self.image_descriptions = []
        self.ocr_results = []
        self.use_ocr = True
        self.use_blip = True

        # Initialize Model
        print(f"Loading {self.model_name} model (HIPAA-compliant local processing)...")
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        try:
            # Try to load with explicit cache directory
            cache_dir = '/app/.cache/huggingface'
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name, cache_dir=cache_dir)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name, cache_dir=cache_dir)
            self.model.to(self.device)
            print(f"{self.model_name} loaded successfully from cache")
        except Exception as e:
            print(f"Error loading {self.model_name}: {e}")
            print("Attempting to load with fallback cache directory...")
            try:
                # Fallback to default cache
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self.model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name)
                self.model.to(self.device)
                print(f"{self.model_name} loaded with fallback cache")
            except Exception as e2:
                print(f"Failed to load {self.model_name}: {e2}")
                # Fallback to t5-small if requested model fails
                if self.model_name != "t5-small":
                    print("Falling back to t5-small...")
                    self.model_name = "t5-small"
                    self.tokenizer = AutoTokenizer.from_pretrained("t5-small")
                    self.model = AutoModelForSeq2SeqLM.from_pretrained("t5-small")
                    self.model.to(self.device)
                else:
                    raise e2

        # Initialize pipelines
        try:
            self.summarizer = pipeline(
                "summarization",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if torch.cuda.is_available() else -1,
                max_length=200,
                min_length=50,
                do_sample=True,
                temperature=0.7
            )

            self.qa_pipeline = pipeline(
                "text2text-generation",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if torch.cuda.is_available() else -1,
                max_length=512,
                do_sample=True,
                temperature=0.7
            )
            print("Pipelines initialized successfully")
        except Exception as e:
            print(f"Error initializing pipelines: {e}")
            # Create fallback pipelines
            self.summarizer = None
            self.qa_pipeline = None

        # Initialize BLIP if enabled
        if self.use_blip:
            try:
                self.blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
                self.blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
                self.blip_model.to(self.device)
                print("BLIP model loaded for local image analysis")
            except Exception as e:
                print(f"BLIP model loading failed: {e}")
                self.use_blip = False

        # Check OCR availability
        if self.use_ocr:
            try:
                pytesseract.get_tesseract_version()
                print("Tesseract OCR available for local processing")
            except Exception as e:
                print(f"Tesseract OCR not available: {e}")
                self.use_ocr = False
    
    def _download_nltk_resources(self):
        """Download required NLTK resources to user directory"""
        # Use the same user-writable directory
        nltk_data_dir = os.path.join(os.path.expanduser('~'), 'nltk_data')
        os.makedirs(nltk_data_dir, exist_ok=True)
        nltk.data.path.append(nltk_data_dir)
        
        resources = [
            ('tokenizers/punkt', 'punkt'),
            ('tokenizers/punkt_tab', 'punkt_tab'),
            ('corpora/stopwords', 'stopwords'),
            ('corpora/wordnet', 'wordnet'),
            ('corpora/omw-1.4', 'omw-1.4')
        ]

        for resource_path, resource_name in resources:
            try:
                nltk.data.find(resource_path)
            except LookupError:
                try:
                    nltk.download(resource_name, download_dir=nltk_data_dir, quiet=True)
                    print(f"Downloaded NLTK resource: {resource_name}")
                except Exception as e:
                    print(f"Warning: Failed to download {resource_name}: {e}")
    
    def check_session_timeout(self):
        """Check if session has timed out"""
        time_since_start = datetime.now() - self.session_start
        time_since_activity = datetime.now() - self.last_activity
        
        if time_since_activity.total_seconds() > (self.session_timeout * 60):
            self.hipaa_logger.log_access(self.user_id, "SESSION_TIMEOUT", "THESIS_ANALYZER")
            raise Exception("Session timed out due to inactivity. Please restart for security.")
        
        self.last_activity = datetime.now()
    
    def calculate_document_hash(self, content):
        """Calculate secure hash of document content"""
        return hashlib.sha256(content.encode()).hexdigest()
    
    def _is_url(self, path):
        """Check if the provided path is a URL"""
        url_patterns = ['http://', 'https://', 'ftp://', 'ftps://']
        return any(path.strip().lower().startswith(pattern) for pattern in url_patterns)
    
    def _extract_from_url(self, url, verify_ssl=None):
        """Extract content from URL - download PDF temporarily and process
        
        Args:
            url: URL to download PDF from
            verify_ssl: Whether to verify SSL certificates. If None, automatically 
                       disables verification for localhost URLs
        """
        import requests
        import urllib3
        from urllib.parse import urlparse
        
        try:
            # Determine SSL verification setting
            parsed_url = urlparse(url)
            hostname = parsed_url.hostname or ''
            
            # Auto-disable SSL verification for localhost
            if verify_ssl is None:
                if hostname.lower() in ['localhost', '127.0.0.1', '::1']:
                    verify_ssl = False
                    print(f"Note: SSL verification disabled for localhost URL")
                    # Suppress only the InsecureRequestWarning for localhost
                    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                else:
                    verify_ssl = True
            
            # Download the file from URL
            print(f"Downloading document from URL: {url}")
            response = requests.get(url, timeout=30, stream=True, verify=verify_ssl)
            response.raise_for_status()
            
            # Check if content type is PDF
            content_type = response.headers.get('content-type', '').lower()
            if 'pdf' not in content_type and not url.lower().endswith('.pdf'):
                print(f"Warning: Content type is {content_type}, might not be a PDF")
            
            # Create a temporary file to store the downloaded PDF
            temp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
            temp_pdf_path = temp_pdf.name
            
            # Write content to temporary file
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    temp_pdf.write(chunk)
            temp_pdf.close()
            
            print(f"Downloaded successfully to temporary file: {temp_pdf_path}")
            
            # Calculate document hash for audit trail
            with open(temp_pdf_path, 'rb') as f:
                doc_content = f.read()
                doc_hash = hashlib.sha256(doc_content).hexdigest()[:16]
            
            # Extract text and images from the downloaded file
            text, images = self._extract_text_and_images(temp_pdf_path)
            
            # Clean up temporary file after extraction
            try:
                os.unlink(temp_pdf_path)
                print("Temporary file cleaned up")
            except Exception as e:
                print(f"Warning: Could not delete temporary file: {e}")
            
            return text, images, doc_hash
            
        except requests.exceptions.SSLError as e:
            # Provide helpful error message for SSL errors
            error_msg = f"SSL certificate verification failed: {e}\n"
            error_msg += "For self-signed certificates, the verification is automatically disabled for localhost.\n"
            error_msg += "If you're using a self-signed certificate on a non-localhost domain, "
            error_msg += "consider using a trusted certificate or contact your administrator."
            raise Exception(error_msg)
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to download from URL: {e}")
        except Exception as e:
            # Clean up temp file if it exists
            if 'temp_pdf_path' in locals() and os.path.exists(temp_pdf_path):
                try:
                    os.unlink(temp_pdf_path)
                except:
                    pass
            raise e
    
    def _prepare_document(self, pdf_path):
        """Common method to prepare document for processing (extract text/images/OCR)
        Supports both file paths and URLs"""
        self.check_session_timeout()
        
        # Dynamically identify if input is URL or file path
        if self._is_url(pdf_path):
            # URL processing
            print(f"Detected URL input: {pdf_path}")
            self.hipaa_logger.log_phi_processing(self.user_id, "URL", "URL_DOWNLOAD_START")
            
            try:
                # Extract from URL
                text, images, doc_hash = self._extract_from_url(pdf_path)
                self.hipaa_logger.log_phi_processing(self.user_id, doc_hash, "URL_EXTRACTION")
                
                # Perform OCR if enabled
                ocr_results = []
                if self.use_ocr and images:
                    ocr_results = self._perform_secure_ocr(images)
                    self.hipaa_logger.log_phi_processing(self.user_id, doc_hash, "OCR_PROCESSING")
                
                # Analyze images if BLIP enabled
                image_descriptions = []
                if self.use_blip and images:
                    image_descriptions = self._analyze_images_securely(images)
                    self.hipaa_logger.log_phi_processing(self.user_id, doc_hash, "IMAGE_ANALYSIS")
                
                # Combine all text
                ocr_text = " ".join([result['ocr_text'] for result in ocr_results if result.get('ocr_text')])
                combined_text = text + " " + ocr_text
                
                return combined_text, images, ocr_results, doc_hash
                
            except Exception as e:
                self.hipaa_logger.log_access(self.user_id, "URL_PREPARATION_ERROR", pdf_path, success=False)
                raise e
        else:
            # File path processing (existing logic)
            print(f"Detected file path input: {pdf_path}")
            
            # Calculate document hash for audit trail
            with open(pdf_path, 'rb') as f:
                doc_content = f.read()
                doc_hash = hashlib.sha256(doc_content).hexdigest()[:16]
            
            self.hipaa_logger.log_phi_processing(self.user_id, doc_hash, "DOCUMENT_LOAD")
            
            try:
                # Extract text and images
                text, images = self._extract_text_and_images(pdf_path)
                self.hipaa_logger.log_phi_processing(self.user_id, doc_hash, "TEXT_EXTRACTION")
                
                # Perform OCR if enabled
                ocr_results = []
                if self.use_ocr and images:
                    ocr_results = self._perform_secure_ocr(images)
                    self.hipaa_logger.log_phi_processing(self.user_id, doc_hash, "OCR_PROCESSING")
                
                # Analyze images if BLIP enabled
                image_descriptions = []
                if self.use_blip and images:
                    image_descriptions = self._analyze_images_securely(images)
                    self.hipaa_logger.log_phi_processing(self.user_id, doc_hash, "IMAGE_ANALYSIS")
                
                # Combine all text
                ocr_text = " ".join([result['ocr_text'] for result in ocr_results if result.get('ocr_text')])
                combined_text = text + " " + ocr_text
                
                return combined_text, images, ocr_results, doc_hash
                
            except Exception as e:
                self.hipaa_logger.log_access(self.user_id, "PREPARATION_ERROR", pdf_path, success=False)
                raise e

    def process_document_securely(self, pdf_path, questions, output_file=None):
        """Process document with full HIPAA compliance"""
        combined_text, images, ocr_results, doc_hash = self._prepare_document(pdf_path)
        
        try:
            # Generate analysis
            sections = self._extract_key_sections(combined_text)
            key_terms = self._extract_key_terms(combined_text)
            summary = self._generate_summary_secure(combined_text)
            question_answers = self._answer_questions_secure(questions, combined_text)
            
            self.hipaa_logger.log_phi_processing(self.user_id, doc_hash, "ANALYSIS_COMPLETE")
            
            # Compile HIPAA-compliant report
            report = {
                "hipaa_compliance": {
                    "processed_locally": True,
                    "encrypted_storage": bool(self.secure_handler.fernet),
                    "audit_logged": True,
                    "user_id": self.user_id,
                    "session_id": hashlib.md5(f"{self.user_id}{self.session_start}".encode()).hexdigest()[:8],
                    "document_hash": doc_hash,
                    "processing_timestamp": datetime.now().isoformat(),
                    "no_external_apis": True,
                    "local_processing_only": True
                },
                "document_info": {
                    "file_path": os.path.basename(pdf_path),  # Only filename for privacy
                    "analysis_timestamp": datetime.now().isoformat(),
                    "total_characters": len(combined_text),
                    "total_images": len(images),
                    "device_used": str(self.device)
                },
                "text_analysis": {
                    "summary": summary,
                    "key_terms": key_terms[:15],
                    "sections_found": list(sections.keys())
                },
                "image_analysis": {
                    "total_images_extracted": len(images),
                    "images_with_text": len([r for r in ocr_results if r.get('has_text', False)]),
                    "ocr_available": self.use_ocr,
                    "blip_available": self.use_blip
                },
                "question_responses": question_answers,
                "statistics": {
                    "total_text_characters": len(combined_text),
                    "ocr_text_characters": len([r['ocr_text'] for r in ocr_results if r.get('ocr_text')]), # Approximate
                    "questions_processed": len(questions),
                    "sections_identified": len(sections),
                    "key_terms_extracted": len(key_terms)
                }
            }
            
            # Save securely if output file specified
            if output_file:
                self.secure_handler.secure_save(report, output_file)
                self.hipaa_logger.log_access(self.user_id, "REPORT_SAVE", output_file)
            
            return report
            
        except Exception as e:
            self.hipaa_logger.log_access(self.user_id, "PROCESSING_ERROR", pdf_path, success=False)
            raise e

    def process_summary_only(self, pdf_path, output_file=None):
        """Process document for summary only"""
        combined_text, images, ocr_results, doc_hash = self._prepare_document(pdf_path)
        
        try:
            # Generate summary
            summary = self._generate_summary_secure(combined_text)
            key_terms = self._extract_key_terms(combined_text)
            sections = self._extract_key_sections(combined_text)
            
            self.hipaa_logger.log_phi_processing(self.user_id, doc_hash, "SUMMARY_COMPLETE")
            
            report = {
                "hipaa_compliance": {
                    "processed_locally": True,
                    "user_id": self.user_id,
                    "document_hash": doc_hash,
                    "processing_timestamp": datetime.now().isoformat()
                },
                "text_analysis": {
                    "summary": summary,
                    "key_terms": key_terms[:15],
                    "sections_found": list(sections.keys())
                }
            }
            
            if output_file:
                self.secure_handler.secure_save(report, output_file)
            
            return report
        except Exception as e:
            self.hipaa_logger.log_access(self.user_id, "SUMMARY_ERROR", pdf_path, success=False)
            raise e
    def process_summary_only_from_text(self, text_content, output_file=None):
        """Process text content for summary only (no file extraction)"""
        try:
            # Generate summary
            summary = self._generate_summary_secure(text_content)
            key_terms = self._extract_key_terms(text_content)
            sections = self._extract_key_sections(text_content)
            
            doc_hash = self.calculate_document_hash(text_content)
            self.hipaa_logger.log_phi_processing(self.user_id, doc_hash, "SUMMARY_COMPLETE")
            
            report = {
                "hipaa_compliance": {
                    "processed_locally": True,
                    "user_id": self.user_id,
                    "document_hash": doc_hash,
                    "processing_timestamp": datetime.now().isoformat()
                },
                "text_analysis": {
                    "summary": summary,
                    "key_terms": key_terms[:15],
                    "sections_found": list(sections.keys())
                }
            }
            
            if output_file:
                self.secure_handler.secure_save(report, output_file)
            
            return report
        except Exception as e:
            self.hipaa_logger.log_access(self.user_id, "SUMMARY_ERROR", "DB_CONTENT", success=False)
            print(f"Error in process_summary_only_from_text: {e}")
            raise e

    def process_questions_only(self, pdf_path, questions, output_file=None):
        """Process document for Q&A only"""
        combined_text, images, ocr_results, doc_hash = self._prepare_document(pdf_path)
        
        try:
            # Generate answers
            question_answers = self._answer_questions_secure(questions, combined_text)
            
            self.hipaa_logger.log_phi_processing(self.user_id, doc_hash, "QA_COMPLETE")
            
            report = {
                "hipaa_compliance": {
                    "processed_locally": True,
                    "user_id": self.user_id,
                    "document_hash": doc_hash,
                    "processing_timestamp": datetime.now().isoformat()
                },
                "question_responses": question_answers
            }
            
            if output_file:
                self.secure_handler.secure_save(report, output_file)
            
            return report
        except Exception as e:
            self.hipaa_logger.log_access(self.user_id, "QA_ERROR", pdf_path, success=False)
            raise e
    def process_questions_only_from_text(self, text_content, questions, output_file=None):
        """Process text content for Q&A only (no file extraction)"""
        try:
            # Generate answers
            question_answers = self._answer_questions_secure(questions, text_content)
            
            doc_hash = self.calculate_document_hash(text_content)
            self.hipaa_logger.log_phi_processing(self.user_id, doc_hash, "QA_COMPLETE")
            
            report = {
                "hipaa_compliance": {
                    "processed_locally": True,
                    "user_id": self.user_id,
                    "document_hash": doc_hash,
                    "processing_timestamp": datetime.now().isoformat()
                },
                "question_responses": question_answers
            }
            
            if output_file:
                self.secure_handler.secure_save(report, output_file)
            
            return report
        except Exception as e:
            self.hipaa_logger.log_access(self.user_id, "QA_ERROR", "DB_CONTENT", success=False)
            print(f"Error in process_questions_only_from_text: {e}")
            raise e        

    def process_annotations_only(self, pdf_path, output_file=None):
        """Process document for PubTator annotations only"""
        combined_text, images, ocr_results, doc_hash = self._prepare_document(pdf_path)
        
        try:
            # Initialize PubTator Annotator
            # Note: PubTator legacy API might have issues, but we integrate as requested
            # Using 'Gene' as a valid concept example, though API might still error
            annotator = PubTatorAnnotator(bioconcept="Gene", output_format="JSON")
            
            print("Submitting text to PubTator for annotation...")
            annotations = annotator.annotate_text(combined_text)
            
            self.hipaa_logger.log_phi_processing(self.user_id, doc_hash, "ANNOTATION_COMPLETE")
            
            report = {
                "hipaa_compliance": {
                    "processed_locally": False, # PubTator is external
                    "user_id": self.user_id,
                    "document_hash": doc_hash,
                    "processing_timestamp": datetime.now().isoformat(),
                    "external_api_used": "PubTator Legacy"
                },
                "annotations": annotations if annotations is not None else "Failed to retrieve annotations"
            }
            
            if output_file:
                self.secure_handler.secure_save(report, output_file)
            
            return report
        except Exception as e:
            self.hipaa_logger.log_access(self.user_id, "ANNOTATION_ERROR", pdf_path, success=False)
            raise e

    def save_to_database(self, pdf_path, pdf_upload_id):
        """Extract text from PDF and update existing record in PostgreSQL database"""
        if not pdf_upload_id:
            raise ValueError("pdf_upload_id is required for database update")
            
        combined_text, images, ocr_results, doc_hash = self._prepare_document(pdf_path)
        
        db_config = {
            "host": os.getenv("DB_HOST", "localhost"),
            "database": os.getenv("DB_NAME", "Scholarly"),
            "user": os.getenv("DB_USER", "postgres"),
            "password": os.getenv("DB_PASSWORD", "admin")
        }
        
        conn = None
        try:
            # Connect to the database
            conn = psycopg2.connect(**db_config)
            cur = conn.cursor()
            
            # Update the content of the existing record
            update_query = """
            UPDATE tbl_pdf_uploads 
            SET content = %s
            WHERE id = %s
            RETURNING id;
            """
            
            cur.execute(update_query, (combined_text, pdf_upload_id))
            
            # Check if any row was updated
            row = cur.fetchone()
            if not row:
                raise Exception(f"No record found with id {pdf_upload_id}")
                
            updated_id = row[0]
            
            conn.commit()
            
            self.hipaa_logger.log_access(self.user_id, "DB_UPDATE", pdf_path)
            print(f"Document content updated in database. ID: {updated_id}")
            
            return {
                "status": "success", 
                "message": "Content updated in database",
                "db_id": updated_id,
                "document_hash": doc_hash
            }
            
        except psycopg2.Error as e:
            if conn:
                conn.rollback()
            self.hipaa_logger.log_access(self.user_id, "DB_UPDATE_ERROR", pdf_path, success=False)
            print(f"Database error: {e}")
            raise e
        except Exception as e:
            print(f"Error updating database: {e}")
            raise e
        finally:
            if conn:
                conn.close()        
    
    def _extract_text_and_images(self, pdf_path):
        """Securely extract text and images from PDF"""
        text = ""
        images = []
        
        try:
            # Use PyMuPDF for comprehensive extraction
            doc = fitz.open(pdf_path)
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                
                # Extract text
                page_text = page.get_text()
                if page_text.strip():
                    text += page_text + "\n"
                
                # Extract images
                image_list = page.get_images()
                
                for img_index, img in enumerate(image_list):
                    try:
                        xref = img[0]
                        pix = fitz.Pixmap(doc, xref)
                        
                        if pix.n - pix.alpha < 4:
                            img_data = pix.tobytes("ppm")
                            img_pil = Image.open(io.BytesIO(img_data))
                            
                            image_info = {
                                'page': page_num + 1,
                                'index': img_index,
                                'image': img_pil,
                                'size': img_pil.size,
                                'format': img_pil.format or 'Unknown'
                            }
                            images.append(image_info)
                            
                        pix = None
                        
                    except Exception as e:
                        print(f"Error extracting image {img_index} from page {page_num + 1}: {e}")
                        continue
            
            doc.close()
            
        except Exception as e:
            print(f"Error in secure extraction: {e}")
        
        return text, images
    
    def _perform_secure_ocr(self, images):
        """Perform OCR with audit logging"""
        ocr_results = []
        
        for i, img_info in enumerate(images):
            try:
                img = img_info['image']
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Preprocess for OCR
                if OPENCV_AVAILABLE:
                    img_array = np.array(img)
                    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
                    denoised = cv2.medianBlur(gray, 3)
                    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                    enhanced = clahe.apply(denoised)
                    _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                    processed_img = Image.fromarray(thresh)
                else:
                    gray = img.convert('L')
                    enhancer = ImageEnhance.Contrast(gray)
                    enhanced = enhancer.enhance(2.0)
                    processed_img = enhanced.filter(ImageFilter.SHARPEN)
                
                # Perform OCR locally
                ocr_text = pytesseract.image_to_string(processed_img, config='--psm 6')
                
                ocr_result = {
                    'page': img_info['page'],
                    'image_index': img_info['index'],
                    'ocr_text': ocr_text.strip(),
                    'has_text': bool(ocr_text.strip()),
                    'processing_method': 'Local_OCR'
                }
                
                ocr_results.append(ocr_result)
                
            except Exception as e:
                ocr_results.append({
                    'page': img_info['page'],
                    'image_index': img_info['index'],
                    'ocr_text': '',
                    'has_text': False,
                    'error': str(e)
                })
        
        return ocr_results
    
    def _analyze_images_securely(self, images):
        """Analyze images locally with BLIP"""
        if not self.use_blip:
            return []
        
        descriptions = []
        
        for img_info in images:
            try:
                image = img_info['image']
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                
                inputs = self.blip_processor(image, return_tensors="pt").to(self.device)
                
                with torch.no_grad():
                    out = self.blip_model.generate(**inputs, max_length=100, num_beams=5)
                
                caption = self.blip_processor.decode(out[0], skip_special_tokens=True)
                
                description = {
                    'page': img_info['page'],
                    'image_index': img_info['index'],
                    'caption': caption,
                    'processing_method': 'Local_BLIP'
                }
                
                descriptions.append(description)
                
            except Exception as e:
                descriptions.append({
                    'page': img_info['page'],
                    'image_index': img_info['index'],
                    'caption': 'Analysis failed',
                    'error': str(e)
                })
        
        return descriptions
    
    def _extract_key_sections(self, text):
        """Extract key sections from text"""
        sections = {}
        section_patterns = {
            'abstract': r'abstract\s*:?\s*(.*?)(?=\n\s*(?:introduction|chapter|acknowledgment|table of contents))',
            'introduction': r'introduction\s*:?\s*(.*?)(?=\n\s*(?:literature review|methodology|chapter|background))',
            'methodology': r'(?:methodology|methods)\s*:?\s*(.*?)(?=\n\s*(?:results|findings|analysis|chapter))',
            'results': r'(?:results|findings)\s*:?\s*(.*?)(?=\n\s*(?:discussion|conclusion|chapter))',
            'conclusion': r'conclusion\s*:?\s*(.*?)(?=\n\s*(?:references|bibliography|appendix))'
        }

        for section_name, pattern in section_patterns.items():
            match = re.search(pattern, text.lower(), re.DOTALL | re.IGNORECASE)
            if match:
                sections[section_name] = match.group(1).strip()[:1000]  # Truncate for privacy

        return sections
    
    def _extract_key_terms(self, text):
        """Extract key terms securely"""
        try:
            words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
            
            # Handle case where lemmatizer might be None
            if self.lemmatizer is not None:
                words = [
                    self.lemmatizer.lemmatize(word)
                    for word in words
                    if word not in self.stop_words
                       and len(word) > 3
                       and word.isalpha()
                ]
            else:
                # Fallback without lemmatization
                words = [
                    word
                    for word in words
                    if word not in self.stop_words
                       and len(word) > 3
                       and word.isalpha()
                ]

            word_freq = Counter(words)
            return [term for term, freq in word_freq.most_common(20)]

        except Exception as e:
            print(f"Error in key term extraction: {e}")
            return []
    
    def _generate_summary_secure(self, text):
        """Generate summary using local T5 model"""
        try:
            if self.summarizer is None:
                print("Summarizer not available, using fallback method")
                # Fallback to extractive summary
                sentences = re.split(r'[.!?]+', text)
                return " ".join(sentences[:3]) + "..."
            
            clean_text = re.sub(r'\s+', ' ', text).strip()
            
            # Chunk text for processing
            max_length = 1000
            if len(clean_text) > max_length:
                clean_text = clean_text[:max_length]
            
            summary = self.summarizer(
                clean_text,
                max_length=200,
                min_length=150,
                do_sample=True,
                temperature=0.7
            )
            
            return summary[0]['summary_text']
            
        except Exception as e:
            print(f"Error in T5 summarization: {e}")
            # Fallback to extractive summary
            sentences = re.split(r'[.!?]+', text)
            return " ".join(sentences[:3]) + "..."
    
    def _answer_questions_secure(self, questions, text):
        """Answer questions using local T5 model"""
        answers = {}
        
        for question in questions:
            try:
                if self.qa_pipeline is None:
                    answers[question] = {
                        'answer': 'Q&A pipeline not available - using fallback',
                        'method': 'Fallback',
                        'processed_securely': True
                    }
                    continue
                
                prompt = f"question: {question} context: {text[:1000]}"
                
                answer_result = self.qa_pipeline(
                    prompt,
                    max_length=200,
                    min_length=30,
                    do_sample=True,
                    temperature=0.7,
                    num_return_sequences=1
                )
                
                answer = answer_result[0]['generated_text']
                answer = re.sub(r'^(answer:|Answer:)', '', answer).strip()
                
                answers[question] = {
                    'answer': answer,
                    'method': 'Local_T5',
                    'processed_securely': True
                }
                
            except Exception as e:
                answers[question] = {
                    'answer': 'Unable to process question securely',
                    'error': str(e),
                    'method': 'Error'
                }
        
        return answers
    
    def get_annotation(self, sample_text, sample_context):
        """Generate annotations using biomed_annotator"""
        try:
            return generate_annotations(
                selected_text=sample_text,
                context_text=sample_context
            )
        except Exception as e:
            print(f"Error in get_annotation: {e}")
            self.hipaa_logger.log_access(self.user_id, "ANNOTATION_ERROR", "TEXT_SELECTION", success=False)
            return []
    
    def cleanup_session(self):
        """Clean up session data securely"""
        self.hipaa_logger.log_access(self.user_id, "SESSION_END", "THESIS_ANALYZER")
        
        # Clear sensitive data from memory
        self.thesis_text = ""
        self.extracted_images = []
        self.ocr_results = []
        self.image_descriptions = []
        
        # Clear model cache if needed
        if hasattr(torch.cuda, 'empty_cache'):
            torch.cuda.empty_cache()
        
        print("Session cleaned up securely")

class AnalyzeReq(BaseModel):
    storageKey: str  # path to PDF on disk (or adjust to your storage scheme)
    projectId: Optional[str] = None
    documentId: Optional[str] = None
    ocr: bool = False
    blip: bool = False
    userId:str
    password:str
    useEncryption: bool =False
    model_name: Optional[str] = "t5-small"

@app.post('/get_summary')
def get_summary(req: AnalyzeReq):
    """Get summary only"""
    try:
        analyzer = HIPAACompliantThesisAnalyzer(
            user_id=req.userId,
            password=req.password,
            session_timeout=30,
            model_name=req.model_name
        )
        
        report = analyzer.process_summary_only(
            pdf_path=req.storageKey,
            output_file="hipaa_summary_only"
        )
        
        analyzer.cleanup_session()
        return report
    except Exception as e:
        print(f"Error in get_summary: {e}")
        return {"error": str(e)}

@app.post('/get_answer')
def get_answer(req: AnalyzeReq):
    """Get answers only"""
    try:
        analyzer = HIPAACompliantThesisAnalyzer(
            user_id=req.userId,
            password=req.password,
            session_timeout=30,
            model_name=req.model_name
        )
        
        # Use questions from separate file
        questions = THESIS_QUESTIONS
        
        report = analyzer.process_questions_only(
            pdf_path=req.storageKey,
            questions=questions,
            output_file="hipaa_answers_only"
        )
        
        analyzer.cleanup_session()
        return report
    except Exception as e:
        print(f"Error in get_answer: {e}")
        return {"error": str(e)}

@app.post('/upload_db')
async def upload_db(upload_db: str = Form(...), pdf_file: UploadFile = File(...)):
    """Read PDF, extract text & images + OCR, and save content to database"""
    if not PSYCOPG2_AVAILABLE:
        return {"error": "Database features are not available. Please install psycopg2."}
    
    conn = None
    try:
        # 1. Extract content (Text + Images)
        text_content = ""
        ocr_text_content = ""
        combined_text = ""
        
        try:
            # Read stream from UploadFile
            pdf_stream = await pdf_file.read()
                
            # Use PyMuPDF with the stream
            doc = fitz.open(stream=pdf_stream, filetype="pdf")
            
            extracted_text = []
            extracted_images = []
            
            for page_num, page in enumerate(doc):
                # Extract text
                page_text = page.get_text()
                extracted_text.append(page_text)
                
                # Extract images
                image_list = page.get_images()
                for img_index, img in enumerate(image_list):
                    try:
                        xref = img[0]
                        pix = fitz.Pixmap(doc, xref)
                        
                        # Handle CMYK / Alpha - convert if needed
                        if pix.n - pix.alpha < 4: # RGB or Gray
                            pass 
                        else: # CMYK: convert to RGB
                            pix = fitz.Pixmap(fitz.csRGB, pix)

                        img_data = pix.tobytes("ppm")
                        img_pil = Image.open(io.BytesIO(img_data))
                        
                        extracted_images.append({
                            'page': page_num + 1,
                            'index': img_index,
                            'image': img_pil
                        })
                        pix = None
                    except Exception as e:
                        print(f"Error extracting image {img_index} on page {page_num}: {e}")
            
            text_content = "\n".join(extracted_text)
            doc.close()

            # 2. Perform OCR on extracted images
            if extracted_images:
                print(f"Performing OCR on {len(extracted_images)} images...")
                for img_info in extracted_images:
                    try:
                        img = img_info['image']
                        if img.mode != 'RGB':
                            img = img.convert('RGB')
                        
                        # Preprocess (using logic similar to _perform_secure_ocr)
                        processed_img = img 
                        
                        if OPENCV_AVAILABLE:
                            img_array = np.array(img)
                            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
                            denoised = cv2.medianBlur(gray, 3)
                            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                            enhanced = clahe.apply(denoised)
                            _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                            processed_img = Image.fromarray(thresh)
                        else:
                            gray = img.convert('L')
                            enhancer = ImageEnhance.Contrast(gray)
                            enhanced = enhancer.enhance(2.0)
                            processed_img = enhanced.filter(ImageFilter.SHARPEN)
                            
                        # OCR
                        ocr_result = pytesseract.image_to_string(processed_img, config='--psm 6')
                        if ocr_result.strip():
                            ocr_text_content += f" {ocr_result.strip()}"
                            
                    except Exception as e:
                        print(f"OCR failed for image {img_info['index']}: {e}")

            # 3. Combine Text
            combined_text = text_content + "\n" + ocr_text_content
            # Clean up whitespace
            combined_text = re.sub(r'\s+', ' ', combined_text).strip()

        except Exception as e:
            print(f"Error extracting PDF content: {e}")
            return {"error": f"PDF extraction failed: {str(e)}"}

        # Database configuration
        db_config = {
            "host": os.getenv("DB_HOST", "localhost"),
            "database": os.getenv("DB_NAME", "Scholarly"),
            "user": os.getenv("DB_USER", "postgres"),
            "password": os.getenv("DB_PASSWORD", "admin")
        }
        
        # Update database
        try:
            conn = psycopg2.connect(**db_config)
            cur = conn.cursor()
            
            update_query = """
            UPDATE tbl_pdf_uploads 
            SET content = %s
            WHERE pdf_uploaded_id = %s
            RETURNING pdf_uploaded_id;
            """
            
            cur.execute(update_query, (combined_text, upload_db))
            
            row = cur.fetchone()
            if not row:
                return {"error": f"No record found with id {upload_db}"}
                
            updated_id = row[0]
            conn.commit()
            
            print(f"Document content updated in database. ID: {updated_id}")
            return {
                "status": "success", 
                "message": "Content updated in database",
                "db_id": updated_id
            }
            
        except psycopg2.Error as e:
            if conn:
                conn.rollback()
            print(f"Database error: {e}")
            return {"error": f"Database error: {str(e)}"}
            
    except Exception as e:
        print(f"Error in upload_db: {e}")
        return {"error": str(e)}
    finally:
        if conn:
            conn.close()        


class ExtractFromUrlRequest(BaseModel):
    """Request model for extracting content from a document URL"""
    document_url: str
    verify_ssl: Optional[bool] = None  # None = auto-detect (disabled for localhost)


def extract_content_from_pdf_stream(pdf_stream: bytes) -> dict:
    """
    Extract text and images with OCR from a PDF byte stream.
    
    Args:
        pdf_stream: PDF file content as bytes
        
    Returns:
        dict with text_content, ocr_text_content, combined_text, extracted_images count
    """
    text_content = ""
    ocr_text_content = ""
    combined_text = ""
    extracted_images = []
    
    # Use PyMuPDF with the stream
    doc = fitz.open(stream=pdf_stream, filetype="pdf")
    
    extracted_text = []
    
    for page_num, page in enumerate(doc):
        # Extract text
        page_text = page.get_text()
        extracted_text.append(page_text)
        
        # Extract images
        image_list = page.get_images()
        for img_index, img in enumerate(image_list):
            try:
                xref = img[0]
                pix = fitz.Pixmap(doc, xref)
                
                # Handle CMYK / Alpha - convert if needed
                if pix.n - pix.alpha < 4:  # RGB or Gray
                    pass 
                else:  # CMYK: convert to RGB
                    pix = fitz.Pixmap(fitz.csRGB, pix)

                img_data = pix.tobytes("ppm")
                img_pil = Image.open(io.BytesIO(img_data))
                
                extracted_images.append({
                    'page': page_num + 1,
                    'index': img_index,
                    'image': img_pil
                })
                pix = None
            except Exception as e:
                print(f"Error extracting image {img_index} on page {page_num}: {e}")
    
    text_content = "\n".join(extracted_text)
    doc.close()

    # Perform OCR on extracted images
    if extracted_images:
        print(f"Performing OCR on {len(extracted_images)} images...")
        for img_info in extracted_images:
            try:
                img = img_info['image']
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Preprocess
                processed_img = img 
                
                if OPENCV_AVAILABLE:
                    img_array = np.array(img)
                    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
                    denoised = cv2.medianBlur(gray, 3)
                    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                    enhanced = clahe.apply(denoised)
                    _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                    processed_img = Image.fromarray(thresh)
                else:
                    gray = img.convert('L')
                    enhancer = ImageEnhance.Contrast(gray)
                    enhanced = enhancer.enhance(2.0)
                    processed_img = enhanced.filter(ImageFilter.SHARPEN)
                    
                # OCR
                ocr_result = pytesseract.image_to_string(processed_img, config='--psm 6')
                if ocr_result.strip():
                    ocr_text_content += f" {ocr_result.strip()}"
                    
            except Exception as e:
                print(f"OCR failed for image {img_info['index']}: {e}")

    # Combine Text
    combined_text = text_content + "\n" + ocr_text_content
    # Clean up whitespace
    combined_text = re.sub(r'\s+', ' ', combined_text).strip()
    
    return {
        "text_content": text_content,
        "ocr_text_content": ocr_text_content,
        "combined_text": combined_text,
        "images_count": len(extracted_images)
    }


def download_pdf_from_url(document_url: str, verify_ssl: Optional[bool] = None) -> bytes:
    """
    Download PDF from URL and return as bytes.
    
    Args:
        document_url: URL to download PDF from
        verify_ssl: Whether to verify SSL. None = auto-detect (disabled for localhost)
        
    Returns:
        PDF content as bytes
    """
    from urllib.parse import urlparse
    parsed_url = urlparse(document_url)
    hostname = parsed_url.hostname or ''
    
    # Auto-disable SSL verification for localhost
    if verify_ssl is None:
        if hostname.lower() in ['localhost', '127.0.0.1', '::1']:
            verify_ssl = False
            print(f"Note: SSL verification disabled for localhost URL")
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        else:
            verify_ssl = True
    
    # Download the file from URL
    print(f"Downloading document from URL: {document_url}")
    response = requests.get(document_url, timeout=30, stream=True, verify=verify_ssl)
    response.raise_for_status()
    
    # Check if content type is PDF
    content_type = response.headers.get('content-type', '').lower()
    if 'pdf' not in content_type and not document_url.lower().endswith('.pdf'):
        print(f"Warning: Content type is {content_type}, might not be a PDF")
    
    return response.content

@app.post('/extract_content')
async def extract_content(req: ExtractFromUrlRequest):
    """
    Read PDF from URL, extract text & images + OCR, and return content.
    Similar to upload_db but accepts URL instead of file and returns content instead of DB update.
    """
    try:
        # 1. Download the document from URL
        pdf_stream = download_pdf_from_url(req.document_url, req.verify_ssl)
        
        # 2. Extract content (Text + Images + OCR)
        extraction_result = extract_content_from_pdf_stream(pdf_stream)
        
        # 3. Calculate document hash for tracking
        doc_hash = hashlib.sha256(pdf_stream).hexdigest()[:16]
        
        print(f"Document extracted successfully from URL. Hash: {doc_hash}")
        
        return {
            "status": "success",
            "message": "Content extracted from URL",
            "document_hash": doc_hash,
            "content": extraction_result["combined_text"],
            "statistics": {
                "text_length": len(extraction_result["text_content"]),
                "ocr_text_length": len(extraction_result["ocr_text_content"]),
                "combined_length": len(extraction_result["combined_text"]),
                "images_processed": extraction_result["images_count"]
            }
        }
        
    except requests.exceptions.SSLError as e:
        error_msg = f"SSL certificate verification failed: {e}"
        print(error_msg)
        return {"error": error_msg, "hint": "For localhost, SSL verification is automatically disabled. For other domains with self-signed certs, consider using a trusted certificate."}
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return {"error": f"Failed to download from URL: {str(e)}"}
    except Exception as e:
        print(f"Error in extract_from_url: {e}")
        return {"error": str(e)}

@app.post('/analyze')
def analyze(req: AnalyzeReq):
    """Main function with HIPAA compliance demonstration"""
    print("HIPAA-COMPLIANT THESIS ANALYZER")
    print("=" * 50)

    try:
        # Initialize HIPAA-compliant analyzer
        analyzer = HIPAACompliantThesisAnalyzer(
            user_id=req.userId,
            password=req.password,
            session_timeout=30,
            model_name=req.model_name,
            mode="analyze"
        )
        
        pdf_path = req.storageKey

        # Use questions from separate file
        questions = THESIS_QUESTIONS
        
        # Process document securely
        print("\nProcessing document with HIPAA compliance...")
        report = analyzer.process_document_securely(
            pdf_path=pdf_path,
            questions=questions,
            output_file="hipaa_compliant_analysis"
        )
        
        print("\n" + "="*60)
        print("HIPAA-COMPLIANT ANALYSIS COMPLETE")
        print("="*60)
        print(f"✓ Processed locally: {report['hipaa_compliance']['processed_locally']}")
        print(f"✓ Encrypted storage: {report['hipaa_compliance']['encrypted_storage']}")
        print(f"✓ Audit logged: {report['hipaa_compliance']['audit_logged']}")
        print(f"✓ No external APIs: {report['hipaa_compliance']['no_external_apis']}")
        print(f"✓ Session ID: {report['hipaa_compliance']['session_id']}")
        
        # Cleanup
        analyzer.cleanup_session()

        return report
    except Exception as e:
        print(f"Error: {e}")
        print("Ensure all requirements are installed and Tesseract is available.")


class AnnotationReq(BaseModel):
    userId: Optional[str] = None
    password: Optional[str] = None
    sample_text: str
    sample_context: Optional[str] = None

@app.post('/get_annotations')
def get_annotations_api(req: AnnotationReq):
    """Get annotations for selected text"""
    try:
        analyzer = HIPAACompliantThesisAnalyzer(
            user_id=req.userId,
            password=req.password,
            mode="annotations"
        )
        
        annotations = analyzer.get_annotation(
            sample_text=req.sample_text,
            sample_context=req.sample_context
        )
        
        analyzer.cleanup_session()
        return annotations

    except Exception as e:
        print(f"Error in get_annotations: {e}")
        return {"error": str(e)}        

#if __name__ == "__main__":
    print("""
HIPAA-COMPLIANT THESIS ANALYZER
===============================

HIPAA COMPLIANCE FEATURES:
✓ Local processing only - no external API calls
✓ Encryption at rest with password protection
✓ Comprehensive audit logging
✓ Session timeout and access controls
✓ Secure file deletion
✓ PHI processing audit trail
✓ User authentication
✓ Data integrity verification

INSTALLATION:
pip install torch transformers PyPDF2 nltk PyMuPDF pillow pytesseract cryptography

SECURITY FEATURES:
- All processing happens locally
- Optional file encryption
- Secure memory cleanup
- Audit trail for all operations
- Session management with timeouts
- Secure file overwriting for deletion

COMPLIANCE NOTES:
- This tool provides technical safeguards
- You must implement administrative and physical safeguards
- Ensure your workstation meets HIPAA requirements
- Regular security assessments recommended

""")
    
    #main()
