// Page Numbering Logic

const pdfInput = document.getElementById("pdfInput");
const uploadArea = document.getElementById("uploadArea");
const workspace = document.getElementById("workspace");

const positionSelect = document.getElementById("position");
const startNumInput = document.getElementById("startNum");
const fontSizeInput = document.getElementById("fontSize");
const formatSelect = document.getElementById("format");

const previewCanvas = document.getElementById("previewCanvas");
const previewOverlay = document.getElementById("previewOverlay");
const processBtn = document.getElementById("processBtn");
const statusMsg = document.getElementById("statusMsg");

let currentFile = null;
let pdfDocProxy = null;

// --- Event Listeners ---

pdfInput.addEventListener("change", handleFileSelect);

// Upload Drag & Drop
uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.style.backgroundColor = "#f0f4ff";
});
uploadArea.addEventListener("dragleave", (e) => {
    e.preventDefault();
    uploadArea.style.backgroundColor = "#fafafa";
});
uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.style.backgroundColor = "#fafafa";
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
    }
});

[positionSelect, startNumInput, fontSizeInput, formatSelect].forEach(el => {
    el.addEventListener("input", updatePreviewOverlay);
});

processBtn.addEventListener("click", processAndDownload);

// --- Functions ---

function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
    }
}

async function handleFile(file) {
    if (file.type !== "application/pdf") {
        alert("Please upload a valid PDF.");
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
        alert("Error loading PDF");
    }
}

async function renderPreviewPage(pageNum) {
    const page = await pdfDocProxy.getPage(pageNum);
    const viewport = page.getViewport({ scale: 0.8 });

    previewCanvas.height = viewport.height;
    previewCanvas.width = viewport.width;

    const ctx = previewCanvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Size overlay to match
    previewOverlay.style.width = viewport.width + "px";
    previewOverlay.style.height = viewport.height + "px";

    updatePreviewOverlay();
}

function updatePreviewOverlay() {
    // Update the red text on the preview canvas to show where the number will appear
    const pos = positionSelect.value;
    const start = parseInt(startNumInput.value) || 1;
    const size = parseInt(fontSizeInput.value) || 12;
    const fmt = formatSelect.value;

    let text = "";
    if (fmt === "n") text = `${start}`;
    if (fmt === "p_n") text = `Page ${start}`;
    if (fmt === "p_of_n") text = `Page ${start} of ${pdfDocProxy ? pdfDocProxy.numPages : "N"}`;

    previewOverlay.textContent = text;
    previewOverlay.style.fontSize = size + "px";
    previewOverlay.style.fontFamily = "Helvetica, sans-serif";

    // Reset placement
    previewOverlay.style.top = "auto";
    previewOverlay.style.bottom = "auto";
    previewOverlay.style.left = "auto";
    previewOverlay.style.right = "auto";
    previewOverlay.style.transform = "none";

    // 5% margin assumption for preview
    const margin = "5%";

    if (pos.includes("bottom")) previewOverlay.style.bottom = margin;
    if (pos.includes("top")) previewOverlay.style.top = margin;

    if (pos.includes("left")) previewOverlay.style.left = margin;
    if (pos.includes("right")) previewOverlay.style.right = margin;
    if (pos.includes("center")) {
        previewOverlay.style.left = "50%";
        previewOverlay.style.transform = "translateX(-50%)";
    }
}

async function processAndDownload() {
    if (!currentFile) return;

    processBtn.disabled = true;
    statusMsg.textContent = "Processing...";

    try {
        const { PDFDocument, StandardFonts, rgb } = PDFLib;
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();
        const totalPages = pages.length;

        const startNum = parseInt(startNumInput.value) || 1;
        const fontSize = parseInt(fontSizeInput.value) || 12;
        const format = formatSelect.value;
        const pos = positionSelect.value;

        pages.forEach((page, index) => {
            const pageNum = startNum + index;
            let text = "";
            if (format === "n") text = `${pageNum}`;
            if (format === "p_n") text = `Page ${pageNum}`;
            if (format === "p_of_n") text = `Page ${pageNum} of ${totalPages}`; // Note: this logic assumes sequential numbering from startNum for current doc pages

            const { width, height } = page.getSize();
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            const textHeight = font.heightAtSize(fontSize);

            let x = 0;
            let y = 0;
            const margin = 30; // 30 units margin

            if (pos.includes("left")) x = margin;
            if (pos.includes("right")) x = width - margin - textWidth;
            if (pos.includes("center")) x = (width / 2) - (textWidth / 2);

            if (pos.includes("bottom")) y = margin;
            if (pos.includes("top")) y = height - margin - textHeight; // simplistic top calculation

            page.drawText(text, {
                x,
                y,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
            });
        });

        const pdfBytes = await pdfDoc.save();
        downloadBlob(pdfBytes, "numbered-" + currentFile.name);
        statusMsg.textContent = "Done!";

    } catch (err) {
        console.error(err);
        statusMsg.textContent = "Error: " + err.message;
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
