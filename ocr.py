from google import genai
from google.genai import types
import pypandoc
from dotenv import load_dotenv
import os
import uuid
import base64 

OUTPUT_DIR = "output"
IMG_DIR = os.path.join(OUTPUT_DIR, "images")
os.makedirs(IMG_DIR, exist_ok=True)

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("setup api key trong .env")


client = genai.Client(api_key=api_key) 

def ocr_bytes_to_markdown(image_bytes: bytes) -> str:
    """
    Gửi ảnh lên Gemini để OCR và trả về Markdown text.
    - Text thường giữ nguyên
    - Bảng -> Markdown table
    - Công thức toán -> $...$ hoặc $$...$$
    """

    prompt = """
    Bạn là OCR engine, phiên dịch viên chuyên nghiệp.
    Hãy đọc toàn bộ nội dung trong ảnh và trả về kết quả ở dạng Markdown.
    Đảm bảo các quy tắc sau:
    1. Văn bản thường giữ nguyên.
    2. Bảng phải được định dạng chính xác theo cú pháp Markdown table (| col1 | col2 |).
    3. Công thức toán học (equations) phải được bao quanh bởi dấu đô la:
       - Inline math: `$equation$` (ví dụ: `$E=mc^2$`)
       - Display block math: `$$equation$$` trên một dòng riêng biệt (ví dụ: `$$\sum_{i=0}^n i^2 = \frac{n(n+1)(2n+1)}{6}$$`)
    4. Mỗi công thức toán học (equation) cần phải tách riêng ra 1 dòng.
    5. Sau khi chuyển về dạng markdown thì cần phải phiên dịch từ tiếng anh qua tiếng việt.
    6. Đảm bảo thứ tự các câu và không cần dịch những bảng, hình ảnh, đồ thị.
    7. KHÔNG thêm bất kỳ giải thích nào, chỉ xuất ra Markdown hợp lệ.
    8. Khi ocr giữ nguyên các kí tự đặc biệt của file .md
    9. NẾU có thì phần đáp án cách nhau bởi A B C D thì bạn hãy xuống dòng 2 lần (LƯU Ý: tuyệt đối không hiện thị kí tự <br><br>).
    10. ĐẶC BIỆT Lưu ý, dưới mỗi câu không được có cái đường kẻ ngang dài, trừ khi trong ảnh có.
    11. loại bỏ các kí tự " ``` " và " --- "
    """

    response = client.models.generate_content(
        model="gemini-1.5-flash", # Sử dụng model phù hợp, ví dụ gemini-1.5-flash cho tốc độ
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"), # Đảm bảo mime_type chính xác
            prompt
        ]
    )

    return response.text.strip()

def markdown_to_docx(md_text: str, out_path: str):
    try:
        pypandoc.convert_text(
            md_text,
            to='docx',
            format='markdown+tex_math_dollars+tex_math_single_backslash-yaml_metadata_block',
            outputfile=out_path,
            extra_args=[
                '--standalone',
                '--mathml'  # ép công thức thành OMML (Office MathML)
            ]
        )
    except Exception as e:
        raise RuntimeError(f"Pandoc DOCX conversion failed: {e}")



def markdown_to_pdf(md_text: str, out_path: str):
    try:
        pypandoc.convert_text(
            md_text,
            'pdf',
            format='markdown+tex_math_dollars+tex_math_single_backslash-yaml_metadata_block',
            outputfile=out_path,
            extra_args=[
                '--standalone',
                '--pdf-engine=xelatex'   # hoặc 'lualatex' nếu xelatex chưa có
            ]
        )
    except Exception as e:
        raise RuntimeError(f"Pandoc PDF conversion failed: {e}")
    
def process_markdown_with_images(md: str, images: list):
    """
    Giải mã base64 → file ảnh → thêm vào markdown cuối.
    """
    md_out = md
    for i, img_b64 in enumerate(images):
        try:
            ext = "png"
            if img_b64.startswith("data:image/jpeg"):
                ext = "jpg"
            fname = f"{uuid.uuid4().hex}.{ext}"
            img_path = os.path.join(IMG_DIR, fname)

            img_data = base64.b64decode(img_b64.split(",")[1])
            with open(img_path, "wb") as f:
                f.write(img_data)

            # thêm markdown image
            md_out += f"\n\n![image{i}](images/{fname})\n"
        except Exception as e:
            print("Image decode error:", e)
    return md_out
