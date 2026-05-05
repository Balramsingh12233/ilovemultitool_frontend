/**
 * Merge PDF Tool (Pure Client-Side)
 * Part of BALRAM TECH HUB PDF Tools
 */

(() => {
  const elements = {
    input: document.getElementById("mergeInput"),
    uploadArea: document.getElementById("uploadArea"),
    fileListContainer: document.getElementById("fileListContainer"),
    list: document.getElementById("fileList"),
    button: document.getElementById("mergeButton"),
    statusEl: document.getElementById("mergeStatus"),
  };

  let selectedFiles = [];

  // Initialize
  const init = () => {
    if (!elements.uploadArea || !elements.input) return;

    setupDragAndDrop();
    setupFileInput();
    setupMergeButton();
  };

  const setupDragAndDrop = () => {
    const { uploadArea } = elements;

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
      const files = Array.from(dt.files).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith('.pdf'));
      if (files.length > 0) {
        handleFiles(files);
      } else {
        alert("Please drop PDF files only.");
      }
    }, false);
  };

  const setupFileInput = () => {
    elements.input.addEventListener("change", (e) => {
      const newFiles = Array.from(e.target.files || []);
      if (newFiles.length > 0) {
        handleFiles(newFiles);
      }
      // Reset input value so same file can be selected again if removed
      elements.input.value = "";
    });
  };

  const handleFiles = (files) => {
    selectedFiles = [...selectedFiles, ...files];
    updateUI();
  };

  const updateUI = () => {
    const hasFiles = selectedFiles.length > 0;
    
    if (hasFiles) {
      elements.fileListContainer.style.display = 'block';
      elements.uploadArea.style.display = 'none';
    } else {
      elements.fileListContainer.style.display = 'none';
      elements.uploadArea.style.display = 'flex';
    }

    renderFileList();
    updateButtonState();
  };

  const updateButtonState = () => {
    elements.button.disabled = selectedFiles.length < 2;
  };

  const renderFileList = () => {
    elements.list.innerHTML = "";
    
    selectedFiles.forEach((file, index) => {
      const li = document.createElement("li");
      li.className = "file-list-item";
      li.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #ffffff;
        padding: 16px 20px;
        border-radius: 16px;
        margin-bottom: 12px;
        border: 1px solid var(--border-panel);
        color: var(--text-main);
        font-weight: 500;
        box-shadow: var(--shadow-soft);
        transition: all 0.2s ease;
      `;

      // Hover effect via JS since it's dynamic
      li.onmouseenter = () => li.style.borderColor = "var(--accent-primary)";
      li.onmouseleave = () => li.style.borderColor = "var(--border-panel)";

      const fileInfo = document.createElement("div");
      fileInfo.style.display = "flex";
      fileInfo.style.alignItems = "center";
      fileInfo.style.gap = "12px";

      const icon = document.createElement("div");
      icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent-primary)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
      
      const textContainer = document.createElement("div");
      textContainer.style.display = "flex";
      textContainer.style.flexDirection = "column";

      const nameSpan = document.createElement("span");
      nameSpan.textContent = file.name;
      nameSpan.style.fontSize = "14px";
      nameSpan.style.color = "var(--text-main)";

      const sizeSpan = document.createElement("span");
      sizeSpan.textContent = formatBytes(file.size);
      sizeSpan.style.fontSize = "12px";
      sizeSpan.style.color = "var(--text-sub)";

      textContainer.appendChild(nameSpan);
      textContainer.appendChild(sizeSpan);
      fileInfo.appendChild(icon);
      fileInfo.appendChild(textContainer);
      
      const controls = document.createElement("div");
      controls.style.display = "flex";
      controls.style.gap = "8px";

      const btnUp = createControlBtn("↑", () => moveFile(index, -1), index === 0);
      const btnDown = createControlBtn("↓", () => moveFile(index, 1), index === selectedFiles.length - 1);
      const btnRemove = createControlBtn("✕", () => {
        selectedFiles.splice(index, 1);
        updateUI();
      }, false, true);

      controls.appendChild(btnUp);
      controls.appendChild(btnDown);
      controls.appendChild(btnRemove);

      li.appendChild(fileInfo);
      li.appendChild(controls);
      elements.list.appendChild(li);
    });
  };

  const createControlBtn = (text, onClick, disabled, isDelete = false) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText = `
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: 1px solid ${isDelete ? "#ffeded" : "#eee"};
      background: ${isDelete ? "#ffeded" : "#fff"};
      color: ${isDelete ? "#ff5252" : "#555"};
      cursor: pointer;
      font-weight: bold;
      transition: all 0.2s;
    `;
    
    if (disabled) {
      btn.style.opacity = "0.3";
      btn.style.cursor = "not-allowed";
    } else {
      btn.onclick = onClick;
      btn.onmouseenter = () => {
        btn.style.background = isDelete ? "#ff5252" : "var(--accent-primary)";
        btn.style.color = "#fff";
        btn.style.borderColor = isDelete ? "#ff5252" : "var(--accent-primary)";
      };
      btn.onmouseleave = () => {
        btn.style.background = isDelete ? "#ffeded" : "#fff";
        btn.style.color = isDelete ? "#ff5252" : "#555";
        btn.style.borderColor = isDelete ? "#ffeded" : "#eee";
      };
    }
    
    return btn;
  };

  const moveFile = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= selectedFiles.length) return;
    const temp = selectedFiles[index];
    selectedFiles[index] = selectedFiles[newIndex];
    selectedFiles[newIndex] = temp;
    updateUI();
  };

  const setupMergeButton = () => {
    elements.button.addEventListener("click", async () => {
      if (selectedFiles.length < 2) return;

      try {
        elements.statusEl.innerHTML = '<span style="color:var(--accent-primary); font-weight:600;">Merging PDF files... This stays on your device.</span>';
        elements.button.disabled = true;

        if (typeof PDFLib === 'undefined') {
          throw new Error("PDF library not loaded. Please check your internet connection.");
        }

        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (const file of selectedFiles) {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await PDFDocument.load(arrayBuffer);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = `merged-document-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        elements.statusEl.innerHTML = '<span style="color:#2ecc71; font-weight:600;">✨ Success! Your merged PDF is ready.</span>';
      } catch (err) {
        console.error(err);
        elements.statusEl.innerHTML = `<span style="color:#ff5252; font-weight:600;">Error: ${err.message || 'Could not merge PDFs.'}</span>`;
      } finally {
        elements.button.disabled = false;
      }
    });
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Run init on DOM content loaded (though defer script does this mostly)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
