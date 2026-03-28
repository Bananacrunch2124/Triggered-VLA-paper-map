document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "triggered_vla_paper_map_layout_v1";
  const THEME_KEY = "triggered_vla_paper_map_theme_v1";

  const BOARD_BASE_WIDTH = 2400;
  const BOARD_BASE_HEIGHT = 1600;
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 2.0;
  const ZOOM_STEP = 0.1;

  const searchInput = document.getElementById("searchInput");
  const paperList = document.getElementById("paperList");
  const paperCount = document.getElementById("paperCount");
  const boardCount = document.getElementById("boardCount");
  const board = document.getElementById("board");
  const boardCanvas = document.getElementById("boardCanvas");
  const boardItemsLayer = document.getElementById("boardItemsLayer");
  const connectionSvg = document.getElementById("connectionSvg");
  const emptyBoardHint = document.getElementById("emptyBoardHint");
  const zoomIndicator = document.getElementById("zoomIndicator");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const zoomInBtn = document.getElementById("zoomInBtn");

  const placeAllBtn = document.getElementById("placeAllBtn");
  const connectBtn = document.getElementById("connectBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const resetBtn = document.getElementById("resetBtn");
  const darkBtn = document.getElementById("darkBtn");
  const fsBtn = document.getElementById("fsBtn");
  const importFileInput = document.getElementById("importFileInput");

  const toast = document.getElementById("toast");

  const noteModal = document.getElementById("noteModal");
  const noteModalTitle = document.getElementById("noteModalTitle");
  const noteTitleInput = document.getElementById("noteTitleInput");
  const noteTextInput = document.getElementById("noteTextInput");
  const saveNoteBtn = document.getElementById("saveNoteBtn");
  const deleteNoteBtn = document.getElementById("deleteNoteBtn");
  const closeNoteModalBtn = document.getElementById("closeNoteModalBtn");

  const paperModal = document.getElementById("paperModal");
  const paperModalTitle = document.getElementById("paperModalTitle");
  const paperModalVenue = document.getElementById("paperModalVenue");
  const paperModalYear = document.getElementById("paperModalYear");
  const paperModalTags = document.getElementById("paperModalTags");
  const paperModalAuthors = document.getElementById("paperModalAuthors");
  const paperModalSummary = document.getElementById("paperModalSummary");
  const paperModalPdf = document.getElementById("paperModalPdf");
  const paperModalProject = document.getElementById("paperModalProject");
  const paperModalCode = document.getElementById("paperModalCode");
  const addPaperToBoardBtn = document.getElementById("addPaperToBoardBtn");
  const removePaperFromBoardBtn = document.getElementById("removePaperFromBoardBtn");
  const closePaperModalBtn = document.getElementById("closePaperModalBtn");

  const exportModal = document.getElementById("exportModal");
  const exportTextarea = document.getElementById("exportTextarea");
  const copyExportBtn = document.getElementById("copyExportBtn");
  const closeExportModalBtn = document.getElementById("closeExportModalBtn");

  const state = {
    papers: [],
    searchText: "",
    boardItems: [],
    connections: [],
    selectedItemId: null,
    currentPaperModalId: null,
    editingNoteId: null,
    zoom: 1
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.add("hidden");
    }, 1600);
  }

  function saveLayout() {
    const payload = {
      boardItems: state.boardItems,
      connections: state.connections,
      zoom: state.zoom
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function loadLayout() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed.boardItems)) {
        state.boardItems = parsed.boardItems;
      }
      if (Array.isArray(parsed.connections)) {
        state.connections = parsed.connections;
      }
      if (typeof parsed.zoom === "number") {
        state.zoom = clamp(parsed.zoom, ZOOM_MIN, ZOOM_MAX);
      }
    } catch (error) {
      console.error("Failed to load layout:", error);
    }
  }

  function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
  }

  function loadTheme() {
    const theme = localStorage.getItem(THEME_KEY) || "light";
    document.body.classList.toggle("theme-dark", theme === "dark");
    document.body.classList.toggle("theme-light", theme !== "dark");
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains("theme-dark");
    const nextTheme = isDark ? "light" : "dark";
    document.body.classList.toggle("theme-dark", nextTheme === "dark");
    document.body.classList.toggle("theme-light", nextTheme !== "dark");
    saveTheme(nextTheme);
    showToast(nextTheme === "dark" ? "Dark mode on" : "Light mode on");
  }

  function getFilteredPapers() {
    const q = state.searchText.trim().toLowerCase();
    if (!q) return state.papers;

    return state.papers.filter((paper) => {
      const combined = [
        paper.title,
        paper.authors,
        paper.venue,
        String(paper.year || ""),
        paper.summary,
        Array.isArray(paper.tags) ? paper.tags.join(" ") : ""
      ]
        .join(" ")
        .toLowerCase();

      return combined.includes(q);
    });
  }

  function updateCounts() {
    paperCount.textContent = `${getFilteredPapers().length} papers`;
    boardCount.textContent = `${state.boardItems.length} on board`;
    emptyBoardHint.classList.toggle("hidden", state.boardItems.length > 0);
    zoomIndicator.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function getPaperById(paperId) {
    return state.papers.find((paper) => paper.id === paperId) || null;
  }

  function getBoardItemById(itemId) {
    return state.boardItems.find((item) => item.id === itemId) || null;
  }

  function isPaperOnBoard(paperId) {
    return state.boardItems.some((item) => item.type === "paper" && item.paperId === paperId);
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderPaperList() {
    const papers = getFilteredPapers();

    if (!papers.length) {
      paperList.innerHTML = `<div class="paper-list-placeholder">No papers found.</div>`;
      updateCounts();
      return;
    }

    paperList.innerHTML = papers
      .map((paper) => {
        const tags = Array.isArray(paper.tags)
          ? paper.tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("")
          : "";

        const onBoard = isPaperOnBoard(paper.id);

        return `
          <div class="paper-card">
            <div class="paper-card-title">${escapeHtml(paper.title)}</div>
            <div class="paper-card-meta">
              ${escapeHtml(paper.venue || "Unknown venue")} · ${escapeHtml(paper.year || "")}
            </div>
            <div class="paper-card-summary">${escapeHtml(paper.summary || "")}</div>
            <div class="paper-card-tags">${tags}</div>
            <div class="paper-card-actions">
              <button class="paper-small-btn add-paper-btn" data-paper-id="${escapeHtml(paper.id)}">
                ${onBoard ? "On Board" : "Add"}
              </button>
              <button class="paper-small-btn detail-paper-btn" data-paper-id="${escapeHtml(paper.id)}">
                Detail
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    paperList.querySelectorAll(".add-paper-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const paperId = btn.dataset.paperId;
        addPaperToBoard(paperId);
      });
    });

    paperList.querySelectorAll(".detail-paper-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const paperId = btn.dataset.paperId;
        openPaperModal(paperId);
      });
    });

    updateCounts();
  }

  function getDefaultBoardPosition(index = 0) {
    const cols = 4;
    const cardWidth = 280;
    const cardHeight = 180;
    const gapX = 34;
    const gapY = 30;
    const startX = 40;
    const startY = 40;

    const col = index % cols;
    const row = Math.floor(index / cols);

    return {
      x: startX + col * (cardWidth + gapX),
      y: startY + row * (cardHeight + gapY)
    };
  }

  function updateBoardCanvasSize() {
    boardCanvas.style.width = `${BOARD_BASE_WIDTH * state.zoom}px`;
    boardCanvas.style.height = `${BOARD_BASE_HEIGHT * state.zoom}px`;
  }

  function setZoom(nextZoom) {
    state.zoom = clamp(Number(nextZoom) || 1, ZOOM_MIN, ZOOM_MAX);
    console.log("zoom =", state.zoom);
    saveLayout();
    renderBoard();
  }

  function makeBoardItemDraggable(element, itemId) {
    const header = element.querySelector(".node-header");
    if (!header) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;

    header.addEventListener("mousedown", (event) => {
      isDragging = true;
      state.selectedItemId = itemId;
      renderBoard();

      const item = getBoardItemById(itemId);
      if (!item) return;

      startX = event.clientX;
      startY = event.clientY;
      originX = item.x;
      originY = item.y;

      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (event) => {
      if (!isDragging) return;

      const item = getBoardItemById(itemId);
      if (!item) return;

      const dx = (event.clientX - startX) / state.zoom;
      const dy = (event.clientY - startY) / state.zoom;

      const maxX = BOARD_BASE_WIDTH - 280;
      const maxY = BOARD_BASE_HEIGHT - 140;

      item.x = Math.max(0, Math.min(maxX, originX + dx));
      item.y = Math.max(0, Math.min(maxY, originY + dy));

      renderBoard();
    });

    window.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.userSelect = "";
      saveLayout();
    });
  }

  function openPaperModal(paperId) {
    const paper = getPaperById(paperId);
    if (!paper) return;

    state.currentPaperModalId = paperId;
    paperModalTitle.textContent = paper.title || "Paper";
    paperModalVenue.textContent = paper.venue || "Venue";
    paperModalYear.textContent = String(paper.year || "Year");
    paperModalTags.textContent =
      Array.isArray(paper.tags) && paper.tags.length ? paper.tags.join(", ") : "No tags";
    paperModalAuthors.textContent = paper.authors || "";
    paperModalSummary.textContent = paper.summary || "";

    setModalLink(paperModalPdf, paper.pdf);
    setModalLink(paperModalProject, paper.project);
    setModalLink(paperModalCode, paper.code);

    const onBoard = isPaperOnBoard(paperId);
    addPaperToBoardBtn.textContent = onBoard ? "Already on Board" : "Add to Board";
    removePaperFromBoardBtn.disabled = !onBoard;
    removePaperFromBoardBtn.style.opacity = onBoard ? "1" : "0.5";

    paperModal.classList.remove("hidden");
  }

  function closePaperModal() {
    paperModal.classList.add("hidden");
    state.currentPaperModalId = null;
  }

  function setModalLink(anchor, href) {
    if (href) {
      anchor.href = href;
      anchor.style.pointerEvents = "auto";
      anchor.style.opacity = "1";
    } else {
      anchor.href = "#";
      anchor.style.pointerEvents = "none";
      anchor.style.opacity = "0.45";
    }
  }

  function openNoteModal(noteId = null, x = 80, y = 80) {
    state.editingNoteId = noteId;

    if (noteId) {
      const item = getBoardItemById(noteId);
      if (!item) return;
      noteModalTitle.textContent = "Edit Note";
      noteTitleInput.value = item.title || "";
      noteTextInput.value = item.text || "";
      deleteNoteBtn.classList.remove("hidden");
    } else {
      noteModalTitle.textContent = "Add Note";
      noteTitleInput.value = "";
      noteTextInput.value = "";
      deleteNoteBtn.classList.add("hidden");
      noteModal.dataset.newX = String(x);
      noteModal.dataset.newY = String(y);
    }

    noteModal.classList.remove("hidden");
  }

  function closeNoteModal() {
    noteModal.classList.add("hidden");
    state.editingNoteId = null;
    delete noteModal.dataset.newX;
    delete noteModal.dataset.newY;
  }

  function openExportModal() {
    const payload = {
      boardItems: state.boardItems,
      connections: state.connections,
      zoom: state.zoom
    };
    exportTextarea.value = JSON.stringify(payload, null, 2);
    exportModal.classList.remove("hidden");
  }

  function closeExportModal() {
    exportModal.classList.add("hidden");
  }

  function addPaperToBoard(paperId, x = null, y = null) {
    if (isPaperOnBoard(paperId)) {
      showToast("This paper is already on the board");
      renderPaperList();
      return;
    }

    const paper = getPaperById(paperId);
    if (!paper) return;

    const pos =
      x === null || y === null
        ? getDefaultBoardPosition(state.boardItems.length)
        : { x, y };

    state.boardItems.push({
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: "paper",
      paperId: paper.id,
      x: pos.x,
      y: pos.y
    });

    saveLayout();
    renderPaperList();
    renderBoard();
    showToast("Paper added");
  }

  function removePaperFromBoard(paperId) {
    const target = state.boardItems.find(
      (item) => item.type === "paper" && item.paperId === paperId
    );
    if (!target) return;

    removeBoardItem(target.id);
    closePaperModal();
  }

  function removeBoardItem(itemId) {
    state.boardItems = state.boardItems.filter((item) => item.id !== itemId);
    state.connections = state.connections.filter(
      (conn) => conn.from !== itemId && conn.to !== itemId
    );

    if (state.selectedItemId === itemId) {
      state.selectedItemId = null;
    }

    saveLayout();
    renderPaperList();
    renderBoard();
    showToast("Item removed");
  }

  function saveNoteFromModal() {
    const title = noteTitleInput.value.trim() || "Note";
    const text = noteTextInput.value.trim();

    if (state.editingNoteId) {
      const item = getBoardItemById(state.editingNoteId);
      if (!item) return;
      item.title = title;
      item.text = text;
    } else {
      const x = Number(noteModal.dataset.newX || 80);
      const y = Number(noteModal.dataset.newY || 80);

      state.boardItems.push({
        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "note",
        title,
        text,
        x,
        y
      });
    }

    saveLayout();
    renderBoard();
    closeNoteModal();
    showToast("Note saved");
  }

  function deleteNoteFromModal() {
    if (!state.editingNoteId) return;
    removeBoardItem(state.editingNoteId);
    closeNoteModal();
  }

  function createPaperNodeHtml(item, paper) {
    const authors = paper.authors ? paper.authors : "";
    const summary = paper.summary ? paper.summary : "";

    return `
      <div class="node-header">
        <div class="node-type">Paper</div>
        <button class="node-menu-btn node-remove-btn" data-item-id="${escapeHtml(item.id)}">×</button>
      </div>
      <div class="node-body">
        <div class="node-title">${escapeHtml(paper.title || "")}</div>
        <div class="node-subtitle">
          ${escapeHtml(paper.venue || "Venue")} · ${escapeHtml(paper.year || "")}
        </div>
        <div class="node-text">${escapeHtml(summary)}</div>
      </div>
      <div class="node-footer">
        ${paper.pdf ? `<a class="node-link" href="${escapeHtml(paper.pdf)}" target="_blank" rel="noopener noreferrer">PDF</a>` : ""}
        ${paper.project ? `<a class="node-link" href="${escapeHtml(paper.project)}" target="_blank" rel="noopener noreferrer">Project</a>` : ""}
        ${paper.code ? `<a class="node-link" href="${escapeHtml(paper.code)}" target="_blank" rel="noopener noreferrer">Code</a>` : ""}
        ${authors ? `<span class="node-link" title="${escapeHtml(authors)}">Authors</span>` : ""}
      </div>
    `;
  }

  function createNoteNodeHtml(item) {
    return `
      <div class="node-header">
        <div class="node-type">Note</div>
        <button class="node-menu-btn node-remove-btn" data-item-id="${escapeHtml(item.id)}">×</button>
      </div>
      <div class="node-body">
        <div class="node-title">${escapeHtml(item.title || "Note")}</div>
        <div class="node-text">${escapeHtml(item.text || "")}</div>
      </div>
    `;
  }

  function renderConnections() {
    const canvasRect = boardCanvas.getBoundingClientRect();

    const lines = state.connections
      .map((conn) => {
        const fromEl = document.querySelector(`[data-board-item-id="${conn.from}"]`);
        const toEl = document.querySelector(`[data-board-item-id="${conn.to}"]`);
        if (!fromEl || !toEl) return "";

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        const x1 = fromRect.left - canvasRect.left + fromRect.width / 2;
        const y1 = fromRect.top - canvasRect.top + fromRect.height / 2;
        const x2 = toRect.left - canvasRect.left + toRect.width / 2;
        const y2 = toRect.top - canvasRect.top + toRect.height / 2;

        const midX = (x1 + x2) / 2;

        return `
          <path
            class="connection-line"
            d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}"
          ></path>
        `;
      })
      .join("");

    connectionSvg.innerHTML = lines;
  }

  function renderBoard() {
    updateBoardCanvasSize();

    boardItemsLayer.innerHTML = state.boardItems
      .map((item) => {
        const isSelected = state.selectedItemId === item.id;
        const paper = item.type === "paper" ? getPaperById(item.paperId) : null;

        if (item.type === "paper" && !paper) {
          return "";
        }

        return `
          <div
            class="board-item ${item.type === "paper" ? "paper-node" : "note-node"} ${isSelected ? "selected" : ""}"
            data-board-item-id="${escapeHtml(item.id)}"
            style="
              left:${(Number(item.x) || 0) * state.zoom}px;
              top:${(Number(item.y) || 0) * state.zoom}px;
              transform: scale(${state.zoom});
              transform-origin: top left;
            "
          >
            ${item.type === "paper" ? createPaperNodeHtml(item, paper) : createNoteNodeHtml(item)}
          </div>
        `;
      })
      .join("");

    document.querySelectorAll(".board-item").forEach((element) => {
      const itemId = element.dataset.boardItemId;

      element.addEventListener("click", (event) => {
        event.stopPropagation();
        state.selectedItemId = itemId;
        renderBoard();
      });

      element.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        const item = getBoardItemById(itemId);
        if (!item) return;

        if (item.type === "paper") {
          openPaperModal(item.paperId);
        } else {
          openNoteModal(item.id);
        }
      });

      const removeBtn = element.querySelector(".node-remove-btn");
      if (removeBtn) {
        removeBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          removeBoardItem(itemId);
        });
      }

      makeBoardItemDraggable(element, itemId);
    });

    renderConnections();
    updateCounts();
  }

  function placeAllPapers() {
    state.papers.forEach((paper) => {
      if (!isPaperOnBoard(paper.id)) {
        const pos = getDefaultBoardPosition(state.boardItems.length);
        state.boardItems.push({
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: "paper",
          paperId: paper.id,
          x: pos.x,
          y: pos.y
        });
      }
    });

    saveLayout();
    renderPaperList();
    renderBoard();
    showToast("All papers placed");
  }

  function connectBoardItems() {
    if (state.boardItems.length < 2) {
      showToast("Need at least 2 items");
      return;
    }

    const sorted = [...state.boardItems].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    const nextConnections = [];
    for (let i = 0; i < sorted.length - 1; i += 1) {
      nextConnections.push({
        from: sorted[i].id,
        to: sorted[i + 1].id
      });
    }

    state.connections = nextConnections;
    saveLayout();
    renderBoard();
    showToast("Connected");
  }

  function resetBoard() {
    const ok = window.confirm("Reset the whole board?");
    if (!ok) return;

    state.boardItems = [];
    state.connections = [];
    state.selectedItemId = null;
    saveLayout();
    renderPaperList();
    renderBoard();
    showToast("Board reset");
  }

  function exportLayout() {
    openExportModal();
  }

  function importLayoutFromText(rawText) {
    try {
      const parsed = JSON.parse(rawText);

      if (!Array.isArray(parsed.boardItems) || !Array.isArray(parsed.connections)) {
        throw new Error("Invalid layout format");
      }

      state.boardItems = parsed.boardItems;
      state.connections = parsed.connections;
      if (typeof parsed.zoom === "number") {
        state.zoom = clamp(parsed.zoom, ZOOM_MIN, ZOOM_MAX);
      }
      state.selectedItemId = null;

      saveLayout();
      renderPaperList();
      renderBoard();
      showToast("Layout imported");
    } catch (error) {
      alert("Import failed. Please check your JSON file.");
      console.error(error);
    }
  }

  function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      importLayoutFromText(reader.result);
    };
    reader.readAsText(file);
  }

  async function loadPapers() {
    try {
      const response = await fetch("papers.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch papers.json: ${response.status}`);
      }

      const data = await response.json();
      state.papers = Array.isArray(data) ? data : Array.isArray(data.papers) ? data.papers : [];

      renderPaperList();
      renderBoard();
    } catch (error) {
      console.error(error);
      paperList.innerHTML = `
        <div class="paper-list-placeholder">
          Failed to load papers.json
        </div>
      `;
      updateCounts();
    }
  }

  function bindEvents() {
    searchInput.addEventListener("input", () => {
      state.searchText = searchInput.value;
      renderPaperList();
    });

    placeAllBtn.addEventListener("click", placeAllPapers);
    connectBtn.addEventListener("click", connectBoardItems);
    exportBtn.addEventListener("click", exportLayout);

    importBtn.addEventListener("click", () => {
      importFileInput.click();
    });

    importFileInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      handleImportFile(file);
      importFileInput.value = "";
    });

    resetBtn.addEventListener("click", resetBoard);
    darkBtn.addEventListener("click", toggleTheme);

    fsBtn.addEventListener("click", async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          showToast("Full screen on");
        } else {
          await document.exitFullscreen();
          showToast("Full screen off");
        }
      } catch (error) {
        console.error(error);
      }
    });

    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", () => {
        setZoom(state.zoom + ZOOM_STEP);
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", () => {
        setZoom(state.zoom - ZOOM_STEP);
      });
    }

    if (zoomIndicator) {
      zoomIndicator.addEventListener("click", () => {
        setZoom(1);
      });
    }

    board.addEventListener("click", () => {
      state.selectedItemId = null;
      renderBoard();
    });

    board.addEventListener("dblclick", (event) => {
      const clickedInsideItem = event.target.closest(".board-item");
      if (clickedInsideItem) return;

      const rect = boardCanvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / state.zoom;
      const y = (event.clientY - rect.top) / state.zoom;
      openNoteModal(null, x, y);
    });

    board.addEventListener(
      "wheel",
      (event) => {
        if (!event.ctrlKey) return;
        event.preventDefault();

        if (event.deltaY < 0) {
          setZoom(state.zoom + ZOOM_STEP);
        } else {
          setZoom(state.zoom - ZOOM_STEP);
        }
      },
      { passive: false }
    );

    closeNoteModalBtn.addEventListener("click", closeNoteModal);
    saveNoteBtn.addEventListener("click", saveNoteFromModal);
    deleteNoteBtn.addEventListener("click", deleteNoteFromModal);

    closePaperModalBtn.addEventListener("click", closePaperModal);

    addPaperToBoardBtn.addEventListener("click", () => {
      if (!state.currentPaperModalId) return;
      addPaperToBoard(state.currentPaperModalId);
      openPaperModal(state.currentPaperModalId);
    });

    removePaperFromBoardBtn.addEventListener("click", () => {
      if (!state.currentPaperModalId) return;
      removePaperFromBoard(state.currentPaperModalId);
    });

    closeExportModalBtn.addEventListener("click", closeExportModal);

    copyExportBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(exportTextarea.value);
        showToast("Copied");
      } catch (error) {
        console.error(error);
        alert("Copy failed");
      }
    });

    noteModal.addEventListener("click", (event) => {
      if (event.target === noteModal) closeNoteModal();
    });

    paperModal.addEventListener("click", (event) => {
      if (event.target === paperModal) closePaperModal();
    });

    exportModal.addEventListener("click", (event) => {
      if (event.target === exportModal) closeExportModal();
    });

    window.addEventListener("resize", renderConnections);
  }

  function init() {
    loadTheme();
    loadLayout();
    bindEvents();
    loadPapers();
  }

  init();
});
