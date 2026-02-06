import requests
import time
import json

class PubTatorAnnotator:
    SUBMIT_URL = "https://www.ncbi.nlm.nih.gov/research/pubtator-api/public/annotate/submit"
    RECEIVE_URL = "https://www.ncbi.nlm.nih.gov/research/pubtator-api/public/annotate/"

    def annotate_text(self, text):
        try:
            response = requests.post(self.SUBMIT_URL, json={"text": text})
            response.raise_for_status()
            submit_result = response.json()
            session_id = submit_result.get("session_id")

            if not session_id:
                print("No session ID returned.")
                return None

            print(f"Session ID: {session_id}. Waiting for processing...")
            time.sleep(5)  # allow server time to annotate

            return self._retrieve_annotations(session_id)

        except requests.exceptions.RequestException as e:
            print(f"Error submitting text: {e}")
            return None

    def _retrieve_annotations(self, session_id):
        try:
            result_url = f"{self.RECEIVE_URL}{session_id}"
            response = requests.get(result_url)
            response.raise_for_status()
            result = response.json()
            return result.get("annotations", [])

        except Exception as e:
            print(f"Error retrieving result: {e}")
            return None


if __name__ == "__main__":
    annotator = PubTatorAnnotator()
    text = "The p53 tumor suppressor gene is frequently mutated in human cancers."
    results = annotator.annotate_text(text)

    if results is not None:
        print(json.dumps(results, indent=2))
    else:
        print("No annotations found.")
