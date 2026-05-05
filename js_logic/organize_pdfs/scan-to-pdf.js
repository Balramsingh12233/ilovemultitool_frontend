// ========== Scan to PDF Tool ==========

// DOM references
const scanSection = document.getElementById("scanSection");
const qrCodeContainer = document.getElementById("qrCodeContainer");
const cameraContainer = document.getElementById("cameraContainer");
const scanProcess = document.getElementById("scanProcess");
const scanQueue = document.getElementById("scanQueue");

// Global state
let stream = null;
let currentImageData = null;
let scannedPages = [];
let currentFilter = "original";
const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  .test(navigator.userAgent);

// ========== AUTO START ==========
document.addEventListener("DOMContentLoaded", () => {
  console.log("Scan to PDF loaded");
  startScanTool();
});

function startScanTool() {
  if (scanSection) {
    scanSection.style.display = "block";
    console.log("Scan section shown");
  }

  if (isMobile) {
    setTimeout(initCamera, 300);
  } else {
    showQRCode();
  }
}

// ========== CAMERA CONTROL ==========
async function initCamera() {
  if (qrCodeContainer) qrCodeContainer.style.display = "none";
  if (cameraContainer) cameraContainer.style.display = "block";

  try {
    const video = document.getElementById("video");
    const constraints = {
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    console.log("Camera started");
  } catch (err) {
    console.error("Camera error:", err);
    alert("Camera permission allow करें");
  }
}

// ========== CAPTURE ==========
const captureBtn = document.getElementById("captureBtn");
if (captureBtn) captureBtn.addEventListener("click", capturePhoto);

async function capturePhoto() {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  cameraContainer.style.display = "none";
  scanProcess.style.display = "block";
  applyFilter("original");
}

// ========== FILTERS ==========
const filters = {
  original: (data) => data,
  grayscale: (data) => {
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const avg = (px[i] + px[i + 1] + px[i + 2]) / 3;
      px[i] = px[i + 1] = px[i + 2] = avg;
    }
    return data;
  },
  bw: (data) => { // Expects id="filterBw"
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const avg = (px[i] + px[i + 1] + px[i + 2]) / 3;
      const v = avg > 128 ? 255 : 0;
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    return data;
  },
  sharpen: (data) => {
    const w = data.width;
    const h = data.height;
    const px = data.data;
    const mix = 0.5; // Strength
    // Simple convolution kernel for sharpening
    //  0 -1  0
    // -1  5 -1
    //  0 -1  0
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    const copy = new Uint8ClampedArray(px); // Work on copy

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let r = 0, g = 0, b = 0;
        const dstOff = (y * w + x) * 4;

        // Apply kernel
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const srcOff = ((y + ky) * w + (x + kx)) * 4;
            const weight = kernel[(ky + 1) * 3 + (kx + 1)];
            r += copy[srcOff] * weight;
            g += copy[srcOff + 1] * weight;
            b += copy[srcOff + 2] * weight;
          }
        }
        px[dstOff] = r;
        px[dstOff + 1] = g;
        px[dstOff + 2] = b;
      }
    }
    return data;
  },
  magic: (data) => {
    // Magic: Increase contrast and brightness slighty
    const px = data.data;
    const contrast = 1.2; // 20% more contrast
    const brightness = 10;
    const intercept = 128 * (1 - contrast);
    for (let i = 0; i < px.length; i += 4) {
      px[i] = px[i] * contrast + intercept + brightness;
      px[i + 1] = px[i + 1] * contrast + intercept + brightness;
      px[i + 2] = px[i + 2] * contrast + intercept + brightness;
    }
    return data;
  }
};

function applyFilter(filterName) {
  if (!currentImageData) return;

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = currentImageData.width;
  tempCanvas.height = currentImageData.height;

  let processed = new ImageData(
    new Uint8ClampedArray(currentImageData.data),
    currentImageData.width,
    currentImageData.height
  );

  if (filters[filterName]) {
    processed = filters[filterName](processed);
  }

  tempCtx.putImageData(processed, 0, 0);

  const preview = document.getElementById("previewCanvas");
  // Maintain aspect ratio for preview
  const scale = Math.min(600 / tempCanvas.width, 800 / tempCanvas.height);
  const dispW = tempCanvas.width * scale;
  const dispH = tempCanvas.height * scale;

  preview.width = dispW;
  preview.height = dispH;

  preview
    .getContext("2d")
    .drawImage(tempCanvas, 0, 0, dispW, dispH);

  document
    .querySelectorAll(".filter-buttons button") // Changed selector to be more specific if possible, or keep simple
    .forEach((btn) => btn.classList.remove("active"));

  // Match the button ID strictly
  // convention: filter + CapitalizedName
  // original -> filterOriginal
  // bw -> filterBw
  // grayscale -> filterGrayscale
  const btnId = "filter" + filterName.charAt(0).toUpperCase() + filterName.slice(1);
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add("active");

  currentFilter = filterName;
}

document.addEventListener("click", (e) => {
  // Check both class and closest for button clicks
  const target = e.target.closest("button");
  if (target && (target.id.startsWith('filter'))) {
    // Extract filter name from ID directly: filterOriginal -> original
    let name = target.id.replace("filter", "");
    // Special case handling if needed, or just Uncapitalize
    // But above we Capitalized. 
    // strategy: map ID to keys.
    // filterBw -> bw
    // filterOriginal -> original
    name = name.toLowerCase();
    // correction for Bw -> bw works
    applyFilter(name);
  }
});

