import os
import uuid
from flask import Flask, request, jsonify, send_from_directory
from ocr import*

app = Flask(__name__, static_folder="static", static_url_path="/static")
OUTPUT_DIR = "outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)


@app.route("/")
def index():
    return app.send_static_file("index.html")


@app.route("/ocr", methods=["POST"])
def ocr():
    """
    Upload ảnh hoặc JSON {dataURL: "..."} -> OCR bằng Gemini -> trả về Markdown text
    """
    image_bytes = None

    # Trường hợp 1: upload file
    if "file" in request.files:
        f = request.files["file"]
        image_bytes = f.read()
    else:
        # Trường hợp 2: JSON base64 dataURL
        data = request.get_json(silent=True) or {}
        b64 = data.get("dataURL")
        if b64:
            try:
                header, b64data = b64.split(",", 1)  # tách "data:image/png;base64,..."
            except ValueError:
                b64data = b64 # Nếu không có header data URL
            import base64
            image_bytes = base64.b64decode(b64data)

    if not image_bytes:
        return jsonify({"error": "No image provided"}), 400

    # Convert image bytes to markdown using OCR
    try:
        md = ocr_bytes_to_markdown(image_bytes)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"markdown": md})


@app.route("/to_docx", methods=["POST"])
def to_docx():
    data = request.get_json()
    md = data.get("markdown", "")
    if not md:
        return jsonify({"error": "No markdown content provided"}), 400

    fname = f"{uuid.uuid4().hex}.docx"
    out_path = os.path.join(OUTPUT_DIR, fname)
    
    try:
        markdown_to_docx(md, out_path)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"filename": fname, "download_url": f"/download/{fname}"})

@app.route("/to_pdf", methods=["POST"])
def to_pdf():
    """
    Convert Markdown -> PDF
    """
    data = request.get_json()
    md = data.get("markdown", "")
    if not md:
        return jsonify({"error": "No markdown content provided"}), 400

    fname = f"{uuid.uuid4().hex}.pdf"
    out_path = os.path.join(OUTPUT_DIR, fname)
    
    try:
        markdown_to_pdf(md, out_path)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"filename": fname, "download_url": f"/download/{fname}"})


@app.route("/download/<path:filename>", methods=["GET"])
def download(filename):
    # Đảm bảo filename không chứa path traversal
    if not os.path.basename(filename) == filename:
        return "Invalid filename", 400
    
    return send_from_directory(OUTPUT_DIR, filename, as_attachment=True)


if __name__ == "__main__":
    app.run(debug=True, port=5000)