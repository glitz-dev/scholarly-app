
import json
import re
import httpx
from typing import Optional, List, Literal, Any, Dict
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

# --- 1. Schemas ---

QuestionCategory = Literal["Clinical", "Mechanism", "Evidence", "Methods", "Limitations", "NextStep"]

class GeneratedQuestion(BaseModel):
    category: QuestionCategory
    question: str
    evidence_quote: str

import os
from dotenv import load_dotenv

load_dotenv()

# --- 2. Configuration ---

def get_hf_token_from_cache() -> str:
    """Get HuggingFace token from local cache (from huggingface-cli login)"""
    try:
        from huggingface_hub import HfFolder
        token = HfFolder.get_token()
        if token:
            print("[DEBUG] Found HuggingFace token from local cache")
            return token
    except ImportError:
        print("[DEBUG] huggingface_hub not installed, cannot get token from cache")
    except Exception as e:
        print(f"[DEBUG] Could not get HF token from cache: {e}")
    return ""

class Settings:
    def __init__(self):
        # LLM Provider: 'ollama', 'openai_compat', or 'huggingface'
        self.llm_provider: str = os.getenv("LLM_PROVIDER", "huggingface")

        # Ollama settings
        self.ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_model: str = os.getenv("OLLAMA_MODEL", "llama3.2") #qwen2.5:3b-instruct, lama3.2
        self.ollama_timeout_s: int = int(os.getenv("OLLAMA_TIMEOUT_S", 300))

        # OpenAI Compat settings
        self.openai_compat_base_url: str = os.getenv("OPENAI_COMPAT_BASE_URL", "http://localhost:8080/v1")
        self.openai_compat_model: str = os.getenv("OPENAI_COMPAT_MODEL", "gpt-4o")
        self.openai_compat_api_key: str = os.getenv("OPENAI_COMPAT_API_KEY", "not-needed")
        self.openai_compat_timeout_s: int = int(os.getenv("OPENAI_COMPAT_TIMEOUT_S", 120))

        # HuggingFace Serverless Inference settings
        self.hf_model: str = os.getenv("HF_MODEL", "microsoft/Phi-3-mini-4k-instruct")
        # Try env var first, then fall back to local cache token
        self.hf_api_key: str = os.getenv("HF_API_KEY", "") or get_hf_token_from_cache()

        # Gen Settings
        self.max_output_questions: int = int(os.getenv("MAX_OUTPUT_QUESTIONS", 6))

settings = Settings()

# --- 3. Prompts ---

SYSTEM_PROMPT = (
    "You are a biomedical paper reading assistant. "
    "Only use the provided text. Do not add external facts. "
    "Every question MUST include an evidence_quote copied verbatim from the provided text."
)

def build_question_prompt(selected_text: str, context_text: str | None, section_title: str | None, page_start: int | None, page_end: int | None) -> str:
    meta = []
    if section_title:
        meta.append(f"Section: {section_title}")
    if page_start is not None:
        meta.append(f"Pages: {page_start}-{page_end or page_start}")
    meta_block = "\n".join(meta) if meta else "Section: Unknown"

    context = (context_text or "").strip()
    if not context:
        context = selected_text.strip()

    max_q = settings.max_output_questions

    return f"""Task: Generate good questions from this paper excerpt.

Excerpt metadata:
{meta_block}

Highlighted text:
{selected_text.strip()}

Context (use this for grounding; do not go beyond it):
{context}

Output STRICT JSON with this schema:
{{
  "questions": [
    {{
      "category": "Clinical|Mechanism|Evidence|Methods|Limitations|NextStep",
      "question": "...",
      "evidence_quote": "..."
    }}
  ]
}}

Rules:
- Output {max_q} questions.
- Questions must be specific and actionable.
- evidence_quote MUST be a verbatim substring from the Context text.
"""

# --- 4. LLM Clients ---

class LLMError(RuntimeError):
    pass

class BaseLLM:
    def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        raise NotImplementedError

class OllamaLLM(BaseLLM):
    def __init__(self, cfg: Settings):
        self.base_url = cfg.ollama_base_url.rstrip("/")
        self.model = cfg.ollama_model
        self.timeout = cfg.ollama_timeout_s

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=0.5, min=0.5, max=2))
    def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": user_prompt,
            "system": system_prompt,
            "format": "json",
            "stream": False,
            "options": {"temperature": 0.4, "top_p": 0.9, "num_predict": 700}
        }
        print(f"[DEBUG] Ollama request to {url} with model={self.model}")
        try:
            with httpx.Client(timeout=self.timeout) as client:
                r = client.post(url, json=payload)
                print(f"[DEBUG] Ollama response status: {r.status_code}")
                if r.status_code != 200:
                    print(f"[DEBUG] Ollama error response: {r.text}")
                r.raise_for_status()
                data = r.json()
                return data.get("response", "").strip()
        except httpx.TimeoutException as e:
            print(f"[DEBUG] Ollama timeout: {e}")
            raise LLMError(f"Ollama generate timed out after {self.timeout}s: {e}")
        except Exception as e:
            print(f"[DEBUG] Ollama exception type={type(e).__name__}: {e}")
            raise LLMError(f"Ollama generate failed: {e}")