// ========== QUEUE MANAGEMENT ==========
const addToQueueBtn = document.getElementById("addToQueue");
if (addToQueueBtn) addToQueueBtn.addEventListener("click", addToQueue);

const retakeBtn = document.getElementById("retake");
if (retakeBtn)
  retakeBtn.addEventListener("click", () => {
    scanProcess.style.display = "none";
    cameraContainer.style.display = "block";
  });

function addToQueue() {
  if (!currentImageData) return;
  scannedPages.push({ data: currentImageData, filter: currentFilter });
  scanProcess.style.display = "none";
  scanQueue.style.display = "block";
  renderScanQueue();
}

function renderScanQueue() {
  scanQueue.innerHTML = `
    <h3>📄 Scanned Pages (${scannedPages.length})</h3>
    <div id="scanGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:15px;margin:20px 0;"></div>
    <div style="text-align:center;gap:10px;display:flex;justify-content:center;flex-wrap:wrap;">
      <button id="generateScanPdf" class="btn-primary" style="padding:12px 24px;">📥 Create PDF</button>
      <button id="clearQueue" class="btn-secondary" style="padding:12px 24px;">🗑️ Clear</button>
      <button id="newScan" class="btn-secondary" style="padding:12px 24px;">📷 New Scan</button>
    </div>
  `;

  const grid = document.getElementById("scanGrid");

  scannedPages.forEach((page, index) => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText =
      "border:2px solid #ddd;padding:10px;border-radius:8px;text-align:center;";

    const c = document.createElement("canvas");
    c.width = 120;
    c.height = 160;
    const ctx = c.getContext("2d");
    const temp = document.createElement("canvas");
    temp.width = page.data.width;
    temp.height = page.data.height;
    temp.getContext("2d").putImageData(page.data, 0, 0);
    ctx.drawImage(temp, 0, 0, c.width, c.height);

    const info = document.createElement("div");
    info.style.fontSize = "12px";
    info.style.marginTop = "5px";
    info.textContent = `Page ${index + 1}`;

    const del = document.createElement("button");
    del.textContent = "✕";
    del.style.cssText =
      "margin-top:5px;padding:4px 8px;background:#ff4444;color:#fff;border:none;border-radius:4px;cursor:pointer;";
    del.onclick = () => {
      removeScanPage(index);
    };

    wrapper.appendChild(c);
    wrapper.appendChild(info);
    wrapper.appendChild(del);
    grid.appendChild(wrapper);
  });

  document.getElementById("generateScanPdf").onclick = generateScanPDF;
  document.getElementById("clearQueue").onclick = () => {
    scannedPages = [];
    scanQueue.style.display = "none";
  };
  document.getElementById("newScan").onclick = () => {
    scannedPages = [];
    scanQueue.style.display = "none";
    initCamera();
  };
}

function removeScanPage(index) {
  scannedPages.splice(index, 1);
  if (scannedPages.length === 0) {
    scanQueue.style.display = "none";
  } else {
    renderScanQueue();
  }
}

// ========== PDF GENERATION ==========
async function generateScanPDF() {
  if (!scannedPages.length) return;

  try {
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.create();

    const pageWidth = 595.28; // A4
    const pageHeight = 841.89;
    const margin = 20;

    for (const page of scannedPages) {
      const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);
      const blob = await canvasToBlob(page.data);
      const imgBytes = await blob.arrayBuffer();
      const img = await pdfDoc.embedPng(imgBytes);

      const s = Math.min(
        (pageWidth - margin * 2) / page.data.width,
        (pageHeight - margin * 2) / page.data.height
      );

      pdfPage.drawImage(img, {
        x: (pageWidth - page.data.width * s) / 2,
        y: (pageHeight - page.data.height * s) / 2,
        width: page.data.width * s,
        height: page.data.height * s,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scanned-${Date.now()}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error(err);
    alert("PDF generation failed");
  }
}

function canvasToBlob(imageData) {
  return new Promise((resolve) => {
    const c = document.createElement("canvas");
    c.width = imageData.width;
    c.height = imageData.height;
    c.getContext("2d").putImageData(imageData, 0, 0);
    c.toBlob(resolve, "image/png");
  });
}

// ========== QR CODE PLACEHOLDER (Desktop) ==========
function showQRCode() {
  const box = document.getElementById('qrCodeContainer');
  const qr = document.getElementById('qrCode');

  box.style.display = 'block';
  qr.innerHTML = ''; // purana HTML clear

  // jis URL par phone ko bhejna hai:
  const urlToOpenOnPhone = window.location.href;

  // QR image canvas generate
  QRCode.toCanvas(urlToOpenOnPhone, { width: 220 }, (err, canvas) => {
    if (err) {
      console.error(err);
      qr.textContent = 'QR generate error';
      return;
    }
    canvas.style.borderRadius = '8px';
    qr.appendChild(canvas);
  });
}


// ========== CLEANUP ==========
window.addEventListener("beforeunload", () => {
  if (stream) stream.getTracks().forEach((t) => t.stop());
});
