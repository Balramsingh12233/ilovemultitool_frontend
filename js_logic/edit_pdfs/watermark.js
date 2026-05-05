// Watermark Tool Logic
const pdfInput = document.getElementById("pdfInput");
const uploadArea = document.getElementById("uploadArea");
const workspace = document.getElementById("watermarkWorkspace");

const wmTextMsg = document.getElementById("wmText");
const wmSize = document.getElementById("wmSize");
const wmRotation = document.getElementById("wmRotation");
const rotationValue = document.getElementById("rotationValue");
const wmOpacity = document.getElementById("wmOpacity");
const colorPicker = document.getElementById("colorPicker");
const gridPos = document.getElementById("gridPos");

const previewCanvas = document.getElementById("previewCanvas");
const previewOverlay = document.getElementById("previewOverlay");
const processBtn = document.getElementById("processBtn");
const statusMsg = document.getElementById("statusMsg");

let currentFile = null;
let pdfDocProxy = null;
let currentColor = [1, 0, 0]; // RGB Red
let currentPos = "mc"; // middle-center
let currentScale = 0.8;

// --- Initialization ---
const init = () => {
    if (!uploadArea) return;
    
    setupDragAndDrop();
    pdfInput.addEventListener("change", handleFileSelect);
    
    // UI Update Listeners
    [wmTextMsg, wmSize, wmOpacity].forEach(el => el.addEventListener("input", updatePreviewOverlay));
    
    wmRotation.addEventListener("input", (e) => {
        rotationValue.textContent = e.target.value + "°";
        updatePreviewOverlay();
    });

    // Color Options
    Array.from(colorPicker.children).forEach(opt => {
        opt.addEventListener("click", (e) => {
            document.querySelectorAll(".color-option").forEach(c => c.classList.remove("selected"));
            e.target.classList.add("selected");
            const rgb = e.target.dataset.color.split(",").map(Number);
            currentColor = rgb;
            updatePreviewOverlay();
        });
    });

    // Grid Position cells
    Array.from(gridPos.children).forEach(cell => {
        cell.addEventListener("click", (e) => {
            document.querySelectorAll(".grid-cell").forEach(c => {
                c.classList.remove("selected");
                c.style.background = "#444";
            });
            e.target.classList.add("selected");
            e.target.style.background = "var(--accent-primary)";
            currentPos = e.target.dataset.pos;
            updatePreviewOverlay();
        });
    });

    processBtn.addEventListener("click", processAndDownload);
};

// Drag and Drop Logic
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

async function handleFile(file) {
    if (file.type !== "application/pdf") {
        alert("Invalid file type. Please select a PDF.");
        return;
    }
    currentFile = file;
    uploadArea.style.display = "none";
    workspace.style.display = "flex";

    try {
        const ab = await file.arrayBuffer();
        pdfDocProxy = await pdfjsLib.getDocument(ab).promise;
        renderPreviewPage(1);
    } catch (err) {
        console.error(err);
        alert("Error loading PDF preview.");
    }
}

async function renderPreviewPage(pageNum) {
    const page = await pdfDocProxy.getPage(pageNum);
    
    // Scale for preview visibility
    currentScale = 0.8; 
    const viewport = page.getViewport({ scale: currentScale });

    previewCanvas.height = viewport.height;
    previewCanvas.width = viewport.width;

    const ctx = previewCanvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;

    previewOverlay.style.width = viewport.width + "px";
    previewOverlay.style.height = viewport.height + "px";

    updatePreviewOverlay();
}

/**
 * Updates the visual watermark overlay in the browser.
 * Fixed: Scales font size based on currentScale to match PDF points more accurately.
 */
function updatePreviewOverlay() {
    previewOverlay.innerHTML = "";
    const text = wmTextMsg.value || "";
    if (!text) return;

    const div = document.createElement("div");
    div.textContent = text;
    div.style.position = "absolute";
    div.style.whiteSpace = "nowrap";
    div.style.fontFamily = "Helvetica, Arial, sans-serif";
    
    // ACCURACY FIX: Match font scale to browser preview zoom
    const fontSize = parseInt(wmSize.value) * currentScale;
    div.style.fontSize = fontSize + "px";
    div.style.opacity = wmOpacity.value;
    
    // Match CSS rotation (clockwise for positive in drawText context we'll negate)
    div.style.transform = `translate(-50%, -50%) rotate(-${wmRotation.value}deg)`;
    
    const r = Math.round(currentColor[0] * 255);
    const g = Math.round(currentColor[1] * 255);
    const b = Math.round(currentColor[2] * 255);
    div.style.color = `rgb(${r},${g},${b})`;

    // Positioning with 15% manual margins to match PDF-lib logic
    let top = "50%";
    let left = "50%";

    const p = currentPos;
    if (p.includes("t")) top = "15%";
    if (p.includes("b")) top = "85%";
    if (p.includes("l")) left = "15%";
    if (p.includes("r")) left = "85%";

    div.style.top = top;
    div.style.left = left;

    previewOverlay.appendChild(div);
}

/**
 * Processes the PDF using pdf-lib.
 * Fixed: Implements a rotation offset matrix to ensure text is centered exactly at the pivot point.
 */
async function processAndDownload() {
    if (!currentFile) return;

    processBtn.disabled = true;
    statusMsg.innerHTML = '<span style="color:var(--accent-primary)">Processing segments... please wait.</span>';

    try {
        const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;
        const ab = await currentFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(ab);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const txt = wmTextMsg.value;
        const size = parseInt(wmSize.value);
        const rot = parseInt(wmRotation.value);
        const op = parseFloat(wmOpacity.value);
        const col = rgb(currentColor[0], currentColor[1], currentColor[2]);

        pages.forEach(page => {
            const { width, height } = page.getSize();
            
            // PDF target center points
            let targetX = width / 2;
            let targetY = height / 2; 
            
            const mX = width * 0.15;
            const mY = height * 0.15;

            if (currentPos.includes("l")) targetX = mX;
            if (currentPos.includes("r")) targetX = width - mX;
            if (currentPos.includes("t")) targetY = height - mY;
            if (currentPos.includes("b")) targetY = mY;

            // PRECISE CENTERING LOGIC
            const textWidth = font.widthOfTextAtSize(txt, size);
            const textHeight = font.heightAtSize(size);

            // Calculate rotated center offset (Theta in radians)
            const theta = -(rot * Math.PI) / 180;
            const rx = textWidth / 2;
            const ry = textHeight / 4; // Baseline adjustment

            // Rotation matrix to find the new bottom-left origin
            // such that (targetX, targetY) is the exact center of the text.
            const dx = rx * Math.cos(theta) - ry * Math.sin(theta);
            const dy = rx * Math.sin(theta) + ry * Math.cos(theta);

            const x = targetX - dx;
            const y = targetY - dy;

            page.drawText(txt, {
                x: x, 
                y: y,
                size: size,
                font: font,
                color: col,
                opacity: op,
                rotate: degrees(-rot)
            });
        });

        const pdfBytes = await pdfDoc.save();
        downloadBlob(pdfBytes, "watermarked-" + currentFile.name);
        statusMsg.innerHTML = '<span style="color:#2ecc71">✓ Success! PDF watermarked and downloaded.</span>';

    } catch (err) {
        console.error(err);
        statusMsg.innerHTML = '<span style="color:#ff5252">Error: ' + err.message + '</span>';
    } finally {
        processBtn.disabled = false;
    }
}

function downloadBlob(bytes, filename) {
    const blob = new Blob([bytes], { type: "application/pdf" });
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
