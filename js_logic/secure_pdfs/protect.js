// Protect PDF Logic
const API_BASE = window.API_BASE_URL || "https://pdfcraft-backend-1.onrender.com";

const pdfInput = document.getElementById("pdfInput");
const uploadArea = document.getElementById("uploadArea");
const workspace = document.getElementById("workspace");
const fileNameSpan = document.getElementById("fileName");

const pass1 = document.getElementById("pass1");
const pass2 = document.getElementById("pass2");
const protectBtn = document.getElementById("protectBtn");
const statusMsg = document.getElementById("statusMsg");

let currentFile = null;

// --- Initialization ---
const init = () => {
    if (!uploadArea) return;
    
    setupDragAndDrop();
    pdfInput.addEventListener("change", handleFileSelect);
    protectBtn.addEventListener("click", encryptPdf);
};

// Standardized Drag and Drop Logic
const setupDragAndDrop = () => {
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
      const file = Array.from(dt.files).find(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith('.pdf'));
      if (file) {
        handleFile(file);
      } else {
        alert("Please drop a valid PDF file.");
      }
    }, false);
};

function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
    }
}

function handleFile(file) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith('.pdf')) {
        alert("Please select a PDF file.");
        return;
    }
    currentFile = file;
    fileNameSpan.textContent = file.name;
    uploadArea.style.display = "none";
    workspace.style.display = "flex";
    pass1.focus();
}

async function encryptPdf() {
    const p1 = pass1.value;
    const p2 = pass2.value;

    if (!p1) {
        setStatus("Please enter a password.", "error");
        return;
    }
    if (p1 !== p2) {
        setStatus("Passwords do not match.", "error");
        return;
    }

    try {
        protectBtn.disabled = true;
        protectBtn.innerHTML = '<span class="spinner"></span> Encrypting...';
        setStatus("Uploading and locking your file... (takes 10-30s if waking up backend)", "info");

        const formData = new FormData();
        formData.append("file", currentFile);
        formData.append("password", p1);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

        const response = await fetch(`${API_BASE}/api/protect`, {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            let errorText = `Server error: ${response.status}`;
            if (response.status === 404) {
                errorText = "Endpoint not found. Ensure the backend is running.";
            } else {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.error) errorText = errorData.error;
            }
            throw new Error(errorText);
        }

        const blob = await response.blob();
        downloadBlob(blob, `protected-${currentFile.name}`);

        setStatus("✓ File encrypted and downloaded!", "success");
        protectBtn.textContent = "Protect Another PDF";
        protectBtn.disabled = false;

    } catch (err) {
        console.error(err);
        let msg = err.message;
        if (err.name === 'AbortError') {
            msg = "Request timed out. The server might be asleep or the file is too large.";
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            msg = "Server is waking up. Please wait 30 seconds and try again.";
        }
        
        setStatus("Error: " + msg, "error");
        protectBtn.disabled = false;
        protectBtn.textContent = "Encrypt PDF";
    }
}

function setStatus(msg, type) {
    statusMsg.textContent = msg;
    statusMsg.style.color = type === "error" ? "#ff5252" : type === "info" ? "var(--accent-primary)" : "#2ecc71";
    statusMsg.style.fontWeight = "600";
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

init();
