import requests
import json

def test_upload_form_api(file_path):
    """
    Tests the /api/form/upload endpoint by sending a file.
    """
    url = "http://127.0.0.1:5000/api/form/upload"  # Update if your app runs on a different host/port

    try:
        with open(file_path, 'rb') as file:
            files = {'file': (file.name, file, 'application/pdf')}  # Adjust MIME type if needed
            response = requests.post(url, files=files)

        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
        
        return response.json()  # Parse JSON response

    except requests.exceptions.RequestException as e:
        return f"Request failed: {e}"
    except FileNotFoundError:
        return "File not found."
    except json.JSONDecodeError:
        return f"Failed to decode JSON. Response text: {response.text}"

# Example usage:
# 1. Save the provided app.py content to a file (e.g., app.py).
# 2. Create a dummy PDF file (e.g., test_form.pdf) with some blanks like _____ or [Name].
# 3. Replace 'test_form.pdf' with the actual path to your test PDF file.
if __name__ == '__main__':
    test_file_path = r'templates\NDA.pdf'
    result = test_upload_form_api(test_file_path)
    print(json.dumps(result, indent=2))
