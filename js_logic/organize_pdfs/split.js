/**
 * Split PDF Tool (Enhanced with Visual Previews and Bug Fixes)
 * BALRAM TECH HUB PDF Tools
 */

(() => {
  const elements = {
    input: document.getElementById("splitInput"),
    fileStatus: document.getElementById("splitFileStatus"),
    optionsPanel: document.getElementById("splitOptionsPanel"),
    previewArea: document.getElementById("previewArea"),
    pagesGrid: document.getElementById("pagesGrid"),
    pageRangeInput: document.getElementById("pageRange"),
    outputNameInput: document.getElementById("outputName"),
    submitButton: document.getElementById("splitButton"),
    statusEl: document.getElementById("splitStatus"),
    uploadArea: document.getElementById("uploadArea"),
    selectAllBtn: document.getElementById("selectAllBtn"),
    clearAllBtn: document.getElementById("clearAllBtn"),
  };

  let uploadedPdfBytes = null;
  let totalPages = 0;
  let selectedPages = new Set(); // 0-indexed

  const init = () => {
    if (!elements.input) return;

    setupDragAndDrop();
    elements.input.addEventListener("change", handleFileSelect);
    elements.submitButton.addEventListener("click", handleSplit);
    elements.pageRangeInput.addEventListener("input", handleManualRangeInput);

    if (elements.selectAllBtn) {
      elements.selectAllBtn.onclick = () => {
        selectedPages.clear();
        for (let i = 0; i < totalPages; i++) selectedPages.add(i);
        updateUIFromSelection();
      };
    }

    if (elements.clearAllBtn) {
      elements.clearAllBtn.onclick = () => {
        selectedPages.clear();
        updateUIFromSelection();
      };
    }
  };

  const setupDragAndDrop = () => {
    const { uploadArea } = elements;
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
      const file = Array.from(dt.files).find(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith('.pdf'));
      if (file) {
        processFile(file);
      } else {
        alert("Please drop a PDF file.");
      }
    }, false);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file) => {
    try {
      elements.fileStatus.innerHTML = '<span style="color:var(--accent-primary)">Analyzing your PDF... please wait</span>';
      elements.uploadArea.style.display = "none";

      const bytes = await file.arrayBuffer();
      // Store a fresh copy as Uint8Array
      uploadedPdfBytes = new Uint8Array(bytes);

      if (typeof PDFLib === 'undefined') {
        throw new Error("PDF mapping library is still loading. Please wait a second.");
      }

      const { PDFDocument } = PDFLib;
      const pdfDoc = await PDFDocument.load(uploadedPdfBytes.slice(0), { ignoreEncryption: true });
      totalPages = pdfDoc.getPageCount();

      elements.fileStatus.innerHTML = `✓ PDF loaded: <strong>${totalPages} pages</strong>`;
      elements.previewArea.style.display = "block";
      elements.optionsPanel.style.display = "block";

      await renderThumbnails(uploadedPdfBytes.slice(0));
    } catch (err) {
      console.error(err);
      elements.fileStatus.innerHTML = `<span style="color:#ff5252">Error: ${err.message || 'Failed to load PDF.'}</span>`;
      elements.uploadArea.style.display = "flex";
      elements.previewArea.style.display = "none";
      elements.optionsPanel.style.display = "none";
    } finally {
      elements.input.value = "";
    }
  };

  const renderThumbnails = async (pdfData) => {
    elements.pagesGrid.innerHTML = "";
    selectedPages.clear();
    elements.pageRangeInput.value = "";

    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfData) });
      const pdf = await loadingTask.promise;

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.2 });
        
        const card = document.createElement("div");
        card.className = "page-thumbnail-card";
        card.dataset.pageIndex = i - 1;
        card.style.cssText = `
          background: #fff;
          border: 2px solid transparent;
          border-radius: 12px;
          padding: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          box-shadow: var(--shadow-soft);
          background: #fff;
        `;

        card.onmouseenter = () => {
          if (!selectedPages.has(i - 1)) card.style.borderColor = "#ddd";
        };
        card.onmouseleave = () => {
          if (!selectedPages.has(i - 1)) card.style.borderColor = "transparent";
        };

        const previewContainer = document.createElement("div");
        previewContainer.style.cssText = "width:100%; height:480px; display:flex; align-items:center; justify-content:center; background:#f8f9fc; overflow:hidden; border-radius:8px; position:relative;";

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.cssText = "max-width:100%; max-height:100%; object-fit:contain; border-radius: 4px;";

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        previewContainer.appendChild(canvas);

        const label = document.createElement("span");
        label.textContent = `Page ${i}`;
        label.style.fontSize = "13px";
        label.style.marginTop = "12px";
        label.style.fontWeight = "700";
        label.style.color = "var(--text-main)";

        card.appendChild(previewContainer);
        card.appendChild(label);
        
        const overlay = document.createElement("div");
        overlay.className = "selection-overlay";
        overlay.innerHTML = "✓";
        overlay.style.cssText = `
          position: absolute;
          top: 25px;
          right: 25px;
          background: var(--accent-primary);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: none;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          z-index: 10;
        `;
        card.appendChild(overlay);

        card.onclick = () => togglePageSelection(i - 1, card, overlay);
        elements.pagesGrid.appendChild(card);
      }
      
      await pdf.destroy();
    } catch (err) {
      console.error("Rendering error:", err);
    }
  };

  const togglePageSelection = (index, card, overlay) => {
    if (selectedPages.has(index)) {
      selectedPages.delete(index);
    } else {
      selectedPages.add(index);
    }
    updateUIFromSelection();
  };

  const updateUIFromSelection = () => {
    // Update input text
    const sorted = Array.from(selectedPages).sort((a, b) => a - b);
    const ranges = [];
    if (sorted.length === 0) {
      elements.pageRangeInput.value = "";
    } else {
      let start = sorted[0];
      let end = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === end + 1) {
          end = sorted[i];
        } else {
          ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
          start = sorted[i];
          end = sorted[i];
        }
      }
      ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
      elements.pageRangeInput.value = ranges.join(", ");
    }

    // Update visuals
    const cards = elements.pagesGrid.querySelectorAll(".page-thumbnail-card");
    cards.forEach(card => {
      const idx = parseInt(card.dataset.pageIndex);
      const overlay = card.querySelector(".selection-overlay");
      const container = card.querySelector("div");
      if (selectedPages.has(idx)) {
        card.style.borderColor = "var(--accent-primary)";
        card.style.transform = "scale(1.02)";
        overlay.style.display = "flex";
        if (container) container.style.background = "var(--accent-primary-soft)";
      } else {
        card.style.borderColor = "transparent";
        card.style.transform = "scale(1)";
        overlay.style.display = "none";
        if (container) container.style.background = "#f8f9fc";
      }
    });
  };

  const handleManualRangeInput = (e) => {
    const text = e.target.value;
    const pages = parsePageRange(text, totalPages);
    selectedPages.clear();
    pages.forEach(p => selectedPages.add(p));
    updateUIFromSelection();
  };

  const handleSplit = async () => {
    if (!uploadedPdfBytes) return;

    try {
      const rangeText = elements.pageRangeInput.value.trim();
      const pagesToExtract = parsePageRange(rangeText, totalPages);

      if (pagesToExtract.length === 0) {
        throw new Error("Please select at least one page to extract.");
      }

      elements.statusEl.innerHTML = '<span style="color:var(--accent-primary)">Extracting selected pages...</span>';
      elements.submitButton.disabled = true;

      const { PDFDocument } = PDFLib;
      // Use a fresh copy of the bytes
      const originalPdf = await PDFDocument.load(uploadedPdfBytes.slice(0), { ignoreEncryption: true });
      const newPdf = await PDFDocument.create();
      
      const copiedPages = await newPdf.copyPages(originalPdf, pagesToExtract);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      const filename = elements.outputNameInput.value.trim() || `split-${Date.now()}`;
      
      downloadPdf(pdfBytes, `${filename}.pdf`);

      elements.statusEl.innerHTML = `<span style="color:#2ecc71">✓ Success! Downloaded ${pagesToExtract.length} pages.</span>`;
    } catch (err) {
      console.error(err);
      elements.statusEl.innerHTML = `<span style="color:#ff5252">Error: ${err.message || 'Check your range and try again.'}</span>`;
    } finally {
      elements.submitButton.disabled = false;
    }
  };

  const parsePageRange = (input, maxPage) => {
    const pages = new Set();
    if (!input) return [];

    const parts = input.split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-").map(x => parseInt(x, 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(end, maxPage); i++) {
            pages.add(i - 1);
          }
        }
      } else {
        const page = parseInt(trimmed, 10);
        if (!isNaN(page) && page >= 1 && page <= maxPage) {
          pages.add(page - 1);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const downloadPdf = (bytes, filename) => {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  init();
})();
