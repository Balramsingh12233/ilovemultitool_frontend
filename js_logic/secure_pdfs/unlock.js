// Unlock PDF Logic
const API_BASE = window.API_BASE_URL || "https://pdfcraft-backend-1.onrender.com";

const pdfInput = document.getElementById("pdfInput");
const uploadArea = document.getElementById("uploadArea");
const workspace = document.getElementById("workspace");
const fileNameSpan = document.getElementById("fileName");

const passwordInput = document.getElementById("password");
const unlockBtn = document.getElementById("unlockBtn");
const statusMsg = document.getElementById("statusMsg");

let currentFile = null;

// --- Initialization ---
const init = () => {
    if (!uploadArea) return;
    
    setupDragAndDrop();
    pdfInput.addEventListener("change", handleFileSelect);
    unlockBtn.addEventListener("click", unlockPdf);
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
    passwordInput.focus();
}

async function unlockPdf() {
    const pwd = passwordInput.value;

    if (!pwd) {
        setStatus("Please enter the password.", "error");
        return;
    }

    try {
        unlockBtn.disabled = true;
        unlockBtn.innerHTML = '<span class="spinner"></span> Unlocking...';
        setStatus("Unlocking your file... please wait.", "info");

        if (typeof PDFLib === 'undefined') {
            throw new Error("PDF library not loaded. Please check your internet connection.");
        }

        const { PDFDocument } = PDFLib;
        const arrayBuffer = await currentFile.arrayBuffer();
        
        // Attempt to load the PDF with the provided password
        let pdfDoc;
        try {
            pdfDoc = await PDFDocument.load(arrayBuffer, { password: pwd });
        } catch (loaderErr) {
            if (loaderErr.message.includes("Password") || loaderErr.message.includes("encrypted")) {
                throw new Error("Incorrect password or file is not encrypted with a supported method.");
            }
            throw loaderErr;
        }

        // Saving it without supplying encryption options saves it as unencrypted!
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        
        downloadBlob(blob, `unlocked-${currentFile.name}`);

        setStatus("✓ File unlocked and downloaded!", "success");
        unlockBtn.textContent = "Unlock Another PDF";
        unlockBtn.disabled = false;

    } catch (err) {
        console.error(err);
        setStatus("Failed to unlock: " + err.message, "error");
        unlockBtn.disabled = false;
        unlockBtn.textContent = "Unlock PDF";
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
