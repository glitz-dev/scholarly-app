FROM python:3.11-slim

WORKDIR /app
COPY . /app

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 7860

#CMD ["python", "hipaathesis.py"]
CMD ["uvicorn", "hipaathesis:app", "--host", "0.0.0.0", "--port", "7860"]