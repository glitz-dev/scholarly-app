import requests
import json

url = "http://localhost:8000/get_annotations"
payload = {
    "sample_text": "cancer",
    "sample_context": "cancer is common in nowadays, its better to diagnosis in early stages. Recovery will be faster"
}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, json=payload, timeout=120)
    print(f"Status Code: {response.status_code}")
    print("Response Content:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
