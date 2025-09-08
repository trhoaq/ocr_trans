// Global variables
let selectedFile = null;
let processedData = null;

// DOM elements
const apiKeyInput = document.getElementById('apiKey');
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const fileName = document.getElementById('fileName');
const removeImageBtn = document.getElementById('removeImage');
const processBtn = document.getElementById('processBtn');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const resultsSection = document.getElementById('resultsSection');
const originalText = document.getElementById('originalText');
const translatedText = document.getElementById('translatedText');
const originalLength = document.getElementById('originalLength');
const translatedLength = document.getElementById('translatedLength');
const downloadDocx = document.getElementById('downloadDocx');
const downloadPdf = document.getElementById('downloadPdf');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const API_BASE_URL = "http://localhost:5000"; 

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Upload area events
    uploadArea.addEventListener('click', () => imageInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // File input change
    imageInput.addEventListener('change', handleFileSelect);
    
    // Remove image
    removeImageBtn.addEventListener('click', removeImage);
    
    // Process button
    processBtn.addEventListener('click', processImage);
    
    // Download buttons
    downloadDocx.addEventListener('click', () => downloadFile('docx'));
    downloadPdf.addEventListener('click', () => downloadFile('pdf'));
    
    // API key input
    apiKeyInput.addEventListener('input', checkFormValidity);
    
    // Initial form check
    checkFormValidity();
});

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// File selection handler
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// File handling
function handleFile(file) {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        showError('Chỉ hỗ trợ file JPG, JPEG, PNG');
        return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showError('File quá lớn. Vui lòng chọn file nhỏ hơn 10MB');
        return;
    }
    
    selectedFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImg.src = e.target.result;
        fileName.textContent = file.name;
        imagePreview.style.display = 'block';
        uploadArea.style.display = 'none';
    };
    reader.readAsDataURL(file);
    
    checkFormValidity();
    hideError();
}

// Remove image
function removeImage() {
    selectedFile = null;
    imagePreview.style.display = 'none';
    uploadArea.style.display = 'block';
    imageInput.value = '';
    checkFormValidity();
    hideResults();
}

// Check form validity
function checkFormValidity() {
    const hasApiKey = apiKeyInput.value.trim() !== '';
    const hasFile = selectedFile !== null;
    
    processBtn.disabled = !(hasApiKey && hasFile);
}

// Process image
async function processImage() {
    if (!selectedFile || !apiKeyInput.value.trim()) {
        showError('Vui lòng nhập API Key và chọn file ảnh');
        return;
    }
    
    // Show loading
    showLoading('Đang xử lý ảnh và trích xuất văn bản...');
    hideError();
    hideResults();
    
    try {
        // Prepare form data
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('api_key', apiKeyInput.value.trim());
        
        // Send request
        const response = await fetch(`${API_BASE_URL}/api/ocr/process`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Có lỗi xảy ra khi xử lý');
        }
        
        // Store processed data
        processedData = data;
        
        // Show results
        showResults(data);
        
    } catch (error) {
        console.error('Processing error:', error);
        showError(getErrorMessage(error.message));
    } finally {
        hideLoading();
    }
}

// Show results
function showResults(data) {
    originalText.value = data.original_text;
    translatedText.value = data.translated_text;
    originalLength.textContent = data.original_length;
    translatedLength.textContent = data.translated_length;
    
    resultsSection.style.display = 'block';
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Hide results
function hideResults() {
    resultsSection.style.display = 'none';
    processedData = null;
}

// Download file
async function downloadFile(fileType) {
    if (!processedData) {
        showError('Không có dữ liệu để tải xuống');
        return;
    }
    
    try {
        showLoading(`Đang tạo file ${fileType.toUpperCase()}...`);
        
        const response = await fetch(`${API_BASE_URL}/api/ocr/download/${fileType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                original_text: processedData.original_text,
                translated_text: processedData.translated_text
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Có lỗi khi tạo file');
        }
        
        // Download file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ket_qua_ocr_dich.${fileType}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Download error:', error);
        showError(`Lỗi khi tải file: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Copy text to clipboard
function copyText(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    document.execCommand('copy');
    
    // Show feedback
    const button = element.parentNode.querySelector('.btn-copy');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i> Đã copy!';
    button.style.background = '#28a745';
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = '#667eea';
    }, 2000);
}

// Show loading
function showLoading(text) {
    loadingText.textContent = text;
    loading.style.display = 'block';
    processBtn.disabled = true;
}

// Hide loading
function hideLoading() {
    loading.style.display = 'none';
    checkFormValidity();
}

// Show error
function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(hideError, 5000);
}

// Hide error
function hideError() {
    errorMessage.style.display = 'none';
}

// Get user-friendly error message
function getErrorMessage(error) {
    if (error.includes('API key')) {
        return 'API Key không hợp lệ. Vui lòng kiểm tra lại API Key.';
    } else if (error.includes('quota') || error.includes('limit')) {
        return 'Đã vượt quá giới hạn API. Vui lòng thử lại sau.';
    } else if (error.includes('network') || error.includes('fetch')) {
        return 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.';
    } else if (error.includes('Invalid file type')) {
        return 'Định dạng file không hỗ trợ. Chỉ chấp nhận JPG, JPEG, PNG.';
    } else {
        return error || 'Có lỗi xảy ra. Vui lòng thử lại.';
    }
}

