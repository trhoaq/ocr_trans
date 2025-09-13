// app.js
let clipboardImageData = null;

// Elements
const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const doOcrBtn = document.getElementById("doOcrBtn");
const toDocxBtn = document.getElementById("toDocxBtn");
const toPdfBtn = document.getElementById("toPdfBtn");
const rendered = document.getElementById("rendered");
const editorWrapper = document.getElementById("editor-wrapper"); // Lấy wrapper của editor

// Markdown editor
const simplemde = new SimpleMDE({
  element: document.getElementById("editor"),
  spellChecker: false,
  renderingConfig: {
    singleLineBreaks: false,
    codeSyntaxHighlighting: true,
  }
});
simplemde.codemirror.on("change", () => {
  updatePreview();
});

// ---------- Preview ----------
function updatePreview() {
  const md = simplemde.value();

  // Render markdown với marked.js
  const html = marked.parse(md, { breaks: true });

  rendered.className = "markdown-body";
  rendered.innerHTML = html;

  // Re-render MathJax
  if (window.MathJax && window.MathJax.typesetPromise) {
    MathJax.typesetClear([rendered]);
    MathJax.typesetPromise([rendered]).catch(err => console.error(err));
  }
}


// ---------- Image Handling ----------
function handleImageUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    clipboardImageData = reader.result;
    // Hiển thị ảnh trong dropzone
    dropzone.innerHTML = `<img src="${clipboardImageData}" style="max-width:100%; height:auto; display:block; margin: 0 auto;" /><div style="font-size:12px; color:#666; margin-top:8px;">Image ready for OCR. Click "Run OCR".</div>`;
  };
  reader.readAsDataURL(file);
}

function handlePasteImage(event) {
  const items = (event.clipboardData || event.originalEvent.clipboardData).items;
  for (const item of items) {
    if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      handleImageUpload(file);
      event.preventDefault(); // Ngăn chặn hành vi paste mặc định
      return; // Chỉ xử lý ảnh đầu tiên được paste
    }
  }
}

fileInput.addEventListener("change", ev => handleImageUpload(ev.target.files[0]));
document.addEventListener("paste", handlePasteImage);

let images = []; // lưu nhiều ảnh đã paste/upload

function handleImageUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const imgData = reader.result;
    clipboardImageData = imgData;
    images.push(imgData); // thêm vào list

    // Hiển thị nhiều ảnh trong dropzone
    dropzone.innerHTML = images.map(
      (src, i) => `<img src="${src}" style="max-width:100%; margin:8px 0; display:block"/>`
    ).join('') + `<div style="font-size:12px; color:#666; margin-top:8px;">${images.length} image(s) ready for OCR/Export</div>`;
  };
  reader.readAsDataURL(file);
}


// ---------- API Calls ----------
async function callOcr() {
  if (!clipboardImageData) {
    alert("Paste or upload an image first.");
    return;
  }

  doOcrBtn.disabled = true;
  doOcrBtn.textContent = "Running OCR...";

  try {
    const res = await fetch("/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataURL: clipboardImageData })
    });

    const j = await res.json();
    if (j.error) throw new Error(j.error);

    // Append thay vì overwrite
    const currentContent = simplemde.value();
    const newContent = currentContent.trim() ? currentContent + "\n\n" + j.markdown : j.markdown;
    simplemde.value(newContent);

    updatePreview();
  } catch (err) {
    alert("OCR failed: " + err.message);
  } finally {
    doOcrBtn.disabled = false;
    doOcrBtn.textContent = "Run OCR";
  }
}

async function exportFile(endpoint) {
  const md = simplemde.value();
  if (!md.trim()) {
    alert("Markdown editor is empty. Please generate or type some content first.");
    return;
  }

  const exportBtn = endpoint === "/to_docx" ? toDocxBtn : toPdfBtn;
  exportBtn.disabled = true;
  exportBtn.textContent = `Exporting ${endpoint.split('_')[1].toUpperCase()}...`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: md, images: images }) // gửi kèm images[]
    });

    const j = await res.json();
    if (j.download_url) {
      window.location = j.download_url;
      simplemde.value(""); // reset sau export
      updatePreview();
      images = []; // reset list ảnh
    } else if (j.error) {
      throw new Error(j.error);
    } else {
      throw new Error("No download URL or unknown error from server.");
    }
  } catch (err) {
    alert(`Export ${endpoint.split('_')[1].toUpperCase()} failed: ${err.message}`);
  } finally {
    exportBtn.disabled = false;
    exportBtn.textContent = endpoint === "/to_docx" ? "Export .docx" : "Export .pdf";
  }
}

// ---------- Event Listeners ----------
doOcrBtn.addEventListener("click", callOcr);
toDocxBtn.addEventListener("click", () => exportFile("/to_docx"));
toPdfBtn.addEventListener("click", () => exportFile("/to_pdf"));

// Adjust SimpleMDE height dynamically for Flexbox
// This is a common hack for SimpleMDE in flex containers
// The ideal way is to set .CodeMirror and .CodeMirror-scroll to 100% height in CSS.
// But SimpleMDE often sets explicit height, so we might need to override.
// The CSS added to index.html attempts to fix this.
window.addEventListener('load', () => {
    // Try to ensure CodeMirror (SimpleMDE's underlying editor) fills its parent
    const cmElement = document.querySelector('.CodeMirror');
    if (cmElement) {
        cmElement.style.height = '100%';
        const cmScroll = document.querySelector('.CodeMirror-scroll');
        if (cmScroll) cmScroll.style.minHeight = '100%';
    }
});