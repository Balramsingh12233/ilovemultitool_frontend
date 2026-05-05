// ========== DOM references ==========
const imagesInput = document.getElementById("imagesInput");
const imagesGrid = document.getElementById("imagesGrid");
const imagesOutputName = document.getElementById("imagesOutputName");
const mergeAllCheckbox = document.getElementById("mergeAll");
const btnPortrait = document.getElementById("btnPortrait");
const btnLandscape = document.getElementById("btnLandscape");
const pageSizeSelect = document.getElementById("pageSize");
const btnMarginNone = document.getElementById("btnMarginNone");
const btnMarginSmall = document.getElementById("btnMarginSmall");
const btnMarginBig = document.getElementById("btnMarginBig");
const imagesToPdfButton = document.getElementById("imagesToPdfButton");
const imagesConvertStatus = document.getElementById("imagesConvertStatus");
const btnSortByName = document.getElementById("btnSortByName");

// ========== State ==========
/*
  items = [
    { file: File, rotation: 0 }  // rotation in degrees (0, 90, 180, 270)
  ]
*/
let items = [];
let orientation = "portrait";
let marginPreset = "none";
let dragStartIndex = null;


// ========== Helpers ==========
function renderThumbnails() {
  if (!items.length) {
    imagesGrid.classList.add("empty");
    imagesGrid.innerHTML =
      '<p class="imgpdf-empty-text">No images yet. Add JPG or PNG files.</p>';
    return;
  }

  imagesGrid.classList.remove("empty");
  imagesGrid.innerHTML = "";

  items.forEach((item, index) => {
    const url = URL.createObjectURL(item.file);

    const card = document.createElement("div");
    card.className = "imgpdf-item";
    card.dataset.index = index;
    card.draggable = true;          // NEW: make card draggable

    // main image
    const img = document.createElement("img");
    img.src = url;
    img.alt = item.file.name;
    img.style.transform = `rotate(${item.rotation}deg)`;

    // orientation के हिसाब से thumbnail का aspect
    if (orientation === "portrait") {
      img.style.width = "100%";
      img.style.height = "150px";
    } else {
      img.style.width = "100%";
      img.style.height = "110px";
    }

    // margin के हिसाब से inner padding (card पर)
    let innerPad = "0px";
    if (marginPreset === "small") innerPad = "6px";
    if (marginPreset === "big") innerPad = "12px";
    card.style.padding = innerPad;

    // caption
    const caption = document.createElement("div");
    caption.className = "imgpdf-item-caption";
    caption.textContent = item.file.name;

    // controls overlay
    const controls = document.createElement("div");
    controls.className = "imgpdf-item-controls";

    const btnDelete = document.createElement("button");
    btnDelete.className = "thumb-btn thumb-btn-delete";
    btnDelete.textContent = "✕";

    const btnRotate = document.createElement("button");
    btnRotate.className = "thumb-btn";
    btnRotate.textContent = "⟳";

    const btnLeft = document.createElement("button");
    btnLeft.className = "thumb-btn";
    btnLeft.textContent = "◀";

    const btnRight = document.createElement("button");
    btnRight.className = "thumb-btn";
    btnRight.textContent = "▶";

    controls.appendChild(btnLeft);
    controls.appendChild(btnRight);
    controls.appendChild(btnRotate);
    controls.appendChild(btnDelete);

    card.appendChild(img);
    card.appendChild(caption);
    card.appendChild(controls);
    imagesGrid.appendChild(card);

        // ===== drag & drop reorder =====
    // ===== drag & drop reorder =====
    card.addEventListener("dragstart", (e) => {
      dragStartIndex = index;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index)); // जरूरी
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      dragStartIndex = null;
    });

    card.addEventListener("dragover", (e) => {
      e.preventDefault(); // drop allow
      e.dataTransfer.dropEffect = "move";
    });

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



    // ----- events -----
    btnDelete.addEventListener("click", () => {
      items.splice(index, 1);
      renderThumbnails();
    });

    btnRotate.addEventListener("click", () => {
      item.rotation = (item.rotation + 90) % 360;
      renderThumbnails();
    });

    btnLeft.addEventListener("click", () => {
      if (index === 0) return;
      const tmp = items[index - 1];
      items[index - 1] = items[index];
      items[index] = tmp;
      renderThumbnails();
    });

    btnRight.addEventListener("click", () => {
      if (index === items.length - 1) return;
      const tmp = items[index + 1];
      items[index + 1] = items[index];
      items[index] = tmp;
      renderThumbnails();
    });

    card.addEventListener("dblclick", () => {
      const tempInput = document.createElement("input");
      tempInput.type = "file";
      tempInput.accept = "image/jpeg,image/png";
      tempInput.onchange = (e) => {
        const fl = e.target.files;
        if (!fl || !fl.length) return;
        items[index] = { file: fl[0], rotation: 0 };
        renderThumbnails();
      };
      tempInput.click();
    });
  });
}


