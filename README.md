# 📘 OCR_TRANS

Ứng dụng OCR (Nhận dạng ký tự quang học) giúp nhận dạng văn bản từ hình ảnh và xuất kết quả ra các định dạng tài liệu phổ biến như PDF và DOCX. Ứng dụng này có giao diện web thân thiện, cho phép người dùng dễ dàng tải lên và xử lý tài liệu.

---

## 🚀 Hướng dẫn cài đặt và sử dụng

### 1. Cài đặt MiKTeX
Ứng dụng sử dụng MiKTeX để hỗ trợ chuyển đổi tài liệu Markdown sang định dạng PDF. Bạn cần cài đặt MiKTeX trước khi chạy ứng dụng.

Tải MiKTeX tại: [https://miktex.org/download/](https://miktex.org/download/)

Chọn phiên bản phù hợp với hệ điều hành của bạn (Windows, macOS, hoặc Linux) và làm theo hướng dẫn cài đặt.

### 2. Chuẩn bị môi trường Python
Đảm bảo bạn đã cài đặt Python 3.9+ trên máy tính.

Tạo môi trường ảo để quản lý các thư viện:

```bash
python -m venv venv
```

Kích hoạt môi trường ảo:

Windows:
```bash
venv\Scripts\activate
```

Linux / macOS:
```bash
source venv/bin/activate
```

Cài đặt các thư viện cần thiết từ file requirements.txt:

```bash
pip install -r requirements.txt
```

### 3. Khởi chạy ứng dụng
Sau khi hoàn thành các bước trên, bạn có thể chạy ứng dụng bằng lệnh:

```bash
python main.py
```

Ứng dụng sẽ khởi động một máy chủ web (server). Bạn có thể truy cập giao diện web tại địa chỉ:  
👉 `http://127.0.0.1:5000` (hoặc cổng mà ứng dụng hiển thị trên terminal).

### 4. Sử dụng
- Mở trình duyệt và truy cập vào địa chỉ trên.  
- Giao diện web sẽ tự động hiển thị (từ file `static/index.html`).  
- Tải lên hình ảnh hoặc tài liệu mà bạn muốn thực hiện OCR.  
- Kết quả văn bản sẽ được hiển thị trên màn hình. Bạn có thể tải về dưới dạng file **DOCX** hoặc **PDF**.  

---

## 🛠️ Yêu cầu hệ thống
- Python 3.9+  
- MiKTeX (để tạo file PDF)  
- Các thư viện Python được liệt kê trong `requirements.txt`.  

---

## 📂 Cấu trúc dự án
Dưới đây là cấu trúc thư mục của dự án để bạn dễ dàng quản lý:

```bash
OCR_TRANS/
├── static/                 # Giao diện web
│   ├── index.html          # Trang chủ
│   ├── script.js           # Xử lý tương tác
│   └── style.css           # Định dạng giao diện
├── LICENSE
├── main.py                 # File chính để chạy server
├── ocr.py                  # Module xử lý OCR
├── README.md               # Hướng dẫn
└── requirements.txt        # Danh sách thư viện
```

---

## 👨‍💻 Tác giả
Tên của bạn / Nhóm phát triển

---

✨ Chúc bạn có trải nghiệm tuyệt vời với ứng dụng!
