const API_BASE = window.API_BASE_URL || "https://pdfcraft-backend-1.onrender.com";
const compressInput = document.getElementById("compressInput");
const uploadArea = document.getElementById("uploadArea");
const fileStatus = document.getElementById("compressFileStatus");
const optionsPanel = document.getElementById("compressOptionsPanel");
const compressionLevel = document.getElementById("compressionLevel");
const originalSizeEl = document.getElementById("originalSize");
const estimatedSizeEl = document.getElementById("estimatedSize");
const compressButton = document.getElementById("compressButton");
const compressStatus = document.getElementById("compressStatus");
const targetSizeInput = document.getElementById("targetSize");
const compressLoader = document.getElementById("compressLoader");
const compressProgressText = document.getElementById("compressProgressText");
const lottieContainer = document.getElementById("lottieCompress");

let selectedFile = null;
let lottieInstance = null;

if (lottieContainer && window.lottie) {
  lottieInstance = window.lottie.loadAnimation({
    container: lottieContainer,
    renderer: "svg",
    loop: true,
    autoplay: false,
    path: "https://assets9.lottiefiles.com/packages/lf20_loading.json"
  });
}

// Drag and Drop Logic
const setupDragAndDrop = () => {
  if (!uploadArea) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => uploadArea.classList.add('drag-over'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('drag-over'), false);
  });

  uploadArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    if (file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf'))) {
      handleFile(file);
    } else {
      alert("Please drop a valid PDF file.");
    }
  }, false);
};

const handleFile = (file) => {
  if (!file) return;
  selectedFile = file;
  originalSizeEl.textContent = `Original size: ${formatBytes(file.size)}`;
  estimatedSizeEl.textContent = "";
  fileStatus.textContent = `PDF selected: ${file.name}`;
  compressStatus.textContent = "";
  optionsPanel.style.display = "block";
  uploadArea.style.display = "none";
};

// Listeners
compressInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) handleFile(file);
});

compressButton.addEventListener("click", async () => {
  if (!selectedFile) return;

  try {
    compressStatus.textContent = "";
    compressButton.disabled = true;
    compressButton.classList.add("loading");
    compressLoader.style.display = "flex";
    compressProgressText.textContent = "Optimizing your PDF... This might take a minute.";

    if (lottieInstance) lottieInstance.play();

    const formData = new FormData();
    formData.append("file", selectedFile);

    let level = compressionLevel.value; 
    const targetMb = parseFloat(targetSizeInput.value);
    if (!isNaN(targetMb)) {
      const originalMb = selectedFile.size / (1024 * 1024);
      if (targetMb <= originalMb * 0.4) level = "high";
      else if (targetMb <= originalMb * 0.7) level = "medium";
      else level = "low";
    }

    const preset = level === "high" ? "screen" : level === "medium" ? "ebook" : "printer";
    formData.append("quality", preset);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    const response = await fetch(`${API_BASE}/api/compress`, {
      method: "POST",
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with ${response.status}`);
    }

    const blob = await response.blob();
    if (blob.size >= selectedFile.size) {
      compressStatus.innerHTML = '<span style="color:#f39c12">Note: File was already highly optimized. Smaller size not possible.</span>';
    } else {
      const reduction = ((1 - blob.size / selectedFile.size) * 100).toFixed(1);
      compressStatus.innerHTML = `<span style="color:#2ecc71">Success! Reduced by ${reduction}%</span>`;
    }

    downloadBlob(blob, getCompressedName(selectedFile.name));
  } catch (err) {
    console.error("Compression error:", err);
    const msg = (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) 
        ? "Server is waking up. Please wait 30 seconds and try again." 
        : err.message;
        
    if (err.name === 'AbortError') {
      compressStatus.innerHTML = '<span style="color:#ff5252">Timeout: The server is taking too long. Try a smaller file.</span>';
    } else {
      compressStatus.innerHTML = `<span style="color:#ff5252">Compression failed: ${msg}</span>`;
    }
  } finally {
    compressButton.disabled = false;
    compressButton.classList.remove("loading");
    compressLoader.style.display = "none";
    if (lottieInstance) lottieInstance.stop();
  }
});

function getCompressedName(name) {
  const dot = name.lastIndexOf(".");
  if (dot === -1) return name + "-compressed.pdf";
  return name.slice(0, dot) + "-compressed.pdf";
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Run
setupDragAndDrop();
