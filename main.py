import os
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import requests
import ocr  
from ocr import ocr_bp, ensure_font

app = Flask(__name__, static_folder=os.path.dirname(__file__))
app.register_blueprint(ocr_bp, url_prefix="/api/ocr")
CORS(app) 

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/ocr', methods=['POST'])
def ocr_api():
    """
    API nhận file ảnh từ client, gọi hàm OCR trong ocr.py và trả kết quả.
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    try:
        # Gọi hàm OCR từ file ocr.py
        result = ocr.run_ocr(file)
        return jsonify({"text": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    ensure_font()
    app.run(host='0.0.0.0', port=5000, debug=True)