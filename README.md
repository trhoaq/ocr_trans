chạy lệnh trong cmd (có thể chạy file mail.py trong vsc hoặc IDE khác)
1.tạo môi trường ảo

py -m venv venv 
hoặc
python -m venv venv

2. kích hoạt môi trường ảo tránh dependence

venv\Scripts\activate
 
3. cài thư viện có sẵn

pip install -r requirements.txt

4. chạy sever localhost

chạy file main.py 
hoặc
python main.py

5. khi k cần dùng môi trường ảo để chạy thì deactivate

venv\Scripts\deactivae