class OpenAICompatLLM(BaseLLM):
    def __init__(self, cfg: Settings):
        self.base_url = cfg.openai_compat_base_url.rstrip("/")
        self.model = cfg.openai_compat_model
        self.api_key = cfg.openai_compat_api_key
        self.timeout = cfg.openai_compat_timeout_s

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=0.5, min=0.5, max=2))
    def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        url = f"{self.base_url}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self.api_key and self.api_key != "not-needed":
            headers["Authorization"] = f"Bearer {self.api_key}"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.4,
            "top_p": 0.9,
            "max_tokens": 900,
            "response_format": {"type": "json_object"}
        }
        try:
            with httpx.Client(timeout=self.timeout) as client:
                r = client.post(url, headers=headers, json=payload)
                r.raise_for_status()
                data = r.json()
                return (data["choices"][0]["message"]["content"] or "").strip()
        except Exception as e:
            raise LLMError(f"OpenAI-compat generate failed: {e}")

class HuggingFaceLLM(BaseLLM):
    """HuggingFace LLM using router.huggingface.co (OpenAI-compatible API format)"""
    
    def __init__(self, cfg: Settings):
        self.model = cfg.hf_model
        self.api_key = cfg.hf_api_key
        self.timeout = 120

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=0.5, min=0.5, max=2))
    def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        # HuggingFace router with OpenAI-compatible format (hosted on HuggingFace)
        url = "https://router.huggingface.co/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        print(f"[DEBUG] HuggingFace request to model: {self.model}")
        print(f"[DEBUG] API key present: {bool(self.api_key and self.api_key != 'your_huggingface_api_key_here')}")
        
        # OpenAI-compatible chat format (works with HuggingFace models)
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": 800,
            "temperature": 0.4
        }
        
        try:
            with httpx.Client(timeout=self.timeout) as client:
                r = client.post(url, headers=headers, json=payload)
                print(f"[DEBUG] HuggingFace response status: {r.status_code}")
                if r.status_code != 200:
                    print(f"[DEBUG] HuggingFace error response: {r.text}")
                r.raise_for_status()
                # OpenAI-compatible response format
                data = r.json()
                if "choices" in data and len(data["choices"]) > 0:
                    return data["choices"][0]["message"]["content"].strip()
                return ""
        except Exception as e:
            print(f"[DEBUG] HuggingFace exception: {type(e).__name__}: {e}")
            raise LLMError(f"HuggingFace generate failed: {e}")

def get_llm(cfg: Settings) -> BaseLLM:
    provider = (cfg.llm_provider or "").lower().strip()
    if provider == "ollama":
        return OllamaLLM(cfg)
    if provider == "openai_compat":
        return OpenAICompatLLM(cfg)
    if provider == "huggingface":
        return HuggingFaceLLM(cfg)
    raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")


# --- 5. Generation Logic ---

_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)

def _safe_extract_json(text: str) -> dict | None:
    if not text:
        return None
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    m = _JSON_RE.search(text)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return None
    return None

def generate_annotations(
    selected_text: str,
    context_text: str | None = None,
    section_title: str | None = None,
    page_start: int | None = None,
    page_end: int | None = None,
    config: Settings | None = None
) -> List[Dict[str, Any]]:
    """
    Main entrypoint: Generate questions for selected text using LLM only.
    Returns empty list if generation fails.
    """
    cfg = config or settings
    
    # 1. Setup
    llm = get_llm(cfg)
    user_prompt = build_question_prompt(selected_text, context_text, section_title, page_start, page_end)

    # 2. Generate
    questions = []
    try:
        raw = llm.generate_json(SYSTEM_PROMPT, user_prompt)
        parsed = _safe_extract_json(raw)
        
        if parsed and isinstance(parsed, dict) and isinstance(parsed.get("questions"), list):
            for q in parsed["questions"]:
                try:
                    # Validate using Pydantic
                    item = GeneratedQuestion(**q).model_dump()
                    questions.append(item)
                except Exception:
                    continue
                    
        # Limit to max questions
        questions = questions[:cfg.max_output_questions]
        
    except Exception as e:
        print(f"LLM Generation failed: {e}")
        # In 'only llm' mode, we do not fallback. We return empty or raise.
        # Returning empty list to be safe.
        return []

    return questions


# --- 6. CLI Test ---
if __name__ == "__main__":
    # Example usage
    sample_text = "BRCA1 mutations significantly increase the risk of developing breast cancer."
    sample_context = "In this study of 500 patients, we observed that BRCA1 mutations significantly increase the risk of developing breast cancer compared to controls."
    
    print("Generating annotations...")
    results = generate_annotations(
        selected_text=sample_text,
        context_text=sample_context,
        section_title="Abstract"
    )
    print(json.dumps(results, indent=2))
