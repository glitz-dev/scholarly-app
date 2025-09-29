import PyPDF2
import re
from collections import Counter
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import string
from datetime import datetime
import json
import torch
from transformers import T5ForConditionalGeneration, T5Tokenizer, pipeline
import warnings

warnings.filterwarnings('ignore')


# Download required NLTK data with improved error handling
def download_nltk_resources():
    """Download required NLTK resources with proper error handling"""
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
            print(f"✓ {resource_name} already available")
        except LookupError:
            print(f"Downloading {resource_name}...")
            try:
                nltk.download(resource_name, quiet=False)
                print(f"✓ {resource_name} downloaded successfully")
            except Exception as e:
                print(f"Warning: Failed to download {resource_name}: {e}")
                continue


# Download NLTK resources
print("Checking and downloading required NLTK resources...")
download_nltk_resources()


class ThesisAnalyzer:
    def __init__(self):
        # Initialize NLTK components with error handling
        try:
            self.lemmatizer = WordNetLemmatizer()
            self.stop_words = set(stopwords.words('english'))
        except LookupError as e:
            print(f"NLTK resource error: {e}")
            print("Attempting to download missing resources...")
            download_nltk_resources()
            self.lemmatizer = WordNetLemmatizer()
            self.stop_words = set(stopwords.words('english'))

        self.thesis_text = ""
        self.sentences = []
        self.key_terms = []

        # Initialize T5 model and tokenizer
        print("Loading T5-small model and tokenizer...")
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")

        # Load T5 model for text generation
        self.model_name = "t5-small"
        self.tokenizer = T5Tokenizer.from_pretrained(self.model_name)
        self.model = T5ForConditionalGeneration.from_pretrained(self.model_name)
        self.model.to(self.device)

        # Initialize summarization pipeline
        self.summarizer = pipeline(
            "summarization",
            model=self.model_name,
            tokenizer=self.model_name,
            device=0 if torch.cuda.is_available() else -1,
            max_length=200,
            min_length=150,
            do_sample=True,
            temperature=0.7
        )

        # Initialize question answering pipeline
        self.qa_pipeline = pipeline(
            "text2text-generation",
            model=self.model_name,
            tokenizer=self.model_name,
            device=0 if torch.cuda.is_available() else -1,
            max_length=512,
            do_sample=True,
            temperature=0.7
        )

        print("T5 model loaded successfully!")

    def extract_text_from_pdf(self, pdf_path):
        """Extract text content from PDF file"""
        try:
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = ""

                for page_num, page in enumerate(reader.pages):
                    try:
                        text += page.extract_text() + "\n"
                    except Exception as e:
                        print(f"Error extracting text from page {page_num + 1}: {e}")
                        continue

                self.thesis_text = text
                return text

        except Exception as e:
            print(f"Error reading PDF file: {e}")
            return None

    def preprocess_text(self, text):
        """Clean and preprocess the text"""
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text)
        # Remove page numbers and headers/footers (basic cleaning)
        text = re.sub(r'\n\d+\n', ' ', text)
        # Remove excessive line breaks
        text = re.sub(r'\n+', ' ', text)
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s\.\,\;\:\!\?\-\(\)]', ' ', text)

        return text.strip()

    def chunk_text(self, text, max_chunk_size=1000):
        """Split text into chunks for processing with T5"""
        try:
            sentences = sent_tokenize(text)
        except LookupError:
            print("NLTK punkt tokenizer not found. Using basic sentence splitting...")
            # Fallback to basic sentence splitting
            sentences = re.split(r'[.!?]+', text)
            sentences = [s.strip() for s in sentences if s.strip()]

        chunks = []
        current_chunk = ""

        for sentence in sentences:
            if len(current_chunk) + len(sentence) <= max_chunk_size:
                current_chunk += sentence + " "
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + " "

        if current_chunk:
            chunks.append(current_chunk.strip())

        return chunks

    def extract_key_sections(self, text):
        """Extract key sections from the thesis"""
        sections = {}

        # Common thesis section patterns
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
                sections[section_name] = match.group(1).strip()[:2000]  # Increased limit

        return sections

    def extract_key_terms(self, text, num_terms=20):
        """Extract key terms from the thesis using T5"""
        try:
            # Traditional key term extraction with error handling
            try:
                words = word_tokenize(text.lower())
            except LookupError:
                print("NLTK tokenizer not available. Using basic word splitting...")
                words = re.findall(r'\b[a-zA-Z]+\b', text.lower())

            words = [
                self.lemmatizer.lemmatize(word)
                for word in words
                if word not in self.stop_words
                   and word not in string.punctuation
                   and len(word) > 3
                   and word.isalpha()
            ]

            word_freq = Counter(words)
            traditional_terms = [term for term, freq in word_freq.most_common(num_terms)]

            # Enhanced key term extraction using T5
            try:
                # Create a prompt for key term extraction
                prompt = f"summarize: Extract key research terms from this academic text: {text[:1000]}"

                # Use T5 to generate key terms
                inputs = self.tokenizer.encode(prompt, return_tensors='pt', max_length=512, truncation=True)
                inputs = inputs.to(self.device)

                with torch.no_grad():
                    outputs = self.model.generate(
                        inputs,
                        max_length=100,
                        num_return_sequences=1,
                        temperature=0.7,
                        do_sample=True,
                        pad_token_id=self.tokenizer.eos_token_id
                    )

                t5_terms = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
                t5_terms = [term.strip() for term in t5_terms.split(',') if term.strip()]

                # Combine traditional and T5-generated terms
                self.key_terms = list(set(traditional_terms[:15] + t5_terms[:10]))[:20]

            except Exception as e:
                print(f"Error in T5 key term extraction: {e}")
                self.key_terms = traditional_terms

        except Exception as e:
            print(f"Error in key term extraction: {e}")
            # Very basic fallback
            words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
            word_freq = Counter(words)
            self.key_terms = [term for term, freq in word_freq.most_common(20)]

        return self.key_terms

    def generate_summary_with_t5(self, text):
        """Generate summary using T5 model"""
        try:
            # Preprocess and chunk the text
            clean_text = self.preprocess_text(text)
            chunks = self.chunk_text(clean_text, max_chunk_size=1000)

            print(f"Processing {len(chunks)} text chunks for summarization...")

            # Generate summaries for each chunk
            chunk_summaries = []
            for i, chunk in enumerate(chunks[:5]):  # Limit to first 5 chunks
                try:
                    print(f"Summarizing chunk {i + 1}/{min(len(chunks), 5)}...")

                    # Use the summarization pipeline
                    summary = self.summarizer(
                        chunk,
                        max_length=150,
                        min_length=50,
                        do_sample=True,
                        temperature=0.7
                    )

                    chunk_summaries.append(summary[0]['summary_text'])

                except Exception as e:
                    print(f"Error summarizing chunk {i + 1}: {e}")
                    continue

            # Combine chunk summaries
            combined_summary = " ".join(chunk_summaries)

            # Generate final summary
            if len(combined_summary) > 500:
                try:
                    final_summary = self.summarizer(
                        combined_summary,
                        max_length=200,
                        min_length=150,
                        do_sample=True,
                        temperature=0.7
                    )
                    return final_summary[0]['summary_text']
                except:
                    return combined_summary[:800] + "..."
            else:
                return combined_summary

        except Exception as e:
            print(f"Error in T5 summarization: {e}")
            return self.fallback_summary(text)

    def fallback_summary(self, text):
        """Fallback summary method if T5 fails"""
        try:
            sentences = sent_tokenize(self.preprocess_text(text))
        except LookupError:
            # Basic sentence splitting fallback
            sentences = re.split(r'[.!?]+', self.preprocess_text(text))
            sentences = [s.strip() for s in sentences if s.strip()]

        key_terms = self.extract_key_terms(text)

        # Score sentences based on key term frequency
        sentence_scores = {}
        for sentence in sentences:
            try:
                words = word_tokenize(sentence.lower())
            except LookupError:
                words = re.findall(r'\b[a-zA-Z]+\b', sentence.lower())

            score = sum(1 for word in words if word in key_terms)
            sentence_scores[sentence] = score

        # Select top sentences
        top_sentences = sorted(sentence_scores.items(), key=lambda x: x[1], reverse=True)

        summary_text = ""
        word_count = 0
        for sentence, score in top_sentences:
            if word_count >= 180:
                break
            if len(sentence) > 20:
                summary_text += sentence + " "
                word_count += len(sentence.split())

        return summary_text.strip()

    def answer_questions_with_t5(self, questions):
        """Answer questions using T5 model"""
        if not self.thesis_text:
            return "No thesis text loaded. Please extract text first."

        answers = {}
        clean_text = self.preprocess_text(self.thesis_text)

        # Limit text length for processing
        text_chunks = self.chunk_text(clean_text, max_chunk_size=1500)

        for question in questions:
            print(f"Processing question: {question[:50]}...")

            try:
                # Find the most relevant chunk for this question
                best_chunk = ""
                best_score = 0

                try:
                    question_words = set(word_tokenize(question.lower()))
                except LookupError:
                    question_words = set(re.findall(r'\b[a-zA-Z]+\b', question.lower()))

                for chunk in text_chunks[:3]:  # Process first 3 chunks
                    try:
                        chunk_words = set(word_tokenize(chunk.lower()))
                    except LookupError:
                        chunk_words = set(re.findall(r'\b[a-zA-Z]+\b', chunk.lower()))

                    overlap = len(question_words.intersection(chunk_words))
                    if overlap > best_score:
                        best_score = overlap
                        best_chunk = chunk

                # Create T5 prompt for question answering
                prompt = f"question: {question} context: {best_chunk[:1000]}"

                # Generate answer using T5
                answer_result = self.qa_pipeline(
                    prompt,
                    max_length=200,
                    min_length=30,
                    do_sample=True,
                    temperature=0.7,
                    num_return_sequences=1
                )

                answer = answer_result[0]['generated_text']

                # Clean up the answer
                answer = re.sub(r'^(answer:|Answer:)', '', answer).strip()

                answers[question] = {
                    'answer': answer,
                    'confidence': min(best_score / len(question_words), 1.0) if question_words else 0.5,
                    'method': 'T5-generated',
                    'chunk_used': len(best_chunk) > 0
                }

            except Exception as e:
                print(f"Error processing question with T5: {e}")
                # Fallback to traditional method
                answers[question] = self.fallback_answer(question, clean_text)

        return answers

    def fallback_answer(self, question, text):
        """Fallback answer method if T5 fails"""
        try:
            sentences = sent_tokenize(text)
        except LookupError:
            sentences = re.split(r'[.!?]+', text)
            sentences = [s.strip() for s in sentences if s.strip()]

        try:
            question_words = [
                word.lower() for word in word_tokenize(question)
                if word.lower() not in self.stop_words and word.isalpha()
            ]
        except LookupError:
            question_words = [
                word.lower() for word in re.findall(r'\b[a-zA-Z]+\b', question)
                if word.lower() not in self.stop_words and len(word) > 2
            ]

        relevant_sentences = []
        for sentence in sentences:
            sentence_lower = sentence.lower()
            relevance_score = sum(1 for word in question_words if word in sentence_lower)

            if relevance_score > 0:
                relevant_sentences.append((sentence, relevance_score))

        relevant_sentences.sort(key=lambda x: x[1], reverse=True)

        if relevant_sentences:
            answer_text = " ".join([s[0].strip() for s in relevant_sentences[:2]])
            return {
                'answer': answer_text,
                'confidence': min(relevant_sentences[0][1] / len(question_words), 1.0),
                'method': 'Traditional extraction',
                'chunk_used': True
            }
        else:
            return {
                'answer': "No relevant information found in the thesis text.",
                'confidence': 0.0,
                'method': 'No match',
                'chunk_used': False
            }

    def generate_report(self, pdf_path, questions, output_file=None):
        """Generate a complete analysis report using T5"""
        print("Starting advanced thesis analysis with T5-small...")

        # Extract text from PDF
        text = self.extract_text_from_pdf(pdf_path)
        if not text:
            return "Failed to extract text from PDF."

        print(f"Extracted {len(text)} characters from PDF.")

        # Extract key sections and terms
        print("Extracting key sections and terms...")
        sections = self.extract_key_sections(text)
        key_terms = self.extract_key_terms(text)

        # Generate summary using T5
        print("Generating T5-powered summary...")
        summary = self.generate_summary_with_t5(text)

        # Answer questions using T5
        print("Answering questions with T5...")
        question_answers = self.answer_questions_with_t5(questions)

        # Compile report
        report = f"""
{'=' * 70}
ADVANCED THESIS ANALYSIS REPORT (T5-Small Enhanced)
{'=' * 70}

Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
Document: {pdf_path}
Model: T5-Small (Hugging Face Transformers)
Device: {str(self.device)}

{'=' * 70}
THESIS SUMMARY (AI-Generated)
{'=' * 70}

{summary}

Key Terms Identified: {', '.join(key_terms[:15])}

Sections Found: {', '.join(sections.keys())}

{'=' * 70}
QUESTION RESPONSES (T5-Enhanced)
{'=' * 70}

"""

        for i, (question, response) in enumerate(question_answers.items(), 1):
            report += f"""
Question {i}: {question}

Answer: {response['answer']}

Confidence Level: {response['confidence']:.2f}
Generation Method: {response['method']}
Context Used: {'Yes' if response['chunk_used'] else 'No'}

{'-' * 50}
"""

        report += f"""

{'=' * 70}
ANALYSIS STATISTICS
{'=' * 70}

Total Characters: {len(text):,}
Total Sentences: {len(sent_tokenize(text)):,}
Key Terms Identified: {len(key_terms)}
Questions Processed: {len(questions)}
Sections Identified: {len(sections)}
Model Performance: T5-Small with {str(self.device).upper()} acceleration

{'=' * 70}
TECHNICAL DETAILS
{'=' * 70}

Model: {self.model_name}
Tokenizer: T5Tokenizer
Framework: Hugging Face Transformers
PyTorch Device: {str(self.device)}
Summarization Pipeline: Enabled
Question Answering: T5 Text-to-Text Generation

{'=' * 70}
"""

        # Save to file if specified
        if output_file:
            try:
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(report)
                print(f"Report saved to: {output_file}")
            except Exception as e:
                print(f"Error saving report: {e}")

        return report


