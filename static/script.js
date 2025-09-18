let clipboardImageData = null;

// Elements
const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const doOcrBtn = document.getElementById("doOcrBtn");
const toDocxBtn = document.getElementById("toDocxBtn");
const toPdfBtn = document.getElementById("toPdfBtn");
const rendered = document.getElementById("rendered");
const editorWrapper = document.getElementById("editor-wrapper");
const resetBtn = document.getElementById("resetBtn");

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
let images = []; // lưu nhiều ảnh đã paste/upload

function handleImageUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const imgData = reader.result;
    clipboardImageData = imgData;
    images = [ImageData]; 

    dropzone.innerHTML = 
     `<img src="${imgData}" style="max-width:100%; display:block; margin:auto"/>
      <div style="font-size:12px; color:#666; margin-top:8px;">Image ready for OCR</div>`;
  };
  reader.readAsDataURL(file);
}

function handlePasteImage(event) {
  const items = (event.clipboardData || event.originalEvent.clipboardData).items;
  for (const item of items) {
    if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      handleImageUpload(file);
      event.preventDefault();
      return;
    }
  }
}

fileInput.addEventListener("change", ev => handleImageUpload(ev.target.files[0]));
document.addEventListener("paste", handlePasteImage);

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
      body: JSON.stringify({ markdown: md, images: images })
    });

    const j = await res.json();
    if (j.download_url) {
      window.location = j.download_url;
      simplemde.value("");
      updatePreview();
      images = [];
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

resetBtn.addEventListener("click", () => {
  simplemde.value("");
  rendered.innerHTML = "";

  dropzone.innerHTML = `Paste image here (Ctrl+V) or 
    <input type="file" id="fileInput" accept="image/*">
    <div style="font-size:12px; color:#666">
        Supports images with tables & math (OCR engine must return LaTeX/tables).
    </div>`;

  images = [];
  clipboardImageData = null;
});
// ---------- Event Listeners ----------
doOcrBtn.addEventListener("click", callOcr);
toDocxBtn.addEventListener("click", () => exportFile("/to_docx"));
toPdfBtn.addEventListener("click", () => exportFile("/to_pdf"));
window.addEventListener('load', () => {
    // Try to ensure CodeMirror (SimpleMDE's underlying editor) fills its parent
    const cmElement = document.querySelector('.CodeMirror');
    if (cmElement) {
        cmElement.style.height = '100%';
        const cmScroll = document.querySelector('.CodeMirror-scroll');
        if (cmScroll) cmScroll.style.minHeight = '100%';
    }
});