from datetime import datetime
from flask import Flask, request, jsonify, session, send_file
import os
import uuid
import tempfile
from flask_cors import CORS
from werkzeug.utils import secure_filename
import PyPDF2
import docx
import pytesseract
from PIL import Image
import io
import pandas as pd
import base64

from pymongo import MongoClient
from bson.objectid import ObjectId

import json
from docx import Document
import tempfile

from context_functions import fetch_legal_cases, fetch_news_articles, generate_summary

# MongoDB connection
mongo_client = MongoClient('mongodb://localhost:27017/')
db = mongo_client['IPD']
chat_sessions = db['chatsessions']

# Import the Gemini libraries
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from typing import List, Dict, Any

# Configure the API key
def configure_genai(api_key: str):
    """Configure the Gemini API with your API key."""
    genai.configure(api_key=api_key)

class GeminiFlashChat:
    """A class to interact with Gemini 2.0 Flash preserving context."""
    
    def __init__(self, api_key: str = None):
        """Initialize the GeminiFlashChat with optional API key."""
        if api_key:
            configure_genai(api_key)
        elif os.environ.get("GOOGLE_API_KEY"):
            configure_genai(os.environ.get("GOOGLE_API_KEY"))
        else:
            raise ValueError("API key must be provided or set as GOOGLE_API_KEY environment variable")
            
        # Initialize the model - using Gemini Pro Vision for image analysis
        self.text_model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config={
                "temperature": 0.7,
                "top_p": 0.9,
                "top_k": 40,
                "max_output_tokens": 2048,
            },
            safety_settings={
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }
        )
        
        # Initialize a multimodal model for image analysis
        self.vision_model = genai.GenerativeModel(
            model_name="gemini-2.0-pro-vision",
            generation_config={
                "temperature": 0.7,
                "top_p": 0.9,
                "top_k": 40,
                "max_output_tokens": 2048,
            },
            safety_settings={
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }
        )
        
        # Initialize chat history
        self.chat_session = self.text_model.start_chat(history=[])
        
    def send_message(self, message: str, image_data=None) -> str:
        """
        Send a message to Gemini and get a response while preserving context.
        
        Args:
            message: The user message to send to Gemini
            image_data: Optional image data for analysis
            
        Returns:
            The response text from Gemini
        """
        if image_data:
            # Use vision model for image analysis
            response = self.vision_model.generate_content([message, image_data])
            
            # Add message and response to chat history for context continuity
            self.chat_session.history.append({"role": "user", "parts": [{"text": message + " [Image was analyzed]"}]})
            self.chat_session.history.append({"role": "model", "parts": [{"text": response.text}]})
            
            return response.text
        else:
            # Use text-only model for regular messages
            response = self.chat_session.send_message(message)
            return response.text
    
    def get_chat_history(self) -> List[Dict[str, Any]]:
        """
        Get the full chat history.
        
        Returns:
            A list of messages in the chat history
        """
        return self.chat_session.history
    
    def reset_chat(self):
        """Reset the chat history and start a new session."""
        self.chat_session = self.text_model.start_chat(history=[])

# File processing functions
def extract_text_from_pdf(file_stream):
    """Extract text from a PDF file."""
    try:
        reader = PyPDF2.PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text if text.strip() else "[PDF contains no extractable text. Appears to be scanned or image-based.]"
    except Exception as e:
        return f"Error extracting text from PDF: {str(e)}"

def extract_text_from_docx(file_stream):
    """Extract text from a DOCX file."""
    try:
        doc = docx.Document(file_stream)
        text = ""
        for para in doc.paragraphs:
            text += para.text + "\n"
        return text
    except Exception as e:
        return f"Error extracting text from document: {str(e)}"

def extract_text_from_excel(file_stream):
    """Extract text from Excel file."""
    try:
        dfs = pd.read_excel(file_stream, sheet_name=None)
        text = ""
        for sheet_name, df in dfs.items():
            text += f"Sheet: {sheet_name}\n"
            text += df.to_string(index=False) + "\n\n"
        return text
    except Exception as e:
        return f"Error extracting text from spreadsheet: {str(e)}"

