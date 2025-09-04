from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import io
import google.generativeai as genai
from PIL import Image
from docx import Document
from fpdf import FPDF
import tempfile
from flask_cors import cross_origin
from deep_translator import GoogleTranslator
import requests

ocr_bp = Blueprint('ocr', __name__)

# Cấu hình upload
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
FONT_URL = "https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans.ttf"
FONT_PATH = os.path.join(os.path.dirname(__file__), "DejaVuSans.ttf")

def ensure_font():
    """Tải font DejaVuSans.ttf nếu chưa có"""
    if not os.path.exists(FONT_PATH):
        print("⏬ Đang tải font DejaVuSans.ttf ...")
        try:
            response = requests.get(FONT_URL, timeout=30)
            response.raise_for_status()
            with open(FONT_PATH, "wb") as f:
                f.write(response.content)
            print("✅ Đã tải font thành công:", FONT_PATH)
        except Exception as e:
            print("❌ Không thể tải font:", e)
    else:
        print("✔ Font đã tồn tại:", FONT_PATH)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_docx(extracted_text, translated_text):
    """Tạo file DOCX từ văn bản gốc và bản dịch"""
    document = Document()

    document.add_paragraph(translated_text)

    bio = io.BytesIO()
    document.save(bio)
    bio.seek(0)
    return bio

def generate_pdf(extracted_text, translated_text):
    """Tạo file PDF từ văn bản gốc và bản dịch"""
    pdf = FPDF()
    pdf.add_page()

    pdf.add_font("DejaVu", "", FONT_PATH, uni=True)
    pdf.set_font("DejaVu", "", 14)

    pdf.multi_cell(0, 10, translated_text)

    return pdf.output(dest="S").encode("latin1", "ignore")

@ocr_bp.route('/process', methods=['POST'])
@cross_origin()
def process_image():
    """Xử lý ảnh OCR và dịch thuật"""
    try:
        # Kiểm tra API key
        api_key = request.form.get('api_key')
        if not api_key:
            return jsonify({'error': 'API key is required'}), 400

        # Kiểm tra file upload
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Only PNG, JPG, JPEG allowed'}), 400

        # Xử lý ảnh
        image = Image.open(file.stream)
        
        # Cấu hình Gemini API
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Prompt cho OCR
        prompt = """You are an expert in text extraction. Accurately extract all the text and mathematical formulas from this image. Present the formulas in a clear and linearized format. Return only the extracted content, no additional commentary."""
        
        # Gửi ảnh đến Gemini API
        response = model.generate_content([prompt, image])
        
        if not response.text:
            return jsonify({'error': 'Could not extract text from image'}), 400
        
        extracted_text = response.text
        
        translated_text = GoogleTranslator(source='en', target='vi').translate(extracted_text)
        
        return jsonify({
            'success': True,
            'original_text': extracted_text,
            'translated_text': translated_text,
            'original_length': len(extracted_text),
            'translated_length': len(translated_text)
        })
        
    except Exception as e:
        error_msg = str(e)
        if "API_KEY" in error_msg.upper():
            return jsonify({'error': 'Invalid API key'}), 401
        elif "QUOTA" in error_msg.upper() or "LIMIT" in error_msg.upper():
            return jsonify({'error': 'API quota exceeded'}), 429
        else:
            return jsonify({'error': f'Processing error: {error_msg}'}), 500

@ocr_bp.route('/download/<file_type>', methods=['POST'])
@cross_origin()
def download_file(file_type):
    """Tải xuống file DOCX hoặc PDF"""
    try:
        data = request.get_json()
        original_text = data.get('original_text', '')
        translated_text = data.get('translated_text', '')
        
        if not original_text or not translated_text:
            return jsonify({'error': 'Text data is required'}), 400
        
        if file_type == 'docx':
            file_data = generate_docx(original_text, translated_text)
            return send_file(
                file_data,
                as_attachment=True,
                download_name='ket_qua_ocr_dich.docx',
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
        elif file_type == 'pdf':
            file_data = generate_pdf(original_text, translated_text)
            return send_file(
                io.BytesIO(file_data),
                as_attachment=True,
                download_name='ket_qua_ocr_dich.pdf',
                mimetype='application/pdf'
            )
        else:
            return jsonify({'error': 'Invalid file type'}), 400
            
    except Exception as e:
        return jsonify({'error': f'File generation error: {str(e)}'}), 500