def main():
    """Main function to demonstrate usage"""
    try:
        analyzer = ThesisAnalyzer()

        # Example usage
        pdf_path = "thesis.pdf"  # Replace with your PDF path

        # Enhanced questions for T5 processing
        sample_questions = [
            "What is the main objective of the research?",
            "What methodology was used in the study?",
            "What are the key findings or results?",
            "What conclusions did the authors draw?",
            "What are the limitations of the study?",
            "What motivated the researchers to conduct this study?",
            "How does this research relate to existing literature?",
            "What are the practical implications of the findings?",
            "What assumptions underlie the research?",
            "What statistical methods were used to analyze the data?",
            "How robust are the study’s findings?",
            "Are there any potential biases in the study design or data collection?",
            "How do the results compare with previous studies on the same topic?",
            "What are the potential future applications of this research?",
            "How could this research be expanded or built upon in future studies?",
            "What new questions have emerged as a result of this study?"
        ]

        # Generate report
        report = analyzer.generate_report(
            pdf_path=pdf_path,
            questions=sample_questions,
            output_file="t5_thesis_analysis_report.txt"
        )

        print("\nT5-ENHANCED ANALYSIS COMPLETE!")
        print("\nSample of generated report:")
        print("=" * 60)
        print(report[:1500] + "...")

    except FileNotFoundError:
        print(f"PDF file '{pdf_path}' not found. Please check the file path.")
    except Exception as e:
        print(f"An error occurred: {e}")
        print("Make sure you have installed the required packages:")
        print("pip install torch transformers PyPDF2 nltk")


if __name__ == "__main__":
    # Instructions for usage
    print("""
T5-ENHANCED THESIS ANALYZER - SETUP INSTRUCTIONS
=================================================

1. Install required packages:
   pip install torch transformers PyPDF2 nltk

2. First run will download T5-small model (~240MB)

3. Update the pdf_path variable with your thesis file path

4. The program will use GPU if available, CPU otherwise

5. Run the script to generate AI-enhanced analysis report

NEW FEATURES WITH T5-SMALL:
- Advanced text summarization using transformer models
- Intelligent question answering with context understanding
- Better key term extraction
- Enhanced natural language generation
- Confidence scoring for answers

The program will:
- Load T5-small model from Hugging Face
- Extract and preprocess text from PDF
- Generate AI-powered summaries (150-200 words)
- Answer questions using advanced NLP
- Save detailed report with technical metrics

""")

    main()