def extract_text_from_ppt(file_stream):
    """Extract basic info from PowerPoint files."""
    # Full PowerPoint parsing would require python-pptx library
    return "[PowerPoint file detected. Content extraction limited without additional processing.]"

def extract_text_from_txt(file_stream):
    """Extract text from a TXT file."""
    try:
        text = file_stream.read().decode('utf-8')
        return text
    except Exception as e:
        return f"Error extracting text from text file: {str(e)}"

def process_image(file_stream, analysis_mode="text_only"):
    """
    Process an image with different analysis modes.
    
    Args:
        file_stream: The image file stream
        analysis_mode: The type of analysis to perform:
            - "text_only": Extract only text (OCR)
            - "visual": Perform visual analysis without OCR
            - "full": Perform both text extraction and visual analysis
            
    Returns:
        A tuple of (extracted_text, image_data)
    """
    try:
        # Save a copy of the file as we'll need to rewind for different operations
        image_bytes = file_stream.read()
        file_stream.seek(0)  # Rewind
        
        # Load the image for processing
        image = Image.open(io.BytesIO(image_bytes))
        
        # Extract text via OCR if requested
        extracted_text = ""
        if analysis_mode in ["text_only", "full"]:
            try:
                extracted_text = pytesseract.image_to_string(image)
                if not extracted_text.strip():
                    extracted_text = "[No text detected in the image via OCR.]"
            except Exception as e:
                extracted_text = f"[OCR Error: {str(e)}]"
        
        # For visual analysis, we need to prepare the image data for Gemini
        image_data = None
        if analysis_mode in ["visual", "full"]:
            # Convert image to RGB if it's not already
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            # Create a buffer for the image
            image_buffer = io.BytesIO()
            image.save(image_buffer, format="JPEG")
            image_buffer.seek(0)
            
            # Prepare image data for Gemini
            image_bytes = image_buffer.getvalue()
            image_parts = [{"mime_type": "image/jpeg", "data": image_bytes}]
            image_data = image_parts[0]
        
        return extracted_text, image_data
        
    except Exception as e:
        return f"Error processing image: {str(e)}", None

def process_file(file, analysis_options=None):
    """
    Process a file based on its mime type and return extracted text and optional image data.
    
    Args:
        file: The file to process
        analysis_options: Dict with options for processing:
            - is_scanned: Boolean indicating if an image should be processed with OCR
            - analysis_mode: For images, the type of analysis to perform
            
    Returns:
        A tuple of (extracted_text, image_data)
    """
    if analysis_options is None:
        analysis_options = {}
    
    try:
        mime_type = file.content_type or ""
        filename = file.filename
        file_extension = os.path.splitext(filename)[1].lower()
        
        # Default options
        is_scanned = analysis_options.get('is_scanned', False)
        analysis_mode = analysis_options.get('analysis_mode', 'text_only')
        
        # PDF files
        if mime_type.endswith('/pdf') or file_extension == '.pdf':
            return extract_text_from_pdf(file), None
        
        # Image files
        elif mime_type.startswith('image/'):
            if is_scanned or analysis_mode != "text_only":
                return process_image(file, analysis_mode)
            else:
                return "[Image file. No analysis performed as no analysis mode was specified.]", None
        
        # Word documents
        elif 'word' in mime_type or 'document' in mime_type or file_extension in ['.docx', '.doc']:
            return extract_text_from_docx(file), None
        
        # Excel files
        elif 'excel' in mime_type or 'sheet' in mime_type or file_extension in ['.xlsx', '.xls']:
            return extract_text_from_excel(file), None
        
        # PowerPoint files
        elif 'powerpoint' in mime_type or 'presentation' in mime_type or file_extension in ['.pptx', '.ppt']:
            return extract_text_from_ppt(file), None
        
        # Plain text
        elif mime_type.startswith('text/') or file_extension in ['.txt', '.csv', '.json', '.md']:
            return extract_text_from_txt(file), None
        
        else:
            return f"[Unsupported file type: {mime_type or file_extension}]", None
            
    except Exception as e:
        return f"Error processing file {file.filename}: {str(e)}", None
    
