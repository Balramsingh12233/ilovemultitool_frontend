// Rotate Tool Logic
// Uses PDF.js for rendering thumbnails and pdf-lib for saving the result

const pdfInput = document.getElementById("pdfInput");
const uploadArea = document.getElementById("uploadArea");
const workspace = document.getElementById("rotateWorkspace");
const pagesGrid = document.getElementById("pagesGrid");
const downloadBtn = document.getElementById("downloadBtn");
const statusMsg = document.getElementById("statusMsg");

// Buttons
const rotateAllLeftBtn = document.getElementById("rotateAllLeft");
const rotateAllRightBtn = document.getElementById("rotateAllRight");
const resetBtn = document.getElementById("resetRotation");

let currentFile = null;
let pdfDocProxy = null; // PDF.js document
let rotations = []; // Array storing current rotation for each page (0, 90, 180, 270)
let originalRotations = []; // Store original rotation of pages (from file) to display correctly

// --- Event Listeners ---

pdfInput.addEventListener("change", handleFileSelect);

// Drag & Drop
uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "var(--primary-color)";
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

rotateAllLeftBtn.addEventListener("click", () => rotateAll(-90));
rotateAllRightBtn.addEventListener("click", () => rotateAll(90));
resetBtn.addEventListener("click", resetRotations);
downloadBtn.addEventListener("click", saveAndDownload);

// --- Functions ---

function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
    }
}

async function handleFile(file) {
    if (file.type !== "application/pdf") {
        alert("Please upload a valid PDF file.");
        return;
    }

    currentFile = file;
    uploadArea.style.display = "none";
    workspace.style.display = "block";
    pagesGrid.innerHTML = "Loading pages...";

    try {
        const arrayBuffer = await file.arrayBuffer();

        // Load with PDF.js
        pdfDocProxy = await pdfjsLib.getDocument(arrayBuffer).promise;

        // Initialize rotations
        const numPages = pdfDocProxy.numPages;
        rotations = new Array(numPages).fill(0);

        // Render thumbnails
        renderPages();

    } catch (err) {
        console.error(err);
        alert("Error loading PDF: " + err.message);
        resetTool();
    }
}

async function renderPages() {
    pagesGrid.innerHTML = "";

    for (let i = 1; i <= pdfDocProxy.numPages; i++) {
        const page = await pdfDocProxy.getPage(i);

        // Create UI elements
        const card = document.createElement("div");
        card.className = "page-card";

        const canvas = document.createElement("canvas");
        canvas.className = "page-preview";

        // Render using PDF.js
        const viewport = page.getViewport({ scale: 0.5 }); // Thumbnail scale
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        // Info and controls
        const info = document.createElement("div");
        info.className = "page-info";
        info.textContent = `Page ${i}`;

        const actions = document.createElement("div");
        actions.className = "page-actions";

        const leftBtn = document.createElement("button");
        leftBtn.className = "rotate-btn";
        leftBtn.innerHTML = "⟲";
        leftBtn.onclick = () => rotatePage(i - 1, -90);

        const rightBtn = document.createElement("button");
        rightBtn.className = "rotate-btn";
        rightBtn.innerHTML = "⟳";
        rightBtn.onclick = () => rotatePage(i - 1, 90);

        actions.appendChild(leftBtn);
        actions.appendChild(rightBtn);

        card.appendChild(canvas);
        card.appendChild(info);
        card.appendChild(actions);

        // Apply current visual rotation
        updateCardRotation(card, i - 1);

        pagesGrid.appendChild(card);
    }
}

function rotatePage(index, degrees) {
    rotations[index] = (rotations[index] + degrees) % 360;
    // Normalize negative angles
    if (rotations[index] < 0) rotations[index] += 360;

    const card = pagesGrid.children[index];
    updateCardRotation(card, index);
}

function rotateAll(degrees) {
    for (let i = 0; i < rotations.length; i++) {
        rotations[i] = (rotations[i] + degrees) % 360;
        if (rotations[i] < 0) rotations[i] += 360;
        const card = pagesGrid.children[i];
        updateCardRotation(card, i);
    }
}

function resetRotations() {
    rotations.fill(0);
    Array.from(pagesGrid.children).forEach((card, index) => {
        updateCardRotation(card, index);
    });
}

function updateCardRotation(card, index) {
    const canvas = card.querySelector("canvas");
    const rotation = rotations[index];
    canvas.style.transform = `rotate(${rotation}deg)`;
}

function resetTool() {
    currentFile = null;
    pdfDocProxy = null;
    rotations = [];
    uploadArea.style.display = "block";
    workspace.style.display = "none";
    pdfInput.value = "";
}

async function saveAndDownload() {
    if (!currentFile) return;

    try {
        downloadBtn.disabled = true;
        downloadBtn.textContent = "Processing...";
        statusMsg.textContent = "Rotating pages and generating new PDF...";

        const { PDFDocument, QRCode, degrees } = PDFLib;

        const arrayBuffer = await currentFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();

        // Apply rotations
        pages.forEach((page, index) => {
            const rotationToAdd = rotations[index] || 0;
            if (rotationToAdd !== 0) {
                const currentRotation = page.getRotation().angle;
                page.setRotation(degrees(currentRotation + rotationToAdd));
            }
        });

        const pdfBytes = await pdfDoc.save();

        downloadBlob(pdfBytes, "rotated-" + currentFile.name);

        statusMsg.textContent = "Done!";
    } catch (err) {
        console.error(err);
        alert("Error saving PDF: " + err.message);
        statusMsg.textContent = "Error occurred.";
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = "Download Rotated PDF";
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