// ========== File input ==========
imagesInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  items = files.map((f) => ({ file: f, rotation: 0 }));

  if (!imagesOutputName.value && items.length) {
    imagesOutputName.value = "images-to-pdf";
  }

  renderThumbnails();
});

// optional sort by name
if (btnSortByName) {
  btnSortByName.addEventListener("click", () => {
    items.sort((a, b) => a.file.name.localeCompare(b.file.name));
    renderThumbnails();
  });
}

// ========== Orientation & margins ==========
btnPortrait.addEventListener("click", () => {
  orientation = "portrait";
  btnPortrait.classList.add("active");
  btnLandscape.classList.remove("active");
  renderThumbnails(); // thumbnails refresh with new orientation
});

btnLandscape.addEventListener("click", () => {
  orientation = "landscape";
  btnLandscape.classList.add("active");
  btnPortrait.classList.remove("active");
  renderThumbnails(); // thumbnails refresh with new orientation
});

function setMarginPreset(preset) {
  marginPreset = preset;
  [btnMarginNone, btnMarginSmall, btnMarginBig].forEach((b) =>
    b.classList.remove("active")
  );
  if (preset === "none") btnMarginNone.classList.add("active");
  if (preset === "small") btnMarginSmall.classList.add("active");
  if (preset === "big") btnMarginBig.classList.add("active");

 renderThumbnails();
}

btnMarginNone.addEventListener("click", () => setMarginPreset("none"));
btnMarginSmall.addEventListener("click", () => setMarginPreset("small"));
btnMarginBig.addEventListener("click", () => setMarginPreset("big"));

// ========== Convert to PDF ==========
imagesToPdfButton.addEventListener("click", async () => {
  if (!items.length) {
    imagesConvertStatus.textContent = "Please add at least one image.";
    return;
  }

  imagesConvertStatus.textContent = "Building PDF…";

  try {
    const pdfDoc = await PDFLib.PDFDocument.create();

    const isA4 = pageSizeSelect.value === "A4";
    const baseWidth = isA4 ? 595.28 : 612;
    const baseHeight = isA4 ? 841.89 : 792;

    let pageWidth =
      orientation === "portrait" ? baseWidth : baseHeight;
    let pageHeight =
      orientation === "portrait" ? baseHeight : baseWidth;

    let margin = 0;
    if (marginPreset === "small") margin = 24;
    if (marginPreset === "big") margin = 48;

    for (const item of items) {
      const file = item.file;
      const rotation = item.rotation;

      const bytes = await file.arrayBuffer();
      const isJpg = /jpe?g$/i.test(file.name);
      const image = isJpg
        ? await pdfDoc.embedJpg(bytes)
        : await pdfDoc.embedPng(bytes);

      // अगर 90 या 270 rotate है तो page orientation swap
      let pageW = pageWidth;
      let pageH = pageHeight;
      const rot = rotation % 360;
      if (rot === 90 || rot === 270) {
        pageW = pageHeight;
        pageH = pageWidth;
      }

      const page = pdfDoc.addPage([pageW, pageH]);

      const availableWidth = pageW - margin * 2;
      const availableHeight = pageH - margin * 2;

      let imgWidth = image.width;
      let imgHeight = image.height;

      // rotated image का aspect ratio swap
      if (rot === 90 || rot === 270) {
        [imgWidth, imgHeight] = [imgHeight, imgWidth];
      }

      const scale = Math.min(
        availableWidth / imgWidth,
        availableHeight / imgHeight
      );

      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;

      const x = (pageW - drawWidth) / 2;
      const y = (pageH - drawHeight) / 2;

      page.drawImage(image, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
        rotate: PDFLib.degrees(rot),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    const name =
      (imagesOutputName.value || "images-to-pdf").trim() + ".pdf";
    a.href = url;
    a.download = name;
    a.click();

    imagesConvertStatus.textContent = "PDF ready. Downloading…";
  } catch (err) {
    console.error(err);
    imagesConvertStatus.textContent = "Something went wrong. Try again.";
  }
});
