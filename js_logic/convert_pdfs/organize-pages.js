// ========== DOM references ==========
const imagesInput = document.getElementById("imagesInput");
const imagesGrid = document.getElementById("imagesGrid");
const imagesOutputName = document.getElementById("imagesOutputName");
const pageSizeSelect = document.getElementById("pageSize");
const imagesToPdfButton = document.getElementById("imagesToPdfButton");
const imagesConvertStatus = document.getElementById("imagesConvertStatus");
const btnSortByName = document.getElementById("btnSortByName");
const dropZone = document.querySelector(".imgpdf-drop");

// ========== State ==========
let items = [];
let orientation = "portrait";
let marginPreset = "none";
let dragStartIndex = null;

// ========== Initialization ==========

// Drag and Drop Logic for Uploads
if (dropZone) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  dropZone.addEventListener('dragenter', () => dropZone.classList.add('drag-over'), false);
  dropZone.addEventListener('dragover', () => dropZone.classList.add('drag-over'), false);
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'), false);
  dropZone.addEventListener('drop', (e) => {
    dropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, false);
}

imagesInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  processFiles(files);
});

async function processFiles(files) {
  if (files.length === 0) return;
  
  imagesConvertStatus.innerHTML = '<span style="color:var(--accent-primary)">Processing files...</span>';
  const newItems = [];
  
  for (const f of files) {
    const isPdf = f.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      try {
        const arrayBuffer = await f.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();
        
        // Use pdf.js to render thumbnails once
        const pdfData = new Uint8Array(arrayBuffer);
        const pdfJsDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;

        for (let i = 0; i < pageCount; i++) {
          newItems.push({
            file: f,
            isPdf: true,
            pageIndex: i,
            totalPdfPages: pageCount,
            pdfJsPage: await pdfJsDoc.getPage(i + 1) // Store page reference for rendering
          });
        }
      } catch (err) {
        console.error("Error loading PDF:", err);
      }
    } else {
      newItems.push({ 
        file: f, 
        isPdf: false,
        pageIndex: 0 
      });
    }
  }

  items = [...items, ...newItems];

  if (!imagesOutputName.value && items.length) {
    imagesOutputName.value = "organized-pdf";
  }

  imagesConvertStatus.textContent = "";
  renderThumbnails();
}

// ========== Thumbnail Rendering ==========

async function renderThumbnails() {
  if (!items.length) {
    imagesGrid.classList.add("empty");
    imagesGrid.innerHTML = '<p class="imgpdf-empty-text">No files added. Add PDFs or images to start.</p>';
    return;
  }

  imagesGrid.classList.remove("empty");
  imagesGrid.innerHTML = "";

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const card = document.createElement("div");
    card.className = "imgpdf-item";
    card.dataset.index = index;
    card.draggable = true;

    const previewContainer = document.createElement("div");
    previewContainer.className = "imgpdf-preview-container";
    previewContainer.style.cssText = "width:100%; height:480px; display:flex; align-items:center; justify-content:center; background:#f0f2f9; overflow:hidden; border-radius:12px; margin-bottom:10px; position:relative;";

    if (item.isPdf && item.pdfJsPage) {
      const canvas = document.createElement("canvas");
      canvas.style.cssText = "max-width:100%; max-height:100%; object-fit:contain;";
      const context = canvas.getContext("2d");
      const viewport = item.pdfJsPage.getViewport({ scale: 1.2 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      // Async render without blocking the UI loop significantly
      item.pdfJsPage.render(renderContext);
      previewContainer.appendChild(canvas);
    } else if (!item.isPdf) {
      const url = URL.createObjectURL(item.file);
      const img = document.createElement("img");
      img.src = url;
      img.style.cssText = "max-width:100%; max-height:100%; object-fit:contain;";
      previewContainer.appendChild(img);
    }

    const caption = document.createElement("div");
    caption.style.cssText = "font-size:11px; color:var(--text-sub); text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:0 5px;";
    caption.textContent = item.isPdf ? `Page ${item.pageIndex + 1}` : item.file.name;

    const controls = document.createElement("div");
    controls.style.cssText = "display:flex; justify-content:center; gap:8px; margin-top:10px;";

    const btnDelete = document.createElement("button");
    btnDelete.className = "thumb-btn thumb-btn-delete";
    btnDelete.innerHTML = "✕";

    const btnLeft = document.createElement("button");
    btnLeft.className = "thumb-btn";
    btnLeft.innerHTML = "◀";

    const btnRight = document.createElement("button");
    btnRight.className = "thumb-btn";
    btnRight.innerHTML = "▶";

    controls.appendChild(btnLeft);
    controls.appendChild(btnRight);
    controls.appendChild(btnDelete);

    card.appendChild(previewContainer);
    card.appendChild(caption);
    card.appendChild(controls);
    imagesGrid.appendChild(card);

    // Reorder Events
    card.addEventListener("dragstart", (e) => {
      dragStartIndex = index;
      e.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("dragover", (e) => e.preventDefault());
    card.addEventListener("drop", (e) => {
      e.preventDefault();
      const from = dragStartIndex;
      const to = index;
      if (from === null || from === to) return;
      
      const moved = items[from];
      items.splice(from, 1);
      items.splice(to, 0, moved);
      renderThumbnails();
    });

    // Control callbacks
    btnDelete.onclick = (e) => { e.stopPropagation(); items.splice(index, 1); renderThumbnails(); };
    btnLeft.onclick = (e) => { 
      e.stopPropagation();
      if(index > 0) {
        [items[index-1], items[index]] = [items[index], items[index-1]];
        renderThumbnails();
      }
    };
    btnRight.onclick = (e) => { 
      e.stopPropagation();
      if(index < items.length - 1) {
        [items[index+1], items[index]] = [items[index], items[index+1]];
        renderThumbnails();
      }
    };
  }
}

// Convert to PDF Logic
imagesToPdfButton.addEventListener("click", async () => {
  if (!items.length) {
    imagesConvertStatus.textContent = "Please add files first.";
    return;
  }

  imagesConvertStatus.innerHTML = '<span style="color:var(--accent-primary)">Generating PDF...</span>';
  imagesToPdfButton.disabled = true;

  try {
    const pdfDoc = await PDFLib.PDFDocument.create();

    for (const item of items) {
      const bytes = await item.file.arrayBuffer();
      if (item.isPdf) {
        const srcDoc = await PDFLib.PDFDocument.load(bytes);
        const [copiedPage] = await pdfDoc.copyPages(srcDoc, [item.pageIndex]);
        pdfDoc.addPage(copiedPage);
      } else {
        const isJpg = /jpe?g$/i.test(item.file.name);
        const image = isJpg ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = (imagesOutputName.value || "reordered-pdf") + ".pdf";
    a.click();

    imagesConvertStatus.innerHTML = '<span style="color:#2ecc71">Done! PDF downloaded.</span>';
  } catch (err) {
    console.error(err);
    imagesConvertStatus.innerHTML = '<span style="color:#ff5252">Error generating PDF.</span>';
  } finally {
    imagesToPdfButton.disabled = false;
  }
});

if (btnSortByName) {
  btnSortByName.onclick = () => {
    items.sort((a,b) => a.file.name.localeCompare(b.file.name));
    renderThumbnails();
  };
}