import re

def format_response(response):
    # Break paragraph after periods
    formatted = re.sub(r'(?<!\n)\.\s+', '.\n\n', response)

    # Convert bullets to new lines
    formatted = re.sub(r'•', '\n•', formatted)
    formatted = re.sub(r'(?<!\n)- ', '\n- ', formatted)
    formatted = re.sub(r'(?<!\n)\d+\.', lambda m: '\n' + m.group(), formatted)

    # Optionally convert headings like "Links:" to bold
    formatted = re.sub(r'(Links:)', r'\n\n**\1**\n', formatted)

    return formatted

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "default-fallback-key")
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit uploads to 16MB

# Dictionary to store chat instances by session ID
chat_instances = {}

# Set your API key
API_KEY = os.environ.get("GOOGLE_API_KEY", "default-api-key")

@app.route('/api/chat', methods=['POST'])
def chat():
    # Check if request is multipart/form-data or application/json
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Get session ID from form data
        session_id = request.form.get('session_id')
        user_id = request.form.get('user_id')
        user_message = request.form.get('message', '')
        
        # Get the checkbox options
        fetch_cases = request.form.get('fetchCases', 'false').lower() == 'true'
        fetch_news = request.form.get('fetchNews', 'false').lower() == 'true'
        summarize = request.form.get('summarize', 'false').lower() == 'true'

        print(fetch_cases)
        print(fetch_news)
        print(summarize)

        # Process uploaded files
        files_content = []
        images_for_analysis = []
        
        # Process each file
        for key in request.files:
            file = request.files[key]
            if file and file.filename:
                # Get file options
                file_key_num = key.replace('file', '')
                is_scanned = request.form.get(f'isScanned{file_key_num}', 'false').lower() == 'true'
                analysis_mode = request.form.get(f'analysisMode{file_key_num}', 'text_only')
                
                # Process the file
                extracted_text, image_data = process_file(file, {
                    'is_scanned': is_scanned,
                    'analysis_mode': analysis_mode
                })
                
                # Add text content if available
                if extracted_text and isinstance(extracted_text, str):
                    files_content.append(f"Content from {file.filename}:\n{extracted_text}\n")
                
                # Store image data for visual analysis if available
                if image_data:
                    images_for_analysis.append((file.filename, image_data))
        
        # Combine user message with file text contents
        if files_content:
            combined_message = user_message + "\n\n" + "\n".join(files_content)
        else:
            combined_message = user_message
            
    else:
        # Handle regular JSON request
        session_id = request.json.get('session_id')
        user_id = request.json.get('user_id')
        combined_message = request.json.get('message', '')
        
        # Get the checkbox options from JSON
        fetch_cases = request.json.get('fetchCases', False)
        fetch_news = request.json.get('fetchNews', False)
        summarize = request.json.get('summarize', False)
        
        images_for_analysis = []
    
    # Create new session if needed
    if not session_id:
        session_id = str(uuid.uuid4())
    
    # Initialize chat instance for this session if not exists
    if session_id not in chat_instances:
        try:
            chat_instances[session_id] = GeminiFlashChat(api_key=API_KEY)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    if not combined_message and not images_for_analysis:
        return jsonify({'error': 'No message or image provided'}), 400
    
    # Process additional context data based on checkboxes
    additional_context = {}
    context_enriched_message = combined_message
    
    # Fetch legal cases if requested
    if fetch_cases:
        try:
            cases_data = fetch_legal_cases(combined_message)
            print(cases_data)
            additional_context['legal_cases'] = cases_data
            
            # Important: Add a prefix so the model understands this is supplementary information
            context_enriched_message += f"\n\n[SUPPLEMENTARY LEGAL CONTEXT]\n{cases_data}"
        except Exception as e:
            additional_context['legal_cases_error'] = str(e)
    
    # Fetch news articles if requested
    if fetch_news:
        try:
            news_data = fetch_news_articles(combined_message)
            print(news_data)
            additional_context['news_articles'] = news_data
            
            # Important: Add a prefix so the model understands this is supplementary information
            context_enriched_message += f"\n\n[SUPPLEMENTARY NEWS CONTEXT]\n{news_data}"
        except Exception as e:
            additional_context['news_articles_error'] = str(e)
    
    # Send message to Gemini
    try:
        gemini_chat = chat_instances[session_id]
        
        # Create system prompt to instruct the model how to use the context
        system_instruction = ""
        if fetch_cases or fetch_news:
            system_instruction = (
                "You are a helpful assistant designed to provide information based on the user's query. "
                "I've provided supplementary context, including legal cases and news articles, which you should incorporate into your response where relevant. "
                "Maintain a natural conversational tone, but prioritize accuracy and relevance. "
                "Do not explicitly mention you are using additional context unless directly asked. "
                "Always include links and when including links, format them under 'Links:' heading, listing each link on a new line."
                "Ensure no asterisks or special characters are visible in the final response. "
                "If a file has been uploaded, analyze its content and integrate it into your answer. "
                "Prioritize information from the uploaded file."
            )
            
            # Prepend system instruction to the message
            context_enriched_message = f"{system_instruction}\n\n{context_enriched_message}"
        
        # Handle image analysis separately if we have images
        if images_for_analysis:
            # Currently we'll just use the first image for analysis
            # In a more advanced version, you could handle multiple images
            if len(images_for_analysis) > 0:
                image_filename, image_data = images_for_analysis[0]
                
                # Create prompt for image analysis with context-enriched message
                if context_enriched_message:
                    analysis_prompt = f"{context_enriched_message}\n\nPlease analyze the image: {image_filename}"
                else:
                    analysis_prompt = f"Please analyze this image: {image_filename}"
                
                response = gemini_chat.send_message(analysis_prompt, image_data)
            else:
                response = gemini_chat.send_message(context_enriched_message)
        else:
            # Use the context-enriched message instead of the original
            response = gemini_chat.send_message(context_enriched_message)
            response = format_response(response)
        
        # Generate summary if requested - AFTER getting the model's response
        if summarize:
            try:
                summary_text = generate_summary(response)
                additional_context['summary'] = summary_text
                
                # Append the summary to the response with clear formatting
                response += f"\n\n{summary_text}"
            except Exception as e:
                additional_context['summary_error'] = str(e)
        
        # Format chat history
        formatted_history = []
        for i, message in enumerate(gemini_chat.get_chat_history()):
            role = "user" if i % 2 == 0 else "gemini"
            try:
                if hasattr(message, "parts"):
                    text = message.parts[0].text
                else:
                    text = str(message)
                formatted_history.append({"role": role, "content": text})
            except Exception as e:
                formatted_history.append({"role": role, "content": f"[Content format error: {str(e)}]"})
        
        if user_id:
            # Check if this session already exists
            existing_session = chat_sessions.find_one({'sessionId': session_id})
            if existing_session:
                # Update existing session
                chat_sessions.update_one(
                    {'sessionId': session_id},
                    {
                        '$set': {
                            'lastMessage': combined_message[:30] + ('...' if len(combined_message) > 30 else ''),
                            'timestamp': datetime.now()  # Use datetime.now() instead of datetime.datetime.now()
                        }
                    }
                )
            else:
                # Create new session entry
                chat_title = combined_message[:20] + ('...' if len(combined_message) > 20 else '')
                chat_sessions.insert_one({
                    'userId': user_id,
                    'sessionId': session_id,
                    'title': chat_title,
                    'lastMessage': combined_message[:30] + ('...' if len(combined_message) > 30 else ''),
                    'timestamp': datetime.now()  # Use datetime.now() instead of datetime.datetime.now()
                })

        # Return the response with additional context data
        return jsonify({
            'session_id': session_id,
            'response': response,
            'history': formatted_history,
            'additional_context': additional_context  # Include the additional context in the response
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze-image', methods=['POST'])
def analyze_image():
    """Endpoint specifically for image analysis."""
    if not request.content_type or 'multipart/form-data' not in request.content_type:
        return jsonify({'error': 'Request must be multipart/form-data'}), 400
    
    # Get session ID and analysis parameters
    session_id = request.form.get('session_id')
    prompt = request.form.get('prompt', 'Analyze this image in detail')
    analysis_mode = request.form.get('analysisMode', 'full')
    
    # Check if an image was uploaded
    if 'image' not in request.files:
        return jsonify({'error': 'No image file uploaded'}), 400
    
    file = request.files['image']
    if not file or not file.filename:
        return jsonify({'error': 'Invalid image file'}), 400
    
    # Create new session if needed
    if not session_id:
        session_id = str(uuid.uuid4())
    
    # Initialize chat instance for this session if not exists
    if session_id not in chat_instances:
        try:
            chat_instances[session_id] = GeminiFlashChat(api_key=API_KEY)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    # Process the image
    try:
        extracted_text, image_data = process_image(file, analysis_mode)
        
        if not image_data:
            return jsonify({'error': 'Failed to process image data'}), 500
        
        # Create full prompt with extracted text if available
        full_prompt = prompt
        if extracted_text and analysis_mode in ['text_only', 'full']:
            full_prompt += f"\n\nText extracted from image:\n{extracted_text}"
        
        # Get analysis from Gemini
        gemini_chat = chat_instances[session_id]
        response = gemini_chat.send_message(full_prompt, image_data)
        
        # Format chat history
        formatted_history = []
        for i, message in enumerate(gemini_chat.get_chat_history()):
            role = "user" if i % 2 == 0 else "gemini"
            try:
                if hasattr(message, "parts"):
                    text = message.parts[0].text
                else:
                    text = str(message)
                formatted_history.append({"role": role, "content": text})
            except Exception as e:
                formatted_history.append({"role": role, "content": f"[Content format error: {str(e)}]"})
        
        return jsonify({
            'session_id': session_id,
            'response': response,
            'extracted_text': extracted_text if extracted_text else "",
            'history': formatted_history
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reset', methods=['POST'])
def reset_chat():
    session_id = request.json.get('session_id')
    user_id = request.json.get('user_id')
    if session_id and session_id in chat_instances:
        try:
            chat_instances[session_id].reset_chat()
            if user_id:
                chat_sessions.update_one(
                    {'sessionId': session_id},
                    {'$set': {'lastMessage': 'Start a new conversation', 'timestamp': datetime.now()}}
                )
            return jsonify({
                'success': True, 
                'message': 'Chat history has been reset',
                'session_id': session_id
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        # Create a new session
        session_id = str(uuid.uuid4())
        try:
            chat_instances[session_id] = GeminiFlashChat(api_key=API_KEY)
            if user_id:
                chat_sessions.insert_one({
                    'userId': user_id,
                    'sessionId': session_id,
                    'title': 'New Chat',
                    'lastMessage': 'Start a new conversation',
                    'timestamp': datetime.now()
                })
            return jsonify({
                'success': True, 
                'message': 'New chat session created',
                'session_id': session_id
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    session_id = request.args.get('session_id')
    if session_id and session_id in chat_instances:
        try:
            gemini_chat = chat_instances[session_id]
            
            # Format chat history
            formatted_history = []
            for i, message in enumerate(gemini_chat.get_chat_history()):
                role = "user" if i % 2 == 0 else "gemini"
                try:
                    if hasattr(message, "parts"):
                        text = message.parts[0].text
                    else:
                        text = str(message)
                    formatted_history.append({"role": role, "content": text})
                except Exception as e:
                    formatted_history.append({"role": role, "content": f"[Content format error: {str(e)}]"})
            
            return jsonify({
                'session_id': session_id,
                'history': formatted_history
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify({'error': 'Invalid session ID'}), 400

# Clean up old sessions periodically
@app.route('/api/cleanup', methods=['POST'])
def cleanup_old_sessions():
    if request.headers.get('X-Admin-Key') != os.environ.get('ADMIN_KEY', 'admin-secret'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Simple cleanup - in production you might want time-based expiry
    session_ids = list(chat_instances.keys())
    count = len(session_ids)
    chat_instances.clear()
    
    return jsonify({
        'success': True,
        'message': f'Cleaned up {count} chat sessions'
    })

@app.route('/api/user-chats', methods=['GET'])
def get_user_chats():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    try:
        # Get all chat sessions for this user
        user_sessions = list(chat_sessions.find({'userId': user_id}).sort('timestamp', -1))
        
        # Format the sessions for response
        formatted_sessions = []
        for session in user_sessions:
            formatted_sessions.append({
                'id': session['sessionId'],
                'title': session['title'],
                'lastMessage': session['lastMessage'],
                'timestamp': session['timestamp'].isoformat() if 'timestamp' in session else None
            })
        
        return jsonify({
            'user_id': user_id,
            'chats': formatted_sessions
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rename-chat', methods=['POST'])
def rename_chat():
    session_id = request.json.get('session_id')
    new_title = request.json.get('title')
    
    if not session_id or not new_title:
        return jsonify({'error': 'Session ID and title are required'}), 400
    
    try:
        # Update the title in MongoDB
        result = chat_sessions.update_one(
            {'sessionId': session_id},
            {'$set': {'title': new_title}}
        )
        
        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'Chat title updated'
            })
        else:
            return jsonify({'error': 'Session not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/delete-chat', methods=['POST'])
def delete_chat():
    session_id = request.json.get('session_id')
    
    if not session_id:
        return jsonify({'error': 'Session ID is required'}), 400
    
    try:
        # Remove from MongoDB
        result = chat_sessions.delete_one({'sessionId': session_id})
        
        # Remove from chat instances
        if session_id in chat_instances:
            del chat_instances[session_id]
        
        if result.deleted_count > 0:
            return jsonify({
                'success': True,
                'message': 'Chat session deleted'
            })
        else:
            return jsonify({'error': 'Session not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/form/upload', methods=['POST'])
def upload_form():
    """
    API endpoint to upload a form, process it, and guide the user on filling it.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # Process the uploaded file to extract text
        extracted_text, _ = process_file(file)

        if not extracted_text:
            return jsonify({'error': 'Could not extract text from the file'}), 400

        # Identify blanks/fields using regex
        blanks = re.findall(r'[_]+|\[.*?\]|\{.*?\}', extracted_text)  # Updated regex

        # Describe each blank to the user using Gemini
        field_descriptions = {}
        session_id = str(uuid.uuid4())  # Generate a new session ID

        if session_id not in chat_instances:
            try:
                chat_instances[session_id] = GeminiFlashChat(api_key=API_KEY)
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        for blank in blanks:
            # Craft a prompt to ask Gemini about the meaning of the blank
            prompt = f"What information should be filled in the blank: '{blank}' in a legal document?"
            try:
                description = chat_instances[session_id].send_message(prompt)
                field_descriptions[blank] = description
            except Exception as e:
                field_descriptions[blank] = f"Error getting description: {str(e)}"

        return jsonify({
            'session_id': session_id,
            'fields': field_descriptions
        }), 200

    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

if __name__ == '__main__':
    # Set environment variables for production
    debug_mode = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    port = int(os.environ.get('PORT', 8081))
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
