const API_BASE_URL = window.API_BASE_URL || "https://pdfcraft-backend-1.onrender.com";

const fileInput = document.getElementById("fileInput");
const uploadArea = document.querySelector(".convert-upload-area");
const convertBtn = document.getElementById("convertBtn");
const statusMsg = document.getElementById("statusMsg");
const fileInfoArea = document.getElementById("fileInfoArea");

let selectedFile = null;

// --- Event Listeners ---

const init = () => {
    if (!uploadArea) return;
    
    fileInput.addEventListener("change", handleFileSelect);

    // Drag and drop logic
    uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = "var(--primary-color, #ff4d4d)";
    });

    uploadArea.addEventListener("dragleave", (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = "#ccc";
    });

    uploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = "#ccc";
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Click area to trigger input
    uploadArea.addEventListener("click", () => {
        fileInput.click();
    });

    convertBtn.addEventListener("click", uploadAndConvert);
};

// --- Functions ---

function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
    }
}

function handleFile(file) {
    if (file.type !== "application/pdf") {
        statusMsg.innerText = "Error: Please upload a valid PDF file.";
        statusMsg.className = "convert-status error";
        return;
    }

    selectedFile = file;
    fileInfoArea.innerHTML = `
    <div class="file-info" style="padding: 15px; background: rgba(0,0,0,0.05); border-radius: 8px; margin-bottom: 20px; text-align: center;">
      <span style="font-weight: 600;">📄 ${file.name}</span>
      <span style="color: var(--accent-primary); margin-left:10px;">(${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
      <div style="color: #2ecc71; font-size: 0.9rem; margin-top: 5px;">✓ Ready for conversion</div>
    </div>
  `;
    statusMsg.innerText = "";
    convertBtn.disabled = false;
}

async function uploadAndConvert() {
    if (!selectedFile) return;

    convertBtn.disabled = true;
    convertBtn.innerHTML = '<span class="spinner"></span> Converting...';
    statusMsg.innerText = "Uploading and processing... This may take a moment.";
    statusMsg.className = "convert-status";

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

        const response = await fetch(`${API_BASE_URL}/api/pdf-to-word`, {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server responded with ${response.status}`);
        }

        // Handle file download
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        
        const disposition = response.headers.get("Content-Disposition");
        let filename = `${selectedFile.name.replace(".pdf", "")}.docx`;
        if (disposition && disposition.indexOf("filename=") !== -1) {
            const match = disposition.match(/filename="?([^"]+)"?/);
            if (match && match[1]) filename = match[1];
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);

        statusMsg.innerText = "✓ Success! Your file has been downloaded.";
        statusMsg.className = "convert-status success";
        convertBtn.innerText = "Convert Another";

        selectedFile = null;
        fileInput.value = ""; 
        convertBtn.disabled = true;

    } catch (error) {
        console.error(error);
        const msg = (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) 
            ? "Server is waking up. Please wait 30 seconds and try again." 
            : error.message;
        
        statusMsg.innerText = `Error: ${msg}`;
        statusMsg.className = "convert-status error";
        convertBtn.innerText = "Convert to Word";
        convertBtn.disabled = false;
    }
}

init();
